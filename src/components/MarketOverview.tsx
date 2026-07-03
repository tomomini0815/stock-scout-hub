import { type MarketIndex } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import TradingViewQuadPanel from "@/components/TradingViewQuadPanel";
import { AlertTriangle, LayoutGrid, Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface MarketOverviewProps {
  indices: MarketIndex[];
}

type MarketDriverStatus = "loading" | "live" | "fallback";
type UrgentDriverStatus = "checking" | "ready" | "unknown";

interface MarketDriverNews {
  title: string;
  source: string;
  publishedAt?: string;
}

interface MarketDriverCache {
  items: MarketDriverNews[];
  updatedAt: string;
}

const MARKET_DRIVER_CACHE_KEY = "stock-scout-market-drivers-v1";
const MARKET_DRIVER_CACHE_MS = 1000 * 60 * 20;
const URGENT_MOVE_THRESHOLD = 1.5;
const URGENT_NEWS_MAX_AGE_MS = 1000 * 60 * 60 * 24;

const indexChartConfigs = [
  { id: "nikkei", name: "日経平均", symbol: "OANDA:JP225USD" },
  { id: "topix", name: "TOPIX先物", symbol: "OSE:TOPIX1!" },
  { id: "dow", name: "NYダウ", symbol: "OANDA:US30USD" },
  { id: "nasdaq", name: "NASDAQ", symbol: "OANDA:NAS100USD" },
  { id: "sp500", name: "S&P500", symbol: "OANDA:SPX500USD" },
  { id: "usdjpy", name: "USD/JPY", symbol: "FX:USDJPY" },
  { id: "gold", name: "GOLD", symbol: "TVC:GOLD" },
  { id: "btc", name: "BTC/USDT", symbol: "BINANCE:BTCUSDT" },
];

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
      publishedAt: item.querySelector("pubDate")?.textContent?.trim() || undefined,
    }))
    .filter((item) => item.title);
};

const getIndexPatterns = (name: string) => {
  if (/日経/.test(name)) return [/日経平均|日本株|東京株|東証|半導体|AI|先物|円|ドル|米株|ナスダック/];
  if (/TOPIX/.test(name)) return [/TOPIX|東証|日本株|銀行|自動車|内需|円|金利|日銀/];
  if (/ダウ/.test(name)) return [/ダウ|NY株|米国株|米景気|金利|FOMC|FRB/];
  if (/NASDAQ|S&P/.test(name)) return [/ナスダック|NASDAQ|S&P|米国株|AI|半導体|金利|FOMC|FRB/];
  if (/BTC|ビットコイン/.test(name)) return [/ビットコイン|BTC|暗号資産|仮想通貨|ETF|リスク資産/];
  if (/USD|JPY|ドル|円/.test(name)) return [/円|ドル|為替|日銀|FRB|金利|介入/];
  if (/GOLD|金/.test(name)) return [/金|ゴールド|金利|ドル|地政学|インフレ/];
  return [/市場|相場|株価|金利|為替|海外/];
};

const scoreDriverMatch = (indexName: string, title: string) => {
  if (/ロト|宝くじ|当せん|当選|1等|抽せん/.test(title)) return 0;
  if (/BTC|ビットコイン/.test(indexName)) {
    return /ビットコイン|BTC|暗号資産|仮想通貨|ETF|リスク資産/.test(title) ? 8 : 0;
  }

  const patterns = getIndexPatterns(indexName);
  let score = patterns.some((pattern) => pattern.test(title)) ? 3 : 0;

  if (/日経/.test(indexName) && /日経平均|日本株|東京株|東証|半導体|先物/.test(title)) score += 4;
  if (/TOPIX/.test(indexName) && /TOPIX|東証|日本株|銀行|自動車|内需/.test(title)) score += 4;
  if (/ダウ/.test(indexName) && /ダウ|NY株|米国株|米景気/.test(title)) score += 4;
  if (/NASDAQ|S&P/.test(indexName) && /ナスダック|NASDAQ|S&P|米国株|AI|半導体/.test(title)) score += 4;
  if (/USD|JPY|ドル|円/.test(indexName) && /円|ドル|為替|日銀|FRB|金利|介入/.test(title)) score += 5;
  if (/GOLD|金/.test(indexName) && /金|ゴールド|金利|ドル|地政学|インフレ/.test(title)) score += 5;

  return score;
};

const isFreshDriverNews = (item: MarketDriverNews) => {
  if (!item.publishedAt) return true;
  const publishedTime = Date.parse(item.publishedAt);
  if (!Number.isFinite(publishedTime)) return true;
  return Date.now() - publishedTime <= URGENT_NEWS_MAX_AGE_MS;
};

