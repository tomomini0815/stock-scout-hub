export type MarketIndicatorCategory = "japan" | "us" | "fx" | "rates" | "commodity";

export interface MarketIndicatorCategoryMeta {
  id: MarketIndicatorCategory;
  label: string;
}

export const MARKET_INDICATOR_CATEGORIES: MarketIndicatorCategoryMeta[] = [
  { id: "japan", label: "日本株" },
  { id: "us", label: "米国株" },
  { id: "fx", label: "為替" },
  { id: "rates", label: "金利・恐怖" },
  { id: "commodity", label: "コモディティ・暗号" },
];

export interface ProMarketIndicatorDef {
  name: string;
  category: MarketIndicatorCategory;
  flag: string;
  chartSymbol: string;
  decimals: number;
  unit?: string;
  isCore?: boolean;
  defaultSelected?: boolean;
  focusTags: string[];
  driverUp: string;
  driverDown: string;
}

export const PRO_MARKET_INDICATORS: ProMarketIndicatorDef[] = [
  // 日本株
  {
    name: "日経平均",
    category: "japan",
    flag: "🇯🇵",
    chartSymbol: "^N225",
    decimals: 0,
    isCore: true,
    defaultSelected: true,
    focusTags: ["半導体", "ドル円", "米金利"],
    driverUp: "値がさ半導体・主力株の買い、米株高や円安進行が追い風か確認。",
    driverDown: "値がさハイテク株の売り、米株安や円高・金利上昇の重荷を確認。",
  },
  {
    name: "TOPIX",
    category: "japan",
    flag: "🇯🇵",
    chartSymbol: "1306.T",
    decimals: 2,
    isCore: true,
    defaultSelected: true,
    focusTags: ["銀行", "自動車", "内需"],
    driverUp: "銀行・自動車・内需株など幅広い業種への資金流入を確認。",
    driverDown: "主力バリュー株や金融株の売り、円高・金利低下の影響を確認。",
  },
  {
    name: "東証グロース250",
    category: "japan",
    flag: "🇯🇵",
    chartSymbol: "2516.T",
    decimals: 1,
    defaultSelected: false,
    focusTags: ["新興株", "個人需給", "国内金利"],
    driverUp: "個人投資家のリスク選好回復、国内金利低下や中小型AI株の物色を確認。",
    driverDown: "長期金利上昇やリスク回避に伴う新興グロース株の換金売りを確認。",
  },

  // 米国株
  {
    name: "NYダウ",
    category: "us",
    flag: "🇺🇸",
    chartSymbol: "^DJI",
    decimals: 0,
    isCore: true,
    defaultSelected: true,
    focusTags: ["景気敏感", "決算", "米金利"],
    driverUp: "米景気敏感株や金融株の買い、長期金利の落ち着き・好決算を確認。",
    driverDown: "米景気減速懸念、長期金利上昇、主力バリュー株の利益確定を確認。",
  },
  {
    name: "NASDAQ",
    category: "us",
    flag: "🇺🇸",
    chartSymbol: "^IXIC",
    decimals: 2,
    isCore: true,
    defaultSelected: true,
    focusTags: ["AI", "半導体", "メガテック"],
    driverUp: "AI・半導体・メガテック決算、米長期金利低下が買い材料か確認。",
    driverDown: "米長期金利上昇、AI・半導体株の利益確定、メガテック売りを確認。",
  },
  {
    name: "S&P500",
    category: "us",
    flag: "🇺🇸",
    chartSymbol: "^GSPC",
    decimals: 2,
    isCore: true,
    defaultSelected: true,
    focusTags: ["大型株", "決算", "雇用・物価"],
    driverUp: "米国大型株全体のリスク選好、好決算や米金利低下が追い風か確認。",
    driverDown: "米大型株の広範な売り、金利・景気指標・決算反応の悪化を確認。",
  },
  {
    name: "半導体指数 SOX",
    category: "us",
    flag: "🇺🇸",
    chartSymbol: "^SOX",
    decimals: 2,
    defaultSelected: false,
    focusTags: ["NVIDIA", "AI需要", "製造装置"],
    driverUp: "AIサーバー投資拡大やNVIDIA・半導体製造装置の好材料が追い風。",
    driverDown: "輸出規制懸念、AI投資一服観測、金利上昇による半導体株売りを確認。",
  },
  {
    name: "ラッセル2000",
    category: "us",
    flag: "🇺🇸",
    chartSymbol: "^RUT",
    decimals: 2,
    defaultSelected: false,
    focusTags: ["米中小型", "利下げ", "米景気"],
    driverUp: "FRB利下げ期待や米景気ソフトランディング観測で中小型株へ資金循環。",
    driverDown: "高金利長期化や信用不安、景気減速懸念が中小型株の重荷。",
  },

  // 為替
  {
    name: "USD/JPY",
    category: "fx",
    flag: "💱",
    chartSymbol: "JPY=X",
    decimals: 2,
    isCore: true,
    defaultSelected: true,
    focusTags: ["日米金利差", "FRB", "日銀"],
    driverUp: "ドル高・円安方向。日米金利差拡大、FRBタカ派発言、米指標上振れを確認。",
    driverDown: "ドル安・円高方向。米金利低下、日銀正常化観測、為替介入警戒を確認。",
  },
  {
    name: "EUR/JPY",
    category: "fx",
    flag: "💱",
    chartSymbol: "EURJPY=X",
    decimals: 2,
    defaultSelected: false,
    focusTags: ["欧州金利", "ECB", "リスク選好"],
    driverUp: "リスクオンの円売り・ユーロ買い。ECB金融政策や欧州株高を確認。",
    driverDown: "リスク回避の円買い戻し、欧州景気指標の悪化や金利低下を確認。",
  },
  {
    name: "米ドル指数 DXY",
    category: "fx",
    flag: "🇺🇸",
    chartSymbol: "DX-Y.NYB",
    decimals: 2,
    defaultSelected: false,
    focusTags: ["ドル強弱", "米金利", "安全資産"],
    driverUp: "米金利上昇やリスク回避によるドル全面高。新興国株や金には逆風。",
    driverDown: "米利下げ観測やリスク選好回復によるドル安。株・金・資源には追い風。",
  },

  // 金利・恐怖
  {
    name: "米10年国債利回り",
    category: "rates",
    flag: "🇺🇸",
    chartSymbol: "^TNX",
    decimals: 3,
    unit: "%",
    defaultSelected: false,
    focusTags: ["FRB", "インフレ", "グロース株"],
    driverUp: "金利上昇（債券安）。インフレ懸念や財政警戒でハイテク株の重荷になりやすい。",
    driverDown: "金利低下（債券高）。利下げ観測や安全資産買いでグロース株に追い風。",
  },
  {
    name: "米5年国債利回り",
    category: "rates",
    flag: "🇺🇸",
    chartSymbol: "^FVX",
    decimals: 3,
    unit: "%",
    defaultSelected: false,
    focusTags: ["政策金利", "利下げ織込", "中期金利"],
    driverUp: "FRBの利下げ後退観測を反映。ドル高要因となりやすい動き。",
    driverDown: "早期利下げ観測の高まりや米景気指標の鈍化を織り込む動き。",
  },
  {
    name: "恐怖指数 VIX",
    category: "rates",
    flag: "⚠️",
    chartSymbol: "^VIX",
    decimals: 2,
    defaultSelected: false,
    focusTags: ["警戒感", "オプション", "急落リスク"],
    driverUp: "市場の警戒感が上昇（20超えはリスク回避警戒）。ヘッジ需要の増加を確認。",
    driverDown: "市場心理の落ち着き。リスク選好回復や押し目買いの入りやすい地合い。",
  },

  // コモディティ・暗号資産
  {
    name: "GOLD",
    category: "commodity",
    flag: "🥇",
    chartSymbol: "GC=F",
    decimals: 2,
    isCore: true,
    defaultSelected: true,
    focusTags: ["実質金利", "ドル", "地政学"],
    driverUp: "米実質金利低下、ドル安、地政学リスク・中央銀行買いを確認。",
    driverDown: "米実質金利上昇、ドル高、リスク選好回復による利益確定売りを確認。",
  },
  {
    name: "原油 WTI",
    category: "commodity",
    flag: "🛢️",
    chartSymbol: "CL=F",
    decimals: 2,
    defaultSelected: false,
    focusTags: ["地政学", "OPEC+", "インフレ"],
    driverUp: "中東情勢緊迫や供給引き締め懸念。エネルギー株に追い風、インフレ警戒材料。",
    driverDown: "世界景気減速懸念や在庫増加による軟調。運輸・内需コストには追い風。",
  },
  {
    name: "銅先物 Copper",
    category: "commodity",
    flag: "🔶",
    chartSymbol: "HG=F",
    decimals: 3,
    defaultSelected: false,
    focusTags: ["世界景気", "中国需要", "データセンター"],
    driverUp: "世界製造業の回復期待、中国景気刺激策、AIデータセンター電力需要が追い風。",
    driverDown: "中国指標の悪化や世界景気減速懸念、ドル高が非鉄金属の重荷。",
  },
  {
    name: "BTC/USDT",
    category: "commodity",
    flag: "₿",
    chartSymbol: "BTC-USD",
    decimals: 2,
    isCore: true,
    defaultSelected: true,
    focusTags: ["ETFフロー", "米金利", "リスク資産"],
    driverUp: "現物ETF資金流入、米金利低下、リスク資産全般への買い戻しを確認。",
    driverDown: "ETF資金流出、米金利上昇、リスク回避によるレバレッジ解消売りを確認。",
  },
];

