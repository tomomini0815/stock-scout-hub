// Mock stock data for the application

export interface StockData {
  code: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface NewsItem {
  id: number;
  time: string;
  title: string;
  category: string;
  isHot?: boolean;
  isNew?: boolean;
}

export const marketIndices: MarketIndex[] = [
  { name: "日経平均", value: 39098.68, change: 435.62, changePercent: 1.13 },
  { name: "TOPIX", value: 2768.54, change: 28.17, changePercent: 1.03 },
  { name: "マザーズ", value: 682.35, change: -5.42, changePercent: -0.79 },
  { name: "JPX400", value: 18234.56, change: 156.78, changePercent: 0.87 },
  { name: "NYダウ", value: 44544.66, change: 317.24, changePercent: 0.72 },
  { name: "NASDAQ", value: 19924.49, change: 188.57, changePercent: 0.96 },
  { name: "S&P500", value: 6083.57, change: 42.36, changePercent: 0.70 },
  { name: "USD/JPY", value: 151.82, change: -0.34, changePercent: -0.22 },
];

export const featuredStock: StockData = {
  code: "7203",
  name: "トヨタ自動車",
  market: "東証プライム",
  price: 2847.5,
  change: 62.5,
  changePercent: 2.24,
  volume: 18432500,
  open: 2798.0,
  high: 2865.0,
  low: 2785.0,
  previousClose: 2785.0,
};

export const generateCandleData = (): CandleData[] => {
  const data: CandleData[] = [];
  let basePrice = 2600;
  const startDate = new Date(2025, 10, 1);

  for (let i = 0; i < 60; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const volatility = 30 + Math.random() * 40;
    const trend = Math.sin(i / 10) * 15 + (Math.random() - 0.45) * 20;
    basePrice += trend;

    const open = basePrice + (Math.random() - 0.5) * volatility * 0.5;
    const close = basePrice + (Math.random() - 0.5) * volatility * 0.5;
    const high = Math.max(open, close) + Math.random() * volatility * 0.4;
    const low = Math.min(open, close) - Math.random() * volatility * 0.4;

    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      open: Math.round(open * 10) / 10,
      high: Math.round(high * 10) / 10,
      low: Math.round(low * 10) / 10,
      close: Math.round(close * 10) / 10,
      volume: Math.round(8000000 + Math.random() * 15000000),
    });
  }
  return data;
};

export const topGainers: StockData[] = [
  { code: "6758", name: "ソニーグループ", market: "プライム", price: 13250, change: 580, changePercent: 4.58, volume: 8234500, open: 12750, high: 13300, low: 12700, previousClose: 12670 },
  { code: "6861", name: "キーエンス", market: "プライム", price: 68450, change: 2350, changePercent: 3.56, volume: 1234500, open: 66500, high: 68700, low: 66200, previousClose: 66100 },
  { code: "9984", name: "ソフトバンクG", market: "プライム", price: 8956, change: 298, changePercent: 3.44, volume: 25678900, open: 8700, high: 8980, low: 8650, previousClose: 8658 },
  { code: "4063", name: "信越化学工業", market: "プライム", price: 5823, change: 178, changePercent: 3.15, volume: 4567800, open: 5680, high: 5850, low: 5660, previousClose: 5645 },
  { code: "8035", name: "東京エレクトロン", market: "プライム", price: 25340, change: 740, changePercent: 3.01, volume: 3456700, open: 24800, high: 25400, low: 24700, previousClose: 24600 },
  { code: "7741", name: "HOYA", market: "プライム", price: 18920, change: 520, changePercent: 2.83, volume: 1890000, open: 18500, high: 18950, low: 18450, previousClose: 18400 },
  { code: "6902", name: "デンソー", market: "プライム", price: 2156, change: 56, changePercent: 2.67, volume: 5678900, open: 2110, high: 2165, low: 2100, previousClose: 2100 },
  { code: "7203", name: "トヨタ自動車", market: "プライム", price: 2847, change: 62, changePercent: 2.24, volume: 18432500, open: 2798, high: 2865, low: 2785, previousClose: 2785 },
];

