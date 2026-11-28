import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import MoneyFlowNewsSection from "@/components/MoneyFlowNewsSection";
import { marketIndices, type NewsItem } from "@/data/stockData";
import { normalizeArticleSummaryToJapanese, translateEnglishNewsTitle } from "@/lib/newsTranslation";
import { Newspaper, ExternalLink } from "lucide-react";

const categories = ["すべて", "市況", "半導体", "AI", "金融", "個別株", "投資戦略"];
const NEWS_CACHE_KEY = "stock-scout-live-news-v2";
const NEWS_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
type ArticleSummaryState =
  | { status: "loading"; summary?: string }
  | { status: "ready"; summary: string }
  | { status: "error"; summary?: string };

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  sourcecountry: string;
}

interface NewsSourceSummary {
  provider: string;
  count: number;
  status: "live" | "missing-key" | "empty" | "error";
}

interface NewsApiArticle {
  title?: string;
  url?: string;
  publishedAt?: string;
  description?: string;
  source?: {
    name?: string;
  };
}

interface FinnhubArticle {
  headline?: string;
  url?: string;
  datetime?: number;
  summary?: string;
  source?: string;
}

interface MarketauxArticle {
  title?: string;
  url?: string;
  published_at?: string;
  description?: string;
  source?: string;
}

const formatGdeltDateTime = (seenDate: string) => {
  const normalized = seenDate.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z"
  );
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  return {
    date: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
};

const inferCategory = (title: string) => {
  if (/半導体|AI|人工知能|エヌビディア|NVIDIA|Micron|メモリ|メモリー|東京エレクトロン|アドバンテスト|ディスコ/.test(title)) {
    return /AI|人工知能|NVIDIA|エヌビディア/.test(title) ? "AI" : "半導体";
  }
  if (/円|為替|金利|日銀|銀行|金融|ドル/.test(title)) return "金融";
  if (/決算|業績|上方修正|下方修正|買収|提携|株式分割/.test(title)) return "個別株";
  if (/投資|相場|見通し|戦略|リスク/.test(title)) return "投資戦略";
  return "市況";
};

const buildSummary = (title: string, category: string, source: string) => {
  const base = title.replace(/\s+/g, " ").trim();
  if (category === "半導体" || category === "AI") {
    return `${base}。AI・半導体関連の需給や投資テーマに関わるニュースとして、関連銘柄の物色動向を確認したい材料です。`;
  }
  if (category === "金融") {
    return `${base}。為替、金利、金融株への影響を確認したいニュースです。出典は${source}です。`;
  }
  if (category === "個別株") {
    return `${base}。個別企業の業績・資本政策・事業戦略に関わる可能性があり、該当銘柄の値動きに注意が必要です。`;
  }
  return `${base}。日本株全体の地合い、日経平均、東証上場銘柄への波及を確認したいニュースです。`;
};

const looksMojibake = (value = "") => {
  const replacementCount = (value.match(/�/g) ?? []).length;
  const mojibakeRunCount = (value.match(/[ÂÃã�]{2,}|(?:ã.|æ.|ç.|å.){2,}/g) ?? []).length;
  return replacementCount >= 2 || mojibakeRunCount >= 2;
};

