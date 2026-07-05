import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { EDINET_SNAPSHOT_SIGNALS } from "./edinet-snapshot.js";

const readLocalEnv = () => {
  const filePath = join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return {};
  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      })
  );
};

const localEnv = readLocalEnv();
const getEnv = (...names) => names.map((name) => process.env[name] || localEnv[name]).find(Boolean) || "";

const SEC_USER_AGENT = getEnv("SEC_USER_AGENT") || "stock-scout-hub/1.0 contact@example.com";
const getEdinetApiKey = () => getEnv("EDINET_API_KEY", "VITE_EDINET_API_KEY");
const makeEdinetDocumentUrl = (docId) => `/api/edinet-document?docId=${encodeURIComponent(docId)}&type=2&inline=1`;

const WATCHED_FUNDS = [
  { id: "brk", name: "Berkshire Hathaway", manager: "Warren Buffett", style: "長期バリュー", jurisdiction: "US", cik: "0001067983", reliability: 96, readable: 88, lagRisk: 72 },
  { id: "pershing", name: "Pershing Square", manager: "Bill Ackman", style: "アクティビスト", jurisdiction: "US", cik: "0001336528", reliability: 89, readable: 82, lagRisk: 58 },
  { id: "baupost", name: "Baupost Group", manager: "Seth Klarman", style: "長期バリュー", jurisdiction: "US", cik: "0001061768", reliability: 86, readable: 74, lagRisk: 69 },
  { id: "thirdpoint", name: "Third Point", manager: "Dan Loeb", style: "イベント", jurisdiction: "US", cik: "0001040273", reliability: 78, readable: 68, lagRisk: 63 },
  { id: "elliott", name: "Elliott Management", manager: "Paul Singer", style: "アクティビスト", jurisdiction: "US", cik: "0001048445", reliability: 84, readable: 70, lagRisk: 49 },
  { id: "appaloosa", name: "Appaloosa", manager: "David Tepper", style: "イベント", jurisdiction: "US", cik: "0001006438", reliability: 76, readable: 58, lagRisk: 76 },
  { id: "duquesne", name: "Duquesne Family Office", manager: "Stanley Druckenmiller", style: "グロース", jurisdiction: "US", cik: "0001536411", reliability: 82, readable: 61, lagRisk: 79 },
  { id: "scion", name: "Scion Asset Management", manager: "Michael Burry", style: "イベント", jurisdiction: "US", cik: "0001649339", reliability: 70, readable: 52, lagRisk: 82 },
  { id: "japan-activist", name: "日本株アクティビスト群", manager: "大量保有報告書", style: "アクティビスト", jurisdiction: "JP", reliability: 79, readable: 76, lagRisk: 34 },
];

const fallbackSignals = [
  {
    id: "fallback-s1",
    fundId: "brk",
    ticker: "OXY",
    company: "Occidental Petroleum",
    filingType: "13F",
    signalType: "買い増し",
    reportDate: "2026-03-31",
    filingDate: "2026-05-15",
    portfolioWeight: 4.8,
    positionChange: 9.5,
    priceMoveSinceReport: 3.2,
    multiFundCount: 2,
    activistIntent: false,
    concentrationRank: 7,
    note: "外部API未取得時のフォールバック。実データ取得後に置き換わります。",
    source: "fallback",
  },
  {
    id: "fallback-s2",
    fundId: "elliott",
    ticker: "SBUX",
    company: "Starbucks",
    filingType: "13D",
    signalType: "大量保有",
    reportDate: "2026-06-20",
    filingDate: "2026-06-25",
    portfolioWeight: 5.2,
    positionChange: 100,
    priceMoveSinceReport: 5.9,
    multiFundCount: 3,
    activistIntent: true,
    concentrationRank: 6,
    note: "外部API未取得時のフォールバック。13D/EDINETは本文確認が必須です。",
    source: "fallback",
  },
];

