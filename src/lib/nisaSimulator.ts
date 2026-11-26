export type DividendMode = "reinvest" | "receive";
export type PostLimitBehavior = "hold" | "taxable";

export interface NisaSimulationInput {
  /** つみたて投資枠の月額（万円）: 0〜10 */
  tsumitateMonthly: number;
  /** 成長投資枠の月額（万円）: 0〜20 */
  growthMonthly: number;
  /** 成長投資枠のボーナス等・年次一括投資（万円/年）: 0〜240 */
  growthAnnualBonus: number;
  /** 運用年数（年）: 1〜40 */
  years: number;
  /** つみたて投資枠の想定年利（%） */
  tsumitateReturnPct: number;
  /** 成長投資枠の株価成長率（キャピタルゲイン年率%） */
  growthCapitalReturnPct: number;
  /** 成長投資枠の初期配当利回り（%） */
  growthDividendYieldPct: number;
  /** 成長投資枠の年平均増配率（%） */
  growthDividendGrowthPct: number;
  /** 配当の扱い: 再投資 or 受取 */
  dividendMode: DividendMode;
  /** 1,800万円到達後の挙動: 運用継続のみ or 特定口座へ切替継続 */
  postLimitBehavior: PostLimitBehavior;
}

export interface NisaYearlyRow {
  year: number;
  /** 累計投資元本（万円） */
  totalPrincipal: number;
  /** NISA枠内の累計元本（簿価、万円） */
  nisaPrincipal: number;
  /** うちつみたて枠の累計元本（万円） */
  tsumitatePrincipal: number;
  /** うち成長枠の累計元本（万円） */
  growthPrincipal: number;
  /** 特定口座の累計元本（万円） */
  taxablePrincipal: number;
  /** NISA口座の期末評価額（万円） */
  nisaValue: number;
  /** 特定口座の期末評価額（税引前、万円） */
  taxableValue: number;
  /** 総資産（選択中モード：評価額 + 受取累計配当、万円） */
  totalAsset: number;
  /** もし全額を特定口座で運用した場合の税引後総資産（万円） */
  allTaxableNetAsset: number;
  /** 配当再投資モード時の総資産（万円） */
  reinvestTotalAsset: number;
  /** 配当受取モード時の総資産（評価額＋受取累計配当、万円） */
  receiveTotalAsset: number;
  /** その年の年間配当金（NISA非課税＋特定口座税引後、万円） */
  annualDividend: number;
  /** その年の月間配当金換算（万円） */
  monthlyDividend: number;
  /** 累計配当金（万円） */
  cumulativeDividend: number;
  /** NISA非課税による累計節税額（譲渡益＋配当、万円） */
  taxSavedTotal: number;
}

export interface NisaSimulationResult {
  rows: NisaYearlyRow[];
  finalRow: NisaYearlyRow;
  /** 1,800万円満額到達までの月数（未到達なら null） */
  fullLimitReachedMonths: number | null;
  /** 成長投資枠1,200万円到達までの月数（未到達なら null） */
  growthLimitReachedMonths: number | null;
  /** 最終時点の譲渡益節税額（万円） */
  capitalTaxSaved: number;
  /** 最終時点の配当節税額（万円） */
  dividendTaxSaved: number;
  /** 最終時点の合計節税額（万円） */
  totalTaxSaved: number;
  /** 再投資 vs 受取の最終総資産差（万円） */
  reinvestAdvantage: number;
}

export const NISA_CONSTANTS = {
  ANNUAL_TSUMITATE_LIMIT: 120, // 万円
  ANNUAL_GROWTH_LIMIT: 240, // 万円
  ANNUAL_TOTAL_LIMIT: 360, // 万円
  LIFETIME_TOTAL_LIMIT: 1800, // 万円
  LIFETIME_GROWTH_LIMIT: 1200, // 万円
  JAPAN_TAX_RATE: 0.20315, // 20.315%
} as const;

