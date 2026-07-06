import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import RealStockChart from "@/components/RealStockChart";
import StockDetailPanel from "@/components/StockDetailPanel";
import TradingViewPanel from "@/components/TradingViewPanel";
import {
  growth250ConstituentStocks,
  jpxNikkei400ConstituentStocks,
  jpxPrime150ConstituentStocks,
  topixConstituentStocks,
  toshoReitConstituentStocks,
} from "@/data/japaneseIndexConstituents";
import { marketIndices, featuredStock, nikkei225Stocks, type StockData } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { CHART_WATCHLIST_UPDATED_EVENT, readChartWatchlist } from "@/lib/chartWatchlist";
import { BarChart3, ChevronDown, Search } from "lucide-react";

type ChartIndexOption = { id: string; label: string; shortLabel: string; stocks: StockData[] };
type SmartMoneySignal = {
  ticker?: string;
  company?: string;
  source?: string;
};

const staticIndexOptions: ChartIndexOption[] = [
  { id: "nikkei225", label: "日経225", shortLabel: "日経225", stocks: nikkei225Stocks },
  { id: "topix", label: "TOPIX", shortLabel: "TOPIX", stocks: topixConstituentStocks },
  { id: "prime150", label: "JPXプライム150", shortLabel: "プライム150", stocks: jpxPrime150ConstituentStocks },
  { id: "jpx400", label: "JPX日経400", shortLabel: "JPX400", stocks: jpxNikkei400ConstituentStocks },
  { id: "growth250", label: "グロース250", shortLabel: "グロース250", stocks: growth250ConstituentStocks },
  { id: "reit", label: "東証REIT指数", shortLabel: "REIT", stocks: toshoReitConstituentStocks },
];

const QUOTE_TARGET_LIMIT = 180;

const isEdinetLinkedStock = (stock: StockData & { sourceLabel?: string }) =>
  stock.market === "EDINET検知" || /EDINET/.test(stock.sourceLabel ?? "");

const uniqueStocks = (stocks: StockData[]) => {
  const stocksByCode = new Map<string, StockData>();

  stocks.forEach((stock) => {
    const current = stocksByCode.get(stock.code);
    if (!current || (isEdinetLinkedStock(stock) && !isEdinetLinkedStock(current))) {
      stocksByCode.set(stock.code, stock);
    }
  });

  return Array.from(stocksByCode.values());
};

const isDisplayableTicker = (ticker?: string) => Boolean(ticker && /^[0-9A-Z]{4}$/i.test(ticker));

const convertEdinetSignalsToStocks = (signals: SmartMoneySignal[]) =>
  uniqueStocks(
    signals
      .filter((signal) => signal.source === "edinet" && isDisplayableTicker(signal.ticker) && signal.company && signal.company !== "対象銘柄不明")
      .map((signal) => ({
        code: String(signal.ticker).toUpperCase(),
        name: signal.company ?? "",
        market: "EDINET検知",
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        open: 0,
        high: 0,
        low: 0,
        previousClose: 0,
      }))
  );

const matchesStockQuery = (stock: StockData, query: string) => {
  const normalized = query.trim();
  if (!normalized) return true;
  return stock.name.includes(normalized) || stock.code.includes(normalized) || stock.market.includes(normalized);
};

const getInferredSourceLabel = (code: string, selectedOptions: ChartIndexOption[]) => {
  const sourceOption = selectedOptions
    .filter((option) => option.id !== "watchlist")
    .find((option) => option.stocks.some((stock) => stock.code === code));
  if (sourceOption) return sourceOption.shortLabel;

  const staticOption = staticIndexOptions.find((option) => option.stocks.some((stock) => stock.code === code));
  return staticOption?.shortLabel;
};