const CUSIP_TICKERS = {
  "02079K107": "GOOGL",
  "02079K305": "GOOG",
  "023135106": "AMZN",
  "025816109": "AXP",
  "037833100": "AAPL",
  "060505104": "BAC",
  "166764100": "CVX",
  "191216100": "KO",
  "30303M102": "META",
  "37045V100": "GM",
  "406216101": "HAL",
  "457669307": "INSM",
  "550021109": "LULU",
  "576323109": "MTZ",
  "594918104": "MSFT",
  "632307104": "NTRA",
  "67066G104": "NVDA",
  "674599105": "OXY",
  "69608A108": "PLTR",
  "717081103": "PFE",
  "76131D103": "QSR",
  "78442P106": "SLM",
  "78462F103": "SPY",
  "874039100": "TSM",
  "879433829": "TDS",
  "90353T100": "UBER",
  "907818108": "UNP",
  "95082P105": "WCC",
  "963320106": "WHR",
};

let smartMoneyCache = {
  payload: null,
  updatedAt: 0,
};

const edinetDocumentCache = new Map();

const fetchWithTimeout = async (url, timeoutMs = 8000, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const secHeaders = () => ({
  "Accept": "application/json, text/plain, */*",
  "User-Agent": SEC_USER_AGENT,
});

const edinetHeaders = (apiKey, accept = "application/json, text/plain, */*") => ({
  Accept: accept,
  "User-Agent": SEC_USER_AGENT,
  "Subscription-Key": apiKey,
});

const formatJstDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const daysAgo = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return formatJstDateKey(date);
};

const isRecentFilingDate = (filingDate, maxAgeDays = 1100) => {
  if (!filingDate) return false;
  const filedAt = new Date(filingDate).getTime();
  if (!Number.isFinite(filedAt)) return false;
  return Date.now() - filedAt <= maxAgeDays * 24 * 60 * 60 * 1000;
};

const normalizeCik = (cik) => String(cik).replace(/\D/g, "").padStart(10, "0");
const accessionPath = (cik, accessionNumber) => `${Number(cik)}/${String(accessionNumber).replaceAll("-", "")}`;

const asArray = (value) => Array.isArray(value) ? value : [];

const getRecentFilings = async (fund) => {
  const response = await fetchWithTimeout(
    `https://data.sec.gov/submissions/CIK${normalizeCik(fund.cik)}.json`,
    8000,
    { headers: secHeaders() }
  );
  if (!response.ok) throw new Error(`SEC submissions ${response.status}`);
  const payload = await response.json();
  const recent = payload?.filings?.recent ?? {};
  return asArray(recent.accessionNumber).map((accessionNumber, index) => ({
    accessionNumber,
    filingDate: recent.filingDate?.[index] ?? "",
    reportDate: recent.reportDate?.[index] ?? recent.filingDate?.[index] ?? "",
    form: recent.form?.[index] ?? "",
    primaryDocument: recent.primaryDocument?.[index] ?? "",
    primaryDocDescription: recent.primaryDocDescription?.[index] ?? "",
  }));
};

const fetchFilingIndex = async (fund, filing) => {
  const response = await fetchWithTimeout(
    `https://www.sec.gov/Archives/edgar/data/${accessionPath(fund.cik, filing.accessionNumber)}/index.json`,
    8000,
    { headers: secHeaders() }
  );
  if (!response.ok) return [];
  const payload = await response.json();
  return asArray(payload?.directory?.item);
};

const findInfoTableFile = (items) =>
  items.find((item) => /info(table)?|form13f/i.test(item.name) && /\.xml$/i.test(item.name))
  ?? items.find((item) => /\.xml$/i.test(item.name) && !/primary/i.test(item.name));

const getXmlTag = (xml, tag) => {
  const match = xml.match(new RegExp(`<[^:>/]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "";
};

const getXmlTagFromContext = (xml, tag, contextRef) => {
  const escapedContext = String(contextRef).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<[^:>/]*:?${tag}\\b[^>]*contextRef=["']${escapedContext}["'][^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "";
};

const getXmlTagFromContextPattern = (xml, tag, contextPattern) => {
  const entries = [...xml.matchAll(new RegExp(`<[^:>/]*:?${tag}\\b[^>]*contextRef=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, "gi"))];
  const found = entries.find((entry) => contextPattern.test(entry[1]));
  return found ? decodeXml(found[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "";
};

const normalizeJapaneseSecurityCode = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(0, 4);
  return "";
};

