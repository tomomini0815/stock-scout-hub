import { useEffect, useState } from "react";
import { type NewsItem } from "@/data/stockData";
import { ExternalLink, Flame, Sparkles } from "lucide-react";

interface NewsFeedProps {
  news?: NewsItem[];
}

const TOP_NEWS_CACHE_KEY = "stock-scout-top-news-v1";
const TOP_NEWS_CACHE_MS = 1000 * 60 * 45;

const inferCategory = (title: string) =>
  /半導体|AI|NVIDIA|エヌビディア|キオクシア|アドバンテスト|東京エレクトロン/.test(title)
    ? "半導体"
    : /円|為替|金利|日銀|銀行|金融/.test(title)
      ? "金融"
      : /決算|業績|上方修正|下方修正|買収|提携|IPO/.test(title)
        ? "企業"
        : "市況";

const normalizeNewsKey = (value = "") =>
  value
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\s+/g, "");

const mapRssNews = (xmlText: string, provider: string, fallbackSource: string, idOffset = 0) => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  return Array.from(doc.querySelectorAll("item")).map((item, index) => {
    const rawTitle = item.querySelector("title")?.textContent ?? "";
    const source = item.querySelector("source")?.textContent ?? fallbackSource;
    const url = item.querySelector("link")?.textContent ?? "";
    const pubDate = item.querySelector("pubDate")?.textContent ?? "";
    const date = new Date(pubDate);
    const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").trim();

    return {
      id: idOffset + index + 1,
      date: Number.isNaN(date.getTime())
        ? undefined
        : new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(date),
      time: Number.isNaN(date.getTime())
        ? ""
        : new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(date),
      title,
      category: inferCategory(title),
      source,
      provider,
      url,
      isHot: index < 3,
      isNew: index < 2,
    } satisfies NewsItem;
  });
};

const mergeNewsItems = (items: NewsItem[]) => {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.url ? normalizeNewsKey(item.url) : normalizeNewsKey(item.title);
      if (!key || seen.has(key) || !item.title) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const left = new Date(`${a.date ?? ""} ${a.time ?? ""}`).getTime();
      const right = new Date(`${b.date ?? ""} ${b.time ?? ""}`).getTime();
      if (Number.isNaN(left) || Number.isNaN(right)) return 0;
      return right - left;
    })
    .slice(0, 8)
    .map((item, index) => ({
      ...item,
      id: index + 1,
      isHot: index < 3,
      isNew: index < 2,
    }));
};

const loadCachedTopNews = () => {
  try {
    const raw = localStorage.getItem(TOP_NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; news: NewsItem[] };
    if (!parsed.news?.length || Date.now() - parsed.savedAt > TOP_NEWS_CACHE_MS) return null;
    return parsed.news;
  } catch {
    return null;
  }
};

const saveCachedTopNews = (items: NewsItem[]) => {
  try {
    localStorage.setItem(TOP_NEWS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), news: items }));
  } catch {
    // Cache failures should not block top page rendering.
  }
};

const NewsFeed = ({ news = [] }: NewsFeedProps) => {
  const [displayNews, setDisplayNews] = useState<NewsItem[]>(() => loadCachedTopNews() ?? news);
  const [status, setStatus] = useState<"loading" | "live" | "fallback">(
    loadCachedTopNews() ? "live" : "loading"
  );
  const categoryColors: Record<string, string> = {
    市況: "bg-primary text-primary-foreground",
    決算: "bg-stock-up text-primary-foreground",
    企業: "bg-muted text-muted-foreground",
    "M&A": "bg-header-accent text-foreground",
    金融: "bg-stock-down text-primary-foreground",
    医薬品: "bg-muted text-foreground",
    半導体: "bg-stock-up-bg text-stock-up",
  };

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    const loadNews = async () => {
      try {
        setStatus("loading");
        const googleParams = new URLSearchParams({
          q: "日本株 OR 日経平均 OR 東証 OR 半導体 OR AI OR 為替 OR 金利 when:3d",
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
          fetchText(`/api/google-news?${googleParams.toString()}`).then((text) =>
            mapRssNews(text, "Google News RSS", "Google News")
          ),
          fetchText("/api/yahoo-business-rss").then((text) =>
            mapRssNews(text, "Yahoo!ニュースRSS", "Yahoo!ニュース", 100)
          ),
        ]);

        const liveNews = mergeNewsItems(
          results.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
        );

        if (!liveNews.length) throw new Error("empty news");
        if (!isActive) return;
        setDisplayNews(liveNews);
        setStatus("live");
        saveCachedTopNews(liveNews);
      } catch {
        if (isActive) {
          const cached = loadCachedTopNews();
          setDisplayNews(cached ?? news);
          setStatus("fallback");
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    loadNews();
    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [news]);

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-table-header-bg px-3 py-1.5">
        <h3 className="text-xs font-bold text-foreground">最新ニュース</h3>
        <span
          className={`rounded px-1.5 py-0.5 text-xxs font-bold ${
            status === "live"
              ? "bg-stock-up-bg text-stock-up"
              : status === "loading"
              ? "bg-muted text-muted-foreground"
              : "bg-stock-down-bg text-stock-down"
          }`}
        >
          {status === "live" ? "LIVE" : status === "loading" ? "取得中" : displayNews.length ? "固定値" : "確認中"}
        </span>
      </div>
      <div className="divide-y divide-border">
        {!displayNews.length && (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            最新ニュースを確認しています。
          </div>
        )}
        {displayNews.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <span className="mt-0.5 shrink-0 tabular-nums text-xxs font-medium text-muted-foreground">
              {item.time}
            </span>
            <span
              className={`mt-0.5 shrink-0 rounded px-1 py-0 text-xxs font-bold ${
                categoryColors[item.category] || "bg-muted text-muted-foreground"
              }`}
            >
              {item.category}
            </span>
            <span className="flex-1 text-xs leading-relaxed text-foreground hover:text-primary">
              {item.title}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {item.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
              {item.isHot && (
                <span className="flex items-center gap-0.5 rounded bg-badge-hot px-1 py-0 text-xxs font-bold text-primary-foreground">
                  <Flame className="h-2.5 w-2.5" />
                  注目
                </span>
              )}
              {item.isNew && (
                <span className="flex items-center gap-0.5 rounded bg-badge-new px-1 py-0 text-xxs font-bold text-primary-foreground">
                  <Sparkles className="h-2.5 w-2.5" />
                  NEW
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
