import { useEffect, useState } from "react";
import { type NewsItem } from "@/data/stockData";

interface UseLiveNewsSearchOptions {
  query: string;
  limit?: number;
}

const inferCategory = (title: string) => {
  if (/IPO|新規上場|上場|公開価格|初値/.test(title)) return "IPO";
  if (/決算|業績|営業利益|純利益|売上|上方修正|下方修正/.test(title)) return "決算";
  if (/半導体|AI|人工知能|NVIDIA|エヌビディア/.test(title)) return "半導体";
  if (/円|為替|金利|日銀|銀行|金融/.test(title)) return "金融";
  return "市況";
};

export const useLiveNewsSearch = ({ query, limit = 12 }: UseLiveNewsSearchOptions) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "fallback">("fallback");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeout = window.setTimeout(() => controller.abort(), 6000);

    const loadNews = async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          hl: "ja",
          gl: "JP",
          ceid: "JP:ja",
        });
        const response = await fetch(`/api/google-news?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("news api unavailable");

        const xmlText = await response.text();
        const doc = new DOMParser().parseFromString(xmlText, "text/xml");
        const items = Array.from(doc.querySelectorAll("item"));
        const mapped = items.slice(0, limit).map((item, index) => {
          const rawTitle = item.querySelector("title")?.textContent ?? "";
          const source = item.querySelector("source")?.textContent ?? "Google News";
          const url = item.querySelector("link")?.textContent ?? "";
          const pubDate = item.querySelector("pubDate")?.textContent ?? "";
          const date = new Date(pubDate);
          const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").trim();

          return {
            id: index + 1,
            date: Number.isNaN(date.getTime())
              ? ""
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
            url,
            isHot: index < 3,
            isNew: index < 2,
          } satisfies NewsItem;
        });

        if (!mapped.length) throw new Error("empty news");
        if (!isActive) return;
        setNews(mapped);
        setStatus("live");
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
          setNews([]);
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
  }, [limit, query]);

  return { news, status, updatedAt };
};
