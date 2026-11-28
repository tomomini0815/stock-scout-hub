import { describe, expect, it } from "vitest";
import {
  buildPeriodicBriefingSpeech,
  buildSpikeSpeechText,
  computeSupportResistanceLevels,
  computeUsdJpySupportResistance,
  DEFAULT_VOICE_ALERT_SETTINGS,
  detectAutoRoundNumberCrosses,
  detectPriceLineCrosses,
  detectRateSpikes,
  detectSupportResistanceHits,
  detectUsdJpySupportResistanceHits,
  formatSpokenPrice,
  getPeriodicSlotKey,
  isInQuietHours,
} from "@/lib/rateVoiceAlert";
import { type MarketIndex } from "@/data/stockData";

describe("rateVoiceAlert", () => {
  it("formats Japanese spoken prices cleanly", () => {
    expect(formatSpokenPrice("USD/JPY", 158.45)).toBe("158円45銭");
    expect(formatSpokenPrice("USD/JPY", 158.0)).toBe("158円");
    expect(formatSpokenPrice("日経平均", 56150)).toBe("56,150円");
    expect(formatSpokenPrice("BTC/USDT", 61450.2)).toBe("61,450ドル");
  });

  it("supports short, standard, detailed, and custom templates", () => {
    const idx: MarketIndex = {
      name: "日経平均",
      value: 56436.65,
      change: -3007.56,
      changePercent: -5.06,
      futuresValue: 56500,
      futuresChange: 1500,
      futuresChangePercent: 2.73,
    };

    const shortText = buildSpikeSpeechText(idx, 56500, 0.45, {
      ...DEFAULT_VOICE_ALERT_SETTINGS,
      style: "short",
      includePrice: true,
      includeDelta: false,
    });
    expect(shortText).toBe("日経平均先物、急上昇。56,500円。");

    const detailedText = buildSpikeSpeechText(idx, 56500, 0.45, {
      ...DEFAULT_VOICE_ALERT_SETTINGS,
      style: "detailed",
    });
    expect(detailedText).toContain("前日比プラス2.73パーセント");

    const customText = buildSpikeSpeechText(idx, 56500, -0.5, {
      ...DEFAULT_VOICE_ALERT_SETTINGS,
      style: "custom",
      customTemplate: "{銘柄}が{方向}！{価格}（{変動率}）",
    });
    expect(customText).toBe("日経平均先物が急落！56,500円（マイナス0.50パーセント）");
  });

  it("filters by directionFilter (up / down / both)", () => {
    const indices: MarketIndex[] = [
      { name: "USD/JPY", value: 157.0, change: -1.0, changePercent: -0.63 },
    ];
    const prev = { "USD/JPY": 158.0 };

    const upOnly = detectRateSpikes(
      indices,
      prev,
      { ...DEFAULT_VOICE_ALERT_SETTINGS, enabled: true, directionFilter: "up", thresholdPercent: 0.3 },
      {},
      1_000_000
    );
    expect(upOnly).toHaveLength(0);

    const downOnly = detectRateSpikes(
      indices,
      prev,
      { ...DEFAULT_VOICE_ALERT_SETTINGS, enabled: true, directionFilter: "down", thresholdPercent: 0.3 },
      {},
      1_000_000
    );
    expect(downOnly).toHaveLength(1);
    expect(downOnly[0].direction).toBe("down");
  });

  it("respects quiet hours (including overnight 23:00-07:00 JST)", () => {
    const settings = { quietHoursEnabled: true, quietStart: "23:00", quietEnd: "07:00" };
    // 2026-11-24 01:30 JST = 2026-11-23 16:30 UTC
    expect(isInQuietHours(settings, new Date("2026-11-23T16:30:00Z"))).toBe(true);
    // 2026-11-24 10:00 JST = 2026-11-24 01:00 UTC
    expect(isInQuietHours(settings, new Date("2026-11-24T01:00:00Z"))).toBe(false);
  });

  it("detects price line crosses and ignores already-triggered lines", () => {
    const indices: MarketIndex[] = [
      { name: "USD/JPY", value: 160.15, change: 1.2, changePercent: 0.75 },
    ];
    const settings = {
      ...DEFAULT_VOICE_ALERT_SETTINGS,
      enabled: true,
      priceAlerts: [
        { id: "a1", indexName: "USD/JPY", targetPrice: 160, condition: "above" as const, triggered: false },
        { id: "a2", indexName: "USD/JPY", targetPrice: 159, condition: "above" as const, triggered: true },
      ],
    };

    const hits = detectPriceLineCrosses(indices, settings, Date.parse("2026-11-24T01:00:00Z"));
    expect(hits).toHaveLength(1);
    expect(hits[0].alertId).toBe("a1");
    expect(hits[0].speechText).toContain("160円を突破しました");
  });

  it("respects cooldown window so the same index does not spam alerts", () => {
    const indices: MarketIndex[] = [
      { name: "BTC/USDT", value: 62000, change: 1000, changePercent: 1.6 },
    ];
    const prev = { "BTC/USDT": 61000 };
    const settings = { ...DEFAULT_VOICE_ALERT_SETTINGS, enabled: true, thresholdPercent: 0.3 };

    const spikes = detectRateSpikes(
      indices,
      prev,
      settings,
      { "BTC/USDT": 950_000 },
      1_000_000,
      180_000
    );
    expect(spikes).toHaveLength(0);
  });

  it("detects automatic round-number crosses without manual price entry", () => {
    const indices: MarketIndex[] = [
      { name: "USD/JPY", value: 160.05, change: 1.1, changePercent: 0.7 },
      { name: "日経平均", value: 55950, change: -500, changePercent: -0.9, futuresValue: 55950 },
    ];
    const prev = { "USD/JPY": 159.92, 日経平均: 56080 };
    const settings = {
      ...DEFAULT_VOICE_ALERT_SETTINGS,
      enabled: true,
      autoRoundNumbersEnabled: true,
    };

    const hits = detectAutoRoundNumberCrosses(
      indices,
      prev,
      settings,
      {},
      Date.parse("2026-11-24T01:00:00Z")
    );
    expect(hits).toHaveLength(2);
    expect(hits.find((h) => h.indexName === "USD/JPY")?.speechText).toContain("160円を突破しました");
    expect(hits.find((h) => h.indexName === "日経平均")?.speechText).toContain("56,000円を割り込みました");
  });

  it("matches periodic schedule slots and builds periodic briefing speech", () => {
    // 2026-11-24 10:00 JST = 2026-11-24 01:00 UTC
    const atTen = new Date("2026-11-24T01:00:00Z");
    const atTenTen = new Date("2026-11-24T01:10:00Z");
    expect(getPeriodicSlotKey(60, atTen)).toBe("2026-11-24 10:00");
    expect(getPeriodicSlotKey(60, atTenTen)).toBeNull();
    expect(getPeriodicSlotKey(30, new Date("2026-11-24T01:30:00Z"))).toBe("2026-11-24 10:30");

    const speech = buildPeriodicBriefingSpeech(
      [
        { name: "日経平均", value: 56436, change: 100, changePercent: 0.2, futuresValue: 56200, futuresChangePercent: 2.9 },
        { name: "USD/JPY", value: 158.95, change: 0.3, changePercent: 0.2 },
      ],
      DEFAULT_VOICE_ALERT_SETTINGS,
      atTen
    );
    expect(speech).toContain("10時0分の定時レポートです");
    expect(speech).toContain("日経平均先物は56,200円");
    expect(speech).toContain("ドル円は158円95銭");
  });

  it("keeps standard Japanese phrasing without 'なのだ' suffix even in cute voice mode", () => {
    const cuteText = buildSpikeSpeechText(
      { name: "USD/JPY", value: 160, change: 1, changePercent: 0.6 },
      160,
      0.5,
      { ...DEFAULT_VOICE_ALERT_SETTINGS, voiceCharacter: "zunda" }
    );
    expect(cuteText).not.toContain("なのだ");
    expect(cuteText).toContain("ドル円が急上昇");
  });

  it("computes USD/JPY support/resistance levels and triggers alert when reached", () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: i === 10 ? 160.2 : 159.2,
      low: i === 15 ? 157.4 : 158.1,
      close: 158.8,
    }));
    const levels = computeUsdJpySupportResistance(candles, 158.8);
    expect(levels.some((l) => l.kind === "resistance" && l.price >= 159.2)).toBe(true);
    expect(levels.some((l) => l.kind === "support" && l.price <= 158.1)).toBe(true);

    const hits = detectUsdJpySupportResistanceHits(
      160.25,
      160.1,
      [{ id: "r1", kind: "resistance", label: "上値抵抗線 R1", price: 160.2 }],
      { ...DEFAULT_VOICE_ALERT_SETTINGS, enabled: true, usdJpySrEnabled: true, usdJpySrMarginYen: 0.1 },
      {},
      Date.parse("2026-11-24T01:00:00Z")
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].speechText).toContain("上値抵抗線 R1");
    expect(hits[0].speechText).toContain("突破しました");
  });

  it("supports multi-index support/resistance levels with 60-day and 200-day lookbacks", () => {
    const candles200 = Array.from({ length: 210 }, (_, i) => ({
      high: i === 20 ? 62000 : i === 180 ? 59500 : 58500,
      low: i === 30 ? 52000 : i === 170 ? 56500 : 57500,
      close: 58000,
    }));

    const levels60 = computeSupportResistanceLevels("日経平均", candles200, 58000, 60);
    const levels200 = computeSupportResistanceLevels("日経平均", candles200, 58000, 200);
    expect(levels60.some((l) => l.kind === "resistance" && l.price === 59500)).toBe(true);
    expect(levels200.some((l) => l.kind === "resistance" && l.price === 62000)).toBe(true);
    expect(levels200.some((l) => l.kind === "support" && l.price === 52000)).toBe(true);

    const indices: MarketIndex[] = [
      { name: "日経平均", value: 59520, change: 500, changePercent: 0.85, futuresValue: 59520 },
      { name: "BTC/USDT", value: 65000, change: 1000, changePercent: 1.5 },
    ];
    const hits = detectSupportResistanceHits(
      indices,
      { 日経平均: 59400, "BTC/USDT": 64900 },
      { 日経平均: levels60, "BTC/USDT": [{ id: "btc-r1", kind: "resistance", label: "上値抵抗線 R1", price: 65000 }] },
      {
        ...DEFAULT_VOICE_ALERT_SETTINGS,
        enabled: true,
        srEnabled: true,
        srTargets: ["日経平均"],
        srLookbackDays: 200,
        srMarginPercent: 0.1,
      },
      {},
      Date.parse("2026-11-24T01:00:00Z")
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].indexName).toBe("日経平均");
    expect(hits[0].speechText).toContain("200日上値抵抗線");
    expect(hits[0].speechText).toContain("突破しました");
  });

  it("announces breakout even right after near alert and handles already-exceeded SR levels", () => {
    const levels = {
      "USD/JPY": [
        { id: "usdjpy-60d-r1", kind: "resistance" as const, label: "上値抵抗線 R1", price: 160.0 },
        { id: "usdjpy-60d-s1", kind: "support" as const, label: "下値支持線 S1", price: 158.0 },
      ],
    };
    const settings = {
      ...DEFAULT_VOICE_ALERT_SETTINGS,
      enabled: true,
      srEnabled: true,
      srTargets: ["USD/JPY"],
      srLookbackDays: 60 as const,
      srMarginPercent: 0.1,
    };
    const baseMs = Date.parse("2026-11-24T01:00:00Z");
    const lastSrAt: Record<string, number> = {};

    // 1. 接近アラート（159.92）
    const nearHits = detectSupportResistanceHits(
      [{ name: "USD/JPY", value: 159.92, change: 0.5, changePercent: 0.3 }],
      { "USD/JPY": 159.8 },
      levels,
      settings,
      lastSrAt,
      baseMs
    );
    expect(nearHits).toHaveLength(1);
    expect(nearHits[0].speechText).toContain("接近しました");
    if (nearHits[0].alertId) lastSrAt[nearHits[0].alertId] = baseMs;

    // 2. 20秒後に160.0を上抜け突破（接近クールダウン中でも突破は読み上げる）
    const breakHits = detectSupportResistanceHits(
      [{ name: "USD/JPY", value: 160.08, change: 0.7, changePercent: 0.45 }],
      { "USD/JPY": 159.92 },
      levels,
      settings,
      lastSrAt,
      baseMs + 20_000
    );
    expect(breakHits).toHaveLength(1);
    expect(breakHits[0].speechText).toContain("上抜け突破しました");

    // 3. 初回監視時に既にサポートを割り込んでいる場合（prevPriceなし）は「下抜け」と読み上げる
    const exceededSupportHits = detectSupportResistanceHits(
      [{ name: "USD/JPY", value: 157.85, change: -0.9, changePercent: -0.55 }],
      {},
      levels,
      settings,
      {},
      baseMs
    );
    expect(exceededSupportHits).toHaveLength(1);
    expect(exceededSupportHits[0].speechText).toContain("サポレジ下抜け");
    expect(exceededSupportHits[0].speechText).toContain("割り込んで推移しています");
  });
});
