import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpenText,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  ExternalLink,
  Filter,
  Gauge,
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

const scoreSignal = (signal: FilingSignalSeed, fundList: FundSeed[] = funds) => {
  const fund = getFund(signal.fundId, fundList);
  const filingLagDays = Math.max(0, dayDiff(signal.reportDate, signal.filingDate));
  const lagPenalty = signal.filingType === "13F" ? Math.min(24, filingLagDays * 0.45) : Math.min(10, filingLagDays * 0.9);
  const pricePenalty = Math.max(0, signal.priceMoveSinceReport - 6) * 1.6;
  const stylePenalty = fund.style === "クオンツ" ? 22 : fund.style === "イベント" ? 8 : 0;
  const conviction =
    Math.min(22, signal.portfolioWeight * 1.35)
    + Math.min(18, Math.max(0, signal.positionChange) * 0.16)
    + (signal.concentrationRank <= 5 ? 12 : signal.concentrationRank <= 10 ? 7 : 0);
  const publicFilingBoost = signal.filingType === "13D" || signal.filingType === "EDINET" ? 14 : signal.filingType === "13G" ? 8 : 0;
  const consensusBoost = Math.min(14, Math.max(0, signal.multiFundCount - 1) * 5);
  const activistBoost = signal.activistIntent ? 10 : 0;
  const sellPenalty = signal.signalType === "縮小" ? 28 : signal.signalType === "全売却" ? 45 : 0;

  const raw =
    fund.reliability * 0.28
    + fund.readable * 0.2
    + conviction
    + publicFilingBoost
    + consensusBoost
    + activistBoost
    - lagPenalty
    - pricePenalty
    - stylePenalty
    - sellPenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const verdict =
    signal.signalType === "全売却" || signal.signalType === "縮小"
      ? "コピー非推奨"
      : score >= 76
        ? "調査優先"
        : score >= 58
          ? "監視"
          : pricePenalty >= 10
            ? "織り込み注意"
            : "低信頼";
  const risk =
    pricePenalty >= 14
      ? "開示後急騰"
      : lagPenalty >= 18
        ? "遅延大"
        : fund.readable < 60
          ? "戦略不透明"
          : signal.signalType === "縮小" || signal.signalType === "全売却"
            ? "売却系"
            : "許容";

  return { fund, score, verdict, risk, filingLagDays, lagPenalty, pricePenalty };
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
  const freshness = signal.filingType === "13F"
    ? Math.max(0, 18 - signal.filingLagDays * 0.32)
    : Math.max(7, 18 - signal.filingLagDays * 0.6);
  const fundQuality = signal.fund.reliability * 0.16 + signal.fund.readable * 0.1;
  const conviction = Math.min(22, signal.portfolioWeight * 1.6 + Math.max(0, signal.positionChange) * 0.08);
  const notPricedIn = Math.max(0, 20 - Math.max(0, signal.priceMoveSinceReport - 1) * 1.45);
  const intent = Math.min(16, (signal.multiFundCount - 1) * 4 + (signal.activistIntent ? 8 : 0) + (signal.concentrationRank <= 5 ? 4 : 0));
  const riskPenalty =
    (signal.signalType === "縮小" ? 16 : signal.signalType === "全売却" ? 28 : 0)
    + (signal.fund.style === "イベント" ? 4 : 0)
    + (signal.risk === "戦略不透明" ? 6 : 0);

  return [
    {
      label: "開示鮮度",
      value: Math.round(freshness),
      max: 18,
      note: getFreshnessBadge(signal).detail,
      tone: freshness >= 13 ? "bg-emerald-500" : freshness >= 8 ? "bg-sky-500" : "bg-amber-500",
    },
    {
      label: "ファンド品質",
      value: Math.round(fundQuality),
      max: 26,
      note: `信頼${signal.fund.reliability}・読解${signal.fund.readable}を反映。`,
      tone: "bg-primary",
    },
    {
      label: "保有強度",
      value: Math.round(conviction),
      max: 22,
      note: `比率${signal.portfolioWeight.toFixed(1)}%、変化${formatSignedPercent(signal.positionChange)}、集中順位${signal.concentrationRank}位。`,
      tone: signal.positionChange >= 0 ? "bg-emerald-500" : "bg-rose-500",
    },
    {
      label: "未織り込み",
      value: Math.round(notPricedIn),
      max: 20,
      note: getPricingBadge(signal).detail,
      tone: notPricedIn >= 14 ? "bg-emerald-500" : notPricedIn >= 8 ? "bg-amber-500" : "bg-rose-500",
    },
    {
      label: "意図・一致",
      value: Math.round(intent),
      max: 16,
      note: `${signal.multiFundCount}ファンド一致${signal.activistIntent ? "、経営関与の可能性あり" : ""}。`,
      tone: signal.activistIntent ? "bg-rose-500" : "bg-sky-500",
    },
    {
      label: "反証減点",
      value: -Math.round(riskPenalty),
      max: 28,
      note: riskPenalty > 0 ? "売却系、イベント性、戦略不透明を減点。" : "大きな自動減点はありません。",
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
  if (status === "partial") return "一部接続";
  if (status === "empty") return "提出なし";
  if (status === "missing-key") return "キー未設定";
  if (status === "not-connected") return "未接続";
  if (status === "error") return "取得失敗";
  return "確認中";
};

const sourceStatusClass = (status?: string) => {
  if (status === "live") return "bg-emerald-50 text-emerald-700";
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
    body: `前回提出と比較し、${signal.signalType}として扱います。ポートフォリオ比率は${signal.portfolioWeight.toFixed(1)}%、保有変化は${signal.positionChange >= 0 ? "+" : ""}${signal.positionChange.toFixed(1)}%です。`,
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
  const [selectedStyle, setSelectedStyle] = useState<"すべて" | FundStyle>("すべて");
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
      } catch {
        if (!isActive) return;
        setSmartMoneyStatus("error");
        setAutoRefreshedAt(new Date());
      }
    };

    loadSmartMoney();
    const timer = window.setInterval(() => loadSmartMoney(), 5 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, []);

  const handleManualRefresh = async () => {
    setSmartMoneyStatus("loading");
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
    } catch {
      setSmartMoneyStatus("error");
      setAutoRefreshedAt(new Date());
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
  const displaySignals = useMemo(() => groupSignalsForDisplay(scoredSignals), [scoredSignals]);
  const filteredDisplaySignals = useMemo(() => groupSignalsForDisplay(filteredSignals), [filteredSignals]);
  const priorityCount = displaySignals.filter((signal) => signal.verdict === "調査優先").length;
  const cautionCount = displaySignals.filter((signal) => signal.risk !== "許容").length;
  const averageScore = displaySignals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(displaySignals.length, 1);
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="大口・ファンド" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Eye className="h-4 w-4 text-primary" />
              スマートマネー監視
            </h2>
            <BeginnerGuideButton topic="overview" onOpen={setBeginnerGuideTopic} label="初心者ガイド" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="whitespace-nowrap rounded bg-muted px-2 py-1">SEC 13F / 13D / 13G</span>
            <span className="whitespace-nowrap rounded bg-muted px-2 py-1">EDINET 大量保有</span>
            <span className="whitespace-nowrap rounded bg-amber-50 px-2 py-1 text-amber-700">開示遅延補正</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-emerald-50 px-2 py-1 text-emerald-700">
              <RefreshCw className="h-3 w-3" />
              自動再評価 {formatJstDateTime(autoRefreshedAt)}
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2 text-xs font-bold text-primary transition-colors hover:bg-muted disabled:opacity-60"
              disabled={smartMoneyStatus === "loading"}
            >
              <RefreshCw className={`h-3 w-3 ${smartMoneyStatus === "loading" ? "animate-spin" : ""}`} />
              手動再評価
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className={`rounded px-2 py-1 ${sourceStatusClass(smartMoneyData.source === "live" ? "live" : smartMoneyStatus === "error" ? "error" : "empty")}`}>
            データ {smartMoneyData.source === "live" ? "実取得" : smartMoneyStatus === "error" ? "取得失敗" : "フォールバック"}
          </span>
          <span className={`rounded px-2 py-1 ${sourceStatusClass(smartMoneyData.sourceStatus?.sec)}`}>
            SEC {sourceStatusLabel(smartMoneyData.sourceStatus?.sec)}
          </span>
          <span className={`rounded px-2 py-1 ${sourceStatusClass(smartMoneyData.sourceStatus?.edinet)}`}>
            EDINET {sourceStatusLabel(smartMoneyData.sourceStatus?.edinet)}
          </span>
          <span className={`rounded px-2 py-1 ${sourceStatusClass(smartMoneyData.sourceStatus?.price)}`}>
            価格 {sourceStatusLabel(smartMoneyData.sourceStatus?.price)}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { label: "調査優先", value: `${priorityCount}件`, icon: CheckCircle2, tone: "text-emerald-700" },
            { label: "平均追随価値", value: averageScore.toFixed(0), icon: Gauge, tone: "text-primary" },
            { label: "反証注意", value: `${cautionCount}件`, icon: ShieldAlert, tone: "text-amber-700" },
            { label: "監視ファンド", value: `${liveFunds.length}件`, icon: Building2, tone: "text-slate-700" },
          ].map((item) => (
            <div key={item.label} className="rounded border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-600">{item.label}</div>
                  <div className="mt-0.5 text-lg font-black tabular-nums text-foreground">{item.value}</div>
                </div>
                <item.icon className={`h-5 w-5 ${item.tone}`} />
              </div>
            </div>
          ))}
        </div>

        <section className="mb-3 rounded border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">追随価値トップ候補</h3>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-xs font-bold text-slate-600">
              鮮度・未織り込み・反証減点で順位付け
            </span>
          </div>
          <div className="grid gap-2 p-3 lg:grid-cols-3">
            {displaySignals.slice(0, 3).map((signal) => {
              const freshness = getFreshnessBadge(signal);
              const pricing = getPricingBadge(signal);

              return (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => setSelectedSignalId(signal.id)}
                  className="rounded border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {hasDisplayTicker(signal) && (
                        <div className="font-mono text-xs font-black text-primary">{signal.ticker}</div>
                      )}
                      <div className="truncate text-sm font-black text-foreground">{signal.company}</div>
                      <div className="mt-0.5 truncate text-xs font-semibold text-slate-600">
                        {signal.source === "edinet" && signal.filerName ? `提出者: ${signal.filerName}` : signal.fund.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black tabular-nums text-foreground">{signal.score}</div>
                      <div className="text-xs font-bold text-slate-600">追随価値</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={`rounded border px-2 py-1 text-xs font-black ${freshness.className}`}>{freshness.label}</span>
                    <span className={`rounded border px-2 py-1 text-xs font-black ${pricing.className}`}>{pricing.label}</span>
                    <span className={`rounded border px-2 py-1 text-xs font-black ${verdictClass(signal.verdict)}`}>{signal.verdict}</span>
                    {signal.relatedCount > 1 && (
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-600">
                        関連{signal.relatedCount}件
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{getNextAction(signal)}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mb-3 rounded border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {styles.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setSelectedStyle(style)}
                  className={`h-7 shrink-0 whitespace-nowrap rounded border px-2 text-xs font-bold transition-colors ${
                    selectedStyle === style
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-slate-600 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ファンド・銘柄・ティッカーで検索"
                className="h-8 w-full rounded border border-border bg-background pl-7 pr-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] text-xs">
              <thead className="bg-muted/40 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">判定</th>
                  <th className="px-3 py-2 text-left">ファンド</th>
                  <th className="px-3 py-2 text-left">対象銘柄 / 提出者</th>
                  <th className="px-3 py-2 text-right">追随価値</th>
                  <th className="px-3 py-2 text-left">織り込み</th>
                  <th className="px-3 py-2 text-right">比率</th>
                  <th className="px-3 py-2 text-right">変化</th>
                  <th className="px-3 py-2 text-right">遅延</th>
                  <th className="px-3 py-2 text-right">開示後</th>
                  <th className="px-3 py-2 text-left">反証</th>
                  <th className="px-3 py-2 text-left">次アクション</th>
                  <th className="px-3 py-2 text-right">調査</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDisplaySignals.map((signal) => {
                  const pricing = getPricingBadge(signal);
                  const sourceUrl = getSignalSourceUrl(signal);

                  return (
                    <tr key={signal.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <span className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-xs font-black ${verdictClass(signal.verdict)}`}>
                          {signal.verdict}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold leading-snug text-foreground">{signal.fund.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${styleClass(signal.fund.style)}`}>
                            {signal.fund.style}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">{signal.fund.manager}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {hasDisplayTicker(signal) && (
                          <div className="font-mono text-xs font-black text-primary">{signal.ticker}</div>
                        )}
                        <div className="font-semibold text-foreground">
                          {signal.source === "edinet" ? "対象銘柄: " : ""}
                          {signal.company}
                        </div>
                        {signal.source === "edinet" && signal.filerName && (
                          <div className="mt-0.5 text-xs font-semibold text-slate-600">
                            提出者: {signal.filerName}
                          </div>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          <span className="text-xs font-semibold text-slate-600">{signal.filingType} / {signal.signalType}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            提出 {signal.filingDate}
                          </span>
                          {signal.relatedCount > 1 && (
                            <span
                              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700"
                              title="同じ提出者・対象銘柄・提出日の大量保有報告書、変更報告書、訂正報告書などを1行にまとめています。"
                            >
                              関連書類 {signal.relatedCount}件を集約
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-black tabular-nums text-foreground">{signal.score}</div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${signal.score}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-xs font-black ${pricing.className}`}>
                          {pricing.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{signal.portfolioWeight.toFixed(1)}%</td>
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${signal.positionChange >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                        {formatSignedPercent(signal.positionChange)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{signal.filingLagDays}日</td>
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${signal.priceMoveSinceReport >= 8 ? "text-amber-700" : "text-slate-600"}`}>
                        {formatSignedPercent(signal.priceMoveSinceReport)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1.5">
                          {signal.risk === "許容" ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                          )}
                          <div>
                            <div className="font-bold text-foreground">{signal.risk}</div>
                            <div className="max-w-[260px] text-xs font-semibold leading-relaxed text-slate-600">
                              {buildCounterReasons(signal)[0]}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[260px] px-3 py-2 text-xs font-semibold leading-relaxed text-slate-600">
                        {getNextAction(signal)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedSignalId(signal.id)}
                            className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-primary/30 bg-primary/5 px-2 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            <BookOpenText className="h-3 w-3" />
                            詳細
                          </button>
                          {sourceUrl && signal.source === "edinet" && (
                            <button
                              type="button"
                              onClick={() => setViewerSignalId(signal.id)}
                              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                              title="画面内でEDINET提出PDFを表示します"
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
                              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                              title="実際の提出書類を開きます"
                            >
                              <ExternalLink className="h-3 w-3" />
                              提出リンク
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <section className="rounded border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
              <Scale className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">判定の読み方</h3>
            </div>
            <div className="space-y-2 p-3 text-xs font-semibold leading-relaxed">
              <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
                まず見るべき候補は「調査優先」{priorityCount}件。コピー買いではなく、詳細で一次開示と価格織り込みを確認します。
              </div>
              <div className="grid gap-2 text-xs">
                {[
                  ["調査優先", "高信頼ファンド、集中度上昇、複数ファンド一致、開示後未急騰が揃った候補。"],
                  ["監視", "材料はあるが、遅延・価格上昇・単独ファンド要因が残る候補。次回提出で継続性を見る。"],
                  ["コピー非推奨", "縮小、全売却、急騰済み、戦略不透明のどれかが強い候補。買いではなく反証材料として扱う。"],
                ].map(([label, text]) => (
                  <div key={label} className="rounded border border-border bg-background p-2">
                    <div className="font-black text-foreground">{label}</div>
                    <div className="mt-1 text-slate-600">{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">買う前の停止条件</h3>
              <span className="whitespace-nowrap rounded bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700">
                注意 {cautionCount}件
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 text-xs font-semibold">
              {[
                ["開示後急騰", "報告日以降に大きく上昇済みなら、良い材料でも後追い期待値を下げる。", "停止"],
                ["13Fの遅延", "四半期末時点の保有なので、提出時点では既に売却済みの可能性がある。", "確認"],
                ["売却・縮小", "有名ファンドの縮小は、買い材料ではなく人気銘柄の反証材料として見る。", "停止"],
                ["本文未確認", "13D/EDINETは保有目的、共同保有者、資金源、変更理由を読んでから判断する。", "必須"],
              ].map(([label, text, status]) => (
                <div key={label} className="rounded border border-border bg-background p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-black text-foreground">{label}</div>
                    <span className="shrink-0 whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-xs font-bold text-slate-600">{status}</span>
                  </div>
                  <div className="mt-0.5 text-slate-600">{text}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">次に見る公開データ</h3>
            </div>
            <div className="space-y-2 p-3 text-xs font-semibold">
              {[
                ["13D / 13G / EDINET", "5%超保有、保有目的、共同保有、変更報告。アクティビスト検知の最優先データ。", "高"],
                ["13F / N-PORT", "四半期保有の差分。長期テーマと集中投資の痕跡を見るが、遅延を必ず補正。", "中"],
                ["価格・出来高", "報告日、提出日、現在値、出来高急増を比較し、織り込み済みかを判定。", "高"],
                ["空売り・信用・イベント", "空売り残高、信用残、TOB、自社株買い、増資などで大口買いの裏側を反証。", "中"],
              ].map(([label, text, priority]) => (
                <div key={label} className="flex items-start justify-between gap-2 rounded border border-border bg-background p-2">
                  <div>
                    <div className="font-black text-foreground">{label}</div>
                    <div className="mt-0.5 text-xs text-slate-600">{text}</div>
                  </div>
                  <span className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-bold ${
                    priority === "高" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"
                  }`}>
                    優先度 {priority}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-3 rounded border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">合法ウォッチルート</h3>
            <span className="whitespace-nowrap rounded bg-muted px-2 py-0.5 text-xs font-bold text-slate-600">
              非公開情報・インサイダー情報は対象外
            </span>
          </div>
          <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-4">
            {legalWatchRoutes.map((route) => (
              <div key={route.title} className="rounded border border-border bg-background p-2">
                <div className="text-xs font-black text-foreground">{route.title}</div>
                <div className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{route.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-3 rounded border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">監視ファンド</h3>
          </div>
          <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
            {liveFunds.map((fund) => (
              <div key={fund.id} className="rounded border border-border bg-background p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-foreground">{fund.name}</div>
                    <div className="text-xs font-semibold text-slate-600">{fund.manager}</div>
                  </div>
                  <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-bold ${styleClass(fund.style)}`}>{fund.style}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs font-semibold">
                  <div className="rounded bg-muted px-1 py-1">
                    <div className="text-slate-600">信頼</div>
                    <div className="text-xs font-black text-foreground">{fund.reliability}</div>
                  </div>
                  <div className="rounded bg-muted px-1 py-1">
                    <div className="text-slate-600">読解</div>
                    <div className="text-xs font-black text-foreground">{fund.readable}</div>
                  </div>
                  <div className="rounded bg-muted px-1 py-1">
                    <div className="text-slate-600">遅延</div>
                    <div className="text-xs font-black text-foreground">{fund.lagRisk}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      {isBeginnerGuideOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-label="初心者ガイド"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBeginnerGuideTopic(null);
          }}
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-lg leading-none">🔰</span>
                  <h3 className="text-base font-black leading-tight text-emerald-950">初心者ガイド</h3>
                </div>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-800">
                  このページの見方、接続状態、候補、一覧表の専門用語、監視ファンドの意味をまとめています。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBeginnerGuideTopic(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-emerald-200 bg-white text-emerald-700 transition-colors hover:bg-emerald-100"
                aria-label="初心者向け説明を閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-4">
              <div className="space-y-4">
                {beginnerGuideSections.map((section) => (
                  <section key={section.title} className="rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-black text-slate-950">{section.title}</div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{section.lead}</p>
                    </div>
                    <div className="grid gap-2 p-3 md:grid-cols-2">
                      {section.points.map((point) => (
                        <div key={point.label} className="rounded border border-slate-200 bg-slate-50 p-3">
                          <div className="text-sm font-black text-slate-950">{point.label}</div>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{point.body}</p>
                        </div>
                      ))}
                    </div>
                    {section.terms && (
                      <div className="border-t border-slate-100 p-3 pt-2">
                        <div className="mb-2 text-xs font-black text-slate-700">専門用語ミニ辞典</div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {section.terms.map((item) => (
                            <div key={item.term} className="rounded border border-emerald-100 bg-emerald-50/60 p-3">
                              <div className="text-xs font-black text-emerald-900">{item.term}</div>
                              <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-800">{item.body}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                ))}
              </div>
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">
                このページは投資候補を探すための補助ツールです。最終判断では、提出書類の本文、決算、チャート、リスクを自分で確認してください。
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedSignal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedSignal.ticker} 調査報告書`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedSignalId(null);
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-slate-50 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-300 bg-white px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black leading-tight text-slate-950">{selectedSignal.ticker} 調査報告書</h3>
                  <span className={`whitespace-nowrap rounded border px-2 py-1 text-xs font-black ${verdictClass(selectedSignal.verdict)}`}>
                    {selectedSignal.verdict}
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                    <RefreshCw className="h-3 w-3" />
                    自動再評価 {formatJstDateTime(autoRefreshedAt)}
                  </span>
                </div>
                <div className="mt-1 text-sm font-bold text-slate-700">
                  {selectedSignal.company} / {selectedSignal.fund.name} / {selectedSignal.filingType} {selectedSignal.signalType}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSignalId(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
              <div className="mb-4 grid gap-3 md:grid-cols-5">
                {[
                  ["追随価値", `${selectedSignal.score}`, Gauge],
                  ["保有比率", `${selectedSignal.portfolioWeight.toFixed(1)}%`, Layers3],
                  ["ポジション変化", formatSignedPercent(selectedSignal.positionChange), TrendingUp],
                  ["開示遅延", `${selectedSignal.filingLagDays}日`, Clock3],
                  ["開示後", formatSignedPercent(selectedSignal.priceMoveSinceReport), AlertTriangle],
                ].map(([label, value, Icon]) => (
                  <div key={label as string} className="rounded-md border border-slate-300 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-slate-600">{label as string}</div>
                        <div className="mt-1 text-xl font-black tabular-nums text-slate-950">{value as string}</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                <div className="space-y-4">
                  <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-4 py-2">
                      <div className="text-sm font-black text-slate-950">追随価値スコア分解</div>
                      <span className={`rounded border px-2 py-1 text-xs font-black ${getPricingBadge(selectedSignal).className}`}>
                        {getPricingBadge(selectedSignal).label}
                      </span>
                    </div>
                    <div className="grid gap-3 p-4 md:grid-cols-2">
                      {selectedFollowBreakdown.map((item) => {
                        const width = item.value < 0 ? Math.min(100, Math.abs(item.value / item.max) * 100) : Math.min(100, (item.value / item.max) * 100);

                        return (
                          <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="text-xs font-black text-slate-950">{item.label}</div>
                              <div className={`font-mono text-xs font-black ${item.value < 0 ? "text-rose-700" : "text-slate-700"}`}>
                                {item.value > 0 ? "+" : ""}{item.value}
                              </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                              <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${width}%` }} />
                            </div>
                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{item.note}</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-950">株価反応と織り込み診断</div>
                    <div className="grid gap-3 p-4 md:grid-cols-3">
                      {selectedPriceReactionRows.map((row) => (
                        <div key={row.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs font-black text-slate-600">{row.label}</div>
                          <div className={`mt-1 text-xl font-black tabular-nums ${row.value.startsWith("+") ? "text-stock-up" : row.value.startsWith("-") ? "text-stock-down" : "text-slate-950"}`}>
                            {row.value}
                          </div>
                          <div className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{row.memo}</div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-600">
                      {getPricingBadge(selectedSignal).detail}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-950">この判定の根拠</div>
                    <div className="grid gap-3 p-4 md:grid-cols-2">
                      {[
                        ["ファンド品質", `${selectedSignal.fund.name} は ${selectedSignal.fund.style}。信頼 ${selectedSignal.fund.reliability} / 読解 ${selectedSignal.fund.readable}`],
                        ["開示種類", `${selectedSignal.filingType} は ${selectedSignal.filingType === "13F" ? "遅延が大きいが長期保有の痕跡を見やすい" : "大量保有・関与意図を読みやすい"}開示です。`],
                        ["集中度", `ポートフォリオ比率 ${selectedSignal.portfolioWeight.toFixed(1)}%、集中順位 ${selectedSignal.concentrationRank} 位。`],
                        ["複数一致", `${selectedSignal.multiFundCount}ファンド一致。多いほど単独ノイズではない可能性が高いです。`],
                        ["織り込み", `報告日から提出後まで ${selectedSignal.priceMoveSinceReport >= 0 ? "+" : ""}${selectedSignal.priceMoveSinceReport.toFixed(1)}%。急騰済みなら追随期待値を下げます。`],
                        ["反証", `${selectedSignal.risk}。${selectedSignal.note}`],
                      ].map(([label, text]) => (
                        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs font-black text-slate-950">{label}</div>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{text}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-950">調査報告書</div>
                    <div className="grid gap-3 p-4 md:grid-cols-2">
                      {selectedReportCards.map((section) => (
                        <article key={section.title} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10">
                              <section.icon className="h-3.5 w-3.5 text-primary" />
                            </span>
                            <h4 className="text-xs font-black text-slate-950">{section.title}</h4>
                          </div>
                          <p className="text-xs font-semibold leading-relaxed text-slate-600">{section.body}</p>
                          <div className="mt-2 space-y-1">
                            {section.points.map((point) => (
                              <div key={point} className="rounded bg-white px-2 py-1 text-xs font-bold leading-relaxed text-slate-600 ring-1 ring-slate-200">
                                {point}
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-4 py-2">
                      <div className="text-sm font-black text-slate-950">反証理由</div>
                      <span className={`shrink-0 rounded border px-2 py-1 text-xs font-black ${getFreshnessBadge(selectedSignal).className}`}>
                        {getFreshnessBadge(selectedSignal).label}
                      </span>
                    </div>
                    <div className="space-y-2 p-4">
                      {selectedCounterReasons.map((reason) => (
                        <div key={reason} className="flex gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <div className="text-xs font-semibold leading-relaxed text-slate-600">{reason}</div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-black text-slate-950">次アクション</div>
                      <div className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{getNextAction(selectedSignal)}</div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-950">公式提出書類</div>
                    <div className="divide-y divide-slate-200">
                      {getSignalSourceUrl(selectedSignal) && selectedSignal.source === "edinet" && (
                        <button
                          type="button"
                          onClick={() => setViewerSignalId(selectedSignal.id)}
                          className="block w-full bg-emerald-50/70 px-4 py-3 text-left transition-colors hover:bg-emerald-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-emerald-700">公式提出PDF</span>
                            <span className="whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-xs font-bold text-emerald-700">実データ</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-800">
                            EDINET APIで取得する大量保有関連書類PDFを画面内で表示します。
                          </p>
                        </button>
                      )}
                      {getSignalSourceUrl(selectedSignal) && selectedSignal.source !== "edinet" && (
                        <a
                          href={getSignalSourceUrl(selectedSignal)}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-emerald-50/70 px-4 py-3 transition-colors hover:bg-emerald-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-emerald-700">公式提出リンク</span>
                            <span className="whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-xs font-bold text-emerald-700">実データ</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-800">
                            SEC EDGARで検知した提出書類です。
                          </p>
                        </a>
                      )}
                      {researchSources.map((source) => (
                        <a
                          key={source.label}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-4 py-3 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-primary">{source.label}</span>
                            <span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">公式</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{source.memo}</p>
                        </a>
                      ))}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-950">調査チェックリスト</div>
                    <div className="space-y-2 p-4">
                      {selectedChecklist.map((item) => (
                        <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-sm font-black text-slate-950">{item.label}</div>
                            <span className={`shrink-0 whitespace-nowrap rounded px-2 py-1 text-xs font-black ${checklistStatusClass(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-semibold leading-relaxed text-slate-600">{item.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {viewerSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-4 py-2">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950">公式提出PDF</div>
                <div className="truncate text-xs font-semibold text-slate-600">
                  {hasDisplayTicker(viewerSignal) ? `${viewerSignal.ticker} / ` : ""}
                  {viewerSignal.company}
                  {viewerSignal.filerName ? ` / 提出者: ${viewerSignal.filerName}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getSignalSourceUrl(viewerSignal)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  別タブ
                </a>
                <button
                  type="button"
                  onClick={() => setViewerSignalId(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                  aria-label="PDFビューアを閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              title={`${viewerSignal.company} 公式提出PDF`}
              src={getSignalViewerUrl(viewerSignal)}
              className="min-h-0 flex-1 border-0 bg-slate-200"
            />
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
};

export default SmartMoneyPage;
