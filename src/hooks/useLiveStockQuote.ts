import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { type StockData } from "@/data/stockData";

export type LiveStockStatus = "loading" | "live" | "fallback";

const STOCK_QUOTES_CACHE_KEY = "stock-scout-live-stock-quotes-v1";
const STOCK_QUOTES_CACHE_LIMIT = 2500;
const STOCK_QUOTES_BASE_REFETCH_MS = 3 * 60 * 1000;
const STOCK_QUOTES_MAX_REFETCH_MS = 15 * 60 * 1000;
const STOCK_QUOTES_STALE_TIME_MS = 60 * 1000;

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

interface StockQuoteCache {
  quotes: LiveStockQuote[];
  updatedAt: string;
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

const loadCachedQuotes = () => {
  try {
    const raw = localStorage.getItem(STOCK_QUOTES_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StockQuoteCache;
    const quotes = parsed.quotes?.filter(isValidQuote) ?? [];
    return quotes.length ? { quotes, updatedAt: parsed.updatedAt } : undefined;
  } catch {
    return undefined;
  }
};

const writeCachedQuotes = (quotes: LiveStockQuote[], updatedAt: string) => {
  try {
    const cached = loadCachedQuotes();
    const merged = new Map(cached?.quotes.map((quote) => [quote.code, quote]) ?? []);
    quotes.forEach((quote) => merged.set(quote.code, quote));
    localStorage.setItem(
      STOCK_QUOTES_CACHE_KEY,
      JSON.stringify({
        quotes: Array.from(merged.values()).slice(-STOCK_QUOTES_CACHE_LIMIT),
        updatedAt,
      } satisfies StockQuoteCache)
    );
  } catch {
    // Local storage is an enhancement only.
  }
};

export const useLiveStockQuote = (stock: StockData) => {
  const symbol = `${stock.code}.T`;
  const cached = loadCachedQuotes();
  const cachedQuote = cached?.quotes.find((quote) => quote.code === stock.code);
  const initialData = cachedQuote
    ? {
        quote: cachedQuote,
        updatedAt: cached?.updatedAt ?? "",
      }
    : undefined;
  const consecutiveErrors = useRef(0);
  const query = useQuery({
    queryKey: ["live-stock-quote", symbol],
    queryFn: async () => {
      try {
        const data = await fetchStockQuote(symbol);
        consecutiveErrors.current = 0;
        return data;
      } catch (error) {
        consecutiveErrors.current += 1;
        throw error;
      }
    },
    initialData,
    initialDataUpdatedAt: initialData?.updatedAt ? Date.parse(initialData.updatedAt) || 0 : undefined,
    refetchOnMount: "always",
    refetchInterval: () => {
      const errors = consecutiveErrors.current;
      if (errors === 0) return STOCK_QUOTES_BASE_REFETCH_MS;
      return Math.min(STOCK_QUOTES_BASE_REFETCH_MS * 2 ** errors, STOCK_QUOTES_MAX_REFETCH_MS);
    },
    staleTime: STOCK_QUOTES_STALE_TIME_MS,
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("403")) return false;
      return failureCount < 2;
    },
  });

  // ライブデータ受信時にバックオフを即座にリセット
  const liveQuote = query.data?.quote;
  const hasLiveData = Boolean(liveQuote);
  useEffect(() => {
    if (hasLiveData) consecutiveErrors.current = 0;
  }, [hasLiveData]);

  useEffect(() => {
    if (query.data?.quote) {
      writeCachedQuotes([query.data.quote], query.data.updatedAt);
    }
  }, [query.data]);

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

const quoteBatchSize = 60;

const chunkSymbols = (symbols: string[]) =>
  Array.from({ length: Math.ceil(symbols.length / quoteBatchSize) }, (_, index) =>
    symbols.slice(index * quoteBatchSize, (index + 1) * quoteBatchSize)
  );

const fetchStockQuoteBatch = async (symbols: string[]) => {
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

const fetchStockQuotes = async (symbols: string[]) => {
  const chunks = chunkSymbols(symbols);
  const concurrency = 4;
  const results: PromiseSettledResult<{ quotes: LiveStockQuote[]; updatedAt: string }>[] = [];

  for (let index = 0; index < chunks.length; index += concurrency) {
    const group = chunks.slice(index, index + concurrency);
    results.push(...(await Promise.allSettled(group.map(fetchStockQuoteBatch))));
  }

  const batches = results
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);
  const quotes = batches.flatMap((batch) => batch.quotes);
  if (!quotes.length) throw new Error("stock quotes unavailable");

  return {
    quotes,
    updatedAt: batches.map((batch) => batch.updatedAt).sort().at(-1) ?? new Date().toISOString(),
  };
};

export const useLiveStockQuotes = (stocks: StockData[]) => {
  const symbols = useMemo(() => stocks.map((stock) => `${stock.code}.T`), [stocks]);
  const stockCodes = new Set(stocks.map((stock) => stock.code));
  const cached = loadCachedQuotes();
  const cachedQuotes = cached?.quotes.filter((quote) => stockCodes.has(quote.code)) ?? [];
  const initialData = cachedQuotes.length
    ? {
        quotes: cachedQuotes,
        updatedAt: cached?.updatedAt ?? "",
      }
    : undefined;
  const consecutiveErrors = useRef(0);
  const query = useQuery({
    queryKey: ["live-stock-quotes", symbols],
    queryFn: async () => {
      try {
        const data = await fetchStockQuotes(symbols);
        consecutiveErrors.current = 0;
        return data;
      } catch (error) {
        consecutiveErrors.current += 1;
        throw error;
      }
    },
    enabled: symbols.length > 0,
    initialData,
    initialDataUpdatedAt: initialData?.updatedAt ? Date.parse(initialData.updatedAt) || 0 : undefined,
    refetchOnMount: "always",
    refetchInterval: () => {
      const errors = consecutiveErrors.current;
      if (errors === 0) return STOCK_QUOTES_BASE_REFETCH_MS;
      return Math.min(STOCK_QUOTES_BASE_REFETCH_MS * 2 ** errors, STOCK_QUOTES_MAX_REFETCH_MS);
    },
    staleTime: STOCK_QUOTES_STALE_TIME_MS,
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("403")) return false;
      return failureCount < 2;
    },
  });

  // ライブデータ受信時にバックオフを即座にリセット
  useEffect(() => {
    if (query.data?.quotes?.length) consecutiveErrors.current = 0;
  }, [query.data?.quotes?.length]);

  useEffect(() => {
    if (query.data?.quotes?.length) {
      writeCachedQuotes(query.data.quotes, query.data.updatedAt);
    }
  }, [query.data]);

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
