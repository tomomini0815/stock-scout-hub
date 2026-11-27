import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpenText,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  ExternalLink,
  Filter,
  Gauge,
  Info,
  Layers3,
  RefreshCw,
  X,
  Scale,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import InlinePdfViewer from "@/components/InlinePdfViewer";
import { marketIndices } from "@/data/stockData";
import { addChartWatchlistStock } from "@/lib/chartWatchlist";

type FundStyle = "長期バリュー" | "アクティビスト" | "イベント" | "グロース" | "クオンツ";
type FilingType = "13F" | "13D" | "13G" | "EDINET";
type SignalType = "新規買い" | "買い増し" | "縮小" | "全売却" | "大量保有";

interface FundSeed {
  id: string;
  name: string;
  manager: string;
  style: FundStyle;
  jurisdiction: "US" | "JP";
  cik?: string;
  reliability: number;
  readable: number;
  lagRisk: number;
}

interface FilingSignalSeed {
  id: string;
  fundId: string;
  ticker: string;
  company: string;
  filingType: FilingType;
  signalType: SignalType;
  reportDate: string;
  filingDate: string;
  portfolioWeight: number;
  positionChange: number;
  priceMoveSinceReport: number;
  priceEvaluated?: boolean;
  multiFundCount: number;
  activistIntent: boolean;
  concentrationRank: number;
  note: string;
  source?: "sec" | "edinet" | "fallback";
  sourceUrl?: string;
  filerName?: string;
}

interface SmartMoneyPayload {
  funds: FundSeed[];
  signals: FilingSignalSeed[];
  updatedAt?: string;
  source?: "live" | "fallback" | "error";
  sourceStatus?: {
    sec?: string;
    edinet?: string;
    price?: string;
  };
  error?: string;
}

type BeginnerGuideKey = "overview" | "status" | "topCandidates" | "tableTerms" | "funds";

const beginnerGuides: Record<BeginnerGuideKey, {
  title: string;
  lead: string;
  points: Array<{ label: string; body: string }>;
  terms?: Array<{ term: string; body: string }>;
}> = {
  overview: {
    title: "このページの見方",
    lead: "有名投資家や大口投資家の公開書類から、気になる銘柄を探すページです。ここだけで買う判断をせず、候補を見つけるための入口として使います。",
    points: [
      { label: "最初に見る場所", body: "上の4つの数字で全体感を見ます。特に「調査優先」が多い日は、詳細確認する候補が増えています。" },
      { label: "次に見る場所", body: "「追随価値トップ候補」と一覧表で、スコアが高く、開示後に急騰しすぎていない銘柄を探します。" },
      { label: "最後にすること", body: "詳細ボタンから公式提出PDFを開き、提出書類の本文、保有目的、価格の織り込みを確認します。" },
    ],
    terms: [
      { term: "スマートマネー", body: "有名ファンド、機関投資家、大口投資家など、市場で影響力が大きい資金の動きです。" },
      { term: "追随価値", body: "後から調べる価値の目安です。高いほど有望とは限らず、あくまで調査の優先順位です。" },
      { term: "コピー買い", body: "有名投資家が買ったから自分もすぐ買う、という行動です。このページでは推奨していません。" },
    ],
  },
  status: {
    title: "接続ステータスの見方",
    lead: "この行は、外部データを実際に取得できているかを示します。緑に近いほど現在の実データを使えています。",
    points: [
      { label: "データ 実取得", body: "外部APIから取得したデータを表示しています。フォールバックは、外部取得できない時の予備データです。" },
      { label: "SEC / EDINET", body: "SECは米国開示、EDINETは日本の開示です。「接続中」なら取得できています。" },
      { label: "価格 一部接続", body: "Yahoo Financeから取れる銘柄だけ価格反応を補正しています。EDINETで証券コードが無い書類は価格補正できないことがあります。" },
    ],
  },
  topCandidates: {
    title: "トップ候補の見方",
    lead: "ここは、いま優先して調べる候補のショートリストです。買い推奨ではなく、調査の順番を決める場所です。",
    points: [
      { label: "追随価値", body: "ファンドの信頼度、保有の大きさ、開示の新しさ、価格の上がりすぎなどをまとめた点数です。" },
      { label: "未織り込み", body: "開示後の株価上昇がまだ大きくない状態です。良い材料が残っている可能性があります。" },
      { label: "調査優先", body: "一次開示を読んで確認する価値が高い候補です。すぐ買うサインではありません。" },
    ],
  },
  tableTerms: {
    title: "一覧表の専門用語",
    lead: "一覧表は、候補を横比較するための場所です。初心者はまず「判定」「追随価値」「織り込み」「反証」を見れば十分です。",
    points: [
      { label: "判定", body: "調査優先、監視、コピー非推奨の3段階です。迷ったら調査優先だけ詳細確認します。" },
      { label: "比率", body: "そのファンドの保有資産の中で、どれくらい大きい銘柄かを示します。高いほど本気度が高い傾向です。" },
      { label: "変化", body: "前回開示から増えたか減ったかです。プラスは買い増し、マイナスは縮小です。" },
      { label: "遅延", body: "実際の報告日から開示されるまでの遅れです。13Fは遅れが大きく、すでに売っている可能性があります。" },
      { label: "開示後", body: "報告日以降に株価がどれくらい動いたかです。大きく上がりすぎていると後追いリスクが上がります。" },
      { label: "反証", body: "買わない理由、または慎重になる理由です。良い候補ほど反証確認が大事です。" },
    ],
    terms: [
      { term: "13F", body: "米国の機関投資家が四半期ごとに出す保有銘柄リストです。便利ですが遅延があります。" },
      { term: "13D / 13G", body: "米国で5%超保有した時の大量保有系の開示です。13Dは経営関与の意図が読みやすい書類です。" },
      { term: "EDINET", body: "日本の金融庁の開示システムです。大量保有報告書や変更報告書を確認できます。" },
      { term: "アクティビスト", body: "企業に資本政策や経営改善を求める投資家です。株価材料になりやすい一方、思惑先行にも注意が必要です。" },
    ],
  },
  funds: {
    title: "監視ファンドの見方",
    lead: "ここは、どの投資家や開示ルートを見張っているかの一覧です。EDINETの個別提出者が毎回ここへ追加されるわけではありません。",
    points: [
      { label: "信頼", body: "過去の投資行動や長期性をもとにした、このページ内の目安です。" },
      { label: "読解", body: "開示から投資意図を読み取りやすいかの目安です。13DやEDINETは本文確認が重要です。" },
      { label: "遅延", body: "開示が遅れているリスクです。高いほど、見た時点では情報が古い可能性があります。" },
    ],
  },
};

const BeginnerGuideButton = ({ topic, onOpen, label = "初心者向け" }: { topic: BeginnerGuideKey; onOpen: (topic: BeginnerGuideKey) => void; label?: string }) => (
  <button
    type="button"
    onClick={() => onOpen(topic)}
    className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-emerald-200 bg-emerald-50 px-2 text-xs font-black text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    aria-label={`${label}の説明を開く`}
    title={`${label}の説明`}
  >
    <span aria-hidden="true" className="text-sm leading-none">🔰</span>
    <span>{label}</span>
  </button>
);

const funds: FundSeed[] = [
  { id: "brk", name: "Berkshire Hathaway", manager: "Warren Buffett", style: "長期バリュー", jurisdiction: "US", reliability: 96, readable: 88, lagRisk: 72 },
  { id: "pershing", name: "Pershing Square", manager: "Bill Ackman", style: "アクティビスト", jurisdiction: "US", reliability: 89, readable: 82, lagRisk: 58 },
  { id: "baupost", name: "Baupost Group", manager: "Seth Klarman", style: "長期バリュー", jurisdiction: "US", reliability: 86, readable: 74, lagRisk: 69 },
  { id: "thirdpoint", name: "Third Point", manager: "Dan Loeb", style: "イベント", jurisdiction: "US", reliability: 78, readable: 68, lagRisk: 63 },
  { id: "elliott", name: "Elliott Management", manager: "Paul Singer", style: "アクティビスト", jurisdiction: "US", reliability: 84, readable: 70, lagRisk: 49 },
  { id: "appaloosa", name: "Appaloosa", manager: "David Tepper", style: "イベント", jurisdiction: "US", reliability: 76, readable: 58, lagRisk: 76 },
  { id: "duquesne", name: "Duquesne Family Office", manager: "Stanley Druckenmiller", style: "グロース", jurisdiction: "US", reliability: 82, readable: 61, lagRisk: 79 },
  { id: "scion", name: "Scion Asset Management", manager: "Michael Burry", style: "イベント", jurisdiction: "US", reliability: 70, readable: 52, lagRisk: 82 },
  { id: "japan-activist", name: "日本株アクティビスト群", manager: "大量保有報告書", style: "アクティビスト", jurisdiction: "JP", reliability: 79, readable: 76, lagRisk: 34 },
];

const signalSeeds: FilingSignalSeed[] = [
  {
    id: "s1",
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
    note: "長期保有の継続買い増し。株価反応はまだ限定的。",
  },
  {
    id: "s2",
    fundId: "pershing",
    ticker: "CP",
    company: "Canadian Pacific Kansas City",
    filingType: "13F",
    signalType: "新規買い",
    reportDate: "2026-03-31",
    filingDate: "2026-05-14",
    portfolioWeight: 8.6,
    positionChange: 100,
    priceMoveSinceReport: 14.8,
    multiFundCount: 1,
    activistIntent: false,
    concentrationRank: 4,
    note: "集中投資家の上位保有入り。ただし開示後の上昇が大きい。",
  },
  {
    id: "s3",
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
    note: "13D系の経営関与候補。本文の目的欄を最優先で精査。",
  },
  {
    id: "s4",
    fundId: "baupost",
    ticker: "GOOGL",
    company: "Alphabet",
    filingType: "13F",
    signalType: "買い増し",
    reportDate: "2026-03-31",
    filingDate: "2026-05-13",
    portfolioWeight: 6.1,
    positionChange: 18.4,
    priceMoveSinceReport: 1.7,
    multiFundCount: 4,
    activistIntent: false,
    concentrationRank: 5,
    note: "複数ファンド一致。開示後の織り込みは比較的浅い。",
  },
  {
    id: "s5",
    fundId: "duquesne",
    ticker: "NVDA",
    company: "NVIDIA",
    filingType: "13F",
    signalType: "縮小",
    reportDate: "2026-03-31",
    filingDate: "2026-05-15",
    portfolioWeight: 2.9,
    positionChange: -38.5,
    priceMoveSinceReport: 22.4,
    multiFundCount: 2,
    activistIntent: false,
    concentrationRank: 12,
    note: "グロース系の縮小。人気銘柄の後追い買いは反証優先。",
  },
  {
    id: "s6",
    fundId: "japan-activist",
    ticker: "7201",
    company: "日産自動車",
    filingType: "EDINET",
    signalType: "大量保有",
    reportDate: "2026-06-28",
    filingDate: "2026-07-02",
    portfolioWeight: 5.4,
    positionChange: 100,
    priceMoveSinceReport: 2.1,
    multiFundCount: 1,
    activistIntent: true,
    concentrationRank: 3,
    note: "日本株の大量保有候補。変更報告の連続性を確認。",
  },
  {
    id: "s7",
    fundId: "scion",
    ticker: "BABA",
    company: "Alibaba",
    filingType: "13F",
    signalType: "新規買い",
    reportDate: "2026-03-31",
    filingDate: "2026-05-14",
    portfolioWeight: 11.2,
    positionChange: 100,
    priceMoveSinceReport: -4.6,
    multiFundCount: 1,
    activistIntent: false,
    concentrationRank: 2,
    note: "集中度は高いが、回転が速いファンドのため追随リスク大。",
  },
];

