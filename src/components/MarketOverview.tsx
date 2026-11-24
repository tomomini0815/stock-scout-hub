import { type MarketIndex } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { isIndexMarketAfterHours } from "@/lib/marketHours";
import {
  ALL_INDICATOR_NAMES,
  computeIndicatorSnapshotFromCandles,
  DEFAULT_SELECTED_INDICATORS,
  loadSelectedMarketIndicators,
  MARKET_INDICATOR_CATEGORIES,
  PRO_INDICATOR_BY_NAME,
  PRO_MARKET_INDICATORS,
  PRO_PRESET_INDICATORS,
  saveSelectedMarketIndicators,
  type ExtraIndicatorSnapshot,
} from "@/lib/proMarketIndicators";
import { RateVoiceAlertControl } from "@/components/RateVoiceAlertControl";
import TradingViewQuadPanel from "@/components/TradingViewQuadPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Check,
  LayoutGrid,
  Minus,
  Newspaper,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface MarketOverviewProps {
  indices: MarketIndex[];
  detailed?: boolean;
}

type MarketDriverStatus = "loading" | "live" | "fallback";
type UrgentDriverStatus = "checking" | "ready" | "unknown";

interface MarketDriverNews {
  title: string;
  source: string;
  publishedAt?: string;
}

interface MarketDriverCache {
  items: MarketDriverNews[];
  updatedAt: string;
}

const MARKET_DRIVER_CACHE_KEY = "stock-scout-market-drivers-v1";
const MARKET_DRIVER_CACHE_MS = 1000 * 60 * 20;
const URGENT_MOVE_THRESHOLD = 1.5;
const URGENT_NEWS_MAX_AGE_MS = 1000 * 60 * 60 * 24;

const indexChartConfigs = [
  { id: "nikkei", name: "日経225 (CFD)", symbol: "OANDA:JP225USD" },
  { id: "topix", name: "TOPIX先物", symbol: "OSE:TOPIX1!" },
  { id: "dow", name: "NYダウ (CFD)", symbol: "OANDA:US30USD" },
  { id: "nasdaq", name: "NASDAQ100 (CFD)", symbol: "OANDA:NAS100USD" },
  { id: "sp500", name: "S&P500 (CFD)", symbol: "OANDA:SPX500USD" },
  { id: "usdjpy", name: "USD/JPY", symbol: "FX:USDJPY" },
  { id: "gold", name: "GOLD", symbol: "TVC:GOLD" },
  { id: "btc", name: "BTC/USDT", symbol: "BINANCE:BTCUSDT" },
];

const chartIndexMatchers: Record<string, RegExp> = {
  nikkei: /日経/,
  topix: /TOPIX/,
  dow: /ダウ/,
  nasdaq: /NASDAQ/,
  sp500: /S&P/,
  usdjpy: /USD|JPY|ドル|円/,
  gold: /GOLD|金/,
  btc: /BTC|ビットコイン/,
};

const driverFallbackNews: MarketDriverNews[] = [
  { title: "日本株は為替、米金利、海外株、半導体関連の動きをにらみながら推移", source: "市況推定" },
  { title: "日経平均は値がさ株、TOPIXは銀行・自動車など主力株の広がりを確認", source: "市況推定" },
  { title: "米国株とドル円の方向感が短期の指数材料として意識されやすい展開", source: "市況推定" },
];

const decodeHtml = (value: string) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const loadCachedDrivers = () => {
  try {
    const raw = localStorage.getItem(MARKET_DRIVER_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as MarketDriverCache;
    const items = parsed.items?.filter((item) => item.title) ?? [];
    if (!items.length) return undefined;
    return { items, updatedAt: parsed.updatedAt };
  } catch {
    return undefined;
  }
};

const saveCachedDrivers = (items: MarketDriverNews[]) => {
  try {
    localStorage.setItem(
      MARKET_DRIVER_CACHE_KEY,
      JSON.stringify({ items, updatedAt: new Date().toISOString() } satisfies MarketDriverCache)
    );
  } catch {
    // News drivers are an enhancement only.
  }
};

const mapRssTitles = (xmlText: string, fallbackSource: string) => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  return Array.from(doc.querySelectorAll("item"))
    .map((item) => ({
      title: decodeHtml(item.querySelector("title")?.textContent?.replace(/\s+-\s+[^-]+$/, "").trim() ?? ""),
      source: item.querySelector("source")?.textContent?.trim() || fallbackSource,
      publishedAt: item.querySelector("pubDate")?.textContent?.trim() || undefined,
    }))
    .filter((item) => item.title);
};

const getIndexPatterns = (name: string) => {
  if (/日経/.test(name)) return [/日経平均|日本株|東京株|東証|半導体|AI|先物|円|ドル|米株|ナスダック/];
  if (/TOPIX/.test(name)) return [/TOPIX|東証|日本株|銀行|自動車|内需|円|金利|日銀/];
  if (/ダウ/.test(name)) return [/ダウ|NY株|米国株|米景気|金利|FOMC|FRB/];
  if (/NASDAQ|S&P/.test(name)) return [/ナスダック|NASDAQ|S&P|米国株|AI|半導体|金利|FOMC|FRB/];
  if (/BTC|ビットコイン/.test(name)) return [/ビットコイン|BTC|暗号資産|仮想通貨|ETF|リスク資産/];
  if (/USD|JPY|ドル|円/.test(name)) return [/円|ドル|為替|日銀|FRB|金利|介入/];
  if (/GOLD|金/.test(name)) return [/金|ゴールド|金利|ドル|地政学|インフレ/];
  return [/市場|相場|株価|金利|為替|海外/];
};

const scoreDriverMatch = (indexName: string, title: string) => {
  if (/ロト|宝くじ|当せん|当選|1等|抽せん/.test(title)) return 0;
  if (/BTC|ビットコイン/.test(indexName)) {
    return /ビットコイン|BTC|暗号資産|仮想通貨|ETF|リスク資産/.test(title) ? 8 : 0;
  }

  const patterns = getIndexPatterns(indexName);
  let score = patterns.some((pattern) => pattern.test(title)) ? 3 : 0;

  if (/日経/.test(indexName) && /日経平均|日本株|東京株|東証|半導体|先物/.test(title)) score += 4;
  if (/TOPIX/.test(indexName) && /TOPIX|東証|日本株|銀行|自動車|内需/.test(title)) score += 4;
  if (/ダウ/.test(indexName) && /ダウ|NY株|米国株|米景気/.test(title)) score += 4;
  if (/NASDAQ|S&P/.test(indexName) && /ナスダック|NASDAQ|S&P|米国株|AI|半導体/.test(title)) score += 4;
  if (/USD|JPY|ドル|円/.test(indexName) && /円|ドル|為替|日銀|FRB|金利|介入/.test(title)) score += 5;
  if (/GOLD|金/.test(indexName) && /金|ゴールド|金利|ドル|地政学|インフレ/.test(title)) score += 5;

  return score;
};

const isFreshDriverNews = (item: MarketDriverNews) => {
  if (!item.publishedAt) return true;
  const publishedTime = Date.parse(item.publishedAt);
  if (!Number.isFinite(publishedTime)) return true;
  return Date.now() - publishedTime <= URGENT_NEWS_MAX_AGE_MS;
};

