import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import MarketOverview from "@/components/MarketOverview";
import RealStockChart from "@/components/RealStockChart";
import { Checkbox } from "@/components/ui/checkbox";
import { marketIndices, nikkei225Stocks, type StockData } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import {
  addChartWatchlistStock,
  CHART_WATCHLIST_UPDATED_EVENT,
  readChartWatchlist,
  removeChartWatchlistStock,
} from "@/lib/chartWatchlist";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Globe, Info, ListChecks, Plus, Search, TrendingUp, X } from "lucide-react";

const sectorRepresentatives: Array<StockData & { sector: string }> = [
  { sector: "電気機器", code: "6758", name: "ソニーG", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "輸送用機器", code: "7203", name: "トヨタ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "精密機器", code: "6861", name: "キーエンス", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "化学", code: "4063", name: "信越化学", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "銀行業", code: "8306", name: "三菱UFJ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "医薬品", code: "4502", name: "武田薬品", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "小売業", code: "3382", name: "セブン&アイ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "通信業", code: "9433", name: "KDDI", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
];

type NikkeiSortKey = "index" | "code" | "name" | "theme" | "price" | "change" | "changePercent" | "volume";
type SortDirection = "asc" | "desc";
type NikkeiStockItem = {
  stock: StockData;
  originalIndex: number;
  theme: NikkeiTheme;
};
type NikkeiTheme =
  | "半導体・電機"
  | "自動車・機械"
  | "金融・不動産"
  | "素材・化学"
  | "消費・小売"
  | "医薬・ヘルスケア"
  | "通信・インフラ"
  | "サービス・IT"
  | "運輸・商社";

const nikkeiThemes: NikkeiTheme[] = [
  "半導体・電機",
  "自動車・機械",
  "金融・不動産",
  "素材・化学",
  "消費・小売",
  "医薬・ヘルスケア",
  "通信・インフラ",
  "サービス・IT",
  "運輸・商社",
];

const themeCodeGroups: Record<NikkeiTheme, string[]> = {
  "半導体・電機": [
    "6857", "6770", "7751", "6902", "6954", "6504", "6702", "6501", "6861", "285A", "6971", "6920", "6479",
    "6503", "6981", "6701", "6594", "6645", "6752", "6723", "7752", "6963", "7735", "6724", "6753", "6758",
    "6526", "6976", "6762", "8035", "6506", "6841", "6146",
  ],
  "自動車・機械": [
    "543A", "7267", "7202", "7261", "7211", "7201", "7270", "7269", "7203", "7272", "6113", "6367", "6361",
    "6305", "7004", "7013", "5631", "6473", "6301", "6326", "7011", "6471", "6472", "6103", "6302", "6273",
    "7012",
  ],
  "金融・不動産": [
    "8304", "8331", "8354", "8306", "8411", "8308", "5831", "8316", "8309", "7186", "8750", "8725", "8630",
    "8795", "8766", "8253", "8697", "8591", "8601", "8604", "8802", "8801", "8830", "8804", "3289",
  ],
  "素材・化学": [
    "3407", "4061", "4901", "4452", "3405", "4188", "4183", "4021", "6988", "4004", "4063", "4911", "4005",
    "4043", "4042", "4208", "5201", "5333", "5214", "5233", "5301", "5332", "1605", "5714", "5803", "5801",
    "5711", "5706", "3436", "5802", "5713", "5108", "5101", "5411", "5406", "5401", "3401", "3402", "5020",
    "5019",
  ],
  "消費・小売": [
    "1332", "2802", "2502", "2914", "2801", "2503", "2269", "2282", "2871", "2002", "2501", "7832", "7912",
    "7911", "7951", "8267", "9983", "3099", "3086", "8252", "7453", "9843", "7532", "3382", "8233", "3092",
  ],
  "医薬・ヘルスケア": [
    "4503", "4519", "4568", "4523", "4151", "4578", "4506", "4507", "4502", "7741", "4902", "7731", "7733",
    "4543",
  ],
  "通信・インフラ": [
    "9433", "9432", "9434", "9984", "1721", "1925", "1808", "1963", "1812", "1802", "1928", "1803", "1801",
    "9502", "9503", "9501", "9532", "9531", "3861",
  ],
  "サービス・IT": [
    "6532", "4751", "2432", "4324", "6178", "9766", "4689", "4385", "2413", "3659", "7974", "4307", "4661",
    "4755", "6098", "9735", "3697", "9602", "4704",
  ],
  "運輸・商社": [
    "9202", "9201", "9147", "9064", "9107", "9104", "9101", "9022", "9020", "9008", "9009", "9007", "9001",
    "9005", "9021", "8001", "8002", "8058", "8031", "2768", "8053", "8015",
  ],
};

const getNikkeiTheme = (code: string): NikkeiTheme =>
  nikkeiThemes.find((theme) => themeCodeGroups[theme].includes(code)) ?? "サービス・IT";

const compareText = (a: string, b: string) => a.localeCompare(b, "ja-JP", { numeric: true });

const getHeatmapTileClass = (changePercent: number) => {
  const magnitude = Math.abs(changePercent);
  const intensity = magnitude >= 3 ? "strong" : magnitude >= 1 ? "medium" : magnitude > 0 ? "soft" : "flat";

  if (changePercent > 0) {
    return intensity === "strong"
      ? "border-red-300 bg-red-200 text-red-950"
      : intensity === "medium"
      ? "border-red-200 bg-red-100 text-red-900"
      : "border-red-200 bg-red-50 text-red-700";
  }

  if (changePercent < 0) {
    return intensity === "strong"
      ? "border-blue-300 bg-blue-200 text-blue-950"
      : intensity === "medium"
      ? "border-blue-200 bg-blue-100 text-blue-900"
      : "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-border bg-muted text-muted-foreground";
};

const formatSignedPercent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const MarketPage = () => {
  const [chartWatchlistCodes, setChartWatchlistCodes] = useState<string[]>(() =>
    readChartWatchlist().map((stock) => stock.code)
  );
  const [selectedThemes, setSelectedThemes] = useState<NikkeiTheme[]>(nikkeiThemes);
  const [nikkeiSearchQuery, setNikkeiSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<NikkeiSortKey>("index");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { stocks: liveSectors, status, updatedAt } = useLiveStockQuotes(sectorRepresentatives);
  const {
    stocks: liveNikkei225Stocks,
    status: nikkei225Status,
    updatedAt: nikkei225UpdatedAt,
  } = useLiveStockQuotes(nikkei225Stocks);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";
  const nikkei225UpdatedLabel = nikkei225UpdatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(nikkei225UpdatedAt))
    : "";
  const updateChartWatchlistCodes = () => {
    setChartWatchlistCodes(readChartWatchlist().map((stock) => stock.code));
  };
  const handleAddChartStock = (stock: StockData) => {
    const nextStocks = addChartWatchlistStock(stock);
    setChartWatchlistCodes(nextStocks.map((item) => item.code));
  };
  const handleRemoveChartStock = (code: string) => {
    const nextStocks = removeChartWatchlistStock(code);
    setChartWatchlistCodes(nextStocks.map((item) => item.code));
  };
  const handleToggleChartStock = (stock: StockData) => {
    if (chartWatchlistCodes.includes(stock.code)) {
      handleRemoveChartStock(stock.code);
      return;
    }

    handleAddChartStock(stock);
  };
  const handleToggleTheme = (theme: NikkeiTheme) => {
    setSelectedThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme]
    );
  };
  const handleToggleAllThemes = () => {
    setSelectedThemes((current) => (current.length === nikkeiThemes.length ? [] : nikkeiThemes));
  };
  const handleSort = (nextKey: NikkeiSortKey) => {
    setSortKey((currentKey) => {
      if (currentKey === nextKey) {
        setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return currentKey;
      }

      setSortDirection(nextKey === "index" || nextKey === "code" || nextKey === "name" || nextKey === "theme" ? "asc" : "desc");
      return nextKey;
    });
  };
  const filteredNikkei225Stocks = useMemo<NikkeiStockItem[]>(() => {
    const activeThemes = new Set(selectedThemes);
    const normalizedQuery = nikkeiSearchQuery.trim().toLowerCase();

    return liveNikkei225Stocks
      .map((stock, index) => ({
        stock,
        originalIndex: index,
        theme: getNikkeiTheme(stock.code),
      }))
      .filter((item) => activeThemes.has(item.theme))
      .filter((item) => {
        if (!normalizedQuery) return true;

        return [item.stock.code, item.stock.name, item.theme]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      });
  }, [liveNikkei225Stocks, nikkeiSearchQuery, selectedThemes]);

  const sortedNikkei225Stocks = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...filteredNikkei225Stocks].sort((a, b) => {
      if (sortKey === "index") return (a.originalIndex - b.originalIndex) * direction;
      if (sortKey === "code") return compareText(a.stock.code, b.stock.code) * direction;
      if (sortKey === "name") return compareText(a.stock.name, b.stock.name) * direction;
      if (sortKey === "theme") return compareText(a.theme, b.theme) * direction;

      return (a.stock[sortKey] - b.stock[sortKey]) * direction;
    });
  }, [filteredNikkei225Stocks, sortDirection, sortKey]);
  const nikkeiHeatmapGroups = useMemo(
    () =>
      nikkeiThemes
        .map((theme) => {
          const items = filteredNikkei225Stocks
            .filter((item) => item.theme === theme)
            .sort((a, b) => b.stock.changePercent - a.stock.changePercent);
          const average = items.length
            ? items.reduce((total, item) => total + item.stock.changePercent, 0) / items.length
            : 0;

          return { theme, items, average };
        })
        .filter((group) => group.items.length > 0),
    [filteredNikkei225Stocks]
  );
  const renderSortIcon = (key: NikkeiSortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/70" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };
  const renderSortHeader = (key: NikkeiSortKey, label: string, align: "left" | "right" = "left") => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className={`inline-flex w-full items-center gap-1 text-xxs font-semibold text-muted-foreground hover:text-foreground ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {label}
      {renderSortIcon(key)}
    </button>
  );

  useEffect(() => {
    window.addEventListener(CHART_WATCHLIST_UPDATED_EVENT, updateChartWatchlistCodes);
    window.addEventListener("storage", updateChartWatchlistCodes);

    return () => {
      window.removeEventListener(CHART_WATCHLIST_UPDATED_EVENT, updateChartWatchlistCodes);
      window.removeEventListener("storage", updateChartWatchlistCodes);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="市況" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          市況概況
        </h2>

        <div className="mb-3">
          <MarketOverview indices={marketIndices} />
        </div>

        <div className="mb-3">
          <RealStockChart
            code="N225"
            name="日経平均株価"
            chartSymbol="NIKKEI:NI225"
            chartApiSymbol="^N225"
          />
        </div>

        <div className="mb-3">
          <div className="rounded border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
              <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
                <TrendingUp className="h-3 w-3" />
                業種代表銘柄の騰落率
              </h3>
              <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
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
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">業種</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">代表銘柄</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">株価</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">騰落率</th>
                </tr>
              </thead>
              <tbody>
                {liveSectors.map((stock, i) => {
                  const isUp = stock.changePercent > 0;
                  return (
                    <tr key={stock.code} className={`border-b border-border ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                      <td className="px-3 py-1.5 font-medium text-foreground">{sectorRepresentatives[i]?.sector}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{stock.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-foreground">
                        {stock.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-3">
          <div className="rounded border border-border bg-card">
            <div className="border-b border-border bg-table-header-bg px-3 py-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <ListChecks className="h-3 w-3" />
                    日経225 採用銘柄一覧
                    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xxs text-muted-foreground">
                      {sortedNikkei225Stocks.length}/{liveNikkei225Stocks.length}銘柄
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
                    <span
                      className={`rounded px-1.5 py-0.5 ${
                        nikkei225Status === "live"
                          ? "bg-stock-up-bg text-stock-up"
                          : nikkei225Status === "loading"
                          ? "bg-muted text-muted-foreground"
                          : "bg-stock-down-bg text-stock-down"
                      }`}
                    >
                      {nikkei225Status === "live" ? "LIVE" : nikkei225Status === "loading" ? "取得中" : "固定値"}
                    </span>
                    {nikkei225UpdatedLabel && <span>更新 {nikkei225UpdatedLabel}</span>}
                  </div>
                </div>
                <div className="relative w-full lg:w-80">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={nikkeiSearchQuery}
                    onChange={(event) => setNikkeiSearchQuery(event.target.value)}
                    placeholder="コード・銘柄名・テーマで検索"
                    className="h-8 w-full rounded border border-border bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <label className="inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xxs font-semibold text-foreground">
                  <Checkbox
                    checked={selectedThemes.length === nikkeiThemes.length}
                    onCheckedChange={handleToggleAllThemes}
                    className="h-3.5 w-3.5"
                  />
                  全テーマ
                </label>
                {nikkeiThemes.map((theme) => (
                  <label key={theme} className="inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xxs font-semibold text-foreground">
                    <Checkbox
                      checked={selectedThemes.includes(theme)}
                      onCheckedChange={() => handleToggleTheme(theme)}
                      className="h-3.5 w-3.5"
                    />
                    {theme}
                  </label>
                ))}
              </div>
            </div>
            <div className="border-b border-border bg-background p-3">
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="flex items-center gap-1 text-xs font-bold text-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  日経225 ヒートマップ
                </h4>
                <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
                  <span>Yahoo Finance日足ベース</span>
                  <span>クリックでチャートページに追加</span>
                  <span className="inline-flex h-4 w-4 rounded border border-blue-300 bg-blue-200" />
                  下落
                  <span className="inline-flex h-4 w-4 rounded border border-border bg-muted" />
                  横ばい
                  <span className="inline-flex h-4 w-4 rounded border border-red-300 bg-red-200" />
                  上昇
                </div>
              </div>
              {nikkeiHeatmapGroups.length ? (
                <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
                  {nikkeiHeatmapGroups.map((group) => (
                    <section key={group.theme} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xxs font-bold text-foreground">{group.theme}</h5>
                        <span
                          className={`text-xxs font-semibold tabular-nums ${
                            group.average > 0 ? "text-stock-up" : group.average < 0 ? "text-stock-down" : "text-muted-foreground"
                          }`}
                        >
                          平均 {formatSignedPercent(group.average)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map(({ stock }) => (
                          <button
                            key={stock.code}
                            type="button"
                            onClick={() => handleToggleChartStock(stock)}
                            className={`min-h-[58px] w-[88px] rounded border p-1.5 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow ${getHeatmapTileClass(
                              stock.changePercent
                            )}`}
                            title={`${stock.code} ${stock.name} ${formatSignedPercent(stock.changePercent)}${
                              chartWatchlistCodes.includes(stock.code) ? " クリックでチャートページから解除" : " クリックでチャートページに追加"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold leading-none">{stock.code}</span>
                              {chartWatchlistCodes.includes(stock.code) && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-white/90 px-1 text-[9px] font-bold leading-tight text-slate-900 shadow-sm">
                                  <Check className="h-2.5 w-2.5 shrink-0" />
                                  追加済
                                </span>
                              )}
                            </div>
                            <div className="mt-1 truncate text-[10px] font-semibold leading-tight">{stock.name}</div>
                            <div className="mt-1 text-xs font-black tabular-nums leading-none">{formatSignedPercent(stock.changePercent)}</div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-border bg-muted/30 px-3 py-6 text-center text-xs font-semibold text-muted-foreground">
                  条件に一致する銘柄がありません。
                </div>
              )}
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted">
                    <th className="w-10 px-2 py-1.5 text-left">{renderSortHeader("index", "#")}</th>
                    <th className="px-2 py-1.5 text-left">{renderSortHeader("code", "コード")}</th>
                    <th className="px-2 py-1.5 text-left">{renderSortHeader("name", "銘柄名")}</th>
                    <th className="px-2 py-1.5 text-left">{renderSortHeader("theme", "テーマ")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("price", "株価", "right")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("change", "前日比", "right")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("changePercent", "騰落率", "right")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("volume", "出来高", "right")}</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">
                      <span className="inline-flex items-center justify-end gap-1">
                        チャート
                        <span className="group relative inline-flex" tabIndex={0}>
                          <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground" />
                          <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-56 rounded border border-border bg-popover p-2 text-left text-xxs leading-relaxed text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
                            追加を押すとチャートページの銘柄選択リストに追加されます。追加済みの銘柄は解除できます。
                          </span>
                        </span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNikkei225Stocks.map(({ stock, originalIndex, theme }, index) => {
                    const isUp = stock.change > 0;
                    const isDown = stock.change < 0;
                    const isAdded = chartWatchlistCodes.includes(stock.code);

                    return (
                      <tr key={stock.code} className={`border-b border-border hover:bg-muted/50 ${index % 2 === 1 ? "bg-table-stripe" : ""}`}>
                        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{originalIndex + 1}</td>
                        <td className="px-2 py-1.5 font-mono text-xxs font-semibold text-primary">{stock.code}</td>
                        <td className="min-w-[140px] px-2 py-1.5 font-medium text-foreground">{stock.name}</td>
                        <td className="min-w-[112px] px-2 py-1.5">
                          <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xxs font-semibold text-muted-foreground">
                            {theme}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-foreground">
                          {stock.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums font-semibold ${
                            isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"
                          }`}
                        >
                          {isUp ? "+" : ""}
                          {stock.change.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums font-semibold ${
                            isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"
                          }`}
                        >
                          {isUp ? "+" : ""}
                          {stock.changePercent.toFixed(2)}%
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-foreground">
                          {(stock.volume / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}千株
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleChartStock(stock)}
                            className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-xxs font-semibold transition-colors ${
                              isAdded
                                ? "border-stock-down/30 bg-stock-down-bg text-stock-down hover:bg-stock-down-bg/80"
                                : "border-primary/40 bg-background text-primary hover:bg-primary/10"
                            }`}
                            title={isAdded ? "チャートページから解除" : "チャートページに追加"}
                          >
                            {isAdded ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            {isAdded ? "解除" : "追加"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!sortedNikkei225Stocks.length && (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-xs font-semibold text-muted-foreground">
                        条件に一致する銘柄がありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default MarketPage;
