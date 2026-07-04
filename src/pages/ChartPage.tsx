import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import RealStockChart from "@/components/RealStockChart";
import StockDetailPanel from "@/components/StockDetailPanel";
import TradingViewPanel from "@/components/TradingViewPanel";
import { marketIndices, featuredStock, stockUniverse } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { CHART_WATCHLIST_UPDATED_EVENT, readChartWatchlist } from "@/lib/chartWatchlist";
import { BarChart3, Search } from "lucide-react";

const chartStocks = [
  featuredStock,
  ...stockUniverse.filter((stock) => stock.code !== featuredStock.code),
];

const ChartPage = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [selectedCode, setSelectedCode] = useState(featuredStock.code);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [watchlistStocks, setWatchlistStocks] = useState(() => readChartWatchlist());
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const mergedChartStocks = useMemo(
    () =>
      [...watchlistStocks, ...chartStocks].filter(
        (stock, index, stocks) => stocks.findIndex((item) => item.code === stock.code) === index
      ),
    [watchlistStocks]
  );
  const sourceLabelByCode = useMemo(
    () => new Map(watchlistStocks.map((stock) => [stock.code, stock.sourceLabel]).filter(([, sourceLabel]) => Boolean(sourceLabel))),
    [watchlistStocks]
  );
  const { stocks: liveChartStocks, updatedAt: liveChartUpdatedAt } = useLiveStockQuotes(mergedChartStocks);
  const selected =
    liveChartStocks.find((stock) => stock.code === selectedCode) ??
    mergedChartStocks.find((stock) => stock.code === selectedCode) ??
    liveChartStocks[0] ??
    mergedChartStocks[0];

  useEffect(() => {
    const updateWatchlist = () => setWatchlistStocks(readChartWatchlist());

    window.addEventListener(CHART_WATCHLIST_UPDATED_EVENT, updateWatchlist);
    window.addEventListener("storage", updateWatchlist);

    return () => {
      window.removeEventListener(CHART_WATCHLIST_UPDATED_EVENT, updateWatchlist);
      window.removeEventListener("storage", updateWatchlist);
    };
  }, []);

  useEffect(() => {
    setSearchQuery(queryFromUrl);
  }, [queryFromUrl]);

  const filteredStocks = liveChartStocks.filter(
    (s) => s.name.includes(searchQuery) || s.code.includes(searchQuery)
  );

  useEffect(() => {
    if (!searchQuery || !filteredStocks.length) return;
    if (filteredStocks.some((stock) => stock.code === selectedCode)) return;
    setSelectedCode(filteredStocks[0].code);
  }, [filteredStocks, searchQuery, selectedCode]);

  const handleSelectStock = (code: string) => {
    setSelectedCode(code);
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    window.setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="銘柄・チャート" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          銘柄・チャート
        </h2>

        <div className="mb-3 grid min-h-0 grid-cols-1 items-stretch gap-3 lg:grid-cols-4">
          {/* Stock selector */}
          <div className="flex min-h-[520px] min-w-0 lg:col-span-1 lg:h-full">
            <div className="flex min-h-0 w-full flex-col rounded border border-border bg-card lg:h-full">
              <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
                <h3 className="text-xs font-bold text-foreground">銘柄選択</h3>
                <div className="mt-0.5 text-xxs text-muted-foreground">{liveChartStocks.length}銘柄</div>
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
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredStocks.map((stock) => {
                  const isUp = stock.change > 0;
                  const sourceLabel = sourceLabelByCode.get(stock.code);
                  return (
                    <button
                      key={stock.code}
                      onClick={() => handleSelectStock(stock.code)}
                      className={`w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                        stock.code === selected.code ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-mono text-xxs font-semibold text-primary">{stock.code}</span>
                            {sourceLabel && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
                                {sourceLabel}
                              </span>
                            )}
                          </div>
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
            <RealStockChart
              code={selected.code}
              name={selected.name}
              chartSymbol={`TSE:${selected.code}`}
              chartApiSymbol={`${selected.code}.T`}
              currentPrice={selected.price}
              currentPriceUpdatedAt={liveChartUpdatedAt}
            />

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: "始値", value: selected.open.toLocaleString() },
                { label: "高値", value: selected.high.toLocaleString() },
                { label: "安値", value: selected.low.toLocaleString() },
                { label: "前日終値", value: selected.previousClose.toLocaleString() },
                { label: "出来高", value: selected.volume.toLocaleString() + "株" },
              ].map((item) => (
                <div key={item.label} className="rounded border border-border bg-card p-2 text-center">
                  <div className="text-xxs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-bold tabular-nums text-foreground">{item.value}</div>
                </div>
              ))}
            </div>

            <div ref={detailSectionRef} className="mt-3 scroll-mt-24">
              <StockDetailPanel stock={selected} />
            </div>

            <div className="mt-3">
              <TradingViewPanel stock={selected} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ChartPage;
