import { Columns3, Grid2X2, List } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface TradingViewSymbolConfig {
  id: string;
  name: string;
  symbol: string;
  currentPrice?: string;
  changeLabel?: string;
}

interface TradingViewQuadPanelProps {
  symbols: TradingViewSymbolConfig[];
  drawingEnabled: boolean;
  onLayoutChange?: (layout: "8" | "4") => void;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

const intervals = [
  { label: "日足", value: "D" },
  { label: "4時間", value: "240" },
  { label: "1時間", value: "60" },
  { label: "15分", value: "15" },
];

const loadTradingViewScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.TradingView?.widget) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://s3.tradingview.com/tv.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("TradingView script failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TradingView script failed"));
    document.head.appendChild(script);
  });

const createTradingViewWidget = (
  containerId: string,
  symbol: string,
  interval: string,
  showIndicatorLegend: boolean,
  drawingEnabled: boolean
) => {
  const container = document.getElementById(containerId);
  if (!container || !window.TradingView?.widget) return;

  container.innerHTML = "";

  new window.TradingView.widget({
    autosize: true,
    symbol,
    interval,
    timezone: "Asia/Tokyo",
    theme: "light",
    style: "1",
    locale: "ja",
    enable_publishing: false,
    hide_side_toolbar: !drawingEnabled,
    hide_top_toolbar: false,
    hide_legend: !showIndicatorLegend,
    save_image: false,
    allow_symbol_change: false,
    enabled_features: ["countdown"],
    disabled_features: [],
    container_id: containerId,
    overrides: {
      "mainSeriesProperties.showPriceLine": true,
      "mainSeriesProperties.showCountdown": true,
      "scalesProperties.showSeriesLastValue": true,
    },
    studies: ["MASimple@tv-basicstudies", "BB@tv-basicstudies"],
    studies_overrides: {
      "moving average.length": 200,
      "moving average.ma.linewidth": 2,
      "Moving Average.length": 200,
      "Moving Average.ma.linewidth": 2,
      "bollinger bands.stddev": 3,
      "bollinger bands.upper.linestyle": 1,
      "bollinger bands.upper.linewidth": 1,
      "bollinger bands.lower.linestyle": 1,
      "bollinger bands.lower.linewidth": 1,
      "bollinger bands.basis.linewidth": 3,
      "bollinger bands.basis.color": "rgba(239, 68, 68, 0.5)",
      "bollinger bands.median.color": "rgba(239, 68, 68, 0.5)",
      "bollinger bands.middle.color": "rgba(239, 68, 68, 0.5)",
      "Bollinger Bands.stddev": 3,
      "Bollinger Bands.upper.linestyle": 1,
      "Bollinger Bands.upper.linewidth": 1,
      "Bollinger Bands.lower.linestyle": 1,
      "Bollinger Bands.lower.linewidth": 1,
      "Bollinger Bands.basis.linewidth": 3,
      "Bollinger Bands.basis.color": "rgba(239, 68, 68, 0.5)",
      "Bollinger Bands.median.color": "rgba(239, 68, 68, 0.5)",
      "Bollinger Bands.middle.color": "rgba(239, 68, 68, 0.5)",
    },
  });
};

const clearTradingViewContainers = (containerIds: Iterable<string>) => {
  Array.from(containerIds).forEach((containerId) => {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
  });
};

