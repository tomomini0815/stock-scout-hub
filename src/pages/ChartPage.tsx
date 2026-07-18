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
import { marketIndices, featuredStock, nikkei225Stocks, stockUniverse, type StockData } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { addChartWatchlistStock, CHART_WATCHLIST_UPDATED_EVENT, readChartWatchlist } from "@/lib/chartWatchlist";
import { BarChart3, ChevronDown, Clock, Search, Star } from "lucide-react";

type ChartIndexOption = { id: string; label: string; shortLabel: string; stocks: StockData[] };
type SmartMoneySignal = {
  ticker?: string;
  company?: string;
  source?: string;
  filingDate?: string;
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

const isEdinetLinkedStock = (stock: StockData & { sourceLabel?: string }) => {
  if (!stock) return false;
  return (
    (stock.market === "EDINET検知" || /EDINET/.test(stock.sourceLabel ?? "")) &&
    stock.sourceLabel !== "追加"
  );
};

const uniqueStocks = (stocks: StockData[]) => {
  const stocksByCode = new Map<string, StockData>();
  if (!Array.isArray(stocks)) return [];

  stocks.forEach((stock) => {
    if (!stock || !stock.code) return;
    const current = stocksByCode.get(stock.code);
    if (!current || (isEdinetLinkedStock(stock) && !isEdinetLinkedStock(current))) {
      stocksByCode.set(stock.code, stock);
    }
  });

  return Array.from(stocksByCode.values());
};

const isDisplayableTicker = (ticker?: string) => Boolean(ticker && /^[0-9A-Z]{4}$/i.test(ticker));

const convertEdinetSignalsToStocks = (signals: SmartMoneySignal[]) => {
  if (!Array.isArray(signals)) return [];
  return uniqueStocks(
    signals
      .filter((signal) => signal && signal.source === "edinet" && isDisplayableTicker(signal.ticker) && signal.company && signal.company !== "対象銘柄不明")
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
        addedDate: signal.filingDate,
      }))
  );
};

const matchesStockQuery = (stock: StockData, query: string) => {
  if (!stock) return false;
  const normalized = query.trim();
  if (!normalized) return true;
  return (
    (stock.name || "").includes(normalized) ||
    (stock.code || "").includes(normalized) ||
    (stock.market || "").includes(normalized)
  );
};

const getInferredSourceLabel = (code: string, selectedOptions: ChartIndexOption[]) => {
  const sourceOption = selectedOptions
    .filter((option) => option.id !== "watchlist")
    .find((option) => option.stocks.some((stock) => stock.code === code));
  if (sourceOption) return sourceOption.shortLabel;

  const staticOption = staticIndexOptions.find((option) => option.stocks.some((stock) => stock.code === code));
  return staticOption?.shortLabel;
};

const getStockLabels = (
  stock: StockData,
  watchlistStocks: StockData[],
  edinetStocks: StockData[],
  selectedIndexOptions: ChartIndexOption[]
): string[] => {
  if (!stock) return [];
  const labels: string[] = [];

  const isEdinet =
    stock.market === "EDINET検知" ||
    edinetStocks.some((item) => item.code === stock.code) ||
    /EDINET/.test((stock as any).sourceLabel ?? "");
  if (isEdinet) {
    labels.push("EDINET");
  }

  const watchstock = watchlistStocks.find((item) => item.code === stock.code);
  const watchLabel = watchstock?.sourceLabel;

  // watchLabelが指数のshortLabelのいずれかと一致する場合のみ追加（業種名は除外）
  const allIndexShortLabels = [...staticIndexOptions, { shortLabel: "EDINET" }, { shortLabel: "追加" }].map((o) => o.shortLabel);
  const isIndexLabel = (label: string) => allIndexShortLabels.includes(label);

  if (watchLabel && watchLabel !== "追加" && !/EDINET/.test(watchLabel) && isIndexLabel(watchLabel)) {
    labels.push(watchLabel);
  }

  selectedIndexOptions
    .filter((option) => option.id !== "watchlist" && option.id !== "edinet")
    .forEach((option) => {
      if (option.stocks.some((item) => item.code === stock.code)) {
        if (!labels.includes(option.shortLabel)) {
          labels.push(option.shortLabel);
        }
      }
    });

  if (labels.length === 0 || (labels.length === 1 && labels[0] === "EDINET")) {
    const staticOption = staticIndexOptions.find((option) =>
      option.stocks.some((item) => item.code === stock.code)
    );
    if (staticOption && !labels.includes(staticOption.shortLabel)) {
      labels.push(staticOption.shortLabel);
    }
  }

  return labels;
};