export const topLosers: StockData[] = [
  { code: "3382", name: "セブン&アイ", market: "プライム", price: 2034, change: -98, changePercent: -4.60, volume: 12345600, open: 2140, high: 2150, low: 2020, previousClose: 2132 },
  { code: "4502", name: "武田薬品工業", market: "プライム", price: 4123, change: -156, changePercent: -3.64, volume: 8765400, open: 4280, high: 4290, low: 4100, previousClose: 4279 },
  { code: "9433", name: "KDDI", market: "プライム", price: 4567, change: -145, changePercent: -3.08, volume: 6543200, open: 4720, high: 4730, low: 4550, previousClose: 4712 },
  { code: "2914", name: "日本たばこ産業", market: "プライム", price: 4230, change: -120, changePercent: -2.76, volume: 4321000, open: 4350, high: 4360, low: 4210, previousClose: 4350 },
  { code: "8306", name: "三菱UFJ", market: "プライム", price: 1654, change: -42, changePercent: -2.48, volume: 34567800, open: 1700, high: 1705, low: 1645, previousClose: 1696 },
  { code: "9432", name: "日本電信電話", market: "プライム", price: 178.5, change: -4.2, changePercent: -2.30, volume: 45678900, open: 183, high: 183.5, low: 178, previousClose: 182.7 },
  { code: "4503", name: "アステラス製薬", market: "プライム", price: 1567, change: -34, changePercent: -2.12, volume: 7654300, open: 1605, high: 1610, low: 1560, previousClose: 1601 },
  { code: "7267", name: "本田技研工業", market: "プライム", price: 1423, change: -28, changePercent: -1.93, volume: 9876500, open: 1455, high: 1458, low: 1418, previousClose: 1451 },
];

export const activeStocks: StockData[] = [
  { code: "8306", name: "三菱UFJ", market: "プライム", price: 1654, change: -42, changePercent: -2.48, volume: 34567800, open: 1700, high: 1705, low: 1645, previousClose: 1696 },
  { code: "9432", name: "日本電信電話", market: "プライム", price: 178.5, change: -4.2, changePercent: -2.30, volume: 45678900, open: 183, high: 183.5, low: 178, previousClose: 182.7 },
  { code: "9984", name: "ソフトバンクG", market: "プライム", price: 8956, change: 298, changePercent: 3.44, volume: 25678900, open: 8700, high: 8980, low: 8650, previousClose: 8658 },
  { code: "7203", name: "トヨタ自動車", market: "プライム", price: 2847, change: 62, changePercent: 2.24, volume: 18432500, open: 2798, high: 2865, low: 2785, previousClose: 2785 },
  { code: "3382", name: "セブン&アイ", market: "プライム", price: 2034, change: -98, changePercent: -4.60, volume: 12345600, open: 2140, high: 2150, low: 2020, previousClose: 2132 },
];

export const newsItems: NewsItem[] = [
  { id: 1, time: "15:30", title: "日経平均は大幅続伸、米株高と円安を好感し435円高", category: "市況", isHot: true },
  { id: 2, time: "15:15", title: "トヨタ自動車、2025年3月期の営業利益予想を上方修正", category: "決算", isNew: true },
  { id: 3, time: "14:58", title: "ソニーG、PS5の累計販売台数が7000万台を突破", category: "企業" },
  { id: 4, time: "14:42", title: "東京エレクトロン、AI半導体向け装置の受注が過去最高に", category: "企業", isHot: true },
  { id: 5, time: "14:30", title: "信越化学、シリコンウエハー値上げを発表 来期から", category: "企業" },
  { id: 6, time: "14:15", title: "セブン&アイ、買収提案に対する防衛策を検討", category: "M&A", isHot: true },
  { id: 7, time: "13:58", title: "マザーズ指数は小幅反落、利益確定売りが優勢", category: "市況" },
  { id: 8, time: "13:40", title: "KDDI、5G基地局の整備計画を前倒し 設備投資増加へ", category: "企業" },
  { id: 9, time: "13:25", title: "日本銀行、長期金利の変動幅拡大を検討との報道", category: "金融", isNew: true },
  { id: 10, time: "13:10", title: "キーエンス、FA機器の海外売上比率が過去最高に", category: "決算" },
  { id: 11, time: "12:55", title: "三菱UFJ、米国事業の再編成を発表", category: "金融" },
  { id: 12, time: "12:40", title: "武田薬品、新薬候補の臨床試験結果は「期待外れ」", category: "医薬品" },
];
