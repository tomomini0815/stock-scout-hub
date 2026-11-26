import { describe, expect, it } from "vitest";
import {
  NISA_CONSTANTS,
  reverseCalculateMonthlyForTarget,
  reverseCalculatePrincipalForMonthlyDividend,
  simulateNewNisa,
  type NisaSimulationInput,
} from "@/lib/nisaSimulator";

const baseInput: NisaSimulationInput = {
  tsumitateMonthly: 5,
  growthMonthly: 5,
  growthAnnualBonus: 0,
  years: 20,
  tsumitateReturnPct: 5,
  growthCapitalReturnPct: 3,
  growthDividendYieldPct: 4,
  growthDividendGrowthPct: 2,
  dividendMode: "reinvest",
  postLimitBehavior: "hold",
};

describe("nisaSimulator", () => {
  it("caps lifetime NISA principal at 1,800万円 and growth principal at 1,200万円", () => {
    const result = simulateNewNisa({
      ...baseInput,
      tsumitateMonthly: 10,
      growthMonthly: 20,
      years: 10,
      postLimitBehavior: "hold",
    });

    expect(result.finalRow.nisaPrincipal).toBeLessThanOrEqual(NISA_CONSTANTS.LIFETIME_TOTAL_LIMIT + 0.01);
    expect(result.finalRow.growthPrincipal).toBeLessThanOrEqual(NISA_CONSTANTS.LIFETIME_GROWTH_LIMIT + 0.01);
    expect(result.fullLimitReachedMonths).toBe(60); // 30万/月 × 60ヶ月 = 1,800万
    expect(result.finalRow.taxablePrincipal).toBe(0);
  });

  it("spills overflow contributions into taxable account when postLimitBehavior is taxable", () => {
    const result = simulateNewNisa({
      ...baseInput,
      tsumitateMonthly: 10,
      growthMonthly: 20,
      years: 10,
      postLimitBehavior: "taxable",
    });

    expect(result.finalRow.nisaPrincipal).toBeCloseTo(1800, 1);
    expect(result.finalRow.taxablePrincipal).toBeCloseTo(1800, 1);
    expect(result.finalRow.totalPrincipal).toBeCloseTo(3600, 1);
  });

  it("produces positive tax savings compared to all-taxable account and reinvest beats receive", () => {
    const result = simulateNewNisa(baseInput);

    expect(result.totalTaxSaved).toBeGreaterThan(0);
    expect(result.finalRow.totalAsset).toBeGreaterThan(result.finalRow.allTaxableNetAsset);
    expect(result.finalRow.reinvestTotalAsset).toBeGreaterThan(result.finalRow.receiveTotalAsset);
    expect(result.finalRow.annualDividend).toBeGreaterThan(0);
  });

  it("reverse calculates monthly contribution for target amount accurately", () => {
    const rev = reverseCalculateMonthlyForTarget(2000, 20, 5);
    expect(rev.requiredMonthly).toBeGreaterThan(4.5);
    expect(rev.requiredMonthly).toBeLessThan(5.2);
    expect(rev.withinNisaLifetimeLimit).toBe(true);
    expect(rev.withinNisaAnnualLimit).toBe(true);
  });

  it("reverse calculates required principal for monthly dividend with NISA tax advantage", () => {
    const rev = reverseCalculatePrincipalForMonthlyDividend(5, 4); // 月5万 = 年60万 / 4% = 1,500万
    expect(rev.nisaRequiredPrincipal).toBeCloseTo(1500, 1);
    expect(rev.taxableRequiredPrincipal).toBeGreaterThan(rev.nisaRequiredPrincipal);
    expect(rev.savedPrincipalNeeded).toBeGreaterThan(300);
    expect(rev.withinGrowthLifetimeLimit).toBe(false);
  });
});
