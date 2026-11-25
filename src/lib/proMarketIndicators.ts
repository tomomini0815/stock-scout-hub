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

export interface RelatedJpStockHint {
  code: string;
  name: string;
  relation: string;
  tone: "sync" | "tailwind" | "headwind";
}

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
  newsQuery?: string;
  relatedJpStocks?: RelatedJpStockHint[];
  relatedScreeningIndex?: string;
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
    newsQuery: "日経平均 OR 東京株式市場 when:3d",
    relatedScreeningIndex: "nikkei225",
    relatedJpStocks: [
      { code: "8035", name: "東京エレクトロン", relation: "寄与度大", tone: "sync" },
      { code: "9983", name: "ファーストリテイリング", relation: "寄与度大", tone: "sync" },
      { code: "6857", name: "アドバンテスト", relation: "寄与度大", tone: "sync" },
      { code: "9984", name: "ソフトバンクG", relation: "寄与度大", tone: "sync" },
    ],
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
    newsQuery: "TOPIX OR 東証プライム OR 日本株 when:3d",
    relatedScreeningIndex: "topix",
    relatedJpStocks: [
      { code: "7203", name: "トヨタ自動車", relation: "時価総額首位", tone: "sync" },
      { code: "8306", name: "三菱UFJ", relation: "金融中核", tone: "sync" },
      { code: "6758", name: "ソニーG", relation: "主力大型", tone: "sync" },
      { code: "6501", name: "日立製作所", relation: "重電・IT", tone: "sync" },
    ],
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
    newsQuery: "東証グロース OR グロース250 OR 新興株 when:3d",
    relatedScreeningIndex: "growth250",
    relatedJpStocks: [
      { code: "3697", name: "SHIFT", relation: "DX成長株", tone: "sync" },
      { code: "3778", name: "さくらインターネット", relation: "AIクラウド", tone: "sync" },
      { code: "4385", name: "メルカリ", relation: "グロース代表", tone: "sync" },
      { code: "215A", name: "タイミー", relation: "新興主力", tone: "sync" },
    ],
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
    newsQuery: "NYダウ OR 米国株 OR ダウ平均 when:3d",
    relatedJpStocks: [
      { code: "8058", name: "三菱商事", relation: "景気敏感・商社", tone: "sync" },
      { code: "6301", name: "コマツ", relation: "米建機連動", tone: "sync" },
      { code: "8306", name: "三菱UFJ", relation: "米金融連動", tone: "sync" },
      { code: "7203", name: "トヨタ自動車", relation: "北米景気", tone: "sync" },
    ],
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
    newsQuery: "ナスダック OR NASDAQ OR 米国ハイテク株 when:3d",
    relatedJpStocks: [
      { code: "9984", name: "ソフトバンクG", relation: "AI・テック連動", tone: "sync" },
      { code: "8035", name: "東京エレクトロン", relation: "半導体主力", tone: "sync" },
      { code: "6857", name: "アドバンテスト", relation: "AI半導体検査", tone: "sync" },
      { code: "5803", name: "フジクラ", relation: "AIデータセンター", tone: "sync" },
    ],
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
    newsQuery: "S&P500 OR 米国株市場 when:3d",
    relatedJpStocks: [
      { code: "6501", name: "日立製作所", relation: "グローバル大型", tone: "sync" },
      { code: "6758", name: "ソニーG", relation: "米市場連動", tone: "sync" },
      { code: "6861", name: "キーエンス", relation: "優良大型", tone: "sync" },
      { code: "6098", name: "リクルートHD", relation: "米雇用連動", tone: "sync" },
    ],
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
    newsQuery: "SOX指数 OR 半導体株 OR エヌビディア when:3d",
    relatedJpStocks: [
      { code: "8035", name: "東京エレクトロン", relation: "製造装置首位", tone: "sync" },
      { code: "6857", name: "アドバンテスト", relation: "NVIDIA関連", tone: "sync" },
      { code: "6146", name: "ディスコ", relation: "精密加工装置", tone: "sync" },
      { code: "6920", name: "レーザーテック", relation: "EUV検査装置", tone: "sync" },
    ],
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
    newsQuery: "ラッセル2000 OR 米国中小型株 OR FRB利下げ when:3d",
    relatedScreeningIndex: "growth250",
    relatedJpStocks: [
      { code: "3697", name: "SHIFT", relation: "中小型グロース", tone: "sync" },
      { code: "4385", name: "メルカリ", relation: "米事業・成長株", tone: "sync" },
      { code: "6532", name: "ベイカレント", relation: "中堅成長株", tone: "sync" },
    ],
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
    newsQuery: "ドル円 OR 円安 OR 円高 OR 為替 when:3d",
    relatedJpStocks: [
      { code: "7203", name: "トヨタ自動車", relation: "円安追い風", tone: "tailwind" },
      { code: "4063", name: "信越化学", relation: "円安追い風", tone: "tailwind" },
      { code: "9843", name: "ニトリHD", relation: "円高追い風", tone: "headwind" },
      { code: "3038", name: "神戸物産", relation: "円高追い風", tone: "headwind" },
    ],
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
    newsQuery: "ユーロ円 OR ECB OR 欧州経済 when:3d",
    relatedJpStocks: [
      { code: "6367", name: "ダイキン工業", relation: "欧州売上大", tone: "tailwind" },
      { code: "7751", name: "キヤノン", relation: "欧州外需", tone: "tailwind" },
      { code: "6301", name: "コマツ", relation: "欧州建機", tone: "tailwind" },
    ],
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
    newsQuery: "ドル指数 OR ドル高 OR ドル安 OR FRB when:3d",
    relatedJpStocks: [
      { code: "8058", name: "三菱商事", relation: "ドル安で資源追い風", tone: "headwind" },
      { code: "5713", name: "住友金属鉱山", relation: "ドル安で金・銅追い風", tone: "headwind" },
      { code: "7203", name: "トヨタ自動車", relation: "ドル高・円安連動", tone: "tailwind" },
    ],
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
    newsQuery: "米長期金利 OR 米10年債利回り OR FRB when:3d",
    relatedJpStocks: [
      { code: "8306", name: "三菱UFJ", relation: "金利上昇追い風", tone: "tailwind" },
      { code: "8766", name: "東京海上HD", relation: "金利上昇追い風", tone: "tailwind" },
      { code: "8801", name: "三井不動産", relation: "金利上昇逆風", tone: "headwind" },
      { code: "3697", name: "SHIFT", relation: "金利上昇逆風", tone: "headwind" },
    ],
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
    newsQuery: "米国債利回り OR FRB 利下げ OR FOMC when:3d",
    relatedJpStocks: [
      { code: "8316", name: "三井住友FG", relation: "金利上昇追い風", tone: "tailwind" },
      { code: "8411", name: "みずほFG", relation: "金利上昇追い風", tone: "tailwind" },
      { code: "8802", name: "三菱地所", relation: "金利上昇逆風", tone: "headwind" },
    ],
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
    newsQuery: "VIX指数 OR 恐怖指数 OR 株価急落 OR リスク回避 when:3d",
    relatedJpStocks: [
      { code: "9432", name: "NTT", relation: "ディフェンシブ", tone: "tailwind" },
      { code: "4502", name: "武田薬品", relation: "ディフェンシブ", tone: "tailwind" },
      { code: "9984", name: "ソフトバンクG", relation: "VIX上昇逆風", tone: "headwind" },
    ],
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
    newsQuery: "金価格 OR 金先物 OR ゴールド 相場 when:3d",
    relatedJpStocks: [
      { code: "5713", name: "住友金属鉱山", relation: "国内金鉱山", tone: "tailwind" },
      { code: "5711", name: "三菱マテリアル", relation: "貴金属・非鉄", tone: "tailwind" },
      { code: "5714", name: "DOWA HD", relation: "貴金属リサイクル", tone: "tailwind" },
    ],
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
    newsQuery: "WTI原油 OR 原油価格 OR OPEC when:3d",
    relatedJpStocks: [
      { code: "1605", name: "INPEX", relation: "原油高追い風", tone: "tailwind" },
      { code: "5020", name: "ENEOS HD", relation: "原油高追い風", tone: "tailwind" },
      { code: "9202", name: "ANA HD", relation: "原油高逆風", tone: "headwind" },
      { code: "9201", name: "日本航空", relation: "原油高逆風", tone: "headwind" },
    ],
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
    newsQuery: "銅価格 OR 銅先物 OR 非鉄金属 OR データセンター 電力 when:3d",
    relatedJpStocks: [
      { code: "5713", name: "住友金属鉱山", relation: "銅権益・非鉄", tone: "tailwind" },
      { code: "5803", name: "フジクラ", relation: "電線・DC需要", tone: "tailwind" },
      { code: "5801", name: "古河電気工業", relation: "電線・光ファイバー", tone: "tailwind" },
      { code: "8058", name: "三菱商事", relation: "銅鉱山権益", tone: "tailwind" },
    ],
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
    newsQuery: "ビットコイン OR 暗号資産 OR 仮想通貨 ETF when:3d",
    relatedJpStocks: [
      { code: "8698", name: "マネックスG", relation: "コインチェック", tone: "sync" },
      { code: "8473", name: "SBI HD", relation: "暗号資産事業", tone: "sync" },
      { code: "9449", name: "GMOインターネット", relation: "マイニング・交換所", tone: "sync" },
    ],
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
