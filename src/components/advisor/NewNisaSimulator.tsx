import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  PiggyBank,
  RotateCcw,
  Sparkles,
  Table2,
  Target,
} from "lucide-react";
import {
  NISA_CONSTANTS,
  NISA_PRESETS,
  type NisaSimulationInput,
  reverseCalculateMonthlyForTarget,
  reverseCalculatePrincipalForMonthlyDividend,
  simulateNewNisa,
} from "@/lib/nisaSimulator";

const formatManYen = (value: number, decimals = 0): string => {
  if (!Number.isFinite(value)) return "0万円";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10000) {
    const oku = Math.floor(abs / 10000);
    const remMan = Math.round(abs % 10000);
    return remMan > 0
      ? `${sign}${oku}億${remMan.toLocaleString("ja-JP")}万円`
      : `${sign}${oku}億円`;
  }
  return `${sign}${abs.toLocaleString("ja-JP", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}万円`;
};

const formatAxisMan = (value: number): string => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}億`;
  }
  return `${Math.round(value).toLocaleString("ja-JP")}万`;
};

const formatMonthsToYears = (months: number | null): string => {
  if (months === null) return "期間内未到達";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y}年で到達`;
  if (y === 0) return `${m}ヶ月で到達`;
  return `${y}年${m}ヶ月で到達`;
};

const TARGET_ASSET_PRESETS = [500, 1000, 2000, 3000, 5000, 10000];
const TARGET_DIVIDEND_PRESETS = [3, 5, 10, 15, 20];
const NISA_STORAGE_KEY = "stock-scout-nisa-simulator-v1";

const loadSavedNisaInput = (): { input: NisaSimulationInput; presetId: string | null } => {
  if (typeof window === "undefined") {
    return { input: NISA_PRESETS[0].input, presetId: NISA_PRESETS[0].id };
  }
  try {
    const raw = localStorage.getItem(NISA_STORAGE_KEY);
    if (!raw) return { input: NISA_PRESETS[0].input, presetId: NISA_PRESETS[0].id };
    const parsed = JSON.parse(raw) as Partial<NisaSimulationInput> & { _presetId?: string | null };
    const base = NISA_PRESETS[0].input;
    const restored: NisaSimulationInput = {
      tsumitateMonthly: Number.isFinite(parsed.tsumitateMonthly) ? Number(parsed.tsumitateMonthly) : base.tsumitateMonthly,
      growthMonthly: Number.isFinite(parsed.growthMonthly) ? Number(parsed.growthMonthly) : base.growthMonthly,
      growthAnnualBonus: Number.isFinite(parsed.growthAnnualBonus) ? Number(parsed.growthAnnualBonus) : base.growthAnnualBonus,
      years: Number.isFinite(parsed.years) ? Number(parsed.years) : base.years,
      tsumitateReturnPct: Number.isFinite(parsed.tsumitateReturnPct) ? Number(parsed.tsumitateReturnPct) : base.tsumitateReturnPct,
      growthCapitalReturnPct: Number.isFinite(parsed.growthCapitalReturnPct) ? Number(parsed.growthCapitalReturnPct) : base.growthCapitalReturnPct,
      growthDividendYieldPct: Number.isFinite(parsed.growthDividendYieldPct) ? Number(parsed.growthDividendYieldPct) : base.growthDividendYieldPct,
      growthDividendGrowthPct: Number.isFinite(parsed.growthDividendGrowthPct) ? Number(parsed.growthDividendGrowthPct) : base.growthDividendGrowthPct,
      dividendMode: parsed.dividendMode === "receive" ? "receive" : "reinvest",
      postLimitBehavior: parsed.postLimitBehavior === "taxable" ? "taxable" : "hold",
    };
    return { input: restored, presetId: typeof parsed._presetId === "string" ? parsed._presetId : null };
  } catch {
    return { input: NISA_PRESETS[0].input, presetId: NISA_PRESETS[0].id };
  }
};

