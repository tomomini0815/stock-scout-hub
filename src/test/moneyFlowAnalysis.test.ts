import { describe, it, expect } from "vitest";
import {
  analyzeFlowNews,
  buildGlobalMoneyFlow,
  buildSectorMoneyFlow,
  SECTOR_STOCK_SEEDS,
} from "@/lib/moneyFlowAnalysis";
import { defaultMacroAssets } from "@/hooks/useLiveMarketData";
import { marketIndices, type MarketIndex, type NewsItem } from "@/data/stockData";

describe("moneyFlowAnalysis", () => {
  it("computes 8 global cups including US bonds, USD, and WTI oil with valid rankings", () => {
    const result = buildGlobalMoneyFlow(marketIndices, defaultMacroAssets);
    expect(result.cups).toHaveLength(8);
    expect(result.reasons).toHaveLength(3);
    expect(result.headline.length).toBeGreaterThan(10);

    const ids = result.cups.map((c) => c.id);
    expect(ids).toContain("us-bond");
    expect(ids).toContain("usd-cash");
    expect(ids).toContain("oil-commodity");

    const ranks = result.cups.map((c) => c.rank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    for (const cup of result.cups) {
      expect(cup.waterLevel).toBeGreaterThanOrEqual(14);
      expect(cup.waterLevel).toBeLessThanOrEqual(95);
      expect(cup.currentReason.length).toBeGreaterThan(10);
      expect(cup.structuralBackground.length).toBeGreaterThan(10);
      expect(cup.watchPoints.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("detects risk-off regime and puts US bonds / USD / GOLD highest when equities drop", () => {
    const riskOffIndices: MarketIndex[] = [
      { name: "日経平均", value: 37500, change: -750, changePercent: -1.96 },
      { name: "TOPIX", value: 2650, change: -45, changePercent: -1.67 },
      { name: "NYダウ", value: 43200, change: -620, changePercent: -1.41 },
      { name: "NASDAQ", value: 18900, change: -480, changePercent: -2.48 },
      { name: "S&P500", value: 5880, change: -98, changePercent: -1.64 },
      { name: "USD/JPY", value: 147.2, change: -1.8, changePercent: -1.21 },
      { name: "GOLD", value: 2510, change: 42, changePercent: 1.7 },
      { name: "BTC/USDT", value: 61000, change: -2400, changePercent: -3.79 },
    ];
    const riskOffMacro: MarketIndex[] = [
      { name: "米国債(TLT)", value: 95.8, change: 1.9, changePercent: 2.02 },
      { name: "米ドル(DXY)", value: 105.6, change: 0.9, changePercent: 0.86 },
      { name: "原油(WTI)", value: 68.5, change: -1.8, changePercent: -2.56 },
    ];

    const result = buildGlobalMoneyFlow(riskOffIndices, riskOffMacro);
    expect(result.regimeTone).toBe("risk-off");
    const bondCup = result.cups.find((c) => c.id === "us-bond");
    expect(bondCup?.rank).toBe(1);
    expect(bondCup?.waterLevel).toBeGreaterThanOrEqual(75);
  });

  it("computes 6 Japanese sector cups with constituent stocks and reasons", () => {
    const result = buildSectorMoneyFlow(SECTOR_STOCK_SEEDS, marketIndices);
    expect(result.cups).toHaveLength(6);
    expect(result.mode).toBe("sectors");
    expect(result.reasons).toHaveLength(3);

    const aiSemi = result.cups.find((c) => c.id === "ai-semi");
    const defensive = result.cups.find((c) => c.id === "defensive");
    expect(aiSemi).toBeDefined();
    expect(defensive).toBeDefined();
    expect(aiSemi!.waterLevel).toBeGreaterThan(defensive!.waterLevel);
    expect(aiSemi!.constituents?.length).toBe(4);
  });

  it("maps latest financial news to matching cups and generates impact explanations", () => {
    const overview = buildGlobalMoneyFlow(marketIndices, defaultMacroAssets);
    const sampleNews: NewsItem[] = [
      {
        id: 1,
        date: "2026/11/22",
        time: "18:00",
        title: "FRB議長が利下げペースに慎重姿勢、米長期金利と米国債市場が反応",
        category: "金融",
        source: "Reuters",
        url: "https://example.com/1",
        isHot: true,
      },
      {
        id: 2,
        date: "2026/11/22",
        time: "17:30",
        title: "NVIDIA決算受けNASDAQ急伸、AI・半導体関連へ海外勢の買い集中",
        category: "半導体",
        source: "Nikkei",
        url: "https://example.com/2",
        isHot: true,
      },
      {
        id: 3,
        date: "2026/11/22",
        time: "16:00",
        title: "中東情勢緊迫でWTI原油が上昇、安全資産の金価格も堅調",
        category: "市況",
        source: "Bloomberg",
        url: "https://example.com/3",
      },
      {
        id: 4,
        date: "2026/11/22",
        time: "15:00",
        title: "ロト6当せん番号のお知らせ",
        category: "その他",
        source: "Noise",
        url: "https://example.com/4",
      },
    ];

    const { topNews, newsByCupId } = analyzeFlowNews(sampleNews, overview.cups);
    expect(topNews.length).toBe(3);
    expect(topNews.some((n) => n.title.includes("ロト6"))).toBe(false);
    expect(newsByCupId["us-bond"].length).toBeGreaterThan(0);
    expect(newsByCupId["us-tech"].length).toBeGreaterThan(0);
    expect(newsByCupId["oil-commodity"].length).toBeGreaterThan(0);
    expect(topNews[0].impactSummary.length).toBeGreaterThan(20);
  });

  it("prioritizes direct catalysts like AI chip export curbs, corporate espionage, and Trump tariffs", () => {
    const overview = buildGlobalMoneyFlow(marketIndices, defaultMacroAssets);
    const catalystNews: NewsItem[] = [
      {
        id: 10,
        date: "2026/11/22",
        time: "19:00",
        title: "エヌビディア巡るスパイ疑惑報道、米ハイテク株の売り材料に",
        category: "半導体",
        source: "Reuters",
        url: "https://example.com/10",
      },
      {
        id: 11,
        date: "2026/11/22",
        time: "18:30",
        title: "トランプ政権がAI半導体規制と対中関税の強化を検討、市場が警戒",
        category: "市況",
        source: "Bloomberg",
        url: "https://example.com/11",
      },
    ];

    const { topNews, newsByCupId } = analyzeFlowNews(catalystNews, overview.cups);
    expect(topNews).toHaveLength(2);
    expect(topNews.every((n) => n.isDirectCatalyst)).toBe(true);
    expect(topNews.every((n) => n.direction === "bearish")).toBe(true);
    expect(topNews.some((n) => n.impactTag === "企業疑惑・調査リスク")).toBe(true);
    expect(topNews.some((n) => n.impactTag === "AI・半導体規制")).toBe(true);
    expect(newsByCupId["us-tech"].length).toBe(2);
  });

  it("does not mix US-only stock news into Japan equity cup and matches crypto news to crypto cup", () => {
    const overview = buildGlobalMoneyFlow(marketIndices, defaultMacroAssets);
    const mixedNews: NewsItem[] = [
      {
        id: 20,
        date: "2026/11/22",
        time: "19:30",
        title: "NYダウ反落、トランプ政権の関税警戒で米国株に売り圧力",
        category: "市況",
        source: "Reuters",
        url: "https://example.com/20",
      },
      {
        id: 21,
        date: "2026/11/22",
        time: "19:20",
        title: "日経平均は続伸、東証プライムで幅広い日本株に海外勢の買い",
        category: "市況",
        source: "Nikkei",
        url: "https://example.com/21",
      },
      {
        id: 22,
        date: "2026/11/22",
        time: "19:10",
        title: "ビットコイン急伸、暗号資産現物ETFへの資金流入が拡大",
        category: "市況",
        source: "CoinPost",
        url: "https://example.com/22",
      },
    ];

    const { newsByCupId } = analyzeFlowNews(mixedNews, overview.cups);
    expect(newsByCupId["jp-equity"].map((n) => n.title)).toEqual([
      "日経平均は続伸、東証プライムで幅広い日本株に海外勢の買い",
    ]);
    expect(newsByCupId["us-bluechip"].some((n) => n.title.includes("NYダウ反落"))).toBe(true);
    expect(newsByCupId["crypto"].some((n) => n.title.includes("ビットコイン急伸"))).toBe(true);
  });

  it("supports 1D, 1W, and 1M timeframes with distinct rankings when short-term rebounds differ from monthly trend", () => {
    const tfIndices: MarketIndex[] = [
      { name: "日経平均", value: 57800, change: 1400, changePercent: 2.5, changePercent1W: -5.5, changePercent1M: -7.7 },
      { name: "TOPIX", value: 3600, change: 60, changePercent: 1.7, changePercent1W: -3.8, changePercent1M: -5.2 },
      { name: "NYダウ", value: 45000, change: 200, changePercent: 0.4, changePercent1W: -3.2, changePercent1M: -4.8 },
      { name: "NASDAQ", value: 22600, change: 300, changePercent: 1.3, changePercent1W: -10.9, changePercent1M: -14.9 },
      { name: "S&P500", value: 6200, change: 40, changePercent: 0.6, changePercent1W: -4.5, changePercent1M: -6.1 },
      { name: "USD/JPY", value: 152, change: 0.2, changePercent: 0.13, changePercent1W: 0.8, changePercent1M: 1.9 },
      { name: "GOLD", value: 3577, change: 38, changePercent: 1.1, changePercent1W: -7.8, changePercent1M: -11.1 },
      { name: "BTC/USDT", value: 61220, change: 1000, changePercent: 1.7, changePercent1W: -4.6, changePercent1M: -24.8 },
    ];
    const tfMacro: MarketIndex[] = [
      { name: "米国債(TLT)", value: 81.45, change: -0.2, changePercent: -0.25, changePercent1W: 2.7, changePercent1M: 1.4 },
      { name: "米ドル(DXY)", value: 103.84, change: -0.1, changePercent: -0.1, changePercent1W: 0.42, changePercent1M: 2.24 },
      { name: "原油(WTI)", value: 82.64, change: -0.7, changePercent: -0.9, changePercent1W: -6.8, changePercent1M: -16.6 },
    ];

    const daily = buildGlobalMoneyFlow(tfIndices, tfMacro, "1D");
    const weekly = buildGlobalMoneyFlow(tfIndices, tfMacro, "1W");
    const monthly = buildGlobalMoneyFlow(tfIndices, tfMacro, "1M");

    expect(daily.regimeTone).toBe("risk-on");
    expect(weekly.regimeTone).toBe("risk-off");
    expect(monthly.regimeTone).toBe("risk-off");
    expect(weekly.cups.find((c) => c.id === "us-bond")?.rank).toBe(1);
    expect(monthly.cups.find((c) => c.id === "usd-cash")?.rank).toBe(1);
  });

  it("excludes non-financial 'gold' noise such as marigold illumination while matching real gold market news", () => {
    const overview = buildGlobalMoneyFlow(marketIndices, defaultMacroAssets, "1D");
    const goldNews: NewsItem[] = [
      {
        id: 30,
        date: "2026/11/23",
        time: "09:00",
        title: "マリーゴールドの丘イルミネーションが今年も点灯開始",
        category: "その他",
        source: "LocalNews",
        url: "https://example.com/30",
      },
      {
        id: 31,
        date: "2026/11/23",
        time: "08:45",
        title: "ゴールド免許の更新手続きがオンライン化",
        category: "その他",
        source: "LocalNews",
        url: "https://example.com/31",
      },
      {
        id: 32,
        date: "2026/11/23",
        time: "08:30",
        title: "NY金先物が続伸、米実質金利低下で金価格に安全資産買い",
        category: "市況",
        source: "Reuters",
        url: "https://example.com/32",
      },
    ];

    const { topNews, newsByCupId } = analyzeFlowNews(goldNews, overview.cups);
    expect(topNews.map((n) => n.title)).toEqual([
      "NY金先物が続伸、米実質金利低下で金価格に安全資産買い",
    ]);
    expect(newsByCupId["gold"].map((n) => n.title)).toEqual([
      "NY金先物が続伸、米実質金利低下で金価格に安全資産買い",
    ]);
  });

  it("sorts topNews and related cup news newest-first by date and time", () => {
    const overview = buildGlobalMoneyFlow(marketIndices, defaultMacroAssets, "1D");
    const unsortedNews: NewsItem[] = [
      {
        id: 40,
        date: "2026/11/21",
        time: "10:00",
        title: "日経平均は反発、東証主力株に買い戻し（古い記事）",
        category: "市況",
        source: "Nikkei",
        url: "https://example.com/40",
      },
      {
        id: 41,
        date: "2026/11/23",
        time: "09:15",
        title: "日経平均が大幅続伸、東証プライム売買代金が拡大（最新記事）",
        category: "市況",
        source: "Nikkei",
        url: "https://example.com/41",
      },
      {
        id: 42,
        date: "2026/11/22",
        time: "18:30",
        title: "日経平均先物が夜間上昇、日本株に追い風（中間の記事）",
        category: "市況",
        source: "Reuters",
        url: "https://example.com/42",
      },
    ];

    const { topNews, newsByCupId } = analyzeFlowNews(unsortedNews, overview.cups);
    expect(topNews.map((n) => n.dateLabel)).toEqual([
      "11/23 09:15",
      "11/22 18:30",
      "11/21 10:00",
    ]);
    expect(newsByCupId["jp-equity"].map((n) => n.dateLabel)).toEqual([
      "11/23 09:15",
      "11/22 18:30",
      "11/21 10:00",
    ]);
  });
});
