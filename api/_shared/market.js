export const googleQuotes = [
  { name: "日経平均", path: "NI225:INDEXNIKKEI", ticker: "NI225", exchange: "INDEXNIKKEI" },
  { name: "TOPIX", path: "TOPIX:INDEXTOPIX", ticker: "TOPIX", exchange: "INDEXTOPIX" },
  { name: "NYダウ", path: ".DJI:INDEXDJX", ticker: ".DJI", exchange: "INDEXDJX" },
  { name: "NASDAQ", path: ".IXIC:INDEXNASDAQ", ticker: ".IXIC", exchange: "INDEXNASDAQ" },
  { name: "S&P500", path: ".INX:INDEXSP", ticker: ".INX", exchange: "INDEXSP" },
];

export const tradingViewQuotes = [
  { name: "日経平均", symbol: "TVC:NI225" },
  { name: "TOPIX", symbol: "OSE:TOPIX1!" },
  { name: "NYダウ", symbol: "DJ:DJI" },
  { name: "NASDAQ", symbol: "NASDAQ:IXIC" },
  { name: "S&P500", symbol: "SP:SPX" },
  { name: "USD/JPY", symbol: "FX:USDJPY" },
  { name: "GOLD", symbol: "TVC:GOLD" },
  { name: "BTC/USDT", symbol: "BINANCE:BTCUSDT" },
];

export const marketFallbackIndices = [
  { name: "日経平均", value: 39098.68, change: 435.62, changePercent: 1.13 },
  { name: "TOPIX", value: 2768.54, change: 28.17, changePercent: 1.03 },
  { name: "NYダウ", value: 44544.66, change: 317.24, changePercent: 0.72 },
  { name: "NASDAQ", value: 19924.49, change: 188.57, changePercent: 0.96 },
  { name: "S&P500", value: 6083.57, change: 42.36, changePercent: 0.7 },
  { name: "USD/JPY", value: 151.82, change: -0.34, changePercent: -0.22 },
  { name: "GOLD", value: 2325.4, change: 0, changePercent: 0 },
  { name: "BTC/USDT", value: 65000, change: 0, changePercent: 0 },
];

const marketDisplayOrder = marketFallbackIndices.map((item) => item.name);

export const fetchWithTimeout = async (url, timeoutMs = 4500, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const sendJson = (res, payload, statusCode = 200) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=240");
  res.end(JSON.stringify(payload));
};

const parseDisplayNumber = (raw) => Number(raw.replace(/[,%¥$]/g, "").replace("−", "-").trim());

const parseDisplayedQuote = (html) => {
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

export const parseGoogleQuote = (html, ticker, exchange) => {
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

export const parseUsdJpy = (html) => {
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

export const parseYahooQuote = async (symbol) => {
  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
    7000
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

const numberOrFallback = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseYahooQuoteRow = (row) => {
  if (!row?.symbol) return null;

  const price = Number(row.regularMarketPrice);
  const previousClose = Number(row.regularMarketPreviousClose);
  if (!Number.isFinite(price) || !Number.isFinite(previousClose)) return null;

  const change = numberOrFallback(row.regularMarketChange, price - previousClose);
  const changePercent = numberOrFallback(
    row.regularMarketChangePercent,
    previousClose ? (change / previousClose) * 100 : 0
  );
  const code = String(row.symbol).replace(/\.T$/i, "");

  return {
    code,
    symbol: row.symbol,
    price,
    change,
    changePercent,
    volume: numberOrFallback(row.regularMarketVolume, 0),
    open: numberOrFallback(row.regularMarketOpen, price),
    high: numberOrFallback(row.regularMarketDayHigh, price),
    low: numberOrFallback(row.regularMarketDayLow, price),
    previousClose,
  };
};

export const parseYahooQuoteBatch = async (symbols) => {
  const uniqueSymbols = [...new Set(symbols)].filter(Boolean);
  if (!uniqueSymbols.length) return [];

  const params = new URLSearchParams({
    symbols: uniqueSymbols.join(","),
    fields:
      "symbol,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose",
    region: "JP",
    lang: "ja-JP",
  });
  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v7/finance/quote?${params.toString()}`,
    7000
  );
  if (!response.ok) return [];

  const payload = await response.json();
  return (payload?.quoteResponse?.result ?? [])
    .map(parseYahooQuoteRow)
    .filter(Boolean);
};

export const parseYahooMarketAsset = async (name, symbol) => {
  const quote = await parseYahooQuote(symbol);
  return quote
    ? {
        name,
        value: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
      }
    : null;
};

export const fetchTradingViewMarketIndices = async () => {
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

export const parseYahooChart = async (symbol, range = "2y", interval = "1d") => {
  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`,
    8000
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

export const mergeMarketIndices = (items) => {
  const liveByName = new Map(items.map((item) => [item.name, item]));
  return marketDisplayOrder
    .map((name) => liveByName.get(name) ?? marketFallbackIndices.find((item) => item.name === name))
    .filter(Boolean);
};