const ChartPage = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = (searchParams.get("q") ?? "").toUpperCase();
  const [selectedCode, setSelectedCode] = useState(queryFromUrl || featuredStock.code);
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlistStocks, setWatchlistStocks] = useState(() => readChartWatchlist());
  const [edinetStocks, setEdinetStocks] = useState<StockData[]>([]);
  const [selectedIndexIds, setSelectedIndexIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stock-scout-selected-indices");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return ["watchlist"];
  });
  const [isIndexMenuOpen, setIsIndexMenuOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const chartSectionRef = useRef<HTMLDivElement | null>(null);
  const indexMenuRef = useRef<HTMLDivElement | null>(null);
  const watchlistDisplayStocks = useMemo(
    () => watchlistStocks.filter((stock) => !isEdinetLinkedStock(stock)),
    [watchlistStocks]
  );
  const historicalEdinetStocks = useMemo(
    () => watchlistStocks.filter((stock) => stock && stock.market === "EDINET検知"),
    [watchlistStocks]
  );
  const allEdinetStocks = useMemo(
    () => uniqueStocks([...edinetStocks, ...historicalEdinetStocks]),
    [edinetStocks, historicalEdinetStocks]
  );
  const indexOptions = useMemo<ChartIndexOption[]>(
    () => [
      { id: "watchlist", label: "マイリスト", shortLabel: "マイリスト", stocks: watchlistDisplayStocks },
      { id: "edinet", label: "EDINET検知リスト", shortLabel: "EDINET検知リスト", stocks: allEdinetStocks },
      ...staticIndexOptions,
    ],
    [allEdinetStocks, watchlistDisplayStocks]
  );
  const selectedIndexOptions = useMemo(
    () => indexOptions.filter((option) => selectedIndexIds.includes(option.id)),
    [indexOptions, selectedIndexIds]
  );
  const selectedIndexStocks = useMemo(
    () => uniqueStocks(selectedIndexOptions.flatMap((option) => option.stocks)),
    [selectedIndexOptions]
  );
  // 全サイト銘柄ユニバース（選択状態によらず全指数＋stockUniverse）
  const fullStockUniverse = useMemo(() => {
    const allIndexStocks = staticIndexOptions.flatMap((opt) => opt.stocks);
    return uniqueStocks([...stockUniverse, ...allIndexStocks, ...allEdinetStocks]);
  }, [allEdinetStocks]);

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

  // selectedCodeに対応する銘柄エントリ（見つからない場合は最低限のプレースホルダー生成）
  const selectedFromUniverse = fullStockUniverse.find((stock) => stock.code === selectedCode);
  const selectedPlaceholder: StockData = {
    code: selectedCode,
    name: selectedCode,
    market: "",
    price: 0, change: 0, changePercent: 0,
    volume: 0, open: 0, high: 0, low: 0, previousClose: 0,
  };
  const selected =
    liveChartStocks.find((stock) => stock.code === selectedCode) ??
    mergedChartStocks.find((stock) => stock.code === selectedCode) ??
    selectedFromUniverse ??
    (selectedCode ? selectedPlaceholder : undefined) ??
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
        const loadedStocks = convertEdinetSignalsToStocks(payload.signals ?? []);
        setEdinetStocks(loadedStocks);

        // もしロードされたedinetStocksの中に、URLのqパラメータで指定された銘柄コードがあれば、
        // 自動的に"edinet"インデックスを選択状態にし、さらに追加リスト（ウォッチリスト）にも追加する
        if (queryFromUrl) {
          const foundEdinetStock = loadedStocks.find((s) => s.code === queryFromUrl);
          if (foundEdinetStock) {
            // "edinet" カテゴリを選択状態にする
            setSelectedIndexIds((prev) => {
              const current = Array.isArray(prev) ? prev : [];
              return current.includes("edinet") ? current : ["edinet", ...current];
            });

            // 追加リスト（ウォッチリスト）に追加する
            addChartWatchlistStock({ ...foundEdinetStock, sourceLabel: "追加", addedDate: foundEdinetStock.addedDate });
            setWatchlistStocks(readChartWatchlist());

            // "watchlist"（追加リスト）も選択状態にする
            setSelectedIndexIds((prev) => {
              const current = Array.isArray(prev) ? prev : [];
              return current.includes("watchlist") ? current : ["watchlist", ...current];
            });
          }
        }
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
  }, [queryFromUrl]);

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
    if (!queryFromUrl) return;

    setSelectedCode(queryFromUrl);
    setSearchQuery("");

    // 静的データから銘柄を探して追加リストに自動追加する（追加リストをONにする）
    const allStaticStocks = [
      ...stockUniverse,
      ...nikkei225Stocks,
      ...topixConstituentStocks,
      ...jpxPrime150ConstituentStocks,
      ...jpxNikkei400ConstituentStocks,
      ...growth250ConstituentStocks,
      ...toshoReitConstituentStocks,
    ];
    const found = allStaticStocks.find((s) => s.code === queryFromUrl);
    if (found) {
      // 指数のshortLabel（例：TOPIX、日経225）を優先してsourceLabelに設定する
      const foundIndexOption = staticIndexOptions.find((opt) => opt.stocks.some((s) => s.code === queryFromUrl));
      addChartWatchlistStock({ ...found, sourceLabel: foundIndexOption?.shortLabel ?? found.market });
      setWatchlistStocks(readChartWatchlist());
      // 追加リストが選択されていなければ追加する
      setSelectedIndexIds((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return current.includes("watchlist") ? current : ["watchlist", ...current];
      });
    }

    const timer = window.setTimeout(() => {
      chartSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [queryFromUrl]);

  useEffect(() => {
    localStorage.setItem("stock-scout-selected-indices", JSON.stringify(selectedIndexIds));
  }, [selectedIndexIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!indexMenuRef.current?.contains(event.target as Node)) {
        setIsIndexMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 検索クエリがある場合は全銘柄ユニバースから検索し、選択中リストにない銘柄も追加表示する
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return liveChartStocks;
    const normalized = searchQuery.trim().toLowerCase();
    // 選択中リストからの結果
    const fromSelected = liveChartStocks.filter((stock) =>
      stock.name.toLowerCase().includes(normalized) ||
      stock.code.toLowerCase().includes(normalized) ||
      stock.market.toLowerCase().includes(normalized)
    );
    // 全銘柄ユニバースからの追加結果（選択中リストに含まれないもの）
    const selectedCodes = new Set(liveChartStocks.map((s) => s.code));
    const fromUniverse = fullStockUniverse.filter((stock) => {
      if (selectedCodes.has(stock.code)) return false;
      return (
        stock.name.toLowerCase().includes(normalized) ||
        stock.code.toLowerCase().includes(normalized) ||
        stock.market.toLowerCase().includes(normalized)
      );
    });
    return [...fromSelected, ...fromUniverse];
  }, [liveChartStocks, searchQuery, fullStockUniverse]);

  // filteredStocksを日付でグループ化するかどうかの判定
  // 「EDINET検知」が選択されており、検索クエリが空の場合のみグループ化する
  const shouldGroupByDate = useMemo(() => {
    return selectedIndexIds.includes("edinet") && !searchQuery.trim();
  }, [selectedIndexIds, searchQuery]);

  // グループ化されたデータ構造
  const groupedEdinetStocks = useMemo(() => {
    if (!shouldGroupByDate) return [];

    const groups: Record<string, StockData[]> = {};
    for (const stock of filteredStocks) {
      if (!stock) continue;

      if (stock.market === "EDINET検知") {
        const date = (stock as any).addedDate || "日付不明";
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(stock);
      } else {
        const favGroup = "マイリスト(一般)";
        if (!groups[favGroup]) {
          groups[favGroup] = [];
        }
        groups[favGroup].push(stock);
      }
    }

    // グループをソートする（"マイリスト(一般)" は最上部、他は日付の新しい順）
    return Object.entries(groups)
      .map(([date, stocks]) => ({ date, stocks }))
      .sort((a, b) => {
        if (a.date === b.date) return 0;
        if (a.date === "マイリスト(一般)") return -1;
        if (b.date === "マイリスト(一般)") return 1;
        if (a.date === "日付不明") return 1;
        if (b.date === "日付不明") return -1;
        return b.date.localeCompare(a.date);
      });
  }, [filteredStocks, shouldGroupByDate]);

  // 最新の日付グループおよび「お気に入り(一般)」グループをデフォルトで開くための処理
  useEffect(() => {
    if (groupedEdinetStocks.length > 0) {
      setExpandedDates((prev) => {
        const current = prev || {};
        let updated = { ...current };
        let hasChanges = false;

        // "マイリスト(一般)" は常にデフォルトで開く
        if (updated["マイリスト(一般)"] === undefined) {
          updated["マイリスト(一般)"] = true;
          hasChanges = true;
        }

        // EDINETの最新日付グループもデフォルトで開く
        const latestEdinetGroup = groupedEdinetStocks.find(g => g.date !== "マイリスト(一般)");
        if (latestEdinetGroup && updated[latestEdinetGroup.date] === undefined) {
          updated[latestEdinetGroup.date] = true;
          hasChanges = true;
        }

        return hasChanges ? updated : current;
      });
    }
  }, [groupedEdinetStocks]);

  // URL指定の銘柄がどのリストにも含まれない場合も選択・表示できるよう、mergedChartStocksに追加する
  const liveChartStocksWithQueryFallback = useMemo(() => {
    if (!queryFromUrl) return liveChartStocks;
    const alreadyIncluded = liveChartStocks.some((s) => s.code === queryFromUrl);
    if (alreadyIncluded) return liveChartStocks;
    const fallback = fullStockUniverse.find((s) => s.code === queryFromUrl);
    if (!fallback) return liveChartStocks;
    return [fallback, ...liveChartStocks];
  }, [liveChartStocks, queryFromUrl, fullStockUniverse]);

  useEffect(() => {
    if (!mergedChartStocks.length) return;
    if (mergedChartStocks.some((stock) => stock.code === selectedCode)) return;
    // URL指定の銘柄はリセットしない
    if (selectedCode === queryFromUrl) return;
    setSelectedCode(mergedChartStocks[0].code);
  }, [mergedChartStocks, selectedCode, queryFromUrl]);

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
    const upperCode = code.toUpperCase();
    setSelectedCode(upperCode);

    // URLクエリパラメータも同期更新
    const params = new URLSearchParams(window.location.search);
    if (params.get("q") !== upperCode) {
      params.set("q", upperCode);
      const newUrl = window.location.pathname + '?' + params.toString();
      window.history.replaceState(null, '', newUrl);
    }

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
                {shouldGroupByDate ? (
                  groupedEdinetStocks.length ? (
                    groupedEdinetStocks.map((group) => {
                      const isExpanded = !!expandedDates[group.date];
                      return (
                        <div key={group.date} className="border-b border-border">
                          <button
                            type="button"
                            onClick={() => setExpandedDates((prev) => ({ ...prev, [group.date]: !prev[group.date] }))}
                            className="flex w-full items-center justify-between bg-muted/40 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-muted/70"
                          >
                            <span className="flex items-center gap-1.5">
                              {group.date === "マイリスト(一般)" ? (
                                <>
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  {group.date} ({group.stocks.length}銘柄)
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 text-primary" />
                                  EDINET検知リスト ({group.date}) ({group.stocks.length}銘柄)
                                </>
                              )}
                            </span>
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          {isExpanded && (
                            <div className="divide-y divide-border bg-card">
                              {group.stocks.map((stock) => {
                                const isUp = stock.change > 0;
                                return (
                                  <button
                                    key={stock.code}
                                    onClick={() => handleSelectStock(stock.code)}
                                    className={`w-full px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                                      stock.code === selected?.code ? "bg-primary/5 border-l-2" : ""
                                    }`}
                                    style={stock.code === selected?.code ? { borderLeftColor: "hsl(var(--primary))" } : undefined}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span className="font-mono text-xxs font-semibold text-primary">{stock.code}</span>
                                          {getStockLabels(stock, watchlistStocks, edinetStocks, selectedIndexOptions).map((label) => (
                                            <span
                                              key={label}
                                              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary"
                                            >
                                              {label}
                                            </span>
                                          ))}
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
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-8 text-center text-xs font-semibold leading-relaxed text-muted-foreground">
                      EDINET検知データがありません。
                    </div>
                  )
                ) : (
                  filteredStocks.length ? filteredStocks.map((stock) => {
                    const isUp = stock.change > 0;
                    return (
                      <button
                        key={stock.code}
                        onClick={() => handleSelectStock(stock.code)}
                        className={`w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                          stock.code === selected?.code ? "bg-primary/5 border-l-2" : ""
                        }`}
                        style={stock.code === selected?.code ? { borderLeftColor: "hsl(var(--primary))" } : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-mono text-xxs font-semibold text-primary">{stock.code}</span>
                              {getStockLabels(stock, watchlistStocks, edinetStocks, selectedIndexOptions).map((label) => (
                                <span
                                  key={label}
                                  className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary"
                                >
                                  {label}
                                </span>
                              ))}
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
                      マイリスト、EDINET検知リスト、または指数を選択するか、検索条件を変更してください。
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Chart area */}
          <div ref={chartSectionRef} className="scroll-mt-24 lg:col-span-3">
            <RealStockChart
              code={selected?.code || ""}
              name={selected?.name || ""}
              chartSymbol={`TSE:${selected?.code || ""}`}
              chartApiSymbol={`${selected?.code || ""}.T`}
              currentPrice={selected?.price || 0}
              currentPriceUpdatedAt={liveChartUpdatedAt}
            />

            <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3">
              {[
                { label: "始値", value: selected?.open?.toLocaleString() || "0" },
                { label: "高値", value: selected?.high?.toLocaleString() || "0" },
                { label: "安値", value: selected?.low?.toLocaleString() || "0" },
                { label: "前日終値", value: selected?.previousClose?.toLocaleString() || "0" },
                { label: "出来高", value: (selected?.volume?.toLocaleString() || "0") + "株" },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded border border-border bg-card p-2 text-center">
                  <div className="text-xxs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-bold tabular-nums text-foreground">{item.value}</div>
                </div>
              ))}
            </div>

            <div ref={detailSectionRef} className="mt-3 scroll-mt-24">
              <StockDetailPanel stock={selected || featuredStock} />
            </div>

            <div className="mt-3">
              <TradingViewPanel stock={selected || featuredStock} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ChartPage;
