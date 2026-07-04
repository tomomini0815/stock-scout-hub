import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpenText,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  Filter,
  Gauge,
  Layers3,
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

type FundStyle = "長期バリュー" | "アクティビスト" | "イベント" | "グロース" | "クオンツ";
type FilingType = "13F" | "13D" | "13G" | "EDINET";
type SignalType = "新規買い" | "買い増し" | "縮小" | "全売却" | "大量保有";

interface FundSeed {
  id: string;
  name: string;
  manager: string;
  style: FundStyle;
  jurisdiction: "US" | "JP";
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
}

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

const researchSections = [
  {
    title: "結論",
    icon: CheckCircle2,
    body:
      "最も強い使い方は、著名ファンドの売買を機械的にコピーすることではなく、公的開示から投資仮説を抽出し、開示遅延・織り込み・ヘッジ不明を反証したうえで調査候補を絞ることです。13Fはテーマと長期保有の痕跡、13D/13GとEDINET大量保有は支配権・アクティビスト性の早期検知に使います。",
  },
  {
    title: "取得できる情報",
    icon: Database,
    body:
      "13Fでは四半期末時点の米国上場株などのロング保有、株数、評価額を取得できます。13D/13Gでは5%超の実質保有、保有目的、資金源、契約関係、重要変更を追えます。EDINETでは日本株の大量保有報告書・変更報告書を追跡対象にできます。",
  },
  {
    title: "取得できない情報",
    icon: ShieldAlert,
    body:
      "リアルタイムの発注、平均取得単価、空売り、デリバティブ、海外株の一部、ヘッジ、四半期中に既に解消したポジションは完全には見えません。したがって、アプリは売買コピー装置ではなく、開示ベースの調査優先度エンジンとして扱います。",
  },
  {
    title: "実装方針",
    icon: Layers3,
    body:
      "SEC submissions APIから監視CIKの13F/13D/13G提出を取得し、13F information tableを前回提出と比較します。EDINETは大量保有報告書・変更報告書を抽出し、提出者、対象銘柄、保有割合、増減、保有目的を正規化します。その後、報告日株価・提出日株価・現在株価を比較して、開示後に織り込み済みか判定します。",
  },
  {
    title: "スコア設計",
    icon: Gauge,
    body:
      "加点は、信頼できるファンド、戦略が読みやすい、集中度上昇、新規買い、継続買い増し、複数ファンド一致、13D/EDINET大量保有、開示後未急騰。減点は、13F遅延、提出後急騰、縮小・全売却、クオンツ寄り、イベント系の回転速度、見えないヘッジリスクです。",
  },
  {
    title: "検証計画",
    icon: TrendingUp,
    body:
      "ファンドごとに提出日翌日、5営業日、20営業日、60営業日のリターンをバックテストし、同時期の指数と比較します。ファンドの有名度が高く提出直後に織り込まれやすい場合は、逆にスコアを下げます。最終的な合格条件は、過去データで後追い優位性が確認できることです。",
  },
];

const roadmapItems = [
  { phase: "1", title: "監視CIK/EDINET提出者リスト", detail: "Berkshire、Pershing、Baupost、ElliottなどをCIKで固定し、日本株は大量保有提出者名で監視。" },
  { phase: "2", title: "提出検知", detail: "SEC submissions JSONをサーバー側で定期取得。EDINETは対象書類種別を抽出。" },
  { phase: "3", title: "保有差分", detail: "前回保有との比較で新規買い、買い増し、縮小、全売却を判定。" },
  { phase: "4", title: "反証補正", detail: "45日遅延、提出後株価変化、ファンド戦略、複数一致、13D/13G有無を補正。" },
  { phase: "5", title: "検証", detail: "提出後リターンをファンド別・戦略別にバックテストし、使えるファンドだけ残す。" },
];

const dayDiff = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));

const getFund = (fundId: string) => funds.find((fund) => fund.id === fundId) ?? funds[0];

