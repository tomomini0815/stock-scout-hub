import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fetchEdinetDocumentArchive, fetchSmartMoneyData } from "./api/_shared/smart-money.js";

const googleQuotes = [
  { name: "日経平均", path: "NI225:INDEXNIKKEI", ticker: "NI225", exchange: "INDEXNIKKEI" },
  { name: "TOPIX", path: "TOPIX:INDEXTOPIX", ticker: "TOPIX", exchange: "INDEXTOPIX" },
  { name: "NYダウ", path: ".DJI:INDEXDJX", ticker: ".DJI", exchange: "INDEXDJX" },
  { name: "NASDAQ", path: ".IXIC:INDEXNASDAQ", ticker: ".IXIC", exchange: "INDEXNASDAQ" },
  { name: "S&P500", path: ".INX:INDEXSP", ticker: ".INX", exchange: "INDEXSP" },
];

const tradingViewQuotes = [
  { name: "日経平均", symbol: "TVC:NI225" },
  { name: "TOPIX", symbol: "OSE:TOPIX1!" },
  { name: "NYダウ", symbol: "DJ:DJI" },
  { name: "NASDAQ", symbol: "NASDAQ:IXIC" },
  { name: "S&P500", symbol: "SP:SPX" },
  { name: "USD/JPY", symbol: "FX:USDJPY" },
  { name: "GOLD", symbol: "TVC:GOLD" },
  { name: "BTC/USDT", symbol: "BINANCE:BTCUSDT" },
];

const marketFallbackIndices = [
  { name: "日経平均", value: 39098.68, change: 435.62, changePercent: 1.13 },
  { name: "TOPIX", value: 2768.54, change: 28.17, changePercent: 1.03 },
  { name: "NYダウ", value: 44544.66, change: 317.24, changePercent: 0.72 },
  { name: "NASDAQ", value: 19924.49, change: 188.57, changePercent: 0.96 },
  { name: "S&P500", value: 6083.57, change: 42.36, changePercent: 0.70 },
  { name: "USD/JPY", value: 151.82, change: -0.34, changePercent: -0.22 },
  { name: "GOLD", value: 2325.4, change: 0, changePercent: 0 },
  { name: "BTC/USDT", value: 65000, change: 0, changePercent: 0 },
];

const marketDisplayOrder = marketFallbackIndices.map((item) => item.name);
let marketDataCache = {
  indices: marketFallbackIndices,
  updatedAt: new Date().toISOString(),
  source: "fallback",
};

const fetchWithTimeout = async (url: string, timeoutMs = 4500, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const getEnvKey = (...names: string[]) => names.map((name) => process.env[name]).find(Boolean);

const sendJson = (res, payload, statusCode = 200) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const sendOptionalSourceError = (res, payloadKey: "articles" | "data", statusCode?: number, message?: string) => {
  sendJson(res, {
    [payloadKey]: [],
    sourceStatus: "external-error",
    ...(statusCode ? { statusCode } : {}),
    ...(message ? { message } : {}),
  });
};

const sendText = (res, text: string, contentType = "text/plain; charset=utf-8", statusCode = 200) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(text);
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value: string) =>
  decodeHtmlEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const getTagAttr = (tag: string, name: string) => {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match ? decodeHtmlEntities(match[1]).trim() : "";
};

const getMetaContent = (html: string, names: string[]) => {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const key = (getTagAttr(tag, "name") || getTagAttr(tag, "property")).toLowerCase();
    const content = getTagAttr(tag, "content");
    if (wanted.has(key) && content) return content;
  }

  return "";
};

const normalizeArticleText = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s*([。！？])\s*/g, "$1")
    .trim();

const summarizeArticleText = (text: string) => {
  const normalized = normalizeArticleText(text);
  if (!normalized) return "";

  const sentences = normalized.match(/[^。！？]+[。！？]?/g)?.filter((sentence) => sentence.trim().length > 12) ?? [normalized];
  const summary = sentences.slice(0, 3).join("").trim();
  return summary.length > 260 ? `${summary.slice(0, 260)}...` : summary;
};

const extractArticleSummaryFromHtml = (html: string) => {
  const metaDescription = getMetaContent(html, ["description", "og:description", "twitter:description"]);
  if (metaDescription) return summarizeArticleText(metaDescription);

  const jsonLdDescription = html.match(/"description"\s*:\s*"([^"]{40,})"/i)?.[1];
  if (jsonLdDescription) return summarizeArticleText(decodeHtmlEntities(jsonLdDescription.replace(/\\"/g, '"')));

  const cleanedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const paragraphs = [...cleanedHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((text) => text.length >= 35 && !/関連記事|続きを読む|ログイン|シェア/.test(text));

  return summarizeArticleText(paragraphs.slice(0, 4).join(" "));
};

const isBlockedArticleHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d+)\./);
  return private172 ? Number(private172[1]) >= 16 && Number(private172[1]) <= 31 : false;
};

