import { type MarketIndex } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MarketOverviewProps {
  indices: MarketIndex[];
}

const MarketOverview = ({ indices }: MarketOverviewProps) => {
  const {
    indices: displayIndices,
    status,
    updatedAt,
  } = useLiveMarketData(indices);

  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
        <h3 className="text-xs font-bold text-foreground">主要指数</h3>
        <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
          <span
            className={`rounded px-1.5 py-0.5 ${
              status === "live"
                ? "bg-stock-up-bg text-stock-up"
                : status === "cached"
                ? "bg-muted text-muted-foreground"
                : "bg-stock-down-bg text-stock-down"
            }`}
          >
            {status === "live" ? "LIVE" : status === "cached" ? "前回値" : "固定値"}
          </span>
          {updatedLabel && <span>更新 {updatedLabel}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
        {displayIndices.map((index, i) => {
          const isUp = index.change > 0;
          const isDown = index.change < 0;
          return (
            <div
              key={index.name}
              className={`border-b border-r border-border p-2.5 transition-colors hover:bg-muted/50 ${
                i % 2 === 0 ? "" : ""
              }`}
            >
              <div className="mb-1 text-xxs font-medium text-muted-foreground">
                {index.name}
              </div>
              <div className="mb-0.5 text-sm font-bold tabular-nums text-foreground">
                {index.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={`flex items-center gap-1 text-xxs font-semibold tabular-nums ${
                  isUp
                    ? "text-stock-up"
                    : isDown
                    ? "text-stock-down"
                    : "text-stock-unchanged"
                }`}
              >
                {isUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : isDown ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>
                  {isUp ? "+" : ""}
                  {index.change.toFixed(2)}
                </span>
                <span>
                  ({isUp ? "+" : ""}
                  {index.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketOverview;