export const NISA_PRESETS: Array<{
  id: string;
  label: string;
  badge: string;
  input: NisaSimulationInput;
}> = [
  {
    id: "classic",
    label: "王道インデックス",
    badge: "月5万円・20年",
    input: {
      tsumitateMonthly: 5,
      growthMonthly: 0,
      growthAnnualBonus: 0,
      years: 20,
      tsumitateReturnPct: 5.0,
      growthCapitalReturnPct: 3.0,
      growthDividendYieldPct: 3.5,
      growthDividendGrowthPct: 2.0,
      dividendMode: "reinvest",
      postLimitBehavior: "hold",
    },
  },
  {
    id: "fastest",
    label: "最速5年1,800万満額",
    badge: "月30万円・15年",
    input: {
      tsumitateMonthly: 10,
      growthMonthly: 20,
      growthAnnualBonus: 0,
      years: 15,
      tsumitateReturnPct: 5.5,
      growthCapitalReturnPct: 4.0,
      growthDividendYieldPct: 2.5,
      growthDividendGrowthPct: 2.0,
      dividendMode: "reinvest",
      postLimitBehavior: "hold",
    },
  },
  {
    id: "high-dividend",
    label: "高配当株メイン",
    badge: "月10万円・利回り4%",
    input: {
      tsumitateMonthly: 3,
      growthMonthly: 7,
      growthAnnualBonus: 0,
      years: 20,
      tsumitateReturnPct: 5.0,
      growthCapitalReturnPct: 2.0,
      growthDividendYieldPct: 4.0,
      growthDividendGrowthPct: 3.0,
      dividendMode: "reinvest",
      postLimitBehavior: "hold",
    },
  },
  {
    id: "long-term",
    label: "コツコツ30年長期",
    badge: "月3万円・30年",
    input: {
      tsumitateMonthly: 3,
      growthMonthly: 0,
      growthAnnualBonus: 0,
      years: 30,
      tsumitateReturnPct: 5.0,
      growthCapitalReturnPct: 3.0,
      growthDividendYieldPct: 3.0,
      growthDividendGrowthPct: 2.0,
      dividendMode: "reinvest",
      postLimitBehavior: "hold",
    },
  },
];

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