const formatDateTime = (value: string | number | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  return {
    date: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
};

const mapGdeltArticles = (articles: GdeltArticle[]): NewsItem[] => {
  const seen = new Set<string>();
  return articles
    .filter((article) => article.url && article.title && !seen.has(article.url) && seen.add(article.url))
    .slice(0, 20)
    .map((article, index) => {
      const { date, time } = formatGdeltDateTime(article.seendate);
      const title = translateEnglishNewsTitle(article.title);
      const category = inferCategory(title);
      const source = article.domain.replace(/^www\./, "");

      return {
        id: index + 1,
        date,
        time,
        title,
        category,
        source,
        provider: "GDELT",
        url: article.url,
        summary: "",
        isHot: index < 3,
        isNew: index < 2,
      };
    });
};

const mapRssNews = (xmlText: string, provider: string, fallbackSource: string, limit = 24): NewsItem[] => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const items = Array.from(doc.querySelectorAll("item"));

  return items.slice(0, limit).map((item, index) => {
    const rawTitle = item.querySelector("title")?.textContent ?? "";
    const source = item.querySelector("source")?.textContent ?? fallbackSource;
    const url = item.querySelector("link")?.textContent ?? "";
    const pubDate = item.querySelector("pubDate")?.textContent ?? "";
    const rawDescription = item.querySelector("description")?.textContent ?? "";
    const cleanedDesc = rawDescription
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const formatted = formatDateTime(pubDate);
    const title = translateEnglishNewsTitle(rawTitle.replace(/\s+-\s+[^-]+$/, "").trim());
    const category = inferCategory(title);
    const hasUsefulDesc =
      cleanedDesc.length >= 35 &&
      !cleanedDesc.startsWith(title.slice(0, 18)) &&
      !/Google ニュース|Yahoo!ニュースは/.test(cleanedDesc);

    return {
      id: index + 1,
      date: formatted.date,
      time: formatted.time,
      title,
      category,
      source,
      provider,
      url,
      summary: hasUsefulDesc ? cleanedDesc : "",
      isHot: index < 3,
      isNew: index < 2,
    };
  });
};

const mapNewsApiArticles = (articles: NewsApiArticle[]): NewsItem[] =>
  articles
    .filter((article) => article.title && article.url)
    .slice(0, 24)
    .map((article, index) => {
      const title = translateEnglishNewsTitle(article.title?.trim() ?? "");
      const source = article.source?.name ?? "NewsAPI";
      const category = inferCategory(title);
      const formatted = formatDateTime(article.publishedAt ?? "");

      return {
        id: index + 1,
        date: formatted.date,
        time: formatted.time,
        title,
        category,
        source,
        provider: "NewsAPI",
        url: article.url,
        summary: normalizeArticleSummaryToJapanese(article.description ?? "", {
          id: index + 1,
          title,
          category,
          source,
          provider: "NewsAPI",
          url: article.url,
        } as NewsItem, buildSummary) || buildSummary(title, category, source),
        isHot: index < 3,
        isNew: index < 2,
      };
    });

const mapFinnhubArticles = (articles: FinnhubArticle[]): NewsItem[] =>
  articles
    .filter((article) => article.headline && article.url)
    .slice(0, 24)
    .map((article, index) => {
      const title = translateEnglishNewsTitle(article.headline?.trim() ?? "");
      const source = article.source || "Finnhub";
      const category = inferCategory(title);
      const formatted = formatDateTime(article.datetime ? article.datetime * 1000 : "");

      return {
        id: index + 1,
        date: formatted.date,
        time: formatted.time,
        title,
        category,
        source,
        provider: "Finnhub",
        url: article.url,
        summary: normalizeArticleSummaryToJapanese(article.summary ?? "", {
          id: index + 1,
          title,
          category,
          source,
          provider: "Finnhub",
          url: article.url,
        } as NewsItem, buildSummary) || buildSummary(title, category, source),
        isHot: index < 3,
        isNew: index < 2,
      };
    });

const mapMarketauxArticles = (articles: MarketauxArticle[]): NewsItem[] =>
  articles
    .filter((article) => article.title && article.url)
    .slice(0, 24)
    .map((article, index) => {
      const title = translateEnglishNewsTitle(article.title?.trim() ?? "");
      const source = article.source || "Marketaux";
      const category = inferCategory(title);
      const formatted = formatDateTime(article.published_at ?? "");

      return {
        id: index + 1,
        date: formatted.date,
        time: formatted.time,
        title,
        category,
        source,
        provider: "Marketaux",
        url: article.url,
        summary: normalizeArticleSummaryToJapanese(article.description ?? "", {
          id: index + 1,
          title,
          category,
          source,
          provider: "Marketaux",
          url: article.url,
        } as NewsItem, buildSummary) || buildSummary(title, category, source),
        isHot: index < 3,
        isNew: index < 2,
      };
    });

