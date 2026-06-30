import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const googleQuotes = [
  { name: "日経平均", path: "NI225:INDEXNIKKEI", ticker: "NI225", exchange: "INDEXNIKKEI" },
  { name: "TOPIX", path: "TOPIX:INDEXTOPIX", ticker: "TOPIX", exchange: "INDEXTOPIX" },
  { name: "NYダウ", path: ".DJI:INDEXDJX", ticker: ".DJI", exchange: "INDEXDJX" },
  { name: "NASDAQ", path: ".IXIC:INDEXNASDAQ", ticker: ".IXIC", exchange: "INDEXNASDAQ" },
  { name: "S&P500", path: ".INX:INDEXSP", ticker: ".INX", exchange: "INDEXSP" },
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

const fetchWithTimeout = async (url: string, timeoutMs = 4500) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
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

const sendText = (res, text: string, contentType = "text/plain; charset=utf-8", statusCode = 200) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(text);
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
      [item.open, item.high, item.low, item.close].every(Number.isFinite)
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

const marketDataPlugin = () => ({
  name: "market-data-api",
  configureServer(server) {
    server.middlewares.use("/api/market-data", async (_req, res) => {
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
            const html = await response.text();
            return parseUsdJpy(html);
          })(),
          parseYahooMarketAsset("GOLD", "GC=F"),
          parseYahooMarketAsset("BTC/USDT", "BTC-USD"),
        ]);

        const indices = results
          .map((result) => (result.status === "fulfilled" ? result.value : null))
          .filter(Boolean);
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

const newsSourcePlugin = () => ({
  name: "news-source-api",
  configureServer(server) {
    server.middlewares.use("/api/yahoo-business-rss", async (_req, res) => {
      try {
        const response = await fetchWithTimeout("https://news.yahoo.co.jp/rss/topics/business.xml", 7000);
        if (!response.ok) {
          sendJson(res, { items: [], error: `HTTP ${response.status}` }, 502);
          return;
        }

        sendText(res, await response.text(), "application/rss+xml; charset=utf-8");
      } catch {
        sendJson(res, { items: [], error: "yahoo business rss unavailable" }, 502);
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
        sendJson(res, await response.json(), response.ok ? 200 : response.status);
      } catch {
        sendJson(res, { articles: [], error: "newsapi unavailable" }, 502);
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
        const payload = await response.json();
        sendJson(res, { articles: Array.isArray(payload) ? payload : [], sourceStatus: "live" }, response.ok ? 200 : response.status);
      } catch {
        sendJson(res, { articles: [], error: "finnhub news unavailable" }, 502);
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
        sendJson(res, await response.json(), response.ok ? 200 : response.status);
      } catch {
        sendJson(res, { data: [], error: "marketaux news unavailable" }, 502);
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
  plugins: [marketDataPlugin(), stockQuotePlugin(), stockChartPlugin(), newsSourcePlugin(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