export const PRO_INDICATOR_BY_NAME: Record<string, ProMarketIndicatorDef> = Object.fromEntries(
  PRO_MARKET_INDICATORS.map((item) => [item.name, item])
);

export const DEFAULT_SELECTED_INDICATORS: string[] = PRO_MARKET_INDICATORS.filter(
  (item) => item.defaultSelected
).map((item) => item.name);

export const PRO_PRESET_INDICATORS: string[] = [
  "日経平均",
  "TOPIX",
  "NYダウ",
  "NASDAQ",
  "S&P500",
  "半導体指数 SOX",
  "USD/JPY",
  "米10年国債利回り",
  "恐怖指数 VIX",
  "GOLD",
  "原油 WTI",
  "BTC/USDT",
];

export const ALL_INDICATOR_NAMES: string[] = PRO_MARKET_INDICATORS.map((item) => item.name);

const SELECTED_INDICATORS_STORAGE_KEY = "stock-scout-selected-market-indicators-v1";

export const loadSelectedMarketIndicators = (): string[] => {
  if (typeof window === "undefined") return DEFAULT_SELECTED_INDICATORS;
  try {
    const raw = localStorage.getItem(SELECTED_INDICATORS_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTED_INDICATORS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SELECTED_INDICATORS;
    const valid = parsed.filter(
      (name): name is string => typeof name === "string" && Boolean(PRO_INDICATOR_BY_NAME[name])
    );
    return valid.length > 0 ? valid : DEFAULT_SELECTED_INDICATORS;
  } catch {
    return DEFAULT_SELECTED_INDICATORS;
  }
};

export const saveSelectedMarketIndicators = (names: string[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_INDICATORS_STORAGE_KEY, JSON.stringify(names));
  } catch {
    // ignore storage quota errors
  }
};

export interface ExtraIndicatorSnapshot {
  value: number;
  change: number;
  changePercent: number;
  points: number[];
}

export const computeIndicatorSnapshotFromCandles = (
  candles: Array<{ date?: string; close?: number }>
): ExtraIndicatorSnapshot | null => {
  const valid = candles.filter(
    (c): c is { date?: string; close: number } =>
      typeof c.close === "number" && Number.isFinite(c.close) && c.close > 0
  );
  if (valid.length < 2) return null;

  const latest = valid[valid.length - 1];
  const latestDay = latest.date?.slice(0, 10);

  // 直前営業日の最終終値を基準（前日比）として算出
  let prevClose = valid[0].close;
  if (latestDay) {
    for (let i = valid.length - 2; i >= 0; i -= 1) {
      const day = valid[i].date?.slice(0, 10);
      if (day && day !== latestDay) {
        prevClose = valid[i].close;
        break;
      }
    }
  } else {
    prevClose = valid[Math.max(0, valid.length - 20)].close;
  }

  const change = latest.close - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    value: latest.close,
    change,
    changePercent,
    points: valid.slice(-44).map((c) => c.close),
  };
};
