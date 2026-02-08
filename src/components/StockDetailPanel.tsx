import { type StockData } from "@/data/stockData";

interface StockDetailPanelProps {
  stock: StockData;
}

const StockDetailPanel = ({ stock }: StockDetailPanelProps) => {
  const isUp = stock.change > 0;
  const isDown = stock.change < 0;

  const detailRows = [
    { label: "始値", value: stock.open.toLocaleString() },
    { label: "高値", value: stock.high.toLocaleString() },
    { label: "安値", value: stock.low.toLocaleString() },
    { label: "前日終値", value: stock.previousClose.toLocaleString() },
    { label: "出来高", value: stock.volume.toLocaleString() + "株" },
  ];

  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary px-1.5 py-0.5 text-xxs font-bold text-primary-foreground">
            {stock.code}
          </span>
          <span className="text-xs font-bold text-foreground">{stock.name}</span>
        </div>
        <span className="text-xxs text-muted-foreground">{stock.market}</span>
      </div>

      <div className="p-3">
        {/* Current price */}
        <div className="mb-3 text-center">
          <div
            className={`text-2xl font-black tabular-nums ${
              isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-foreground"
            }`}
          >
            {stock.price.toLocaleString()}
          </div>
          <div
            className={`text-sm font-bold tabular-nums ${
              isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"
            }`}
          >
            {isUp ? "+" : ""}
            {stock.change.toLocaleString()} ({isUp ? "+" : ""}
            {stock.changePercent.toFixed(2)}%)
          </div>
          <div
            className={`mt-1 inline-block rounded px-2 py-0.5 text-xxs font-bold ${
              isUp
                ? "bg-stock-up-bg text-stock-up"
                : isDown
                ? "bg-stock-down-bg text-stock-down"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isUp ? "▲ 上昇" : isDown ? "▼ 下落" : "― 変わらず"}
          </div>
        </div>

        {/* Details table */}
        <table className="w-full text-xs">
          <tbody>
            {detailRows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <td className="py-1.5 font-medium text-muted-foreground">
                  {row.label}
                </td>
                <td className="py-1.5 text-right tabular-nums font-semibold text-foreground">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockDetailPanel;
