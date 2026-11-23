import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type FlowNewsImpact, type NewsImpactDirection } from "@/lib/moneyFlowAnalysis";

export type ArticleBodyState =
  | { status: "loading"; summary?: string; fullText?: string }
  | { status: "ready"; summary: string; fullText: string }
  | { status: "error"; summary?: string; fullText?: string };

const getAssetBadgeClass = (label: string) => {
  switch (label) {
    case "日本株":
      return "border border-slate-300 bg-slate-100 text-slate-800";
    case "米国テック":
      return "border border-indigo-200 bg-indigo-50 text-indigo-700";
    case "米国優良株":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "米国債":
      return "border border-blue-200 bg-blue-50 text-blue-700";
    case "米ドル":
      return "border border-cyan-200 bg-cyan-50 text-cyan-800";
    case "ゴールド":
      return "border border-amber-200 bg-amber-50 text-amber-800";
    case "原油":
      return "border border-orange-200 bg-orange-50 text-orange-800";
    case "仮想通貨":
      return "border border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border border-slate-300 bg-slate-100 text-slate-700";
  }
};

const getDirectionBadgeClass = (direction: NewsImpactDirection) => {
  switch (direction) {
    case "bullish":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
    case "bearish":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
  }
};

interface FlowNewsReaderModalProps {
  item: FlowNewsImpact | null;
  bodyState?: ArticleBodyState;
  onClose: () => void;
}

const FlowNewsReaderModal = ({ item, bodyState, onClose }: FlowNewsReaderModalProps) => {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-[94vw] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {item && (
          <>
            <DialogHeader className="border-b border-border bg-table-header-bg px-5 py-4 pr-11 text-left">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xxs">
                {item.dateLabel && (
                  <span className="tabular-nums font-medium text-muted-foreground">
                    {item.dateLabel}
                  </span>
                )}
                {item.matchedCupLabels.map((label) => (
                  <span
                    key={label}
                    className={`rounded px-1.5 py-0.5 font-bold ${getAssetBadgeClass(label)}`}
                  >
                    {label}
                  </span>
                ))}
                <span
                  className={`rounded border px-1.5 py-0.5 font-bold ${getDirectionBadgeClass(
                    item.direction
                  )}`}
                >
                  {item.directionLabel}
                </span>
                <span className="rounded border border-border bg-background px-1.5 py-0.5 font-semibold text-foreground/80">
                  材料: {item.impactTag}
                </span>
              </div>
              <DialogTitle className="text-sm sm:text-base font-extrabold leading-snug text-foreground">
                {item.title}
              </DialogTitle>
              <DialogDescription className="pt-0.5 text-xxs text-muted-foreground">
                出典: {item.source}
              </DialogDescription>
            </DialogHeader>

            <div className="always-scrollbar flex-1 space-y-4 px-5 py-4">
              <div>
                <h4 className="mb-2 text-xs font-bold text-foreground/75">記事本文</h4>
                {bodyState?.status === "loading" ? (
                  <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    記事本文を読み込んでいます...
                  </p>
                ) : bodyState?.status === "ready" ? (
                  <p className="whitespace-pre-line text-xs sm:text-sm leading-7 text-foreground/95">
                    {bodyState.fullText || bodyState.summary}
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    元サイト側の制限により本文を直接取得できませんでした。下の「元記事を開く」リンクから全文を確認できます。
                  </p>
                )}
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3.5">
                <div className="mb-1 text-xs font-bold text-primary">資金フローへの影響解説</div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-foreground/85">
                  {item.impactSummary}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/20 px-5 py-3">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/85 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <span>元記事を開く</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                閉じる
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FlowNewsReaderModal;
