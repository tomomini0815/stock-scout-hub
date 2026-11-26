import {
  fetchTradingViewExtraIndicators,
  fetchTradingViewMacroAssets,
  fetchTradingViewMarketIndices,
  fetchWithTimeout,
  googleQuotes,
  macroFallbackAssets,
  marketFallbackIndices,
  mergeMacroAssets,
  mergeMarketIndices,
  parseGoogleQuote,
  parseUsdJpy,
  parseYahooMarketAsset,
  sendJson,
  tradingViewMacroQuotes,
} from "./_shared/market.js";

export default async function handler(_req, res) {
  try {
    const [tradingViewIndices, tradingViewMacro, extraIndices] = await Promise.all([
      fetchTradingViewMarketIndices(),
      fetchTradingViewMacroAssets(),
      fetchTradingViewExtraIndicators(),
    ]);
    const results = tradingViewIndices.length
      ? []
      : await Promise.allSettled([
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

    const macroFallbackResults =
      tradingViewMacro.length >= tradingViewMacroQuotes.length
        ? []
        : await Promise.allSettled(
            tradingViewMacroQuotes.map((quote) =>
              parseYahooMarketAsset(quote.name, quote.yahooSymbol)
            )
          );

    const fallbackIndices = results
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter(Boolean);
    const indices = tradingViewIndices.length ? tradingViewIndices : fallbackIndices;
    const macroLive = [
      ...macroFallbackResults
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter(Boolean),
      ...tradingViewMacro,
    ];

    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        indices: mergeMarketIndices(indices),
        macroAssets: mergeMacroAssets(macroLive),
        extraIndices,
        updatedAt: new Date().toISOString(),
        source: indices.length ? "live" : "fallback",
      })
    );
  } catch {
    sendJson(res, {
      indices: marketFallbackIndices,
      macroAssets: macroFallbackAssets,
      extraIndices: [],
      updatedAt: new Date().toISOString(),
      source: "fallback",
    });
  }
}
