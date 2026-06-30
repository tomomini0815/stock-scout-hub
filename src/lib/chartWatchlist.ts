import { type StockData } from "@/data/stockData";

export const CHART_WATCHLIST_STORAGE_KEY = "stock-scout-chart-watchlist";
export const CHART_WATCHLIST_UPDATED_EVENT = "stock-scout-chart-watchlist-updated";

const normalizeStock = (stock: StockData): StockData => ({
  code: stock.code,
  name: stock.name,
  market: stock.market,
  price: stock.price,
  change: stock.change,
  changePercent: stock.changePercent,
  volume: stock.volume,
  open: stock.open,
  high: stock.high,
  low: stock.low,
  previousClose: stock.previousClose,
});

const isStockData = (value: unknown): value is StockData => {
  if (!value || typeof value !== "object") return false;

  const stock = value as Partial<StockData>;
  return typeof stock.code === "string" && typeof stock.name === "string";
};

export const readChartWatchlist = (): StockData[] => {
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

export const writeChartWatchlist = (stocks: StockData[]) => {
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

export const addChartWatchlistStock = (stock: StockData) => {
  const current = readChartWatchlist();
  if (current.some((item) => item.code === stock.code)) return current;

  const nextStocks = [...current, normalizeStock(stock)];
  writeChartWatchlist(nextStocks);
  return nextStocks;
};

export const removeChartWatchlistStock = (code: string) => {
  const nextStocks = readChartWatchlist().filter((stock) => stock.code !== code);
  writeChartWatchlist(nextStocks);
  return nextStocks;
};
