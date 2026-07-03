import { type StockData } from "@/data/stockData";
import { getStockProfile } from "@/data/stockProfiles";
import { useLiveStockQuote } from "@/hooks/useLiveStockQuote";

interface StockDetailPanelProps {
  stock: StockData;
}

const StockDetailPanel = ({ stock }: StockDetailPanelProps) => {
  const {
    stock: displayStock,
    status,
    updatedAt,
  } = useLiveStockQuote(stock);
  const isUp = displayStock.change > 0;
  const isDown = displayStock.change < 0;
  const profile = getStockProfile(displayStock.code, displayStock.name);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  const detailRows = [
    { label: "始値", value: displayStock.open.toLocaleString() },
    { label: "高値", value: displayStock.high.toLocaleString() },
    { label: "安値", value: displayStock.low.toLocaleString() },
    { label: "前日終値", value: displayStock.previousClose.toLocaleString() },
    { label: "出来高", value: displayStock.volume.toLocaleString() + "株" },
  ];

  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xxs font-bold text-primary-foreground">
                {displayStock.code}
              </span>
              <span className="text-xs font-bold text-foreground">{displayStock.name}</span>
            </div>
            <span className="text-xxs text-muted-foreground">{displayStock.market}</span>
          </div>
          <div className="flex flex-col items-end gap-1 text-xxs font-semibold text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              {updatedLabel ? `更新 ${updatedLabel}` : status === "loading" ? "取得中" : "更新確認中"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3">
        {/* Current price */}
        <div className="mb-3 text-center">
          <div
            className={`text-2xl font-black tabular-nums ${
              isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-foreground"
            }`}
          >
            {displayStock.price.toLocaleString(undefined, {
              minimumFractionDigits: displayStock.price < 1000 ? 1 : 0,
              maximumFractionDigits: 1,
            })}
          </div>
          <div
            className={`text-sm font-bold tabular-nums ${
              isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"
            }`}
          >
            {isUp ? "+" : ""}
            {displayStock.change.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            ({isUp ? "+" : ""}
            {displayStock.changePercent.toFixed(2)}%)
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

        <div className="mb-3 rounded border border-border bg-background p-2 text-left">
          <div className="mb-1 text-xs font-bold text-foreground">企業説明</div>
          <p className="text-xs leading-relaxed text-foreground">{profile.description}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xxs font-bold text-muted-foreground">主な事業</div>
              <ul className="space-y-0.5 text-xxs leading-relaxed text-foreground">
                {profile.segments.map((segment) => (
                  <li key={segment}>・{segment}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xxs font-bold text-muted-foreground">見るポイント</div>
              <ul className="space-y-0.5 text-xxs leading-relaxed text-foreground">
                {profile.watchPoints.map((point) => (
                  <li key={point}>・{point}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {profile.features.map((feature) => (
              <span
                key={feature}
                className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xxs font-bold text-primary"
              >
                {feature}
              </span>
            ))}
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
