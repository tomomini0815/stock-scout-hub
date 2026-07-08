import { type StockData } from "@/data/stockData";

export const CHART_WATCHLIST_STORAGE_KEY = "stock-scout-chart-watchlist";
export const CHART_WATCHLIST_UPDATED_EVENT = "stock-scout-chart-watchlist-updated";

export type ChartWatchlistStock = StockData & {
  sourceLabel?: string;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStock = (stock: ChartWatchlistStock): ChartWatchlistStock => ({
  code: stock.code,
  name: stock.name,
  market: stock.market || stock.sourceLabel || "プライム",
  price: toNumber(stock.price),
  change: toNumber(stock.change),
  changePercent: toNumber(stock.changePercent),
  volume: toNumber(stock.volume),
  open: toNumber(stock.open),
  high: toNumber(stock.high),
  low: toNumber(stock.low),
  previousClose: toNumber(stock.previousClose),
  ...(stock.sourceLabel ? { sourceLabel: stock.sourceLabel } : {}),
});

const isStockData = (value: unknown): value is ChartWatchlistStock => {
  if (!value || typeof value !== "object") return false;

  const stock = value as Partial<ChartWatchlistStock>;
  return typeof stock.code === "string" && typeof stock.name === "string";
};

export const readChartWatchlist = (): ChartWatchlistStock[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CHART_WATCHLIST_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStockData).map(normalizeStock);
  } catch {
    return [];
  }
};

export const writeChartWatchlist = (stocks: ChartWatchlistStock[]) => {
  if (typeof window === "undefined") return;

  const uniqueStocks = stocks.filter(
    (stock, index, list) => list.findIndex((item) => item.code === stock.code) === index
  );

  window.localStorage.setItem(
    CHART_WATCHLIST_STORAGE_KEY,
    JSON.stringify(uniqueStocks.map(normalizeStock))
  );
  window.dispatchEvent(new Event(CHART_WATCHLIST_UPDATED_EVENT));
};

export const addChartWatchlistStock = (stock: ChartWatchlistStock) => {
  const current = readChartWatchlist();
  if (current.some((item) => item.code === stock.code)) return current;

  const nextStocks = [normalizeStock(stock), ...current];
  writeChartWatchlist(nextStocks);
  return nextStocks;
};

export const removeChartWatchlistStock = (code: string) => {
  const nextStocks = readChartWatchlist().filter((stock) => stock.code !== code);
  writeChartWatchlist(nextStocks);
  return nextStocks;
};
