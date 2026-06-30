import { useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices, stockUniverse } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { SlidersHorizontal, Search } from "lucide-react";

const allStocks = stockUniverse;

const ScreeningPage = () => {
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [changeMin, setChangeMin] = useState("");
  const [volumeMin, setVolumeMin] = useState("");
  const { stocks: liveStocks, status, updatedAt } = useLiveStockQuotes(allStocks);

  const results = useMemo(() => {
    return liveStocks
      .filter((stock) => {
        if (priceMin && stock.price < Number(priceMin)) return false;
        if (priceMax && stock.price > Number(priceMax)) return false;
        if (changeMin && stock.changePercent < Number(changeMin)) return false;
        if (volumeMin && stock.volume < Number(volumeMin) * 10000) return false;
        return true;
      })
      .sort((a, b) => b.changePercent - a.changePercent);
  }, [changeMin, liveStocks, priceMax, priceMin, volumeMin]);

  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="スクリーニング" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          スクリーニング
        </h2>

        {/* Filter Panel */}
        <div className="mb-3 rounded border border-border bg-card p-3">
          <h3 className="mb-2 text-xs font-bold text-foreground">条件設定</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">株価（最小）</label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="例: 1000"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">株価（最大）</label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="例: 10000"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">騰落率（最小%）</label>
              <input
                type="number"
                value={changeMin}
                onChange={(e) => setChangeMin(e.target.value)}
                placeholder="例: 1.0"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">出来高（万株以上）</label>
              <input
                type="number"
                value={volumeMin}
                onChange={(e) => setVolumeMin(e.target.value)}
                placeholder="例: 100"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
            <Search className="h-3 w-3" />
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
            {updatedLabel && <span>更新 {updatedLabel}</span>}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xxs text-muted-foreground">
            <Search className="h-3 w-3" />
            条件を変更すると自動で絞り込みます
          </div>
        </div>

        {/* Results */}
        <div className="rounded border border-border bg-card">
          <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
            <h3 className="text-xs font-bold text-foreground">検索結果（{results.length}件）</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">コード</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">銘柄名</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">株価</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">前日比</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">出来高</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">始値</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">高値</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">安値</th>
                </tr>
              </thead>
              <tbody>
                {results.map((stock, i) => {
                  const isUp = stock.change > 0;
                  return (
                    <tr key={stock.code} className={`border-b border-border hover:bg-muted/50 ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                      <td className="px-2 py-1.5 font-mono font-semibold text-primary cursor-pointer hover:underline">{stock.code}</td>
                      <td className="px-2 py-1.5 font-medium text-foreground">{stock.name}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{stock.price.toLocaleString()}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.volume.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.open.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.high.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.low.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ScreeningPage;