const unzipTextEntries = (arrayBuffer) => {
  const buffer = Buffer.from(arrayBuffer);
  const entries = [];
  let eocdOffset = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) return entries;

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString("utf8");

    if (/\.(xbrl|xml|htm|html)$/i.test(name) && buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const raw = method === 8 ? inflateRawSync(compressed) : method === 0 ? compressed : null;
      if (raw) entries.push({ name, text: raw.toString("utf8") });
    }

    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
};

const decodeXml = (value) =>
  String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const parseInfoTable = (xml) => {
  const entries = [...xml.matchAll(/<[^:>/]*:?infoTable[^>]*>([\s\S]*?)<\/[^:>]*:?infoTable>/gi)];
  return entries.map((entry) => {
    const block = entry[1];
    const value = Number(getXmlTag(block, "value"));
    const shares = Number(getXmlTag(block, "sshPrnamt"));
    const cusip = getXmlTag(block, "cusip");
    return {
      company: getXmlTag(block, "nameOfIssuer") || "Unknown issuer",
      ticker: CUSIP_TICKERS[cusip] || cusip || "CUSIP",
      cusip,
      value: Number.isFinite(value) ? value : 0,
      shares: Number.isFinite(shares) ? shares : 0,
      title: getXmlTag(block, "titleOfClass"),
    };
  }).filter((item) => item.value > 0 || item.shares > 0);
};

const parseEdinetLargeHoldingXbrl = (xbrlText, fallback = {}) => {
  const issuerName = getXmlTag(xbrlText, "NameOfIssuer");
  const issuerCode = normalizeJapaneseSecurityCode(getXmlTag(xbrlText, "SecurityCodeOfIssuer"));
  const filerName =
    getXmlTagFromContextPattern(xbrlText, "Name", /FilerLargeVolumeHolder1Member/)
    || getXmlTag(xbrlText, "NameCoverPage")
    || getXmlTag(xbrlText, "FilerNameInJapaneseDEI")
    || fallback.filerName
    || "";
  const holdingRatioRaw = getXmlTagFromContext(xbrlText, "HoldingRatioOfShareCertificatesEtc", "FilingDateInstant");
  const holdingRatio = Number(holdingRatioRaw);
  const purpose = getXmlTag(xbrlText, "PurposeOfHolding");

  return {
    issuerName,
    issuerCode,
    filerName,
    purpose,
    holdingRatio: Number.isFinite(holdingRatio) ? holdingRatio * 100 : null,
  };
};

const fetchEdinetDocumentDetail = async (docId, apiKey, fallback = {}) => {
  if (!docId || !apiKey) return {};
  if (edinetDocumentCache.has(docId)) return edinetDocumentCache.get(docId);

  try {
    const url = new URL(`https://api.edinet-fsa.go.jp/api/v2/documents/${encodeURIComponent(docId)}`);
    url.searchParams.set("type", "1");
    url.searchParams.set("Subscription-Key", apiKey);
    const response = await fetchWithTimeout(url.toString(), 9000, {
      headers: edinetHeaders(apiKey, "application/octet-stream, application/zip, */*"),
    });
    if (!response.ok) return {};
    const entries = unzipTextEntries(await response.arrayBuffer());
    const xbrlEntry =
      entries.find((entry) => /XBRL\/PublicDoc\/.*\.xbrl$/i.test(entry.name))
      ?? entries.find((entry) => /\.xbrl$/i.test(entry.name))
      ?? entries.find((entry) => /honbun.*\.htm/i.test(entry.name));
    const detail = xbrlEntry ? parseEdinetLargeHoldingXbrl(xbrlEntry.text, fallback) : {};
    edinetDocumentCache.set(docId, detail);
    return detail;
  } catch {
    return {};
  }
};

