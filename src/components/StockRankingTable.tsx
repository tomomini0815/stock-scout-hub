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
    <div className="overflow-hidden rounded border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-2.5 py-1.5 sm:px-3">
        <h3 className="text-xs font-bold text-foreground whitespace-nowrap shrink-0">{title}</h3>
        <div className="flex shrink-0 items-center gap-2 text-xxs font-semibold text-muted-foreground">
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground whitespace-nowrap">
            {updatedLabel ? `更新 ${updatedLabel}` : status === "loading" ? "取得中" : "更新確認中"}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={title}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-7 px-1.5 py-1.5 text-left font-semibold text-muted-foreground sm:w-8 sm:px-2">
                #
              </th>
              <th className="hidden px-2 py-1.5 text-left font-semibold text-muted-foreground sm:table-cell">
                コード
              </th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-muted-foreground sm:px-2">
                銘柄名
              </th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-muted-foreground sm:px-2">
                株価
              </th>
              <th className="hidden px-2 py-1.5 text-right font-semibold text-muted-foreground sm:table-cell">
                前日比
              </th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-muted-foreground sm:px-2">
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
                  <td className="px-1.5 py-2 tabular-nums text-muted-foreground font-medium sm:px-2 sm:py-1.5">
                    {i + 1}
                  </td>
                  <td className="hidden px-2 py-1.5 sm:table-cell">
                    <span className="font-mono text-xxs font-semibold text-primary cursor-pointer hover:underline">
                      {stock.code}
                    </span>
                  </td>
                  <td className="max-w-[140px] px-1.5 py-2 font-medium text-foreground sm:max-w-[120px] sm:px-2 sm:py-1.5">
                    <div className="truncate">{stock.name}</div>
                    <div className="font-mono text-[10px] text-primary sm:hidden">{stock.code}</div>
                  </td>
                  <td className="px-1.5 py-2 text-right tabular-nums font-semibold text-foreground sm:px-2 sm:py-1.5">
                    <div>{stock.price.toLocaleString()}</div>
                    <div
                      className={`text-[10px] font-semibold sm:hidden ${
                        isUp
                          ? "text-stock-up"
                          : isDown
                          ? "text-stock-down"
                          : "text-stock-unchanged"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {stock.change.toLocaleString()}
                    </div>
                  </td>
                  <td
                    className={`hidden px-2 py-1.5 text-right tabular-nums font-semibold sm:table-cell ${
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
                    className={`whitespace-nowrap px-1.5 py-2 text-right tabular-nums font-semibold sm:px-2 sm:py-1.5 ${
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
          className="flex min-h-[40px] w-full items-center justify-center gap-1 whitespace-nowrap border-t border-border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/50 sm:min-h-0"
        >
          {expanded ? `${limit}位までに戻す` : "もっと見る（20位まで）"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
};

export default StockRankingTable;
