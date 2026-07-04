import { useEffect, useMemo, useRef, useState } from "react";

interface TradingViewWidgetProps {
  scriptSrc: string;
  config: Record<string, unknown>;
  className?: string;
}

const TradingViewWidget = ({ scriptSrc, config, className = "" }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const serializedConfig = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setIsReady(false);
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

    let iframeLoadTimeout: number | undefined;
    const markReady = () => {
      window.clearTimeout(iframeLoadTimeout);
      setIsReady(true);
    };
    const attachIframeLoad = () => {
      const iframe = container.querySelector("iframe");
      if (!iframe) return;

      iframe.addEventListener("load", markReady, { once: true });
      iframeLoadTimeout = window.setTimeout(markReady, 4500);
    };
    const observer = new MutationObserver(attachIframeLoad);
    observer.observe(container, { childList: true, subtree: true });
    script.addEventListener("error", markReady, { once: true });
    attachIframeLoad();

    return () => {
      observer.disconnect();
      window.clearTimeout(iframeLoadTimeout);
      container.innerHTML = "";
    };
  }, [scriptSrc, serializedConfig]);

  return (
    <div className={`relative h-full ${className}`}>
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background text-xs font-semibold text-muted-foreground">
          TradingViewを読み込み中
        </div>
      )}
      <div
        ref={containerRef}
        className={`tradingview-widget-container h-full transition-opacity duration-150 ${isReady ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
};

export default TradingViewWidget;