const researchSources = [
  {
    label: "SEC Form 13F",
    url: "https://www.sec.gov/files/form13f.pdf",
    memo: "1億ドル以上の13(f)証券を運用する機関投資家は、四半期末・年末後45日以内にForm 13Fを提出する。",
  },
  {
    label: "SEC EDGAR APIs",
    url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
    memo: "data.sec.govは認証キー不要のJSON APIを提供し、提出履歴は日中リアルタイムに更新される。CORS非対応のためサーバー側取得が必要。",
  },
  {
    label: "Investor.gov 13D/13G",
    url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/schedules-13d-and-13g",
    memo: "5%超の実質保有者は13D、条件により13Gを提出。13Dは取得後5日以内、重要変更は速やかな訂正が必要。",
  },
  {
    label: "EDINET 大量保有",
    url: "https://disclosure2.edinet-fsa.go.jp/weee0010.aspx",
    memo: "金融庁EDINETは大量保有報告書・変更報告書のタクソノミ、インスタンス、コードリストを公開している。",
  },
];

const legalWatchRoutes = [
  {
    title: "EDGAR最新提出",
    detail: "13F、13D/13G、Form 4、N-PORTを提出直後に検知し、大口・内部者・ファンド保有の変化を拾う。",
  },
  {
    title: "EDINET大量保有",
    detail: "日本株の大量保有報告書、変更報告書、共同保有者、保有目的の変化を継続監視する。",
  },
  {
    title: "空売り・需給",
    detail: "JPXの空売り残高、信用残、出来高急増、ブロック取引報道を突き合わせて需給の偏りを見る。",
  },
  {
    title: "オプション・イベント",
    detail: "異常な建玉、TOB、増資、自社株買い、アクティビスト書簡など公開材料だけで補助判定する。",
  },
];

const dayDiff = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));

const getFund = (fundId: string, fundList: FundSeed[] = funds) => fundList.find((fund) => fund.id === fundId) ?? fundList[0] ?? funds[0];
const formatSignedPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const isPlaceholderPositionChange = (signal: FilingSignalSeed) =>
  signal.positionChange === 100 &&
  (signal.signalType === "新規買い" ||
    signal.signalType === "大量保有" ||
    signal.filingType === "EDINET" ||
    signal.filingType === "13D" ||
    signal.filingType === "13G");

const formatPortfolioWeightLabel = (signal: FilingSignalSeed) =>
  signal.portfolioWeight > 0 ? `${signal.portfolioWeight.toFixed(1)}%` : "PDF記載";

const formatPositionChangeLabel = (signal: FilingSignalSeed) => {
  if (isPlaceholderPositionChange(signal)) {
    if (signal.signalType === "新規買い") return "新規買い";
    if (signal.filingType === "EDINET") {
      if (signal.note.includes("変更報告書")) return "増減あり(PDF)";
      if (signal.note.includes("訂正報告書")) return "訂正報告(PDF)";
      return "新規(5%超)";
    }
    return "新規(5%超)";
  }
  if (Math.abs(signal.positionChange) < 0.05) return "増減なし";
  return formatSignedPercent(signal.positionChange);
};

const isPriceMoveEvaluated = (signal: FilingSignalSeed) =>
  Boolean(signal.priceEvaluated) ||
  signal.priceMoveSinceReport !== 0 ||
  signal.note.includes("Yahoo Finance日足で再評価済み");

const formatPriceMoveLabel = (signal: FilingSignalSeed) => {
  if (!isPriceMoveEvaluated(signal)) {
    const rawTicker = String(signal.ticker ?? "").trim().toUpperCase();
    return !rawTicker || rawTicker === "EDINET" || rawTicker === "SEC" ? "非上場" : "—";
  }
  if (Math.abs(signal.priceMoveSinceReport) < 0.05) {
    return "0.0%";
  }
  return formatSignedPercent(signal.priceMoveSinceReport);
};

const getEffectivePositionChange = (signal: FilingSignalSeed) => {
  if (isPlaceholderPositionChange(signal)) {
    return signal.signalType === "新規買い" ? 28 : 16;
  }
  return signal.positionChange;
};

type ScoreRank = "S" | "A" | "B" | "C";

const rankBadgeClass = (rank: ScoreRank) => {
  if (rank === "S") return "bg-emerald-600 text-white";
  if (rank === "A") return "bg-primary text-primary-foreground";
  if (rank === "B") return "border border-sky-200 bg-sky-50 text-sky-800";
  return "border border-border bg-muted text-muted-foreground";
};

const scoreSignal = (signal: FilingSignalSeed, fundList: FundSeed[] = funds) => {
  const fund = getFund(signal.fundId, fundList);
  const filingLagDays = Math.max(0, dayDiff(signal.reportDate, signal.filingDate));
  const todayIso = new Date().toISOString().slice(0, 10);
  const daysSinceFiling = Math.max(0, dayDiff(signal.filingDate, todayIso));
  const pricePenalty = Math.max(0, signal.priceMoveSinceReport - 5) * 1.4;
  const stylePenalty = fund.style === "クオンツ" ? 18 : fund.style === "イベント" ? 6 : 0;

  // 100点満点に正規化した配点（天井張り付きを防ぎ、鮮度・本気度・複数一致で明確に差をつける）
  const effectivePositionChange = getEffectivePositionChange(signal);
  const fundQuality = fund.reliability * 0.16 + fund.readable * 0.1; // 最大 ~26点
  const conviction =
    Math.min(12, signal.portfolioWeight * 0.85)
    + Math.min(10, Math.max(0, effectivePositionChange) * 0.12)
    + (signal.concentrationRank <= 3 ? 6 : signal.concentrationRank <= 7 ? 4 : signal.concentrationRank <= 12 ? 2 : 0); // 最大28点
  const filingTypeScore = signal.filingType === "13D" || signal.filingType === "EDINET" ? 8 : signal.filingType === "13G" ? 5 : 2;
  const lagFreshness = Math.max(0, 7 - Math.floor(filingLagDays / 6)); // 遅延少ないほど高点（最大7点）
  const recencyScore = daysSinceFiling <= 3 ? 7 : daysSinceFiling <= 7 ? 5 : daysSinceFiling <= 14 ? 3 : daysSinceFiling <= 30 ? 1 : 0; // 提出鮮度（最大7点）
  const consensusBoost = Math.min(10, Math.max(0, signal.multiFundCount - 1) * 4); // 最大10点
  const activistBoost = signal.activistIntent ? 8 : 0; // 最大8点
  const sellPenalty = signal.signalType === "縮小" ? 26 : signal.signalType === "全売却" ? 42 : 0;

  const raw =
    fundQuality
    + conviction
    + filingTypeScore
    + lagFreshness
    + recencyScore
    + consensusBoost
    + activistBoost
    - pricePenalty
    - stylePenalty
    - sellPenalty;
  const score = Math.max(5, Math.min(98, Math.round(raw)));
  const isSell = signal.signalType === "全売却" || signal.signalType === "縮小";
  const rank: ScoreRank = isSell
    ? "C"
    : score >= 82
      ? "S"
      : score >= 70
        ? "A"
        : score >= 55
          ? "B"
          : "C";

  const verdict =
    isSell
      ? "コピー非推奨"
      : score >= 72
        ? "調査優先"
        : score >= 55
          ? "監視"
          : pricePenalty >= 10
            ? "織り込み注意"
            : "低信頼";
  const risk =
    pricePenalty >= 14
      ? "開示後急騰"
      : fund.readable < 60
          ? "戦略不透明"
          : isSell
            ? "売却系"
            : "許容";

  return { fund, score, rank, verdict, risk, filingLagDays, pricePenalty };
};

type ScoredSignal = FilingSignalSeed & ReturnType<typeof scoreSignal>;
type DisplaySignal = ScoredSignal & { relatedCount: number };

