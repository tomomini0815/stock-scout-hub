import {
  growth250ConstituentStocks,
  jpxNikkei400ConstituentStocks,
  jpxPrime150ConstituentStocks,
  topixConstituentStocks,
  toshoReitConstituentStocks,
} from "@/data/japaneseIndexConstituents";
import { nikkei225Stocks, stockUniverse, type StockData } from "@/data/stockData";
import { readChartWatchlist } from "@/lib/chartWatchlist";

export type SearchableStock = StockData & {
  sourceLabel: string;
  sourceId: string;
};

const baseSearchSources: Array<{ stocks: StockData[]; sourceLabel: string; sourceId: string }> = [
  { stocks: stockUniverse, sourceLabel: "銘柄・チャート", sourceId: "chart" },
  { stocks: nikkei225Stocks, sourceLabel: "日経225", sourceId: "nikkei225" },
  { stocks: topixConstituentStocks, sourceLabel: "TOPIX", sourceId: "topix" },
  { stocks: jpxPrime150ConstituentStocks, sourceLabel: "JPXプライム150", sourceId: "prime150" },
  { stocks: jpxNikkei400ConstituentStocks, sourceLabel: "JPX日経400", sourceId: "jpx400" },
  { stocks: growth250ConstituentStocks, sourceLabel: "東証グロース市場250", sourceId: "growth250" },
  { stocks: toshoReitConstituentStocks, sourceLabel: "東証REIT指数", sourceId: "reit" },
];

const getSearchSources = () => [
  { stocks: readChartWatchlist(), sourceLabel: "追加銘柄", sourceId: "watchlist" },
  ...baseSearchSources,
];

const toSearchableStock = (
  stock: StockData,
  source: { sourceLabel: string; sourceId: string }
): SearchableStock => ({
  ...stock,
  sourceLabel: source.sourceLabel,
  sourceId: source.sourceId,
});

const findInSources = (predicate: (stock: StockData) => boolean) => {
  const seenCodes = new Set<string>();
  for (const source of getSearchSources()) {
    for (const stock of source.stocks) {
      if (seenCodes.has(stock.code)) continue;
      seenCodes.add(stock.code);
      if (predicate(stock)) return toSearchableStock(stock, source);
    }
  }

  return undefined;
};

export const findSearchableStock = (query: string): SearchableStock | undefined => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  if (
    normalized === "n225" ||
    normalized === "^n225" ||
    normalized === "ni225" ||
    normalized === "日経平均" ||
    normalized === "日経225" ||
    normalized === "日経平均株価"
  ) {
    return {
      code: "N225",
      name: "日経平均株価",
      market: "主要指数",
      price: 39098.68,
      change: 435.62,
      changePercent: 1.13,
      volume: 1450000000,
      open: 38850.0,
      high: 39150.0,
      low: 38780.0,
      previousClose: 38663.06,
      sourceLabel: "主要指数",
      sourceId: "index",
    };
  }

  return findInSources((stock) => stock.code.toLowerCase() === normalized)
    ?? findInSources((stock) => stock.name.toLowerCase().includes(normalized));
};