const buildDriverReason = (title: string) =>
  /円|ドル|為替|日銀|FRB|金利/.test(title)
    ? "為替・金利"
    : /半導体|AI|ナスダック|NASDAQ/.test(title)
      ? "半導体・米ハイテク"
      : /ダウ|米国株|NY株|S&P/.test(title)
        ? "海外株"
        : /銀行|自動車|内需/.test(title)
          ? "主力セクター"
          : /金|ゴールド|BTC|ビットコイン|暗号資産/.test(title)
          ? "リスク資産・商品"
            : "市況";

const getMovePhrase = (changePercent: number) => {
  const direction = changePercent > 0 ? "上昇" : changePercent < 0 ? "下落" : "横ばい";
  const magnitude = Math.abs(changePercent);
  const strength = magnitude >= 1.5 ? "急" : magnitude >= 0.7 ? "やや大きく" : "小幅に";
  return `${strength}${direction}`;
};

const getFallbackDriverFocus = (index: MarketIndex) => {
  const isUp = index.changePercent >= 0;

  if (/日経/.test(index.name)) {
    return isUp
      ? "米株先物、ドル円、半導体・値がさ株の買いが日経平均を押し上げているか確認。"
      : "米ハイテク株、円高、半導体・値がさ株の売りが日経平均の重荷になっているか確認。";
  }
  if (/TOPIX/.test(index.name)) {
    return isUp
      ? "銀行、自動車、商社など主力バリュー株への買いが広がっているか確認。"
      : "内需・金融・自動車など幅広い主力株の売り、金利低下や円高の影響を確認。";
  }
  if (/ダウ/.test(index.name)) {
    return isUp
      ? "米景気敏感株、長期金利の落ち着き、企業決算への買い反応を確認。"
      : "米景気懸念、長期金利上昇、景気敏感株の売りが重荷か確認。";
  }
  if (/NASDAQ/.test(index.name)) {
    return isUp
      ? "AI・半導体、メガテック決算、米長期金利低下が買い材料か確認。"
      : "米長期金利上昇、AI・半導体株の利益確定、メガテック売りを確認。";
  }
  if (/S&P/.test(index.name)) {
    return isUp
      ? "米大型株全体のリスク選好、決算、金利低下が追い風か確認。"
      : "米大型株の広範な売り、金利・景気指標・決算反応を確認。";
  }
  if (/BTC|ビットコイン/.test(index.name)) {
    return isUp
      ? "ETFフロー、米金利低下、リスク資産への買い戻しを確認。"
      : "ETF資金流出、米金利上昇、リスク資産の利益確定売りを確認。";
  }
  if (/USD|JPY|ドル|円/.test(index.name)) {
    return isUp
      ? "ドル高・円安方向。日米金利差、FRB発言、日銀観測を確認。"
      : "ドル安・円高方向。米金利低下、日銀正常化観測、介入警戒を確認。";
  }
  if (/GOLD|金/.test(index.name)) {
    return isUp
      ? "米実質金利低下、ドル安、地政学リスク、インフレ警戒を確認。"
      : "米実質金利上昇、ドル高、リスク選好回復による金売りを確認。";
  }
  const proDef = PRO_INDICATOR_BY_NAME[index.name];
  if (proDef) {
    return isUp ? proDef.driverUp : proDef.driverDown;
  }
  return "為替、金利、海外市場、先物、関連セクターの動きを確認。";
};

