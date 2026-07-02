import { parseYahooChart, sendJson } from "./_shared/market.js";

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", `https://${req.headers.host ?? "localhost"}`);
    const symbol = requestUrl.searchParams.get("symbol")?.trim();
    const range = requestUrl.searchParams.get("range") ?? "2y";
    const interval = requestUrl.searchParams.get("interval") ?? "1d";

    if (!symbol) {
      sendJson(res, { candles: [], error: "symbol required" }, 400);
      return;
    }

    const chart = await parseYahooChart(symbol, range, interval);
    if (!chart) {
      sendJson(res, { candles: [], error: "chart unavailable" }, 502);
      return;
    }

    sendJson(res, chart);
  } catch {
    sendJson(res, { candles: [], error: "chart unavailable" }, 502);
  }
}