const buildDriverReason = (title: string) =>
  /円|ドル|為替|日銀|FRB|金利/.test(title)
    ? "為替・金利"
    : /半導体|AI|ナスダック|NASDAQ/.test(title)
      ? "半導体・米ハイテク"
      : /ダウ|米国株|NY株|S&P/.test(title)
        ? "海外株"
        : /銀行|自動車|内需/.test(title)
          ? "主力セクター"
          : /金|ゴールド|BTC|ビットコイン|暗号資産/.test(title)
          ? "リスク資産・商品"
            : "市況";

const getMovePhrase = (changePercent: number) => {
  const direction = changePercent > 0 ? "上昇" : changePercent < 0 ? "下落" : "横ばい";
  const magnitude = Math.abs(changePercent);
  const strength = magnitude >= 1.5 ? "急" : magnitude >= 0.7 ? "やや大きく" : "小幅に";
  return `${strength}${direction}`;
};

const getFallbackDriverFocus = (index: MarketIndex) => {
  const isUp = index.changePercent >= 0;

  if (/日経/.test(index.name)) {
    return isUp
      ? "米株先物、ドル円、半導体・値がさ株の買いが日経平均を押し上げているか確認。"
      : "米ハイテク株、円高、半導体・値がさ株の売りが日経平均の重荷になっているか確認。";
  }
  if (/TOPIX/.test(index.name)) {
    return isUp
      ? "銀行、自動車、商社など主力バリュー株への買いが広がっているか確認。"
      : "内需・金融・自動車など幅広い主力株の売り、金利低下や円高の影響を確認。";
  }
  if (/ダウ/.test(index.name)) {
    return isUp
      ? "米景気敏感株、長期金利の落ち着き、企業決算への買い反応を確認。"
      : "米景気懸念、長期金利上昇、景気敏感株の売りが重荷か確認。";
  }
  if (/NASDAQ/.test(index.name)) {
    return isUp
      ? "AI・半導体、メガテック決算、米長期金利低下が買い材料か確認。"
      : "米長期金利上昇、AI・半導体株の利益確定、メガテック売りを確認。";
  }
  if (/S&P/.test(index.name)) {
    return isUp
      ? "米大型株全体のリスク選好、決算、金利低下が追い風か確認。"
      : "米大型株の広範な売り、金利・景気指標・決算反応を確認。";
  }
  if (/BTC|ビットコイン/.test(index.name)) {
    return isUp
      ? "ETFフロー、米金利低下、リスク資産への買い戻しを確認。"
      : "ETF資金流出、米金利上昇、リスク資産の利益確定売りを確認。";
  }
  if (/USD|JPY|ドル|円/.test(index.name)) {
    return isUp
      ? "ドル高・円安方向。日米金利差、FRB発言、日銀観測を確認。"
      : "ドル安・円高方向。米金利低下、日銀正常化観測、介入警戒を確認。";
  }
  if (/GOLD|金/.test(index.name)) {
    return isUp
      ? "米実質金利低下、ドル安、地政学リスク、インフレ警戒を確認。"
      : "米実質金利上昇、ドル高、リスク選好回復による金売りを確認。";
  }
  return "為替、金利、海外市場、先物、関連セクターの動きを確認。";
};

