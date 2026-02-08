import { type MarketIndex } from "@/data/stockData";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MarketTickerProps {
  indices: MarketIndex[];
}

const MarketTicker = ({ indices }: MarketTickerProps) => {
  return (
    <div className="overflow-hidden border-b border-border bg-card">
      <div className="flex animate-ticker-scroll gap-6 whitespace-nowrap py-1.5 px-4">
        {[...indices, ...indices].map((index, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{index.name}</span>
            <span className="tabular-nums font-semibold text-foreground">
              {index.value.toLocaleString()}
            </span>
            <span
              className={`flex items-center gap-0.5 tabular-nums font-medium ${
                index.change >= 0 ? "text-stock-up" : "text-stock-down"
              }`}
            >
              {index.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {index.change >= 0 ? "+" : ""}
              {index.change.toFixed(2)} ({index.change >= 0 ? "+" : ""}
              {index.changePercent.toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;
