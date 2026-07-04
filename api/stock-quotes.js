import { parseYahooQuote, parseYahooQuoteBatch, sendJson } from "./_shared/market.js";

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", `https://${req.headers.host ?? "localhost"}`);
    const symbols = (requestUrl.searchParams.get("symbols") ?? "")
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean)
      .slice(0, 60);

    if (!symbols.length) {
      sendJson(res, { quotes: [], error: "symbols required" }, 400);
      return;
    }

    const batchQuotes = await parseYahooQuoteBatch(symbols);
    const foundSymbols = new Set(batchQuotes.map((quote) => quote.symbol));
    const missingSymbols = symbols.filter((symbol) => !foundSymbols.has(symbol));
    const fallbackResults = missingSymbols.length
      ? await Promise.allSettled(missingSymbols.map(parseYahooQuote))
      : [];
    const fallbackQuotes = fallbackResults
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter(Boolean);
    const quotes = [...batchQuotes, ...fallbackQuotes];

    sendJson(res, { quotes, updatedAt: new Date().toISOString() });
  } catch {
    sendJson(res, { quotes: [], error: "stock quotes unavailable" }, 502);
  }
}
