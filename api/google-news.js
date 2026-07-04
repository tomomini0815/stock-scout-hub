import { fetchWithTimeout } from "./_shared/market.js";

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const targetUrl = new URL("https://news.google.com/rss/search");

    for (const [key, value] of requestUrl.searchParams.entries()) {
      targetUrl.searchParams.set(key, value);
    }

    if (!targetUrl.searchParams.has("hl")) targetUrl.searchParams.set("hl", "ja");
    if (!targetUrl.searchParams.has("gl")) targetUrl.searchParams.set("gl", "JP");
    if (!targetUrl.searchParams.has("ceid")) targetUrl.searchParams.set("ceid", "JP:ja");

    const response = await fetchWithTimeout(targetUrl.toString(), 5500, {
      headers: {
        "User-Agent": "stock-scout-hub/1.0",
      },
    });

    if (!response.ok) {
      res.status(502).json({ error: `google news unavailable: ${response.status}` });
      return;
    }

    const text = await response.text();
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
    res.status(200).send(text);
  } catch {
    res.status(500).json({ error: "google news failed" });
  }
}