const inferDriverText = (index: MarketIndex, news: MarketDriverNews[], usedTitles: Set<string>) => {
  const candidates = news
    .map((item) => ({
      item,
      score: scoreDriverMatch(index.name, item.title),
      isUsed: usedTitles.has(item.title),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
      return b.score - a.score;
    });
  const matched = candidates[0]?.score >= 4 ? candidates[0].item : undefined;
  const movePhrase = getMovePhrase(index.changePercent);

  if (!matched) {
    return `${movePhrase}。主な確認材料: ${getFallbackDriverFocus(index)}`;
  }

  usedTitles.add(matched.title);

  const reason = buildDriverReason(matched.title);
  const source = matched.source ? `${matched.source}: ` : "";

  return `${movePhrase}。材料: ${reason}。${source}${matched.title}`;
};

const getIndexQuery = (name: string) => {
  if (/日経/.test(name)) return "日経平均 OR 日本株 OR 東京株式市場";
  if (/TOPIX/.test(name)) return "TOPIX OR 東証株価指数 OR 日本株";
  if (/ダウ/.test(name)) return "NYダウ OR ダウ平均 OR 米国株";
  if (/NASDAQ/.test(name)) return "NASDAQ OR ナスダック OR 米ハイテク株";
  if (/S&P/.test(name)) return "S&P500 OR 米国株";
  if (/BTC|ビットコイン/.test(name)) return "ビットコイン OR BTC OR 暗号資産";
  if (/USD|JPY|ドル|円/.test(name)) return "ドル円 OR 為替 OR 円相場";
  if (/GOLD|金/.test(name)) return "金価格 OR ゴールド OR 金先物";
  return `${name} 市況`;
};

const buildUrgentQuery = (index: MarketIndex) => {
  const directionTerms = index.changePercent > 0
    ? "上昇 OR 急騰 OR 買い材料 OR 反発"
    : "下落 OR 急落 OR 売り材料 OR 反落";
  return `(${getIndexQuery(index.name)}) (${directionTerms}) when:1d`;
};

const buildUrgentDriverText = (index: MarketIndex, items: MarketDriverNews[]) => {
  const candidates = items
    .filter(isFreshDriverNews)
    .map((item) => ({ item, score: scoreDriverMatch(index.name, item.title) }))
    .filter((candidate) => candidate.score >= 4)
    .sort((a, b) => b.score - a.score);
  const matched = candidates[0]?.item;
  const direction = index.changePercent > 0 ? "急騰" : "急落";

  if (!matched) {
    return `${direction}検知。主な確認材料: ${getFallbackDriverFocus(index)}`;
  }

  return `${direction}検知。材料: ${buildDriverReason(matched.title)}。${matched.source ? `${matched.source}: ` : ""}${matched.title}`;
};

const buildMarketDriverMap = (indices: MarketIndex[], news: MarketDriverNews[]) => {
  const usedTitles = new Set<string>();
  return new Map(
    indices.map((index) => [
      index.name,
      inferDriverText(index, news.length ? news : driverFallbackNews, usedTitles),
    ])
  );
};

const getMoveLabel = (changePercent: number) => {
  const magnitude = Math.abs(changePercent);
  if (magnitude >= 1.5) return changePercent > 0 ? "急騰材料" : "急落材料";
  if (magnitude >= 0.7) return changePercent > 0 ? "上昇材料" : "下落材料";
  return "小動き";
};

const isUrgentMove = (changePercent: number) => Math.abs(changePercent) >= URGENT_MOVE_THRESHOLD;

const getDriverPanelClass = (changePercent: number) => {
  const magnitude = Math.abs(changePercent);
  if (magnitude >= 1.5 && changePercent > 0) return "border-red-200 bg-red-100/45";
  if (magnitude >= 1.5 && changePercent < 0) return "border-blue-200 bg-blue-100/45";
  if (magnitude >= 0.7 && changePercent > 0) return "border-red-200/80 bg-red-100/35";
  if (magnitude >= 0.7 && changePercent < 0) return "border-blue-200/80 bg-blue-100/35";
  return "border-slate-300/70 bg-slate-100/50";
};

const ClampedDriverText = ({ text }: { text?: string }) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const updateClamped = () => {
      setIsClamped(element.scrollHeight > element.clientHeight + 1);
    };

    updateClamped();
    const resizeObserver = new ResizeObserver(updateClamped);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateClamped);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateClamped);
    };
  }, [text]);

  return (
    <>
      <p ref={textRef} className="line-clamp-2 text-xxs leading-relaxed text-foreground">
        {text}
      </p>
      {isClamped && (
        <div className="pointer-events-none absolute left-2 right-2 top-full z-30 mt-1 hidden rounded border border-border bg-popover px-2 py-1.5 text-xxs leading-relaxed text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
          {text}
        </div>
      )}
    </>
  );
};