const inferDriverText = (index: MarketIndex, news: MarketDriverNews[], usedTitles: Set<string>) => {
  const candidates = news
    .map((item) => ({
      item,
      score: scoreDriverMatch(index.name, item.title),
      isUsed: usedTitles.has(item.title),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
      return b.score - a.score;
    });
  const matched = candidates[0]?.score >= 4 ? candidates[0].item : undefined;
  const movePhrase = getMovePhrase(index.changePercent);

  if (!matched) {
    return `${movePhrase}。主な確認材料: ${getFallbackDriverFocus(index)}`;
  }

  usedTitles.add(matched.title);

  const reason = buildDriverReason(matched.title);
  const source = matched.source ? `${matched.source}: ` : "";

  return `${movePhrase}。材料: ${reason}。${source}${matched.title}`;
};

const getIndexQuery = (name: string) => {
  if (/日経/.test(name)) return "日経平均 OR 日本株 OR 東京株式市場";
  if (/TOPIX/.test(name)) return "TOPIX OR 東証株価指数 OR 日本株";
  if (/ダウ/.test(name)) return "NYダウ OR ダウ平均 OR 米国株";
  if (/NASDAQ/.test(name)) return "NASDAQ OR ナスダック OR 米ハイテク株";
  if (/S&P/.test(name)) return "S&P500 OR 米国株";
  if (/BTC|ビットコイン/.test(name)) return "ビットコイン OR BTC OR 暗号資産";
  if (/USD|JPY|ドル|円/.test(name)) return "ドル円 OR 為替 OR 円相場";
  if (/GOLD|金/.test(name)) return "金価格 OR ゴールド OR 金先物";
  return `${name} 市況`;
};

const buildUrgentQuery = (index: MarketIndex) => {
  const directionTerms = index.changePercent > 0
    ? "上昇 OR 急騰 OR 買い材料 OR 反発"
    : "下落 OR 急落 OR 売り材料 OR 反落";
  return `(${getIndexQuery(index.name)}) (${directionTerms}) when:1d`;
};

const buildUrgentDriverText = (index: MarketIndex, items: MarketDriverNews[]) => {
  const candidates = items
    .filter(isFreshDriverNews)
    .map((item) => ({ item, score: scoreDriverMatch(index.name, item.title) }))
    .filter((candidate) => candidate.score >= 4)
    .sort((a, b) => b.score - a.score);
  const matched = candidates[0]?.item;
  const direction = index.changePercent > 0 ? "急騰" : "急落";

  if (!matched) {
    return `${direction}検知。主な確認材料: ${getFallbackDriverFocus(index)}`;
  }

  return `${direction}検知。材料: ${buildDriverReason(matched.title)}。${matched.source ? `${matched.source}: ` : ""}${matched.title}`;
};

const buildMarketDriverMap = (indices: MarketIndex[], news: MarketDriverNews[]) => {
  const usedTitles = new Set<string>();
  return new Map(
    indices.map((index) => [
      index.name,
      inferDriverText(index, news.length ? news : driverFallbackNews, usedTitles),
    ])
  );
};

const getMoveLabel = (changePercent: number) => {
  const magnitude = Math.abs(changePercent);
  if (magnitude >= 1.5) return changePercent > 0 ? "急騰材料" : "急落材料";
  if (magnitude >= 0.7) return changePercent > 0 ? "上昇材料" : "下落材料";
  return "小動き";
};

const isUrgentMove = (changePercent: number) => Math.abs(changePercent) >= URGENT_MOVE_THRESHOLD;

const getMarketTone = (changePercent: number) => {
  const magnitude = Math.abs(changePercent);
  if (magnitude >= 1.5) return changePercent > 0 ? "買い優勢が鮮明" : "売り圧力が強い";
  if (magnitude >= 0.7) return changePercent > 0 ? "堅調な値動き" : "軟調な値動き";
  if (magnitude > 0.15) return changePercent > 0 ? "小幅高" : "小幅安";
  return "方向感を探る展開";
};

const getIndexMarketBrief = (index: MarketIndex) => {
  const tone = getMarketTone(index.changePercent);
  const signedPercent = `${index.changePercent > 0 ? "+" : ""}${index.changePercent.toFixed(2)}%`;

  if (/日経/.test(index.name)) {
    return `${tone}（${signedPercent}）。値がさハイテク・半導体株の寄与度が出やすく、NASDAQ先物、米金利、ドル円の振れが短期の方向感を左右。TOPIXより強ければグロース主導、弱ければ内需・金融への資金移動を意識。`;
  }
  if (/TOPIX/.test(index.name)) {
    return `${tone}（${signedPercent}）。東証全体の地合いを映しやすく、銀行、自動車、商社、内需株への資金の広がりを確認。日経平均との強弱差は、指数寄与度銘柄だけでなく市場全体に買いが回っているかの手掛かり。`;
  }
  if (/ダウ/.test(index.name)) {
    return `${tone}（${signedPercent}）。景気敏感株、金融、資本財、ディフェンシブ大型株の動きが中心。米長期金利と景気指標、企業決算への反応を見て、リスク選好が大型バリュー株まで広がっているか確認。`;
  }
  if (/NASDAQ/.test(index.name)) {
    return `${tone}（${signedPercent}）。AI、半導体、メガテックの売買が指数を動かしやすい局面。米長期金利が低下すると支援材料、上昇するとPERの高い成長株には重荷。SOX指数や大型テック決算も確認。`;
  }
  if (/S&P/.test(index.name)) {
    return `${tone}（${signedPercent}）。米国大型株全体の体温計。NASDAQ主導か、ダウ・景気敏感株まで広がる全面高かで相場の質が変わる。金利、雇用・物価指標、決算ガイダンスが主な確認材料。`;
  }
  if (/USD|JPY|ドル|円/.test(index.name)) {
    return `${tone}（${signedPercent}）。上昇はドル高・円安、下落はドル安・円高の方向。日米金利差、FRB・日銀発言、介入警戒、米指標の強弱が材料。日本株では輸出株と内需株の温度差にも影響。`;
  }
  if (/GOLD|金/.test(index.name)) {
    return `${tone}（${signedPercent}）。米実質金利とドル指数に反応しやすく、金利低下・ドル安・地政学リスクは支援材料。株高でリスク選好が強まる場面では上値が重くなりやすい。`;
  }
  if (/BTC|ビットコイン/.test(index.name)) {
    return `${tone}（${signedPercent}）。暗号資産全体のリスク許容度を反映。ETF資金フロー、米金利、ドル、NASDAQの動きと連動しやすい。急変時はレバレッジ解消や利益確定の有無を確認。`;
  }

  return `${tone}（${signedPercent}）。為替、金利、海外株、商品市況、先物の動きから短期の需給とリスク選好を確認。`;
};

const getIndexFocusTags = (index: MarketIndex) => {
  const proDef = PRO_INDICATOR_BY_NAME[index.name];
  if (proDef) return proDef.focusTags;
  return ["為替", "金利", "海外市場"];
};

const formatDriverMaterial = (text: string) =>
  text
    .replace(/^(急騰検知|急落検知|小幅に上昇|小幅に下落|やや大きく上昇|やや大きく下落|急上昇|急下落|横ばい)。/, "")
    .replace(/^材料:\s*/, "")
    .trim();

const getDriverPanelClass = (changePercent: number) => {
  const magnitude = Math.abs(changePercent);
  if (magnitude >= 1.5 && changePercent > 0) return "border-red-200 bg-red-100/45";
  if (magnitude >= 1.5 && changePercent < 0) return "border-blue-200 bg-blue-100/45";
  if (magnitude >= 0.7 && changePercent > 0) return "border-red-200/80 bg-red-100/35";
  if (magnitude >= 0.7 && changePercent < 0) return "border-blue-200/80 bg-blue-100/35";
  return "border-slate-300/70 bg-slate-100/50";
};

const getSummaryToneClass = (score: number) => {
  if (score >= 1.2) return "border-red-200 bg-red-50 text-red-700";
  if (score <= -1.2) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-300 bg-slate-100 text-slate-700";
};

const getRiskModeClass = (mode: "risk-on" | "risk-off" | "neutral") => {
  if (mode === "risk-on") return "border-red-300 bg-red-600 text-white";
  if (mode === "risk-off") return "border-blue-300 bg-blue-600 text-white";
  return "border-slate-300 bg-slate-700 text-white";
};

const formatSignedPercent = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatIndexValue = (index?: MarketIndex) => {
  if (!index) return undefined;
  const decimals = /USD|JPY|ドル|円|GOLD|金/.test(index.name) ? 2 : index.value >= 1000 ? 0 : 2;
  return `${index.value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} / ${formatSignedPercent(index.changePercent)}`;
};

const findIndexByName = (indices: MarketIndex[], pattern: RegExp) =>
  indices.find((index) => pattern.test(index.name));

const averageDefined = (values: Array<number | undefined>) => {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
};

const buildMarketSummary = (indices: MarketIndex[], driverMap: Map<string, string | undefined>) => {
  const nikkei = findIndexByName(indices, /日経/);
  const topix = findIndexByName(indices, /TOPIX/);
  const dow = findIndexByName(indices, /ダウ/);
  const nasdaq = findIndexByName(indices, /NASDAQ/);
  const sp500 = findIndexByName(indices, /S&P/);
  const usdjpy = findIndexByName(indices, /USD|JPY|ドル|円/);
  const gold = findIndexByName(indices, /GOLD|金/);
  const btc = findIndexByName(indices, /BTC|ビットコイン/);

  const japanScore = averageDefined([nikkei?.changePercent, topix?.changePercent]);
  const usScore = averageDefined([dow?.changePercent, nasdaq?.changePercent, sp500?.changePercent]);
  const riskScore = averageDefined([btc?.changePercent, nasdaq?.changePercent, gold ? -gold.changePercent * 0.35 : undefined]);
  const broadScore = averageDefined([japanScore, usScore, riskScore * 0.6]);
  const strongest = [...indices].sort((a, b) => b.changePercent - a.changePercent)[0];
  const weakest = [...indices].sort((a, b) => a.changePercent - b.changePercent)[0];
  const mainDriver = [nikkei, topix, nasdaq, usdjpy, gold, btc]
    .map((index) => (index ? driverMap.get(index.name) : undefined))
    .find(Boolean);

  const headline =
    broadScore >= 1
      ? "リスク選好が強く、買いが優勢です"
      : broadScore <= -1
      ? "リスク回避が強く、守りを優先したい地合いです"
      : broadScore > 0.2
      ? "やや買い優勢ですが、指数ごとの強弱差があります"
      : broadScore < -0.2
      ? "やや売り優勢で、戻りの持続力を確認したい地合いです"
      : "方向感は中立で、材料待ちの地合いです";

  const riskMode =
    broadScore >= 0.7 || riskScore >= 0.8
      ? "risk-on"
      : broadScore <= -0.7 || riskScore <= -0.8
      ? "risk-off"
      : "neutral";
  const riskModeLabel =
    riskMode === "risk-on" ? "リスクオン" : riskMode === "risk-off" ? "リスクオフ" : "中立";
  const riskModeReason =
    riskMode === "risk-on"
      ? "株・BTCなどリスク資産が買われやすい"
      : riskMode === "risk-off"
      ? "株・BTCが弱く、安全資産や守りを確認"
      : "株・為替・商品に方向感のズレあり";

  const japanText =
    nikkei && topix
      ? `日本株: 日経 ${formatSignedPercent(nikkei.changePercent)} / TOPIX ${formatSignedPercent(topix.changePercent)}。${
          nikkei.changePercent > topix.changePercent + 0.25
            ? "値がさ・グロース寄りの動き。"
            : topix.changePercent > nikkei.changePercent + 0.25
            ? "市場全体やバリュー株への広がりを確認。"
            : "指数寄与度と市場全体の温度差は小さめ。"
        }`
      : "日本株: 日経平均とTOPIXの強弱差を確認。";

  const usText =
    dow && nasdaq && sp500
      ? `米国株: ダウ ${formatSignedPercent(dow.changePercent)} / NASDAQ ${formatSignedPercent(nasdaq.changePercent)} / S&P500 ${formatSignedPercent(sp500.changePercent)}。${
          nasdaq.changePercent > dow.changePercent + 0.4
            ? "ハイテク主導。米金利と半導体を重視。"
            : dow.changePercent > nasdaq.changePercent + 0.4
            ? "景気敏感・大型バリューへの資金移動を確認。"
            : "米大型株全体の方向感を確認。"
        }`
      : "米国株: ダウ、NASDAQ、S&P500の主導役を確認。";

  const crossAssetText = `クロスアセット: ${
    usdjpy ? `ドル円 ${formatSignedPercent(usdjpy.changePercent)}` : "ドル円 --"
  } / ${gold ? `金 ${formatSignedPercent(gold.changePercent)}` : "金 --"} / ${
    btc ? `BTC ${formatSignedPercent(btc.changePercent)}` : "BTC --"
  }。${
    riskScore >= 0.8
      ? "リスク資産に買いが入りやすい状態。"
      : riskScore <= -0.8
      ? "リスク資産の売りや安全資産需要を確認。"
      : "株、為替、商品に方向感のズレがないか確認。"
  }`;

  return {
    headline,
    toneClass: getSummaryToneClass(broadScore),
    riskMode,
    riskModeLabel,
    riskModeReason,
    points: [japanText, usText, crossAssetText],
    action:
      riskMode === "risk-on"
        ? "確認順: 強い指数の押し目、半導体・大型株の出来高、ドル円の追い風を優先。急騰銘柄は高値掴みを避けます。"
        : riskMode === "risk-off"
        ? "確認順: 下げ止まり、円高・米金利・NASDAQの弱さ、ディフェンシブや現金比率を優先。反発だけで飛びつかない状態です。"
        : "確認順: 日経とTOPIXの差、NASDAQと金利、ドル円の方向を見て、指数が同じ方向にそろうまで候補を絞ります。",
    strongest: strongest ? `${strongest.name} ${formatSignedPercent(strongest.changePercent)}` : "強い指数 --",
    weakest: weakest ? `${weakest.name} ${formatSignedPercent(weakest.changePercent)}` : "弱い指数 --",
    driver: mainDriver ? formatDriverMaterial(mainDriver) : "為替、米金利、海外株、半導体、商品市況を確認。",
  };
};

const ClampedDriverText = ({ text, lines = 2 }: { text?: string; lines?: 2 | 3 }) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const updateClamped = () => {
      setIsClamped(element.scrollHeight > element.clientHeight + 1);
    };

    updateClamped();
    const resizeObserver = new ResizeObserver(updateClamped);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateClamped);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateClamped);
    };
  }, [text]);

  return (
    <>
      <p
        ref={textRef}
        className={`${lines === 3 ? "line-clamp-3" : "line-clamp-2"} text-xs leading-relaxed text-foreground`}
      >
        {text}
      </p>
      {isClamped && (
        <div className="pointer-events-none absolute left-2 right-2 top-full z-30 mt-1 hidden rounded border border-slate-300 bg-slate-100 px-2.5 py-2 text-xs leading-relaxed text-slate-900 shadow-lg group-hover:block group-focus-within:block">
          {text}
        </div>
      )}
    </>
  );
};

