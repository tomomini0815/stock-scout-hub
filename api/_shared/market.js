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

const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const fetchWithTimeout = async (url, timeoutMs = 4500, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "User-Agent": BROWSER_USER_AGENT,
    ...(init.headers || {}),
  };
  try {
    return await fetch(url, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// --- Circuit breaker: 403を検知し、half-open対応でリクエストを制御 ---
// 状態: closed(通常) → open(ブロック) → half-open(プローブ) → closed or open
const circuitBreakers = new Map();
const INITIAL_COOLDOWN_MS = 30 * 1000;  // 最初は30秒のみ
const MAX_COOLDOWN_MS = 5 * 60 * 1000;  // 最大5分

const getDomain = (url) => {
  try { return new URL(url).hostname; } catch { return url; }
};

export const isCircuitOpen = (url) => {
  const domain = getDomain(url);
  const entry = circuitBreakers.get(domain);
  if (!entry) return false;
  const elapsed = Date.now() - entry.openedAt;
  const cooldown = Math.min(INITIAL_COOLDOWN_MS * 2 ** (entry.failCount - 1), MAX_COOLDOWN_MS);
  if (elapsed > cooldown) {
    entry.halfOpen = true;
    return false; // half-open: リクエストを1つ通す
  }
  return true;
};

export const tripCircuit = (url) => {
  const domain = getDomain(url);
  const existing = circuitBreakers.get(domain);
  if (existing?.halfOpen) {
    // half-openでまた失敗 → cooldownを倍にして再ブロック
    existing.failCount += 1;
    existing.openedAt = Date.now();
    existing.halfOpen = false;
  } else if (!existing || Date.now() - existing.openedAt > MAX_COOLDOWN_MS) {
    circuitBreakers.set(domain, { openedAt: Date.now(), failCount: 1, halfOpen: false });
  }
};

export const resolveCircuit = (url) => {
  const domain = getDomain(url);
  circuitBreakers.delete(domain); // 成功 → 完全に解除
};

export const getCircuitState = (url) => {
  const domain = getDomain(url);
  return circuitBreakers.get(domain) ?? null;
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  if (isCircuitOpen(url)) return null;
  const response = await fetchWithTimeout(url, 7000);
  if (!response.ok) {
    if (response.status === 403) tripCircuit(url);
    return null;
  }
  resolveCircuit(url);

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
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?${params.toString()}`;
  if (isCircuitOpen(yahooUrl)) return [];
  const response = await fetchWithTimeout(yahooUrl, 7000);
  if (!response.ok) {
    if (response.status === 403) tripCircuit(yahooUrl);
    return [];
  }
  resolveCircuit(yahooUrl);

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
  const tvUrl = "https://scanner.tradingview.com/global/scan";
  if (isCircuitOpen(tvUrl)) return [];
  const response = await fetchWithTimeout(
    tvUrl,
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
  if (!response.ok) {
    if (response.status === 403) tripCircuit(tvUrl);
    return [];
  }
  resolveCircuit(tvUrl);

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

const knownStockPrices = {
  // 主要指数
  "^N225": 64800,
  "N225": 64800,
  "NI225": 64800,
  "TOPIX": 4050,
  "^DJI": 52002,
  "DJI": 52002,
  "^IXIC": 26140,
  "IXIC": 26140,
  "^GSPC": 7659,
  "SPX": 7659,
  "USDJPY": 158.4,
  // 主要個別銘柄
  "7203": 2980, // トヨタ
  "7267": 1420, // ホンダ
  "8058": 4761, // 三菱商事
  "8001": 7800, // 伊藤忠
  "8306": 1850, // 三菱UFJ
  "8316": 11200, // 三井住友
  "6857": 8450, // アドバンテスト
  "8035": 28500, // 東京エレクトロン
  "6920": 21500, // レーザーテック
  "6146": 39500, // ディスコ
  "9432": 152, // NTT
  "9433": 4750, // KDDI
  "9984": 9200, // ソフトバンクG
  "6758": 2850, // ソニーG
  "7974": 8100, // 任天堂
  "7011": 2150, // 三菱重工
  "7012": 6200, // 川崎重工
};

export const generateFallbackChart = (symbol) => {
  const cleanSymbol = symbol.toUpperCase().replace(/\..*$/, "");
  const code = symbol.replace(/\..*$/, "");
  const num = parseInt(code.replace(/\D/g, "") || "7203", 10);
  const basePrice =
    knownStockPrices[symbol] ??
    knownStockPrices[cleanSymbol] ??
    knownStockPrices[code] ??
    (cleanSymbol.includes("225") ? 64800 : null) ??
    (cleanSymbol.includes("TOPIX") ? 4050 : null) ??
    (cleanSymbol.includes("DJI") ? 52002 : null) ??
    (cleanSymbol.includes("IXIC") || cleanSymbol.includes("NASDAQ") ? 26140 : null) ??
    (cleanSymbol.includes("SPX") || cleanSymbol.includes("GSPC") ? 7659 : null) ??
    Math.round(1500 + ((num * 37) % 3500));

  const candles = [];
  const now = new Date();
  const days = [];
  let cur = new Date(now);
  while (days.length < 320) {
    cur.setDate(cur.getDate() - 1);
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.unshift(new Date(cur));
    }
  }

  let seed = num * 199 + 17;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let trendPrice = basePrice * 0.85;
  const priceStep = (basePrice - trendPrice) / days.length;

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    trendPrice += priceStep;
    const changePct = (pseudoRandom() - 0.48) * 0.035;
    const prevClose = i === 0 ? trendPrice : candles[i - 1].close;
    const close = Math.round(Math.max(10, prevClose * (1 + changePct)));
    const open = Math.round(prevClose * (1 + (pseudoRandom() - 0.5) * 0.01));
    const high = Math.round(Math.max(open, close) * (1 + pseudoRandom() * 0.012));
    const low = Math.round(Math.min(open, close) * (1 - pseudoRandom() * 0.012));
    const volume = Math.round(500000 + pseudoRandom() * 3000000);

    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    candles.push({
      date: dateStr,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  if (candles.length > 0) {
    const rawLastClose = candles[candles.length - 1].close;
    if (rawLastClose > 0) {
      const scale = basePrice / rawLastClose;
      for (const candle of candles) {
        candle.open = Math.round(candle.open * scale);
        candle.high = Math.round(candle.high * scale);
        candle.low = Math.round(candle.low * scale);
        candle.close = Math.round(candle.close * scale);
      }
    }
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, last.open, basePrice);
    last.low = Math.min(last.low, last.open, basePrice);
  }

  return {
    symbol,
    currency: "JPY",
    candles,
    updatedAt: new Date().toISOString(),
    isFallback: true,
  };
};

export const parseYahooChart = async (symbol, range = "2y", interval = "1d") => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
    if (isCircuitOpen(url)) return generateFallbackChart(symbol);
    const response = await fetchWithTimeout(url, 5000).catch(() => null);
    if (!response || !response.ok) {
      if (response?.status === 403 || response?.status === 429) tripCircuit(url);
      return generateFallbackChart(symbol);
    }
    resolveCircuit(url);

    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];
    if (!timestamps.length || !quote) return generateFallbackChart(symbol);

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
      : generateFallbackChart(symbol);
  } catch {
    return generateFallbackChart(symbol);
  }
};

export const mergeMarketIndices = (items) => {
  const liveByName = new Map(items.map((item) => [item.name, item]));
  return marketDisplayOrder
    .map((name) => liveByName.get(name) ?? marketFallbackIndices.find((item) => item.name === name))
    .filter(Boolean);
};
