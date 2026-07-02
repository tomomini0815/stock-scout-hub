import {
  fetchWithTimeout,
  googleQuotes,
  marketFallbackIndices,
  mergeMarketIndices,
  parseGoogleQuote,
  parseUsdJpy,
  parseYahooMarketAsset,
  sendJson,
} from "./_shared/market.js";

export default async function handler(_req, res) {
  try {
    const results = await Promise.allSettled([
      ...googleQuotes.map(async (quote) => {
        const response = await fetchWithTimeout(`https://www.google.com/finance/quote/${quote.path}`);
        if (!response.ok) return null;
        const html = await response.text();
        const parsed = parseGoogleQuote(html, quote.ticker, quote.exchange);
        return parsed ? { name: quote.name, ...parsed } : null;
      }),
      (async () => {
        const response = await fetchWithTimeout("https://www.google.com/finance/quote/USD-JPY");
        if (!response.ok) return null;
        return parseUsdJpy(await response.text());
      })(),
      parseYahooMarketAsset("GOLD", "GC=F"),
      parseYahooMarketAsset("BTC/USDT", "BTC-USD"),
    ]);

    const indices = results
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter(Boolean);

    sendJson(res, {
      indices: mergeMarketIndices(indices),
      updatedAt: new Date().toISOString(),
      source: indices.length ? "live" : "fallback",
    });
  } catch {
    sendJson(res, {
      indices: marketFallbackIndices,
      updatedAt: new Date().toISOString(),
      source: "fallback",
    });
  }
}