export const fetchEdinetDocumentArchive = async (docId, type = "1") => {
  const apiKey = getEdinetApiKey();
  if (!apiKey) {
    const error = new Error("EDINET API key is missing");
    error.statusCode = 401;
    throw error;
  }
  if (!docId || !/^[A-Z0-9_-]+$/i.test(String(docId))) {
    const error = new Error("Invalid EDINET document id");
    error.statusCode = 400;
    throw error;
  }

  const normalizedType = ["1", "2", "3", "4", "5"].includes(String(type)) ? String(type) : "1";
  const url = new URL(`https://api.edinet-fsa.go.jp/api/v2/documents/${encodeURIComponent(docId)}`);
  url.searchParams.set("type", normalizedType);
  url.searchParams.set("Subscription-Key", apiKey);

  const response = await fetchWithTimeout(url.toString(), 12000, {
    headers: edinetHeaders(
      apiKey,
      normalizedType === "2" ? "application/pdf, application/octet-stream, */*" : "application/octet-stream, application/zip, */*"
    ),
  });
  if (!response.ok) {
    const error = new Error(`EDINET document download failed: ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: normalizedType === "2" ? "application/pdf" : response.headers.get("content-type") || "application/zip",
    filename: `edinet-${docId}.${normalizedType === "2" ? "pdf" : "zip"}`,
  };
};

const fetchInfoTable = async (fund, filing) => {
  const items = await fetchFilingIndex(fund, filing);
  const infoFile = findInfoTableFile(items);
  if (!infoFile) return [];
  const response = await fetchWithTimeout(
    `https://www.sec.gov/Archives/edgar/data/${accessionPath(fund.cik, filing.accessionNumber)}/${infoFile.name}`,
    9000,
    { headers: secHeaders() }
  );
  if (!response.ok) return [];
  return parseInfoTable(await response.text());
};

const extractTextField = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, " ").trim();
  }
  return "";
};

const fetchPrimaryText = async (fund, filing) => {
  if (!filing.primaryDocument) return "";
  const response = await fetchWithTimeout(
    `https://www.sec.gov/Archives/edgar/data/${accessionPath(fund.cik, filing.accessionNumber)}/${filing.primaryDocument}`,
    8000,
    { headers: { ...secHeaders(), Accept: "text/html, text/plain, */*" } }
  );
  if (!response.ok) return "";
  return await response.text();
};

const makeFilingUrl = (fund, filing) =>
  `https://www.sec.gov/Archives/edgar/data/${accessionPath(fund.cik, filing.accessionNumber)}/${filing.primaryDocument || ""}`;

const buildThirteenFSignals = async (fund, filings) => {
  const thirteenFs = filings.filter((filing) => /^13F-HR/.test(filing.form)).slice(0, 2);
  if (!thirteenFs.length) return [];

  const [latest, previous] = thirteenFs;
  const [latestRows, previousRows] = await Promise.all([
    fetchInfoTable(fund, latest),
    previous ? fetchInfoTable(fund, previous) : Promise.resolve([]),
  ]);
  const previousByCusip = new Map(previousRows.map((row) => [row.cusip || row.ticker || row.company, row]));
  const totalValue = latestRows.reduce((sum, row) => sum + row.value, 0) || 1;

  return latestRows
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((row, index) => {
      const key = row.cusip || row.ticker || row.company;
      const previous = previousByCusip.get(key);
      const previousShares = previous?.shares ?? 0;
      const positionChange = previousShares ? ((row.shares - previousShares) / previousShares) * 100 : 100;
      const signalType = previousShares ? (positionChange >= 0 ? "買い増し" : "縮小") : "新規買い";
      return {
        id: `${fund.id}-${latest.accessionNumber}-${key}-${index}`,
        fundId: fund.id,
        ticker: row.ticker,
        company: row.company,
        filingType: "13F",
        signalType,
        reportDate: latest.reportDate || latest.filingDate,
        filingDate: latest.filingDate,
        portfolioWeight: (row.value / totalValue) * 100,
        positionChange,
        priceMoveSinceReport: 0,
        multiFundCount: 1,
        activistIntent: false,
        concentrationRank: index + 1,
        note: `SEC 13F information tableから自動取得。${previousShares ? "前回提出との差分を比較済み。" : "前回提出に見当たらない新規候補。"}`,
        source: "sec",
        sourceUrl: makeFilingUrl(fund, latest),
      };
    });
};

