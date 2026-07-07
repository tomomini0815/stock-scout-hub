import { fetchWithTimeout, sendJson } from "./_shared/market.js";

const getEnvKey = (...names) => names.map((name) => process.env[name]).find(Boolean);

export default async function handler(_req, res) {
  const apiKey = getEnvKey("FINNHUB_API_KEY", "VITE_FINNHUB_API_KEY");
  if (!apiKey) {
    sendJson(res, { articles: [], sourceStatus: "missing-key" });
    return;
  }

  try {
    const url = `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(apiKey)}`;
    const response = await fetchWithTimeout(url, 7000);
    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      sendJson(res, { articles: [], sourceStatus: "external-error", statusCode: response.status });
      return;
    }

    sendJson(res, { articles: Array.isArray(payload) ? payload : [], sourceStatus: "live" });
  } catch {
    sendJson(res, { articles: [], sourceStatus: "external-error" });
  }
}
