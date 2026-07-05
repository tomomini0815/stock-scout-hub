import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import MarketOverview from "@/components/MarketOverview";
import RealStockChart from "@/components/RealStockChart";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import {
  growth250ConstituentStocks,
  jpxNikkei400ConstituentStocks,
  jpxPrime150ConstituentStocks,
  topixConstituentStocks,
  toshoReitConstituentStocks,
} from "@/data/japaneseIndexConstituents";
import { marketIndices, nikkei225Stocks, type StockData } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
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

const getThemeFromMarketOrIndustry = (stock: StockData): NikkeiTheme => {
  const label = `${stock.market} ${stock.name}`;
  if (/REIT|不動産|銀行|証券|保険|金融|投資法人/.test(label)) return "金融・不動産";
  if (/医薬|バイオ|ヘルスケア|メディカル/.test(label)) return "医薬・ヘルスケア";
  if (/電気機器|精密機器|半導体|電子|レーザー|ソシオ|キオクシア/.test(label)) return "半導体・電機";
  if (/輸送用機器|機械|ゴム|自動車|造船|重工/.test(label)) return "自動車・機械";
  if (/化学|繊維|石油|石炭|ガラス|土石|鉄鋼|非鉄|金属|鉱業|パルプ|紙/.test(label)) return "素材・化学";
  if (/水産|農林|食料品|小売|卸売|その他製品|ゲーム|外食|食品/.test(label)) return "消費・小売";
  if (/建設|電気・ガス|通信|情報・通信|インフラ/.test(label)) return "通信・インフラ";
  if (/陸運|海運|空運|倉庫|運輸|商社/.test(label)) return "運輸・商社";
  return getNikkeiTheme(stock.code);
};

const nikkei225CodeSet = new Set(nikkei225Stocks.map((stock) => stock.code));

const compareText = (a: string, b: string) => a.localeCompare(b, "ja-JP", { numeric: true });

const parseNumericFilter = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

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

type JapaneseIndexSectionConfig = {
  id: string;
  title: string;
  badge: string;
  note: string;
  stocks: StockData[];
  defaultTheme?: NikkeiTheme;
  themeOverrides?: Record<string, NikkeiTheme>;
};

const INDEX_QUOTE_LIMIT = 120;

const japaneseIndexSections: JapaneseIndexSectionConfig[] = [
  {
    id: "topix",
    title: "TOPIX 構成銘柄一覧",
    badge: "日本株全体",
    note: "JPX公表の構成銘柄をもとに、市場全体の広がりと日経225外の物色を確認",
    stocks: topixConstituentStocks,
  },
  {
    id: "prime150",
    title: "JPXプライム150 構成銘柄一覧",
    badge: "高収益・資本効率",
    note: "資本効率や収益性が意識されやすい大型優良株を確認",
    stocks: jpxPrime150ConstituentStocks,
  },
  {
    id: "jpx400",
    title: "JPX日経400 構成銘柄一覧",
    badge: "投資家目線",
    note: "ROE・ガバナンス・流動性を意識した中核銘柄群を確認",
    stocks: jpxNikkei400ConstituentStocks,
  },
  {
    id: "growth250",
    title: "東証グロース市場250 構成銘柄一覧",
    badge: "成長株",
    note: "新興・成長株のリスク選好、AI/SaaS/バイオ関連の物色を確認",
    stocks: growth250ConstituentStocks,
  },
  {
    id: "reit",
    title: "東証REIT指数 構成銘柄一覧",
    badge: "不動産・利回り",
    note: "金利、分配金利回り、オフィス・物流・商業施設REITの強弱を確認",
    defaultTheme: "金融・不動産",
    stocks: toshoReitConstituentStocks,
  },
];

interface IndexConstituentSectionProps {
  config: JapaneseIndexSectionConfig;
  chartWatchlistCodes: string[];
  onToggleChartStock: (stock: StockData, sourceLabel?: string) => void;
  highlightCode?: string;
}