// 各切り替えボタン共通（角丸四角＋淡いティント選択カラー）
const toggleButtonClass = (isActive: boolean) =>
  `inline-flex items-center justify-center gap-1 whitespace-nowrap rounded border px-2.5 text-xxs transition-colors ${
    isActive
      ? "border-primary/60 bg-primary/10 font-bold text-primary"
      : "border-border bg-background font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;

// 目標プリセット用（ピル形状＋淡いティント選択カラー）
const presetChipClass = (isActive: boolean) =>
  `inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xxs transition-colors ${
    isActive
      ? "border-primary/60 bg-primary/10 font-bold text-primary"
      : "border-border bg-background font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;

export const NewNisaSimulator = () => {
  const initialSaved = useMemo(() => loadSavedNisaInput(), []);
  const [input, setInput] = useState<NisaSimulationInput>(initialSaved.input);
  const [activePresetId, setActivePresetId] = useState<string | null>(initialSaved.presetId);
  const [inputMode, setInputMode] = useState<"direct" | "reverse">("direct");
  const [chartTab, setChartTab] = useState<"assets" | "dividends">("assets");
  const [reverseTab, setReverseTab] = useState<"asset" | "dividend">("asset");
  const [showAllYears, setShowAllYears] = useState<boolean>(false);

  // 入力条件を自動保存（リロード時も前回の試算条件を維持）
  useEffect(() => {
    try {
      localStorage.setItem(
        NISA_STORAGE_KEY,
        JSON.stringify({ ...input, _presetId: activePresetId })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [input, activePresetId]);

  const handleResetDefault = () => {
    setActivePresetId(NISA_PRESETS[0].id);
    setInput(NISA_PRESETS[0].input);
    setInputMode("direct");
  };

  // 逆算用ステート
  const [targetAssetMan, setTargetAssetMan] = useState<number>(3000);
  const [targetYears, setTargetYears] = useState<number>(20);
  const [targetReturnPct, setTargetReturnPct] = useState<number>(5.0);

  const [targetMonthlyDivMan, setTargetMonthlyDivMan] = useState<number>(5);
  const [targetDivYieldPct, setTargetDivYieldPct] = useState<number>(4.0);

  const updateField = <K extends keyof NisaSimulationInput>(
    key: K,
    value: NisaSimulationInput[K]
  ) => {
    setActivePresetId(null);
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectPreset = (presetId: string) => {
    const found = NISA_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setInput(found.input);
    setInputMode("direct");
  };

  const result = useMemo(() => simulateNewNisa(input), [input]);
  const { finalRow } = result;

  const annualTsumitateDesired = input.tsumitateMonthly * 12;
  const annualGrowthDesired = input.growthMonthly * 12 + input.growthAnnualBonus;
  const annualTotalDesired = annualTsumitateDesired + annualGrowthDesired;
  const isGrowthAnnualOver = annualGrowthDesired > NISA_CONSTANTS.ANNUAL_GROWTH_LIMIT;

  const nisaUsagePct = Math.min(
    100,
    (finalRow.nisaPrincipal / NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT) * 100
  );
  const tsumitateSharePct = Math.min(
    100,
    (finalRow.tsumitatePrincipal / NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT) * 100
  );
  const growthSharePct = Math.min(
    100 - tsumitateSharePct,
    (finalRow.growthPrincipal / NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT) * 100
  );

  const reverseAssetResult = useMemo(
    () => reverseCalculateMonthlyForTarget(targetAssetMan, targetYears, targetReturnPct),
    [targetAssetMan, targetYears, targetReturnPct]
  );

  const reverseDivResult = useMemo(
    () => reverseCalculatePrincipalForMonthlyDividend(targetMonthlyDivMan, targetDivYieldPct),
    [targetMonthlyDivMan, targetDivYieldPct]
  );

  const applyReverseAssetToSimulator = () => {
    const monthly = reverseAssetResult.requiredMonthly;
    const tsumitate = Math.min(10, monthly);
    const growth = Math.max(0, Number((monthly - tsumitate).toFixed(1)));
    setActivePresetId(null);
    setInput((prev) => ({
      ...prev,
      tsumitateMonthly: tsumitate,
      growthMonthly: Math.min(20, growth),
      growthAnnualBonus: 0,
      years: targetYears,
      tsumitateReturnPct: targetReturnPct,
      growthCapitalReturnPct: Math.max(0, Number((targetReturnPct - prev.growthDividendYieldPct).toFixed(1))),
      postLimitBehavior: reverseAssetResult.withinNisaLifetimeLimit ? "hold" : "taxable",
    }));
    setInputMode("direct");
  };

  const applyReverseDividendToSimulator = () => {
    setActivePresetId(null);
    setInput((prev) => ({
      ...prev,
      growthMonthly: Math.max(prev.growthMonthly, 10),
      growthDividendYieldPct: targetDivYieldPct,
      dividendMode: "receive",
    }));
    setInputMode("direct");
    setChartTab("dividends");
  };

  const chartData = useMemo(
    () =>
      result.rows.map((r) => ({
        year: `${r.year}年`,
        totalAsset: Number(r.totalAsset.toFixed(1)),
        allTaxableNetAsset: Number(r.allTaxableNetAsset.toFixed(1)),
        totalPrincipal: Number(r.totalPrincipal.toFixed(1)),
        annualDividend: Number(r.annualDividend.toFixed(2)),
        monthlyDividend: Number(r.monthlyDividend.toFixed(2)),
      })),
    [result.rows]
  );

  const displayedRows = useMemo(() => {
    if (showAllYears || result.rows.length <= 10) return result.rows;
    return result.rows.filter(
      (r, idx) => r.year === 1 || r.year % 5 === 0 || idx === result.rows.length - 1
    );
  }, [result.rows, showAllYears]);

  const totalGain = finalRow.totalAsset - finalRow.totalPrincipal;

  return (
    <div className="min-w-0">
      {/* 上部バー: タイトル＋モデルケース（塗りボタン） */}
      <div className="border-b border-border bg-table-header-bg px-3 py-2.5 sm:px-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <PiggyBank className="h-4 w-4 shrink-0 text-primary" />
              新NISA 生涯枠シミュレーター
            </h2>
            <span className="whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-xxs font-semibold text-foreground/80">
              生涯1,800万 / 成長1,200万
            </span>
          </div>
          <span className="text-xxs text-muted-foreground">
            特定口座（20.315%課税）との節税差額・高配当増配・目標逆算を一括試算
          </span>
        </div>

        {/* モデルケース: 塗りボタン */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2">
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xxs font-bold text-muted-foreground mr-0.5">
            <Sparkles className="h-3 w-3 text-primary" />
            モデルケース:
          </span>
          {NISA_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xxs font-bold transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <span>{preset.label}</span>
                <span className={isSelected ? "text-[10px] opacity-85" : "text-[10px] text-muted-foreground"}>
                  ({preset.badge})
                </span>
              </button>
            );
          })}
              <span className="text-xxs text-muted-foreground">
                ※ 条件は自動保存されます
              </span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="ml-auto inline-flex h-7 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2 text-xxs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="初期条件（王道インデックス）に戻す"
              >
                <RotateCcw className="h-3 w-3" />
                <span>リセット</span>
              </button>
            </div>
          </div>

      {/* メインコンテンツ領域 */}
      <div className="space-y-4 p-3 sm:p-4">
        {/* 第1エリア: 左=条件入力＆目標逆算 / 右=結果（KPI→グラフ→枠進捗） */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* 左カラム: 積立条件 & 目標からの逆算を統合 */}
          <section className="lg:col-span-4 min-w-0 rounded border border-border bg-card">
            {/* 左パネルのモード切替ヘッダー（積立額から試算 / 目標から逆算） */}
            <div className="space-y-2 border-b border-border px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  {inputMode === "direct" ? (
                    <>
                      <Calculator className="h-3.5 w-3.5 text-primary" />
                      積立・運用条件
                    </>
                  ) : (
                    <>
                      <Target className="h-3.5 w-3.5 text-primary" />
                      目標からの逆算
                    </>
                  )}
                </h3>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground whitespace-nowrap">
                  年間 {formatManYen(annualTotalDesired, 0)} / 360万
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputMode("direct")}
                  className={`h-7 ${toggleButtonClass(inputMode === "direct")}`}
                >
                  <Calculator className="h-3 w-3 shrink-0" />
                  <span>積立額から試算</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("reverse")}
                  className={`h-7 ${toggleButtonClass(inputMode === "reverse")}`}
                >
                  <Target className="h-3 w-3 shrink-0" />
                  <span>目標から逆算</span>
                </button>
              </div>
            </div>

            {inputMode === "direct" ? (
              <div className="divide-y divide-border/70">
                {/* グループ1: 積立額と期間 */}
                <div className="space-y-3 p-3">
                  <div className="text-[11px] font-bold text-muted-foreground">1. 毎月の積立・期間</div>

                  {/* つみたて投資枠 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <label htmlFor="nisa-tsumitate" className="font-medium text-foreground">
                        つみたて投資枠（月額）
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          id="nisa-tsumitate"
                          type="number"
                          min={0}
                          max={10}
                          step={0.5}
                          value={input.tsumitateMonthly}
                          onChange={(e) =>
                            updateField("tsumitateMonthly", Math.max(0, Math.min(10, Number(e.target.value) || 0)))
                          }
                          className="h-7 w-16 rounded border border-border bg-background px-2 text-right text-xs font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xxs text-muted-foreground">万円</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={input.tsumitateMonthly}
                      onChange={(e) => updateField("tsumitateMonthly", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                      <span>0万</span>
                      <span>年計 {annualTsumitateDesired.toFixed(0)}万 / 上限120万</span>
                      <span>10万</span>
                    </div>
                  </div>

                  {/* 成長投資枠（月額） */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <label htmlFor="nisa-growth-monthly" className="font-medium text-foreground">
                        成長投資枠（月額）
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          id="nisa-growth-monthly"
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          value={input.growthMonthly}
                          onChange={(e) =>
                            updateField("growthMonthly", Math.max(0, Math.min(20, Number(e.target.value) || 0)))
                          }
                          className="h-7 w-16 rounded border border-border bg-background px-2 text-right text-xs font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xxs text-muted-foreground">万円</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.5}
                      value={input.growthMonthly}
                      onChange={(e) => updateField("growthMonthly", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                  </div>

                  {/* 成長投資枠（ボーナス・一括年額） */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <label htmlFor="nisa-growth-bonus" className="font-medium text-foreground">
                        成長枠 ボーナス（年額）
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          id="nisa-growth-bonus"
                          type="number"
                          min={0}
                          max={240}
                          step={10}
                          value={input.growthAnnualBonus}
                          onChange={(e) =>
                            updateField("growthAnnualBonus", Math.max(0, Math.min(240, Number(e.target.value) || 0)))
                          }
                          className="h-7 w-16 rounded border border-border bg-background px-2 text-right text-xs font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xxs text-muted-foreground">万円</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={240}
                      step={10}
                      value={input.growthAnnualBonus}
                      onChange={(e) => updateField("growthAnnualBonus", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] tabular-nums">
                      <span className="text-muted-foreground">成長枠年計: {annualGrowthDesired.toFixed(0)}万 / 上限240万</span>
                      {isGrowthAnnualOver && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          上限超過を自動制御
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 運用年数 */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="nisa-years" className="font-medium text-foreground">
                        運用期間
                      </label>
                      <span className="text-xs font-bold tabular-nums text-foreground">{input.years}年間</span>
                    </div>
                    <input
                      id="nisa-years"
                      type="range"
                      min={1}
                      max={40}
                      step={1}
                      value={input.years}
                      onChange={(e) => updateField("years", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                      <span>1年</span>
                      <span>10年</span>
                      <span>20年</span>
                      <span>30年</span>
                      <span>40年</span>
                    </div>
                  </div>
                </div>

                {/* グループ2: 想定利回り・高配当設定 */}
                <div className="space-y-2.5 p-3">
                  <div className="text-[11px] font-bold text-muted-foreground">2. 想定利回り・高配当株</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="min-w-0">
                      <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        つみたて想定年利 (%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.5}
                        value={input.tsumitateReturnPct}
                        onChange={(e) => updateField("tsumitateReturnPct", Number(e.target.value) || 0)}
                        className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>

                    <label className="min-w-0">
                      <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        成長枠 株価成長率 (%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.5}
                        value={input.growthCapitalReturnPct}
                        onChange={(e) => updateField("growthCapitalReturnPct", Number(e.target.value) || 0)}
                        className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>

                    <label className="min-w-0">
                      <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        成長枠 配当利回り (%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={input.growthDividendYieldPct}
                        onChange={(e) => updateField("growthDividendYieldPct", Number(e.target.value) || 0)}
                        className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>

                    <label className="min-w-0">
                      <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        年平均 増配率 (%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={input.growthDividendGrowthPct}
                        onChange={(e) => updateField("growthDividendGrowthPct", Number(e.target.value) || 0)}
                        className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>
                  </div>
                </div>

                {/* グループ3: 運用ルール（角丸四角＋淡いティント選択カラー） */}
                <div className="space-y-2.5 p-3">
                  <div className="text-[11px] font-bold text-muted-foreground">3. 配当・枠到達後ルール</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        配当金の扱い（成長投資枠）
                      </span>
                      {annualGrowthDesired === 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          成長枠0円のため対象外
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateField("dividendMode", "reinvest")}
                        className={`h-7 ${toggleButtonClass(input.dividendMode === "reinvest")}`}
                      >
                        配当を再投資
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("dividendMode", "receive")}
                        className={`h-7 ${toggleButtonClass(input.dividendMode === "receive")}`}
                      >
                        現金で受取
                      </button>
                    </div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      {annualGrowthDesired === 0 ? (
                        "※ つみたて枠は自動で複利運用されます。成長投資枠を設定すると比較できます。"
                      ) : input.dividendMode === "reinvest" ? (
                        <>
                          配当で株を買い増して複利運用（最終{" "}
                          <strong className="text-foreground tabular-nums">
                            {formatManYen(finalRow.reinvestTotalAsset, 0)}
                          </strong>
                          ）
                        </>
                      ) : (
                        <>
                          配当を現金で受け取る運用（最終{" "}
                          <strong className="text-foreground tabular-nums">
                            {formatManYen(finalRow.receiveTotalAsset, 0)}
                          </strong>
                          ）
                        </>
                      )}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-medium text-muted-foreground">
                      1,800万円枠 到達後の挙動
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateField("postLimitBehavior", "hold")}
                        className={`h-7 ${toggleButtonClass(input.postLimitBehavior === "hold")}`}
                      >
                        運用のみ継続
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("postLimitBehavior", "taxable")}
                        className={`h-7 ${toggleButtonClass(input.postLimitBehavior === "taxable")}`}
                      >
                        特定口座で継続
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 目標からの逆算モード（左カラム内で完結 → 右グラフへ即反映） */
              <div className="space-y-3 p-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReverseTab("asset")}
                    className={`h-7 ${toggleButtonClass(reverseTab === "asset")}`}
                  >
                    目標資産額から逆算
                  </button>
                  <button
                    type="button"
                    onClick={() => setReverseTab("dividend")}
                    className={`h-7 ${toggleButtonClass(reverseTab === "dividend")}`}
                  >
                    目標月間配当から逆算
                  </button>
                </div>

                {reverseTab === "asset" ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-semibold text-muted-foreground">
                        目標プリセット
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {TARGET_ASSET_PRESETS.map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTargetAssetMan(val)}
                            className={`h-6 tabular-nums ${presetChipClass(targetAssetMan === val)}`}
                          >
                            {formatManYen(val, 0)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                          目標額(万)
                        </span>
                        <input
                          type="number"
                          min={100}
                          max={50000}
                          step={100}
                          value={targetAssetMan}
                          onChange={(e) => setTargetAssetMan(Math.max(100, Number(e.target.value) || 100))}
                          className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </label>
                      <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                          年数(年)
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={40}
                          step={1}
                          value={targetYears}
                          onChange={(e) => setTargetYears(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
                          className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </label>
                      <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                          年利(%)
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={15}
                          step={0.5}
                          value={targetReturnPct}
                          onChange={(e) => setTargetReturnPct(Math.max(0, Math.min(15, Number(e.target.value) || 0)))}
                          className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </label>
                    </div>

                    {/* 逆算結果ボックス */}
                    <div className="space-y-2 rounded border border-border bg-muted/30 p-3">
                      <div className="text-xxs text-muted-foreground">
                        {targetYears}年で {formatManYen(targetAssetMan, 0)} に必要な積立額
                      </div>
                      <div className="text-lg font-extrabold tabular-nums text-foreground">
                        毎月 {formatManYen(reverseAssetResult.requiredMonthly, 1)}
                      </div>
                      <div className="text-[11px] tabular-nums text-muted-foreground">
                        累計投資元本: <strong className="text-foreground">{formatManYen(reverseAssetResult.totalPrincipal, 0)}</strong>
                      </div>
                      <div className="text-xxs">
                        {reverseAssetResult.withinNisaLifetimeLimit ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            新NISA生涯枠（1,800万円）内で達成可能
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            1,800万円枠を超過（特定口座の併用が必要）
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={applyReverseAssetToSimulator}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      <span>この条件を右のグラフへ反映</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-semibold text-muted-foreground">
                        月間配当プリセット
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {TARGET_DIVIDEND_PRESETS.map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTargetMonthlyDivMan(val)}
                            className={`h-6 tabular-nums ${presetChipClass(targetMonthlyDivMan === val)}`}
                          >
                            月{val}万円
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                          目標 月間配当（万円）
                        </span>
                        <input
                          type="number"
                          min={0.5}
                          max={100}
                          step={0.5}
                          value={targetMonthlyDivMan}
                          onChange={(e) => setTargetMonthlyDivMan(Math.max(0.5, Number(e.target.value) || 0.5))}
                          className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </label>
                      <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                          想定 配当利回り（%）
                        </span>
                        <input
                          type="number"
                          min={0.5}
                          max={10}
                          step={0.1}
                          value={targetDivYieldPct}
                          onChange={(e) => setTargetDivYieldPct(Math.max(0.5, Math.min(10, Number(e.target.value) || 0.5)))}
                          className="h-8 w-full rounded border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </label>
                    </div>

                    {/* 配当逆算結果ボックス */}
                    <div className="space-y-1.5 rounded border border-border bg-muted/30 p-3">
                      <div className="text-xxs text-muted-foreground">
                        月{targetMonthlyDivMan}万円（年{targetMonthlyDivMan * 12}万円）の配当に必要な元本
                      </div>
                      <div className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                        NISA: {formatManYen(reverseDivResult.nisaRequiredPrincipal, 0)}
                      </div>
                      <div className="text-[11px] tabular-nums text-muted-foreground">
                        特定口座なら: {formatManYen(reverseDivResult.taxableRequiredPrincipal, 0)}
                      </div>
                      <div className="text-xxs font-semibold text-emerald-700 dark:text-emerald-400">
                        NISAなら必要元本を {formatManYen(reverseDivResult.savedPrincipalNeeded, 0)} 圧縮可能
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {reverseDivResult.withinGrowthLifetimeLimit
                          ? "※ 成長投資枠1,200万円の上限内で収まります"
                          : "※ 成長投資枠1,200万円を超過します"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={applyReverseDividendToSimulator}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      <span>この利回りを右のグラフへ反映</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 右カラム: 結果サマリー → グラフ → 枠進捗 */}
          <div className="lg:col-span-8 min-w-0 space-y-3">
            {/* KPI サマリーカード */}
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              <div className="min-w-0 rounded border border-border bg-card p-3 border-t-2 border-t-primary">
                <div className="truncate text-xxs font-semibold text-muted-foreground">
                  {input.years}年後の総資産
                </div>
                <div className="mt-1.5 text-lg font-extrabold tracking-tight tabular-nums text-foreground">
                  {formatManYen(finalRow.totalAsset, 0)}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-muted-foreground tabular-nums">
                  元本 {formatManYen(finalRow.totalPrincipal, 0)} / 益{" "}
                  <span className={totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 font-bold"}>
                    {totalGain >= 0 ? "+" : ""}
                    {formatManYen(totalGain, 0)}
                  </span>
                </div>
              </div>

              <div className="min-w-0 rounded border border-emerald-500/35 bg-emerald-500/[0.04] p-3 border-t-2 border-t-emerald-500">
                <div className="truncate text-xxs font-semibold text-emerald-700 dark:text-emerald-400">
                  NISA 非課税節税額
                </div>
                <div className="mt-1.5 text-lg font-extrabold tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                  +{formatManYen(result.totalTaxSaved, 0)}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-muted-foreground tabular-nums">
                  特定口座比（20.315%非課税）
                </div>
              </div>

              <div className="min-w-0 rounded border border-border bg-card p-3">
                <div className="truncate text-xxs font-semibold text-muted-foreground">
                  最終年 年間配当
                </div>
                <div className="mt-1.5 text-base font-bold tabular-nums text-foreground">
                  {formatManYen(finalRow.annualDividend, 1)}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-muted-foreground tabular-nums">
                  月換算 {formatManYen(finalRow.monthlyDividend, 1)} / 累計 {formatManYen(finalRow.cumulativeDividend, 0)}
                </div>
              </div>

              <div className="min-w-0 rounded border border-border bg-card p-3">
                <div className="truncate text-xxs font-semibold text-muted-foreground">
                  {input.dividendMode === "reinvest" ? "再投資の複利効果" : "再投資との差額"}
                </div>
                <div
                  className={`mt-1.5 text-base font-bold tabular-nums ${
                    result.reinvestAdvantage === 0
                      ? "text-muted-foreground"
                      : input.dividendMode === "reinvest"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {result.reinvestAdvantage === 0
                    ? "±0万円"
                    : input.dividendMode === "reinvest"
                      ? `+${formatManYen(result.reinvestAdvantage, 0)}`
                      : `-${formatManYen(result.reinvestAdvantage, 0)}`}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {result.reinvestAdvantage === 0 ? (
                    "成長枠の配当がないため差額なし"
                  ) : input.dividendMode === "reinvest" ? (
                    "配当受取より複利で資産上乗せ"
                  ) : (
                    <>
                      受取優先（再投資なら{" "}
                      <span className="font-semibold text-foreground">
                        +{formatManYen(result.reinvestAdvantage, 0)}
                      </span>
                      ）
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* グラフカード */}
            <div className="overflow-hidden rounded border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChartTab("assets")}
                    className={`h-7 ${toggleButtonClass(chartTab === "assets")}`}
                  >
                    資産推移（NISA vs 特定口座）
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartTab("dividends")}
                    className={`h-7 ${toggleButtonClass(chartTab === "dividends")}`}
                  >
                    配当金推移 & 再投資比較
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  ※ 特定口座は譲渡益・配当に20.315%課税した税引後試算
                </span>
              </div>

              <div className="p-3">
                {chartTab === "assets" ? (
                  <div className="h-[260px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="nisaAssetGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="taxableAssetGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#64748b" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 10 }}
                          minTickGap={20}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tickFormatter={formatAxisMan}
                          tick={{ fontSize: 10 }}
                          width={52}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [formatManYen(value, 1), name]}
                          contentStyle={{
                            fontSize: "11px",
                            borderRadius: "4px",
                            border: "1px solid hsl(var(--border))",
                            backgroundColor: "hsl(var(--card))",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Area
                          type="monotone"
                          dataKey="totalAsset"
                          name="新NISA活用 総資産"
                          stroke="#10b981"
                          strokeWidth={2.2}
                          fill="url(#nisaAssetGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="allTaxableNetAsset"
                          name="全額特定口座（税引後）"
                          stroke="#64748b"
                          strokeWidth={1.6}
                          strokeDasharray="4 3"
                          fill="url(#taxableAssetGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="totalPrincipal"
                          name="累計投資元本"
                          stroke="#94a3b8"
                          strokeWidth={1.4}
                          fill="transparent"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="h-[230px] sm:h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                          <XAxis
                            dataKey="year"
                            tick={{ fontSize: 10 }}
                            minTickGap={20}
                            className="text-muted-foreground"
                          />
                          <YAxis
                            tickFormatter={(v) => `${v}万`}
                            tick={{ fontSize: 10 }}
                            width={46}
                            className="text-muted-foreground"
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => [formatManYen(value, 2), name]}
                            contentStyle={{
                              fontSize: "11px",
                              borderRadius: "4px",
                              border: "1px solid hsl(var(--border))",
                              backgroundColor: "hsl(var(--card))",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Bar
                            dataKey="annualDividend"
                            name="年間配当金（万円）"
                            fill="#f59e0b"
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 配当再投資 vs 受取 比較ストリップ */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded border border-border bg-muted/30 p-2.5 text-xs">
                      <div>
                        <div className="text-[10px] text-muted-foreground">配当再投資モード 最終総資産</div>
                        <div className="font-bold tabular-nums text-foreground">
                          {formatManYen(finalRow.reinvestTotalAsset, 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">
                          配当受取モード 最終総資産（評価額＋累計配当）
                        </div>
                        <div className="font-bold tabular-nums text-foreground">
                          {formatManYen(finalRow.receiveTotalAsset, 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">再投資による複利上乗せ効果</div>
                        <div className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{formatManYen(result.reinvestAdvantage, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 生涯投資枠（1,800万円）進捗バー */}
            <div className="rounded border border-border bg-card p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">生涯投資枠（1,800万円）消化状況</span>
                  <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
                    {formatManYen(finalRow.nisaPrincipal, 0)} / 1,800万円 ({nisaUsagePct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xxs text-muted-foreground">
                  <span className="whitespace-nowrap">
                    1,800万枠: <strong className="text-foreground">{formatMonthsToYears(result.fullLimitReachedMonths)}</strong>
                  </span>
                  {result.growthLimitReachedMonths !== null && (
                    <span className="whitespace-nowrap">
                      成長枠1,200万: <strong className="text-foreground">{formatMonthsToYears(result.growthLimitReachedMonths)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${tsumitateSharePct}%` }}
                  title={`つみたて投資枠: ${formatManYen(finalRow.tsumitatePrincipal, 0)}`}
                />
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${growthSharePct}%` }}
                  title={`成長投資枠: ${formatManYen(finalRow.growthPrincipal, 0)}`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground tabular-nums">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    つみたて枠: {formatManYen(finalRow.tsumitatePrincipal, 0)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    成長枠: {formatManYen(finalRow.growthPrincipal, 0)} / 1,200万上限
                  </span>
                  {finalRow.taxablePrincipal > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      特定口座分: {formatManYen(finalRow.taxablePrincipal, 0)}
                    </span>
                  )}
                </div>
                <span>
                  残りNISA枠: {formatManYen(Math.max(0, NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT - finalRow.nisaPrincipal), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 第2エリア: 年次シミュレーション明細テーブル */}
        <section className="overflow-hidden rounded border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-2">
            <div className="flex items-center gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground whitespace-nowrap">
                <Table2 className="h-3.5 w-3.5 text-primary" />
                年次シミュレーション明細
              </h3>
              <span className="hidden sm:inline text-xxs text-muted-foreground">
                各年期末のNISA残高・特定口座比較・配当金・累計節税額
              </span>
            </div>

            {result.rows.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllYears((prev) => !prev)}
                className={`h-7 ${toggleButtonClass(showAllYears)}`}
              >
                {showAllYears ? "5年刻みに折りたたむ" : `全${result.rows.length}年分を表示`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-table-border bg-muted/40 text-xxs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-bold whitespace-nowrap">年次</th>
                  <th className="px-3 py-2 text-right font-bold whitespace-nowrap">累計元本</th>
                  <th className="px-3 py-2 text-right font-bold whitespace-nowrap">NISA枠消化率</th>
                  {finalRow.taxablePrincipal > 0 && (
                    <th className="px-3 py-2 text-right font-bold whitespace-nowrap">特定口座元本</th>
                  )}
                  <th className="px-3 py-2 text-right font-bold whitespace-nowrap">NISA総資産</th>
                  <th className="px-3 py-2 text-right font-bold whitespace-nowrap">特定口座(税引後)</th>
                  <th className="px-3 py-2 text-right font-bold whitespace-nowrap">年間配当</th>
                  <th className="px-3 py-2 text-right font-bold whitespace-nowrap">月間配当</th>
                  <th className="px-3 py-2 text-right font-bold whitespace-nowrap">累計節税額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-table-border/60 tabular-nums">
                {displayedRows.map((row) => {
                  const rowUsagePct = Math.min(
                    100,
                    (row.nisaPrincipal / NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT) * 100
                  );
                  const isFull = rowUsagePct >= 99.95;
                  return (
                    <tr key={row.year} className="odd:bg-card even:bg-table-stripe hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2 font-bold text-foreground whitespace-nowrap">
                        {row.year}年目
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatManYen(row.totalPrincipal, 0)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <span
                          className={
                            isFull
                              ? "font-bold text-primary"
                              : "text-muted-foreground"
                          }
                        >
                          {isFull ? "100% (満額)" : `${rowUsagePct.toFixed(1)}%`}
                        </span>
                      </td>
                      {finalRow.taxablePrincipal > 0 && (
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                          {row.taxablePrincipal > 0 ? formatManYen(row.taxablePrincipal, 0) : "—"}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right font-bold text-foreground whitespace-nowrap">
                        {formatManYen(row.totalAsset, 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatManYen(row.allTaxableNetAsset, 0)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {formatManYen(row.annualDividend, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatManYen(row.monthlyDividend, 1)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{formatManYen(row.taxSavedTotal, 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