const runSingleModeSimulation = (
  input: NisaSimulationInput,
  mode: DividendMode
) => {
  const years = Math.round(clamp(input.years, 1, 40));
  const totalMonths = years * 12;

  const tsumitateMonthlyRate = clamp(input.tsumitateReturnPct, -10, 20) / 100 / 12;
  const growthCapMonthlyRate = clamp(input.growthCapitalReturnPct, -10, 20) / 100 / 12;
  const baseDivYield = clamp(input.growthDividendYieldPct, 0, 12) / 100;
  const divGrowthRate = clamp(input.growthDividendGrowthPct, 0, 10) / 100;
  const taxRate = NISA_CONSTANTS.JAPAN_TAX_RATE;

  let tsumitatePrincipal = 0;
  let growthPrincipal = 0;
  let taxablePrincipal = 0;

  let tsumitateVal = 0;
  let growthVal = 0;
  let taxableTsumitateVal = 0;
  let taxableGrowthVal = 0;
  let receivedCash = 0;
  let cumulativeDividend = 0;
  let cumulativeNisaDividend = 0;

  // 比較用：全額を特定口座（課税）で同じ金額投資した場合
  let compTsumitateVal = 0;
  let compGrowthVal = 0;
  let compPrincipal = 0;
  let compReceivedCash = 0;

  let fullLimitReachedMonths: number | null = null;
  let growthLimitReachedMonths: number | null = null;

  const yearlySnapshots: Array<{
    year: number;
    totalPrincipal: number;
    nisaPrincipal: number;
    tsumitatePrincipal: number;
    growthPrincipal: number;
    taxablePrincipal: number;
    nisaValue: number;
    taxableValue: number;
    totalAsset: number;
    allTaxableNetAsset: number;
    annualDividend: number;
    cumulativeDividend: number;
    capitalTaxSaved: number;
    dividendTaxSaved: number;
  }> = [];

  for (let y = 1; y <= years; y += 1) {
    let annualTsumitateUsed = 0;
    let annualGrowthUsed = 0;
    let yearDividend = 0;

    // 増配率を加味した当年配当利回り（上限10%に安全制限）
    const currentDivYield = Math.min(0.1, baseDivYield * Math.pow(1 + divGrowthRate, y - 1));
    const monthlyDivRate = currentDivYield / 12;

    for (let m = 1; m <= 12; m += 1) {
      const monthIndex = (y - 1) * 12 + m;

      // 1. 毎月の積立・ボーナス（6月・12月に半額ずつ）
      const desiredTsumitate = Math.max(0, input.tsumitateMonthly);
      const bonusThisMonth = (m === 6 || m === 12) ? Math.max(0, input.growthAnnualBonus) / 2 : 0;
      const desiredGrowth = Math.max(0, input.growthMonthly) + bonusThisMonth;

      // 生涯残り枠
      const remainingLifetimeTotal = Math.max(
        0,
        NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT - (tsumitatePrincipal + growthPrincipal)
      );
      const remainingLifetimeGrowth = Math.max(
        0,
        NISA_CONSTANTS.LIFETIME_GROWTH_LIMIT - growthPrincipal
      );

      // 年間残り枠
      const remainingAnnualTsumitate = Math.max(
        0,
        NISA_CONSTANTS.ANNUAL_TSUMITATE_LIMIT - annualTsumitateUsed
      );
      const remainingAnnualGrowth = Math.max(
        0,
        NISA_CONSTANTS.ANNUAL_GROWTH_LIMIT - annualGrowthUsed
      );

      // NISAつみたて枠への割当
      const allocTsumitate = Math.min(desiredTsumitate, remainingAnnualTsumitate, remainingLifetimeTotal);
      const remainingAfterTsumitate = Math.max(0, remainingLifetimeTotal - allocTsumitate);

      // NISA成長枠への割当
      const allocGrowth = Math.min(
        desiredGrowth,
        remainingAnnualGrowth,
        remainingLifetimeGrowth,
        remainingAfterTsumitate
      );

      // 枠超過分の扱い
      const overflowTsumitate = Math.max(0, desiredTsumitate - allocTsumitate);
      const overflowGrowth = Math.max(0, desiredGrowth - allocGrowth);
      const allocTaxableTsumitate = input.postLimitBehavior === "taxable" ? overflowTsumitate : 0;
      const allocTaxableGrowth = input.postLimitBehavior === "taxable" ? overflowGrowth : 0;

      tsumitatePrincipal += allocTsumitate;
      growthPrincipal += allocGrowth;
      annualTsumitateUsed += allocTsumitate;
      annualGrowthUsed += allocGrowth;
      taxablePrincipal += allocTaxableTsumitate + allocTaxableGrowth;

      tsumitateVal += allocTsumitate;
      growthVal += allocGrowth;
      taxableTsumitateVal += allocTaxableTsumitate;
      taxableGrowthVal += allocTaxableGrowth;

      // 比較用（同じ総投入額を全額特定口座に入れたケース）
      const actualTsumitateIn = allocTsumitate + allocTaxableTsumitate;
      const actualGrowthIn = allocGrowth + allocTaxableGrowth;
      compPrincipal += actualTsumitateIn + actualGrowthIn;
      compTsumitateVal += actualTsumitateIn;
      compGrowthVal += actualGrowthIn;

      // 枠到達タイミング記録
      if (
        fullLimitReachedMonths === null &&
        tsumitatePrincipal + growthPrincipal >= NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT - 0.001
      ) {
        fullLimitReachedMonths = monthIndex;
      }
      if (
        growthLimitReachedMonths === null &&
        growthPrincipal >= NISA_CONSTANTS.LIFETIME_GROWTH_LIMIT - 0.001
      ) {
        growthLimitReachedMonths = monthIndex;
      }

      // 2. 月次運用リターン（キャピタル成長）
      tsumitateVal *= 1 + tsumitateMonthlyRate;
      growthVal *= 1 + growthCapMonthlyRate;
      taxableTsumitateVal *= 1 + tsumitateMonthlyRate;
      taxableGrowthVal *= 1 + growthCapMonthlyRate;

      compTsumitateVal *= 1 + tsumitateMonthlyRate;
      compGrowthVal *= 1 + growthCapMonthlyRate;

      // 3. 成長枠の月次配当（NISAは非課税、特定口座は20.315%課税後）
      const nisaDiv = growthVal * monthlyDivRate;
      const taxableDivNet = taxableGrowthVal * monthlyDivRate * (1 - taxRate);
      const totalDivThisMonth = nisaDiv + taxableDivNet;
      yearDividend += totalDivThisMonth;
      cumulativeDividend += totalDivThisMonth;
      cumulativeNisaDividend += nisaDiv;

      const compDivNet = compGrowthVal * monthlyDivRate * (1 - taxRate);

      if (mode === "reinvest") {
        // 配当再投資：NISA内配当はそのまま成長枠内で複利運用（または受取枠外再投資として評価額加算）
        growthVal += nisaDiv;
        taxableGrowthVal += taxableDivNet;
        compGrowthVal += compDivNet;
      } else {
        receivedCash += totalDivThisMonth;
        compReceivedCash += compDivNet;
      }
    }

    const nisaPrincipal = tsumitatePrincipal + growthPrincipal;
    const totalPrincipal = nisaPrincipal + taxablePrincipal;
    const nisaValue = tsumitateVal + growthVal;
    const taxableGrossValue = taxableTsumitateVal + taxableGrowthVal;
    const taxableGain = Math.max(0, taxableGrossValue - taxablePrincipal);
    const taxableNetValue = taxableGrossValue - taxableGain * taxRate;
    const totalAsset = nisaValue + taxableNetValue + receivedCash;

    // 比較用（全額特定口座）の税引後総資産
    const compGrossValue = compTsumitateVal + compGrowthVal;
    const compGain = Math.max(0, compGrossValue - compPrincipal);
    const allTaxableNetAsset = compGrossValue - compGain * taxRate + compReceivedCash;

    // 節税額内訳
    const nisaGain = Math.max(0, nisaValue - nisaPrincipal);
    const capitalTaxSaved = nisaGain * taxRate;
    const dividendTaxSaved = cumulativeNisaDividend * taxRate;

    yearlySnapshots.push({
      year: y,
      totalPrincipal,
      nisaPrincipal,
      tsumitatePrincipal,
      growthPrincipal,
      taxablePrincipal,
      nisaValue,
      taxableValue: taxableNetValue,
      totalAsset,
      allTaxableNetAsset,
      annualDividend: yearDividend,
      cumulativeDividend,
      capitalTaxSaved,
      dividendTaxSaved,
    });
  }

  return {
    yearlySnapshots,
    fullLimitReachedMonths,
    growthLimitReachedMonths,
    totalMonths,
  };
};

