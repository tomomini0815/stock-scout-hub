import { useEffect, useId } from "react";

export type TradingViewCandleInterval = "15" | "60" | "240" | "D" | "W";

interface TradingViewMiniChartProps {
  symbol: string;
  interval?: TradingViewCandleInterval;
  className?: string;
}

const loadTradingViewScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.TradingView?.widget) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://s3.tradingview.com/tv.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("TradingView script failed")), {
        once: true,
      });
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

export const TradingViewMiniChart = ({
  symbol,
  interval = "D",
  className = "h-[360px] sm:h-[430px]",
}: TradingViewMiniChartProps) => {
  const rawId = useId();
  const containerId = `stock-navi-modal-tv-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const renderWidget = async () => {
      try {
        await loadTradingViewScript();
        if (cancelled || !window.TradingView?.widget) return;
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "";

        const isDark =
          typeof document !== "undefined" &&
          document.documentElement.classList.contains("dark");

        new window.TradingView.widget({
          autosize: true,
          symbol,
          interval,
          timezone: "Asia/Tokyo",
          theme: isDark ? "dark" : "light",
          style: "1",
          locale: "ja",
          enable_publishing: false,
          hide_side_toolbar: true,
          hide_top_toolbar: true,
          hide_legend: false,
          save_image: false,
          allow_symbol_change: false,
          enabled_features: ["countdown"],
          disabled_features: [],
          container_id: containerId,
          // 8分割チャートと同一の日本株標準カラー（陽線: 赤 / 陰線: 青）
          overrides: {
            "mainSeriesProperties.showPriceLine": true,
            "mainSeriesProperties.showCountdown": true,
            "scalesProperties.showSeriesLastValue": true,
            "mainSeriesProperties.candleStyle.upColor": "#dc2626",
            "mainSeriesProperties.candleStyle.downColor": "#2563eb",
            "mainSeriesProperties.candleStyle.drawWick": true,
            "mainSeriesProperties.candleStyle.drawBorder": true,
            "mainSeriesProperties.candleStyle.borderUpColor": "#dc2626",
            "mainSeriesProperties.candleStyle.borderDownColor": "#2563eb",
            "mainSeriesProperties.candleStyle.wickUpColor": "#dc2626",
            "mainSeriesProperties.candleStyle.wickDownColor": "#2563eb",
            "mainSeriesProperties.hollowCandleStyle.upColor": "#dc2626",
            "mainSeriesProperties.hollowCandleStyle.downColor": "#2563eb",
            "mainSeriesProperties.hollowCandleStyle.drawWick": true,
            "mainSeriesProperties.hollowCandleStyle.drawBorder": true,
            "mainSeriesProperties.hollowCandleStyle.borderUpColor": "#dc2626",
            "mainSeriesProperties.hollowCandleStyle.borderDownColor": "#2563eb",
            "mainSeriesProperties.hollowCandleStyle.wickUpColor": "#dc2626",
            "mainSeriesProperties.hollowCandleStyle.wickDownColor": "#2563eb",
            "mainSeriesProperties.barStyle.upColor": "#dc2626",
            "mainSeriesProperties.barStyle.downColor": "#2563eb",
            "mainSeriesProperties.haStyle.upColor": "#dc2626",
            "mainSeriesProperties.haStyle.downColor": "#2563eb",
            "mainSeriesProperties.haStyle.borderUpColor": "#dc2626",
            "mainSeriesProperties.haStyle.borderDownColor": "#2563eb",
            "mainSeriesProperties.haStyle.wickUpColor": "#dc2626",
            "mainSeriesProperties.haStyle.wickDownColor": "#2563eb",
          },
          // 8分割チャートと同一のインジケーター（200MA + ボリンジャーバンド 3σ）
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
      } catch {
        // ignore transient script load failures
      }
    };

    renderWidget();

    return () => {
      cancelled = true;
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = "";
    };
  }, [containerId, symbol, interval]);

  return (
    <div
      id={containerId}
      className={`w-full overflow-hidden rounded border border-border/70 bg-background ${className}`}
    />
  );
};

export default TradingViewMiniChart;