const MarketOverview = ({ indices }: MarketOverviewProps) => {
  const cachedDrivers = loadCachedDrivers();
  const [showIndexCharts, setShowIndexCharts] = useState(false);
  const [isMobileChartViewport, setIsMobileChartViewport] = useState(false);
  const [mobileDrawingToolsOpen, setMobileDrawingToolsOpen] = useState(false);
  const [driverNews, setDriverNews] = useState<MarketDriverNews[]>(cachedDrivers?.items ?? []);
  const [driverStatus, setDriverStatus] = useState<MarketDriverStatus>(cachedDrivers ? "live" : "loading");
  const [urgentDrivers, setUrgentDrivers] = useState<Record<string, { status: UrgentDriverStatus; text: string }>>({});
  const {
    indices: displayIndices,
    status,
    updatedAt,
  } = useLiveMarketData(indices);
  const marketDriverByName = useMemo(
    () => buildMarketDriverMap(displayIndices, driverNews),
    [displayIndices, driverNews]
  );

  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileChartViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

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

  useEffect(() => {
    const urgentIndices = displayIndices.filter((index) => Math.abs(index.changePercent) >= URGENT_MOVE_THRESHOLD);
    if (!urgentIndices.length) {
      setUrgentDrivers({});
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const urgentKeys = new Set(urgentIndices.map((index) => index.name));

    setUrgentDrivers((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([name]) => urgentKeys.has(name))
      ) as Record<string, { status: UrgentDriverStatus; text: string }>;
      urgentIndices.forEach((index) => {
        next[index.name] = next[index.name] ?? {
          status: "checking",
          text: `${index.changePercent > 0 ? "急騰" : "急落"}検知。直近材料を確認中。`,
        };
      });
      return next;
    });

    const fetchText = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    };

    const loadUrgentDrivers = async () => {
      const entries = await Promise.all(
        urgentIndices.map(async (index) => {
          try {
            const params = new URLSearchParams({
              q: buildUrgentQuery(index),
              hl: "ja",
              gl: "JP",
              ceid: "JP:ja",
              ts: String(Date.now()),
            });
            const text = await fetchText(`/api/google-news?${params.toString()}`);
            const items = mapRssTitles(text, "Google News");
            return [
              index.name,
              {
                status: "ready" as const,
                text: buildUrgentDriverText(index, items),
              },
            ] as const;
          } catch {
            return [
              index.name,
              {
                status: "unknown" as const,
                text: `${index.changePercent > 0 ? "急騰" : "急落"}検知。材料ニュースを取得できません。先物、為替、金利を確認中。`,
              },
            ] as const;
          }
        })
      );

      if (!controller.signal.aborted) {
        setUrgentDrivers((current) => ({ ...current, ...Object.fromEntries(entries) }));
      }
    };

    loadUrgentDrivers().finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [displayIndices]);

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
            <Newspaper className="h-3.5 w-3.5 text-primary" />
            主要指数
          </h3>
          <button
            type="button"
            onClick={() => setShowIndexCharts((value) => !value)}
            className={`inline-flex h-7 items-center justify-center gap-1 rounded border px-2 text-xxs font-bold transition-colors ${
              showIndexCharts
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-primary hover:bg-muted"
            }`}
            aria-label={showIndexCharts ? "各チャート表示を閉じる" : "各チャート表示を開く"}
            title={showIndexCharts ? "チャートを閉じる" : "主要指数チャート"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>各チャート表示</span>
          </button>
        </div>
        <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
          <span className="hidden rounded bg-muted px-1.5 py-0.5 text-muted-foreground sm:inline">
            {driverStatus === "loading" ? "材料取得中" : driverStatus === "live" ? "材料反映" : "推定材料"}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
              status === "live"
                ? "border border-red-600 bg-white text-red-600"
                : "bg-muted text-muted-foreground"
            }`}
            title={updatedLabel ? `更新 ${updatedLabel}` : undefined}
          >
            {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
            {status === "live" ? "LIVE" : status === "cached" ? "前回値" : "確認中"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
        {displayIndices.map((index, i) => {
          const isUp = index.change > 0;
          const isDown = index.change < 0;
          const urgentMove = isUrgentMove(index.changePercent);
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
              <div className={`group relative mt-2 rounded border px-2 py-1.5 ${getDriverPanelClass(index.changePercent)}`}>
                <div className="mb-1 flex items-center gap-1 text-xxs font-bold text-muted-foreground">
                  {urgentMove && <AlertTriangle className="h-3 w-3" />}
                  {getMoveLabel(index.changePercent)}
                </div>
                <ClampedDriverText text={urgentDrivers[index.name]?.text ?? marketDriverByName.get(index.name)} />
              </div>
            </div>
          );
        })}
      </div>
      {showIndexCharts && (
        <div className="border-t border-border bg-background p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="text-xs font-bold text-foreground">主要指数チャート 8分割</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileDrawingToolsOpen((value) => !value)}
                className="inline-flex h-7 items-center rounded border border-border bg-card px-2 text-xxs font-bold text-primary md:hidden"
              >
                {mobileDrawingToolsOpen ? "描画ツールを隠す" : "描画ツールを表示"}
              </button>
              <div className="text-xxs font-semibold text-muted-foreground">TradingView / MA200 / BB3σ</div>
            </div>
          </div>
          <TradingViewQuadPanel
            symbols={indexChartConfigs}
            drawingEnabled={isMobileChartViewport ? mobileDrawingToolsOpen : true}
          />
        </div>
      )}
    </div>
  );
};

export default MarketOverview;
