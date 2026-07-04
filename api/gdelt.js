import { fetchWithTimeout } from "./_shared/market.js";

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const targetUrl = new URL("https://api.gdeltproject.org/api/v2/doc/doc");

    for (const [key, value] of requestUrl.searchParams.entries()) {
      targetUrl.searchParams.set(key, value);
    }

    if (!targetUrl.searchParams.has("mode")) targetUrl.searchParams.set("mode", "artlist");
    if (!targetUrl.searchParams.has("format")) targetUrl.searchParams.set("format", "json");
    if (!targetUrl.searchParams.has("sort")) targetUrl.searchParams.set("sort", "hybrid");

    const response = await fetchWithTimeout(targetUrl.toString(), 5500, {
      headers: {
        "User-Agent": "stock-scout-hub/1.0",
      },
    });
    const payload = await response.text();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
    res.status(response.ok ? 200 : response.status).send(payload);
  } catch {
    res.status(500).json({ articles: [], error: "gdelt failed" });
  }
}
