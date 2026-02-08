import { type MarketIndex } from "@/data/stockData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MarketOverviewProps {
  indices: MarketIndex[];
}

const MarketOverview = ({ indices }: MarketOverviewProps) => {
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
        <h3 className="text-xs font-bold text-foreground">主要指数</h3>
      </div>
      <div className="grid grid-cols-2 gap-0 lg:grid-cols-4">
        {indices.map((index, i) => {
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
