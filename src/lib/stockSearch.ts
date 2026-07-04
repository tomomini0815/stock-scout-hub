import {
  growth250ConstituentStocks,
  jpxNikkei400ConstituentStocks,
  jpxPrime150ConstituentStocks,
  topixConstituentStocks,
  toshoReitConstituentStocks,
} from "@/data/japaneseIndexConstituents";
import { nikkei225Stocks, stockUniverse, type StockData } from "@/data/stockData";

export type SearchableStock = StockData & {
  sourceLabel: string;
  sourceId: string;
};

const searchSources: Array<{ stocks: StockData[]; sourceLabel: string; sourceId: string }> = [
  { stocks: stockUniverse, sourceLabel: "銘柄・チャート", sourceId: "chart" },
  { stocks: nikkei225Stocks, sourceLabel: "日経225", sourceId: "nikkei225" },
  { stocks: topixConstituentStocks, sourceLabel: "TOPIX", sourceId: "topix" },
  { stocks: jpxPrime150ConstituentStocks, sourceLabel: "JPXプライム150", sourceId: "prime150" },
  { stocks: jpxNikkei400ConstituentStocks, sourceLabel: "JPX日経400", sourceId: "jpx400" },
  { stocks: growth250ConstituentStocks, sourceLabel: "東証グロース市場250", sourceId: "growth250" },
  { stocks: toshoReitConstituentStocks, sourceLabel: "東証REIT指数", sourceId: "reit" },
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
  for (const source of searchSources) {
    for (const stock of source.stocks) {
      if (seenCodes.has(stock.code)) continue;
      seenCodes.add(stock.code);
      if (predicate(stock)) return toSearchableStock(stock, source);
    }
  }

  return undefined;
};

export const findSearchableStock = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  return findInSources((stock) => stock.code.toLowerCase() === normalized)
    ?? findInSources((stock) => stock.name.toLowerCase().includes(normalized));
};
