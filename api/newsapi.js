import { fetchWithTimeout, sendJson } from "./_shared/market.js";

const getEnvKey = (...names) => names.map((name) => process.env[name]).find(Boolean);

export default async function handler(req, res) {
  const apiKey = getEnvKey("NEWSAPI_KEY", "VITE_NEWSAPI_KEY");
  if (!apiKey) {
    sendJson(res, { articles: [], sourceStatus: "missing-key" });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
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
  } catch {
    sendJson(res, { articles: [], sourceStatus: "external-error" });
  }
}
