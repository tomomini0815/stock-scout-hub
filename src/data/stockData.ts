// Baseline stock universe and curated investment notes for the application.

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
  date?: string;
  time: string;
  title: string;
  category: string;
  source?: string;
  provider?: string;
  url?: string;
  summary?: string;
  isHot?: boolean;
  isNew?: boolean;
}

export interface FundamentalPick {
  code: string;
  name: string;
  market: string;
  chartSymbol: string;
  chartApiSymbol: string;
  recommendation: "買い候補" | "押し目待ち" | "監視" | "成長期待";
  score: number;
  updatedAt: string;
  thesis: string;
  fundamentals: {
    label: string;
    value: string;
    tone?: "positive" | "neutral";
  }[];
  reasons: string[];
  risks: string[];
  source: {
    label: string;
    url: string;
  };
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
  { name: "GOLD", value: 2325.4, change: 0, changePercent: 0 },
  { name: "BTC/USDT", value: 65000, change: 0, changePercent: 0 },
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

export const stockUniverse: StockData[] = [
  ...topGainers,
  ...topLosers,
  ...activeStocks,
  { code: "6857", name: "アドバンテスト", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "6146", name: "ディスコ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "5803", name: "フジクラ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "6723", name: "ルネサスエレクトロニクス", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "6315", name: "TOWA", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "5801", name: "古河電気工業", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "5802", name: "住友電気工業", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "4813", name: "ACCESS", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "3687", name: "フィックスターズ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { code: "285A", name: "キオクシアHD", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
].filter((stock, index, stocks) => stocks.findIndex((item) => item.code === stock.code) === index);

export const fundamentalPicks: FundamentalPick[] = [
  {
    code: "7203",
    name: "トヨタ自動車",
    market: "東証プライム",
    chartSymbol: "TSE:7203",
    chartApiSymbol: "7203.T",
    recommendation: "買い候補",
    score: 88,
    updatedAt: "2026/06/29",
    thesis:
      "ハイブリッド車の収益力、厚い営業キャッシュフロー、継続的な株主還元を評価。為替感応度は高いものの、量産力と財務余力が下値耐性を支える。",
    fundamentals: [
      { label: "直近通期売上収益", value: "約48.0兆円", tone: "positive" },
      { label: "営業利益", value: "約4.8兆円", tone: "positive" },
      { label: "純利益", value: "約4.8兆円", tone: "positive" },
      { label: "注目指標", value: "HV比率・還元余力", tone: "neutral" },
    ],
    reasons: [
      "世界販売台数とハイブリッド需要が利益を押し上げやすい。",
      "研究開発と電動化投資を続けながら高水準の利益を維持している。",
      "円安局面では輸出採算の追い風が入りやすい。",
    ],
    risks: [
      "急な円高は利益予想の下振れ要因。",
      "リコール、関税、EV競争激化で評価が圧迫される可能性。",
    ],
    source: {
      label: "Toyota IR Financial Results",
      url: "https://global.toyota/en/ir/financial-results/",
    },
  },
  {
    code: "6758",
    name: "ソニーグループ",
    market: "東証プライム",
    chartSymbol: "TSE:6758",
    chartApiSymbol: "6758.T",
    recommendation: "買い候補",
    score: 84,
    updatedAt: "2026/06/29",
    thesis:
      "ゲーム、音楽、映画、イメージセンサーの複数エンジンで利益源が分散。IP資産と半導体需要の両方を取り込める点を評価。",
    fundamentals: [
      { label: "直近通期売上高", value: "約13.0兆円", tone: "positive" },
      { label: "営業利益", value: "約1.4兆円", tone: "positive" },
      { label: "純利益", value: "約1.1兆円", tone: "positive" },
      { label: "注目指標", value: "IP収益・センサー需要", tone: "neutral" },
    ],
    reasons: [
      "音楽・映画のIP収益が景気変動に対する緩衝材になりやすい。",
      "ゲームのネットワーク収益とセンサーの高付加価値化が中期成長を支える。",
      "事業ポートフォリオが広く、単一市況への依存が相対的に低い。",
    ],
    risks: [
      "ゲーム機サイクル後半の販売鈍化。",
      "スマホ向けセンサー需要の変動と為替影響。",
    ],
    source: {
      label: "Sony IR Financial Results",
      url: "https://www.sony.com/en/SonyInfo/IR/library/presen/er/",
    },
  },
  {
    code: "285A",
    name: "キオクシアHD",
    market: "東証プライム",
    chartSymbol: "TSE:285A",
    chartApiSymbol: "285A.T",
    recommendation: "買い候補",
    score: 82,
    updatedAt: "2026/06/29",
    thesis:
      "NANDフラッシュ大手として、AIサーバーとデータセンター向けSSD需要の拡大を取り込める候補。直近の公開業績では売上収益、Non-GAAP営業利益、営業キャッシュフローが前期比で大きく改善しており、本日のおすすめに追加。",
    fundamentals: [
      { label: "直近通期売上収益", value: "約2.34兆円", tone: "positive" },
      { label: "Non-GAAP営業利益", value: "約8,762億円", tone: "positive" },
      { label: "営業CF", value: "約6,165億円", tone: "positive" },
      { label: "成長テーマ", value: "AIサーバーSSD", tone: "neutral" },
    ],
    reasons: [
      "AIサーバー、データセンター、高性能SSDの需要拡大はNANDメモリ市況の追い風になりやすい。",
      "公開業績ハイライトでFY2025の売上収益とNon-GAAP営業利益がFY2024から改善している。",
      "IPO後の上場履歴が短く値動きは大きいが、メモリ市況回復局面では業績感応度が高い。",
    ],
    risks: [
      "NAND価格と在庫循環の影響が大きく、メモリ市況悪化時は利益が急変しやすい。",
      "上場後の値動きが大きく、AIテーマ先行で短期的な過熱や急落が起きやすい。",
    ],
    source: {
      label: "Kioxia IR Financial Highlights",
      url: "https://www.kioxia-holdings.com/ja-jp/ir/earnings/highlights.html",
    },
  },
  {
    code: "8035",
    name: "東京エレクトロン",
    market: "東証プライム",
    chartSymbol: "TSE:8035",
    chartApiSymbol: "8035.T",
    recommendation: "押し目待ち",
    score: 80,
    updatedAt: "2026/06/29",
    thesis:
      "AI半導体と先端ロジック投資の恩恵を受ける代表銘柄。収益性は高いが半導体サイクルの振れが大きいため、押し目での監視を優先。",
    fundamentals: [
      { label: "直近通期売上高", value: "約2.43兆円", tone: "positive" },
      { label: "営業利益", value: "約0.70兆円", tone: "positive" },
      { label: "営業利益率", value: "約29%", tone: "positive" },
      { label: "注目指標", value: "AI向け装置需要", tone: "neutral" },
    ],
    reasons: [
      "高い営業利益率があり、装置需要回復時の利益感応度が大きい。",
      "AIサーバー、HBM、先端プロセス投資の中期テーマに乗る。",
      "財務体質が強く、サイクル悪化時も研究開発を継続しやすい。",
    ],
    risks: [
      "半導体設備投資の延期で受注が鈍化する可能性。",
      "米中規制や顧客集中による業績の振れ。",
    ],
    source: {
      label: "Tokyo Electron IR Library",
      url: "https://www.tel.com/ir/library/",
    },
  },
];

export const futureGrowthPicks: FundamentalPick[] = [
  {
    code: "6857",
    name: "アドバンテスト",
    market: "東証プライム",
    chartSymbol: "TSE:6857",
    chartApiSymbol: "6857.T",
    recommendation: "成長期待",
    score: 87,
    updatedAt: "2026/06/29",
    thesis:
      "AI半導体、HBM、先端パッケージ向けのテスト需要が中期の成長ドライバー。半導体サイクルの振れは大きいが、生成AI投資の継続で受注環境の改善余地を評価。",
    fundamentals: [
      { label: "成長テーマ", value: "AI半導体テスト", tone: "positive" },
      { label: "収益ドライバー", value: "SoC・メモリ検査", tone: "positive" },
      { label: "注目指標", value: "受注高・粗利率", tone: "neutral" },
      { label: "投資視点", value: "押し目監視", tone: "neutral" },
    ],
    reasons: [
      "AIアクセラレーターとHBMの増加で、検査工程の重要度が高まっている。",
      "高性能半導体ほどテスト時間と装置需要が増えやすく、単価上昇の恩恵を受けやすい。",
      "半導体製造装置の中でもAI投資との連動性が強い。",
    ],
    risks: [
      "顧客の設備投資延期で受注が急減する可能性。",
      "株価がAIテーマを先取りしやすく、決算未達時の下落幅が大きい。",
    ],
    source: {
      label: "Advantest IR",
      url: "https://www.advantest.com/investors/",
    },
  },
  {
    code: "6146",
    name: "ディスコ",
    market: "東証プライム",
    chartSymbol: "TSE:6146",
    chartApiSymbol: "6146.T",
    recommendation: "成長期待",
    score: 85,
    updatedAt: "2026/06/29",
    thesis:
      "半導体ウェハ切断・研削・研磨で高い競争力を持つ精密装置メーカー。AI半導体の微細化、薄型化、先端パッケージ化が進むほど工程価値が上がりやすい。",
    fundamentals: [
      { label: "成長テーマ", value: "先端パッケージ", tone: "positive" },
      { label: "強み", value: "切断・研削装置", tone: "positive" },
      { label: "注目指標", value: "出荷額・利益率", tone: "neutral" },
      { label: "投資視点", value: "高収益株", tone: "neutral" },
    ],
    reasons: [
      "HBMや先端ロジックでウェハ加工の難度が上がり、同社装置の需要が伸びやすい。",
      "ニッチ領域で競争力が高く、利益率の高さが評価されやすい。",
      "AI向け半導体投資の波が後工程装置にも広がる局面で注目度が上がる。",
    ],
    risks: [
      "受注と出荷が半導体市況に左右されやすい。",
      "高PERで推移しやすく、金利上昇や成長鈍化に弱い。",
    ],
    source: {
      label: "DISCO IR",
      url: "https://www.disco.co.jp/ir/",
    },
  },
  {
    code: "5803",
    name: "フジクラ",
    market: "東証プライム",
    chartSymbol: "TSE:5803",
    chartApiSymbol: "5803.T",
    recommendation: "成長期待",
    score: 83,
    updatedAt: "2026/06/29",
    thesis:
      "生成AIデータセンターの拡大で光ファイバー、光接続部品、電力・通信インフラ需要が増える局面の恩恵を受けやすい。半導体装置株とは異なるAIインフラ枠として注目。",
    fundamentals: [
      { label: "成長テーマ", value: "AIデータセンター", tone: "positive" },
      { label: "収益ドライバー", value: "光通信部品", tone: "positive" },
      { label: "注目指標", value: "情報通信利益", tone: "neutral" },
      { label: "投資視点", value: "インフラ需要", tone: "neutral" },
    ],
    reasons: [
      "AIサーバー増設で高速・大容量通信インフラの需要が増えやすい。",
      "光関連部品はデータセンター投資の継続性と相性が良い。",
      "半導体装置だけでなく通信インフラ側からAI需要を取り込める。",
    ],
    risks: [
      "データセンター投資計画の後ろ倒しで成長期待が剥落する可能性。",
      "銅価格、為替、海外需要の変動で利益がぶれやすい。",
    ],
    source: {
      label: "Fujikura IR",
      url: "https://www.fujikura.co.jp/eng/ir/",
    },
  },
  {
    code: "6723",
    name: "ルネサスエレクトロニクス",
    market: "東証プライム",
    chartSymbol: "TSE:6723",
    chartApiSymbol: "6723.T",
    recommendation: "成長期待",
    score: 84,
    updatedAt: "2026/06/29",
    thesis:
      "株価水準が大型半導体株ほど高くなく、車載・産業・エッジAI半導体の回復局面を取り込める候補。自動車の電動化、ADAS、産業機器の在庫調整一巡を見込むなら監視価値が高い。",
    fundamentals: [
      { label: "株価帯", value: "5,000円未満", tone: "positive" },
      { label: "成長テーマ", value: "車載・エッジAI", tone: "positive" },
      { label: "収益ドライバー", value: "MCU・SoC", tone: "positive" },
      { label: "注目指標", value: "車載受注・在庫", tone: "neutral" },
    ],
    reasons: [
      "車載半導体はEVだけでなくHV、ADAS、ソフトウェア定義車両でも搭載点数が増えやすい。",
      "在庫調整後の回復局面では、利益率の改善と評価倍率の見直しが同時に起きやすい。",
      "株価が数千円台で、半導体大型株よりも個人投資家が入りやすい価格帯にある。",
    ],
    risks: [
      "自動車生産の鈍化や顧客在庫の長期化で回復が遅れる可能性。",
      "為替、買収統合費用、半導体サイクルの変動に影響されやすい。",
    ],
    source: {
      label: "Renesas Investor Relations",
      url: "https://www.renesas.com/us/en/about/investor-relations",
    },
  },
  {
    code: "6315",
    name: "TOWA",
    market: "東証プライム",
    chartSymbol: "TSE:6315",
    chartApiSymbol: "6315.T",
    recommendation: "成長期待",
    score: 83,
    updatedAt: "2026/06/29",
    thesis:
      "半導体封止装置・モールディング装置の専業色が強く、HBMや先端パッケージ需要の広がりで後工程投資の恩恵を受けやすい。株価は半導体主力装置株より手掛けやすい水準。",
    fundamentals: [
      { label: "株価帯", value: "3,000円台", tone: "positive" },
      { label: "成長テーマ", value: "先端後工程", tone: "positive" },
      { label: "収益ドライバー", value: "封止・成形装置", tone: "positive" },
      { label: "注目指標", value: "受注・粗利率", tone: "neutral" },
    ],
    reasons: [
      "AI半導体はチップレット化・先端パッケージ化が進み、後工程装置の重要度が上がりやすい。",
      "半導体を樹脂で封止する工程は信頼性確保に不可欠で、TOWAの中核領域と合う。",
      "数千円台の価格帯で、半導体テーマの中では比較的エントリーしやすい。",
    ],
    risks: [
      "半導体設備投資が後ろ倒しになると受注が急減しやすい。",
      "テーマ人気が先行した局面では、決算期待未達時の下落が大きい。",
    ],
    source: {
      label: "TOWA IR Information",
      url: "https://www.towajapan.co.jp/en/ir/",
    },
  },
  {
    code: "5801",
    name: "古河電気工業",
    market: "東証プライム",
    chartSymbol: "TSE:5801",
    chartApiSymbol: "5801.T",
    recommendation: "成長期待",
    score: 82,
    updatedAt: "2026/06/29",
    thesis:
      "光ファイバー、光部品、電力ケーブル、熱対策部材など、AIデータセンター拡大で必要になる周辺インフラを複数持つ。株価は大型AI半導体株ほど高くなく、出遅れインフラ枠として監視。",
    fundamentals: [
      { label: "株価帯", value: "5,000円未満", tone: "positive" },
      { label: "成長テーマ", value: "AIデータセンター", tone: "positive" },
      { label: "収益ドライバー", value: "光・電力・冷却", tone: "positive" },
      { label: "注目指標", value: "通信/電力利益", tone: "neutral" },
    ],
    reasons: [
      "データセンターは演算半導体だけでなく、光通信、電力、冷却の投資が同時に増えやすい。",
      "同社は光ソリューション、デジタルインフラ、エネルギーインフラの接点を持つ。",
      "AI半導体株の代替として、周辺インフラ側の再評価余地がある。",
    ],
    risks: [
      "通信・電力インフラ投資のタイミングが遅れると業績反映も遅くなる。",
      "銅価格、為替、海外需要の変動で利益がぶれやすい。",
    ],
    source: {
      label: "Furukawa Electric IR",
      url: "https://www.furukawaelectric.com/en/ir/",
    },
  },
  {
    code: "5802",
    name: "住友電気工業",
    market: "東証プライム",
    chartSymbol: "TSE:5802",
    chartApiSymbol: "5802.T",
    recommendation: "成長期待",
    score: 81,
    updatedAt: "2026/06/29",
    thesis:
      "情報通信、環境エネルギー、自動車の3テーマにまたがる総合インフラ株。AIデータセンターの光・電力投資と、車載ワイヤーハーネス/電動化需要を同時に見られる低〜中価格帯候補。",
    fundamentals: [
      { label: "株価帯", value: "3,000円前後", tone: "positive" },
      { label: "成長テーマ", value: "通信・電力・車載", tone: "positive" },
      { label: "収益ドライバー", value: "光/電力/自動車", tone: "positive" },
      { label: "注目指標", value: "設備投資需要", tone: "neutral" },
    ],
    reasons: [
      "データセンター関連の情報通信・電力エネルギーと、自動車電動化の両方を見られる。",
      "半導体装置株より値動きが相対的に分散しやすく、中期テーマ枠に置きやすい。",
      "株価が数千円台で、配当・大型株としての下値耐性も意識しやすい。",
    ],
    risks: [
      "自動車生産や資源価格の変動で短期利益がぶれやすい。",
      "大型株のため、急騰よりも中期のじわりとした評価改善になりやすい。",
    ],
    source: {
      label: "Sumitomo Electric IR",
      url: "https://sumitomoelectric.com/jp/ir",
    },
  },
  {
    code: "9432",
    name: "日本電信電話",
    market: "東証プライム",
    chartSymbol: "TSE:9432",
    chartApiSymbol: "9432.T",
    recommendation: "監視",
    score: 78,
    updatedAt: "2026/06/29",
    thesis:
      "株価は100円台で、単元でも買いやすい低価格帯。急成長株ではないが、通信インフラ、研究開発、株主還元、AI/IOWN関連の長期材料を分散投資枠として評価。",
    fundamentals: [
      { label: "株価帯", value: "100円台", tone: "positive" },
      { label: "成長テーマ", value: "通信AI・IOWN", tone: "positive" },
      { label: "収益ドライバー", value: "通信/法人DX", tone: "neutral" },
      { label: "投資視点", value: "低価格・大型", tone: "neutral" },
    ],
    reasons: [
      "通信インフラはAI時代のデータ流通量増加と相性が良い。",
      "低価格で分散しやすく、短期テーマ株の過熱を避けたい資金の受け皿になりやすい。",
      "研究開発と法人DX領域の材料が中長期の評価要因になる。",
    ],
    risks: [
      "通信料金、規制、競争環境で成長率は抑えられやすい。",
      "大型株のため短期で大きな値幅を狙う銘柄ではない。",
    ],
    source: {
      label: "NTT Investor Relations",
      url: "https://group.ntt/en/ir/",
    },
  },
  {
    code: "3687",
    name: "フィックスターズ",
    market: "東証プライム",
    chartSymbol: "TSE:3687",
    chartApiSymbol: "3687.T",
    recommendation: "成長期待",
    score: 80,
    updatedAt: "2026/06/29",
    thesis:
      "高速化ソフトウェア、AI、量子コンピューティング周辺のテーマ性があり、株価は数千円台。半導体ハードではなく、計算効率を高めるソフトウェア側の成長候補として追加。",
    fundamentals: [
      { label: "株価帯", value: "3,000円未満", tone: "positive" },
      { label: "成長テーマ", value: "AI/HPC高速化", tone: "positive" },
      { label: "収益ドライバー", value: "高速化ソフト", tone: "positive" },
      { label: "投資視点", value: "高成長小型枠", tone: "neutral" },
    ],
    reasons: [
      "AIの計算需要増加で、GPU/CPUを効率よく使う高速化技術の価値が上がりやすい。",
      "半導体装置株とは違うソフトウェア側のテーマ分散になる。",
      "株価水準が比較的低く、テーマ材料が出た時の感応度が高い。",
    ],
    risks: [
      "小型成長株のため決算のブレや流動性で値動きが荒くなりやすい。",
      "AIテーマ全体が調整すると、成長期待の剥落が早い。",
    ],
    source: {
      label: "Fixstars IR",
      url: "https://www.fixstars.com/en/ir/",
    },
  },
];
