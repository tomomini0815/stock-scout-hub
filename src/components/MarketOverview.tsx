import { type MarketIndex } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { AlertTriangle, Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface MarketOverviewProps {
  indices: MarketIndex[];
}

type MarketDriverStatus = "loading" | "live" | "fallback";

interface MarketDriverNews {
  title: string;
  source: string;
}

interface MarketDriverCache {
  items: MarketDriverNews[];
  updatedAt: string;
}

const MARKET_DRIVER_CACHE_KEY = "stock-scout-market-drivers-v1";
const MARKET_DRIVER_CACHE_MS = 1000 * 60 * 20;

const driverFallbackNews: MarketDriverNews[] = [
  { title: "日本株は為替、米金利、海外株、半導体関連の動きをにらみながら推移", source: "市況推定" },
  { title: "日経平均は値がさ株、TOPIXは銀行・自動車など主力株の広がりを確認", source: "市況推定" },
  { title: "米国株とドル円の方向感が短期の指数材料として意識されやすい展開", source: "市況推定" },
];

const decodeHtml = (value: string) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const loadCachedDrivers = () => {
  try {
    const raw = localStorage.getItem(MARKET_DRIVER_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as MarketDriverCache;
    const items = parsed.items?.filter((item) => item.title) ?? [];
    if (!items.length) return undefined;
    return { items, updatedAt: parsed.updatedAt };
  } catch {
    return undefined;
  }
};

const saveCachedDrivers = (items: MarketDriverNews[]) => {
  try {
    localStorage.setItem(
      MARKET_DRIVER_CACHE_KEY,
      JSON.stringify({ items, updatedAt: new Date().toISOString() } satisfies MarketDriverCache)
    );
  } catch {
    // News drivers are an enhancement only.
  }
};

const mapRssTitles = (xmlText: string, fallbackSource: string) => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  return Array.from(doc.querySelectorAll("item"))
    .map((item) => ({
      title: decodeHtml(item.querySelector("title")?.textContent?.replace(/\s+-\s+[^-]+$/, "").trim() ?? ""),
      source: item.querySelector("source")?.textContent?.trim() || fallbackSource,
    }))
    .filter((item) => item.title);
};

const getIndexPatterns = (name: string) => {
  if (/日経/.test(name)) return [/日経平均|日本株|東京株|東証|半導体|AI|先物|円|ドル|米株|ナスダック/];
  if (/TOPIX/.test(name)) return [/TOPIX|東証|日本株|銀行|自動車|内需|円|金利|日銀/];
  if (/ダウ/.test(name)) return [/ダウ|NY株|米国株|米景気|金利|FOMC|FRB/];
  if (/NASDAQ|S&P/.test(name)) return [/ナスダック|NASDAQ|S&P|米国株|AI|半導体|金利|FOMC|FRB/];
  if (/USD|JPY|ドル|円/.test(name)) return [/円|ドル|為替|日銀|FRB|金利|介入/];
  if (/GOLD|金/.test(name)) return [/金|ゴールド|金利|ドル|地政学|インフレ/];
  if (/BTC|ビットコイン/.test(name)) return [/ビットコイン|BTC|暗号資産|仮想通貨|ETF|リスク資産/];
  return [/市場|相場|株価|金利|為替|海外/];
};

const inferDriverText = (index: MarketIndex, news: MarketDriverNews[]) => {
  const patterns = getIndexPatterns(index.name);
  const matched = news.find((item) => patterns.some((pattern) => pattern.test(item.title))) ?? news[0];
  const direction = index.changePercent > 0 ? "上昇" : index.changePercent < 0 ? "下落" : "横ばい";
  const magnitude = Math.abs(index.changePercent);
  const strength = magnitude >= 1.5 ? "急" : magnitude >= 0.7 ? "やや大きく" : "小幅に";

  if (!matched) {
    return `${strength}${direction}。為替、金利、海外市場、先物、指数寄与度の高い銘柄を確認。`;
  }

  const reason = /円|ドル|為替|日銀|FRB|金利/.test(matched.title)
    ? "為替・金利"
    : /半導体|AI|ナスダック|NASDAQ/.test(matched.title)
      ? "半導体・米ハイテク"
      : /ダウ|米国株|NY株|S&P/.test(matched.title)
        ? "海外株"
        : /銀行|自動車|内需/.test(matched.title)
          ? "主力セクター"
          : /金|ゴールド|BTC|ビットコイン|暗号資産/.test(matched.title)
            ? "リスク資産・商品"
            : "市況";

  return `${strength}${direction}。主な材料: ${reason}。「${matched.title}」`;
};

const getMoveLabel = (changePercent: number) => {
  const magnitude = Math.abs(changePercent);
  if (magnitude >= 1.5) return changePercent > 0 ? "急騰材料" : "急落材料";
  if (magnitude >= 0.7) return changePercent > 0 ? "上昇材料" : "下落材料";
  return "小動き";
};

const MarketOverview = ({ indices }: MarketOverviewProps) => {
  const cachedDrivers = loadCachedDrivers();
  const [driverNews, setDriverNews] = useState<MarketDriverNews[]>(cachedDrivers?.items ?? []);
  const [driverStatus, setDriverStatus] = useState<MarketDriverStatus>(cachedDrivers ? "live" : "loading");
  const {
    indices: displayIndices,
    status,
    updatedAt,
  } = useLiveMarketData(indices);
  const marketDrivers = useMemo(
    () => displayIndices.map((index) => [index.name, inferDriverText(index, driverNews.length ? driverNews : driverFallbackNews)] as const),
    [displayIndices, driverNews]
  );
  const marketDriverByName = new Map(marketDrivers);

  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  useEffect(() => {
    const cached = loadCachedDrivers();
    if (cached && Date.now() - Date.parse(cached.updatedAt) < MARKET_DRIVER_CACHE_MS) {
      setDriverNews(cached.items);
      setDriverStatus("live");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    const loadDrivers = async () => {
      try {
        const googleParams = new URLSearchParams({
          q: "日経平均 OR TOPIX OR 日本株 OR 米国株 OR 為替 OR 金利 OR 半導体 when:2d",
          hl: "ja",
          gl: "JP",
          ceid: "JP:ja",
        });
        const fetchText = async (url: string) => {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        };
        const results = await Promise.allSettled([
          fetchText(`/api/google-news?${googleParams.toString()}`).then((text) => mapRssTitles(text, "Google News")),
          fetchText("/api/yahoo-business-rss").then((text) => mapRssTitles(text, "Yahoo!ニュース")),
        ]);
        const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
        const uniqueItems = items.filter(
          (item, index, list) => list.findIndex((entry) => entry.title === item.title) === index
        ).slice(0, 18);

        if (!uniqueItems.length) throw new Error("market driver news unavailable");
        setDriverNews(uniqueItems);
        setDriverStatus("live");
        saveCachedDrivers(uniqueItems);
      } catch {
        if (!controller.signal.aborted) {
          setDriverNews(cached?.items ?? driverFallbackNews);
          setDriverStatus(cached?.items?.length ? "live" : "fallback");
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    loadDrivers();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
        <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
          <Newspaper className="h-3.5 w-3.5 text-primary" />
          主要指数
        </h3>
        <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
            {updatedLabel ? `更新 ${updatedLabel}` : status === "cached" ? "前回値" : "更新確認中"}
          </span>
          <span className="hidden rounded bg-muted px-1.5 py-0.5 text-muted-foreground sm:inline">
            {driverStatus === "loading" ? "材料取得中" : driverStatus === "live" ? "材料反映" : "推定材料"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
        {displayIndices.map((index, i) => {
          const isUp = index.change > 0;
          const isDown = index.change < 0;
          return (
            <div
              key={index.name}
              className={`border-b border-r border-border p-2.5 transition-colors hover:bg-muted/50 ${
                i % 2 === 0 ? "" : ""
              }`}
            >
              <div className="mb-1 text-xxs font-medium text-muted-foreground">
                {index.name}
              </div>
              <div className="mb-0.5 text-sm font-bold tabular-nums text-foreground">
                {index.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={`flex items-center gap-1 text-xxs font-semibold tabular-nums ${
                  isUp
                    ? "text-stock-up"
                    : isDown
                    ? "text-stock-down"
                    : "text-stock-unchanged"
                }`}
              >
                {isUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : isDown ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>
                  {isUp ? "+" : ""}
                  {index.change.toFixed(2)}
                </span>
                <span>
                  ({isUp ? "+" : ""}
                  {index.changePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="mt-2 rounded border border-border/70 bg-muted/30 px-2 py-1.5">
                <div className="mb-1 flex items-center gap-1 text-xxs font-bold text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  {getMoveLabel(index.changePercent)}
                </div>
                <p className="line-clamp-2 text-xxs leading-relaxed text-foreground">
                  {marketDriverByName.get(index.name)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketOverview;