const mergeMarketIndices = (liveIndices) => {
  const previousByName = new Map(marketDataCache.indices.map((item) => [item.name, item]));
  const liveByName = new Map(liveIndices.map((item) => [item.name, item]));

  return marketDisplayOrder.map((name) =>
    liveByName.get(name) ?? previousByName.get(name) ?? marketFallbackIndices.find((item) => item.name === name)
  ).filter(Boolean);
};

const parseDisplayNumber = (raw: string) =>
  Number(raw.replace(/[,%¥$]/g, "").replace("−", "-").trim());

const parseDisplayedQuote = (html: string) => {
  const valueMatch = html.match(/YMlKec fxKbKc">([^<]+)</);
  const percentMatch = html.match(/JwB6zf[^>]*>([+\-−]?[0-9.,]+)%</);
  const changeMatch = html.match(/P2Luy (?:Ebnabc|Ez2Ioe)">([+\-−]?[0-9.,]+)</);
  if (!valueMatch || !percentMatch || !changeMatch) return null;

  const value = parseDisplayNumber(valueMatch[1]);
  const change = parseDisplayNumber(changeMatch[1]);
  const changePercent = parseDisplayNumber(percentMatch[1]);
  return [value, change, changePercent].every(Number.isFinite)
    ? { value, change, changePercent }
    : null;
};

const parseGoogleQuote = (html: string, ticker: string, exchange: string) => {
  const marker = `["${ticker}","${exchange}"],`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return parseDisplayedQuote(html);

  const match = html.slice(markerIndex + marker.length).match(/^"[^"]+",\d+,null,\[([^\]]+)\]/);
  if (!match) return parseDisplayedQuote(html);

  const [value, change, changePercent] = match[1].split(",").slice(0, 3).map(Number);
  return [value, change, changePercent].every(Number.isFinite)
    ? { value, change, changePercent }
    : parseDisplayedQuote(html);
};

const parseUsdJpy = (html: string) => {
  const match = html.match(/"USD \/ JPY",3,null,\[([^\]]+)\]/);
  if (match) {
    const [value, change, changePercent] = match[1].split(",").slice(0, 3).map(Number);
    if ([value, change, changePercent].every(Number.isFinite)) {
      return { name: "USD/JPY", value, change, changePercent };
    }
  }

  const displayed = parseDisplayedQuote(html);
  return displayed ? { name: "USD/JPY", ...displayed } : null;
};

const parseYahooQuote = async (symbol: string) => {
  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
  );
  if (!response.ok) return null;

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const meta = result?.meta;
  if (!quote || !meta) return null;

  const closes = quote.close ?? [];
  const latestIndex = closes
    .map((value, index) => (Number.isFinite(value) ? index : -1))
    .filter((index) => index >= 0)
    .at(-1);

  if (latestIndex === undefined) return null;

  const price = Number(closes[latestIndex] ?? meta.regularMarketPrice);
  const previousClose = Number(meta.previousClose ?? meta.chartPreviousClose);
  if (!Number.isFinite(price) || !Number.isFinite(previousClose)) return null;

  const open = Number(quote.open?.[latestIndex] ?? price);
  const high = Number(quote.high?.[latestIndex] ?? price);
  const low = Number(quote.low?.[latestIndex] ?? price);
  const volume = Number(quote.volume?.[latestIndex] ?? 0);
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  const code = symbol.replace(".T", "");

  return {
    code,
    symbol,
    price,
    change,
    changePercent,
    volume,
    open: Number.isFinite(open) ? open : price,
    high: Number.isFinite(high) ? high : price,
    low: Number.isFinite(low) ? low : price,
    previousClose,
  };
};

const parseYahooMarketAsset = async (name: string, symbol: string) => {
  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
  );
  if (!response.ok) return null;

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const meta = result?.meta;
  if (!quote || !meta) return null;

  const closes = quote.close ?? [];
  const latestIndex = closes
    .map((value, index) => (Number.isFinite(value) ? index : -1))
    .filter((index) => index >= 0)
    .at(-1);
  if (latestIndex === undefined) return null;

  const value = Number(closes[latestIndex] ?? meta.regularMarketPrice);
  const previousClose = Number(meta.previousClose ?? meta.chartPreviousClose);
  if (!Number.isFinite(value) || !Number.isFinite(previousClose)) return null;

  const change = value - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  return { name, value, change, changePercent };
};

