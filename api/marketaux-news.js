import { fetchWithTimeout, sendJson } from "./_shared/market.js";

const getEnvKey = (...names) => names.map((name) => process.env[name]).find(Boolean);

export default async function handler(req, res) {
  const apiKey = getEnvKey("MARKETAUX_API_KEY", "VITE_MARKETAUX_API_KEY");
  if (!apiKey) {
    sendJson(res, { data: [], sourceStatus: "missing-key" });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
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
  } catch {
    sendJson(res, { data: [], sourceStatus: "external-error" });
  }
}
