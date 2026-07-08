/**
 * news-feeds.js - 無料ニュースソースを1関数に統合 (Vercel Hobby 12関数制限対応)
 * 旧: google-news.js / yahoo-business-rss.js / gdelt.js / tdnet-list.js
 * 使い方: /api/news-feeds?source=google&q=...
 *         /api/news-feeds?source=yahoo
 *         /api/news-feeds?source=gdelt&mode=artlist&...
 *         /api/news-feeds?source=tdnet&date=20260707
 */
import { fetchWithTimeout } from "./_shared/market.js";

const getJstDateKey = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");

const handleGoogleNews = async (requestUrl, res) => {
  const targetUrl = new URL("https://news.google.com/rss/search");
  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (key !== "source") targetUrl.searchParams.set(key, value);
  }
  if (!targetUrl.searchParams.has("hl")) targetUrl.searchParams.set("hl", "ja");
  if (!targetUrl.searchParams.has("gl")) targetUrl.searchParams.set("gl", "JP");
  if (!targetUrl.searchParams.has("ceid")) targetUrl.searchParams.set("ceid", "JP:ja");

  const response = await fetchWithTimeout(targetUrl.toString(), 5500, {
    headers: { "User-Agent": "stock-scout-hub/1.0" },
  });
  if (!response.ok) {
    res.status(502).json({ error: `google news unavailable: ${response.status}` });
    return;
  }
  const text = await response.text();
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  res.status(200).send(text);
};

const handleYahooRss = async (_requestUrl, res) => {
  const response = await fetchWithTimeout("https://news.yahoo.co.jp/rss/topics/business.xml", 5500, {
    headers: { "User-Agent": "stock-scout-hub/1.0" },
  });
  if (!response.ok) {
    res.status(502).json({ error: "yahoo rss unavailable" });
    return;
  }
  const text = await response.text();
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  res.status(200).send(text);
};

const handleGdelt = async (requestUrl, res) => {
  const targetUrl = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (key !== "source") targetUrl.searchParams.set(key, value);
  }
  if (!targetUrl.searchParams.has("mode")) targetUrl.searchParams.set("mode", "artlist");
  if (!targetUrl.searchParams.has("format")) targetUrl.searchParams.set("format", "json");
  if (!targetUrl.searchParams.has("sort")) targetUrl.searchParams.set("sort", "hybrid");

  const response = await fetchWithTimeout(targetUrl.toString(), 5500, {
    headers: { "User-Agent": "stock-scout-hub/1.0" },
  });
  const payload = await response.text();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  const statusCode =
    response.ok
      ? 200
      : response.status === 401 || response.status === 403
      ? 502
      : response.status;
  res.status(statusCode).send(payload);
};

const handleTdnet = async (requestUrl, res) => {
  const requestedDate = requestUrl.searchParams.get("date") ?? getJstDateKey();
  const date = /^\d{8}$/.test(requestedDate) ? requestedDate : getJstDateKey();
  const response = await fetch(`https://www.release.tdnet.info/inbs/I_list_001_${date}.html`, {
    headers: { "User-Agent": "stock-scout-hub/1.0" },
  });
  if (!response.ok) {
    res.status(502).json({ items: [], error: `tdnet unavailable: ${response.status}` });
    return;
  }
  const text = await response.text();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  res.status(200).send(text);
};

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const source = requestUrl.searchParams.get("source") ?? "google";

    if (source === "yahoo") return await handleYahooRss(requestUrl, res);
    if (source === "gdelt") return await handleGdelt(requestUrl, res);
    if (source === "tdnet") return await handleTdnet(requestUrl, res);
    // デフォルト: google
    return await handleGoogleNews(requestUrl, res);
  } catch {
    res.status(500).json({ error: "news feeds unavailable" });
  }
}