export const simulateNewNisa = (input: NisaSimulationInput): NisaSimulationResult => {
  const reinvestRun = runSingleModeSimulation(input, "reinvest");
  const receiveRun = runSingleModeSimulation(input, "receive");
  const activeRun = input.dividendMode === "reinvest" ? reinvestRun : receiveRun;

  const rows: NisaYearlyRow[] = activeRun.yearlySnapshots.map((snap, idx) => {
    const reinvestSnap = reinvestRun.yearlySnapshots[idx];
    const receiveSnap = receiveRun.yearlySnapshots[idx];
    const taxSavedTotal = Math.max(0, snap.totalAsset - snap.allTaxableNetAsset);

    return {
      year: snap.year,
      totalPrincipal: snap.totalPrincipal,
      nisaPrincipal: snap.nisaPrincipal,
      tsumitatePrincipal: snap.tsumitatePrincipal,
      growthPrincipal: snap.growthPrincipal,
      taxablePrincipal: snap.taxablePrincipal,
      nisaValue: snap.nisaValue,
      taxableValue: snap.taxableValue,
      totalAsset: snap.totalAsset,
      allTaxableNetAsset: snap.allTaxableNetAsset,
      reinvestTotalAsset: reinvestSnap.totalAsset,
      receiveTotalAsset: receiveSnap.totalAsset,
      annualDividend: snap.annualDividend,
      monthlyDividend: snap.annualDividend / 12,
      cumulativeDividend: snap.cumulativeDividend,
      taxSavedTotal,
    };
  });

  const finalRow = rows[rows.length - 1];
  const finalSnap = activeRun.yearlySnapshots[activeRun.yearlySnapshots.length - 1];

  return {
    rows,
    finalRow,
    fullLimitReachedMonths: activeRun.fullLimitReachedMonths,
    growthLimitReachedMonths: activeRun.growthLimitReachedMonths,
    capitalTaxSaved: finalSnap.capitalTaxSaved,
    dividendTaxSaved: finalSnap.dividendTaxSaved,
    totalTaxSaved: finalRow.taxSavedTotal,
    reinvestAdvantage: Math.max(0, finalRow.reinvestTotalAsset - finalRow.receiveTotalAsset),
  };
};

