import { fetchWithTimeout, sendJson } from "./_shared/market.js";

const readRaw = (value) => {
  if (Number.isFinite(value?.raw)) return Number(value.raw);
  if (Number.isFinite(value)) return Number(value);
  return null;
};

const toPercent = (value) => {
  if (!Number.isFinite(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
};

const parseQuoteSummaryMetrics = (payload, symbol) => {
  const result = payload?.quoteSummary?.result?.[0];
  if (!result) return null;

  const summaryDetail = result.summaryDetail ?? {};
  const keyStats = result.defaultKeyStatistics ?? {};
  const financialData = result.financialData ?? {};
  const assetProfile = result.assetProfile ?? {};
  const per = readRaw(summaryDetail.trailingPE) ?? readRaw(keyStats.trailingPE) ?? readRaw(summaryDetail.forwardPE);
  const pbr = readRaw(keyStats.priceToBook);
  const dividendYield = toPercent(readRaw(summaryDetail.dividendYield));
  const roe = toPercent(readRaw(financialData.returnOnEquity));
  const marketCap = readRaw(summaryDetail.marketCap) ?? readRaw(keyStats.marketCap);
  const enterpriseValue = readRaw(keyStats.enterpriseValue);
  const employees = readRaw(assetProfile.fullTimeEmployees);

  return {
    code: symbol.replace(".T", ""),
    symbol,
    per,
    pbr,
    dividendYield,
    roe,
    marketCap,
    enterpriseValue,
    employees,
  };
};

const parseQuoteMetrics = (payload, symbol) => {
  const quote = payload?.quoteResponse?.result?.[0];
  if (!quote) return null;

  return {
    code: symbol.replace(".T", ""),
    symbol,
    per: Number.isFinite(quote.trailingPE) ? Number(quote.trailingPE) : null,
    pbr: Number.isFinite(quote.priceToBook) ? Number(quote.priceToBook) : null,
    dividendYield: toPercent(Number.isFinite(quote.dividendYield) ? Number(quote.dividendYield) : null),
    roe: toPercent(Number.isFinite(quote.returnOnEquity) ? Number(quote.returnOnEquity) : null),
    marketCap: Number.isFinite(quote.marketCap) ? Number(quote.marketCap) : null,
    enterpriseValue: Number.isFinite(quote.enterpriseValue) ? Number(quote.enterpriseValue) : null,
    employees: Number.isFinite(quote.fullTimeEmployees) ? Number(quote.fullTimeEmployees) : null,
  };
};

const fetchYahooMetrics = async (symbol) => {
  const summaryUrl =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    "?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile";
  const summaryResponse = await fetchWithTimeout(summaryUrl, 7000);
  if (summaryResponse.ok) {
    const summaryPayload = await summaryResponse.json();
    const metrics = parseQuoteSummaryMetrics(summaryPayload, symbol);
    if (metrics && [metrics.per, metrics.pbr, metrics.dividendYield, metrics.roe].some(Number.isFinite)) {
      return metrics;
    }
  }

  const quoteUrl =
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}` +
    "&fields=trailingPE,priceToBook,dividendYield,returnOnEquity,marketCap,enterpriseValue,fullTimeEmployees";
  const quoteResponse = await fetchWithTimeout(quoteUrl, 7000);
  if (!quoteResponse.ok) return null;

  return parseQuoteMetrics(await quoteResponse.json(), symbol);
};

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", `https://${req.headers.host ?? "localhost"}`);
    const symbol = requestUrl.searchParams.get("symbol")?.trim();

    if (!symbol) {
      sendJson(res, { error: "symbol required" }, 400);
      return;
    }

    const metrics = await fetchYahooMetrics(symbol);
    if (!metrics) {
      sendJson(res, { error: "stock metrics unavailable" }, 502);
      return;
    }

    sendJson(res, { metrics, updatedAt: new Date().toISOString() });
  } catch {
    sendJson(res, { error: "stock metrics unavailable" }, 502);
  }
}
