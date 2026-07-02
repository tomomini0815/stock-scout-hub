import { useEffect, useState } from "react";
import { type NewsItem } from "@/data/stockData";

interface UseLiveNewsSearchOptions {
  query: string;
  gdeltQuery?: string;
  timespan?: string;
  titlePattern?: RegExp;
  includeTdnet?: boolean;
  limit?: number;
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
}

const inferCategory = (title: string) => {
  if (/IPO|新規上場|上場|公開価格|初値/.test(title)) return "IPO";
  if (/決算|業績|営業利益|純利益|売上|上方修正|下方修正/.test(title)) return "決算";
  if (/半導体|AI|人工知能|NVIDIA|エヌビディア/.test(title)) return "半導体";
  if (/円|為替|金利|日銀|銀行|金融/.test(title)) return "金融";
  return "市況";
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

const formatGdeltDateTime = (seenDate = "") => {
  const normalized = seenDate.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z"
  );
  return formatDateTime(normalized);
};

const mapRssNews = (xmlText: string, provider: string, fallbackSource: string, limit: number): NewsItem[] => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const items = Array.from(doc.querySelectorAll("item"));

  return items
    .slice(0, limit)
    .map((item, index) => {
      const rawTitle = item.querySelector("title")?.textContent ?? "";
      const source = item.querySelector("source")?.textContent ?? fallbackSource;
      const url = item.querySelector("link")?.textContent ?? "";
      const pubDate = item.querySelector("pubDate")?.textContent ?? "";
      const formatted = formatDateTime(pubDate);
      const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").trim();

      return {
        id: index + 1,
        date: formatted.date,
        time: formatted.time,
        title,
        category: inferCategory(title),
        source,
        provider,
        url,
        isHot: index < 3,
        isNew: index < 2,
      } satisfies NewsItem;
    })
    .filter((item) => item.title && item.url);
};

const mapGdeltNews = (articles: GdeltArticle[], limit: number): NewsItem[] => {
  const seen = new Set<string>();

  return articles
    .filter((article) => article.url && article.title && !seen.has(article.url) && seen.add(article.url))
    .slice(0, limit)
    .map((article, index) => {
      const formatted = formatGdeltDateTime(article.seendate);
      const title = article.title?.replace(/\s+/g, " ").trim() ?? "";
      const source = article.domain?.replace(/^www\./, "") ?? "GDELT";

      return {
        id: index + 1,
        date: formatted.date,
        time: formatted.time,
        title,
        category: inferCategory(title),
        source,
        provider: "GDELT",
        url: article.url,
        isHot: index < 3,
        isNew: index < 2,
      } satisfies NewsItem;
    });
};

const getJstDateKey = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");

const mapTdnetNews = (htmlText: string, limit: number): NewsItem[] => {
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  const rows = Array.from(doc.querySelectorAll("#main-list-table tr"));

  return rows
    .map((row, index) => {
      const time = row.querySelector(".kjTime")?.textContent?.trim() ?? "";
      const code = row.querySelector(".kjCode")?.textContent?.trim().replace(/0$/, "") ?? "";
      const name = row.querySelector(".kjName")?.textContent?.trim().replace(/\s+/g, "") ?? "";
      const link = row.querySelector<HTMLAnchorElement>(".kjTitle a");
      const disclosureTitle = link?.textContent?.trim().replace(/\s+/g, " ") ?? "";
      const href = link?.getAttribute("href") ?? "";
      const title = [code, name, disclosureTitle].filter(Boolean).join(" ");

      return {
        id: index + 1,
        date: formatDateTime(new Date()).date,
        time,
        title,
        category: inferCategory(disclosureTitle),
        source: "TDnet",
        provider: "TDnet",
        url: href ? new URL(href, "https://www.release.tdnet.info/inbs/").toString() : "",
        isHot: index < 3,
        isNew: index < 2,
      } satisfies NewsItem;
    })
    .filter((item) => item.title && item.url)
    .slice(0, limit);
};

export const useLiveNewsSearch = ({
  query,
  gdeltQuery,
  timespan = "30d",
  titlePattern,
  includeTdnet = false,
  limit = 12,
}: UseLiveNewsSearchOptions) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "fallback">("fallback");
  const [updatedAt, setUpdatedAt] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    const loadNews = async () => {
      try {
        setStatus("loading");
        const fetchText = async (url: string) => {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        };

        const googleParams = new URLSearchParams({
          q: query,
          hl: "ja",
          gl: "JP",
          ceid: "JP:ja",
        });
        const gdeltParams = new URLSearchParams({
          query: gdeltQuery ?? query.replace(/\bwhen:\S+/g, "").replace(/\bOR\b/g, "OR"),
          mode: "artlist",
          format: "json",
          maxrecords: String(limit),
          sort: "hybrid",
          timespan,
        });

        const sources = [
          ...(includeTdnet
            ? [
                async () => ({
                  status: "live" as const,
                  news: mapTdnetNews(await fetchText(`/api/tdnet-list?date=${getJstDateKey()}`), Math.max(limit * 5, 120)),
                }),
              ]
            : []),
          async () => ({
            status: "live" as const,
            news: mapRssNews(
              await fetchText(`/api/google-news?${googleParams.toString()}`),
              "Google News RSS",
              "Google News",
              limit
            ),
          }),
          async () => ({
            status: "fallback" as const,
            news: mapRssNews(
              await fetchText("/api/yahoo-business-rss"),
              "Yahoo!ニュースRSS",
              "Yahoo!ニュース",
              limit
            ),
          }),
          async () => {
            const response = await fetch(`/api/gdelt?${gdeltParams.toString()}`, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = await response.json();
            return {
              status: "live" as const,
              news: mapGdeltNews(payload.articles ?? [], limit),
            };
          },
        ];

        let mapped: NewsItem[] = [];
        let nextStatus: "live" | "fallback" = "fallback";

        for (const source of sources) {
          try {
            const result = await source();
            const relevantNews = titlePattern
              ? result.news.filter((item) => titlePattern.test(item.title))
              : result.news;

            if (relevantNews.length) {
              mapped = [...mapped, ...relevantNews];
              if (result.status === "live") nextStatus = "live";
            }
          } catch {
            // Try the next source. Google News often rejects automated RSS requests.
          }
        }

        const seen = new Set<string>();
        mapped = mapped
          .filter((item) => {
            const key = item.url || `${item.title}-${item.source ?? ""}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, limit);

        if (!mapped.length) throw new Error("empty news");
        if (!isActive) return;
        setNews(mapped);
        setStatus(nextStatus);
        setUpdatedAt(
          new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date())
        );
      } catch {
        if (isActive) {
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
  }, [gdeltQuery, includeTdnet, limit, query, refreshTick, timespan, titlePattern]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshTick((current) => current + 1);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  return {
    news,
    status,
    updatedAt,
    refresh: () => setRefreshTick((current) => current + 1),
  };
};
