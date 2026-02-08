import { useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import CandlestickChart from "@/components/CandlestickChart";
import { marketIndices, generateCandleData, featuredStock, topGainers } from "@/data/stockData";
import { BarChart3, Search } from "lucide-react";

const chartStocks = [featuredStock, ...topGainers.slice(0, 4)];

const ChartPage = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const candleData = useMemo(() => generateCandleData(), []);
  const selected = chartStocks[selectedIndex];

  const filteredStocks = chartStocks.filter(
    (s) => s.name.includes(searchQuery) || s.code.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="チャート" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          チャート
        </h2>

        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
          {/* Stock selector */}
          <div className="lg:col-span-1">
            <div className="rounded border border-border bg-card">
              <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
                <h3 className="text-xs font-bold text-foreground">銘柄選択</h3>
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="銘柄検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 w-full rounded border border-border bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {filteredStocks.map((stock) => {
                  const isUp = stock.change > 0;
                  const originalIdx = chartStocks.indexOf(stock);
                  return (
                    <button
                      key={stock.code}
                      onClick={() => setSelectedIndex(originalIdx)}
                      className={`w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                        originalIdx === selectedIndex ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xxs font-semibold text-primary">{stock.code}</span>
                          <div className="text-xs font-medium text-foreground">{stock.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold tabular-nums">{stock.price.toLocaleString()}</div>
                          <div className={`text-xxs tabular-nums font-semibold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                            {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart area */}
          <div className="lg:col-span-3">
            <CandlestickChart data={candleData} title={selected.name} code={selected.code} />

            {/* Chart info */}
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "始値", value: selected.open.toLocaleString() },
                { label: "高値", value: selected.high.toLocaleString() },
                { label: "安値", value: selected.low.toLocaleString() },
                { label: "出来高", value: selected.volume.toLocaleString() + "株" },
              ].map((item) => (
                <div key={item.label} className="rounded border border-border bg-card p-2 text-center">
                  <div className="text-xxs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-bold tabular-nums text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ChartPage;
