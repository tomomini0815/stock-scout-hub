import { useQuery } from "@tanstack/react-query";
import { type StockData } from "@/data/stockData";

export type LiveStockStatus = "loading" | "live" | "fallback";

interface LiveStockQuote {
  code: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
}

interface StockQuotePayload {
  quotes?: LiveStockQuote[];
  updatedAt?: string;
}

const isValidQuote = (quote: LiveStockQuote) =>
  quote.code &&
  Number.isFinite(quote.price) &&
  Number.isFinite(quote.change) &&
  Number.isFinite(quote.changePercent) &&
  Number.isFinite(quote.previousClose);

const fetchStockQuote = async (symbol: string) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const response = await fetch(`/api/stock-quotes?symbols=${encodeURIComponent(symbol)}`, {
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  if (!response.ok) throw new Error("stock quote api unavailable");

  const payload = (await response.json()) as StockQuotePayload;
  const quote = payload.quotes?.find(isValidQuote);
  if (!quote) throw new Error("stock quote unavailable");

  return {
    quote,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  };
};

export const useLiveStockQuote = (stock: StockData) => {
  const symbol = `${stock.code}.T`;
  const query = useQuery({
    queryKey: ["live-stock-quote", symbol],
    queryFn: () => fetchStockQuote(symbol),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const liveQuote = query.data?.quote;
  const hasLiveData = Boolean(liveQuote);
  const displayStock: StockData = hasLiveData
    ? {
        ...stock,
        price: liveQuote.price,
        change: liveQuote.change,
        changePercent: liveQuote.changePercent,
        volume: liveQuote.volume,
        open: liveQuote.open,
        high: liveQuote.high,
        low: liveQuote.low,
        previousClose: liveQuote.previousClose,
      }
    : stock;

  return {
    stock: displayStock,
    status: query.isLoading ? "loading" : hasLiveData ? "live" : "fallback",
    updatedAt: query.data?.updatedAt,
  } satisfies {
    stock: StockData;
    status: LiveStockStatus;
    updatedAt?: string;
  };
};

const fetchStockQuotes = async (symbols: string[]) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const response = await fetch(
    `/api/stock-quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
    { signal: controller.signal }
  ).finally(() => window.clearTimeout(timeout));
  if (!response.ok) throw new Error("stock quote api unavailable");

  const payload = (await response.json()) as StockQuotePayload;
  const quotes = payload.quotes?.filter(isValidQuote) ?? [];
  if (!quotes.length) throw new Error("stock quotes unavailable");

  return {
    quotes,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  };
};

export const useLiveStockQuotes = (stocks: StockData[]) => {
  const symbols = stocks.map((stock) => `${stock.code}.T`);
  const query = useQuery({
    queryKey: ["live-stock-quotes", symbols],
    queryFn: () => fetchStockQuotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const liveByCode = new Map(
    query.data?.quotes.map((quote) => [quote.code, quote]) ?? []
  );

  const displayStocks = stocks.map((stock) => {
    const liveQuote = liveByCode.get(stock.code);
    return liveQuote
      ? {
          ...stock,
          price: liveQuote.price,
          change: liveQuote.change,
          changePercent: liveQuote.changePercent,
          volume: liveQuote.volume,
          open: liveQuote.open,
          high: liveQuote.high,
          low: liveQuote.low,
          previousClose: liveQuote.previousClose,
        }
      : stock;
  });

  return {
    stocks: displayStocks,
    status: query.isLoading
      ? "loading"
      : liveByCode.size > 0
      ? "live"
      : "fallback",
    updatedAt: query.data?.updatedAt,
  } satisfies {
    stocks: StockData[];
    status: LiveStockStatus;
    updatedAt?: string;
  };
};
