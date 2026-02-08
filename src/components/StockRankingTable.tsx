import { type StockData } from "@/data/stockData";

interface StockRankingTableProps {
  title: string;
  stocks: StockData[];
  type: "gainers" | "losers" | "active";
}

const StockRankingTable = ({ title, stocks, type }: StockRankingTableProps) => {
  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-table-header-bg px-3 py-1.5">
        <h3 className="text-xs font-bold text-foreground">{title}</h3>
        <button className="text-xxs text-muted-foreground hover:text-foreground transition-colors">
          もっと見る →
        </button>
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
            {stocks.map((stock, i) => {
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
    </div>
  );
};

export default StockRankingTable;
