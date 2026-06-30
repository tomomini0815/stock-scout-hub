import { useEffect, useMemo, useRef } from "react";

interface TradingViewWidgetProps {
  scriptSrc: string;
  config: Record<string, unknown>;
  className?: string;
}

const TradingViewWidget = ({ scriptSrc, config, className = "" }: TradingViewWidgetProps) => {
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

  return <div ref={containerRef} className={`tradingview-widget-container h-full ${className}`} />;
};

export default TradingViewWidget;
