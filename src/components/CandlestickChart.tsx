import { useMemo } from "react";
import { type CandleData } from "@/data/stockData";

interface CandlestickChartProps {
  data: CandleData[];
  title?: string;
  code?: string;
}

const CandlestickChart = ({ data, title, code }: CandlestickChartProps) => {
  const chartConfig = useMemo(() => {
    const padding = { top: 20, right: 60, bottom: 50, left: 10 };
    const width = 700;
    const height = 320;
    const volumeHeight = 60;
    const chartHeight = height - padding.top - padding.bottom - volumeHeight;

    const allPrices = data.flatMap((d) => [d.high, d.low]);
    const priceMin = Math.min(...allPrices);
    const priceMax = Math.max(...allPrices);
    const pricePadding = (priceMax - priceMin) * 0.05;
    const yMin = priceMin - pricePadding;
    const yMax = priceMax + pricePadding;

    const maxVolume = Math.max(...data.map((d) => d.volume));

    const candleWidth = Math.max(
      2,
      Math.min(8, (width - padding.left - padding.right) / data.length - 2)
    );

    const xScale = (i: number) =>
      padding.left +
      (i / (data.length - 1)) * (width - padding.left - padding.right);
    const yScale = (v: number) =>
      padding.top +
      chartHeight -
      ((v - yMin) / (yMax - yMin)) * chartHeight;
    const volScale = (v: number) =>
      height - padding.bottom - (v / maxVolume) * volumeHeight;

    // Grid lines
    const gridLines = 5;
    const priceStep = (yMax - yMin) / gridLines;
    const gridPrices = Array.from(
      { length: gridLines + 1 },
      (_, i) => yMin + priceStep * i
    );

    return {
      padding,
      width,
      height,
      chartHeight,
      volumeHeight,
      yMin,
      yMax,
      maxVolume,
      candleWidth,
      xScale,
      yScale,
      volScale,
      gridPrices,
    };
  }, [data]);

  const {
    padding,
    width,
    height,
    chartHeight,
    volumeHeight,
    candleWidth,
    xScale,
    yScale,
    volScale,
    gridPrices,
  } = chartConfig;

  return (
    <div className="rounded border border-border bg-card">
      {(title || code) && (
        <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
          {code && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-xxs font-bold text-primary-foreground">
              {code}
            </span>
          )}
          <h3 className="text-xs font-bold text-foreground">{title}</h3>
          <span className="ml-auto text-xxs text-muted-foreground">
            日足チャート
          </span>
        </div>
      )}
      <div className="overflow-x-auto p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[500px]"
          style={{ maxHeight: "340px" }}
        >
          {/* Grid */}
          {gridPrices.map((price, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={yScale(price)}
                x2={width - padding.right}
                y2={yScale(price)}
                className="stroke-chart-grid"
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <text
                x={width - padding.right + 5}
                y={yScale(price) + 3}
                className="fill-muted-foreground text-[9px]"
              >
                {price.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Volume separator */}
          <line
            x1={padding.left}
            y1={height - padding.bottom - volumeHeight}
            x2={width - padding.right}
            y2={height - padding.bottom - volumeHeight}
            className="stroke-border"
            strokeWidth={0.5}
          />

          {/* Candles */}
          {data.map((candle, i) => {
            const x = xScale(i);
            const isUp = candle.close >= candle.open;
            const bodyTop = yScale(Math.max(candle.open, candle.close));
            const bodyBottom = yScale(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(1, bodyBottom - bodyTop);

            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={yScale(candle.high)}
                  x2={x}
                  y2={yScale(candle.low)}
                  stroke={isUp ? "hsl(var(--chart-candle-up))" : "hsl(var(--chart-candle-down))"}
                  strokeWidth={1}
                />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isUp ? "hsl(var(--chart-candle-up))" : "hsl(var(--chart-candle-down))"}
                  stroke={isUp ? "hsl(var(--chart-candle-up))" : "hsl(var(--chart-candle-down))"}
                  strokeWidth={0.5}
                />
                {/* Volume bar */}
                <rect
                  x={x - candleWidth / 2}
                  y={volScale(candle.volume)}
                  width={candleWidth}
                  height={height - padding.bottom - volScale(candle.volume)}
                  fill={isUp ? "hsl(var(--chart-candle-up) / 0.4)" : "hsl(var(--chart-candle-down) / 0.4)"}
                />
              </g>
            );
          })}

          {/* Date labels */}
          {data
            .filter((_, i) => i % Math.ceil(data.length / 8) === 0)
            .map((candle, _, filtered) => {
              const originalIndex = data.indexOf(candle);
              return (
                <text
                  key={originalIndex}
                  x={xScale(originalIndex)}
                  y={height - padding.bottom + 15}
                  className="fill-muted-foreground text-[8px]"
                  textAnchor="middle"
                >
                  {candle.date}
                </text>
              );
            })}

          {/* Volume label */}
          <text
            x={width - padding.right + 5}
            y={height - padding.bottom - volumeHeight + 12}
            className="fill-muted-foreground text-[8px]"
          >
            出来高
          </text>
        </svg>
      </div>
    </div>
  );
};

export default CandlestickChart;