const buildScheduleSignals = async (fund, filings) => {
  const schedules = filings.filter((filing) => /^SC 13[DG]/.test(filing.form)).slice(0, 3);
  const signals = await Promise.all(schedules.map(async (filing) => {
    const text = await fetchPrimaryText(fund, filing);
    const company = extractTextField(text, [
      /Name of Issuer\)?\s*[:\n]\s*([^<\n]+)/i,
      /Title of Class.*?Name of Issuer.*?([A-Z][A-Za-z0-9.,&\-\s]{3,80})/is,
    ]) || filing.primaryDocDescription || "Schedule issuer";
    const cusip = extractTextField(text, [/CUSIP Number\)?\s*[:\n]\s*([A-Z0-9]{6,12})/i]) || "CUSIP";

    return {
      id: `${fund.id}-${filing.accessionNumber}`,
      fundId: fund.id,
      ticker: cusip,
      company,
      filingType: filing.form.includes("13D") ? "13D" : "13G",
      signalType: "大量保有",
      reportDate: filing.reportDate || filing.filingDate,
      filingDate: filing.filingDate,
      portfolioWeight: 5,
      positionChange: 100,
      priceMoveSinceReport: 0,
      multiFundCount: 1,
      activistIntent: filing.form.includes("13D"),
      concentrationRank: 5,
      note: "SEC Schedule 13D/13Gを自動検知。保有目的とItem 4/5の本文確認が必要です。",
      source: "sec",
      sourceUrl: makeFilingUrl(fund, filing),
    };
  }));
  return signals;
};

const fetchSecSignals = async () => {
  const activeFunds = WATCHED_FUNDS.filter((fund) => fund.jurisdiction === "US");
  const settled = await Promise.allSettled(activeFunds.map(async (fund) => {
    const filings = (await getRecentFilings(fund)).filter((filing) => isRecentFilingDate(filing.filingDate));
    const [thirteenFSignals, scheduleSignals] = await Promise.all([
      buildThirteenFSignals(fund, filings),
      buildScheduleSignals(fund, filings),
    ]);
    return [...scheduleSignals, ...thirteenFSignals];
  }));

  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
};

const fetchEdinetSignals = async () => {
  const edinetApiKey = getEdinetApiKey();
  if (!edinetApiKey) {
    return { signals: [], status: "missing-key" };
  }

  const signals = [];
  const maxSignals = 42;
  let successfulListRequests = 0;
  let failedListRequests = 0;
  for (let offset = 0; offset < 5 && signals.length < maxSignals; offset += 1) {
    const date = daysAgo(offset);
    const url = new URL("https://api.edinet-fsa.go.jp/api/v2/documents.json");
    url.searchParams.set("date", date);
    url.searchParams.set("type", "2");
    url.searchParams.set("Subscription-Key", edinetApiKey);
    const response = await fetchWithTimeout(url.toString(), 8000, {
      headers: edinetHeaders(edinetApiKey),
    });
    if (!response.ok) {
      failedListRequests += 1;
      continue;
    }
    successfulListRequests += 1;
    const payload = await response.json();
    const results = asArray(payload?.results);
    const targetDocs = results
      .filter((doc) => /大量保有報告書|変更報告書/.test(String(doc.docDescription ?? "")))
      .slice(0, Math.max(0, maxSignals - signals.length));
    for (const doc of targetDocs) {
      const description = String(doc.docDescription ?? "");
      const listedFilerName = doc.filerName || doc.submitterName || "";
      const detail = await fetchEdinetDocumentDetail(doc.docID, edinetApiKey, { filerName: listedFilerName });
      const issuerName = detail.issuerName || "対象銘柄不明";
      const issuerCode = detail.issuerCode || "";
      const filerName = detail.filerName || listedFilerName || "提出者不明";
      const holdingRatio = detail.holdingRatio ?? 5;
      signals.push({
        id: `edinet-${doc.docID}`,
        fundId: "japan-activist",
        ticker: issuerCode || "EDINET",
        company: issuerName,
        filerName,
        filingType: "EDINET",
        signalType: "大量保有",
        reportDate: doc.periodEnd ?? date,
        filingDate: date,
        portfolioWeight: holdingRatio,
        positionChange: 100,
        priceMoveSinceReport: 0,
        multiFundCount: 1,
        activistIntent: true,
        concentrationRank: 4,
        note: `${description}をEDINET APIから自動検知。${detail.issuerName ? "XBRLから対象銘柄を解析済み。" : "対象銘柄はXBRLから自動特定できませんでした。"}保有目的、共同保有者、変更理由の本文確認が必要です。`,
        source: "edinet",
        sourceUrl: makeEdinetDocumentUrl(doc.docID),
      });
    }
  }
  if (signals.length) return { signals, status: "live" };
  if (!successfulListRequests && failedListRequests && EDINET_SNAPSHOT_SIGNALS.length) {
    return { signals: EDINET_SNAPSHOT_SIGNALS, status: "snapshot" };
  }
  return { signals, status: successfulListRequests ? "empty" : failedListRequests ? "error" : "empty" };
};

