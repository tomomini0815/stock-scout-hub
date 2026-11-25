import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface InlinePdfViewerProps {
  url: string;
  title?: string;
}

interface RenderedPage {
  pageNum: number;
  src: string;
  width: number;
  height: number;
}

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.0;
const INITIAL_PAGE_BATCH = 3;

const canvasToJpegDataUrl = (canvas: HTMLCanvasElement): string =>
  canvas.toDataURL("image/jpeg", 0.86);

class PdfViewerErrorBoundary extends Component<
  { url: string; children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { url: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || "PDFビューアでエラーが発生しました。" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-4">
          <div className="max-w-md rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-900">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-600" />
            <div className="font-bold">{this.state.message}</div>
            <a
              href={this.props.url.split("#")[0]}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              別タブで開く
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const InlinePdfViewerInner = ({ url, title }: InlinePdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<{
    numPages: number;
    getPage: (n: number) => Promise<any>;
    destroy: () => Promise<void>;
  } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [zoom, setZoom] = useState(1);

  const renderPageRange = async (
    doc: { numPages: number; getPage: (n: number) => Promise<any> },
    fromPage: number,
    toPage: number,
    isCancelled: () => boolean
  ) => {
    const containerWidth = Math.max(280, Math.min(820, (containerRef.current?.clientWidth ?? 680) - 24));
    // モバイルGPUメモリ消費を抑えるため描画倍率は最大1.35倍に制限
    const renderDpr = Math.min(window.devicePixelRatio || 1, 1.35);

    for (let pageNum = fromPage; pageNum <= toPage; pageNum += 1) {
      if (isCancelled()) break;
      const page = await doc.getPage(pageNum);
      if (isCancelled()) break;

      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = Math.min(1.3, containerWidth / baseViewport.width);
      const viewport = page.getViewport({ scale: fitScale * renderDpr });

      const offscreen = document.createElement("canvas");
      offscreen.width = Math.floor(viewport.width);
      offscreen.height = Math.floor(viewport.height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) continue;

      // JPEG化前に白背景を塗る
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);

      const renderTask = page.render({ canvasContext: ctx, viewport });
      try {
        await renderTask.promise;
      } catch {
        if (isCancelled()) break;
        continue;
      }

      if (isCancelled()) {
        offscreen.width = 0;
        offscreen.height = 0;
        break;
      }

      const dataUrl = canvasToJpegDataUrl(offscreen);
      offscreen.width = 0;
      offscreen.height = 0;

      const displayWidth = Math.floor(baseViewport.width * fitScale);
      const displayHeight = Math.floor(baseViewport.height * fitScale);

      setPages((prev) => {
        if (prev.some((p) => p.pageNum === pageNum)) return prev;
        return [...prev, { pageNum, src: dataUrl, width: displayWidth, height: displayHeight }];
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadAndRender = async () => {
      setStatus("loading");
      setErrorMessage("");
      setNumPages(0);
      setPages([]);
      setZoom(1);

      try {
        const cleanUrl = url.split("#")[0];
        const response = await fetch(cleanUrl);
        if (!response.ok) {
          throw new Error(`PDFを取得できませんでした (HTTP ${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const header = new TextDecoder("ascii").decode(arrayBuffer.slice(0, 5));
        if (!header.startsWith("%PDF")) {
          throw new Error("提出PDFデータが現在利用できません。時間をおいて再度お試しください。");
        }

        const pdfjsLib = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (cancelled) {
          doc.destroy().catch(() => {});
          return;
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setStatus("ready");

        const initialEnd = Math.min(doc.numPages, INITIAL_PAGE_BATCH);
        await renderPageRange(doc, 1, initialEnd, () => cancelled);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            err instanceof Error ? err.message : "PDFの読み込みに失敗しました。"
          );
        }
      }
    };

    loadAndRender();

    return () => {
      cancelled = true;
      const doc = pdfDocRef.current;
      pdfDocRef.current = null;
      if (doc) {
        window.setTimeout(() => {
          doc.destroy().catch(() => {});
        }, 120);
      }
      // #root がスクロールコンテナのため、クローズ後に #root の再ペイントを確実に促す
      const root = document.getElementById("root");
      if (root) {
        const prev = root.scrollTop;
        window.requestAnimationFrame(() => {
          root.scrollTop = prev + 1;
          root.scrollTop = prev;
        });
      }
    };
  }, [url]);

  const handleLoadMore = async () => {
    const doc = pdfDocRef.current;
    if (!doc || isLoadingMore || pages.length >= numPages) return;
    setIsLoadingMore(true);
    try {
      const start = pages.length + 1;
      const end = Math.min(numPages, start + 4);
      await renderPageRange(doc, start, end, () => !pdfDocRef.current);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 dark:bg-slate-900">
      {/* ズーム・ページ数コントロールバー */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xxs">
        <span className="font-semibold text-muted-foreground">
          {status === "loading"
            ? "PDFを読み込み中..."
            : status === "ready"
              ? `${pages.length} / 全${numPages}ページ表示中`
              : "読み込みエラー"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.2).toFixed(1))))}
            disabled={zoom <= MIN_ZOOM || status !== "ready"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            aria-label="縮小"
            title="縮小"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={status !== "ready"}
            className="inline-flex h-6 min-w-[44px] items-center justify-center rounded border border-border bg-background px-1.5 font-mono text-[10px] font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            title="100%にリセット"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.2).toFixed(1))))}
            disabled={zoom >= MAX_ZOOM || status !== "ready"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            aria-label="拡大"
            title="拡大"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* PDF描画エリア */}
      <div ref={containerRef} className="always-scrollbar min-h-0 flex-1 overflow-auto p-3">
        {status === "loading" && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>{title ? `${title} を開いています...` : "提出PDFを読み込んでいます..."}</span>
          </div>
        )}

        {status === "error" && (
          <div className="mx-auto my-8 max-w-md rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-900">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-600" />
            <div className="font-bold">{errorMessage}</div>
            <p className="mt-1 text-xxs text-amber-800/90">
              別タブから直接開くこともできます。
            </p>
            <a
              href={url.split("#")[0]}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              別タブで開く
            </a>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-3">
            {pages.map((page) => (
              <div
                key={page.pageNum}
                className="mx-auto overflow-hidden rounded border border-border bg-white shadow-sm"
                style={{ width: `${Math.floor(page.width * zoom)}px` }}
              >
                <img
                  src={page.src}
                  alt={`${title ?? "提出PDF"} ${page.pageNum}ページ目`}
                  className="block h-auto w-full"
                  draggable={false}
                />
                <div className="border-t border-border/60 bg-muted/40 px-2 py-0.5 text-right font-mono text-[10px] font-semibold text-muted-foreground">
                  {page.pageNum} / {numPages}
                </div>
              </div>
            ))}

            {pages.length < numPages && (
              <div className="py-2 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-1.5 rounded border border-primary/40 bg-background px-4 py-2 text-xs font-bold text-primary shadow-xs transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isLoadingMore
                    ? "次のページを読み込み中..."
                    : `続きのページを表示（残り${numPages - pages.length}ページ）`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const InlinePdfViewer = (props: InlinePdfViewerProps) => (
  <PdfViewerErrorBoundary url={props.url}>
    <InlinePdfViewerInner {...props} />
  </PdfViewerErrorBoundary>
);

export default InlinePdfViewer;
