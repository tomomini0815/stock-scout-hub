import { useEffect, useMemo, useState } from "react";
import { BarChart3, ExternalLink } from "lucide-react";
import { type CandleData } from "@/data/stockData";

interface RealStockChartProps {
  code: string;
  name: string;
  chartSymbol: string;
  chartApiSymbol: string;
  currentPrice?: number;
  currentPriceLabel?: string;
  currentPriceUpdatedAt?: string;
}

type ChartState =
  | { status: "loading"; symbol: string; data: CandleData[] }
  | { status: "ready"; symbol: string; data: CandleData[]; currency: string }
  | { status: "error"; symbol: string; data: CandleData[] };

type ChartPoint = CandleData & {
  sma20?: number;
  sma200?: number;
};

const formatChartDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const compactVolume = (volume: number) => {
  if (volume >= 100000000) return `${(volume / 100000000).toFixed(1)}億`;
  if (volume >= 10000) return `${Math.round(volume / 10000)}万`;
  return volume.toLocaleString();
};

const appendMovingAverages = (data: CandleData[]): ChartPoint[] => {
  const closes = data.map((item) => item.close);

  return data.map((item, index) => {
    const withAverage: ChartPoint = { ...item };

    if (index >= 19) {
      const values = closes.slice(index - 19, index + 1);
      withAverage.sma20 = values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    if (index >= 199) {
      const values = closes.slice(index - 199, index + 1);
      withAverage.sma200 = values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    return withAverage;
  });
};

const buildLinePath = (
  data: ChartPoint[],
  valueKey: "sma20" | "sma200",
  xScale: (index: number) => number,
  yScale: (value: number) => number
) =>
  data.reduce((path, item, index) => {
    const value = item[valueKey];
    if (!Number.isFinite(value)) return path;
    const command = path ? "L" : "M";
    return `${path} ${command}${xScale(index).toFixed(2)},${yScale(value as number).toFixed(2)}`.trim();
  }, "");

const isValidCurrentPrice = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const RealStockChart = ({
  code,
  name,
  chartSymbol,
  chartApiSymbol,
  currentPrice,
  currentPriceLabel = "現在値",
  currentPriceUpdatedAt,
}: RealStockChartProps) => {
  const [state, setState] = useState<ChartState>({
    status: "loading",
    symbol: chartApiSymbol,
    data: [],
  });

  useEffect(() => {
    let isActive = true;
    let controller: AbortController | null = null;
    let timeoutId: number | undefined;

    const loadChart = async () => {
      controller?.abort();
      controller = new AbortController();
      const requestController = controller;
      const timeout = window.setTimeout(() => requestController.abort(), 8000);
      if (isActive) setState({ status: "loading", symbol: chartApiSymbol, data: [] });

      try {
        const endpoint = `/api/stock-chart?symbol=${encodeURIComponent(chartApiSymbol)}&range=2y&interval=1d`;
        const response = await fetch(endpoint, { signal: requestController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        const data = (payload?.candles ?? [])
          .filter((item: CandleData) =>
            [item.open, item.high, item.low, item.close].every((value) => Number.isFinite(value) && value > 0)
          )
          .slice(-520);

        if (!data.length) throw new Error("有効なOHLCがありません");
        if (isActive) setState({ status: "ready", symbol: chartApiSymbol, data, currency: payload?.currency ?? "JPY" });
      } catch {
        if (isActive) setState({ status: "error", symbol: chartApiSymbol, data: [] });
      } finally {
        window.clearTimeout(timeout);
      }
    };

    loadChart();
    timeoutId = window.setInterval(loadChart, 5 * 60 * 1000);

    return () => {
      isActive = false;
      if (timeoutId) window.clearInterval(timeoutId);
      controller?.abort();
    };
  }, [chartApiSymbol]);

  const isCurrentChart = state.symbol === chartApiSymbol;
  const chartStatus = isCurrentChart ? state.status : "loading";
  const chartData = isCurrentChart ? state.data : [];

  const displayData = useMemo(() => {
    if (!isValidCurrentPrice(currentPrice) || !chartData.length) return chartData;

    const latest = chartData.at(-1);
    if (!latest) return chartData;

    return [
      ...chartData.slice(0, -1),
      {
        ...latest,
        close: currentPrice,
        high: Math.max(latest.high, currentPrice),
        low: Math.min(latest.low, currentPrice),
      },
    ];
  }, [chartData, currentPrice]);

  const latestWithAverage = useMemo(() => appendMovingAverages(displayData).at(-1), [displayData]);

  const chart = useMemo(() => {
    const data = appendMovingAverages(displayData).slice(-120);
    const width = 980;
    const height = 360;
    const padding = { top: 18, right: 58, bottom: 34, left: 8 };
    const volumeHeight = 62;
    const priceHeight = height - padding.top - padding.bottom - volumeHeight;

    const currentPriceValue = isValidCurrentPrice(currentPrice) ? currentPrice : undefined;
    const prices = data
      .flatMap((item) => [item.high, item.low, item.sma20, item.sma200, currentPriceValue])
      .filter(Number.isFinite);
    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);
    const pricePadding = Math.max(1, (priceMax - priceMin) * 0.035);
    const yMin = priceMin - pricePadding;
    const yMax = priceMax + pricePadding;
    const maxVolume = Math.max(...data.map((item) => item.volume), 1);
    const candleWidth = Math.max(2, Math.min(8, (width - padding.left - padding.right) / Math.max(data.length, 1) - 2));

    const xScale = (index: number) =>
      padding.left + (index / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right);
    const yScale = (value: number) =>
      padding.top + priceHeight - ((value - yMin) / Math.max(yMax - yMin, 1)) * priceHeight;
    const volumeScale = (value: number) =>
      height - padding.bottom - (value / maxVolume) * volumeHeight;

    return {
      candleWidth,
      data,
      height,
      padding,
      volumeHeight,
      volumeScale,
      width,
      xScale,
      yScale,
      yMax,
      yMin,
      currentPriceValue,
      currentPriceY: currentPriceValue ? yScale(currentPriceValue) : undefined,
      sma20Path: buildLinePath(data, "sma20", xScale, yScale),
      sma200Path: buildLinePath(data, "sma200", xScale, yScale),
    };
  }, [currentPrice, displayData]);

  const latest = displayData.at(-1);
  const previous = displayData.at(-2);
  const change = latest && previous ? latest.close - previous.close : 0;
  const isUp = change >= 0;
  return (
    <div className="mb-3 overflow-hidden rounded border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          実チャート
          <span className="font-mono text-xxs text-muted-foreground">{chartSymbol}</span>
        </div>
        <div className="flex items-center gap-2 text-xxs text-muted-foreground">
          {chartStatus === "ready" ? "Yahoo Finance日足・表示約1年" : chartStatus === "loading" ? "取得中" : "取得失敗"}
          <a
            href={`https://finance.yahoo.com/quote/${chartApiSymbol}/chart`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            詳細
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {chartData.length ? (
        <div className="p-2">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-foreground">
                {code} {name}
              </div>
              <div className="text-xxs text-muted-foreground">
                {chartStatus === "ready" ? "外部データ取得済み" : "直近日足OHLC"}・20SMA/200SMA
              </div>
            </div>
            {latest && (
              <div className="text-right">
                <div className={`text-sm font-black tabular-nums ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                  {latest.close.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </div>
                <div className={`text-xxs font-bold tabular-nums ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                  {isUp ? "+" : ""}
                  {change.toFixed(1)}
                </div>
                {isValidCurrentPrice(currentPrice) && (
                  <div className="text-[10px] font-semibold text-muted-foreground">
                    {currentPriceLabel}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-1 flex flex-wrap gap-2 text-xxs font-semibold">
            <span className="inline-flex items-center gap-1 text-sky-600">
              <span className="h-0.5 w-4 rounded bg-sky-500" />
              20SMA {latestWithAverage?.sma20?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "-"}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600">
              <span className="h-0.5 w-4 rounded bg-amber-500" />
              200SMA {latestWithAverage?.sma200?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "-"}
            </span>
            {isValidCurrentPrice(currentPrice) && (
              <span className="inline-flex items-center gap-1 text-blue-700">
                <span className="h-0.5 w-4 rounded border-t border-dashed border-blue-600" />
                {currentPriceLabel} {currentPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
            )}
          </div>

          <div>
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              preserveAspectRatio="none"
              className="h-[260px] w-full md:h-[300px]"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const price = chart.yMax - (chart.yMax - chart.yMin) * ratio;
                const y = chart.yScale(price);
                return (
                  <g key={ratio}>
                    <line
                      x1={chart.padding.left}
                      x2={chart.width - chart.padding.right}
                      y1={y}
                      y2={y}
                      className="stroke-chart-grid"
                      strokeDasharray="2,2"
                      strokeWidth={0.5}
                    />
                    <text x={chart.width - chart.padding.right + 5} y={y + 3} className="fill-muted-foreground text-[8px]">
                      {price.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={chart.padding.left}
                x2={chart.width - chart.padding.right}
                y1={chart.height - chart.padding.bottom - chart.volumeHeight}
                y2={chart.height - chart.padding.bottom - chart.volumeHeight}
                className="stroke-border"
                strokeWidth={0.5}
              />

              {chart.currentPriceValue && chart.currentPriceY && (
                <g>
                  <line
                    x1={chart.padding.left}
                    x2={chart.width - chart.padding.right}
                    y1={chart.currentPriceY}
                    y2={chart.currentPriceY}
                    stroke="rgb(37 99 235)"
                    strokeDasharray="5,4"
                    strokeWidth={1.2}
                  />
                  <text
                    x={chart.width - chart.padding.right + 5}
                    y={chart.currentPriceY - 3}
                    className="fill-blue-700 text-[8px] font-bold"
                  >
                    {chart.currentPriceValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                </g>
              )}

              {chart.data.map((item, index) => {
                const x = chart.xScale(index);
                const candleUp = item.close >= item.open;
                const bodyTop = chart.yScale(Math.max(item.open, item.close));
                const bodyBottom = chart.yScale(Math.min(item.open, item.close));
                const bodyHeight = Math.max(1, bodyBottom - bodyTop);
                const color = candleUp ? "hsl(var(--chart-candle-up))" : "hsl(var(--chart-candle-down))";
                const volumeColor = candleUp
                  ? "hsl(var(--chart-candle-up) / 0.35)"
                  : "hsl(var(--chart-candle-down) / 0.35)";

                return (
                  <g key={`${item.date}-${index}`}>
                    <line x1={x} x2={x} y1={chart.yScale(item.high)} y2={chart.yScale(item.low)} stroke={color} strokeWidth={1} />
                    <rect
                      x={x - chart.candleWidth / 2}
                      y={bodyTop}
                      width={chart.candleWidth}
                      height={bodyHeight}
                      fill={color}
                      stroke={color}
                      strokeWidth={0.5}
                    />
                    <rect
                      x={x - chart.candleWidth / 2}
                      y={chart.volumeScale(item.volume)}
                      width={chart.candleWidth}
                      height={chart.height - chart.padding.bottom - chart.volumeScale(item.volume)}
                      fill={volumeColor}
                    />
                  </g>
                );
              })}

              {chart.sma20Path && (
                <path
                  d={chart.sma20Path}
                  fill="none"
                  stroke="rgb(14 165 233)"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {chart.sma200Path && (
                <path
                  d={chart.sma200Path}
                  fill="none"
                  stroke="rgb(245 158 11)"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {chart.data
                .filter((_, index) => index % Math.ceil(chart.data.length / 8) === 0)
                .map((item) => {
                  const index = chart.data.indexOf(item);
                  return (
                    <text
                      key={`${item.date}-label`}
                      x={chart.xScale(index)}
                      y={chart.height - chart.padding.bottom + 17}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[8px]"
                    >
                      {item.date}
                    </text>
                  );
                })}
              {latest && (
                <text x={chart.width - chart.padding.right + 5} y={chart.height - chart.padding.bottom - chart.volumeHeight + 12} className="fill-muted-foreground text-[8px]">
                  {compactVolume(latest.volume)}
                </text>
              )}
            </svg>
          </div>
        </div>
      ) : chartStatus === "loading" ? (
        <div className="flex h-[330px] flex-col items-center justify-center gap-2 p-2 text-xs font-semibold text-muted-foreground">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
          チャートデータを取得中
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-muted-foreground">
          チャートデータを取得できませんでした。
        </div>
      )}
    </div>
  );
};

export default RealStockChart;
