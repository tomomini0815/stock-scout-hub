import { type StockData } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface StockRankingTableProps {
  title: string;
  stocks: StockData[];
  type: "gainers" | "losers" | "active";
  limit?: number;
}

const StockRankingTable = ({ title, stocks, type, limit }: StockRankingTableProps) => {
  const [expanded, setExpanded] = useState(false);
  const {
    stocks: liveStocks,
    status,
    updatedAt,
  } = useLiveStockQuotes(stocks);
  const sortedStocks = [...liveStocks].sort((a, b) => {
    if (type === "active") return b.volume - a.volume;
    if (type === "losers") return a.changePercent - b.changePercent;
    return b.changePercent - a.changePercent;
  });
  const displayLimit = expanded ? 20 : limit;
  const displayStocks = sortedStocks.slice(0, displayLimit);
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
      <div className="flex items-center justify-between border-b border-border bg-table-header-bg px-3 py-1.5">
        <h3 className="text-xs font-bold text-foreground">{title}</h3>
        <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
          <span
            className={`rounded px-1.5 py-0.5 ${
              status === "live"
                ? "bg-stock-up-bg text-stock-up"
                : status === "loading"
                ? "bg-muted text-muted-foreground"
                : "bg-stock-down-bg text-stock-down"
            }`}
          >
            {status === "live" ? "LIVE" : status === "loading" ? "取得中" : "固定値"}
          </span>
          {updatedLabel && <span className="hidden sm:inline">更新 {updatedLabel}</span>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground w-8">
                #
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">
                コード
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">
                銘柄名
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">
                株価
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">
                前日比
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">
                {type === "active" ? "出来高" : "騰落率"}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayStocks.map((stock, i) => {
              const isUp = stock.change > 0;
              const isDown = stock.change < 0;
              return (
                <tr
                  key={stock.code}
                  className={`border-b border-border transition-colors hover:bg-muted/50 ${
                    i % 2 === 1 ? "bg-table-stripe" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground font-medium">
                    {i + 1}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-xxs font-semibold text-primary cursor-pointer hover:underline">
                      {stock.code}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-medium text-foreground max-w-[120px] truncate">
                    {stock.name}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-foreground">
                    {stock.price.toLocaleString()}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums font-semibold ${
                      isUp
                        ? "text-stock-up"
                        : isDown
                        ? "text-stock-down"
                        : "text-stock-unchanged"
                    }`}
                  >
                    {isUp ? "+" : ""}
                    {stock.change.toLocaleString()}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums font-semibold ${
                      type === "active"
                        ? "text-foreground"
                        : isUp
                        ? "text-stock-up"
                        : isDown
                        ? "text-stock-down"
                        : "text-stock-unchanged"
                    }`}
                  >
                    {type === "active"
                      ? (stock.volume / 1000).toFixed(0) + "千株"
                      : `${isUp ? "+" : ""}${stock.changePercent.toFixed(2)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {limit && sortedStocks.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-center gap-1 border-t border-border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/50"
        >
          {expanded ? "5位までに戻す" : "もっと見る（20位まで）"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
};

export default StockRankingTable;