const getIndexRegionFlag = (name: string): string => {
  const def = PRO_INDICATOR_BY_NAME[name];
  if (def) return def.flag;
  return "🌐";
};

const indicatorSnapshotCache = new Map<string, { snapshot: ExtraIndicatorSnapshot; fetchedAt: number }>();
const SPARKLINE_CACHE_MS = 2 * 60 * 1000;

const useSelectedIndicatorSnapshots = (selectedNames: string[], needCoreSparklines: boolean) => {
  const [snapshotsByName, setSnapshotsByName] = useState<Record<string, ExtraIndicatorSnapshot>>(() => {
    const init: Record<string, ExtraIndicatorSnapshot> = {};
    indicatorSnapshotCache.forEach((entry, key) => {
      init[key] = entry.snapshot;
    });
    return init;
  });

  const namesKey = selectedNames.join(",");

  useEffect(() => {
    let active = true;
    const now = Date.now();

    selectedNames.forEach((name) => {
      const def = PRO_INDICATOR_BY_NAME[name];
      if (!def) return;
      // 詳細モードではコア8銘柄のスパークラインは不要（追加プロ指標のみ取得）
      if (def.isCore && !needCoreSparklines) return;

      const cached = indicatorSnapshotCache.get(name);
      if (cached && now - cached.fetchedAt < SPARKLINE_CACHE_MS) {
        setSnapshotsByName((prev) => (prev[name] ? prev : { ...prev, [name]: cached.snapshot }));
        return;
      }

      fetch(`/api/stock-chart?symbol=${encodeURIComponent(def.chartSymbol)}&range=5d&interval=15m`)
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (!active || !Array.isArray(payload?.candles)) return;
          const snapshot = computeIndicatorSnapshotFromCandles(payload.candles);
          if (!snapshot) return;
          indicatorSnapshotCache.set(name, { snapshot, fetchedAt: Date.now() });
          setSnapshotsByName((prev) => ({ ...prev, [name]: snapshot }));
        })
        .catch(() => {});
    });

    return () => {
      active = false;
    };
  }, [namesKey, needCoreSparklines]);

  return snapshotsByName;
};

const formatCompactAxisValue = (name: string, value: number): string => {
  const def = PRO_INDICATOR_BY_NAME[name];
  if (def?.decimals === 3) return value.toFixed(3);
  if (/USD|JPY|EUR/.test(name)) return value.toFixed(2);
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString();
  return value.toFixed(def?.decimals ?? 1);
};