const IndexConstituentSection = ({ config, chartWatchlistCodes, onToggleChartStock, highlightCode }: IndexConstituentSectionProps) => {
  const [selectedSectionThemes, setSelectedSectionThemes] = useState<NikkeiTheme[]>(nikkeiThemes);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [changeMin, setChangeMin] = useState("");
  const [volumeMin, setVolumeMin] = useState("");
  const [showOnlyOutsideNikkei225, setShowOnlyOutsideNikkei225] = useState(false);
  const [sectionSortKey, setSectionSortKey] = useState<NikkeiSortKey>("index");
  const [sectionSortDirection, setSectionSortDirection] = useState<SortDirection>("asc");
  const getSectionTheme = (stock: StockData): NikkeiTheme =>
    config.themeOverrides?.[stock.code] ?? config.defaultTheme ?? getThemeFromMarketOrIndustry(stock);
  const activeThemes = useMemo(() => new Set(selectedSectionThemes), [selectedSectionThemes]);
  const baseFilteredStocks = useMemo<NikkeiStockItem[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return config.stocks
      .map((stock, index) => ({
        stock,
        originalIndex: index,
        theme: getSectionTheme(stock),
      }))
      .filter((item) => showOnlyOutsideNikkei225 || activeThemes.has(item.theme))
      .filter((item) => !showOnlyOutsideNikkei225 || !nikkei225CodeSet.has(item.stock.code))
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [item.stock.code, item.stock.name, item.theme]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      });
  }, [activeThemes, config.stocks, config.defaultTheme, config.themeOverrides, searchQuery, showOnlyOutsideNikkei225]);
  const highlightedBaseStock = useMemo(
    () => baseFilteredStocks.find((item) => item.stock.code === highlightCode),
    [baseFilteredStocks, highlightCode]
  );
  const displayStockLimit =
    showOnlyOutsideNikkei225 || baseFilteredStocks.length <= 500
      ? baseFilteredStocks.length
      : INDEX_QUOTE_LIMIT;
  const quoteRequestStocks = useMemo(
    () => {
      const stocks = baseFilteredStocks.slice(0, displayStockLimit).map((item) => item.stock);
      if (highlightedBaseStock && !stocks.some((stock) => stock.code === highlightedBaseStock.stock.code)) {
        return [...stocks, highlightedBaseStock.stock];
      }
      return stocks;
    },
    [baseFilteredStocks, displayStockLimit, highlightedBaseStock]
  );
  const { stocks: liveStocks, status, updatedAt } = useLiveStockQuotes(quoteRequestStocks);
  const liveStockByCode = useMemo(() => new Map(liveStocks.map((stock) => [stock.code, stock])), [liveStocks]);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";
  const filteredStocks = useMemo<NikkeiStockItem[]>(() => {
    const parsedPriceMin = parseNumericFilter(priceMin);
    const parsedPriceMax = parseNumericFilter(priceMax);
    const parsedChangeMin = parseNumericFilter(changeMin);
    const parsedVolumeMin = parseNumericFilter(volumeMin);

    const displayBaseStocks = baseFilteredStocks
      .slice(0, displayStockLimit)
      .concat(
        highlightedBaseStock && !baseFilteredStocks.slice(0, displayStockLimit).some((item) => item.stock.code === highlightedBaseStock.stock.code)
          ? [highlightedBaseStock]
          : []
      );

    return displayBaseStocks
      .map((item) => ({
        ...item,
        stock: liveStockByCode.get(item.stock.code) ?? item.stock,
      }))
      .filter((item) => {
        if (parsedPriceMin !== null && item.stock.price < parsedPriceMin) return false;
        if (parsedPriceMax !== null && item.stock.price > parsedPriceMax) return false;
        if (parsedChangeMin !== null && item.stock.changePercent < parsedChangeMin) return false;
        if (parsedVolumeMin !== null && item.stock.volume < parsedVolumeMin * 10000) return false;
        return true;
      });
  }, [baseFilteredStocks, changeMin, displayStockLimit, highlightedBaseStock, liveStockByCode, priceMax, priceMin, volumeMin]);
  const sortedStocks = useMemo(() => {
    const direction = sectionSortDirection === "asc" ? 1 : -1;

    return [...filteredStocks].sort((a, b) => {
      if (sectionSortKey === "index") return (a.originalIndex - b.originalIndex) * direction;
      if (sectionSortKey === "code") return compareText(a.stock.code, b.stock.code) * direction;
      if (sectionSortKey === "name") return compareText(a.stock.name, b.stock.name) * direction;
      if (sectionSortKey === "theme") return compareText(a.theme, b.theme) * direction;

      return (a.stock[sectionSortKey] - b.stock[sectionSortKey]) * direction;
    });
  }, [filteredStocks, sectionSortDirection, sectionSortKey]);
  const heatmapGroups = useMemo(
    () =>
      nikkeiThemes
        .map((theme) => {
          const items = filteredStocks
            .filter((item) => item.theme === theme)
            .sort((a, b) => b.stock.changePercent - a.stock.changePercent);
          const average = items.length
            ? items.reduce((total, item) => total + item.stock.changePercent, 0) / items.length
            : 0;

          return { theme, items, average };
        })
        .filter((group) => group.items.length > 0),
    [filteredStocks]
  );
  const isDisplayLimited = baseFilteredStocks.length > displayStockLimit;
  const hasFilters = Boolean(priceMin.trim() || priceMax.trim() || changeMin.trim() || volumeMin.trim());
  const isAllOutsideNikkei225 = config.stocks.every((stock) => !nikkei225CodeSet.has(stock.code));
  const showThemeFilters = config.id !== "reit";
  const statusLabel = updatedLabel ? `株価更新 ${updatedLabel}` : status === "loading" ? "株価取得中" : "株価確認中";
  const sourceLabel = config.title.replace(/\s*構成銘柄一覧$/, "");
  const hasHighlightedStock = config.stocks.some((stock) => stock.code === highlightCode);
  const handleToggleTheme = (theme: NikkeiTheme) => {
    setShowOnlyOutsideNikkei225(false);
    setSelectedSectionThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme]
    );
  };
  const handleToggleAllThemes = () => {
    setShowOnlyOutsideNikkei225(false);
    setSelectedSectionThemes((current) => (current.length === nikkeiThemes.length ? [] : nikkeiThemes));
  };
  const handleToggleOutsideNikkei225 = () => {
    const next = !showOnlyOutsideNikkei225;
    setShowOnlyOutsideNikkei225(next);
    setSelectedSectionThemes(next ? [] : nikkeiThemes);
  };
  const handleClearFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setChangeMin("");
    setVolumeMin("");
  };
  const handleSort = (nextKey: NikkeiSortKey) => {
    setSectionSortKey((currentKey) => {
      if (currentKey === nextKey) {
        setSectionSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return currentKey;
      }

      setSectionSortDirection(nextKey === "index" || nextKey === "code" || nextKey === "name" || nextKey === "theme" ? "asc" : "desc");
      return nextKey;
    });
  };
  const renderSectionSortIcon = (key: NikkeiSortKey) => {
    if (sectionSortKey !== key) return <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground/70" />;
    return sectionSortDirection === "asc" ? <ArrowUp className="h-3 w-3 shrink-0 text-primary" /> : <ArrowDown className="h-3 w-3 shrink-0 text-primary" />;
  };
  const renderSectionSortHeader = (key: NikkeiSortKey, label: string, align: "left" | "right" = "left") => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className={`inline-flex w-full items-center gap-1 whitespace-nowrap text-xxs font-semibold text-muted-foreground hover:text-foreground ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {label}
      {renderSectionSortIcon(key)}
    </button>
  );

  useEffect(() => {
    if (!hasHighlightedStock) return;
    window.setTimeout(() => {
      const target =
        document.getElementById(`market-stock-${highlightCode}`)
        ?? document.getElementById(`market-stock-row-${highlightCode}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [hasHighlightedStock, highlightCode]);

  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border bg-table-header-bg px-3 py-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <h3 className="flex flex-wrap items-center gap-1 text-xs font-bold text-foreground">
              <ListChecks className="h-3 w-3" />
              {config.title}
              <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xxs text-primary">{config.badge}</span>
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xxs text-muted-foreground">
                表示 {sortedStocks.length}/{baseFilteredStocks.length}銘柄
              </span>
            </h3>
            <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="コード・銘柄名・テーマで検索"
              className="h-8 w-full rounded border border-border bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <p className="mt-1 text-xxs font-semibold leading-relaxed text-muted-foreground">{config.note}</p>
        {isDisplayLimited && (
          <p className="mt-1 text-xxs font-semibold leading-relaxed text-muted-foreground">
            条件一致が多いため、株価取得と表・ヒートマップ表示は先頭{INDEX_QUOTE_LIMIT}件に絞っています。検索や「日経225にない銘柄」の件数は全{config.stocks.length}銘柄から判定します。
          </p>
        )}
        {(!isAllOutsideNikkei225 || showThemeFilters) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!isAllOutsideNikkei225 && (
              <label className="inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xxs font-semibold text-foreground">
                <Checkbox checked={showOnlyOutsideNikkei225} onCheckedChange={handleToggleOutsideNikkei225} className="h-3.5 w-3.5" />
                日経225にない銘柄
              </label>
            )}
            {showThemeFilters && (
              <>
                <label className="inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xxs font-semibold text-foreground">
                  <Checkbox checked={selectedSectionThemes.length === nikkeiThemes.length} onCheckedChange={handleToggleAllThemes} className="h-3.5 w-3.5" />
                  全テーマ
                </label>
                {nikkeiThemes.map((theme) => (
                  <label key={theme} className="inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xxs font-semibold text-foreground">
                    <Checkbox checked={selectedSectionThemes.includes(theme)} onCheckedChange={() => handleToggleTheme(theme)} className="h-3.5 w-3.5" />
                    {theme}
                  </label>
                ))}
              </>
            )}
          </div>
        )}
        <div className="mt-2 grid gap-2 border-t border-border/70 pt-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <label className="min-w-0">
            <span className="mb-1 block text-xxs font-semibold text-muted-foreground">株価下限</span>
            <input type="number" inputMode="numeric" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} placeholder="例: 1000" className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xxs font-semibold text-muted-foreground">株価上限</span>
            <input type="number" inputMode="numeric" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} placeholder="例: 10000" className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xxs font-semibold text-muted-foreground">騰落率下限</span>
            <input type="number" inputMode="decimal" step="0.1" value={changeMin} onChange={(event) => setChangeMin(event.target.value)} placeholder="例: 1.0%" className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xxs font-semibold text-muted-foreground">出来高下限</span>
            <input type="number" inputMode="numeric" value={volumeMin} onChange={(event) => setVolumeMin(event.target.value)} placeholder="万株 例: 100" className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <button type="button" onClick={handleClearFilters} disabled={!hasFilters} className="inline-flex h-8 items-center justify-center gap-1 self-end rounded border border-border bg-background px-2 text-xxs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40">
            <X className="h-3 w-3" />
            条件クリア
          </button>
        </div>
      </div>
      <div className="border-b border-border bg-background p-3">
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="flex items-center gap-1 text-xs font-bold text-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            ヒートマップ
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
        {heatmapGroups.length ? (
          <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
            {heatmapGroups.map((group) => (
              <section key={group.theme} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xxs font-bold text-foreground">{group.theme}</h5>
                  <span className={`text-xxs font-semibold tabular-nums ${group.average > 0 ? "text-stock-up" : group.average < 0 ? "text-stock-down" : "text-muted-foreground"}`}>
                    平均 {formatSignedPercent(group.average)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map(({ stock }) => (
                      <button
                      id={`market-stock-${stock.code}`}
                      key={stock.code}
                      type="button"
                      onClick={() => onToggleChartStock(stock, sourceLabel)}
                      className={`min-h-[58px] w-[88px] rounded border p-1.5 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow ${
                        stock.code === highlightCode ? "ring-2 ring-primary ring-offset-2" : ""
                      } ${getHeatmapTileClass(stock.changePercent)}`}
                      title={`${stock.code} ${stock.name} ${formatSignedPercent(stock.changePercent)}${chartWatchlistCodes.includes(stock.code) ? " クリックでチャートページから解除" : " クリックでチャートページに追加"}`}
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
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-table-header-bg">
              <th className="w-10 px-2 py-1.5 text-left">{renderSectionSortHeader("index", "#")}</th>
              <th className="px-2 py-1.5 text-left">{renderSectionSortHeader("code", "コード")}</th>
              <th className="px-2 py-1.5 text-left">{renderSectionSortHeader("name", "銘柄名")}</th>
              <th className="px-2 py-1.5 text-left">{renderSectionSortHeader("theme", "テーマ")}</th>
              <th className="px-2 py-1.5 text-right">{renderSectionSortHeader("price", "株価", "right")}</th>
              <th className="px-2 py-1.5 text-right">{renderSectionSortHeader("change", "前日比", "right")}</th>
              <th className="px-2 py-1.5 text-right">{renderSectionSortHeader("changePercent", "騰落率", "right")}</th>
              <th className="px-2 py-1.5 text-right">{renderSectionSortHeader("volume", "出来高", "right")}</th>
              <th className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-muted-foreground">チャート</th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.map(({ stock, originalIndex, theme }, index) => {
              const isUp = stock.change > 0;
              const isDown = stock.change < 0;
              const isAdded = chartWatchlistCodes.includes(stock.code);

              return (
                <tr
                  key={stock.code}
                  id={`market-stock-row-${stock.code}`}
                  className={`border-b border-border hover:bg-muted/50 ${
                    stock.code === highlightCode ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : index % 2 === 1 ? "bg-table-stripe" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{originalIndex + 1}</td>
                  <td className="px-2 py-1.5 font-mono text-xxs font-semibold text-primary">{stock.code}</td>
                  <td className="min-w-[140px] px-2 py-1.5 font-medium text-foreground">{stock.name}</td>
                  <td className="min-w-[112px] px-2 py-1.5">
                    <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xxs font-semibold text-muted-foreground">{theme}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-foreground">
                    {stock.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"}`}>
                    {isUp ? "+" : ""}{stock.change.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"}`}>
                    {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-foreground">
                    {(stock.volume / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}千株
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleChartStock(stock, sourceLabel)}
                      className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border px-2 text-xxs font-semibold transition-colors ${
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
            {!sortedStocks.length && (
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
  );
};

const MarketPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightCode = searchParams.get("highlight") ?? undefined;
  const [chartWatchlistCodes, setChartWatchlistCodes] = useState<string[]>(() =>
    readChartWatchlist().map((stock) => stock.code)
  );
  const [selectedThemes, setSelectedThemes] = useState<NikkeiTheme[]>(nikkeiThemes);
  const [nikkeiSearchQuery, setNikkeiSearchQuery] = useState("");
  const [nikkeiPriceMin, setNikkeiPriceMin] = useState("");
  const [nikkeiPriceMax, setNikkeiPriceMax] = useState("");
  const [nikkeiChangeMin, setNikkeiChangeMin] = useState("");
  const [nikkeiVolumeMin, setNikkeiVolumeMin] = useState("");
  const [sortKey, setSortKey] = useState<NikkeiSortKey>("index");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { stocks: liveSectors, status, updatedAt } = useLiveStockQuotes(sectorRepresentatives);
  const {
    stocks: liveNikkei225Stocks,
    status: nikkei225Status,
    updatedAt: nikkei225UpdatedAt,
  } = useLiveStockQuotes(nikkei225Stocks);
  const { indices: liveMarketIndices, updatedAt: marketUpdatedAt } = useLiveMarketData(marketIndices);
  const liveNikkeiIndex = liveMarketIndices.find((index) => index.name === "日経平均");
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
  const handleAddChartStock = (stock: StockData, sourceLabel?: string) => {
    const nextStocks = addChartWatchlistStock({ ...stock, sourceLabel });
    setChartWatchlistCodes(nextStocks.map((item) => item.code));
    toast.success(`${stock.code} ${stock.name}を追加しました`, {
      description: `銘柄・チャートページの銘柄選択に追加しました${sourceLabel ? `（${sourceLabel}）` : ""}。`,
      action: {
        label: "表示",
        onClick: () => navigate(`/chart?q=${encodeURIComponent(stock.code)}`),
      },
    });
  };
  const handleRemoveChartStock = (code: string) => {
    const nextStocks = removeChartWatchlistStock(code);
    setChartWatchlistCodes(nextStocks.map((item) => item.code));
  };
  const handleToggleChartStock = (stock: StockData, sourceLabel?: string) => {
    if (chartWatchlistCodes.includes(stock.code)) {
      handleRemoveChartStock(stock.code);
      return;
    }

    handleAddChartStock(stock, sourceLabel);
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
  const hasNikkeiScreeningFilters = Boolean(
    nikkeiPriceMin.trim() || nikkeiPriceMax.trim() || nikkeiChangeMin.trim() || nikkeiVolumeMin.trim()
  );
  const handleClearNikkeiScreeningFilters = () => {
    setNikkeiPriceMin("");
    setNikkeiPriceMax("");
    setNikkeiChangeMin("");
    setNikkeiVolumeMin("");
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
    const priceMin = parseNumericFilter(nikkeiPriceMin);
    const priceMax = parseNumericFilter(nikkeiPriceMax);
    const changeMin = parseNumericFilter(nikkeiChangeMin);
    const volumeMin = parseNumericFilter(nikkeiVolumeMin);

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
      })
      .filter((item) => {
        if (priceMin !== null && item.stock.price < priceMin) return false;
        if (priceMax !== null && item.stock.price > priceMax) return false;
        if (changeMin !== null && item.stock.changePercent < changeMin) return false;
        if (volumeMin !== null && item.stock.volume < volumeMin * 10000) return false;
        return true;
      });
  }, [
    liveNikkei225Stocks,
    nikkeiChangeMin,
    nikkeiPriceMax,
    nikkeiPriceMin,
    nikkeiSearchQuery,
    nikkeiVolumeMin,
    selectedThemes,
  ]);

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
  const highlightedNikkeiStock = useMemo(
    () => nikkei225Stocks.find((stock) => stock.code === highlightCode),
    [highlightCode]
  );
  const displayedNikkei225Stocks = useMemo(() => {
    if (!highlightedNikkeiStock || sortedNikkei225Stocks.some((item) => item.stock.code === highlightedNikkeiStock.code)) {
      return sortedNikkei225Stocks;
    }

    return [
      ...sortedNikkei225Stocks,
      {
        stock: highlightedNikkeiStock,
        originalIndex: nikkei225Stocks.findIndex((stock) => stock.code === highlightedNikkeiStock.code),
        theme: getNikkeiTheme(highlightedNikkeiStock.code),
      },
    ];
  }, [highlightedNikkeiStock, sortedNikkei225Stocks]);
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
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground/70" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 shrink-0 text-primary" /> : <ArrowDown className="h-3 w-3 shrink-0 text-primary" />;
  };
  const renderSortHeader = (key: NikkeiSortKey, label: string, align: "left" | "right" = "left") => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className={`inline-flex w-full items-center gap-1 whitespace-nowrap text-xxs font-semibold text-muted-foreground hover:text-foreground ${
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

  useEffect(() => {
    if (!highlightCode) return;
    window.setTimeout(() => {
      const target =
        document.getElementById(`market-stock-${highlightCode}`)
        ?? document.getElementById(`market-stock-row-${highlightCode}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 160);
  }, [highlightCode]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="市況・スクリーニング" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto flex flex-col px-4 py-3">
        <h2 className="order-1 mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          市況概況
        </h2>

        <div className="order-2 mb-3">
          <MarketOverview indices={marketIndices} detailed />
        </div>

        <div className="order-4 mb-3">
          <RealStockChart
            code="N225"
            name="日経平均株価"
            chartSymbol="NIKKEI:NI225"
            chartApiSymbol="^N225"
            currentPrice={liveNikkeiIndex?.value}
            currentPriceLabel="主要指数"
            currentPriceUpdatedAt={marketUpdatedAt}
          />
        </div>

        <div className="order-5 mb-3">
          <div className="rounded border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
              <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
                <TrendingUp className="h-3 w-3" />
                業種代表銘柄の騰落率
              </h3>
              <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {updatedLabel ? `更新 ${updatedLabel}` : status === "loading" ? "取得中" : "更新確認中"}
                </span>
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

        <div className="order-3 mb-3">
          <div className="rounded border border-border bg-card">
            <div className="border-b border-border bg-table-header-bg px-3 py-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <ListChecks className="h-3 w-3" />
                    日経225 採用銘柄一覧
                    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xxs text-muted-foreground">
                      {displayedNikkei225Stocks.length}/{liveNikkei225Stocks.length}銘柄
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {nikkei225UpdatedLabel ? `更新 ${nikkei225UpdatedLabel}` : nikkei225Status === "loading" ? "取得中" : "更新確認中"}
                    </span>
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
              <div className="mt-2 grid gap-2 border-t border-border/70 pt-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                <label className="min-w-0">
                  <span className="mb-1 block text-xxs font-semibold text-muted-foreground">株価下限</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={nikkeiPriceMin}
                    onChange={(event) => setNikkeiPriceMin(event.target.value)}
                    placeholder="例: 1000"
                    className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block text-xxs font-semibold text-muted-foreground">株価上限</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={nikkeiPriceMax}
                    onChange={(event) => setNikkeiPriceMax(event.target.value)}
                    placeholder="例: 10000"
                    className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block text-xxs font-semibold text-muted-foreground">騰落率下限</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={nikkeiChangeMin}
                    onChange={(event) => setNikkeiChangeMin(event.target.value)}
                    placeholder="例: 1.0%"
                    className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block text-xxs font-semibold text-muted-foreground">出来高下限</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={nikkeiVolumeMin}
                    onChange={(event) => setNikkeiVolumeMin(event.target.value)}
                    placeholder="万株 例: 100"
                    className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleClearNikkeiScreeningFilters}
                  disabled={!hasNikkeiScreeningFilters}
                  className="inline-flex h-8 items-center justify-center gap-1 self-end rounded border border-border bg-background px-2 text-xxs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-3 w-3" />
                  条件クリア
                </button>
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
                            id={`market-stock-${stock.code}`}
                            key={stock.code}
                            type="button"
                            onClick={() => handleToggleChartStock(stock, "日経225")}
                            className={`min-h-[58px] w-[88px] rounded border p-1.5 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow ${
                              stock.code === highlightCode ? "ring-2 ring-primary ring-offset-2" : ""
                            } ${getHeatmapTileClass(
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
              <table className="w-full min-w-[760px] text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-table-header-bg">
                    <th className="w-10 px-2 py-1.5 text-left">{renderSortHeader("index", "#")}</th>
                    <th className="px-2 py-1.5 text-left">{renderSortHeader("code", "コード")}</th>
                    <th className="px-2 py-1.5 text-left">{renderSortHeader("name", "銘柄名")}</th>
                    <th className="px-2 py-1.5 text-left">{renderSortHeader("theme", "テーマ")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("price", "株価", "right")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("change", "前日比", "right")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("changePercent", "騰落率", "right")}</th>
                    <th className="px-2 py-1.5 text-right">{renderSortHeader("volume", "出来高", "right")}</th>
                    <th className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-muted-foreground">
                      <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
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
                  {displayedNikkei225Stocks.map(({ stock, originalIndex, theme }, index) => {
                    const isUp = stock.change > 0;
                    const isDown = stock.change < 0;
                    const isAdded = chartWatchlistCodes.includes(stock.code);

                    return (
                      <tr
                        key={stock.code}
                        id={`market-stock-row-${stock.code}`}
                        className={`border-b border-border hover:bg-muted/50 ${
                          stock.code === highlightCode ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : index % 2 === 1 ? "bg-table-stripe" : ""
                        }`}
                      >
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
                            onClick={() => handleToggleChartStock(stock, "日経225")}
                            className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border px-2 text-xxs font-semibold transition-colors ${
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
                  {!displayedNikkei225Stocks.length && (
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
        {japaneseIndexSections.map((config) => (
          <div key={config.id} className="order-3 mb-3">
            <IndexConstituentSection
              config={config}
              chartWatchlistCodes={chartWatchlistCodes}
              onToggleChartStock={handleToggleChartStock}
              highlightCode={highlightCode}
            />
          </div>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
};

export default MarketPage;
