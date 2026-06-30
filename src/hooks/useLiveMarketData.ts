import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type MarketIndex } from "@/data/stockData";

export type LiveMarketStatus = "live" | "cached" | "fallback";

const MARKET_CACHE_KEY = "stock-scout-market-data-v1";

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
  if (!response.ok) throw new Error("market api unavailable");

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
    return indices.length ? { ...parsed, indices } : undefined;
  } catch {
    return undefined;
  }
};

export const useLiveMarketData = (fallbackIndices: MarketIndex[]) => {
  const query = useQuery({
    queryKey: ["live-market-data"],
    queryFn: fetchLiveMarketData,
    initialData: () =>
      loadCachedMarketData() ?? {
        indices: fallbackIndices,
        updatedAt: "",
        source: "fallback" as const,
      },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

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