const TradingViewQuadPanel = ({ symbols, drawingEnabled, onLayoutChange }: TradingViewQuadPanelProps) => {
  const instanceId = useMemo(() => `stock-navi-tv-${Math.random().toString(36).slice(2)}`, []);
  const [activeTab, setActiveTab] = useState("all");
  const [showIndicatorLegend, setShowIndicatorLegend] = useState(false);
  const [stackMode, setStackMode] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const renderedSignatureRef = useRef("");
  const renderedContainerIdsRef = useRef<Set<string>>(new Set());
  const resizeTimeoutRef = useRef<number>();

  const visibleSymbols = useMemo(() => symbols.slice(0, 8), [symbols]);
  const activeSymbol = visibleSymbols.find((item) => item.id === activeTab);

  const initTabCharts = useCallback((tabName: string) => {
    if (!isNearViewport || !scriptReady) return;
    const signature = [
      tabName,
      showIndicatorLegend ? "legend" : "no-legend",
      drawingEnabled ? "drawing" : "no-drawing",
      visibleSymbols.map((item) => `${item.id}:${item.symbol}`).join("|"),
    ].join("::");
    if (renderedSignatureRef.current === signature) return;

    clearTradingViewContainers(renderedContainerIdsRef.current);
    renderedContainerIdsRef.current.clear();

    if (tabName === "all") {
      visibleSymbols.forEach((item) => {
        const containerId = `${instanceId}-all-${item.id}`;
        renderedContainerIdsRef.current.add(containerId);
        createTradingViewWidget(containerId, item.symbol, "240", showIndicatorLegend, drawingEnabled);
      });
    } else {
      const symbolConfig = visibleSymbols.find((item) => item.id === tabName);
      if (!symbolConfig) return;

      intervals.forEach((interval) => {
        const containerId = `${instanceId}-${tabName}-${interval.value}`;
        renderedContainerIdsRef.current.add(containerId);
        createTradingViewWidget(containerId, symbolConfig.symbol, interval.value, showIndicatorLegend, drawingEnabled);
      });
    }

    renderedSignatureRef.current = signature;
    if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  }, [drawingEnabled, instanceId, isNearViewport, scriptReady, showIndicatorLegend, visibleSymbols]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (!("IntersectionObserver" in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(panel);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNearViewport) return;

    let isActive = true;
    loadTradingViewScript()
      .then(() => {
        if (isActive) setScriptReady(true);
      })
      .catch(() => {
        if (isActive) setScriptReady(false);
      });

    return () => {
      isActive = false;
    };
  }, [isNearViewport]);

  useEffect(() => {
    initTabCharts(activeTab);
  }, [activeTab, initTabCharts]);

  useEffect(() => {
    onLayoutChange?.(activeTab === "all" ? "8" : "4");
  }, [activeTab, onLayoutChange]);

  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);
      clearTradingViewContainers(renderedContainerIdsRef.current);
      renderedContainerIdsRef.current.clear();
      renderedSignatureRef.current = "";
    };
  }, []);

  return (
    <div ref={panelRef} className="overflow-hidden rounded border border-border bg-card text-foreground shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-table-header-bg px-2 py-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`h-7 shrink-0 rounded border px-2 text-xxs font-bold transition-colors ${
            activeTab === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          ALL
        </button>
        {visibleSymbols.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`h-7 shrink-0 rounded border px-2 text-xxs font-bold transition-colors ${
              activeTab === item.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowIndicatorLegend((value) => !value)}
          className={`ml-auto inline-flex h-7 shrink-0 items-center rounded border px-2 text-xxs font-bold transition-colors ${
            showIndicatorLegend
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={showIndicatorLegend ? "MA・BBの名称と数値を閉じる" : "MA・BBの名称と数値を表示"}
        >
          {showIndicatorLegend ? "表示中" : "インジケーター"}
        </button>
        <button
          type="button"
          onClick={() => setStackMode((value) => !value)}
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border transition-colors ${
            stackMode
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          aria-label={stackMode ? "4分割表示に戻す" : "縦並び表示にする"}
          title={stackMode ? "4分割表示" : "縦並び表示"}
        >
          {stackMode ? <Grid2X2 className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className={`p-1.5 ${activeTab === "all" ? "h-[2560px] md:h-[1680px] xl:h-[1920px]" : "h-[1040px] md:h-[1120px] xl:h-[1280px]"}`}>
        {activeTab === "all" ? (
          <div className="grid h-full grid-cols-1 gap-1.5 md:grid-cols-2">
            {visibleSymbols.map((item) => (
              <div key={item.id} className="flex min-h-0 flex-col overflow-hidden rounded border border-border bg-background">
                <div className="flex h-7 shrink-0 items-center justify-between border-b border-border bg-muted/60 px-2">
                  <span className="truncate text-[10px] font-bold text-foreground">{item.name} (4時間足)</span>
                  <span className="shrink-0 pl-2 text-right font-mono text-[9px] font-bold text-foreground">
                    {item.currentPrice ?? item.symbol}
                  </span>
                </div>
                <div id={`${instanceId}-all-${item.id}`} className="min-h-0 flex-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid h-full gap-1.5 ${stackMode ? "grid-cols-1 grid-rows-4" : "grid-cols-1 md:grid-cols-2 md:grid-rows-2"}`}>
            {intervals.map((interval) => (
              <div key={interval.value} className="flex min-h-0 flex-col overflow-hidden rounded border border-border bg-background">
                <div className="flex h-7 shrink-0 items-center justify-between border-b border-border bg-muted/60 px-2">
                  <span className="truncate text-[10px] font-bold text-foreground">
                    {activeSymbol?.name} ({interval.label})
                  </span>
                  <span className="shrink-0 pl-2 text-right font-mono text-[9px] font-bold text-foreground">
                    {activeSymbol?.currentPrice ?? activeSymbol?.symbol}
                  </span>
                </div>
                <div id={`${instanceId}-${activeTab}-${interval.value}`} className="min-h-0 flex-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {!scriptReady && (
        <div className="border-t border-border bg-muted px-3 py-2 text-xxs font-semibold text-muted-foreground">
          TradingViewを読み込み中
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-border bg-muted px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
        <Columns3 className="h-3 w-3 text-primary" />
        <span>MA200 / BB3σ / 描画ツール{drawingEnabled ? "ON" : "OFF"}</span>
      </div>
    </div>
  );
};

export default TradingViewQuadPanel;
