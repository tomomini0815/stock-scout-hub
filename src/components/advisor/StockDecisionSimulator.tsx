import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  Flame,
  Layers,
  Plus,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { stockUniverse, type StockData } from "@/data/stockData";
import { findSearchableStock } from "@/lib/stockSearch";
import {
  calculateStockMetrics,
  type StockDetailedMetrics,
} from "@/lib/stockMetricsData";
import { generateStockHealthReport, resolveEffectiveStock } from "@/data/advisorData";
import { useLiveStockQuote, useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import {
  addChartWatchlistStock,
  CHART_WATCHLIST_UPDATED_EVENT,
  readChartWatchlist,
  removeChartWatchlistStock,
} from "@/lib/chartWatchlist";
import { toast } from "@/components/ui/sonner";
import { StyleMatchWizard } from "@/components/advisor/StyleMatchWizard";

export type SimulatorMode = "versus" | "scenario" | "portfolio";

export interface StockDecisionSimulatorProps {
  initialStockCode?: string;
  onInspectStockInHealthCheck?: (code: string) => void;
  activeMode?: SimulatorMode;
  onModeChange?: (mode: SimulatorMode) => void;
  hideModeSwitcher?: boolean;
}

// 2銘柄比較の人気ライバル対決プリセット
interface RivalPreset {
  title: string;
  category: string;
  codeA: string;
  nameA: string;
  codeB: string;
  nameB: string;
}

const rivalPresets: RivalPreset[] = [
  {
    title: "自動車覇権対決",
    category: "自動車",
    codeA: "7203",
    nameA: "トヨタ自動車",
    codeB: "7267",
    nameB: "本田技研工業",
  },
  {
    title: "メガバンク利上げ対決",
    category: "メガバンク",
    codeA: "8306",
    nameA: "三菱UFJフィナンシャルG",
    codeB: "8316",
    nameB: "三井住友フィナンシャルG",
  },
  {
    title: "五大商社バフェット対決",
    category: "総合商社",
    codeA: "8058",
    nameA: "三菱商事",
    codeB: "8001",
    nameB: "伊藤忠商事",
  },
  {
    title: "AI半導体製造装置対決",
    category: "半導体",
    codeA: "8035",
    nameA: "東京エレクトロン",
    codeB: "6857",
    nameB: "アドバンテスト",
  },
  {
    title: "ゲーム・エンタメ巨頭対決",
    category: "エンタメ",
    codeA: "7974",
    nameA: "任天堂",
    codeB: "6758",
    nameB: "ソニーグループ",
  },
  {
    title: "国策・防衛重工対決",
    category: "防衛・重工",
    codeA: "7011",
    nameA: "三菱重工業",
    codeB: "7012",
    nameB: "川崎重工業",
  },
  {
    title: "ディフェンシブ通信対決",
    category: "通信",
    codeA: "9432",
    nameA: "日本電信電話 (NTT)",
    codeB: "9433",
    nameB: "KDDI",
  },
  {
    title: "半導体精密加工対決",
    category: "先端半導体",
    codeA: "6146",
    nameA: "ディスコ",
    codeB: "6920",
    nameB: "レーザーテック",
  },
];

// ヘルパー: 銘柄データの安全な解決
const resolveStock = (codeOrName: string): StockData => {
  const found = findSearchableStock(codeOrName);
  if (found) return resolveEffectiveStock(found);
  const fromUniv = stockUniverse.find(
    (s) => s.code === codeOrName || s.name.includes(codeOrName)
  );
  if (fromUniv) return resolveEffectiveStock(fromUniv);
  return resolveEffectiveStock(stockUniverse[0]);
};

export const StockDecisionSimulator = ({
  initialStockCode = "7203",
  onInspectStockInHealthCheck,
  activeMode,
  onModeChange,
  hideModeSwitcher = false,
}: StockDecisionSimulatorProps) => {
  const [internalMode, setInternalMode] = useState<SimulatorMode>("versus");
  const mode = activeMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  // --- 1. ガチンコ比較の状態 ---
  const [stockCodeA, setStockCodeA] = useState<string>("7203");
  const [stockCodeB, setStockCodeB] = useState<string>("7267");
  const [searchQueryA, setSearchQueryA] = useState<string>("");
  const [searchQueryB, setSearchQueryB] = useState<string>("");
  const versusResultRef = useRef<HTMLDivElement>(null);

  // --- 2. 売買シナリオ判定の状態 ---
  const [scenarioStockCode, setScenarioStockCode] = useState<string>(
    initialStockCode || "7203"
  );
  useEffect(() => {
    if (initialStockCode) {
      setScenarioStockCode(initialStockCode);
    }
  }, [initialStockCode]);
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState<string>("");
  const [tradeStance, setTradeStance] = useState<"income" | "swing" | "value">(
    "income"
  );
  const [riskTolerance, setRiskTolerance] = useState<
    "safe" | "balanced" | "aggressive"
  >("balanced");

  // --- 3. 予算別ポートフォリオの状態 ---
  const [budget, setBudget] = useState<number>(500_000); // 50万円
  const [portfolioStrategy, setPortfolioStrategy] = useState<
    "dividend" | "growth" | "balanced"
  >("dividend");
  const [allowOddLot, setAllowOddLot] = useState<boolean>(true); // 単元未満株（1株投資）対応

  // --- チャートウォッチリスト連携 ---
  const [watchlistCodes, setWatchlistCodes] = useState<string[]>(() =>
    readChartWatchlist().map((item) => item.code)
  );
  useEffect(() => {
    const sync = () => setWatchlistCodes(readChartWatchlist().map((item) => item.code));
    window.addEventListener(CHART_WATCHLIST_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHART_WATCHLIST_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleToggleWatchlist = (stock: StockData) => {
    if (watchlistCodes.includes(stock.code)) {
      const next = removeChartWatchlistStock(stock.code);
      setWatchlistCodes(next.map((item) => item.code));
      toast.info(`${stock.code} ${stock.name}をチャート監視から外しました`);
    } else {
      const next = addChartWatchlistStock({ ...stock, sourceLabel: "銘柄診断" });
      setWatchlistCodes(next.map((item) => item.code));
      toast.success(`${stock.code} ${stock.name}をチャート監視に追加しました`);
    }
  };

  // ==========================================
  // 1. ガチンコ比較の計算ロジック
  // ==========================================
  const baseStockA = useMemo(() => resolveStock(stockCodeA), [stockCodeA]);
  const baseStockB = useMemo(() => resolveStock(stockCodeB), [stockCodeB]);
  const { stock: stockA } = useLiveStockQuote(baseStockA);
  const { stock: stockB } = useLiveStockQuote(baseStockB);

  const metricsA = useMemo(() => calculateStockMetrics(stockA), [stockA]);
  const metricsB = useMemo(() => calculateStockMetrics(stockB), [stockB]);

  const comparisonItems = useMemo(() => {
    const perA = metricsA.per ?? 15;
    const perB = metricsB.per ?? 15;
    const pbrA = metricsA.pbr ?? 1.2;
    const pbrB = metricsB.pbr ?? 1.2;
    const divA = metricsA.dividendYield ?? 3.0;
    const divB = metricsB.dividendYield ?? 3.0;
    const roeA = metricsA.roe ?? 10;
    const roeB = metricsB.roe ?? 10;
    const eqA = metricsA.equityRatio ?? 45;
    const eqB = metricsB.equityRatio ?? 45;
    const creditA = metricsA.creditRatio ?? 2.0;
    const creditB = metricsB.creditRatio ?? 2.0;

    return [
      {
        id: "per",
        label: "予想PER (割安度)",
        desc: "利益対比の割安度（低い方が割安）",
        valA: `${perA.toFixed(1)}倍`,
        valB: `${perB.toFixed(1)}倍`,
        rawA: perA,
        rawB: perB,
        winner: perA < perB ? "A" : perA > perB ? "B" : "DRAW",
        weight: 1.5,
      },
      {
        id: "pbr",
        label: "実績PBR (資産価値)",
        desc: "解散価値に対する割安度（低い方が割安）",
        valA: `${pbrA.toFixed(2)}倍`,
        valB: `${pbrB.toFixed(2)}倍`,
        rawA: pbrA,
        rawB: pbrB,
        winner: pbrA < pbrB ? "A" : pbrA > pbrB ? "B" : "DRAW",
        weight: 1.5,
      },
      {
        id: "dividend",
        label: "予想配当利回り",
        desc: "年間のインカム還元力（高い方が有利）",
        valA: `${divA.toFixed(2)}%`,
        valB: `${divB.toFixed(2)}%`,
        rawA: divA,
        rawB: divB,
        winner: divA > divB ? "A" : divA < divB ? "B" : "DRAW",
        weight: 2.0,
      },
      {
        id: "roe",
        label: "ROE (稼ぐ力)",
        desc: "自己資本に対する純利益率（高い方が高収益）",
        valA: `${roeA.toFixed(1)}%`,
        valB: `${roeB.toFixed(1)}%`,
        rawA: roeA,
        rawB: roeB,
        winner: roeA > roeB ? "A" : roeA < roeB ? "B" : "DRAW",
        weight: 2.0,
      },
      {
        id: "equity",
        label: "自己資本比率",
        desc: "財務の安定性・倒産リスクの低さ（高い方が安全）",
        valA: `${eqA.toFixed(1)}%`,
        valB: `${eqB.toFixed(1)}%`,
        rawA: eqA,
        rawB: eqB,
        winner: eqA > eqB ? "A" : eqA < eqB ? "B" : "DRAW",
        weight: 1.0,
      },
      {
        id: "credit",
        label: "信用倍率 (需給の軽さ)",
        desc: "買い残の整理状況（低い方が上値が軽い）",
        valA: `${creditA.toFixed(1)}倍`,
        valB: `${creditB.toFixed(1)}倍`,
        rawA: creditA,
        rawB: creditB,
        winner: creditA < creditB ? "A" : creditA > creditB ? "B" : "DRAW",
        weight: 1.0,
      },
    ];
  }, [metricsA, metricsB]);

  const winsA = comparisonItems.filter((i) => i.winner === "A").length;
  const winsB = comparisonItems.filter((i) => i.winner === "B").length;
  const overallWinner =
    winsA > winsB ? "A" : winsB > winsA ? "B" : "DRAW";

  // ==========================================
  // 2. 売買シナリオ判定の計算ロジック
  // ==========================================
  const baseScenarioStock = useMemo(
    () => resolveStock(scenarioStockCode),
    [scenarioStockCode]
  );
  const { stock: scenarioStock, status: scenarioQuoteStatus } =
    useLiveStockQuote(baseScenarioStock);
  const scenarioReport = useMemo(
    () => generateStockHealthReport(scenarioStock),
    [scenarioStock]
  );
  const scenarioMetrics = useMemo(
    () => calculateStockMetrics(scenarioStock),
    [scenarioStock]
  );

  const calculatedScenario = useMemo(() => {
    const price = scenarioStock.price;

    let targetRate1 = 1.08; // +8%
    let targetRate2 = 1.2; // +20%
    let entryLowRate = 0.98;
    let entryHighRate = 1.01;
    let deepLowRate = 0.94;
    let deepHighRate = 0.97;
    let stopLossRate = 0.93; // -7%

    if (tradeStance === "income") {
      targetRate1 = 1.06; // +6%
      targetRate2 = 1.15; // +15%
      entryLowRate = 0.97;
      entryHighRate = 1.0;
      deepLowRate = 0.92;
      deepHighRate = 0.95;
      stopLossRate = 0.9; // -10%（長期保有で深め許容）
    } else if (tradeStance === "swing") {
      targetRate1 = 1.09; // +9%
      targetRate2 = 1.22; // +22%
      entryLowRate = 0.99;
      entryHighRate = 1.02;
      deepLowRate = 0.95;
      deepHighRate = 0.98;
      stopLossRate = 0.95; // -5%（浅い損切り徹底）
    } else if (tradeStance === "value") {
      targetRate1 = 1.12; // +12%
      targetRate2 = 1.25; // +25%
      entryLowRate = 0.96;
      entryHighRate = 0.99;
      deepLowRate = 0.91;
      deepHighRate = 0.94;
      stopLossRate = 0.92;
    }

    if (riskTolerance === "safe") {
      entryLowRate -= 0.01;
      entryHighRate -= 0.01;
      deepLowRate -= 0.01;
      deepHighRate -= 0.01;
      stopLossRate += 0.01; // より浅く損切り
    } else if (riskTolerance === "aggressive") {
      entryHighRate += 0.01;
      targetRate1 += 0.02;
      targetRate2 += 0.03;
      stopLossRate -= 0.01;
    }

    const entryZone = `¥${Math.round(price * entryLowRate).toLocaleString()} 〜 ¥${Math.round(price * entryHighRate).toLocaleString()}`;
    const deepEntryZone = `¥${Math.round(price * deepLowRate).toLocaleString()} 〜 ¥${Math.round(price * deepHighRate).toLocaleString()}`;
    const targetPrice1 = Math.round(price * targetRate1);
    const targetPrice2 = Math.round(price * targetRate2);
    const stopLossPrice = Math.round(price * stopLossRate);

    const upsidePct = ((targetPrice1 - price) / price) * 100;
    const upsidePct2 = ((targetPrice2 - price) / price) * 100;
    const downsidePct = ((price - stopLossPrice) / price) * 100;
    const riskReward = (upsidePct / Math.max(0.5, downsidePct)).toFixed(1);

    return {
      price,
      entryZone,
      deepEntryZone,
      targetPrice1,
      targetPrice2,
      stopLossPrice,
      upsidePct,
      upsidePct2,
      downsidePct,
      riskReward,
    };
  }, [scenarioStock, tradeStance, riskTolerance]);

  // ==========================================
  // 3. 予算別ポートフォリオの計算ロジック
  // ==========================================
  const portfolioBaseStocks = useMemo(
    () =>
      ["8306", "8058", "9432", "7203", "8035", "6146", "7011", "4502"].map((code) =>
        resolveStock(code)
      ),
    []
  );
  const { stocks: portfolioLiveStocks } = useLiveStockQuotes(portfolioBaseStocks);

  const generatedPortfolio = useMemo(() => {
    const livePriceByCode = new Map(
      portfolioLiveStocks.map((st) => [st.code, st.price])
    );

    // 候補プール（ライブ株価を優先反映）
    const pool = [
      {
        code: "8306",
        name: "三菱UFJ",
        sector: "金融",
        role: "利上げ恩恵・高配当・累進配当",
        dividendYield: 3.8,
        price: livePriceByCode.get("8306") || 1850,
        type: ["dividend", "balanced"],
      },
      {
        code: "8058",
        name: "三菱商事",
        sector: "商社",
        role: "バフェット保有・手元キャッシュ潤沢",
        dividendYield: 3.5,
        price: livePriceByCode.get("8058") || 3150,
        type: ["dividend", "balanced", "growth"],
      },
      {
        code: "9432",
        name: "NTT",
        sector: "通信",
        role: "生活必需・連続増配・ディフェンシブ",
        dividendYield: 3.6,
        price: livePriceByCode.get("9432") || 155,
        type: ["dividend", "balanced"],
      },
      {
        code: "7203",
        name: "トヨタ自動車",
        sector: "自動車",
        role: "世界最高峰の収益力・割安放置",
        dividendYield: 3.1,
        price: livePriceByCode.get("7203") || 2850,
        type: ["balanced", "growth"],
      },
      {
        code: "8035",
        name: "東京エレクトロン",
        sector: "半導体",
        role: "AIデータセンター向け製造装置世界シェア首位",
        dividendYield: 2.2,
        price: livePriceByCode.get("8035") || 24500,
        type: ["growth"],
      },
      {
        code: "6146",
        name: "ディスコ",
        sector: "精密半導体",
        role: "精密加工装置で世界シェア7〜8割独占",
        dividendYield: 1.8,
        price: livePriceByCode.get("6146") || 43000,
        type: ["growth"],
      },
      {
        code: "7011",
        name: "三菱重工",
        sector: "防衛・重工",
        role: "国家予算倍増に伴う国策受注残高拡大",
        dividendYield: 1.9,
        price: livePriceByCode.get("7011") || 2150,
        type: ["growth", "balanced"],
      },
      {
        code: "4502",
        name: "武田薬品",
        sector: "医薬品",
        role: "国内製薬最大手・高配当ディフェンシブ",
        dividendYield: 4.6,
        price: livePriceByCode.get("4502") || 4250,
        type: ["dividend"],
      },
    ];

    const selectedStocks = pool.filter((s) =>
      s.type.includes(portfolioStrategy)
    );

    // 均等または比率配分
    let allocatedStocks = selectedStocks.slice(0, 4);
    if (allocatedStocks.length < 3) {
      allocatedStocks = pool.slice(0, 4);
    }

    const shareWeights = [0.35, 0.3, 0.2, 0.15];
    let totalInvested = 0;
    let totalExpectedDividend = 0;

    const items = allocatedStocks.map((st, idx) => {
      const targetFund = budget * (shareWeights[idx] || 0.2);
      let shares = 0;

      if (allowOddLot) {
        shares = Math.max(1, Math.floor(targetFund / st.price));
      } else {
        const roundShares = Math.floor(targetFund / (st.price * 100)) * 100;
        shares = roundShares > 0 ? roundShares : 100;
      }

      const cost = shares * st.price;
      const annualDiv = Math.round(cost * (st.dividendYield / 100));

      totalInvested += cost;
      totalExpectedDividend += annualDiv;

      return {
        ...st,
        shares,
        cost,
        annualDiv,
      };
    });

    const cashRemaining = Math.max(0, budget - totalInvested);
    const overallYield =
      totalInvested > 0
        ? (totalExpectedDividend / totalInvested) * 100
        : 0;

    return {
      budget,
      items,
      totalInvested,
      cashRemaining,
      totalExpectedDividend,
      overallYield,
    };
  }, [budget, portfolioStrategy, allowOddLot, portfolioLiveStocks]);

  return (
    <div className="space-y-4">
      {/* ========================================================== */}
      {/* セクション 1: 2銘柄ガチンコ比較 (Versus) */}
      {/* ========================================================== */}
      <section id="versus-section" className="rounded border border-border bg-card">
        <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between rounded-t">
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-foreground">2銘柄ガチンコ比較</h2>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-xxs font-bold text-foreground/80 shrink-0">
              ライバル対決
            </span>
          </div>
          <div className="text-xxs text-muted-foreground">
            業績・財務・割安度・配当利回り・テクニカルを5軸スコアで直接対比
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* ライバル対決プリセットバー */}
          <div className="rounded-xl border border-border/70 bg-card p-2.5 sm:p-3.5 shadow-2xs">
            <div className="mb-2 text-xs font-bold text-foreground">
              人気のライバル対決を選ぶ（ワンクリックで即座に対比）
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {rivalPresets.map((rp, idx) => {
                const isSelected =
                  stockA.code === rp.codeA && stockB.code === rp.codeB;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStockCodeA(rp.codeA);
                      setStockCodeB(rp.codeB);
                      window.setTimeout(() => {
                        versusResultRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }, 60);
                    }}
                    className={`flex flex-col items-start rounded-lg border p-1.5 sm:p-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-header-accent bg-header-accent/5 font-bold shadow-2xs"
                        : "border-border/70 bg-background/60 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-xxs font-semibold text-muted-foreground">
                      {rp.category}
                    </span>
                    <span className="truncate w-full text-xs font-bold text-foreground">
                      {rp.nameA} vs {rp.nameB}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 銘柄手動検索・変更バー */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-4 sm:grid-cols-2">
            {/* 銘柄 A 選択 */}
            <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-2 sm:space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-xxs font-bold text-blue-600 dark:text-blue-400">
                  銘柄 A
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  コード: {stockA.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQueryA}
                    onChange={(e) => setSearchQueryA(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQueryA.trim()) {
                        setStockCodeA(searchQueryA.trim());
                        setSearchQueryA("");
                      }
                    }}
                    placeholder="銘柄名またはコード入力（例: 7203）"
                    className="w-full rounded-md border border-border/80 bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-header-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (searchQueryA.trim()) {
                      setStockCodeA(searchQueryA.trim());
                      setSearchQueryA("");
                    }
                  }}
                  className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                >
                  変更
                </button>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <h3 className="font-black text-sm text-foreground">
                    {stockA.name}
                  </h3>
                  <span className="text-xxs text-muted-foreground">
                    {stockA.market}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-xl tabular-nums text-foreground">
                    ¥{stockA.price.toLocaleString()}
                  </div>
                  <span
                    className={`text-xxs font-bold font-mono ${
                      stockA.change >= 0 ? "text-stock-up" : "text-stock-down"
                    }`}
                  >
                    {stockA.change >= 0 ? "+" : ""}
                    {stockA.change}円 ({stockA.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 銘柄 B 選択 */}
            <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-2 sm:space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xxs font-bold text-amber-600 dark:text-amber-400">
                  銘柄 B
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  コード: {stockB.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQueryB}
                    onChange={(e) => setSearchQueryB(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQueryB.trim()) {
                        setStockCodeB(searchQueryB.trim());
                        setSearchQueryB("");
                      }
                    }}
                    placeholder="銘柄名またはコード入力（例: 7267）"
                    className="w-full rounded-md border border-border/80 bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-header-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (searchQueryB.trim()) {
                      setStockCodeB(searchQueryB.trim());
                      setSearchQueryB("");
                    }
                  }}
                  className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                >
                  変更
                </button>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <h3 className="font-black text-sm text-foreground">
                    {stockB.name}
                  </h3>
                  <span className="text-xxs text-muted-foreground">
                    {stockB.market}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-xl tabular-nums text-foreground">
                    ¥{stockB.price.toLocaleString()}
                  </div>
                  <span
                    className={`text-xxs font-bold font-mono ${
                      stockB.change >= 0 ? "text-stock-up" : "text-stock-down"
                    }`}
                  >
                    {stockB.change >= 0 ? "+" : ""}
                    {stockB.change}円 ({stockB.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 総合判定勝敗バナー */}
          <div
            ref={versusResultRef}
            className={`scroll-mt-14 rounded-xl border p-3 sm:p-4 shadow-xs transition-colors ${
              overallWinner === "A"
                ? "border-blue-500/30 bg-blue-500/5"
                : overallWinner === "B"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border/80 bg-card"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award
                    className={`h-5 w-5 ${
                      overallWinner === "A"
                        ? "text-blue-500"
                        : overallWinner === "B"
                        ? "text-amber-500"
                        : "text-header-accent"
                    }`}
                  />
                  <span className="font-black text-base sm:text-lg text-foreground">
                    総合対決判定:{" "}
                    {overallWinner === "A" ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        【{stockA.name}】が優位（{winsA}勝 {winsB}敗）
                      </span>
                    ) : overallWinner === "B" ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        【{stockB.name}】が優位（{winsB}勝 {winsA}敗）
                      </span>
                    ) : (
                      <span className="text-foreground">
                        【互角・引き分け】（{winsA}勝 {winsB}敗）
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {overallWinner === "A"
                    ? `${stockA.name}はROE（稼ぐ力）や配当還元、割安性の総合バランスでリードしています。安定したリターンを狙うなら優先エントリー候補です。`
                    : overallWinner === "B"
                    ? `${stockB.name}が主要指標で上回っており、バリュエーションまたは収益効率の面で優位性が確認されます。`
                    : "両銘柄とも主要指標が拮抗しており、配当利回りを取るか成長性を取るかの投資方針によって選択が分かれます。"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/advisor?tab=health&code=${stockA.code}`}
                  className="rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  {stockA.name}のカルテ
                </Link>
                <Link
                  to={`/advisor?tab=health&code=${stockB.code}`}
                  className="rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  {stockB.name}のカルテ
                </Link>
              </div>
            </div>
          </div>

          {/* ガチンコ項目別対決グリッド */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="grid grid-cols-12 border-b border-border/80 bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
              <div className="col-span-4 sm:col-span-3">比較指標</div>
              <div className="col-span-4 text-center sm:col-span-4 text-blue-600 dark:text-blue-400">
                {stockA.name}
              </div>
              <div className="col-span-4 text-center sm:col-span-4 text-amber-600 dark:text-amber-400">
                {stockB.name}
              </div>
              <div className="hidden sm:col-span-1 sm:block text-right">判定</div>
            </div>

            <div className="divide-y divide-border/60">
              {comparisonItems.map((item) => {
                const isWinA = item.winner === "A";
                const isWinB = item.winner === "B";
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center p-3 text-xs hover:bg-muted/20 transition-colors"
                  >
                    <div className="col-span-4 sm:col-span-3 space-y-0.5">
                      <div className="font-bold text-foreground">
                        {item.label}
                      </div>
                      <div className="text-xxs text-muted-foreground hidden sm:block">
                        {item.desc}
                      </div>
                    </div>

                    <div className="col-span-4 text-center font-mono font-bold sm:col-span-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                          isWinA
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30"
                            : "text-foreground"
                        }`}
                      >
                        {item.valA}
                        {isWinA && (
                          <span className="text-xxs font-black text-blue-600 dark:text-blue-400">
                            WIN
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="col-span-4 text-center font-mono font-bold sm:col-span-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                          isWinB
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                            : "text-foreground"
                        }`}
                      >
                        {item.valB}
                        {isWinB && (
                          <span className="text-xxs font-black text-amber-600 dark:text-amber-400">
                            WIN
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="hidden sm:col-span-1 sm:block text-right font-bold text-xxs">
                      {isWinA ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          A勝利
                        </span>
                      ) : isWinB ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          B勝利
                        </span>
                      ) : (
                        <span className="text-muted-foreground">同水準</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* セクション 2: 売買シナリオ判定機 (Scenario) */}
      {/* ========================================================== */}
      <section id="scenario-section" className="rounded border border-border bg-card">
        <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between rounded-t">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-foreground" />
            <h2 className="text-xs sm:text-sm font-bold text-foreground">売買シナリオ判定</h2>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-xxs font-bold text-foreground/80 shrink-0">
              売買シミュレーション
            </span>
          </div>
          <div className="text-xxs text-muted-foreground">
            ターゲット銘柄の買い場・押し目・目標株価・リスク管理価格を自動算出
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* 銘柄選択・検索バー */}
          <div className="rounded border border-border bg-card p-3.5 space-y-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <span className="text-xxs font-bold text-muted-foreground">
                  診断対象の銘柄
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-foreground">
                    {scenarioStock.name} ({scenarioStock.code})
                  </h3>
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    ¥{scenarioStock.price.toLocaleString()}
                  </span>
                  {scenarioQuoteStatus === "live" && (
                    <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      最新値
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleWatchlist(scenarioStock)}
                    className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded border px-2 text-[10px] font-bold transition-colors ${
                      watchlistCodes.includes(scenarioStock.code)
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {watchlistCodes.includes(scenarioStock.code) ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>チャート監視中</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        <span>チャート監視に追加</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 検索入力 */}
              <div className="flex w-full sm:w-auto items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={scenarioSearchQuery}
                    onChange={(e) => setScenarioSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && scenarioSearchQuery.trim()) {
                        setScenarioStockCode(scenarioSearchQuery.trim());
                        setScenarioSearchQuery("");
                      }
                    }}
                    placeholder="銘柄名またはコード"
                    className="w-full rounded-md border border-border/80 bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (scenarioSearchQuery.trim()) {
                      setScenarioStockCode(scenarioSearchQuery.trim());
                      setScenarioSearchQuery("");
                    }
                  }}
                  className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                >
                  検索
                </button>
              </div>
            </div>

            {/* クイック銘柄チップ */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xxs text-muted-foreground font-semibold">
                代表銘柄:
              </span>
              {[
                { code: "7203", name: "トヨタ" },
                { code: "8306", name: "三菱UFJ" },
                { code: "8058", name: "三菱商事" },
                { code: "7974", name: "任天堂" },
                { code: "8035", name: "東エレク" },
                { code: "7011", name: "三菱重工" },
                { code: "9432", name: "NTT" },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setScenarioStockCode(item.code)}
                  className={`rounded-md border px-2 py-0.5 text-xxs font-semibold transition-colors ${
                    scenarioStock.code === item.code
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                      : "border-border/70 bg-background text-foreground/80 hover:bg-muted"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* 投資パラメータ選択フォーム（スタンス ＆ リスク許容度） */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 投資スタンス */}
            <div className="rounded border border-border bg-card p-3.5 space-y-2">
              <span className="text-xs font-bold text-foreground block">
                1. 投資スタンスを選ぶ
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "income",
                    label: "配当インカム",
                    desc: "長期保有・増配狙い",
                  },
                  {
                    id: "swing",
                    label: "スイング",
                    desc: "数週間の値幅狙い",
                  },
                  {
                    id: "value",
                    label: "バリュー逆張り",
                    desc: "売られすぎ反発狙い",
                  },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      setTradeStance(st.id as "income" | "swing" | "value")
                    }
                    className={`flex flex-col items-start rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      tradeStance === st.id
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="font-bold text-foreground">
                      {st.label}
                    </span>
                    <span className="text-xxs text-muted-foreground">
                      {st.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* リスク許容度 */}
            <div className="rounded border border-border bg-card p-3.5 space-y-2">
              <span className="text-xs font-bold text-foreground block">
                2. リスク許容度を選ぶ
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "safe",
                    label: "手堅く安全重視",
                    desc: "浅い損切り・深い押し目",
                  },
                  {
                    id: "balanced",
                    label: "標準バランス",
                    desc: "勝率と値幅の最適化",
                  },
                  {
                    id: "aggressive",
                    label: "積極エントリー",
                    desc: "打診買い厚め・上値追求",
                  },
                ].map((rk) => (
                  <button
                    key={rk.id}
                    type="button"
                    onClick={() =>
                      setRiskTolerance(
                        rk.id as "safe" | "balanced" | "aggressive"
                      )
                    }
                    className={`flex flex-col items-start rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      riskTolerance === rk.id
                        ? "border-emerald-500 bg-emerald-500/10 font-bold"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="font-bold text-foreground">
                      {rk.label}
                    </span>
                    <span className="text-xxs text-muted-foreground">
                      {rk.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 自動算出された売買シナリオカード */}
          <div className="rounded border border-border bg-card p-3.5 space-y-4">
            <div className="flex flex-col justify-between gap-2 border-b border-border/70 pb-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xxs font-black text-blue-600 dark:text-blue-400">
                  プロ判定:「{scenarioReport?.verdict ?? "押し目買い好機"}」
                </span>
                <span className="text-xs text-muted-foreground">
                  リスクリワード比率:{" "}
                  <strong className="font-mono text-foreground">
                    1 : {calculatedScenario.riskReward}
                  </strong>{" "}
                  (良好)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xxs text-muted-foreground font-semibold">
                <span>現在値: ¥{calculatedScenario.price.toLocaleString()}</span>
                <span>•</span>
                <span>
                  PER: {scenarioMetrics.per?.toFixed(1) ?? "14"}倍 / PBR:{" "}
                  {scenarioMetrics.pbr?.toFixed(2) ?? "1.1"}倍
                </span>
              </div>
            </div>

            {/* 視覚的プライス階層ラダー */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
              {/* 第2目標株価 */}
              <div className="rounded-lg border border-border border-t-2 border-t-primary bg-background p-3 text-center space-y-1">
                <span className="text-xxs font-bold text-primary">
                  第2目標 (大波利確)
                </span>
                <div className="font-mono font-black text-lg tabular-nums text-foreground">
                  ¥{calculatedScenario.targetPrice2.toLocaleString()}
                </div>
                <span className="text-xs text-stock-up font-bold">
                  想定 +{calculatedScenario.upsidePct2.toFixed(1)}%
                </span>
              </div>

              {/* 第1目標株価 */}
              <div className="rounded-lg border border-border border-t-2 border-t-primary/70 bg-background p-3 text-center space-y-1">
                <span className="text-xxs font-bold text-primary">
                  第1目標 (直近高値)
                </span>
                <div className="font-mono font-black text-lg tabular-nums text-foreground">
                  ¥{calculatedScenario.targetPrice1.toLocaleString()}
                </div>
                <span className="text-xs text-stock-up font-bold">
                  想定 +{calculatedScenario.upsidePct.toFixed(1)}%
                </span>
              </div>

              {/* 打診買いゾーン */}
              <div className="rounded-lg border border-border bg-muted/25 p-3 text-center space-y-1">
                <span className="text-xxs font-bold text-foreground">
                  打診買いゾーン (30%)
                </span>
                <div className="font-mono font-black text-sm sm:text-base tabular-nums text-foreground">
                  {calculatedScenario.entryZone}
                </div>
                <span className="text-xxs text-muted-foreground">
                  現在値付近で分割買い
                </span>
              </div>

              {/* 本命押し目ゾーン */}
              <div className="rounded-lg border border-border bg-muted/25 p-3 text-center space-y-1">
                <span className="text-xxs font-bold text-foreground">
                  本命押し目ゾーン (70%)
                </span>
                <div className="font-mono font-black text-sm sm:text-base tabular-nums text-foreground">
                  {calculatedScenario.deepEntryZone}
                </div>
                <span className="text-xxs text-muted-foreground">
                  下値指値で待機
                </span>
              </div>

              {/* 損切りライン */}
              <div className="rounded-lg border border-border border-t-2 border-t-stock-down bg-background p-3 text-center space-y-1">
                <span className="text-xxs font-bold text-stock-down">
                  撤退・損切りライン
                </span>
                <div className="font-mono font-black text-lg tabular-nums text-foreground">
                  ¥{calculatedScenario.stopLossPrice.toLocaleString()} 割れ
                </div>
                <span className="text-xs text-stock-down font-bold">
                  最大 -{calculatedScenario.downsidePct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 戦略アドバイス所見 */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3.5 space-y-2 text-xs">
              <div className="font-bold text-foreground">
                プロの執行アドバイス
              </div>
              <p className="text-muted-foreground leading-relaxed">
                全額を一括購入せず、まず資金の30%を{" "}
                <strong className="text-foreground">
                  {calculatedScenario.entryZone}
                </strong>{" "}
                で打診買い。残りの70%は調整時の{" "}
                <strong className="text-foreground">
                  {calculatedScenario.deepEntryZone}
                </strong>{" "}
                に指値を入れておくことで、相場全体の急落リスクを回避しながら期待値の高い平均取得単価を作れます。
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50 text-xxs text-muted-foreground">
                <span>
                  事業概況: {scenarioReport?.shikihoSummary}
                </span>
              </div>
            </div>

            {/* カルテ・チャートへの遷移CTA */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Link
                to={`/chart?code=${scenarioStock.code}`}
                className="inline-flex items-center rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                チャートで節目を確認
              </Link>
              <Link
                to={`/advisor?tab=health&code=${scenarioStock.code}`}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                銘柄カルテで5軸詳細を見る
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* セクション 3: 予算別ポートフォリオ自動生成 (Portfolio) */}
      {/* ========================================================== */}
      <section id="portfolio-section" className="rounded border border-border bg-card">
        <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between rounded-t">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-foreground" />
            <h2 className="text-xs sm:text-sm font-bold text-foreground">予算別ポートフォリオ</h2>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-xxs font-bold text-foreground/80 shrink-0">
              新NISA対応
            </span>
          </div>
          <div className="text-xxs text-muted-foreground">
            予算に応じた最適銘柄の組み合わせ・配当期待額・資産分散プラン
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* パラメータ設定カード */}
          <div className="rounded border border-border bg-card p-3.5 space-y-4">
            {/* 予算選択 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">
                  1. 投資予算を選択
                </span>
                <span className="font-mono text-lg font-black tabular-nums text-primary">
                  ¥{budget.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[100_000, 300_000, 500_000, 1_000_000, 2_000_000, 3_000_000].map(
                  (b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudget(b)}
                      className={`rounded-lg border py-2 text-center text-xs font-bold transition-colors ${
                        budget === b
                          ? "border-primary bg-primary text-primary-foreground font-black shadow-2xs"
                          : "border-border/70 bg-background text-foreground/80 hover:bg-muted"
                      }`}
                    >
                      {b >= 1_000_000 ? `${b / 1_000_000}00万円` : `${b / 10_000}万円`}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 運用方針 & 単元設定 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  2. 運用方針・テーマ
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "dividend", label: "高配当・インカム" },
                    { id: "balanced", label: "安定バランス" },
                    { id: "growth", label: "高成長キャピタル" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setPortfolioStrategy(
                          p.id as "dividend" | "growth" | "balanced"
                        )
                      }
                      className={`rounded-md border p-2 text-center text-xs font-semibold transition-colors ${
                        portfolioStrategy === p.id
                          ? "border-primary bg-primary/10 font-bold text-primary"
                          : "border-border/70 bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  3. 購入方式
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAllowOddLot(true)}
                    className={`flex-1 rounded-md border p-2 text-center text-xs font-semibold ${
                      allowOddLot
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    1株投資（単元未満株・少額分散）
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowOddLot(false)}
                    className={`flex-1 rounded-md border p-2 text-center text-xs font-semibold ${
                      !allowOddLot
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    100株単位（単元株）
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 生成されたポートフォリオ結果 */}
          <div className="rounded border border-border bg-card p-3.5 space-y-4">
            {/* KPIサマリー */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center space-y-0.5">
                <span className="text-xxs font-semibold text-muted-foreground">
                  想定投資総額
                </span>
                <div className="font-mono font-black text-xl sm:text-2xl tabular-nums text-foreground">
                  ¥{generatedPortfolio.totalInvested.toLocaleString()}
                </div>
                <span className="text-xxs text-muted-foreground">
                  残余現金: ¥{generatedPortfolio.cashRemaining.toLocaleString()}
                </span>
              </div>

              <div className="rounded-lg border border-border border-t-2 border-t-primary bg-background p-3 text-center space-y-0.5">
                <span className="text-xxs font-bold text-muted-foreground">
                  年間予想配当金
                </span>
                <div className="font-mono font-black text-xl sm:text-2xl tabular-nums text-primary">
                  ¥{generatedPortfolio.totalExpectedDividend.toLocaleString()}
                  <span className="text-xs font-bold"> /年</span>
                </div>
                <span className="text-xxs text-muted-foreground">
                  税引前受取額
                </span>
              </div>

              <div className="rounded-lg border border-border border-t-2 border-t-primary bg-background p-3 text-center space-y-0.5">
                <span className="text-xxs font-bold text-muted-foreground">
                  ポートフォリオ総合利回り
                </span>
                <div className="font-mono font-black text-xl sm:text-2xl tabular-nums text-primary">
                  {generatedPortfolio.overallYield.toFixed(2)}%
                </div>
                <span className="text-xxs text-muted-foreground">加重平均</span>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center space-y-0.5">
                <span className="text-xxs font-semibold text-muted-foreground">
                  銘柄分散
                </span>
                <div className="font-mono font-black text-xl sm:text-2xl tabular-nums text-foreground">
                  {generatedPortfolio.items.length} 銘柄
                </div>
                <span className="text-xxs text-muted-foreground font-semibold">
                  セクター分散最適化済
                </span>
              </div>
            </div>

            {/* 銘柄一覧テーブル */}
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <div className="grid grid-cols-12 items-center gap-1 border-b border-border/80 bg-muted/40 px-2.5 py-2 text-[11px] font-bold text-muted-foreground sm:p-2.5 sm:text-xs">
                <div className="col-span-6 whitespace-nowrap sm:col-span-4">
                  <span className="sm:hidden">組み入れ銘柄</span>
                  <span className="hidden sm:inline">組み入れ銘柄・セクター</span>
                </div>
                <div className="col-span-2 whitespace-nowrap text-right sm:col-span-2">株数</div>
                <div className="col-span-4 whitespace-nowrap text-right sm:col-span-2">想定投資額</div>
                <div className="hidden whitespace-nowrap text-right sm:col-span-2 sm:block">配当利回り</div>
                <div className="hidden whitespace-nowrap text-right sm:col-span-2 sm:block">年間予想配当</div>
              </div>

              <div className="divide-y divide-border/60">
                {generatedPortfolio.items.map((it) => (
                  <div
                    key={it.code}
                    className="grid grid-cols-12 items-center gap-1 px-2.5 py-2.5 text-xs hover:bg-muted/20 sm:p-3"
                  >
                    <div className="col-span-6 min-w-0 space-y-0.5 sm:col-span-4">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-bold text-foreground">
                        <Link
                          to={`/advisor?tab=health&code=${it.code}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap hover:underline"
                        >
                          <span>{it.name}</span>
                          <span className="font-mono text-xxs font-normal text-muted-foreground">
                            ({it.code})
                          </span>
                        </Link>
                        <span className="shrink-0 whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
                          {it.sector}
                        </span>
                      </div>
                      <div className="truncate text-xxs text-muted-foreground">
                        {it.role}
                      </div>
                    </div>

                    <div className="col-span-2 whitespace-nowrap text-right font-mono text-[11px] font-bold tabular-nums text-foreground sm:col-span-2 sm:text-xs">
                      {it.shares.toLocaleString()}株
                    </div>

                    <div className="col-span-4 whitespace-nowrap text-right font-mono text-[11px] font-bold tabular-nums text-foreground sm:col-span-2 sm:text-xs">
                      ¥{it.cost.toLocaleString()}
                    </div>

                    <div className="hidden whitespace-nowrap text-right font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 sm:col-span-2 sm:block">
                      {it.dividendYield.toFixed(2)}%
                    </div>

                    <div className="hidden whitespace-nowrap text-right font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 sm:col-span-2 sm:block">
                      ¥{it.annualDiv.toLocaleString()}/年
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 新NISA活用ワンポイント */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-1 text-xs">
              <span className="font-bold text-foreground block">
                新NISA（成長投資枠）での実践ポイント
              </span>
              <p className="text-xxs text-muted-foreground leading-relaxed">
                上記の組み合わせは、新NISAの成長投資枠（年間240万円上限）でそのまま非課税保有が可能です。通常引かれる約20.315%の税金がゼロになるため、年間配当金
                <strong className="text-foreground">
                  ¥{generatedPortfolio.totalExpectedDividend.toLocaleString()}
                </strong>
                をそのまま手取りとして受け取り、複利で再投資できます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* セクション 4: 3分スタイル診断 (Style Wizard) */}
      {/* ========================================================== */}
      <section id="wizard-section" className="rounded border border-border bg-card">
        <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between rounded-t">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-foreground" />
            <h2 className="text-xs sm:text-sm font-bold text-foreground">3分スタイル診断</h2>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-xxs font-bold text-foreground/80 shrink-0">
              簡単マッチング
            </span>
          </div>
          <div className="text-xxs text-muted-foreground">
            投資期間・リスク許容度・目的から最適な投資スタイルと厳選銘柄を診断
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <StyleMatchWizard
            embedded={true}
            onSelectStockForHealthCheck={onInspectStockInHealthCheck}
          />
        </div>
      </section>
    </div>
  );
};