const ChartPage = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [selectedCode, setSelectedCode] = useState(featuredStock.code);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [watchlistStocks, setWatchlistStocks] = useState(() => readChartWatchlist());
  const [edinetStocks, setEdinetStocks] = useState<StockData[]>([]);
  const [selectedIndexIds, setSelectedIndexIds] = useState<string[]>(["watchlist"]);
  const [isIndexMenuOpen, setIsIndexMenuOpen] = useState(false);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const chartSectionRef = useRef<HTMLDivElement | null>(null);
  const indexMenuRef = useRef<HTMLDivElement | null>(null);
  const watchlistDisplayStocks = useMemo(
    () => watchlistStocks.filter((stock) => !isEdinetLinkedStock(stock)),
    [watchlistStocks]
  );
  const indexOptions = useMemo<ChartIndexOption[]>(
    () => [
      { id: "watchlist", label: "追加リスト", shortLabel: "追加", stocks: watchlistDisplayStocks },
      { id: "edinet", label: "EDINET検知", shortLabel: "EDINET", stocks: edinetStocks },
      ...staticIndexOptions,
    ],
    [edinetStocks, watchlistDisplayStocks]
  );
  const selectedIndexOptions = useMemo(
    () => indexOptions.filter((option) => selectedIndexIds.includes(option.id)),
    [indexOptions, selectedIndexIds]
  );
  const selectedIndexStocks = useMemo(
    () => uniqueStocks(selectedIndexOptions.flatMap((option) => option.stocks)),
    [selectedIndexOptions]
  );
  const mergedChartStocks = useMemo(
    () => selectedIndexStocks,
    [selectedIndexStocks]
  );
  const sourceLabelByCode = useMemo(
    () =>
      new Map(
        watchlistStocks
          .map((stock) => [stock.code, stock.sourceLabel] as const)
          .filter(([, sourceLabel]) => Boolean(sourceLabel) && sourceLabel !== "追加" && !/EDINET/.test(sourceLabel ?? ""))
      ),
    [watchlistStocks]
  );
  const indexLabelByCode = useMemo(() => {
    const entries: Array<[string, string]> = [];
    selectedIndexOptions
      .filter((option) => option.id !== "watchlist")
      .forEach((option) => {
        option.stocks.forEach((stock) => entries.push([stock.code, option.shortLabel]));
      });
    return new Map(entries);
  }, [selectedIndexOptions]);
  const selectedBaseStock = useMemo(
    () => mergedChartStocks.find((stock) => stock.code === selectedCode),
    [mergedChartStocks, selectedCode]
  );
  const quoteTargetStocks = useMemo(() => {
    const visibleCandidates = mergedChartStocks
      .filter((stock) => matchesStockQuery(stock, searchQuery))
      .slice(0, QUOTE_TARGET_LIMIT);
    return uniqueStocks([
      ...visibleCandidates,
      ...(selectedBaseStock ? [selectedBaseStock] : []),
    ]).slice(0, QUOTE_TARGET_LIMIT);
  }, [mergedChartStocks, searchQuery, selectedBaseStock]);
  const { stocks: quotedStocks, updatedAt: liveChartUpdatedAt } = useLiveStockQuotes(quoteTargetStocks);
  const quoteByCode = useMemo(
    () => new Map(quotedStocks.map((stock) => [stock.code, stock])),
    [quotedStocks]
  );
  const liveChartStocks = useMemo(
    () => mergedChartStocks.map((stock) => quoteByCode.get(stock.code) ?? stock),
    [mergedChartStocks, quoteByCode]
  );
  const selected =
    liveChartStocks.find((stock) => stock.code === selectedCode) ??
    mergedChartStocks.find((stock) => stock.code === selectedCode) ??
    liveChartStocks[0] ??
    mergedChartStocks[0] ??
    featuredStock;
  const selectedIndexLabel =
    selectedIndexOptions.length === 0
      ? "なし"
      : selectedIndexOptions.length === 1
      ? selectedIndexOptions[0].shortLabel
      : `${selectedIndexOptions.length}リスト`;

  useEffect(() => {
    let isActive = true;

    const loadEdinetStocks = async () => {
      try {
        const response = await fetch("/api/smart-money");
        if (!response.ok) throw new Error("smart money unavailable");
        const payload = await response.json() as { signals?: SmartMoneySignal[] };
        if (!isActive) return;
        setEdinetStocks(convertEdinetSignalsToStocks(payload.signals ?? []));
      } catch {
        if (isActive) setEdinetStocks([]);
      }
    };

    loadEdinetStocks();
    const timer = window.setInterval(loadEdinetStocks, 5 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!indexMenuRef.current?.contains(event.target as Node)) {
        setIsIndexMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStocks = liveChartStocks.filter((stock) =>
    matchesStockQuery(stock, searchQuery)
  );

  useEffect(() => {
    if (!mergedChartStocks.length) return;
    if (mergedChartStocks.some((stock) => stock.code === selectedCode)) return;
    setSelectedCode(mergedChartStocks[0].code);
  }, [mergedChartStocks, selectedCode]);

  useEffect(() => {
    if (!searchQuery || !filteredStocks.length) return;
    if (filteredStocks.some((stock) => stock.code === selectedCode)) return;
    setSelectedCode(filteredStocks[0].code);
  }, [filteredStocks, searchQuery, selectedCode]);

  const handleToggleIndex = (indexId: string) => {
    setSelectedIndexIds((current) =>
      current.includes(indexId)
        ? current.filter((id) => id !== indexId)
        : [...current, indexId]
    );
  };

  const handleSelectStock = (code: string) => {
    setSelectedCode(code);

    window.setTimeout(() => {
      chartSectionRef.current?.scrollIntoView({
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground">銘柄選択</h3>
                    <div className="mt-0.5 text-xxs text-muted-foreground">
                      {filteredStocks.length.toLocaleString()} / {liveChartStocks.length.toLocaleString()}銘柄
                    </div>
                  </div>
                  <div ref={indexMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsIndexMenuOpen((value) => !value)}
                      className="inline-flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-xxs font-bold text-foreground transition-colors hover:bg-muted"
                      aria-haspopup="menu"
                      aria-expanded={isIndexMenuOpen}
                    >
                      {selectedIndexLabel}
                      <ChevronDown className={`h-3 w-3 transition-transform ${isIndexMenuOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isIndexMenuOpen && (
                      <div className="absolute right-0 top-8 z-30 w-56 overflow-hidden rounded border border-border bg-popover text-popover-foreground shadow-lg">
                        <div className="border-b border-border px-3 py-2 text-xxs font-bold text-muted-foreground">
                          表示するリストを選択
                        </div>
                        <div className="max-h-72 overflow-y-auto p-1">
                          {indexOptions.map((option) => {
                            const checked = selectedIndexIds.includes(option.id);
                            return (
                              <label
                                key={option.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleIndex(option.id)}
                                  className="h-3.5 w-3.5 accent-primary"
                                />
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                                  {option.stocks.length.toLocaleString()}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                {filteredStocks.length ? filteredStocks.map((stock) => {
                  const isUp = stock.change > 0;
                  const sourceLabel =
                    sourceLabelByCode.get(stock.code) ??
                    indexLabelByCode.get(stock.code) ??
                    getInferredSourceLabel(stock.code, selectedIndexOptions);
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
                }) : (
                  <div className="px-3 py-8 text-center text-xs font-semibold leading-relaxed text-muted-foreground">
                    追加リスト、EDINET検知、または指数を選択するか、検索条件を変更してください。
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart area */}
          <div ref={chartSectionRef} className="scroll-mt-24 lg:col-span-3">
            <RealStockChart
              code={selected.code}
              name={selected.name}
              chartSymbol={`TSE:${selected.code}`}
              chartApiSymbol={`${selected.code}.T`}
              currentPrice={selected.price}
              currentPriceUpdatedAt={liveChartUpdatedAt}
            />

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:pb-0">
              {[
                { label: "始値", value: selected.open.toLocaleString() },
                { label: "高値", value: selected.high.toLocaleString() },
                { label: "安値", value: selected.low.toLocaleString() },
                { label: "前日終値", value: selected.previousClose.toLocaleString() },
                { label: "出来高", value: selected.volume.toLocaleString() + "株" },
              ].map((item) => (
                <div key={item.label} className="min-w-[7.6rem] shrink-0 rounded border border-border bg-card p-2 text-center md:min-w-0 md:shrink">
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
