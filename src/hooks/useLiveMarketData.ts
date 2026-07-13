import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type MarketIndex } from "@/data/stockData";

export type LiveMarketStatus = "live" | "cached" | "fallback";

const MARKET_CACHE_KEY = "stock-scout-market-data-v1";
const MARKET_STALE_TIME_MS = 30 * 1000;
const MARKET_BASE_REFETCH_MS = 60 * 1000;
const MARKET_MAX_REFETCH_MS = 10 * 60 * 1000;

interface MarketDataPayload {
  indices?: MarketIndex[];
  updatedAt?: string;
  source?: "live" | "cache" | "fallback";
}

const isValidIndex = (item: MarketIndex) =>
  item.name &&
  Number.isFinite(item.value) &&
  Number.isFinite(item.change) &&
  Number.isFinite(item.changePercent);

const fetchLiveMarketData = async (): Promise<Required<MarketDataPayload>> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const response = await fetch("/api/market-data", {
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  if (!response.ok) throw new Error(`market api ${response.status}`);

  const payload = (await response.json()) as MarketDataPayload;
  const indices = payload.indices?.filter(isValidIndex) ?? [];
  if (indices.length < 2) throw new Error("market data unavailable");

  return {
    indices,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
    source: payload.source ?? "live",
  };
};

const loadCachedMarketData = () => {
  try {
    const raw = localStorage.getItem(MARKET_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Required<MarketDataPayload>;
    const indices = parsed.indices?.filter(isValidIndex) ?? [];
    return indices.length ? { ...parsed, indices, source: "cache" as const } : undefined;
  } catch {
    return undefined;
  }
};

export const useLiveMarketData = (fallbackIndices: MarketIndex[]) => {
  const initialMarketData = loadCachedMarketData() ?? {
    indices: fallbackIndices,
    updatedAt: "",
    source: "fallback" as const,
  };

  const consecutiveErrors = useRef(0);
  const query = useQuery({
    queryKey: ["live-market-data"],
    queryFn: async () => {
      try {
        const data = await fetchLiveMarketData();
        consecutiveErrors.current = 0;
        return data;
      } catch (error) {
        consecutiveErrors.current += 1;
        throw error;
      }
    },
    initialData: initialMarketData,
    initialDataUpdatedAt:
      initialMarketData.source === "fallback"
        ? 0
        : Date.parse(initialMarketData.updatedAt) || 0,
    refetchOnMount: "always",
    refetchInterval: () => {
      const errors = consecutiveErrors.current;
      if (errors === 0) return MARKET_BASE_REFETCH_MS;
      const backoff = Math.min(MARKET_BASE_REFETCH_MS * 2 ** errors, MARKET_MAX_REFETCH_MS);
      return backoff;
    },
    staleTime: MARKET_STALE_TIME_MS,
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("403")) return false;
      return failureCount < 2;
    },
  });

  // ライブデータ受信時にバックオフを即座にリセット
  useEffect(() => {
    if (query.data?.source === "live") {
      consecutiveErrors.current = 0;
    }
  }, [query.data?.source]);

  useEffect(() => {
    if (query.data?.indices?.length && query.data.source !== "fallback") {
      localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(query.data));
    }
  }, [query.data]);

  const displayIndices = query.data?.indices?.length ? query.data.indices : fallbackIndices;
  const source = query.data?.source ?? "fallback";

  return {
    indices: displayIndices,
    status: source === "live" ? "live" : source === "cache" ? "cached" : "fallback",
    updatedAt: query.data?.updatedAt,
  } satisfies {
    indices: MarketIndex[];
    status: LiveMarketStatus;
    updatedAt?: string;
  };
};