const scoreSignal = (signal: FilingSignalSeed) => {
  const fund = getFund(signal.fundId);
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

const SmartMoneyPage = () => {
  const [selectedStyle, setSelectedStyle] = useState<"すべて" | FundStyle>("すべて");
  const [query, setQuery] = useState("");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const scoredSignals = useMemo(
    () =>
      signalSeeds
        .map((signal) => ({ ...signal, ...scoreSignal(signal) }))
        .sort((a, b) => b.score - a.score),
    []
  );
  const filteredSignals = useMemo(
    () =>
      scoredSignals.filter((signal) => {
        if (selectedStyle !== "すべて" && signal.fund.style !== selectedStyle) return false;
        const normalized = query.trim().toLowerCase();
        if (!normalized) return true;
        return [signal.ticker, signal.company, signal.fund.name, signal.fund.manager]
          .some((value) => value.toLowerCase().includes(normalized));
      }),
    [query, scoredSignals, selectedStyle]
  );
  const priorityCount = scoredSignals.filter((signal) => signal.verdict === "調査優先").length;
  const cautionCount = scoredSignals.filter((signal) => signal.risk !== "許容").length;
  const averageScore = scoredSignals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(scoredSignals.length, 1);
  const styles: Array<"すべて" | FundStyle> = ["すべて", "長期バリュー", "アクティビスト", "イベント", "グロース", "クオンツ"];
  const selectedSignal = scoredSignals.find((signal) => signal.id === selectedSignalId);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="大口・ファンド" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Eye className="h-4 w-4 text-primary" />
            スマートマネー監視
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xxs font-semibold text-muted-foreground">
            <span className="whitespace-nowrap rounded bg-muted px-2 py-1">SEC 13F / 13D / 13G</span>
            <span className="whitespace-nowrap rounded bg-muted px-2 py-1">EDINET 大量保有</span>
            <span className="whitespace-nowrap rounded bg-amber-50 px-2 py-1 text-amber-700">開示遅延補正</span>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { label: "調査優先", value: `${priorityCount}件`, icon: CheckCircle2, tone: "text-emerald-700" },
            { label: "平均シグナル", value: averageScore.toFixed(0), icon: Gauge, tone: "text-primary" },
            { label: "反証注意", value: `${cautionCount}件`, icon: ShieldAlert, tone: "text-amber-700" },
            { label: "監視ファンド", value: `${funds.length}件`, icon: Building2, tone: "text-slate-700" },
          ].map((item) => (
            <div key={item.label} className="rounded border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xxs font-bold text-muted-foreground">{item.label}</div>
                  <div className="mt-0.5 text-lg font-black tabular-nums text-foreground">{item.value}</div>
                </div>
                <item.icon className={`h-5 w-5 ${item.tone}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3 rounded border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {styles.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setSelectedStyle(style)}
                  className={`h-7 shrink-0 whitespace-nowrap rounded border px-2 text-xxs font-bold transition-colors ${
                    selectedStyle === style
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
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
            <table className="w-full min-w-[980px] text-xs">
              <thead className="bg-muted/40 text-xxs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">判定</th>
                  <th className="px-3 py-2 text-left">ファンド</th>
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-right">スコア</th>
                  <th className="px-3 py-2 text-right">比率</th>
                  <th className="px-3 py-2 text-right">変化</th>
                  <th className="px-3 py-2 text-right">遅延</th>
                  <th className="px-3 py-2 text-right">開示後</th>
                  <th className="px-3 py-2 text-left">反証</th>
                  <th className="px-3 py-2 text-right">調査</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSignals.map((signal) => (
                  <tr key={signal.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <span className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-xxs font-black ${verdictClass(signal.verdict)}`}>
                        {signal.verdict}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-foreground">{signal.fund.name}</div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${styleClass(signal.fund.style)}`}>
                          {signal.fund.style}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">{signal.fund.manager}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xxs font-black text-primary">{signal.ticker}</div>
                      <div className="font-semibold text-foreground">{signal.company}</div>
                      <div className="text-[10px] text-muted-foreground">{signal.filingType} / {signal.signalType}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="font-black tabular-nums text-foreground">{signal.score}</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${signal.score}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{signal.portfolioWeight.toFixed(1)}%</td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${signal.positionChange >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                      {signal.positionChange >= 0 ? "+" : ""}{signal.positionChange.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{signal.filingLagDays}日</td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${signal.priceMoveSinceReport >= 8 ? "text-amber-700" : "text-muted-foreground"}`}>
                      {signal.priceMoveSinceReport >= 0 ? "+" : ""}{signal.priceMoveSinceReport.toFixed(1)}%
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
                          <div className="max-w-[260px] text-[10px] leading-relaxed text-muted-foreground">{signal.note}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSignalId(signal.id)}
                        className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-primary/30 bg-primary/5 px-2 text-xxs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <BookOpenText className="h-3 w-3" />
                        詳細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <section className="rounded border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
              <Scale className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">最強ロジック</h3>
            </div>
            <div className="space-y-2 p-3 text-xs font-semibold leading-relaxed text-foreground">
              <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
                高信頼 = 優秀ファンド + 集中度上昇 + 複数一致 + 開示後未急騰
              </div>
              <div className="grid grid-cols-2 gap-2 text-xxs">
                <div className="rounded border border-border p-2">
                  <div className="font-black text-foreground">加点</div>
                  <div className="mt-1 text-muted-foreground">新規買い、買い増し、上位保有、13D、EDINET、複数ファンド一致</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="font-black text-foreground">減点</div>
                  <div className="mt-1 text-muted-foreground">開示遅延、開示後急騰、縮小、全売却、戦略不透明、クオンツ寄り</div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">反証ゲート</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 text-xxs font-semibold">
              {[
                ["遅延", "13Fは最大45日遅れ。保有日と提出日を分離。"],
                ["織り込み", "提出後の急騰は追随期待値を下げる。"],
                ["見えないヘッジ", "13Fはロング中心。空売りやデリバティブは別確認。"],
                ["戦略差", "長期投資家とイベント系を同じ重みで扱わない。"],
              ].map(([label, text]) => (
                <div key={label} className="rounded border border-border bg-background p-2">
                  <div className="font-black text-foreground">{label}</div>
                  <div className="mt-0.5 text-muted-foreground">{text}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">接続データ</h3>
            </div>
            <div className="space-y-2 p-3 text-xs font-semibold">
              {[
                ["SEC EDGAR", "13F / 13D / 13G / submissions API", "設計済み"],
                ["EDINET", "大量保有報告書 / 変更報告書", "接続候補"],
                ["価格補正", "報告日・提出日・現在値の比較", "実装ロジック"],
                ["バックテスト", "提出後5/20/60日の検証", "次段階"],
              ].map(([label, text, status]) => (
                <div key={label} className="flex items-start justify-between gap-2 rounded border border-border bg-background p-2">
                  <div>
                    <div className="font-black text-foreground">{label}</div>
                    <div className="mt-0.5 text-xxs text-muted-foreground">{text}</div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-3 rounded border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-table-header-bg px-3 py-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">監視ファンド</h3>
          </div>
          <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
            {funds.map((fund) => (
              <div key={fund.id} className="rounded border border-border bg-background p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-foreground">{fund.name}</div>
                    <div className="text-xxs font-semibold text-muted-foreground">{fund.manager}</div>
                  </div>
                  <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${styleClass(fund.style)}`}>{fund.style}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] font-semibold">
                  <div className="rounded bg-muted px-1 py-1">
                    <div className="text-muted-foreground">信頼</div>
                    <div className="text-xs font-black text-foreground">{fund.reliability}</div>
                  </div>
                  <div className="rounded bg-muted px-1 py-1">
                    <div className="text-muted-foreground">読解</div>
                    <div className="text-xs font-black text-foreground">{fund.readable}</div>
                  </div>
                  <div className="rounded bg-muted px-1 py-1">
                    <div className="text-muted-foreground">遅延</div>
                    <div className="text-xs font-black text-foreground">{fund.lagRisk}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      {selectedSignal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedSignal.ticker} 調査報告書`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedSignalId(null);
          }}
        >
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded border border-border bg-card shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-border bg-table-header-bg px-4 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-foreground">{selectedSignal.ticker} 調査報告書</h3>
                  <span className={`whitespace-nowrap rounded border px-2 py-1 text-xxs font-black ${verdictClass(selectedSignal.verdict)}`}>
                    {selectedSignal.verdict}
                  </span>
                  <span className="whitespace-nowrap rounded bg-muted px-2 py-1 text-xxs font-bold text-muted-foreground">
                    調査日 2026/07/04
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-muted-foreground">
                  {selectedSignal.company} / {selectedSignal.fund.name} / {selectedSignal.filingType} {selectedSignal.signalType}
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

            <div className="max-h-[calc(88vh-72px)] overflow-y-auto p-4">
              <div className="mb-3 grid gap-2 md:grid-cols-4">
                {[
                  ["スコア", `${selectedSignal.score}`, Gauge],
                  ["保有比率", `${selectedSignal.portfolioWeight.toFixed(1)}%`, Layers3],
                  ["ポジション変化", `${selectedSignal.positionChange >= 0 ? "+" : ""}${selectedSignal.positionChange.toFixed(1)}%`, TrendingUp],
                  ["開示遅延", `${selectedSignal.filingLagDays}日`, Clock3],
                ].map(([label, value, Icon]) => (
                  <div key={label as string} className="rounded border border-border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xxs font-bold text-muted-foreground">{label as string}</div>
                        <div className="mt-0.5 text-lg font-black tabular-nums text-foreground">{value as string}</div>
                      </div>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
                <div className="space-y-3">
                  <section className="rounded border border-border bg-background">
                    <div className="border-b border-border px-3 py-2 text-xs font-black text-foreground">この判定の根拠</div>
                    <div className="grid gap-2 p-3 md:grid-cols-2">
                      {[
                        ["ファンド品質", `${selectedSignal.fund.name} は ${selectedSignal.fund.style}。信頼 ${selectedSignal.fund.reliability} / 読解 ${selectedSignal.fund.readable}`],
                        ["開示種類", `${selectedSignal.filingType} は ${selectedSignal.filingType === "13F" ? "遅延が大きいが長期保有の痕跡を見やすい" : "大量保有・関与意図を読みやすい"}開示です。`],
                        ["集中度", `ポートフォリオ比率 ${selectedSignal.portfolioWeight.toFixed(1)}%、集中順位 ${selectedSignal.concentrationRank} 位。`],
                        ["複数一致", `${selectedSignal.multiFundCount}ファンド一致。多いほど単独ノイズではない可能性が高いです。`],
                        ["織り込み", `報告日から提出後まで ${selectedSignal.priceMoveSinceReport >= 0 ? "+" : ""}${selectedSignal.priceMoveSinceReport.toFixed(1)}%。急騰済みなら追随期待値を下げます。`],
                        ["反証", `${selectedSignal.risk}。${selectedSignal.note}`],
                      ].map(([label, text]) => (
                        <div key={label} className="rounded border border-border p-2">
                          <div className="text-xs font-black text-foreground">{label}</div>
                          <p className="mt-1 text-xxs font-semibold leading-relaxed text-muted-foreground">{text}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded border border-border bg-background">
                    <div className="border-b border-border px-3 py-2 text-xs font-black text-foreground">方法論レポート</div>
                    <div className="grid gap-2 p-3 md:grid-cols-2">
                      {researchSections.map((section) => (
                        <article key={section.title} className="rounded border border-border p-2">
                          <div className="mb-1 flex items-center gap-2">
                            <section.icon className="h-3.5 w-3.5 text-primary" />
                            <h4 className="text-xs font-black text-foreground">{section.title}</h4>
                          </div>
                          <p className="text-xxs font-semibold leading-relaxed text-muted-foreground">{section.body}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="space-y-3">
                  <section className="rounded border border-border bg-background">
                    <div className="border-b border-border px-3 py-2 text-xs font-black text-foreground">一次情報リンク</div>
                    <div className="divide-y divide-border">
                      {researchSources.map((source) => (
                        <a
                          key={source.label}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-3 py-2 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-primary">{source.label}</span>
                            <span className="whitespace-nowrap text-[10px] font-bold text-muted-foreground">公式</span>
                          </div>
                          <p className="mt-1 text-xxs font-semibold leading-relaxed text-muted-foreground">{source.memo}</p>
                        </a>
                      ))}
                    </div>
                  </section>

                  <section className="rounded border border-border bg-background">
                    <div className="border-b border-border px-3 py-2 text-xs font-black text-foreground">実装ロードマップ</div>
                    <div className="space-y-2 p-3">
                      {roadmapItems.map((item) => (
                        <div key={item.phase} className="flex gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-xxs font-black text-primary-foreground">
                            {item.phase}
                          </div>
                          <div>
                            <div className="text-xs font-black text-foreground">{item.title}</div>
                            <div className="text-xxs font-semibold leading-relaxed text-muted-foreground">{item.detail}</div>
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
      <SiteFooter />
    </div>
  );
};

export default SmartMoneyPage;