const verdictClass = (verdict: string) => {
  if (verdict === "調査優先") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (verdict === "監視") return "border-sky-200 bg-sky-50 text-sky-700";
  if (verdict === "織り込み注意") return "border-amber-200 bg-amber-50 text-amber-700";
  if (verdict === "コピー非推奨") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const styleClass = (style: FundStyle) => {
  if (style === "長期バリュー") return "bg-blue-50 text-blue-700";
  if (style === "アクティビスト") return "bg-rose-50 text-rose-700";
  if (style === "グロース") return "bg-violet-50 text-violet-700";
  if (style === "イベント") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const hasDisplayTicker = (signal: FilingSignalSeed) => signal.ticker !== "EDINET";

const getSignalSourceUrl = (signal: FilingSignalSeed) => {
  if (!signal.sourceUrl) return "";
  if (signal.source !== "edinet") return signal.sourceUrl;

  try {
    const url = new URL(signal.sourceUrl, window.location.origin);
    const docId = url.searchParams.get("docID") || url.searchParams.get("docId");
    return docId ? `/api/edinet-document?docId=${encodeURIComponent(docId)}&type=2&inline=1` : signal.sourceUrl;
  } catch {
    return signal.sourceUrl;
  }
};

const getSignalViewerUrl = (signal: FilingSignalSeed) => {
  const sourceUrl = getSignalSourceUrl(signal);
  if (!sourceUrl) return "";
  return signal.source === "edinet" ? `${sourceUrl}#toolbar=0&navpanes=0` : sourceUrl;
};

const edinetMarketOverrides: Record<string, string> = {
  "2656": "東証スタンダード",
};

const addEdinetSignalsToChartSearch = (signals: FilingSignalSeed[]) => {
  if (typeof window === "undefined") return;

  for (const signal of signals) {
    if (signal.source !== "edinet") continue;
    if (!/^\d{4}$/.test(signal.ticker)) continue;
    if (!signal.company || signal.company === "対象銘柄不明") continue;

    addChartWatchlistStock({
      code: signal.ticker,
      name: signal.company.replace(/^株式会社/, ""),
      market: edinetMarketOverrides[signal.ticker] ?? "EDINET検知",
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      open: 0,
      high: 0,
      low: 0,
      previousClose: 0,
      sourceLabel: "EDINET検知",
      addedDate: signal.filingDate,
    });
  }
};

const groupSignalKey = (signal: ScoredSignal) => {
  const normalizedCompany = signal.company.trim().toLowerCase();
  if (signal.source === "edinet") {
    return [
      signal.source,
      signal.fundId,
      signal.ticker === "EDINET" ? "no-code" : signal.ticker,
      normalizedCompany,
      signal.filerName ?? "",
      signal.filingDate,
    ].join("|");
  }
  return [signal.source ?? "fallback", signal.fundId, signal.ticker, normalizedCompany, signal.filingType].join("|");
};

const groupSignalsForDisplay = (signals: ScoredSignal[]): DisplaySignal[] => {
  const groups = new Map<string, ScoredSignal[]>();
  for (const signal of signals) {
    const key = groupSignalKey(signal);
    groups.set(key, [...(groups.get(key) ?? []), signal]);
  }

  return Array.from(groups.values())
    .map((group) => {
      const representative = [...group].sort((a, b) => b.score - a.score || b.multiFundCount - a.multiFundCount)[0];
      const newest = [...group].sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())[0];
      return {
        ...representative,
        filingDate: newest.filingDate,
        reportDate: newest.reportDate,
        relatedCount: group.length,
        multiFundCount: Math.max(representative.multiFundCount, group.length),
        note: group.length > 1
          ? `${representative.note} 同じ提出者・銘柄の関連書類${group.length}件を一覧では1行にまとめています。`
          : representative.note,
      };
    })
    .sort((a, b) => b.score - a.score);
};

const filingSourceLabel = (signal: ScoredSignal) => {
  if (signal.filingType === "13F") return "SEC submissions API と13F information table";
  if (signal.filingType === "13D") return "SEC Schedule 13D本文、Item 4の保有目的、Item 5の保有比率";
  if (signal.filingType === "13G") return "SEC Schedule 13G本文、保有区分と受動保有条件";
  return "EDINET大量保有報告書・変更報告書、保有目的、共同保有者、保有割合";
};

const lagAssessment = (signal: ScoredSignal) => {
  if (signal.filingType === "13F") {
    return signal.filingLagDays >= 40
      ? "13Fは四半期末から提出までの遅れが大きく、既に解消済みの可能性を強めに差し引きます。"
      : "13Fとしては比較的早い確認ですが、四半期末時点の保有である点は残ります。";
  }
  return signal.filingLagDays <= 5
    ? "大量保有系として鮮度が高く、投資家の関与意図を読む価値が高い開示です。"
    : "大量保有系としては遅れがあり、提出日までの株価反応を確認してから扱います。";
};

const priceAssessment = (signal: ScoredSignal) => {
  if (signal.priceMoveSinceReport >= 12) return "報告日から大きく上昇しており、後追い期待値は下げて反証優先にします。";
  if (signal.priceMoveSinceReport >= 6) return "一定の織り込みがあります。提出後の出来高急増とニュース反応を確認します。";
  if (signal.priceMoveSinceReport >= 0) return "上昇は限定的で、まだ調査余地が残っている候補として扱えます。";
  return "報告日以降に下落しており、ファンドの仮説が崩れたのか市場の過小評価なのかを切り分けます。";
};

const getFreshnessBadge = (signal: ScoredSignal) => {
  if (signal.filingType === "13F" && signal.filingLagDays >= 40) {
    return {
      label: "鮮度低",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      detail: "13Fの45日遅延に近く、四半期中に解消済みの可能性を強めに差し引きます。",
    };
  }
  if (signal.filingType === "13D" || signal.filingType === "EDINET") {
    return {
      label: "鮮度高",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      detail: "大量保有系は提出までの遅れが短く、保有目的や関与意図を読む価値が高い開示です。",
    };
  }
  return {
    label: "鮮度中",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    detail: "13Fとして扱い、次回提出で継続保有かを確認してから確度を上げます。",
  };
};

const getPricingBadge = (signal: ScoredSignal) => {
  if (signal.priceMoveSinceReport >= 12) {
    return {
      label: "織り込み濃厚",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      detail: "報告日以降の上昇が大きく、材料の後追いより押し目・反証確認を優先します。",
    };
  }
  if (signal.priceMoveSinceReport >= 6) {
    return {
      label: "一部織り込み",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      detail: "一定の価格反応があります。出来高急増や関連ニュースが一過性かを確認します。",
    };
  }
  if (signal.priceMoveSinceReport >= 0) {
    return {
      label: "未織り込み余地",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      detail: "価格反応は限定的です。開示本文と継続買いの確認に進む価値があります。",
    };
  }
  return {
    label: "逆行中",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    detail: "報告日以降に下落しています。市場が嫌った材料か、過小評価かを切り分けます。",
  };
};

const buildFollowScoreBreakdown = (signal: ScoredSignal) => {
  const freshness = 18;
  const fundQuality = signal.fund.reliability * 0.16 + signal.fund.readable * 0.1;
  const conviction = Math.min(22, signal.portfolioWeight * 1.6 + Math.max(0, getEffectivePositionChange(signal)) * 0.08);
  const notPricedIn = Math.max(0, 20 - Math.max(0, signal.priceMoveSinceReport - 1) * 1.45);
  const intent = Math.min(16, (signal.multiFundCount - 1) * 4 + (signal.activistIntent ? 8 : 0) + (signal.concentrationRank <= 5 ? 4 : 0));
  const riskPenalty =
    (signal.signalType === "縮小" ? 16 : signal.signalType === "全売却" ? 28 : 0)
    + (signal.fund.style === "イベント" ? 4 : 0)
    + (signal.risk === "戦略不透明" ? 6 : 0);
  const freshnessReason = "開示遅延による自動減点は行いません。開示日と保有基準日の差は、一次資料を読む際の確認情報として表示しています。";
  const priceReason = signal.priceMoveSinceReport >= 12
    ? `報告日以降に${formatSignedPercent(signal.priceMoveSinceReport)}上昇しており、材料がかなり織り込まれた前提で点数を抑えています。`
    : signal.priceMoveSinceReport >= 6
      ? `報告日以降に${formatSignedPercent(signal.priceMoveSinceReport)}上昇済みです。まだ余地はありますが、短期の追随買いは少し慎重に見ます。`
      : signal.priceMoveSinceReport >= 0
        ? `報告日以降の上昇は${formatSignedPercent(signal.priceMoveSinceReport)}にとどまり、開示材料がまだ十分に織り込まれていない可能性を加点しています。`
        : `報告日以降は${formatSignedPercent(signal.priceMoveSinceReport)}です。市場が嫌った理由がなければ、逆張り候補として確認します。`;
  const intentReason = [
    `${signal.multiFundCount}ファンドが同じ方向で検出されています`,
    signal.activistIntent ? "保有目的に経営関与・資本政策の可能性があるため加点" : "明確な経営関与意図は未確認",
    signal.concentrationRank <= 5 ? `保有集中順位${signal.concentrationRank}位で、重要ポジションとして加点` : `保有集中順位${signal.concentrationRank}位で、集中度加点は限定的`,
  ].join("。");
  const riskReason = riskPenalty > 0
    ? [
        signal.signalType === "縮小" ? "縮小シグナルなので買い材料として減点" : signal.signalType === "全売却" ? "全売却シグナルなので大きく減点" : "",
        signal.fund.style === "イベント" ? "イベント型は保有期間が短い場合があるため小さく減点" : "",
        signal.risk === "戦略不透明" ? "戦略不透明のため、意図を読みにくい分を減点" : "",
      ].filter(Boolean).join("。")
    : "売却・全売却・イベント性・戦略不透明による自動減点はありません。";

  return [
    {
      label: "開示鮮度",
      value: Math.round(freshness),
      max: 18,
      note: `${freshnessReason} ${getFreshnessBadge(signal).detail}`,
      tone: freshness >= 13 ? "bg-emerald-500" : freshness >= 8 ? "bg-sky-500" : "bg-amber-500",
    },
    {
      label: "ファンド品質",
      value: Math.round(fundQuality),
      max: 26,
      note: `${signal.fund.name}の過去の信頼度${signal.fund.reliability}と、提出内容の読みやすさ${signal.fund.readable}を点数化しています。高いほど「真似してよい根拠を確認しやすい」扱いです。`,
      tone: "bg-primary",
    },
    {
      label: "保有強度",
      value: Math.round(conviction),
      max: 22,
      note: `保有比率${signal.portfolioWeight.toFixed(1)}%、ポジション変化は${formatPositionChangeLabel(signal)}、集中順位${signal.concentrationRank}位を見ています。比率が高く、買い増し・新規取得で、上位保有ほど本気度が高いと判断します。`,
      tone: signal.positionChange >= 0 ? "bg-emerald-500" : "bg-rose-500",
    },
    {
      label: "未織り込み",
      value: Math.round(notPricedIn),
      max: 20,
      note: `${priceReason} ${getPricingBadge(signal).detail}`,
      tone: notPricedIn >= 14 ? "bg-emerald-500" : notPricedIn >= 8 ? "bg-amber-500" : "bg-rose-500",
    },
    {
      label: "意図・一致",
      value: Math.round(intent),
      max: 16,
      note: `${intentReason}。単独ファンドだけの偶然より、複数ファンド一致や経営関与の意図がある場合を重く見ます。`,
      tone: signal.activistIntent ? "bg-rose-500" : "bg-sky-500",
    },
    {
      label: "反証減点",
      value: -Math.round(riskPenalty),
      max: 28,
      note: `${riskReason} ここは「買ってよい理由」ではなく、「真似しない方がよい理由」があるかを確認する欄です。`,
      tone: riskPenalty > 0 ? "bg-rose-500" : "bg-slate-300",
    },
  ];
};

const buildCounterReasons = (signal: ScoredSignal) => {
  const reasons: string[] = [];
  const hasPriceRefresh = signal.note.includes("Yahoo Finance日足で再評価済み");
  if (signal.source === "edinet") {
    if (signal.company === "対象銘柄不明") reasons.push("対象銘柄をXBRLから特定できていないため、本文確認を優先。");
    if (!hasPriceRefresh) reasons.push("価格取得が未完了のため、開示後の織り込み判定は弱めに見る。");
    if (signal.portfolioWeight >= 20) reasons.push(`保有割合が${signal.portfolioWeight.toFixed(1)}%と高く、TOB・親子上場・支配権絡みの可能性を確認。`);
    if ((signal.filerName ?? "").match(/証券|アセット|投資|Capital|Management/i)) reasons.push("運用会社・証券会社の提出なので、特例報告や複数顧客分の可能性を確認。");
  }
  if (signal.filingType === "13F") reasons.push("13Fは四半期末時点の保有で、提出時点の継続保有は未確認。");
  if (signal.filingLagDays >= 40) reasons.push("開示遅延が大きく、既に売却済みの可能性がある。");
  if (signal.priceMoveSinceReport >= 12) reasons.push("報告日以降の上昇が大きく、短期の後追い期待値は低下。");
  if (signal.signalType === "縮小" || signal.signalType === "全売却") reasons.push("売却・縮小系のシグナルなので買い材料として扱わない。");
  if (signal.fund.style === "イベント" || signal.fund.style === "クオンツ") reasons.push(`${signal.fund.style}は回転が速く、後追いに不向きな場合がある。`);
  if (signal.multiFundCount <= 1) reasons.push("単独ファンドの動きで、テーマ全体の合意形成はまだ弱い。");
  if (!reasons.length) reasons.push("明確な停止条件は少ないが、本文・出来高・次回提出で確認してから判断する。");
  return reasons;
};

const getNextAction = (signal: ScoredSignal) => {
  if (signal.signalType === "縮小" || signal.signalType === "全売却") return "買いではなく弱気材料として同業・指数との比較へ";
  if (signal.priceMoveSinceReport >= 12) return "追随買いは保留し、押し目・出来高・材料出尽くしを確認";
  if (signal.source === "edinet") {
    if (signal.company === "対象銘柄不明") return "公式提出PDFを開き、対象銘柄名と証券コードを手動確認";
    if (signal.portfolioWeight >= 20) return "公式提出PDFの保有目的、TOB・非公開化・支配権変更の記載を最優先で確認";
    if (!signal.note.includes("Yahoo Finance日足で再評価済み")) return "公式提出PDF確認後、価格チャートを手動確認し開示後急騰済みか判定";
    if ((signal.filerName ?? "").match(/証券|アセット|投資|Capital|Management/i)) return "公式提出PDFの保有目的で、特例報告か経営関与意図か確認";
    return "公式提出PDFの保有目的、共同保有者、直近60日の取得・処分を確認";
  }
  if (signal.activistIntent) return "提出本文の保有目的、共同保有者、資本政策要求を確認";
  if (signal.filingType === "13F") return "次回13Fで継続保有か、直近ニュースで売却示唆がないか確認";
  return "提出後の出来高と同業比較を見て調査候補に残す";
};

const buildPriceReactionRows = (signal: ScoredSignal) => {
  const midpointMove = signal.priceMoveSinceReport * (signal.filingLagDays <= 7 ? 0.7 : 0.45);
  const benchmarkMove = signal.filingType === "EDINET" ? 0.8 : signal.filingType === "13D" ? 1.6 : 3.4;
  const relativeMove = signal.priceMoveSinceReport - benchmarkMove;

  return [
    { label: "報告日から提出日", value: formatSignedPercent(midpointMove), memo: "大口の保有基準日から市場がどれだけ先に反応したか。" },
    { label: "報告日から現在", value: formatSignedPercent(signal.priceMoveSinceReport), memo: getPricingBadge(signal).label },
    { label: "市場平均との差", value: formatSignedPercent(relativeMove), memo: relativeMove > 8 ? "指数対比でも急騰気味" : relativeMove < -3 ? "市場に劣後、逆張り調査向き" : "指数対比では中立圏" },
  ];
};

const formatJstDateTime = (date: Date) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

const checklistStatusClass = (status: string) => {
  if (status === "自動確認") return "bg-emerald-50 text-emerald-700";
  if (status === "注意") return "bg-amber-50 text-amber-700";
  if (status === "要確認") return "bg-rose-50 text-rose-700";
  if (status === "監視中") return "bg-sky-50 text-sky-700";
  return "bg-muted text-slate-600";
};

const sourceStatusLabel = (status?: string) => {
  if (status === "live") return "接続中";
  if (status === "snapshot") return "保存データ";
  if (status === "partial") return "一部接続";
  if (status === "empty") return "提出なし";
  if (status === "missing-key") return "キー未設定";
  if (status === "not-connected") return "未接続";
  if (status === "error") return "取得失敗";
  return "確認中";
};

const sourceStatusClass = (status?: string) => {
  if (status === "live") return "bg-emerald-50 text-emerald-700";
  if (status === "snapshot") return "bg-sky-50 text-sky-700";
  if (status === "partial") return "bg-sky-50 text-sky-700";
  if (status === "missing-key" || status === "not-connected") return "bg-amber-50 text-amber-700";
  if (status === "error") return "bg-rose-50 text-rose-700";
  return "bg-muted text-slate-600";
};

const buildSignalReportCards = (signal: ScoredSignal) => [
  {
    title: "1. データ取得",
    icon: Database,
    body: `${filingSourceLabel(signal)}を一次情報として確認します。${signal.filingType} ${signal.signalType}の開示なので、まず報告日、提出日、保有比率、増減、保有目的を分けて記録します。`,
    points: [
      `報告日: ${signal.reportDate}`,
      `提出日: ${signal.filingDate}`,
      `確認対象: ${signal.company} (${signal.ticker})`,
    ],
  },
  {
    title: "2. 保有差分",
    icon: Layers3,
    body: `前回提出と比較し、${signal.signalType}として扱います。ポートフォリオ比率は${signal.portfolioWeight.toFixed(1)}%、保有変化は${formatPositionChangeLabel(signal)}です。`,
    points: [
      `集中順位: ${signal.concentrationRank}位`,
      `複数ファンド一致: ${signal.multiFundCount}件`,
      signal.positionChange >= 0 ? "買い方向の差分を調査候補として加点" : "縮小方向の差分なので追随買いは減点",
    ],
  },
  {
    title: "3. 遅延・価格補正",
    icon: Clock3,
    body: `${lagAssessment(signal)} ${priceAssessment(signal)}`,
    points: [
      `開示遅延: ${signal.filingLagDays}日`,
      `報告日以降の株価変化: ${signal.priceMoveSinceReport >= 0 ? "+" : ""}${signal.priceMoveSinceReport.toFixed(1)}%`,
      `補正後リスク: ${signal.risk}`,
    ],
  },
  {
    title: "4. 反証チェック",
    icon: ShieldAlert,
    body: `この候補は「${signal.verdict}」ですが、機械的なコピーはしません。${signal.fund.style}ファンドのため、保有期間、ヘッジ、イベント性、提出後の織り込みを必ず確認します。`,
    points: [
      `ファンド読解度: ${signal.fund.readable}`,
      `ファンド信頼度: ${signal.fund.reliability}`,
      signal.activistIntent ? "経営関与・資本政策の意図を本文で確認" : "13F系は保有目的が読めないため価格と継続性で補正",
    ],
  },
  {
    title: "5. 調査判断",
    icon: Gauge,
    body: `総合スコアは${signal.score}です。${signal.note} 最終判断は、一次開示、提出後株価、次回提出での継続性が揃った場合にだけ強めます。`,
    points: [
      `現在判定: ${signal.verdict}`,
      `ファンド: ${signal.fund.name}`,
      `スタイル: ${signal.fund.style}`,
    ],
  },
];

const buildSignalChecklist = (signal: ScoredSignal, refreshedAt: Date) => {
  const highPriceMove = signal.priceMoveSinceReport >= 8;
  const needsManualFilingReview = signal.activistIntent || signal.filingType === "13D" || signal.filingType === "EDINET";
  const needsRiskReview = signal.risk !== "許容" || signal.signalType === "縮小" || signal.signalType === "全売却";

  return [
    {
      label: "一次開示",
      status: needsManualFilingReview ? "要確認" : "自動確認",
      detail: `${filingSourceLabel(signal)}を${formatJstDateTime(refreshedAt)}に再評価。本文の目的欄が重要な案件は人の確認を残します。`,
    },
    {
      label: "価格比較",
      status: highPriceMove ? "注意" : "自動確認",
      detail: `報告日、提出日、現在値を分けて比較。${highPriceMove ? "提出後の上昇が大きいため、後追い期待値を自動で下げています" : "急騰判定は出ていないため、調査候補として維持します"}。`,
    },
    {
      label: "継続性",
      status: signal.filingType === "13F" ? "監視中" : "自動確認",
      detail: `${signal.fund.name}の前回提出との差分を監視。13Fは次回四半期提出、13D/EDINETは変更報告の連続性を優先します。`,
    },
    {
      label: "反証",
      status: needsRiskReview ? "注意" : "自動確認",
      detail: `${signal.risk}として再評価。空売り、デリバティブ、イベント終了、指数要因で説明できないかを継続チェックします。`,
    },
    {
      label: "検証",
      status: "監視中",
      detail: "提出日翌日、5営業日、20営業日、60営業日の成績を指数と比較し、ファンド別の有効性を蓄積します。",
    },
  ];
};

const SmartMoneyPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedStyle, setSelectedStyle] = useState<"すべて" | FundStyle>("すべて");
  const resolveSmartMoneyTab = (param: string | null): "all" | "jp" | "us" | "priority" | "funds" => {
    if (param === "jp" || param === "us" || param === "priority" || param === "funds") return param;
    return "all";
  };
  const [activeTab, setActiveTab] = useState<"all" | "jp" | "us" | "priority" | "funds">(() =>
    resolveSmartMoneyTab(searchParams.get("tab"))
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(resolveSmartMoneyTab(tabParam));
    }
  }, [searchParams]);
  const [sortBy, setSortBy] = useState<"score" | "date" | "weight" | "move">("score");
  const [showGuideAccordion, setShowGuideAccordion] = useState(false);
  const [reportTab, setReportTab] = useState<"summary" | "analysis" | "sources">("summary");
  const [guideTab, setGuideTab] = useState<"steps" | "metrics" | "glossary">("steps");
  const [query, setQuery] = useState("");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [viewerSignalId, setViewerSignalId] = useState<string | null>(null);
  const [beginnerGuideTopic, setBeginnerGuideTopic] = useState<BeginnerGuideKey | null>(null);
  const [autoRefreshedAt, setAutoRefreshedAt] = useState(() => new Date());
  const [smartMoneyData, setSmartMoneyData] = useState<SmartMoneyPayload>({
    funds,
    signals: signalSeeds,
    source: "fallback",
    sourceStatus: { sec: "確認中", edinet: "確認中", price: "not-connected" },
    updatedAt: new Date().toISOString(),
  });
  const [smartMoneyStatus, setSmartMoneyStatus] = useState<"loading" | "live" | "fallback" | "error">("loading");
  const [isUsingCache, setIsUsingCache] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSmartMoney = async (force = false) => {
      try {
        setSmartMoneyStatus((current) => (current === "live" ? "live" : "loading"));
        const response = await fetch(`/api/smart-money${force ? "?force=1" : ""}`);
        if (!response.ok) throw new Error("smart money unavailable");
        const payload = await response.json() as SmartMoneyPayload;
        if (!isActive) return;
        setSmartMoneyData({
          funds: payload.funds?.length ? payload.funds : funds,
          signals: payload.signals?.length ? payload.signals : signalSeeds,
          source: payload.source ?? "fallback",
          sourceStatus: payload.sourceStatus,
          updatedAt: payload.updatedAt ?? new Date().toISOString(),
        });
        setAutoRefreshedAt(new Date(payload.updatedAt ?? Date.now()));
        setSmartMoneyStatus(payload.source === "live" ? "live" : "fallback");
        setIsUsingCache(false);

        // 成功データをローカルキャッシュに保存
        try {
          localStorage.setItem("stock-scout-smart-money-cache", JSON.stringify(payload));
        } catch (e) {
          console.error("Failed to save smart money cache", e);
        }
      } catch {
        if (!isActive) return;
        // キャッシュデータの読み込み試行
        let fallbackData: SmartMoneyPayload | null = null;
        try {
          const cached = localStorage.getItem("stock-scout-smart-money-cache");
          if (cached) {
            fallbackData = JSON.parse(cached) as SmartMoneyPayload;
          }
        } catch (e) {
          console.error("Failed to parse cached smart money", e);
        }

        if (fallbackData) {
          setSmartMoneyData({
            funds: fallbackData.funds?.length ? fallbackData.funds : funds,
            signals: fallbackData.signals?.length ? fallbackData.signals : signalSeeds,
            source: "fallback",
            sourceStatus: { sec: "エラー（キャッシュ表示）", edinet: "エラー（キャッシュ表示）", price: "partial" },
            updatedAt: fallbackData.updatedAt ?? new Date().toISOString(),
          });
          setAutoRefreshedAt(new Date(fallbackData.updatedAt ?? Date.now()));
          setSmartMoneyStatus("fallback");
          setIsUsingCache(true);
        } else {
          setSmartMoneyStatus("error");
          setAutoRefreshedAt(new Date());
          setIsUsingCache(false);
        }
      }
    };

    loadSmartMoney();
    const timer = window.setInterval(() => loadSmartMoney(), 5 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, []);

  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const lastRefresh = localStorage.getItem("stock-scout-last-manual-refresh");
    if (!lastRefresh) return 0;
    const passed = Date.now() - Number(lastRefresh);
    const remaining = 180 - Math.floor(passed / 1000);
    return remaining > 0 ? remaining : 0;
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = window.setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [cooldownSeconds]);

  const handleManualRefresh = async () => {
    if (cooldownSeconds > 0) return;
    setSmartMoneyStatus("loading");

    const now = Date.now();
    localStorage.setItem("stock-scout-last-manual-refresh", String(now));
    setCooldownSeconds(180);

    try {
      const response = await fetch("/api/smart-money?force=1");
      if (!response.ok) throw new Error("smart money unavailable");
      const payload = await response.json() as SmartMoneyPayload;
      setSmartMoneyData({
        funds: payload.funds?.length ? payload.funds : funds,
        signals: payload.signals?.length ? payload.signals : signalSeeds,
        source: payload.source ?? "fallback",
        sourceStatus: payload.sourceStatus,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
      });
      setAutoRefreshedAt(new Date(payload.updatedAt ?? Date.now()));
      setSmartMoneyStatus(payload.source === "live" ? "live" : "fallback");
      setIsUsingCache(false);

      // 成功データをローカルキャッシュに保存
      try {
        localStorage.setItem("stock-scout-smart-money-cache", JSON.stringify(payload));
      } catch (e) {
        console.error("Failed to save smart money cache", e);
      }
    } catch {
      // キャッシュデータの読み込み試行
      let fallbackData: SmartMoneyPayload | null = null;
      try {
        const cached = localStorage.getItem("stock-scout-smart-money-cache");
        if (cached) {
          fallbackData = JSON.parse(cached) as SmartMoneyPayload;
        }
      } catch (e) {
        console.error("Failed to parse cached smart money", e);
      }

      if (fallbackData) {
        setSmartMoneyData({
          funds: fallbackData.funds?.length ? fallbackData.funds : funds,
          signals: fallbackData.signals?.length ? fallbackData.signals : signalSeeds,
          source: "fallback",
          sourceStatus: { sec: "エラー（キャッシュ表示）", edinet: "エラー（キャッシュ表示）", price: "partial" },
          updatedAt: fallbackData.updatedAt ?? new Date().toISOString(),
        });
        setAutoRefreshedAt(new Date(fallbackData.updatedAt ?? Date.now()));
        setSmartMoneyStatus("fallback");
        setIsUsingCache(true);
      } else {
        setSmartMoneyStatus("error");
        setAutoRefreshedAt(new Date());
        setIsUsingCache(false);
      }
    }
  };

  const liveFunds = smartMoneyData.funds?.length ? smartMoneyData.funds : funds;
  const liveSignalSeeds = smartMoneyData.signals?.length ? smartMoneyData.signals : signalSeeds;

  useEffect(() => {
    addEdinetSignalsToChartSearch(liveSignalSeeds);
  }, [liveSignalSeeds]);

  const scoredSignals = useMemo(
    () =>
      liveSignalSeeds
        .map((signal) => ({ ...signal, ...scoreSignal(signal, liveFunds) }))
        .sort((a, b) => b.score - a.score),
    [liveFunds, liveSignalSeeds]
  );
  const filteredSignals = useMemo(
    () =>
      scoredSignals.filter((signal) => {
        if (selectedStyle !== "すべて" && signal.fund.style !== selectedStyle) return false;
        const normalized = query.trim().toLowerCase();
        if (!normalized) return true;
        return [signal.ticker, signal.company, signal.filerName ?? "", signal.fund.name, signal.fund.manager]
          .some((value) => value.toLowerCase().includes(normalized));
      }),
    [query, scoredSignals, selectedStyle]
  );
  const isJapanSignal = (signal: ScoredSignal) =>
    signal.source === "edinet" || signal.filingType === "EDINET" || signal.fund.jurisdiction === "JP";

  const displaySignals = useMemo(() => groupSignalsForDisplay(scoredSignals), [scoredSignals]);
  const jpCount = useMemo(() => displaySignals.filter(isJapanSignal).length, [displaySignals]);
  const usCount = useMemo(() => displaySignals.filter((signal) => !isJapanSignal(signal)).length, [displaySignals]);
  const priorityCount = displaySignals.filter((signal) => signal.verdict === "調査優先").length;
  const cautionCount = displaySignals.filter((signal) => signal.risk !== "許容").length;
  const averageScore = displaySignals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(displaySignals.length, 1);

  const filteredDisplaySignals = useMemo(() => {
    const base = groupSignalsForDisplay(filteredSignals).filter((signal) => {
      if (activeTab === "jp") return isJapanSignal(signal);
      if (activeTab === "us") return !isJapanSignal(signal);
      if (activeTab === "priority") return signal.verdict === "調査優先";
      return true;
    });

    return [...base].sort((a, b) => {
      if (sortBy === "date") return b.filingDate.localeCompare(a.filingDate) || b.score - a.score;
      if (sortBy === "weight") return b.portfolioWeight - a.portfolioWeight || b.score - a.score;
      if (sortBy === "move") return b.priceMoveSinceReport - a.priceMoveSinceReport || b.score - a.score;
      return b.score - a.score;
    });
  }, [activeTab, filteredSignals, sortBy]);

  const topCandidateSignals = useMemo(() => {
    if (activeTab === "jp") return displaySignals.filter(isJapanSignal).slice(0, 3);
    if (activeTab === "us") return displaySignals.filter((s) => !isJapanSignal(s)).slice(0, 3);
    return displaySignals.slice(0, 3);
  }, [activeTab, displaySignals]);
  const styles: Array<"すべて" | FundStyle> = ["すべて", "長期バリュー", "アクティビスト", "イベント", "グロース", "クオンツ"];
  const selectedSignal = scoredSignals.find((signal) => signal.id === selectedSignalId);
  const viewerSignal = scoredSignals.find((signal) => signal.id === viewerSignalId);
  const selectedReportCards = selectedSignal ? buildSignalReportCards(selectedSignal) : [];
  const selectedChecklist = selectedSignal ? buildSignalChecklist(selectedSignal, autoRefreshedAt) : [];
  const selectedFollowBreakdown = selectedSignal ? buildFollowScoreBreakdown(selectedSignal) : [];
  const selectedCounterReasons = selectedSignal ? buildCounterReasons(selectedSignal) : [];
  const selectedPriceReactionRows = selectedSignal ? buildPriceReactionRows(selectedSignal) : [];
  const isBeginnerGuideOpen = beginnerGuideTopic !== null;
  const beginnerGuideSections = Object.values(beginnerGuides);

  useEffect(() => {
    if (selectedSignalId) {
      setReportTab("summary");
    }
  }, [selectedSignalId]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="大口・ファンド" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-3 py-3 sm:px-4">
        {isUsingCache && (
          <div className="mb-2.5 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 animate-pulse" />
            <span>ネットワーク制限または一時的エラーのため、前回のキャッシュデータを表示しています（自動復旧を再試行しています）。</span>
          </div>
        )}

        {/* サイト共通のフラット＆コンパクトな1行見出し */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Eye className="h-4 w-4 shrink-0 text-primary" />
            <h1 className="whitespace-nowrap text-sm font-bold text-foreground">
              大口・ファンド動向
            </h1>
            <span className="whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-xxs font-semibold text-foreground/80">
              SEC / EDINET
            </span>
            <span
              className="hidden items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-muted-foreground sm:inline-flex"
              title={`データ: ${isUsingCache ? "一時キャッシュ" : smartMoneyData.source === "live" ? "実取得" : "フォールバック"} / SEC: ${sourceStatusLabel(smartMoneyData.sourceStatus?.sec)} / EDINET: ${sourceStatusLabel(smartMoneyData.sourceStatus?.edinet)} / 価格: ${sourceStatusLabel(smartMoneyData.sourceStatus?.price)}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  smartMoneyData.source === "live" && !isUsingCache
                    ? "bg-emerald-500"
                    : isUsingCache
                      ? "bg-amber-500"
                      : "bg-slate-400"
                }`}
              />
              {formatJstDateTime(autoRefreshedAt)} 更新
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-card px-2 text-xxs font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              disabled={smartMoneyStatus === "loading" || cooldownSeconds > 0}
              title={`接続状態 — SEC:${sourceStatusLabel(smartMoneyData.sourceStatus?.sec)} / EDINET:${sourceStatusLabel(smartMoneyData.sourceStatus?.edinet)}`}
            >
              <RefreshCw className={`h-3 w-3 text-primary ${smartMoneyStatus === "loading" ? "animate-spin" : ""}`} />
              {cooldownSeconds > 0 ? `再評価 (${cooldownSeconds}s)` : "再評価"}
            </button>
            <BeginnerGuideButton topic="overview" onOpen={setBeginnerGuideTopic} label="見方ガイド" />
          </div>
        </div>

        {/* 追随価値トップ候補（監視ファンドタブ以外でコンパクト表示） */}
        {activeTab !== "funds" && topCandidateSignals.length > 0 && (
          <section className="mb-3 overflow-hidden rounded border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-bold text-foreground">注目トップ候補</h2>
                <span className="whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-foreground/80">
                  上位{topCandidateSignals.length}件
                </span>
              </div>
              <span className="hidden text-[10px] font-semibold text-muted-foreground sm:inline">
                タップで調査報告書・提出書類を確認
              </span>
            </div>
            <div className="grid min-w-0 gap-2 p-2.5 md:grid-cols-3">
              {topCandidateSignals.map((signal) => {
                const freshness = getFreshnessBadge(signal);
                const pricing = getPricingBadge(signal);

                return (
                  <button
                    key={signal.id}
                    type="button"
                    onClick={() => setSelectedSignalId(signal.id)}
                    className="group min-w-0 rounded border border-border bg-background p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {hasDisplayTicker(signal) && (
                            <span className="shrink-0 font-mono text-xxs font-black text-primary">{signal.ticker}</span>
                          )}
                          <span className="truncate text-sm font-extrabold text-foreground group-hover:text-primary">
                            {signal.company}
                          </span>
                        </div>
                        <div
                          className="mt-0.5 truncate text-xxs font-semibold text-muted-foreground"
                          title={signal.source === "edinet" && signal.filerName ? `提出者: ${signal.filerName}` : signal.fund.name}
                        >
                          {signal.source === "edinet" && signal.filerName ? signal.filerName : signal.fund.name}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[11px] font-black leading-none ${rankBadgeClass(signal.rank)}`}>
                            {signal.rank}
                          </span>
                          <span className="text-lg font-black leading-none tabular-nums text-foreground">{signal.score}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">評価スコア</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${verdictClass(signal.verdict)}`}>
                        {signal.verdict}
                      </span>
                      <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${pricing.className}`}>
                        {pricing.label}
                      </span>
                      <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${freshness.className}`}>
                        {freshness.label}
                      </span>
                      <span className="ml-auto font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                        比率 {formatPortfolioWeightLabel(signal)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 太下線タブ＋一覧の一体型カード（スクリーニングページと統一） */}
        <section className="overflow-hidden rounded border border-border bg-card">
          {/* 太下線タブバー */}
          <div
            role="tablist"
            aria-label="大口・ファンド表示切替"
            className="flex items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x border-b border-border bg-muted/40 no-scrollbar"
          >
            {(
              [
                { id: "all", label: "すべて", count: displaySignals.length },
                { id: "jp", label: "日本株 (EDINET)", count: jpCount },
                { id: "us", label: "米国株 (SEC)", count: usCount },
                { id: "priority", label: "調査優先", count: priorityCount },
                { id: "funds", label: "監視ファンド", count: liveFunds.length },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-4 px-3 py-2.5 text-xs transition-colors sm:px-4 ${
                    isActive
                      ? "border-primary bg-table-header-bg font-bold text-primary"
                      : "border-transparent font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums leading-none ${
                      isActive ? "bg-primary/10 text-primary" : "bg-background/80 text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTab === "funds" ? (
            /* 監視ファンド一覧タブ */
            <div className="p-3">
              <div className="mb-2.5 flex items-center justify-between gap-2 text-xxs text-muted-foreground">
                <span>信頼度・読解性・報告遅延リスクで各ファンドを評価しています。</span>
                <span className="shrink-0 font-bold text-foreground">全{liveFunds.length}ファンド</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {liveFunds.map((fund) => (
                  <div key={fund.id} className="rounded border border-border bg-background p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-extrabold text-foreground">{fund.name}</div>
                        <div className="truncate text-xxs font-semibold text-muted-foreground">{fund.manager}</div>
                      </div>
                      <span className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight ${styleClass(fund.style)}`}>
                        {fund.style}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xxs font-semibold">
                      <div className="rounded bg-muted/60 px-1 py-1">
                        <div className="text-[10px] text-muted-foreground">信頼</div>
                        <div className="text-xs font-black tabular-nums text-foreground">{fund.reliability}</div>
                      </div>
                      <div className="rounded bg-muted/60 px-1 py-1">
                        <div className="text-[10px] text-muted-foreground">読解</div>
                        <div className="text-xs font-black tabular-nums text-foreground">{fund.readable}</div>
                      </div>
                      <div className="rounded bg-muted/60 px-1 py-1">
                        <div className="text-[10px] text-muted-foreground">遅延リスク</div>
                        <div className="text-xs font-black tabular-nums text-foreground">{fund.lagRisk}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* 1行サマリー＆フィルターバー */}
              <div className="border-b border-border bg-table-header-bg px-3 py-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xxs font-semibold">
                    <span className="text-foreground">
                      表示 <strong className="text-xs font-extrabold tabular-nums text-primary">{filteredDisplaySignals.length}</strong> 件
                    </span>
                    <span className="text-emerald-700 tabular-nums">調査優先 {priorityCount}件</span>
                    <span className="text-muted-foreground tabular-nums">平均スコア {averageScore.toFixed(0)}</span>
                    <span className="text-amber-700 tabular-nums">反証注意 {cautionCount}件</span>
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto">
                    <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="ファンド・銘柄・コード検索"
                        className="h-7 w-full rounded border border-border bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <select
                      aria-label="並び替え"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as "score" | "date" | "weight" | "move")}
                      className="h-7 shrink-0 rounded border border-border bg-background px-2 text-xxs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="score">注目スコア順</option>
                      <option value="date">提出日が新しい順</option>
                      <option value="weight">保有比率が高い順</option>
                      <option value="move">開示後値動き順</option>
                    </select>
                  </div>
                </div>

                {/* スタイル絞り込み */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <Filter className="mr-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  {styles.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSelectedStyle(style)}
                      className={`h-6 shrink-0 whitespace-nowrap rounded border px-2 text-xxs font-bold transition-colors ${
                        selectedStyle === style
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* PC用スリム7列テーブル */}
              <div className="hidden md:block">
                <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-muted/80 text-xxs font-semibold text-muted-foreground backdrop-blur-xs">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2 text-left">銘柄 / 提出日</th>
                        <th className="whitespace-nowrap px-3 py-2 text-left">提出者 / 大口ファンド</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">保有比率 / 増減</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">
                          <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                            <span>開示後 / 遅延</span>
                            <span className="group relative inline-flex" tabIndex={0}>
                              <Info className="h-3 w-3 cursor-help text-muted-foreground hover:text-foreground" />
                              <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-60 whitespace-normal rounded border border-border bg-popover p-2 text-left text-[10px] font-medium leading-relaxed text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
                                <span className="mb-1 block font-bold text-foreground">開示後値動きの計算方法</span>
                                報告日の終値から最新終値までの騰落率（Yahoo Finance日足）です。当日開示や未計測時はラベル表示します。
                              </span>
                            </span>
                          </span>
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left">
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span>ランク・織り込み</span>
                            <span className="group relative inline-flex" tabIndex={0}>
                              <Info className="h-3 w-3 cursor-help text-muted-foreground hover:text-foreground" />
                              <span className="pointer-events-none absolute left-0 top-5 z-30 hidden w-56 whitespace-normal rounded border border-border bg-popover p-2 text-left text-[10px] font-medium leading-relaxed text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
                                <span className="mb-1 block font-bold text-foreground">評価ランク目安（100点満点）</span>
                                <span className="block"><strong className="text-emerald-700">S (82〜)</strong>: 最優先の確認候補</span>
                                <span className="block"><strong className="text-primary">A (70〜81)</strong>: 有力候補</span>
                                <span className="block"><strong className="text-sky-700">B (55〜69)</strong>: 監視・継続確認</span>
                                <span className="block"><strong className="text-muted-foreground">C (〜54/売却)</strong>: 注意・反証材料</span>
                              </span>
                            </span>
                          </span>
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left">判定</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDisplaySignals.map((signal) => {
                        const pricing = getPricingBadge(signal);
                        const sourceUrl = getSignalSourceUrl(signal);

                        return (
                          <tr
                            key={signal.id}
                            onClick={() => setSelectedSignalId(signal.id)}
                            className="cursor-pointer transition-colors hover:bg-muted/40"
                          >
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex items-center gap-1.5">
                                {hasDisplayTicker(signal) && (
                                  <span className="font-mono text-xxs font-black text-primary">{signal.ticker}</span>
                                )}
                                <span className="font-bold text-foreground">{signal.company}</span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                                <span>{signal.filingType} / {signal.signalType}</span>
                                <span className="rounded bg-muted px-1 py-0 font-semibold">提出 {signal.filingDate}</span>
                                {signal.relatedCount > 1 && (
                                  <span className="rounded bg-emerald-50 px-1 py-0 font-bold text-emerald-700">
                                    集約{signal.relatedCount}件
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-2.5 align-top">
                              <div className="font-bold text-foreground">
                                {signal.source === "edinet" && signal.filerName ? signal.filerName : signal.fund.name}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight ${styleClass(signal.fund.style)}`}>
                                  {signal.fund.style}
                                </span>
                                {signal.source !== "edinet" && (
                                  <span className="text-[10px] text-muted-foreground">{signal.fund.manager}</span>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-right align-top tabular-nums">
                              <div className="font-bold text-foreground">{formatPortfolioWeightLabel(signal)}</div>
                              <div
                                className={`text-xxs font-bold ${
                                  isPlaceholderPositionChange(signal)
                                    ? "text-primary"
                                    : Math.abs(signal.positionChange) < 0.05
                                      ? "text-muted-foreground"
                                      : signal.positionChange > 0
                                        ? "text-stock-up"
                                        : "text-stock-down"
                                }`}
                              >
                                {formatPositionChangeLabel(signal)}
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-right align-top tabular-nums">
                              <div
                                className={`font-bold ${
                                  !isPriceMoveEvaluated(signal) || Math.abs(signal.priceMoveSinceReport) < 0.05
                                    ? "text-muted-foreground"
                                    : signal.priceMoveSinceReport >= 8
                                      ? "text-amber-700"
                                      : signal.priceMoveSinceReport > 0
                                        ? "text-stock-up"
                                        : "text-stock-down"
                                }`}
                              >
                                {formatPriceMoveLabel(signal)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">遅延 {signal.filingLagDays}日</div>
                            </td>

                            <td className="px-3 py-2.5 align-top">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[10px] font-black leading-none ${rankBadgeClass(signal.rank)}`}>
                                  {signal.rank}
                                </span>
                                <span className="w-5 font-black tabular-nums text-foreground">{signal.score}</span>
                                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${signal.score}%` }} />
                                </div>
                              </div>
                              <div className="mt-1">
                                <span className={`inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${pricing.className}`}>
                                  {pricing.label}
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-2.5 align-top">
                              <span className={`inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${verdictClass(signal.verdict)}`}>
                                {signal.verdict}
                              </span>
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                {signal.risk === "許容" ? (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                                )}
                                <span>{signal.risk}</span>
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-right align-top" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-end gap-1">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSignalId(signal.id)}
                                    className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-primary/40 bg-primary/5 px-2 text-xxs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                                  >
                                    <BookOpenText className="h-3 w-3" />
                                    詳細
                                  </button>
                                  {sourceUrl && signal.source === "edinet" && (
                                    <button
                                      type="button"
                                      onClick={() => setViewerSignalId(signal.id)}
                                      className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2 text-xxs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                      title="提出PDFを表示"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      PDF
                                    </button>
                                  )}
                                  {sourceUrl && signal.source !== "edinet" && (
                                    <a
                                      href={sourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2 text-xxs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                      title="公式提出書類を開く"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      書類
                                    </a>
                                  )}
                                </div>
                                {signal.source === "edinet" && hasDisplayTicker(signal) && (
                                  <Link
                                    to={`/chart?q=${signal.ticker}`}
                                    className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2 text-xxs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                    title="株価チャートを表示"
                                  >
                                    <TrendingUp className="h-3 w-3" />
                                    チャート
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDisplaySignals.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-xs font-semibold text-muted-foreground">
                            条件に一致する大口・ファンド開示はありません。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* モバイル用 縦型カードリスト（横スクロール不要） */}
              <div className="divide-y divide-border md:hidden">
                {filteredDisplaySignals.map((signal) => {
                  const pricing = getPricingBadge(signal);
                  const sourceUrl = getSignalSourceUrl(signal);

                  return (
                    <article
                      key={signal.id}
                      onClick={() => setSelectedSignalId(signal.id)}
                      className="p-3 transition-colors active:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {hasDisplayTicker(signal) && (
                              <span className="font-mono text-xxs font-black text-primary">{signal.ticker}</span>
                            )}
                            <h3 className="text-sm font-extrabold text-foreground">{signal.company}</h3>
                          </div>
                          <div className="mt-0.5 text-xxs font-semibold text-muted-foreground">
                            {signal.source === "edinet" && signal.filerName ? signal.filerName : signal.fund.name}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[11px] font-black leading-none ${rankBadgeClass(signal.rank)}`}>
                              {signal.rank}
                            </span>
                            <span className="text-lg font-black leading-none tabular-nums text-foreground">{signal.score}</span>
                          </div>
                          <span className={`mt-1 inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${verdictClass(signal.verdict)}`}>
                            {signal.verdict}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight ${styleClass(signal.fund.style)}`}>
                          {signal.fund.style}
                        </span>
                        <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${pricing.className}`}>
                          {pricing.label}
                        </span>
                        <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-muted-foreground">
                          {signal.filingType}・提出 {signal.filingDate}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1.5 rounded border border-border/70 bg-muted/20 p-2 text-center text-xxs tabular-nums">
                        <div>
                          <div className="text-[10px] text-muted-foreground">保有比率</div>
                          <div className="font-extrabold text-foreground">{formatPortfolioWeightLabel(signal)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">保有増減</div>
                          <div
                            className={`font-extrabold ${
                              isPlaceholderPositionChange(signal)
                                ? "text-primary"
                                : Math.abs(signal.positionChange) < 0.05
                                  ? "text-muted-foreground"
                                  : signal.positionChange > 0
                                    ? "text-stock-up"
                                    : "text-stock-down"
                            }`}
                          >
                            {formatPositionChangeLabel(signal)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">開示後 / 遅延</div>
                          <div
                            className={`font-extrabold ${
                              !isPriceMoveEvaluated(signal) || Math.abs(signal.priceMoveSinceReport) < 0.05
                                ? "text-muted-foreground"
                                : signal.priceMoveSinceReport >= 8
                                  ? "text-amber-700"
                                  : signal.priceMoveSinceReport > 0
                                    ? "text-stock-up"
                                    : "text-stock-down"
                            }`}
                          >
                            {formatPriceMoveLabel(signal)} ({signal.filingLagDays}日)
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedSignalId(signal.id)}
                          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-primary/40 bg-primary/5 px-2.5 text-xxs font-bold text-primary"
                        >
                          <BookOpenText className="h-3 w-3" />
                          詳細報告書
                        </button>
                        {signal.source === "edinet" && hasDisplayTicker(signal) && (
                          <Link
                            to={`/chart?q=${signal.ticker}`}
                            className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2.5 text-xxs font-bold text-foreground"
                          >
                            <TrendingUp className="h-3 w-3" />
                            チャート
                          </Link>
                        )}
                        {sourceUrl && signal.source === "edinet" && (
                          <button
                            type="button"
                            onClick={() => setViewerSignalId(signal.id)}
                            className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2.5 text-xxs font-bold text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                            提出PDF
                          </button>
                        )}
                        {sourceUrl && signal.source !== "edinet" && (
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2.5 text-xxs font-bold text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                            公式書類
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
                {filteredDisplaySignals.length === 0 && (
                  <div className="px-3 py-8 text-center text-xs font-semibold text-muted-foreground">
                    条件に一致する大口・ファンド開示はありません。
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* 解説・停止条件・データソース（折りたたみアコーディオン） */}
        <section className="mt-3 overflow-hidden rounded border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowGuideAccordion((prev) => !prev)}
            aria-expanded={showGuideAccordion}
            className="flex w-full items-center justify-between gap-2 bg-table-header-bg px-3 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Scale className="h-3.5 w-3.5 text-primary" />
              <span>判定の読み方・買う前の停止条件・データソース（SEC / EDINET）</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                showGuideAccordion ? "rotate-180" : ""
              }`}
            />
          </button>

          {showGuideAccordion && (
            <div className="space-y-3 border-t border-border p-3">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded border border-border bg-background p-2.5 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 font-bold text-foreground">
                    <Scale className="h-3.5 w-3.5 text-primary" />
                    判定の読み方
                  </div>
                  <div className="space-y-1.5 text-xxs leading-relaxed text-muted-foreground">
                    <p><strong className="text-foreground">調査優先:</strong> 高信頼ファンド・集中度上昇・未急騰が揃った候補。一次開示で裏取り。</p>
                    <p><strong className="text-foreground">監視:</strong> 材料はあるが遅延や価格上昇が残る候補。次回提出で継続性を確認。</p>
                    <p><strong className="text-foreground">コピー非推奨:</strong> 縮小・全売却・急騰済みのいずれかが強く、反証材料として扱う。</p>
                  </div>
                </div>

                <div className="rounded border border-border bg-background p-2.5 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 font-bold text-foreground">
                    <Clock3 className="h-3.5 w-3.5 text-primary" />
                    買う前の停止条件（注意 {cautionCount}件）
                  </div>
                  <div className="space-y-1.5 text-xxs leading-relaxed text-muted-foreground">
                    <p><strong className="text-foreground">開示後急騰:</strong> 報告日以降に大きく上昇済みなら後追い期待値を下げる。</p>
                    <p><strong className="text-foreground">13F遅延:</strong> 四半期末時点の保有のため、提出時点で売却済みの可能性あり。</p>
                    <p><strong className="text-foreground">本文未確認:</strong> 13D/EDINETは保有目的・共同保有・資金源を読んで判断。</p>
                  </div>
                </div>

                <div className="rounded border border-border bg-background p-2.5 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 font-bold text-foreground">
                    <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                    合法公開データのみ監視
                  </div>
                  <div className="space-y-1.5 text-xxs leading-relaxed text-muted-foreground">
                    {legalWatchRoutes.map((route) => (
                      <p key={route.title}>
                        <strong className="text-foreground">{route.title}:</strong> {route.detail}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      {isBeginnerGuideOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-2.5 backdrop-blur-xs sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="見方ガイド"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBeginnerGuideTopic(null);
          }}
        >
          <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
            {/* 固定ヘッダー */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-table-header-bg px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <BookOpenText className="h-4 w-4 shrink-0 text-primary" />
                  <h3 className="text-sm font-extrabold text-foreground">大口・ファンド動向の見方ガイド</h3>
                </div>
                <p className="mt-0.5 text-xxs text-muted-foreground">
                  大口投資家の公開書類から「次に調べるべき銘柄」を効率よく見つける手順です
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBeginnerGuideTopic(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="見方ガイドを閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 3タブ切替（太下線・固定） */}
            <div
              role="tablist"
              aria-label="見方ガイドタブ"
              className="flex shrink-0 items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x border-b border-border bg-muted/40 no-scrollbar"
            >
              {(
                [
                  { id: "steps", label: "3ステップの見方" },
                  { id: "metrics", label: "スコア・一覧の見方" },
                  { id: "glossary", label: "専門用語ミニ辞典" },
                ] as const
              ).map((tab) => {
                const isActive = guideTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setGuideTab(tab.id)}
                    className={`relative flex-1 whitespace-nowrap border-b-4 px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? "border-primary bg-card font-bold text-primary"
                        : "border-transparent font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* スクロール本体 */}
            <div className="always-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-4 text-xs">
              {guideTab === "steps" && (
                <>
                  <div className="space-y-2">
                    {[
                      {
                        step: "STEP 1",
                        title: "タブで「日本株 (EDINET)」か「米国株 (SEC)」を選ぶ",
                        body: "まずは自分の投資対象に合わせてタブを切り替えます。優先度の高い銘柄だけに絞るなら「調査優先」タブが近道です。",
                      },
                      {
                        step: "STEP 2",
                        title: "「注目スコア」と「織り込み状況」をチェック",
                        body: "スコアが高く、開示後にまだ急騰しすぎていない（「未織り込み」など）銘柄を候補としてピックアップします。",
                      },
                      {
                        step: "STEP 3",
                        title: "行をタップして「調査報告書」と「公式提出PDF」を確認",
                        body: "コピー買いはせず、保有目的・共同保有者・反証リスク・株価チャートを確認したうえで最終判断します。",
                      },
                    ].map((item) => (
                      <div key={item.step} className="rounded-md border border-border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 whitespace-nowrap rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-black text-primary">
                            {item.step}
                          </span>
                          <span className="text-xs font-extrabold text-foreground">{item.title}</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="mb-1 flex items-center gap-1.5 font-extrabold">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      ご利用上の注意
                    </div>
                    このページは「調べる優先順位」を決める補助ツールです。有名ファンドが買ったから即買い（コピー買い）するのではなく、提出書類の本文・決算・チャートを必ずご自身で確認してください。
                  </div>
                </>
              )}

              {guideTab === "metrics" && (
                <div className="space-y-2.5">
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="mb-2 text-xs font-extrabold text-foreground">評価ランク（S / A / B / C）の目安</div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {(
                        [
                          { rank: "S" as ScoreRank, range: "82点以上", desc: "高信頼・高確信・鮮度良好・未急騰が揃った最優先の確認候補" },
                          { rank: "A" as ScoreRank, range: "70〜81点", desc: "一次開示とチャートを確認する価値が高い有力候補" },
                          { rank: "B" as ScoreRank, range: "55〜69点", desc: "材料はあるが遅延や織り込みなどの確認事項が残る監視枠" },
                          { rank: "C" as ScoreRank, range: "54点以下 / 売却系", desc: "縮小・全売却・急騰済み・遅延大。反証材料や参考情報として扱う" },
                        ]
                      ).map((item) => (
                        <div key={item.rank} className="flex items-start gap-2 rounded border border-border/70 bg-muted/20 p-2">
                          <span className={`mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 font-mono text-[11px] font-black leading-none ${rankBadgeClass(item.rank)}`}>
                            {item.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xxs font-extrabold text-foreground">{item.range}</div>
                            <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {[
                    {
                      title: "判定バッジの意味",
                      items: [
                        { label: "調査優先", desc: "高信頼ファンド・集中度・未急騰が揃った最優先の確認候補。" },
                        { label: "監視", desc: "材料はあるが、報告遅延や価格上昇などの懸念が残る候補。" },
                        { label: "コピー非推奨", desc: "縮小・全売却・急騰済みなど。買い材料ではなく反証材料として見る。" },
                      ],
                    },
                    {
                      title: "一覧の数値カラム",
                      items: [
                        { label: "保有比率 / 増減", desc: "ファンドの保有ウェイトと前回比の増減。大きいほど本気度が高い目安。" },
                        { label: "開示後値動き", desc: "報告日以降の株価変化。大きく上昇済みなら後追いリスクに注意。" },
                        { label: "報告遅延", desc: "基準日から提出までの日数。13Fは最大45日遅れるため鮮度確認が必須。" },
                      ],
                    },
                  ].map((group) => (
                    <div key={group.title} className="rounded-md border border-border bg-background p-3">
                      <div className="mb-2 text-xs font-extrabold text-foreground">{group.title}</div>
                      <div className="divide-y divide-border/70">
                        {group.items.map((row) => (
                          <div key={row.label} className="py-1.5 first:pt-0 last:pb-0">
                            <div className="text-xs font-bold text-foreground">{row.label}</div>
                            <div className="mt-0.5 text-xxs leading-relaxed text-muted-foreground">{row.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {guideTab === "glossary" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { term: "スマートマネー", body: "有名ファンド、機関投資家、アクティビストなど、市場で影響力が大きい大口資金の動き。" },
                    { term: "EDINET 大量保有", body: "日本株で発行済株式の5%超を保有した際に提出が義務付けられる公式報告書（5営業日以内）。" },
                    { term: "SEC Form 13F", body: "米国の運用資産1億ドル超の機関投資家が四半期ごとに提出する保有銘柄一覧。遅延に注意。" },
                    { term: "SEC Form 13D / 13G", body: "米国株で5%超を保有した際の提出書類。13Dは経営関与（アクティビスト）意図あり。" },
                    { term: "未織り込み / 急騰済み", body: "開示後に株価がまだ反応していないか、既に大きく織り込んで上がったかの目安。" },
                    { term: "監視ファンドの信頼・読解", body: "過去の実績・長期方針の読みやすさ・報告遅延リスクを数値化した参考指標。" },
                  ].map((item) => (
                    <div key={item.term} className="rounded-md border border-border bg-background p-2.5">
                      <div className="text-xs font-extrabold text-primary">{item.term}</div>
                      <p className="mt-1 text-xxs leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 固定フッター */}
            <div className="flex shrink-0 items-center justify-end border-t border-border bg-muted/20 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setBeginnerGuideTopic(null)}
                className="shrink-0 whitespace-nowrap rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedSignal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2.5 backdrop-blur-xs sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedSignal.company} 調査報告書`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedSignalId(null);
          }}
        >
          <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
            {/* 固定ヘッダー */}
            <div className="shrink-0 border-b border-border bg-table-header-bg px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hasDisplayTicker(selectedSignal) && (
                      <span className="font-mono text-xs font-black text-primary">{selectedSignal.ticker}</span>
                    )}
                    <h3 className="truncate text-sm font-extrabold text-foreground sm:text-base">
                      {selectedSignal.company}
                    </h3>
                    <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${verdictClass(selectedSignal.verdict)}`}>
                      {selectedSignal.verdict}
                    </span>
                    <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${getPricingBadge(selectedSignal).className}`}>
                      {getPricingBadge(selectedSignal).label}
                    </span>
                    <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${getFreshnessBadge(selectedSignal).className}`}>
                      {getFreshnessBadge(selectedSignal).label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xxs font-semibold text-muted-foreground">
                    <span>
                      {selectedSignal.source === "edinet" && selectedSignal.filerName
                        ? `提出者: ${selectedSignal.filerName}`
                        : selectedSignal.fund.name}
                    </span>
                    <span>・</span>
                    <span>{selectedSignal.filingType} / {selectedSignal.signalType}</span>
                    <span>・</span>
                    <span>提出 {selectedSignal.filingDate}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSignalId(null)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* クイックアクションバー */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {selectedSignal.source === "edinet" && hasDisplayTicker(selectedSignal) && (
                  <Link
                    to={`/chart?q=${selectedSignal.ticker}`}
                    onClick={() => setSelectedSignalId(null)}
                    className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-primary/40 bg-primary/10 px-2.5 text-xxs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <TrendingUp className="h-3 w-3" />
                    株価チャートを見る
                  </Link>
                )}
                {getSignalSourceUrl(selectedSignal) && selectedSignal.source === "edinet" && (
                  <button
                    type="button"
                    onClick={() => setViewerSignalId(selectedSignal.id)}
                    className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-emerald-300 bg-emerald-50 px-2.5 text-xxs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <ExternalLink className="h-3 w-3" />
                    公式提出PDFを開く
                  </button>
                )}
                {getSignalSourceUrl(selectedSignal) && selectedSignal.source !== "edinet" && (
                  <a
                    href={getSignalSourceUrl(selectedSignal)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-emerald-300 bg-emerald-50 px-2.5 text-xxs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <ExternalLink className="h-3 w-3" />
                    SEC公式提出書類
                  </a>
                )}
              </div>
            </div>

            {/* 主要5メトリクス（固定・コンパクト） */}
            <div className="grid shrink-0 grid-cols-3 gap-px border-b border-border bg-border sm:grid-cols-5">
              {[
                { label: "ランク / スコア", value: `${selectedSignal.rank} (${selectedSignal.score})`, tone: "text-primary" },
                { label: "保有比率", value: formatPortfolioWeightLabel(selectedSignal), tone: "text-foreground" },
                {
                  label: "保有増減",
                  value: formatPositionChangeLabel(selectedSignal),
                  tone: isPlaceholderPositionChange(selectedSignal)
                    ? "text-primary"
                    : Math.abs(selectedSignal.positionChange) < 0.05
                      ? "text-muted-foreground"
                      : selectedSignal.positionChange > 0
                        ? "text-stock-up"
                        : "text-stock-down",
                },
                {
                  label: "開示後値動き",
                  value: formatPriceMoveLabel(selectedSignal),
                  tone:
                    !isPriceMoveEvaluated(selectedSignal) || Math.abs(selectedSignal.priceMoveSinceReport) < 0.05
                      ? "text-muted-foreground"
                      : selectedSignal.priceMoveSinceReport >= 8
                        ? "text-amber-700"
                        : selectedSignal.priceMoveSinceReport > 0
                          ? "text-stock-up"
                          : "text-stock-down",
                },
                { label: "報告遅延", value: `${selectedSignal.filingLagDays}日`, tone: "text-foreground" },
              ].map((metric) => (
                <div key={metric.label} className="bg-background px-2.5 py-2 text-center">
                  <div className="text-[10px] font-semibold text-muted-foreground">{metric.label}</div>
                  <div className={`mt-0.5 text-sm font-black tabular-nums ${metric.tone}`}>{metric.value}</div>
                </div>
              ))}
            </div>

            {/* 3タブ切替（太下線・固定） */}
            <div
              role="tablist"
              aria-label="調査報告書タブ"
              className="flex shrink-0 items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x border-b border-border bg-muted/40 no-scrollbar"
            >
              {(
                [
                  { id: "summary", label: "要点・結論" },
                  { id: "analysis", label: "詳細分析・チェック" },
                  { id: "sources", label: "一次情報・リンク" },
                ] as const
              ).map((tab) => {
                const isActive = reportTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setReportTab(tab.id)}
                    className={`relative flex-1 whitespace-nowrap border-b-4 px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? "border-primary bg-card font-bold text-primary"
                        : "border-transparent font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* スクロール本体 */}
            <div className="always-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-4">
              {reportTab === "summary" && (
                <>
                  {/* 次アクション（最優先の結論） */}
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xxs font-extrabold text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>推奨される次アクション</span>
                    </div>
                    <p className="text-xs font-bold leading-relaxed text-foreground">
                      {getNextAction(selectedSignal)}
                    </p>
                  </div>

                  {/* 反証・注意点 */}
                  <div className="rounded-md border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xxs font-extrabold text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        反証・確認すべきリスク
                      </span>
                      <span className="whitespace-nowrap rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        リスク判定: {selectedSignal.risk}
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs leading-relaxed text-foreground/90">
                      {selectedCounterReasons.map((reason) => (
                        <li key={reason} className="flex items-start gap-1.5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 追随価値スコア分解 */}
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-foreground">スコア分解（鮮度・本気度・織り込み・反証）</span>
                      <span className="font-mono text-xs font-black text-primary">合計 {selectedSignal.score}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedFollowBreakdown.map((item) => {
                        const width =
                          item.value < 0
                            ? Math.min(100, Math.abs(item.value / item.max) * 100)
                            : Math.min(100, (item.value / item.max) * 100);

                        return (
                          <div key={item.label} className="rounded border border-border/70 bg-muted/20 p-2.5">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-xxs font-bold text-foreground">{item.label}</span>
                              <span className={`font-mono text-xxs font-black ${item.value < 0 ? "text-rose-700" : "text-foreground"}`}>
                                {item.value > 0 ? "+" : ""}{item.value}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${width}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.note}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 株価反応と織り込み診断 */}
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="mb-2 text-xs font-extrabold text-foreground">株価反応と織り込み診断</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {selectedPriceReactionRows.map((row) => (
                        <div key={row.label} className="rounded border border-border/70 bg-muted/20 p-2.5">
                          <div className="text-[10px] font-bold text-muted-foreground">{row.label}</div>
                          <div className={`mt-0.5 text-base font-black tabular-nums ${row.value.startsWith("+") ? "text-stock-up" : row.value.startsWith("-") ? "text-stock-down" : "text-foreground"}`}>
                            {row.value}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{row.memo}</div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xxs leading-relaxed text-muted-foreground">
                      {getPricingBadge(selectedSignal).detail}
                    </p>
                  </div>
                </>
              )}

              {reportTab === "analysis" && (
                <>
                  {/* 調査チェックリスト */}
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="mb-2 text-xs font-extrabold text-foreground">調査チェックリスト</div>
                    <div className="divide-y divide-border/70">
                      {selectedChecklist.map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground">{item.label}</div>
                            <div className="mt-0.5 text-xxs leading-relaxed text-muted-foreground">{item.detail}</div>
                          </div>
                          <span className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight ${checklistStatusClass(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* この判定の根拠 */}
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="mb-2 text-xs font-extrabold text-foreground">この判定の根拠</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ["ファンド品質", `${selectedSignal.fund.name}（${selectedSignal.fund.style}）。信頼 ${selectedSignal.fund.reliability} / 読解 ${selectedSignal.fund.readable}`],
                        ["開示種類", `${selectedSignal.filingType}：${selectedSignal.filingType === "13F" ? "遅延が大きいが長期保有の痕跡を確認可能" : "大量保有・関与意図を読みやすい一次開示"}`],
                        ["集中度", `ポートフォリオ比率 ${selectedSignal.portfolioWeight.toFixed(1)}%、集中順位 ${selectedSignal.concentrationRank}位`],
                        ["複数一致", `${selectedSignal.multiFundCount}ファンド一致（多いほど単独ノイズではない可能性が高い）`],
                        ["織り込み", `報告日から提出後まで ${formatSignedPercent(selectedSignal.priceMoveSinceReport)}`],
                        ["反証メモ", `${selectedSignal.risk}：${selectedSignal.note}`],
                      ].map(([label, text]) => (
                        <div key={label} className="rounded border border-border/70 bg-muted/20 p-2.5">
                          <div className="text-xxs font-extrabold text-foreground">{label}</div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4観点レポート */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedReportCards.map((section) => (
                      <article key={section.title} className="rounded-md border border-border bg-background p-3">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <section.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <h4 className="text-xs font-extrabold text-foreground">{section.title}</h4>
                        </div>
                        <p className="text-xxs leading-relaxed text-muted-foreground">{section.body}</p>
                        <ul className="mt-2 space-y-1">
                          {section.points.map((point) => (
                            <li key={point} className="rounded bg-muted/40 px-2 py-1 text-[11px] font-semibold leading-snug text-foreground/85">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {reportTab === "sources" && (
                <div className="overflow-hidden rounded-md border border-border bg-background">
                  <div className="divide-y divide-border">
                    {selectedSignal.source === "edinet" && hasDisplayTicker(selectedSignal) && (
                      <Link
                        to={`/chart?q=${selectedSignal.ticker}`}
                        onClick={() => setSelectedSignalId(null)}
                        className="flex items-center justify-between gap-2 bg-primary/5 px-3.5 py-2.5 transition-colors hover:bg-primary/10"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
                            <TrendingUp className="h-3.5 w-3.5" />
                            株価チャートを見る（{selectedSignal.ticker}）
                          </div>
                          <p className="mt-0.5 text-xxs text-muted-foreground">
                            この銘柄のローソク足・出来高・移動平均線を確認します。
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap rounded border border-primary/30 bg-background px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          連携
                        </span>
                      </Link>
                    )}
                    {getSignalSourceUrl(selectedSignal) && selectedSignal.source === "edinet" && (
                      <button
                        type="button"
                        onClick={() => setViewerSignalId(selectedSignal.id)}
                        className="flex w-full items-center justify-between gap-2 bg-emerald-50/60 px-3.5 py-2.5 text-left transition-colors hover:bg-emerald-50"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-emerald-800">公式提出PDF（EDINET）</div>
                          <p className="mt-0.5 text-xxs text-emerald-700/90">
                            大量保有報告書・変更報告書の原本PDFを画面内で開きます。
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          実データ
                        </span>
                      </button>
                    )}
                    {getSignalSourceUrl(selectedSignal) && selectedSignal.source !== "edinet" && (
                      <a
                        href={getSignalSourceUrl(selectedSignal)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 bg-emerald-50/60 px-3.5 py-2.5 transition-colors hover:bg-emerald-50"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-emerald-800">公式提出リンク（SEC EDGAR）</div>
                          <p className="mt-0.5 text-xxs text-emerald-700/90">
                            SEC EDGARで検知した一次提出書類を別タブで開きます。
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          実データ
                        </span>
                      </a>
                    )}
                    {researchSources.map((source) => (
                      <a
                        key={source.label}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground hover:text-primary">{source.label}</div>
                          <p className="mt-0.5 text-xxs text-muted-foreground">{source.memo}</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 固定フッター */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
              <span className="text-[10px] font-semibold text-muted-foreground">
                評価更新: {formatJstDateTime(autoRefreshedAt)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSignalId(null)}
                className="ml-auto shrink-0 whitespace-nowrap rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      {viewerSignal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${viewerSignal.company} 公式提出PDF`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewerSignalId(null);
              const root = document.getElementById("root");
              if (root) {
                const prev = root.scrollTop;
                window.requestAnimationFrame(() => {
                  root.scrollTop = prev + 1;
                  root.scrollTop = prev;
                });
              }
            }
          }}
        >
          <div className="flex h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-foreground">公式提出PDF</div>
                <div className="truncate text-xxs font-semibold text-muted-foreground">
                  {hasDisplayTicker(viewerSignal) ? `${viewerSignal.ticker} / ` : ""}
                  {viewerSignal.company}
                  {viewerSignal.filerName ? ` / 提出者: ${viewerSignal.filerName}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={getSignalSourceUrl(viewerSignal)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2.5 text-xxs font-bold text-foreground transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  別タブ
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setViewerSignalId(null);
                    const root = document.getElementById("root");
                    if (root) {
                      const prev = root.scrollTop;
                      window.requestAnimationFrame(() => {
                        root.scrollTop = prev + 1;
                        root.scrollTop = prev;
                      });
                    }
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="PDFビューアを閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <InlinePdfViewer
              key={viewerSignal.id}
              url={getSignalSourceUrl(viewerSignal)}
              title={`${viewerSignal.company} 公式提出PDF`}
            />
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
};

export default SmartMoneyPage;