const IndexMiniChartSvg = ({
  name,
  rawPoints,
  currentValue,
  prevClose,
  isUp,
  isDown,
}: {
  name: string;
  rawPoints?: number[];
  currentValue: number;
  prevClose: number;
  isUp: boolean;
  isDown: boolean;
}) => {
  const scaledPoints = useMemo(() => {
    if (!rawPoints || rawPoints.length < 2) {
      // データ取得中の仮ライン（前日終値→現在値）
      return [prevClose, (prevClose + currentValue) / 2, currentValue];
    }
    const last = rawPoints[rawPoints.length - 1];
    const scale = last > 0 && currentValue > 0 ? currentValue / last : 1;
    const mapped = rawPoints.map((v) => v * scale);
    mapped[mapped.length - 1] = currentValue;
    return mapped;
  }, [rawPoints, currentValue, prevClose]);

  const high = Math.max(...scaledPoints, prevClose);
  const low = Math.min(...scaledPoints, prevClose);
  const span = Math.max(high - low, Math.abs(currentValue) * 0.002 || 1);
  const pad = span * 0.1;
  const maxY = high + pad;
  const minY = low - pad;
  const rangeY = maxY - minY || 1;

  const w = 160;
  const h = 62;
  const toX = (i: number) => (i / Math.max(1, scaledPoints.length - 1)) * w;
  const toY = (v: number) => h - ((v - minY) / rangeY) * h;

  const baselineY = toY(prevClose);
  const linePath = scaledPoints
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${w},${baselineY.toFixed(1)} L0,${baselineY.toFixed(1)} Z`;
  const lastY = toY(currentValue);

  const areaFill = isUp
    ? "rgba(220, 38, 38, 0.22)"
    : isDown
      ? "rgba(37, 99, 235, 0.20)"
      : "rgba(100, 116, 139, 0.16)";
  const baseLineColor = isUp ? "#ef4444" : isDown ? "#3b82f6" : "#94a3b8";

  return (
    <div className="flex items-stretch gap-1 px-1.5 py-0.5">
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="h-[58px] w-full overflow-visible sm:h-[64px]"
          aria-hidden="true"
        >
          {/* グリッド補助線 */}
          <line x1={0} y1={h * 0.25} x2={w} y2={h * 0.25} stroke="rgba(148,163,184,0.22)" strokeWidth="0.7" />
          <line x1={0} y1={h * 0.5} x2={w} y2={h * 0.5} stroke="rgba(148,163,184,0.22)" strokeWidth="0.7" />
          <line x1={0} y1={h * 0.75} x2={w} y2={h * 0.75} stroke="rgba(148,163,184,0.22)" strokeWidth="0.7" />

          {/* 前日終値基準線からの塗りつぶし */}
          <path d={areaPath} fill={areaFill} />

          {/* 前日終値基準線 */}
          <line
            x1={0}
            y1={baselineY}
            x2={w}
            y2={baselineY}
            stroke={baseLineColor}
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* 値動きライン */}
          <path d={linePath} fill="none" stroke="#1e3a8a" strokeWidth="1.35" strokeLinejoin="round" />

          {/* 現在値マーカー */}
          <circle cx={w} cy={lastY} r="2.2" fill={baseLineColor} />
        </svg>
      </div>
      {/* 右軸の高値・現在値・安値ラベル */}
      <div className="flex shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[9px] leading-none tabular-nums sm:text-[10px]">
        <span className="rounded bg-red-50/90 px-1 py-0.5 font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {formatCompactAxisValue(name, high)}
        </span>
        <span className="font-bold text-foreground/80">
          {formatCompactAxisValue(name, currentValue)}
        </span>
        <span className="rounded bg-blue-50/90 px-1 py-0.5 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {formatCompactAxisValue(name, low)}
        </span>
      </div>
    </div>
  );
};

const MarketOverview = ({ indices, detailed = false }: MarketOverviewProps) => {
  const cachedDrivers = loadCachedDrivers();
  const [showIndexCharts, setShowIndexCharts] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedIndicatorNames, setSelectedIndicatorNames] = useState<string[]>(() =>
    loadSelectedMarketIndicators()
  );
  const [indexChartLayout, setIndexChartLayout] = useState<"8" | "4">("8");
  const [isMobileChartViewport, setIsMobileChartViewport] = useState(false);
  const [mobileDrawingToolsOpen, setMobileDrawingToolsOpen] = useState(false);
  const indexChartsRef = useRef<HTMLDivElement | null>(null);
  const [driverNews, setDriverNews] = useState<MarketDriverNews[]>(cachedDrivers?.items ?? []);
  const [driverStatus, setDriverStatus] = useState<MarketDriverStatus>(cachedDrivers ? "live" : "loading");
  const [urgentDrivers, setUrgentDrivers] = useState<Record<string, { status: UrgentDriverStatus; text: string }>>({});
  const {
    indices: displayIndices,
    status,
    updatedAt,
  } = useLiveMarketData(indices);

  const updateSelectedIndicators = (next: string[]) => {
    const valid = next.filter((n) => Boolean(PRO_INDICATOR_BY_NAME[n]));
    if (!valid.length) return;
    setSelectedIndicatorNames(valid);
    saveSelectedMarketIndicators(valid);
  };

  const toggleIndicator = (name: string) => {
    const exists = selectedIndicatorNames.includes(name);
    if (exists && selectedIndicatorNames.length <= 1) return;
    const next = exists
      ? selectedIndicatorNames.filter((n) => n !== name)
      : [...selectedIndicatorNames, name];
    updateSelectedIndicators(next);
  };

  const snapshotsByName = useSelectedIndicatorSnapshots(selectedIndicatorNames, !detailed);

  const visibleIndices = useMemo<MarketIndex[]>(() => {
    const coreMap = new Map(displayIndices.map((idx) => [idx.name, idx]));
    const selectedSet = new Set(selectedIndicatorNames);
    const list: MarketIndex[] = [];

    for (const def of PRO_MARKET_INDICATORS) {
      if (!selectedSet.has(def.name)) continue;
      const core = coreMap.get(def.name);
      if (core) {
        list.push(core);
        continue;
      }
      const snap = snapshotsByName[def.name];
      if (snap) {
        list.push({
          name: def.name,
          value: snap.value,
          change: snap.change,
          changePercent: snap.changePercent,
        });
      } else {
        list.push({
          name: def.name,
          value: 0,
          change: 0,
          changePercent: 0,
        });
      }
    }
    return list;
  }, [displayIndices, selectedIndicatorNames, snapshotsByName]);

  const marketDriverByName = useMemo(
    () => buildMarketDriverMap(visibleIndices, driverNews),
    [visibleIndices, driverNews]
  );
  const marketSummary = useMemo(
    () => buildMarketSummary(displayIndices, marketDriverByName),
    [displayIndices, marketDriverByName]
  );
  const indexChartSymbols = useMemo(
    () =>
      indexChartConfigs.map((config) => {
        const matchingIndex = displayIndices.find((index) => chartIndexMatchers[config.id]?.test(index.name));
        if (typeof matchingIndex?.futuresValue === "number") {
          const pct = matchingIndex.futuresChangePercent ?? 0;
          const sign = pct >= 0 ? "+" : "";
          const isWhole = config.id === "nikkei" || config.id === "dow";
          return {
            ...config,
            currentPrice: `先物RT ${matchingIndex.futuresValue.toLocaleString(undefined, {
              minimumFractionDigits: isWhole ? 0 : 2,
              maximumFractionDigits: isWhole ? 0 : 2,
            })} (${sign}${pct.toFixed(2)}%)`,
          };
        }
        return {
          ...config,
          currentPrice: formatIndexValue(matchingIndex),
        };
      }),
    [displayIndices]
  );

  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileChartViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const cached = loadCachedDrivers();
    if (cached && Date.now() - Date.parse(cached.updatedAt) < MARKET_DRIVER_CACHE_MS) {
      setDriverNews(cached.items);
      setDriverStatus("live");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    const loadDrivers = async () => {
      try {
        const googleParams = new URLSearchParams({
          q: "日経平均 OR TOPIX OR 日本株 OR 米国株 OR 為替 OR 金利 OR 半導体 when:2d",
          hl: "ja",
          gl: "JP",
          ceid: "JP:ja",
        });
        const fetchText = async (url: string) => {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        };
        const results = await Promise.allSettled([
          fetchText(`/api/news-feeds?source=google&${googleParams.toString()}`).then((text) => mapRssTitles(text, "Google News")),
          fetchText("/api/news-feeds?source=yahoo").then((text) => mapRssTitles(text, "Yahoo!ニュース")),
        ]);
        const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
        const uniqueItems = items.filter(
          (item, index, list) => list.findIndex((entry) => entry.title === item.title) === index
        ).slice(0, 18);

        if (!uniqueItems.length) throw new Error("market driver news unavailable");
        setDriverNews(uniqueItems);
        setDriverStatus("live");
        saveCachedDrivers(uniqueItems);
      } catch {
        if (!controller.signal.aborted) {
          setDriverNews(cached?.items ?? driverFallbackNews);
          setDriverStatus(cached?.items?.length ? "live" : "fallback");
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    loadDrivers();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const urgentIndices = displayIndices.filter((index) => Math.abs(index.changePercent) >= URGENT_MOVE_THRESHOLD);
    if (!urgentIndices.length) {
      setUrgentDrivers({});
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const urgentKeys = new Set(urgentIndices.map((index) => index.name));

    setUrgentDrivers((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([name]) => urgentKeys.has(name))
      ) as Record<string, { status: UrgentDriverStatus; text: string }>;
      urgentIndices.forEach((index) => {
        next[index.name] = next[index.name] ?? {
          status: "checking",
          text: `${index.changePercent > 0 ? "急騰" : "急落"}検知。直近材料を確認中。`,
        };
      });
      return next;
    });

    const fetchText = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    };

    const loadUrgentDrivers = async () => {
      const entries = await Promise.all(
        urgentIndices.map(async (index) => {
          try {
            const params = new URLSearchParams({
              q: buildUrgentQuery(index),
              hl: "ja",
              gl: "JP",
              ceid: "JP:ja",
              ts: String(Date.now()),
            });
            const text = await fetchText(`/api/news-feeds?source=google&${params.toString()}`);
            const items = mapRssTitles(text, "Google News");
            return [
              index.name,
              {
                status: "ready" as const,
                text: buildUrgentDriverText(index, items),
              },
            ] as const;
          } catch {
            return [
              index.name,
              {
                status: "unknown" as const,
                text: `${index.changePercent > 0 ? "急騰" : "急落"}検知。材料ニュースを取得できません。先物、為替、金利を確認中。`,
              },
            ] as const;
          }
        })
      );

      if (!controller.signal.aborted) {
        setUrgentDrivers((current) => ({ ...current, ...Object.fromEntries(entries) }));
      }
    };

    loadUrgentDrivers().finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [displayIndices]);

  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <div className="flex flex-col gap-1.5 border-b border-border bg-table-header-bg px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-3 sm:py-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:contents">
          <div className="flex min-w-0 items-center gap-1.5 sm:order-1 sm:gap-2">
            <h3 className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-foreground whitespace-nowrap">
              <Newspaper className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {detailed ? "主要指数詳細" : "主要指数"}
            </h3>
            <span className="shrink-0 whitespace-nowrap rounded border border-border bg-muted px-2 py-0.5 text-xxs font-bold text-foreground/80">
              前日比
            </span>
            {detailed && (
              <span className="shrink-0 whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-xxs font-semibold text-muted-foreground">
                {driverStatus === "loading" ? "材料取得中" : driverStatus === "live" ? "材料反映" : "推定材料"}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xxs font-semibold text-muted-foreground sm:order-3 sm:gap-2">
            {/* 日本株カラー表記案内（超コンパクト） */}
            <span
              className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded border border-border/80 bg-background px-1.5 py-0.5 text-xxs font-bold shadow-2xs"
              title="当サイトのカラー設定：赤が上昇・買い、青が下降・売りです"
            >
              <span className="whitespace-nowrap text-red-600 dark:text-red-400">赤▲</span>
              <span className="text-muted-foreground/30">/</span>
              <span className="whitespace-nowrap text-blue-600 dark:text-blue-400">青▼</span>
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 font-bold ${
                status === "live"
                  ? "border border-red-600 bg-white text-red-600"
                  : "bg-muted text-muted-foreground"
              }`}
              title={updatedLabel ? `更新 ${updatedLabel}` : undefined}
            >
              {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
              {status === "live" ? "LIVE" : status === "cached" ? "前回値" : "確認中"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:order-2 sm:ml-auto sm:gap-2">
          <button
            type="button"
            onClick={() => setSelectorOpen(true)}
            className="inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2 text-xxs font-bold text-foreground transition-colors hover:bg-muted"
            aria-label="表示する銘柄・指標を選択"
            title="日本株・米国株・為替・金利・コモディティから表示銘柄を選択"
          >
            <SlidersHorizontal className="h-3 w-3 text-primary" aria-hidden="true" />
            <span className="whitespace-nowrap">表示銘柄</span>
            <span className="rounded bg-muted px-1 text-[10px] font-extrabold text-primary">
              {selectedIndicatorNames.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowIndexCharts((value) => {
                const nextValue = !value;
                if (nextValue) {
                  window.setTimeout(() => {
                    indexChartsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 80);
                }
                return nextValue;
              });
            }}
            className={`inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded border px-2 text-xxs font-bold transition-colors ${
              showIndexCharts
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-primary hover:bg-muted"
            }`}
            aria-label={showIndexCharts ? "各チャート表示を閉じる" : "各チャート表示を開く"}
            title={showIndexCharts ? "チャートを閉じる" : "主要指数チャート"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">各チャート表示</span>
          </button>
          <RateVoiceAlertControl indices={displayIndices} />
        </div>
      </div>
      <div
        className={
          detailed
            ? "grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-4"
            : "grid grid-cols-2 gap-1.5 bg-muted/40 p-1.5 sm:gap-2 sm:p-2 lg:grid-cols-4"
        }
      >
        {visibleIndices.map((index) => {
          const proDef = PRO_INDICATOR_BY_NAME[index.name];
          const hasFutures = typeof index.futuresValue === "number";
          const mainValue = hasFutures ? (index.futuresValue as number) : index.value;
          const mainChange =
            hasFutures && typeof index.futuresChange === "number"
              ? index.futuresChange
              : index.change;
          const mainChangePercent =
            hasFutures && typeof index.futuresChangePercent === "number"
              ? index.futuresChangePercent
              : index.changePercent;
          const isUp = mainChange > 0;
          const isDown = mainChange < 0;
          const isAfterHours = isIndexMarketAfterHours(index.name);
          const urgentMove = isUrgentMove(mainChangePercent);
          const driverText = urgentDrivers[index.name]?.text ?? marketDriverByName.get(index.name);
          const prevClose = mainValue - mainChange;
          const displayTitle = hasFutures
            ? index.name === "NASDAQ"
              ? "NASDAQ100先物"
              : `${index.name}先物`
            : index.name;
          const isWholeNumber = hasFutures && (index.name === "日経平均" || index.name === "NYダウ");
          const decimals = isWholeNumber ? 0 : proDef?.decimals ?? 2;
          const unitSuffix = proDef?.unit ?? "";
          const isLoadingExtra = !proDef?.isCore && mainValue === 0;

          if (!detailed) {
            return (
              <div
                key={index.name}
                className="flex flex-col justify-between overflow-hidden rounded-md border border-border bg-card shadow-2xs transition-colors hover:border-foreground/30"
              >
                {/* タイル上部ヘッダー帯（国旗＋銘柄名＋RT/時間外） */}
                <div className="flex items-center justify-between gap-1 border-b border-border/80 bg-gradient-to-b from-muted/80 to-muted/35 px-2 py-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0 text-xs leading-none" aria-hidden="true">
                      {getIndexRegionFlag(index.name)}
                    </span>
                    <span className="truncate text-[11px] font-extrabold text-foreground sm:text-xs">
                      {displayTitle}
                    </span>
                  </div>
                  {isAfterHours ? (
                    <span className="shrink-0 rounded border border-slate-300 bg-background px-1 py-0 text-[9px] font-bold text-slate-600">
                      時間外
                    </span>
                  ) : hasFutures ? (
                    <span className="shrink-0 rounded border border-border/80 bg-background px-1 py-0 text-[9px] font-bold text-muted-foreground">
                      RT
                    </span>
                  ) : null}
                </div>

                {/* 大きな騰落率 */}
                <div
                  className={`pt-1 text-center text-lg font-black leading-none tracking-tight tabular-nums sm:text-xl ${
                    isLoadingExtra
                      ? "text-muted-foreground"
                      : isUp
                        ? "text-stock-up"
                        : isDown
                          ? "text-stock-down"
                          : "text-stock-unchanged"
                  }`}
                >
                  {isLoadingExtra ? (
                    <span className="text-xs font-bold">取得中...</span>
                  ) : (
                    <>
                      {isUp ? "+" : ""}
                      {mainChangePercent.toFixed(2)}
                      <span className="text-xs font-extrabold sm:text-sm">%</span>
                    </>
                  )}
                </div>

                {/* ライブミニラインチャート（基準線＋塗りつぶし＋高値/安値） */}
                <IndexMiniChartSvg
                  name={index.name}
                  rawPoints={snapshotsByName[index.name]?.points}
                  currentValue={mainValue || 1}
                  prevClose={prevClose || 1}
                  isUp={isUp}
                  isDown={isDown}
                />

                {/* 下部：太字の現在値＋前日比 */}
                <div className="border-t border-border/50 bg-background/60 px-1.5 py-1 text-center">
                  <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 leading-tight">
                    <span className="text-sm font-black tabular-nums text-foreground sm:text-base">
                      {isLoadingExtra
                        ? "--"
                        : `${mainValue.toLocaleString(undefined, {
                            minimumFractionDigits: decimals,
                            maximumFractionDigits: decimals,
                          })}${unitSuffix}`}
                    </span>
                    {!isLoadingExtra && (
                      <span
                        className={`text-xs font-extrabold tabular-nums ${
                          isUp
                            ? "text-stock-up"
                            : isDown
                            ? "text-stock-down"
                            : "text-stock-unchanged"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {mainChange.toFixed(decimals)}
                      </span>
                    )}
                  </div>
                  {hasFutures && (
                    <div className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground">
                      <span>現物 </span>
                      <span className="font-semibold text-foreground/80">
                        {index.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`ml-0.5 font-bold ${
                          index.changePercent >= 0 ? "text-stock-up" : "text-stock-down"
                        }`}
                      >
                        ({index.changePercent >= 0 ? "+" : ""}
                        {index.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* 騰落原因（簡潔3行まとめ） */}
                {driverText && (
                  <div
                    className={`border-t px-2 py-1.5 text-left ${getDriverPanelClass(mainChangePercent)}`}
                    title={driverText}
                  >
                    <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold leading-none text-foreground/75">
                      {urgentMove && <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-amber-500" aria-hidden="true" />}
                      <span>{getMoveLabel(mainChangePercent)}</span>
                    </div>
                    <p className="line-clamp-3 text-[10px] leading-snug text-foreground/85 sm:text-xxs">
                      {formatDriverMaterial(driverText)}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={index.name}
              className="border-b border-r border-border px-2.5 py-2 transition-colors hover:bg-muted/40"
            >
              {/* 1行目: 指数名（左）＋ 騰落率（右） */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex min-w-0 items-center gap-1 text-xs font-bold text-foreground/80">
                  <span className="truncate">
                    {hasFutures
                      ? index.name === "NASDAQ"
                        ? "NASDAQ100先物"
                        : `${index.name}先物`
                      : index.name}
                  </span>
                  {isAfterHours ? (
                    <span className="shrink-0 rounded border border-slate-300 bg-slate-100 px-1 py-0 text-[10px] font-semibold text-slate-600">
                      時間外
                    </span>
                  ) : hasFutures ? (
                    <span className="shrink-0 rounded bg-muted px-1 py-0 text-[10px] font-medium text-muted-foreground">
                      RT
                    </span>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 text-xxs font-bold tabular-nums ${
                    isUp
                      ? "text-stock-up"
                      : isDown
                      ? "text-stock-down"
                      : "text-stock-unchanged"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {mainChangePercent.toFixed(2)}%
                </span>
              </div>

              {/* 2行目: メイン現在値 ＋ 前日比（1行スリム表示） */}
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm sm:text-base font-extrabold tabular-nums text-foreground">
                  {mainValue.toLocaleString(undefined, {
                    minimumFractionDigits: hasFutures && (index.name === "日経平均" || index.name === "NYダウ") ? 0 : 2,
                    maximumFractionDigits: hasFutures && (index.name === "日経平均" || index.name === "NYダウ") ? 0 : 2,
                  })}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xxs font-semibold tabular-nums ${
                    isUp
                      ? "text-stock-up"
                      : isDown
                      ? "text-stock-down"
                      : "text-stock-unchanged"
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : isDown ? (
                    <TrendingDown className="h-2.5 w-2.5" />
                  ) : (
                    <Minus className="h-2.5 w-2.5" />
                  )}
                  {isUp ? "+" : ""}
                  {mainChange.toFixed(hasFutures && (index.name === "日経平均" || index.name === "NYダウ") ? 0 : 2)}
                </span>
              </div>

              {/* 現物（サブ1行表示） */}
              {hasFutures && (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xxs tabular-nums text-muted-foreground">
                  <span className="font-bold text-foreground/70">
                    {index.name === "NASDAQ" ? "現物(総合)" : "現物"}
                  </span>
                  <span className="font-bold text-foreground">
                    {index.value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span
                    className={`font-bold ${
                      index.changePercent >= 0 ? "text-stock-up" : "text-stock-down"
                    }`}
                  >
                    ({index.changePercent >= 0 ? "+" : ""}
                    {index.changePercent.toFixed(2)}%)
                  </span>
                </div>
              )}

              <div className={`group relative mt-1 rounded border px-1.5 py-1 ${getDriverPanelClass(mainChangePercent)}`}>
                {detailed ? (
                  <>
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold leading-none ${
                        isUp
                          ? "bg-red-600 text-white"
                          : isDown
                          ? "bg-blue-600 text-white"
                          : "bg-slate-600 text-white"
                      }`}>
                        {urgentMove && <AlertTriangle className="h-2.5 w-2.5" />}
                        {getMarketTone(mainChangePercent)}
                      </span>
                      <span className="text-[10px] font-bold leading-none text-muted-foreground">{getMoveLabel(mainChangePercent)}</span>
                    </div>
                    <div className="mb-1.5 flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar">
                      {getIndexFocusTags(index).map((tag) => (
                        <span key={tag} className="shrink-0 whitespace-nowrap rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ClampedDriverText text={getIndexMarketBrief(index)} lines={3} />
                    {driverText && (
                      <div className="mt-1.5 border-t border-border/70 pt-1.5 text-xs leading-relaxed text-foreground/85">
                        <span className="font-bold text-foreground">材料:</span> {formatDriverMaterial(driverText)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-0.5 flex items-center gap-1 text-xxs font-bold text-muted-foreground">
                      {urgentMove && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                      {getMoveLabel(mainChangePercent)}
                    </div>
                    <ClampedDriverText text={driverText} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {detailed && (
        <section className="border-t border-border bg-background px-3 py-1.5">
          <div className="flex flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className={`shrink-0 rounded border px-2 py-0.5 text-xxs font-black ${marketSummary.toneClass}`}>
                市況まとめ
              </span>
              <span
                className={`shrink-0 rounded border px-2 py-0.5 text-xxs font-black ${getRiskModeClass(marketSummary.riskMode)}`}
                title={marketSummary.riskModeReason}
              >
                {marketSummary.riskModeLabel}
              </span>
              <span className="min-w-0 text-xs font-black leading-tight text-foreground">{marketSummary.headline}</span>
            </div>
            <div className="grid gap-1.5 text-xxs md:grid-cols-3">
              {marketSummary.points.map((point) => (
                <div key={point} className="rounded border border-slate-200 bg-card px-2 py-1 font-semibold leading-relaxed text-slate-700">
                  {point}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xxs">
              <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-red-700">
                強い: {marketSummary.strongest}
              </span>
              <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                弱い: {marketSummary.weakest}
              </span>
              <span className="min-w-0 max-w-full rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-semibold leading-relaxed text-slate-700">
                材料: {marketSummary.driver}
              </span>
              <span className="min-w-0 max-w-full rounded border border-primary/30 bg-primary/5 px-2 py-0.5 font-bold leading-relaxed text-primary">
                {marketSummary.action}
              </span>
            </div>
          </div>
        </section>
      )}
      {showIndexCharts && (
        <div ref={indexChartsRef} className="scroll-mt-3 border-t border-border bg-background p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="text-xs font-bold text-foreground whitespace-nowrap">主要指数チャート {indexChartLayout}分割</div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileDrawingToolsOpen((value) => !value)}
                className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded border border-border bg-card px-2 text-xxs font-bold text-primary md:hidden"
              >
                {mobileDrawingToolsOpen ? "描画ツールを隠す" : "描画ツールを表示"}
              </button>
              <div className="text-xxs font-semibold text-muted-foreground whitespace-nowrap">TradingView / MA200 / BB3σ</div>
            </div>
          </div>
          <TradingViewQuadPanel
            symbols={indexChartSymbols}
            drawingEnabled={isMobileChartViewport ? mobileDrawingToolsOpen : true}
            onLayoutChange={setIndexChartLayout}
          />
        </div>
      )}

      {/* カテゴリ別 表示銘柄選択モーダル */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="flex max-h-[86dvh] w-[95vw] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border bg-table-header-bg px-4 py-3 pr-10 text-left">
            <DialogTitle className="text-sm font-extrabold text-foreground">
              表示する市況・プロ投資家指標を選択
            </DialogTitle>
            <DialogDescription className="text-xxs text-muted-foreground">
              日本株・米国株・為替・金利・コモディティから見たい指標を自由に選べます（自動保存）。
            </DialogDescription>
          </DialogHeader>

          {/* ワンクリックプリセット */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-2">
            <span className="whitespace-nowrap text-[10px] font-bold text-muted-foreground">プリセット:</span>
            <button
              type="button"
              onClick={() => updateSelectedIndicators(DEFAULT_SELECTED_INDICATORS)}
              className="whitespace-nowrap rounded border border-border bg-background px-2 py-1 text-xxs font-bold text-foreground hover:bg-muted"
            >
              標準8銘柄
            </button>
            <button
              type="button"
              onClick={() => updateSelectedIndicators(PRO_PRESET_INDICATORS)}
              className="whitespace-nowrap rounded border border-primary/40 bg-primary/10 px-2 py-1 text-xxs font-bold text-primary hover:bg-primary/15"
            >
              プロ定番12銘柄（+SOX/金利/VIX/原油）
            </button>
            <button
              type="button"
              onClick={() => updateSelectedIndicators(ALL_INDICATOR_NAMES)}
              className="whitespace-nowrap rounded border border-border bg-background px-2 py-1 text-xxs font-bold text-foreground hover:bg-muted"
            >
              全銘柄 ({ALL_INDICATOR_NAMES.length})
            </button>
          </div>

          <div className="always-scrollbar min-h-0 flex-1 space-y-3 px-4 py-3 text-xs">
            {MARKET_INDICATOR_CATEGORIES.map((cat) => {
              const items = PRO_MARKET_INDICATORS.filter((item) => item.category === cat.id);
              const allChecked = items.every((item) => selectedIndicatorNames.includes(item.name));
              return (
                <div key={cat.id} className="rounded-md border border-border bg-muted/15 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-foreground">{cat.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const catNames = items.map((i) => i.name);
                        if (allChecked) {
                          const remaining = selectedIndicatorNames.filter((n) => !catNames.includes(n));
                          if (remaining.length > 0) updateSelectedIndicators(remaining);
                        } else {
                          const merged = Array.from(new Set([...selectedIndicatorNames, ...catNames]));
                          updateSelectedIndicators(merged);
                        }
                      }}
                      className="whitespace-nowrap rounded border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-muted"
                    >
                      {allChecked ? "このカテゴリを解除" : "すべて選択"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => {
                      const active = selectedIndicatorNames.includes(item.name);
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => toggleIndicator(item.name)}
                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1 text-xxs font-bold transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground/80 hover:bg-muted"
                          }`}
                        >
                          <span aria-hidden="true">{item.flag}</span>
                          <span>{item.name}</span>
                          {active && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
            <span className="whitespace-nowrap text-xxs font-bold text-muted-foreground">
              選択中: {selectedIndicatorNames.length} / {ALL_INDICATOR_NAMES.length} 銘柄
            </span>
            <button
              type="button"
              onClick={() => setSelectorOpen(false)}
              className="ml-auto shrink-0 whitespace-nowrap rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              閉じる
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketOverview;
