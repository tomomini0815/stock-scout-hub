import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import RealStockChart from "@/components/RealStockChart";
import StockDetailPanel from "@/components/StockDetailPanel";
import TradingViewPanel from "@/components/TradingViewPanel";
import { marketIndices, featuredStock, stockUniverse } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { Search } from "lucide-react";

const allStocks = stockUniverse;

const StocksPage = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [selectedStock, setSelectedStock] = useState(featuredStock);
  const [search, setSearch] = useState(queryFromUrl);
  const { stocks: liveStocks } = useLiveStockQuotes(allStocks);
  const displaySelected =
    liveStocks.find((stock) => stock.code === selectedStock.code) ?? selectedStock;

  const filteredStocks = liveStocks.filter(
    (s) => s.name.includes(search) || s.code.includes(search)
  );

  useEffect(() => {
    setSearch(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    if (!search || !filteredStocks.length) return;
    if (filteredStocks.some((stock) => stock.code === selectedStock.code)) return;
    setSelectedStock(filteredStocks[0]);
  }, [filteredStocks, search, selectedStock.code]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="個別銘柄" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 text-sm font-bold text-foreground">📊 個別銘柄情報</h2>

        {/* Search */}
        <div className="mb-3">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="銘柄コードまたは名称で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Stock List + Detail */}
        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex h-full min-h-[500px] flex-col rounded border border-border bg-card">
              <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
                <h3 className="text-xs font-bold text-foreground">銘柄一覧</h3>
              </div>
              <div className="max-h-[500px] flex-1 overflow-y-auto lg:max-h-none">
                {filteredStocks.map((stock) => {
                  const isUp = stock.change > 0;
                  const isSelected = stock.code === selectedStock.code;
                  return (
                    <button
                      key={stock.code}
                      onClick={() => setSelectedStock(stock)}
                      className={`w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xxs font-semibold text-primary">{stock.code}</span>
                          <span className="ml-1.5 text-xs font-medium text-foreground">{stock.name}</span>
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

          <div className="lg:col-span-3">
            <div className="mb-3">
              <RealStockChart
                code={displaySelected.code}
                name={displaySelected.name}
                chartSymbol={`TSE:${displaySelected.code}`}
                chartApiSymbol={`${displaySelected.code}.T`}
              />
            </div>
            <StockDetailPanel stock={displaySelected} />
            <div className="mt-3">
              <TradingViewPanel stock={displaySelected} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default StocksPage;