const mergeMultiFundCounts = (signals) => {
  const counts = new Map();
  for (const signal of signals) {
    const key = `${signal.company}`.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return signals.map((signal) => ({
    ...signal,
    multiFundCount: counts.get(`${signal.company}`.toLowerCase()) ?? signal.multiFundCount,
  }));
};

const yahooSymbolForSignal = (signal) => {
  if (/^\d{4}$/.test(signal.ticker)) return `${signal.ticker}.T`;
  if (/^[A-Z][A-Z.\-]{0,7}$/.test(signal.ticker)) return signal.ticker;
  return "";
};

const fetchPriceMoveSinceReport = async (signal) => {
  const symbol = yahooSymbolForSignal(signal);
  if (!symbol || !signal.reportDate) return null;
  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
    7000
  );
  if (!response.ok) return null;
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const timestamps = asArray(result?.timestamp);
  const closes = asArray(result?.indicators?.quote?.[0]?.close);
  if (!timestamps.length || !closes.length) return null;

  const reportTime = new Date(signal.reportDate).getTime() / 1000;
  const validRows = timestamps
    .map((timestamp, index) => ({ timestamp, close: Number(closes[index]) }))
    .filter((row) => Number.isFinite(row.timestamp) && Number.isFinite(row.close) && row.close > 0);
  const reportRow = validRows.find((row) => row.timestamp >= reportTime) ?? validRows[0];
  const latestRow = validRows.at(-1);
  if (!reportRow || !latestRow) return null;

  return ((latestRow.close - reportRow.close) / reportRow.close) * 100;
};

const enrichPriceMoves = async (signals) => {
  let enrichedCount = 0;
  const enriched = await Promise.all(signals.map(async (signal) => {
    try {
      const priceMove = await fetchPriceMoveSinceReport(signal);
      if (priceMove === null) return signal;
      enrichedCount += 1;
      return {
        ...signal,
        priceMoveSinceReport: priceMove,
        note: `${signal.note} 報告日以降の価格反応をYahoo Finance日足で再評価済み。`,
      };
    } catch {
      return signal;
    }
  }));

  return {
    signals: enriched,
    status: enrichedCount ? (enrichedCount === signals.length ? "live" : "partial") : "not-connected",
  };
};

export const fetchSmartMoneyData = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && smartMoneyCache.payload && now - smartMoneyCache.updatedAt < 10 * 60 * 1000) {
    return smartMoneyCache.payload;
  }

  const [secResult, edinetResult] = await Promise.allSettled([
    fetchSecSignals(),
    fetchEdinetSignals(),
  ]);
  const secSignals = secResult.status === "fulfilled" ? secResult.value : [];
  const edinetPayload = edinetResult.status === "fulfilled" ? edinetResult.value : { signals: [], status: "error" };
  const balancedSignals = [
    ...edinetPayload.signals.slice(0, 42),
    ...secSignals.slice(0, 36),
  ];
  const liveSignals = mergeMultiFundCounts(balancedSignals).slice(0, 78);
  const pricePayload = liveSignals.length ? await enrichPriceMoves(liveSignals) : { signals: [], status: "not-connected" };
  const signals = pricePayload.signals.length ? pricePayload.signals : fallbackSignals;
  const sourceStatus = {
    sec: secResult.status === "fulfilled" && secSignals.length ? "live" : secResult.status === "fulfilled" ? "empty" : "error",
    edinet: edinetPayload.status,
    price: pricePayload.status,
  };
  const payload = {
    funds: WATCHED_FUNDS,
    signals,
    updatedAt: new Date().toISOString(),
    sourceStatus,
    source: liveSignals.length ? "live" : "fallback",
  };

  smartMoneyCache = { payload, updatedAt: now };
  return payload;
};
