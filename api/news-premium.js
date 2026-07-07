/**
 * news-premium.js - 有料ニュースAPIを1関数に統合 (Vercel Hobby 12関数制限対応)
 * 旧: newsapi.js / finnhub-news.js / marketaux-news.js
 * 使い方: /api/news-premium?source=newsapi&q=...
 *         /api/news-premium?source=finnhub
 *         /api/news-premium?source=marketaux&search=...
 */
import { fetchWithTimeout, sendJson } from "./_shared/market.js";

const getEnvKey = (...names) => names.map((name) => process.env[name]).find(Boolean);

const handleNewsApi = async (requestUrl, res) => {
  const apiKey = getEnvKey("NEWSAPI_KEY", "VITE_NEWSAPI_KEY");
  if (!apiKey) {
    sendJson(res, { articles: [], sourceStatus: "missing-key" });
    return;
  }
  const query = requestUrl.searchParams.get("q") ?? "Japan stocks OR Nikkei OR Tokyo Stock Exchange";
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", query);
  url.searchParams.set("language", requestUrl.searchParams.get("language") ?? "ja");
  url.searchParams.set("sortBy", requestUrl.searchParams.get("sortBy") ?? "publishedAt");
  url.searchParams.set("pageSize", requestUrl.searchParams.get("pageSize") ?? "30");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetchWithTimeout(url.toString(), 7000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    sendJson(res, { articles: [], sourceStatus: "external-error", statusCode: response.status, message: payload?.message });
    return;
  }
  sendJson(res, payload);
};

const handleFinnhub = async (_requestUrl, res) => {
  const apiKey = getEnvKey("FINNHUB_API_KEY", "VITE_FINNHUB_API_KEY");
  if (!apiKey) {
    sendJson(res, { articles: [], sourceStatus: "missing-key" });
    return;
  }
  const url = `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(url, 7000);
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    sendJson(res, { articles: [], sourceStatus: "external-error", statusCode: response.status });
    return;
  }
  sendJson(res, { articles: Array.isArray(payload) ? payload : [], sourceStatus: "live" });
};

const handleMarketaux = async (requestUrl, res) => {
  const apiKey = getEnvKey("MARKETAUX_API_KEY", "VITE_MARKETAUX_API_KEY");
  if (!apiKey) {
    sendJson(res, { data: [], sourceStatus: "missing-key" });
    return;
  }
  const search = requestUrl.searchParams.get("search") ?? "Japan stocks Nikkei semiconductor AI yen";
  const url = new URL("https://api.marketaux.com/v1/news/all");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("language", "ja,en");
  url.searchParams.set("countries", "jp,us");
  url.searchParams.set("filter_entities", "true");
  url.searchParams.set("limit", requestUrl.searchParams.get("limit") ?? "30");
  url.searchParams.set("search", search);

  const response = await fetchWithTimeout(url.toString(), 7000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    sendJson(res, { data: [], sourceStatus: "external-error", statusCode: response.status, message: payload?.error?.message });
    return;
  }
  sendJson(res, payload);
};

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const source = requestUrl.searchParams.get("source") ?? "newsapi";

    if (source === "finnhub") return await handleFinnhub(requestUrl, res);
    if (source === "marketaux") return await handleMarketaux(requestUrl, res);
    // デフォルト: newsapi
    return await handleNewsApi(requestUrl, res);
  } catch {
    sendJson(res, { articles: [], sourceStatus: "external-error" });
  }
}
