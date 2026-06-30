import { ExternalLink, LineChart } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { type StockData } from "@/data/stockData";
import ShikihoStyleAnalysis from "@/components/ShikihoStyleAnalysis";

interface TradingViewPanelProps {
  stock: StockData;
}

interface TradingViewWidgetProps {
  scriptSrc: string;
  config: Record<string, unknown>;
}

const TradingViewWidget = ({ scriptSrc, config }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const serializedConfig = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = scriptSrc;
    script.innerHTML = serializedConfig;

    container.appendChild(widget);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [scriptSrc, serializedConfig]);

  return <div ref={containerRef} className="tradingview-widget-container h-full min-h-[260px]" />;
};

const TradingViewPanel = ({ stock }: TradingViewPanelProps) => {
  const symbol = `TSE:${stock.code}`;
  const chartUrl = `https://jp.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;

  return (
    <section className="rounded border border-border bg-card">
      <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">TradingView公式情報</h3>
          <span className="rounded bg-primary px-2 py-0.5 text-xxs font-bold text-primary-foreground">
            公式ウィジェット
          </span>
        </div>
        <a
          href={chartUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 text-xxs font-semibold text-primary hover:underline"
        >
          TradingViewで開く
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-3">
        <div className="min-h-[150px] overflow-hidden rounded border border-border bg-background">
          <TradingViewWidget
            scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js"
            config={{
              symbol,
              width: "100%",
              locale: "ja",
              colorTheme: "light",
              isTransparent: true,
            }}
          />
        </div>
        <div className="min-h-[360px]">
          <ShikihoStyleAnalysis stock={stock} embedded />
        </div>
        <div className="min-h-[360px] overflow-hidden rounded border border-border bg-background">
          <TradingViewWidget
            scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
            config={{
              interval: "1D",
              width: "100%",
              height: 360,
              isTransparent: true,
              symbol,
              showIntervalTabs: true,
              displayMode: "single",
              locale: "ja",
              colorTheme: "light",
            }}
          />
        </div>
        <div className="min-h-[560px] overflow-hidden rounded border border-border bg-background lg:col-span-3">
          <TradingViewWidget
            scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
            config={{
              symbol,
              width: "100%",
              height: 550,
              isTransparent: true,
              displayMode: "regular",
              locale: "ja",
              colorTheme: "light",
            }}
          />
        </div>
      </div>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        TradingViewの公式埋め込みウィジェットを表示しています。ファンダメンタル項目の有無はTradingView側の配信状況に依存します。
      </div>
    </section>
  );
};

export default TradingViewPanel;