const normalizeNewsKey = (value = "") =>
  value
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\s+/g, "");

const mergeNewsItems = (items: NewsItem[]) => {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.url ? normalizeNewsKey(item.url) : normalizeNewsKey(item.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const left = new Date(`${a.date ?? ""} ${a.time ?? ""}`).getTime();
      const right = new Date(`${b.date ?? ""} ${b.time ?? ""}`).getTime();
      if (Number.isNaN(left) || Number.isNaN(right)) return 0;
      return right - left;
    })
    .slice(0, 120)
    .map((item, index) => ({
      ...item,
      id: index + 1,
      isHot: index < 5,
      isNew: index < 3,
    }));
};

const loadCachedNews = () => {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; news: NewsItem[] };
    if (!parsed.news?.length || Date.now() - parsed.savedAt > NEWS_CACHE_MS) return null;
    return parsed.news;
  } catch {
    return null;
  }
};

const saveCachedNews = (news: NewsItem[]) => {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), news }));
  } catch {
    // Cache failure should not block the news page.
  }
};

const NewsPage = () => {
  const cachedNews = useMemo(() => loadCachedNews(), []);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [liveNews, setLiveNews] = useState<NewsItem[]>(() => cachedNews ?? []);
  const [status, setStatus] = useState<"loading" | "live" | "cached" | "fallback">(
    cachedNews ? "cached" : "loading"
  );
  const [lastUpdated, setLastUpdated] = useState("");
  const [sourceSummary, setSourceSummary] = useState<NewsSourceSummary[]>([]);
  const [articleSummaries, setArticleSummaries] = useState<Record<string, ArticleSummaryState>>({});

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    const timeout = window.setTimeout(() => controller.abort(), 18000);

    const fetchJson = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };

    const fetchText = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    };

    const fetchLiveNews = async () => {
      const rssParams = new URLSearchParams({
        q: "日本株 OR 日経平均 OR 東証 OR 半導体 OR AI OR 為替 OR 金利 when:30d",
        hl: "ja",
        gl: "JP",
        ceid: "JP:ja",
      });
      const gdeltParams = new URLSearchParams({
        query: "(Japan stocks OR Nikkei OR Tokyo Stock Exchange OR Japanese shares OR semiconductor OR AI OR yen OR Bank of Japan) sourceCountry:JA",
        mode: "artlist",
        format: "json",
        maxrecords: "80",
        sort: "hybrid",
        timespan: "30d",
      });
      const newsApiParams = new URLSearchParams({
        q: "日本株 OR 日経平均 OR 東証 OR 半導体 OR AI OR 為替 OR 金利",
        pageSize: "50",
      });
      const marketauxParams = new URLSearchParams({
        search: "Japan stocks Nikkei Tokyo Stock Exchange semiconductor AI yen Bank of Japan",
        limit: "50",
      });

      const sources = [
        {
          provider: "Google News RSS",
          load: async () => ({
            news: mapRssNews(await fetchText(`/api/news-feeds?source=google&${rssParams.toString()}`), "Google News RSS", "Google News"),
          }),
        },
        {
          provider: "Yahoo!ニュースRSS",
          load: async () => ({
            news: mapRssNews(await fetchText("/api/news-feeds?source=yahoo"), "Yahoo!ニュースRSS", "Yahoo!ニュース", 30),
          }),
        },
        {
          provider: "GDELT",
          load: async () => {
            const gdeltSearchParams = new URLSearchParams(gdeltParams.toString());
            gdeltSearchParams.set("source", "gdelt");
            const payload = await fetchJson(`/api/news-feeds?${gdeltSearchParams.toString()}`);
            return { news: mapGdeltArticles(payload.articles ?? []) };
          },
        },
        {
          provider: "NewsAPI",
          load: async () => {
            const newsParams = new URLSearchParams(newsApiParams.toString());
            newsParams.set("source", "newsapi");
            const payload = await fetchJson(`/api/news-premium?${newsParams.toString()}`);
            return {
              news: mapNewsApiArticles(payload.articles ?? []),
              status: payload.sourceStatus === "missing-key" ? "missing-key" : undefined,
            };
          },
        },
        {
          provider: "Finnhub",
          load: async () => {
            const payload = await fetchJson("/api/news-premium?source=finnhub");
            return {
              news: mapFinnhubArticles(payload.articles ?? []),
              status: payload.sourceStatus === "missing-key" ? "missing-key" : undefined,
            };
          },
        },
        {
          provider: "Marketaux",
          load: async () => {
            const mParams = new URLSearchParams(marketauxParams.toString());
            mParams.set("source", "marketaux");
            const payload = await fetchJson(`/api/news-premium?${mParams.toString()}`);
            return {
              news: mapMarketauxArticles(payload.data ?? []),
              status: payload.sourceStatus === "missing-key" ? "missing-key" : undefined,
            };
          },
        },
      ];

      try {
        const results = await Promise.all(
          sources.map(async (source) => {
            try {
              const result = await source.load();
              return {
                provider: source.provider,
                news: result.news,
                status: result.status ?? (result.news.length ? "live" : "empty"),
              } as const;
            } catch {
              return {
                provider: source.provider,
                news: [],
                status: "error",
              } as const;
            }
          })
        );
        const news = mergeNewsItems([...results.flatMap((result) => result.news), ...(loadCachedNews() ?? [])]);

        if (!isMounted) return;
        setSourceSummary(
          results
            .filter((result) => result.status !== "missing-key" && result.news.length > 0)
            .map((result) => ({
              provider: result.provider,
              count: result.news.length,
              status: result.status,
            }))
        );

        if (news.length) {
          setLiveNews(news);
          setStatus("live");
          setLastUpdated(
            new Intl.DateTimeFormat("ja-JP", {
              timeZone: "Asia/Tokyo",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date())
          );
          saveCachedNews(news);
          return;
        }

        setStatus(loadCachedNews() ? "cached" : "fallback");
      } finally {
        window.clearTimeout(timeout);
      }
    };

    fetchLiveNews();
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const filtered = useMemo(
    () => selectedCategory === "すべて" ? liveNews : liveNews.filter((n) => n.category === selectedCategory),
    [liveNews, selectedCategory]
  );

  useEffect(() => {
    const targets = filtered.slice(0, 40).filter((item) => item.url && !articleSummaries[item.url]).slice(0, 8);
    if (!targets.length) return;

    setArticleSummaries((previous) => ({
      ...previous,
      ...Object.fromEntries(targets.map((item) => [item.url as string, { status: "loading" as const }])),
    }));

    targets.forEach((item) => {
      fetch(`/api/article-summary?url=${encodeURIComponent(item.url as string)}`)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          const rawSummary = typeof payload.summary === "string" ? payload.summary.trim() : "";
          const summary = normalizeArticleSummaryToJapanese(rawSummary, item, buildSummary);
          setArticleSummaries((previous) => ({
            ...previous,
            [item.url as string]: summary && !looksMojibake(summary) ? { status: "ready", summary } : { status: "error" },
          }));
        })
        .catch(() => {
          setArticleSummaries((previous) => ({
            ...previous,
            [item.url as string]: { status: "error" },
          }));
        });
    });
  }, [articleSummaries, filtered]);

  const categoryColors: Record<string, string> = {
    市況: "border border-slate-300 bg-slate-100 text-slate-700",
    半導体: "border border-rose-200 bg-rose-50 text-rose-700",
    AI: "border border-amber-200 bg-amber-50 text-amber-800",
    金融: "border border-blue-200 bg-blue-50 text-blue-700",
    個別株: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    投資戦略: "border border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="ニュース" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Newspaper className="h-4 w-4 text-primary" />
          ニュース
        </h2>

        <div className="mb-3 rounded border border-border bg-card px-3 py-2">
          <div className="flex flex-col gap-1 text-xs font-bold text-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <span>毎日最新ニュースを自動取得</span>
            <span className="self-start whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-muted-foreground sm:self-auto">
              {lastUpdated ? `更新 ${lastUpdated}` : status === "loading" ? "取得中" : status === "cached" ? "前回値" : "確認中"}
            </span>
          </div>
          <p className="mt-1 text-xxs leading-relaxed text-muted-foreground">
            GoogleニュースRSS・Yahoo!ニュースRSS・GDELTに加え、主要8資産（日米株・米国債・米ドル・金・原油・暗号資産）の資金フロー関連ニュースも自動取得・統合します。
            {lastUpdated ? ` 最終取得: ${lastUpdated}` : " 更新まで保存済み1カ月分のニュースを表示します。"}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-sky-700">
              資金フロー: 8資産連動
            </span>
            {sourceSummary.map((source) => (
              <span
                key={source.provider}
                className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${
                  source.status === "live"
                    ? "bg-stock-up/10 text-stock-up"
                    : source.status === "error"
                      ? "bg-stock-down/10 text-stock-down"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {source.provider}: {source.count}件
              </span>
            ))}
          </div>
        </div>

        <MoneyFlowNewsSection />

        {/* News List */}
        <div className="rounded border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
            <h3 className="min-w-0 truncate text-xs font-bold text-foreground">
              {selectedCategory === "すべて" ? "最新ニュース" : `${selectedCategory}ニュース`}（{filtered.length}件）
            </h3>
            <span className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-slate-600">
              記事本文要約
            </span>
          </div>
          {/* Category Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x border-b border-border bg-muted/20 px-2.5 py-1.5 sm:flex-wrap sm:overflow-visible sm:px-3 no-scrollbar">
            {categories.map((cat) => {
              const count =
                cat === "すべて"
                  ? liveNews.length
                  : liveNews.filter((item) => item.category === cat).length;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground/80 hover:bg-muted"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`rounded px-1 text-[10px] ${
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const articleState = item.url ? articleSummaries[item.url] : undefined;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:contents">
                        <span className="shrink-0 tabular-nums text-xxs font-medium text-muted-foreground sm:mt-0.5">
                          {item.date} {item.time}
                        </span>
                        <span
                          className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight sm:mt-0.5 ${
                            categoryColors[item.category] || "border border-slate-300 bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1">
                          <span className="text-sm font-semibold leading-relaxed text-foreground hover:text-primary">
                            {item.title}
                          </span>
                          <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                          {articleState?.status === "loading"
                            ? "記事本文を取得して要約しています。"
                            : articleState?.status === "ready"
                              ? articleState.summary
                              : item.summary && !looksMojibake(item.summary)
                                ? item.summary
                                : "記事本文を取得できませんでした（リンク先で全文を確認できます）。"}
                        </p>
                        <div className="mt-1 flex items-end justify-between gap-2 text-xxs font-semibold">
                          <div className="flex min-w-0 flex-wrap items-center gap-1">
                            <span className="text-primary">出典: {item.source}</span>
                            {item.provider && (
                              <span className="whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[10px] leading-tight text-slate-700">
                                API: {item.provider}
                              </span>
                            )}
                          </div>
                          <div className="ml-auto flex shrink-0 items-center gap-1">
                            {item.isHot && (
                              <span className="inline-flex items-center whitespace-nowrap rounded bg-badge-hot px-1.5 py-0.5 text-[10px] font-bold leading-tight text-primary-foreground">
                                注目
                              </span>
                            )}
                            {item.isNew && (
                              <span className="inline-flex items-center whitespace-nowrap rounded bg-badge-new px-1.5 py-0.5 text-[10px] font-bold leading-tight text-primary-foreground">
                                NEW
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                </a>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                該当するニュースはありません。
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default NewsPage;