/** 目標資産額（万円）を達成するために必要な毎月の積立額（万円）を逆算 */
export const reverseCalculateMonthlyForTarget = (
  targetAmount: number,
  years: number,
  annualReturnPct: number
): {
  requiredMonthly: number;
  totalPrincipal: number;
  withinNisaLifetimeLimit: boolean;
  withinNisaAnnualLimit: boolean;
} => {
  const n = Math.max(1, Math.round(years)) * 12;
  const r = annualReturnPct / 100 / 12;
  let requiredMonthly = 0;

  if (Math.abs(r) < 1e-8) {
    requiredMonthly = targetAmount / n;
  } else {
    // 期末複利（月初積立ベース）: FV = PMT * ((1+r)^n - 1) / r * (1+r)
    const factor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    requiredMonthly = targetAmount / factor;
  }

  const roundedMonthly = Math.max(0.1, Number(requiredMonthly.toFixed(1)));
  const totalPrincipal = roundedMonthly * n;

  return {
    requiredMonthly: roundedMonthly,
    totalPrincipal,
    withinNisaLifetimeLimit: totalPrincipal <= NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT,
    withinNisaAnnualLimit: roundedMonthly * 12 <= NISA_CONSTANTS.ANNUAL_TOTAL_LIMIT,
  };
};

/** 目標月間配当金（万円/月）を得るために必要な元本（万円）を逆算（NISA非課税 vs 特定口座課税後） */
export const reverseCalculatePrincipalForMonthlyDividend = (
  targetMonthlyDividend: number,
  dividendYieldPct: number
): {
  nisaRequiredPrincipal: number;
  taxableRequiredPrincipal: number;
  savedPrincipalNeeded: number;
  withinGrowthLifetimeLimit: boolean;
} => {
  const yieldRate = Math.max(0.5, dividendYieldPct) / 100;
  const annualTarget = Math.max(0, targetMonthlyDividend) * 12;
  const nisaRequiredPrincipal = annualTarget / yieldRate;
  const taxableRequiredPrincipal = annualTarget / (yieldRate * (1 - NISA_CONSTANTS.JAPAN_TAX_RATE));

  return {
    nisaRequiredPrincipal,
    taxableRequiredPrincipal,
    savedPrincipalNeeded: taxableRequiredPrincipal - nisaRequiredPrincipal,
    withinGrowthLifetimeLimit: nisaRequiredPrincipal <= NISA_CONSTANTS.LIFETIME_GROWTH_LIMIT,
  };
};
