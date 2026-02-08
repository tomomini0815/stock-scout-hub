import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices, topGainers, topLosers } from "@/data/stockData";
import { SlidersHorizontal, Search } from "lucide-react";

const allStocks = [...topGainers, ...topLosers].filter(
  (s, i, arr) => arr.findIndex((x) => x.code === s.code) === i
);

const mockScreeningData = allStocks.map((s) => ({
  ...s,
  per: (8 + Math.random() * 30).toFixed(1),
  pbr: (0.5 + Math.random() * 4).toFixed(2),
  dividend: (0.5 + Math.random() * 4).toFixed(2),
  marketCap: Math.round(Math.random() * 50000 + 1000),
}));

const ScreeningPage = () => {
  const [perMin, setPerMin] = useState("");
  const [perMax, setPerMax] = useState("");
  const [pbrMax, setPbrMax] = useState("");
  const [dividendMin, setDividendMin] = useState("");
  const [results, setResults] = useState(mockScreeningData);

  const handleSearch = () => {
    let filtered = mockScreeningData;
    if (perMin) filtered = filtered.filter((s) => parseFloat(s.per) >= parseFloat(perMin));
    if (perMax) filtered = filtered.filter((s) => parseFloat(s.per) <= parseFloat(perMax));
    if (pbrMax) filtered = filtered.filter((s) => parseFloat(s.pbr) <= parseFloat(pbrMax));
    if (dividendMin) filtered = filtered.filter((s) => parseFloat(s.dividend) >= parseFloat(dividendMin));
    setResults(filtered);
  };

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
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">PER（最小）</label>
              <input
                type="number"
                value={perMin}
                onChange={(e) => setPerMin(e.target.value)}
                placeholder="例: 5"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">PER（最大）</label>
              <input
                type="number"
                value={perMax}
                onChange={(e) => setPerMax(e.target.value)}
                placeholder="例: 20"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">PBR（最大）</label>
              <input
                type="number"
                value={pbrMax}
                onChange={(e) => setPbrMax(e.target.value)}
                placeholder="例: 1.5"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xxs font-medium text-muted-foreground">配当利回り（最小%）</label>
              <input
                type="number"
                value={dividendMin}
                onChange={(e) => setDividendMin(e.target.value)}
                placeholder="例: 2.0"
                className="h-7 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="mt-3 flex items-center gap-1.5 rounded bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Search className="h-3 w-3" />
            検索
          </button>
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
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">PER</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">PBR</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">配当利回り</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">時価総額(億)</th>
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
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.per}倍</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.pbr}倍</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.dividend}%</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{stock.marketCap.toLocaleString()}</td>
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