const fetchTradingViewMarketIndices = async () => {
  const response = await fetchWithTimeout(
    "https://scanner.tradingview.com/global/scan",
    7000,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbols: {
          tickers: tradingViewQuotes.map((quote) => quote.symbol),
          query: { types: [] },
        },
        columns: ["close", "change", "change_abs"],
      }),
    }
  );
  if (!response.ok) return [];

  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const nameBySymbol = new Map(tradingViewQuotes.map((quote) => [quote.symbol, quote.name]));

  return rows
    .map((row) => {
      const name = nameBySymbol.get(row?.s);
      const [value, changePercent, change] = row?.d ?? [];
      return name &&
        [value, changePercent, change].every((item) => Number.isFinite(Number(item)))
        ? {
            name,
            value: Number(value),
            change: Number(change),
            changePercent: Number(changePercent),
          }
        : null;
    })
    .filter(Boolean);
};

const parseYahooChart = async (symbol: string, range = "2y", interval = "1d") => {
  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`
    , 8000
  );
  if (!response.ok) return null;

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!timestamps.length || !quote) return null;

  const candles = timestamps
    .map((timestamp, index) => ({
      date: new Intl.DateTimeFormat("ja-JP", {
        month: "numeric",
        day: "numeric",
      }).format(new Date(timestamp * 1000)),
      open: Number(quote.open?.[index]),
      high: Number(quote.high?.[index]),
      low: Number(quote.low?.[index]),
      close: Number(quote.close?.[index]),
      volume: Number(quote.volume?.[index] ?? 0),
    }))
    .filter((item) =>
      [item.open, item.high, item.low, item.close].every((value) => Number.isFinite(value) && value > 0)
    )
    .slice(-520);

  return candles.length
    ? {
        symbol,
        currency: result?.meta?.currency ?? "",
        candles,
        updatedAt: new Date().toISOString(),
      }
    : null;
};

const readRawMetric = (value) => {
  if (Number.isFinite(value?.raw)) return Number(value.raw);
  if (Number.isFinite(value)) return Number(value);
  return null;
};

const toPercentMetric = (value) => {
  if (!Number.isFinite(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
};

const parseQuoteSummaryMetrics = (payload, symbol: string) => {
  const result = payload?.quoteSummary?.result?.[0];
  if (!result) return null;

  const summaryDetail = result.summaryDetail ?? {};
  const keyStats = result.defaultKeyStatistics ?? {};
  const financialData = result.financialData ?? {};
  const assetProfile = result.assetProfile ?? {};
  const per = readRawMetric(summaryDetail.trailingPE) ?? readRawMetric(keyStats.trailingPE) ?? readRawMetric(summaryDetail.forwardPE);
  const pbr = readRawMetric(keyStats.priceToBook);
  const dividendYield = toPercentMetric(readRawMetric(summaryDetail.dividendYield));
  const roe = toPercentMetric(readRawMetric(financialData.returnOnEquity));
  const marketCap = readRawMetric(summaryDetail.marketCap) ?? readRawMetric(keyStats.marketCap);
  const enterpriseValue = readRawMetric(keyStats.enterpriseValue);
  const employees = readRawMetric(assetProfile.fullTimeEmployees);

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

const parseQuoteMetrics = (payload, symbol: string) => {
  const quote = payload?.quoteResponse?.result?.[0];
  if (!quote) return null;

  return {
    code: symbol.replace(".T", ""),
    symbol,
    per: Number.isFinite(quote.trailingPE) ? Number(quote.trailingPE) : null,
    pbr: Number.isFinite(quote.priceToBook) ? Number(quote.priceToBook) : null,
    dividendYield: toPercentMetric(Number.isFinite(quote.dividendYield) ? Number(quote.dividendYield) : null),
    roe: toPercentMetric(Number.isFinite(quote.returnOnEquity) ? Number(quote.returnOnEquity) : null),
    marketCap: Number.isFinite(quote.marketCap) ? Number(quote.marketCap) : null,
    enterpriseValue: Number.isFinite(quote.enterpriseValue) ? Number(quote.enterpriseValue) : null,
    employees: Number.isFinite(quote.fullTimeEmployees) ? Number(quote.fullTimeEmployees) : null,
  };
};

const fetchYahooMetrics = async (symbol: string) => {
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

const marketDataPlugin = () => ({
  name: "market-data-api",
  configureServer(server) {
    server.middlewares.use("/api/market-data", async (_req, res) => {
      try {
        const tradingViewIndices = await fetchTradingViewMarketIndices();
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
                const html = await response.text();
                return parseUsdJpy(html);
              })(),
              parseYahooMarketAsset("GOLD", "GC=F"),
              parseYahooMarketAsset("BTC/USDT", "BTC-USD"),
            ]);

        const fallbackIndices = results
          .map((result) => (result.status === "fulfilled" ? result.value : null))
          .filter(Boolean);
        const indices = tradingViewIndices.length ? tradingViewIndices : fallbackIndices;
        const mergedIndices = mergeMarketIndices(indices);
        const source = indices.length === marketDisplayOrder.length ? "live" : indices.length ? "cache" : marketDataCache.source;
        const updatedAt = new Date().toISOString();

        marketDataCache = {
          indices: mergedIndices,
          updatedAt,
          source,
        };

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(marketDataCache));
      } catch (error) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(marketDataCache));
      }
    });
  },
});

const stockQuotePlugin = () => ({
  name: "stock-quote-api",
  configureServer(server) {
    server.middlewares.use("/api/stock-quotes", async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "", "http://localhost");
        const symbols = (requestUrl.searchParams.get("symbols") ?? "")
          .split(",")
          .map((symbol) => symbol.trim())
          .filter(Boolean)
          .slice(0, 60);

        if (!symbols.length) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ quotes: [], error: "symbols required" }));
          return;
        }

        const results = await Promise.allSettled(symbols.map(parseYahooQuote));
        const quotes = results
          .map((result) => (result.status === "fulfilled" ? result.value : null))
          .filter(Boolean);

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ quotes, updatedAt: new Date().toISOString() }));
      } catch {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ quotes: [], error: "stock quotes unavailable" }));
      }
    });
  },
});

const stockMetricsPlugin = () => ({
  name: "stock-metrics-api",
  configureServer(server) {
    server.middlewares.use("/api/stock-metrics", async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "", "http://localhost");
        const symbol = requestUrl.searchParams.get("symbol")?.trim();

        if (!symbol) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "symbol required" }));
          return;
        }

        const metrics = await fetchYahooMetrics(symbol);
        if (!metrics) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "stock metrics unavailable" }));
          return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ metrics, updatedAt: new Date().toISOString() }));
      } catch {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "stock metrics unavailable" }));
      }
    });
  },
});

const stockChartPlugin = () => ({
  name: "stock-chart-api",
  configureServer(server) {
    server.middlewares.use("/api/stock-chart", async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "", "http://localhost");
        const symbol = requestUrl.searchParams.get("symbol")?.trim();
        const range = requestUrl.searchParams.get("range") ?? "2y";
        const interval = requestUrl.searchParams.get("interval") ?? "1d";

        if (!symbol) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ candles: [], error: "symbol required" }));
          return;
        }

        const chart = await parseYahooChart(symbol, range, interval);
        if (!chart) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ candles: [], error: "chart unavailable" }));
          return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(chart));
      } catch {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ candles: [], error: "chart unavailable" }));
      }
    });
  },
});

const smartMoneyPlugin = () => ({
  name: "smart-money-api",
  configureServer(server) {
    server.middlewares.use("/api/smart-money", async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "", "http://localhost");
        const payload = await fetchSmartMoneyData({ force: requestUrl.searchParams.get("force") === "1" });
        sendJson(res, payload);
      } catch {
        sendJson(res, { funds: [], signals: [], error: "smart money unavailable", source: "error" }, 502);
      }
    });
    server.middlewares.use("/api/edinet-document", async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "", "http://localhost");
        const archive = await fetchEdinetDocumentArchive(
          requestUrl.searchParams.get("docId") ?? "",
          requestUrl.searchParams.get("type") ?? "1"
        );
        const disposition = requestUrl.searchParams.get("inline") === "1" ? "inline" : "attachment";
        res.statusCode = 200;
        res.setHeader("Content-Type", archive.contentType);
        res.setHeader("Content-Disposition", `${disposition}; filename="${archive.filename}"`);
        res.setHeader("Link", '</favicon.ico?v=3>; rel="icon"; type="image/x-icon"');
        res.end(archive.buffer);
      } catch (error) {
        sendJson(res, { error: "edinet document unavailable" }, error?.statusCode || 502);
      }
    });
  },
});

const newsSourcePlugin = () => ({
  name: "news-source-api",
  configureServer(server) {
    server.middlewares.use("/api/google-news", async (req, res) => {
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
          sendJson(res, { items: [], error: `HTTP ${response.status}` }, 502);
          return;
        }

        sendText(res, await response.text(), "application/rss+xml; charset=utf-8");
      } catch {
        sendJson(res, { items: [], error: "google news unavailable" }, 502);
      }
    });

    server.middlewares.use("/api/yahoo-business-rss", async (_req, res) => {
      try {
        const response = await fetchWithTimeout("https://news.yahoo.co.jp/rss/topics/business.xml", 5500);
        if (!response.ok) {
          sendJson(res, { items: [], error: `HTTP ${response.status}` }, 502);
          return;
        }

        sendText(res, await response.text(), "application/rss+xml; charset=utf-8");
      } catch {
        sendJson(res, { items: [], error: "yahoo business rss unavailable" }, 502);
      }
    });

    server.middlewares.use("/api/gdelt", async (req, res) => {
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
        const text = await response.text();
        sendText(res, text, "application/json; charset=utf-8", response.ok ? 200 : response.status);
      } catch {
        sendJson(res, { articles: [], error: "gdelt unavailable" }, 502);
      }
    });

    server.middlewares.use("/api/article-summary", async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "", "http://localhost");
        const rawUrl = requestUrl.searchParams.get("url") ?? "";
        const articleUrl = new URL(rawUrl);

        if (!["http:", "https:"].includes(articleUrl.protocol) || isBlockedArticleHost(articleUrl.hostname)) {
          sendJson(res, { summary: "", error: "unsupported article url" }, 400);
          return;
        }

        const response = await fetchWithTimeout(articleUrl.toString(), 8000);
        if (!response.ok) {
          sendJson(res, { summary: "", error: `HTTP ${response.status}` }, 502);
          return;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
          sendJson(res, { summary: "", error: "article is not html" }, 415);
          return;
        }

        const html = await response.text();
        const summary = extractArticleSummaryFromHtml(html);
        if (!summary) {
          sendJson(res, { summary: "", error: "article text unavailable" }, 422);
          return;
        }

        sendJson(res, {
          summary,
          source: articleUrl.hostname.replace(/^www\./, ""),
          extractedAt: new Date().toISOString(),
        });
      } catch {
        sendJson(res, { summary: "", error: "article summary unavailable" }, 502);
      }
    });

    server.middlewares.use("/api/tdnet-list", async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "", "http://localhost");
        const date = requestUrl.searchParams.get("date") ?? new Intl.DateTimeFormat("sv-SE", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()).replaceAll("-", "");
        const response = await fetchWithTimeout(`https://www.release.tdnet.info/inbs/I_list_001_${date}.html`, 7000);
        if (!response.ok) {
          sendJson(res, { items: [], error: `HTTP ${response.status}` }, 502);
          return;
        }

        sendText(res, await response.text(), "text/html; charset=utf-8");
      } catch {
        sendJson(res, { items: [], error: "tdnet list unavailable" }, 502);
      }
    });

    server.middlewares.use("/api/newsapi", async (req, res) => {
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
          sendOptionalSourceError(res, "articles", response.status, payload?.message);
          return;
        }

        sendJson(res, payload);
      } catch {
        sendOptionalSourceError(res, "articles");
      }
    });

    server.middlewares.use("/api/finnhub-news", async (_req, res) => {
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
          sendOptionalSourceError(res, "articles", response.status);
          return;
        }

        sendJson(res, { articles: Array.isArray(payload) ? payload : [], sourceStatus: "live" });
      } catch {
        sendOptionalSourceError(res, "articles");
      }
    });

    server.middlewares.use("/api/marketaux-news", async (req, res) => {
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
          sendOptionalSourceError(res, "data", response.status, payload?.error?.message);
          return;
        }

        sendJson(res, payload);
      } catch {
        sendOptionalSourceError(res, "data");
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/gdelt": {
        target: "https://api.gdeltproject.org",
        changeOrigin: true,
        rewrite: (proxyPath) => proxyPath.replace(/^\/api\/gdelt/, "/api/v2/doc/doc"),
      },
      "/api/google-news": {
        target: "https://news.google.com",
        changeOrigin: true,
        rewrite: (proxyPath) => proxyPath.replace(/^\/api\/google-news/, "/rss/search"),
      },
      "/api/google-finance": {
        target: "https://www.google.com",
        changeOrigin: true,
        rewrite: (proxyPath) => proxyPath.replace(/^\/api\/google-finance/, "/finance/quote"),
      },
    },
  },
  plugins: [marketDataPlugin(), stockQuotePlugin(), stockMetricsPlugin(), stockChartPlugin(), smartMoneyPlugin(), newsSourcePlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
