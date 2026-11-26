import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type MarketIndex } from "@/data/stockData";

export type LiveMarketStatus = "live" | "cached" | "fallback";

const MARKET_CACHE_KEY = "stock-scout-market-data-v2";
const MARKET_STALE_TIME_MS = 10 * 1000;
const MARKET_BASE_REFETCH_MS = 20 * 1000;
const MARKET_MAX_REFETCH_MS = 5 * 60 * 1000;

interface MarketDataPayload {
  indices?: MarketIndex[];
  macroAssets?: MarketIndex[];
  extraIndices?: MarketIndex[];
  updatedAt?: string;
  source?: "live" | "cache" | "fallback";
}

export const defaultMacroAssets: MarketIndex[] = [
  { name: "米国債(TLT)", value: 92.4, change: -0.32, changePercent: -0.35 },
  { name: "米ドル(DXY)", value: 104.25, change: -0.18, changePercent: -0.17 },
  { name: "原油(WTI)", value: 71.8, change: 0.45, changePercent: 0.63 },
];

const isGitHubPages = typeof window !== "undefined" && window.location.hostname.includes("github.io");

const isValidIndex = (item: MarketIndex) =>
  item.name &&
  Number.isFinite(item.value) &&
  Number.isFinite(item.change) &&
  Number.isFinite(item.changePercent);

const fetchLiveMarketData = async (): Promise<Required<MarketDataPayload>> => {
  if (isGitHubPages) throw new Error("GitHub Pages environment: skip API fetch");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const response = await fetch("/api/market-data", {
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  if (!response.ok) throw new Error(`market api ${response.status}`);

  const payload = (await response.json()) as MarketDataPayload;
  const indices = payload.indices?.filter(isValidIndex) ?? [];
  if (indices.length < 2) throw new Error("market data unavailable");
  const macroAssets = payload.macroAssets?.filter(isValidIndex) ?? [];
  const extraIndices = payload.extraIndices?.filter(isValidIndex) ?? [];

  return {
    indices,
    macroAssets: macroAssets.length ? macroAssets : defaultMacroAssets,
    extraIndices,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
    source: payload.source ?? "live",
  };
};

const loadCachedMarketData = () => {
  try {
    const raw = localStorage.getItem(MARKET_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as MarketDataPayload;
    const indices = parsed.indices?.filter(isValidIndex) ?? [];
    const macroAssets = parsed.macroAssets?.filter(isValidIndex) ?? [];
    const extraIndices = parsed.extraIndices?.filter(isValidIndex) ?? [];
    return indices.length
      ? {
          indices,
          macroAssets: macroAssets.length ? macroAssets : defaultMacroAssets,
          extraIndices,
          updatedAt: parsed.updatedAt ?? "",
          source: "cache" as const,
        }
      : undefined;
  } catch {
    return undefined;
  }
};

export const useLiveMarketData = (fallbackIndices: MarketIndex[]) => {
  const initialMarketData = loadCachedMarketData() ?? {
    indices: fallbackIndices,
    macroAssets: defaultMacroAssets,
    extraIndices: [] as MarketIndex[],
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
    refetchIntervalInBackground: false,
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
  const displayMacroAssets = query.data?.macroAssets?.length
    ? query.data.macroAssets
    : defaultMacroAssets;
  const displayExtraIndices = query.data?.extraIndices ?? [];
  const source = query.data?.source ?? "fallback";

  return {
    indices: displayIndices,
    macroAssets: displayMacroAssets,
    extraIndices: displayExtraIndices,
    status: source === "live" ? "live" : source === "cache" ? "cached" : "fallback",
    updatedAt: query.data?.updatedAt,
  } satisfies {
    indices: MarketIndex[];
    macroAssets: MarketIndex[];
    extraIndices: MarketIndex[];
    status: LiveMarketStatus;
    updatedAt?: string;
  };
};
