import { type MarketIndex, type NewsItem, type StockData } from "@/data/stockData";

export type FlowViewMode = "global" | "sectors";

export type FlowTimeframe = "1D" | "1W" | "1M";

export const FLOW_TIMEFRAME_META: Record<
  FlowTimeframe,
  { label: string; longLabel: string; hint: string; scale: number }
> = {
  "1D": {
    label: "今日",
    longLabel: "今日（1日）",
    hint: "当日のニュース・イベントによる短期の資金移動",
    scale: 1,
  },
  "1W": {
    label: "1週間",
    longLabel: "直近1週間",
    hint: "1日のノイズを除いた今週の本命資金フロー",
    scale: 2.3,
  },
  "1M": {
    label: "1ヶ月",
    longLabel: "直近1ヶ月",
    hint: "機関投資家の中期トレンド・本格的な資金集中先",
    scale: 4.5,
  },
};

export type CupFlowLevel = "concentrated" | "inflow" | "neutral" | "outflow";

export type NewsImpactDirection = "bullish" | "bearish" | "mixed";

export interface FlowNewsImpact {
  id: string;
  title: string;
  source: string;
  dateLabel: string;
  publishedAtMs: number;
  url?: string;
  matchedCupIds: string[];
  matchedCupLabels: string[];
  impactTag: string;
  direction: NewsImpactDirection;
  directionLabel: string;
  isDirectCatalyst: boolean;
  impactSummary: string;
  importanceScore: number;
}

export interface CupConstituent {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  turnoverYen: number;
}

export interface MoneyFlowCup {
  id: string;
  label: string;
  shortLabel: string;
  subtitle: string;
  waterLevel: number; // 14 - 96 (%)
  changePercent: number;
  displayMetric: string;
  flowLevel: CupFlowLevel;
  flowBadge: string;
  rank: number;
  currentReason: string;
  structuralBackground: string;
  watchPoints: string[];
  tags: string[];
  constituents?: CupConstituent[];
}

export interface FlowSummaryReason {
  title: string;
  body: string;
  tone: "hot" | "cool" | "neutral";
}

export interface MoneyFlowOverview {
  mode: FlowViewMode;
  timeframe: FlowTimeframe;
  timeframeLabel: string;
  headline: string;
  regimeLabel: string;
  regimeTone: "risk-on" | "risk-off" | "rotation" | "neutral";
  leadSummary: string;
  reasons: FlowSummaryReason[];
  rotationHint: string;
  cups: MoneyFlowCup[];
}

export interface SectorDefinition {
  id: string;
  label: string;
  shortLabel: string;
  subtitle: string;
  tags: string[];
  structuralBackground: string;
  watchPoints: string[];
  stocks: Array<{ code: string; name: string; fallbackChange: number; fallbackPrice: number; fallbackVolume: number }>;
}

export const SECTOR_CUP_DEFINITIONS: SectorDefinition[] = [
  {
    id: "ai-semi",
    label: "AI・半導体",
    shortLabel: "AI・半導体",
    subtitle: "製造装置・検査・材料",
    tags: ["NVIDIA連動", "SOX指数", "AIサーバー投資"],
    structuralBackground:
      "生成AIデータセンターの設備投資拡大を背景に、日本の強みである半導体製造装置・検査装置・シリコンウエハーへ海外機関投資家の資金が集まりやすい構造です。米NASDAQやSOX指数、為替（円安）との連動性が非常に高いのが特徴です。",
    watchPoints: [
      "米半導体株（SOX指数・NVIDIAなど）の決算と設備投資見通し",
      "米10年債利回りの急上昇（高PERグロース株の重荷になりやすい）",
      "対中半導体規制や輸出管理ニュースの有無",
    ],
    stocks: [
      { code: "8035", name: "東京エレクトロン", fallbackChange: 3.01, fallbackPrice: 25340, fallbackVolume: 3456700 },
      { code: "6857", name: "アドバンテスト", fallbackChange: 2.85, fallbackPrice: 9120, fallbackVolume: 11200000 },
      { code: "6146", name: "ディスコ", fallbackChange: 2.4, fallbackPrice: 42500, fallbackVolume: 1850000 },
      { code: "4063", name: "信越化学工業", fallbackChange: 3.15, fallbackPrice: 5823, fallbackVolume: 4567800 },
    ],
  },
  {
    id: "ai-infra",
    label: "AIインフラ・電線",
    shortLabel: "AIインフラ",
    subtitle: "光ファイバー・重電・DC",
    tags: ["データセンター", "光通信", "電力需要増"],
    structuralBackground:
      "AIデータセンター増設に伴い、半導体本体だけでなく「光ファイバーケーブル」「変圧器・送配電設備」「サーバー冷却・電力インフラ」へ資金の裾野が広がっています。業績の上方修正が相次ぎ、短期・中期双方の資金が滞留しやすい領域です。",
    watchPoints: [
      "米ハイパースケーラー（Microsoft・Meta・Google・Amazon）のCAPEX計画",
      "電線・重電大手の受注残高と営業利益率の改善ペース",
      "短期急騰後の過熱感（出来高急増と上ヒゲの有無）",
    ],
    stocks: [
      { code: "5803", name: "フジクラ", fallbackChange: 2.9, fallbackPrice: 6420, fallbackVolume: 16400000 },
      { code: "5801", name: "古河電気工業", fallbackChange: 2.1, fallbackPrice: 6850, fallbackVolume: 5100000 },
      { code: "6501", name: "日立製作所", fallbackChange: 1.95, fallbackPrice: 3920, fallbackVolume: 14200000 },
      { code: "9984", name: "ソフトバンクG", fallbackChange: 3.44, fallbackPrice: 8956, fallbackVolume: 25678900 },
    ],
  },
  {
    id: "auto-export",
    label: "自動車・輸出主力",
    shortLabel: "自動車・輸出",
    subtitle: "完成車・電装・外需",
    tags: ["ドル円連動", "ハイブリッド好調", "株主還元"],
    structuralBackground:
      "外貨建て売上比率が高いため、円安局面では為替差益による業績押し上げ期待から機関投資家の買いが入りやすいセクターです。近年はPBR1倍割れ改善や自社株買い・高配当など、資本効率改善を評価した長期マネーも意識されています。",
    watchPoints: [
      "ドル円レートと想定為替レートとの乖離（1円動くと営業利益が大きく変動）",
      "米国の関税政策・通商摩擦に関するヘッドライン",
      "北米・中国市場でのハイブリッド車およびEV販売台数",
    ],
    stocks: [
      { code: "7203", name: "トヨタ自動車", fallbackChange: 2.24, fallbackPrice: 2847, fallbackVolume: 18432500 },
      { code: "6902", name: "デンソー", fallbackChange: 2.67, fallbackPrice: 2156, fallbackVolume: 5678900 },
      { code: "7267", name: "本田技研工業", fallbackChange: -1.93, fallbackPrice: 1423, fallbackVolume: 9876500 },
      { code: "6758", name: "ソニーグループ", fallbackChange: 4.58, fallbackPrice: 13250, fallbackVolume: 8234500 },
    ],
  },
  {
    id: "defense",
    label: "防衛・重工",
    shortLabel: "防衛・重工",
    subtitle: "防衛予算・宇宙・ガスタービン",
    tags: ["国策テーマ", "受注拡大", "地政学"],
    structuralBackground:
      "各国の防衛費増額という中長期の政策追い風に加え、発電用ガスタービンや航空エンジンなど民間インフラ需要も重なり、景気循環に左右されにくい業績成長が評価されています。地政学リスクが高まる局面でも資金の逃避先になりやすいのが強みです。",
    watchPoints: [
      "日本・NATO・米国の防衛予算執行と新規大型案件の受注発表",
      "重工各社の営業利益率改善と受注残の積み上がり",
      "信用買い残の増加など短期需給の過熱度",
    ],
    stocks: [
      { code: "7011", name: "三菱重工業", fallbackChange: 1.85, fallbackPrice: 2380, fallbackVolume: 38500000 },
      { code: "7012", name: "川崎重工業", fallbackChange: 1.45, fallbackPrice: 7180, fallbackVolume: 4800000 },
      { code: "7013", name: "IHI", fallbackChange: 1.6, fallbackPrice: 8940, fallbackVolume: 3200000 },
      { code: "6503", name: "三菱電機", fallbackChange: 0.95, fallbackPrice: 2640, fallbackVolume: 6400000 },
    ],
  },
  {
    id: "finance",
    label: "金融・銀行",
    shortLabel: "金融・銀行",
    subtitle: "メガバンク・損保・金利敏感",
    tags: ["日銀利上げ観測", "国内長期金利", "高配当・自社株買い"],
    structuralBackground:
      "日本の「金利ある世界」への回帰により、貸出金利と預金金利の利ざや改善がダイレクトに収益を押し上げます。日銀の金融政策正常化観測が強まると、ハイテク株から銀行・保険株へ大規模なセクターローテーション（資金移動）が起きやすくなります。",
    watchPoints: [
      "日本の10年国債利回り・2年国債利回りの推移",
      "日銀金融政策決定会合・総裁発言・春闘賃上げ率",
      "メガバンクの政策保有株売却と自社株買い・増配ペース",
    ],
    stocks: [
      { code: "8306", name: "三菱UFJ", fallbackChange: -2.48, fallbackPrice: 1654, fallbackVolume: 34567800 },
      { code: "8316", name: "三井住友FG", fallbackChange: -1.1, fallbackPrice: 3680, fallbackVolume: 11200000 },
      { code: "8411", name: "みずほFG", fallbackChange: -0.95, fallbackPrice: 3890, fallbackVolume: 8900000 },
      { code: "8766", name: "東京海上HD", fallbackChange: 0.4, fallbackPrice: 5420, fallbackVolume: 4700000 },
    ],
  },
  {
    id: "defensive",
    label: "ディフェンシブ・内需",
    shortLabel: "ディフェンシブ",
    subtitle: "通信・医薬品・生活必需品",
    tags: ["リスクオフの受け皿", "高配当", "円高耐性"],
    structuralBackground:
      "景気変動の影響を受けにくい通信・医薬・食品・小売は、相場全体がリスクオンで半導体や輸出株が急伸する局面では相対的に資金が抜けやすくなります。反対に、円高進行や米景気減速懸念が高まると「守りの資金」が一気に流入する特徴があります。",
    watchPoints: [
      "相場全体のリスクオフ転換（VIX上昇・急激な円高）",
      "配当利回りの魅力度と国内個人投資家（NISA）の押し目買い",
      "医薬品のパイプライン進捗や通信・小売の値上げ浸透度",
    ],
    stocks: [
      { code: "9432", name: "日本電信電話", fallbackChange: -2.3, fallbackPrice: 178.5, fallbackVolume: 45678900 },
      { code: "9433", name: "KDDI", fallbackChange: -3.08, fallbackPrice: 4567, fallbackVolume: 6543200 },
      { code: "4502", name: "武田薬品工業", fallbackChange: -3.64, fallbackPrice: 4123, fallbackVolume: 8765400 },
      { code: "2914", name: "日本たばこ産業", fallbackChange: -2.76, fallbackPrice: 4230, fallbackVolume: 4321000 },
    ],
  },
];

export const SECTOR_STOCK_SEEDS: StockData[] = SECTOR_CUP_DEFINITIONS.flatMap((sector) =>
  sector.stocks.map((item) => ({
    code: item.code,
    name: item.name,
    market: "プライム",
    price: item.fallbackPrice,
    change: Number(((item.fallbackPrice * item.fallbackChange) / 100).toFixed(1)),
    changePercent: item.fallbackChange,
    volume: item.fallbackVolume,
    open: item.fallbackPrice,
    high: item.fallbackPrice,
    low: item.fallbackPrice,
    previousClose: Number((item.fallbackPrice / (1 + item.fallbackChange / 100)).toFixed(1)),
  }))
);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const formatSignedPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const classifyFlowLevel = (waterLevel: number): { flowLevel: CupFlowLevel; flowBadge: string } => {
  if (waterLevel >= 75) return { flowLevel: "concentrated", flowBadge: "資金集中" };
  if (waterLevel >= 56) return { flowLevel: "inflow", flowBadge: "流入中" };
  if (waterLevel >= 38) return { flowLevel: "neutral", flowBadge: "様子見" };
  return { flowLevel: "outflow", flowBadge: "流出気味" };
};

const findIndex = (indices: MarketIndex[], pattern: RegExp) =>
  indices.find((item) => pattern.test(item.name));

/**
 * 相対強弱＋絶対騰落率からコップの水位（14%〜95%）を算出する。
 * 単に順位だけでなく、相場全体が強い・弱いときの「水かさの差」も表現する。
 */
const computeWaterLevels = (rawScores: number[]): number[] => {
  if (!rawScores.length) return [];
  const minScore = Math.min(...rawScores);
  const maxScore = Math.max(...rawScores);
  const spread = maxScore - minScore;

  return rawScores.map((score) => {
    // 絶対水準（0が50%相当、+2.0相当で+32%、-2.0相当で-32%）
    const absoluteLevel = 52 + score * 16;
    // 相対水準（横並びの比較で水位差が視覚的にはっきり出るようにする）
    const relativeLevel = spread > 0.05 ? 24 + ((score - minScore) / spread) * 66 : 50;
    const blended = absoluteLevel * 0.55 + relativeLevel * 0.45;
    return Math.round(clamp(blended, 14, 95));
  });
};

const pickIndexChangeByTimeframe = (
  index: MarketIndex | undefined,
  timeframe: FlowTimeframe,
  fallback1W = 0,
  fallback1M = 0
) => {
  if (!index) return 0;
  if (timeframe === "1W") {
    return typeof index.changePercent1W === "number" && Number.isFinite(index.changePercent1W)
      ? index.changePercent1W
      : fallback1W || index.changePercent * 1.8;
  }
  if (timeframe === "1M") {
    return typeof index.changePercent1M === "number" && Number.isFinite(index.changePercent1M)
      ? index.changePercent1M
      : fallback1M || index.changePercent * 3.2;
  }
  return index.changePercent;
};

export const buildGlobalMoneyFlow = (
  indices: MarketIndex[],
  macroAssets: MarketIndex[] = [],
  timeframe: FlowTimeframe = "1D"
): MoneyFlowOverview => {
  const tfMeta = FLOW_TIMEFRAME_META[timeframe];
  const scale = tfMeta.scale;
  const allAssets = [...indices, ...macroAssets];
  const nikkei = findIndex(allAssets, /日経/);
  const topix = findIndex(allAssets, /TOPIX/);
  const nasdaq = findIndex(allAssets, /NASDAQ/);
  const dow = findIndex(allAssets, /ダウ/);
  const sp500 = findIndex(allAssets, /S&P/);
  const usdjpy = findIndex(allAssets, /USD|JPY|ドル円/);
  const gold = findIndex(allAssets, /GOLD|金/);
  const btc = findIndex(allAssets, /BTC|ビットコイン/);
  const usBond = findIndex(allAssets, /米国債|TLT/);
  const usdIndex = findIndex(allAssets, /米ドル|DXY/);
  const oil = findIndex(allAssets, /原油|WTI|USOIL/);

  const nikkeiPct = pickIndexChangeByTimeframe(nikkei, timeframe);
  const topixPct = pickIndexChangeByTimeframe(topix, timeframe);
  const jpAvgPct = (nikkeiPct + topixPct) / 2;
  const nasdaqPct = pickIndexChangeByTimeframe(nasdaq, timeframe);
  const dowPct = pickIndexChangeByTimeframe(dow ?? sp500, timeframe);
  const sp500Pct = pickIndexChangeByTimeframe(sp500 ?? dow, timeframe);
  const usLargePct = (dowPct + sp500Pct) / 2;
  const usdjpyPct = pickIndexChangeByTimeframe(usdjpy, timeframe);
  const usdjpyVal = usdjpy?.value ?? 150;
  const goldPct = pickIndexChangeByTimeframe(gold, timeframe);
  const btcPct = pickIndexChangeByTimeframe(btc, timeframe);
  const bondPct = pickIndexChangeByTimeframe(usBond, timeframe);
  const dxyPct = pickIndexChangeByTimeframe(usdIndex, timeframe);
  const oilPct = pickIndexChangeByTimeframe(oil, timeframe);

  // ボラティリティの違う8つの主要アセットを同じ土俵で比較できるよう正規化スコアを計算（期間スケールも補正）
  const items = [
    {
      id: "jp-equity",
      label: "日本株（日経・TOPIX）",
      shortLabel: "日本株",
      subtitle: "日経平均・TOPIX",
      changePercent: jpAvgPct,
      normalizedScore: jpAvgPct / (0.85 * scale),
      displayMetric: nikkei ? `日経 ${Math.round(nikkei.value).toLocaleString()}円` : "--",
      tags: ["日経平均", "TOPIX", "海外勢・円安"],
      structuralBackground:
        "日経平均（値がさ半導体主導）とTOPIX（銀行・自動車・主力全般）の2軸で動く日本株は、海外投資家の売買比率が高く、米ハイテク株やドル円、東証の資本効率改善（自社株買い・増配）を材料に資金が出入りします。",
      watchPoints: [
        "日経平均とTOPIXの強弱差（値がさ集中か、市場全体への広がりか）",
        "ドル円の急激な円高反転と日銀の金融政策スタンス",
        "海外投資家の現物・先物買い越し動向",
      ],
    },
    {
      id: "us-tech",
      label: "米国ハイテク・AI",
      shortLabel: "米ハイテク",
      subtitle: "NASDAQ・メガテック",
      changePercent: nasdaqPct,
      normalizedScore: nasdaqPct / (0.9 * scale),
      displayMetric: nasdaq ? `${Math.round(nasdaq.value).toLocaleString()}pt` : "--",
      tags: ["NASDAQ", "AI・メガテック", "米長期金利"],
      structuralBackground:
        "世界の投資マネーの中心である米メガテック・AI関連株は、圧倒的な利益成長力から長期的な資金の受け皿になっています。米長期金利が落ち着いている局面ではバリュエーションが許容されやすく、資金が集中します。",
      watchPoints: [
        "米10年債利回りとFRBの利下げ・金融政策見通し",
        "大型テック決算とAIクラウド設備投資の伸び",
        "米雇用統計・CPIなどのインフレ指標",
      ],
    },
    {
      id: "us-bluechip",
      label: "米国大型・景気敏感",
      shortLabel: "米大型株",
      subtitle: "NYダウ・S&P500",
      changePercent: usLargePct,
      normalizedScore: usLargePct / (0.75 * scale),
      displayMetric: sp500 ? `S&P ${Math.round(sp500.value).toLocaleString()}` : "--",
      tags: ["NYダウ", "S&P500", "景気循環・金融"],
      structuralBackground:
        "NYダウやS&P500は米国経済全体の底堅さを映します。ハイテク一強から金融・資本財・消費へ資金が広がる局面（ブロードニング）では、このコップの水位が上がり、相場全体の上昇持続力が高まります。",
      watchPoints: [
        "米ISM景況感指数・小売売上高など実体経済指標",
        "NASDAQとの強弱差（グロース→バリューの資金移動）",
        "米大手金融・消費企業の業績ガイダンス",
      ],
    },
    {
      id: "us-bond",
      label: "米国債（長期債券）",
      shortLabel: "米国債",
      subtitle: "安全資産・利回り確保",
      changePercent: bondPct,
      normalizedScore: bondPct / (0.65 * scale),
      displayMetric: usBond ? `TLT $${usBond.value.toFixed(2)}` : "--",
      tags: ["米国債(TLT)", "米長期金利", "景気減速ヘッジ"],
      structuralBackground:
        "世界の債券市場は株式市場を上回る規模を持ち、景気減速懸念や株安のリスクオフ局面で最大の資金の逃避先になります。債券価格の上昇（＝金利低下）は、安全な利回りを確保しようとする機関投資家の資金集中を示します。",
      watchPoints: [
        "FRBの利下げ織り込みと米CPI・雇用統計の鈍化",
        "米財政赤字や国債入札の需給（入札不調だと債券売り）",
        "株安と同時に債券が買われているか（典型的なリスクオフ）",
      ],
    },
    {
      id: "usd-cash",
      label: "米ドル（現金・DXY）",
      shortLabel: "米ドル現金",
      subtitle: "ドル指数・キャッシュ退避",
      changePercent: dxyPct,
      normalizedScore: dxyPct / (0.45 * scale),
      displayMetric: usdIndex ? `DXY ${usdIndex.value.toFixed(2)}` : "--",
      tags: ["ドル指数(DXY)", "キャッシュ退避", "米金利優位"],
      structuralBackground:
        "米ドル指数（DXY）の上昇は、世界中の投資家が他通貨やリスク資産を売って「基軸通貨ドル（現金・MMF）」へ資金を引き揚げているサインです。株も金も同時に売られるような局面では、このコップの水位が急上昇します。",
      watchPoints: [
        "日欧との金利差とFRBのタカ派／ハト派発言",
        "株安・コモディティ安と同時のドル独歩高（流動性引き締め）",
        "ドル安反転は新興国株・ゴールド・BTCへの追い風サイン",
      ],
    },
    {
      id: "gold",
      label: "金（ゴールド）",
      shortLabel: "金・ゴールド",
      subtitle: "インフレ・地政学ヘッジ",
      changePercent: goldPct,
      normalizedScore: goldPct / (0.75 * scale),
      displayMetric: gold ? `$${gold.value.toFixed(1)}` : "--",
      tags: ["GOLD", "安全資産", "実質金利・中央銀行買い"],
      structuralBackground:
        "金（ゴールド）は「株安・景気不安・地政学リスク・インフレ懸念」が強まるときに資金が逃げ込む代表的な実物安全資産です。各国中央銀行の外貨準備分散や米実質金利低下も水位を押し上げる要因になります。",
      watchPoints: [
        "米実質金利とドル指数（DXY）の方向",
        "中東・欧州など地政学リスクのヘッドライン",
        "株高リスクオン時に利益確定で資金が抜けていないか",
      ],
    },
    {
      id: "oil-commodity",
      label: "原油・資源（WTI）",
      shortLabel: "原油・資源",
      subtitle: "エネルギー・実物インフレ",
      changePercent: oilPct,
      normalizedScore: oilPct / (1.4 * scale),
      displayMetric: oil ? `WTI $${oil.value.toFixed(2)}` : "--",
      tags: ["WTI原油", "インフレ再燃", "OPEC+・地政学"],
      structuralBackground:
        "原油などのコモディティは「世界景気の回復期待」「中東など供給制約リスク」「インフレヘッジ需要」で資金が集まります。原油急騰が続くとインフレ再燃→金利上昇を通じて株式や債券の重荷になるため、市場全体の要チェック指標です。",
      watchPoints: [
        "OPEC+の減産・増産方針と米原油在庫統計",
        "中東情勢や海上輸送ルートの地政学ヘッドライン",
        "中国・米国の製造業景況感とエネルギー需要見通し",
      ],
    },
    {
      id: "crypto",
      label: "暗号資産（BTC）",
      shortLabel: "暗号資産BTC",
      subtitle: "高リスク選好・流動性",
      changePercent: btcPct,
      normalizedScore: btcPct / (2.2 * scale),
      displayMetric: btc ? `$${Math.round(btc.value).toLocaleString()}` : "--",
      tags: ["BTC/USDT", "現物ETFフロー", "グローバル流動性"],
      structuralBackground:
        "ビットコインは最もリスク許容度とグローバル流動性（マネーサプライ）を敏感に映す資産です。現物ETFへの資金流入や金融緩和期待が強まる局面では真っ先に水位が上がり、リスクオフ時は利益確定売りが加速しやすい特徴があります。",
      watchPoints: [
        "米国ビットコイン現物ETFの日次純流入・純流出",
        "NASDAQとの連動性（リスク資産全体の体温計）",
        "先物レバレッジの過熱感と急変動リスク",
      ],
    },
  ];

  const waterLevels = computeWaterLevels(items.map((item) => item.normalizedScore));
  const rankedOrder = items
    .map((item, idx) => ({ id: item.id, level: waterLevels[idx], change: item.changePercent }))
    .sort((a, b) => (b.level !== a.level ? b.level - a.level : b.change - a.change));
  const rankMap = new Map(rankedOrder.map((entry, idx) => [entry.id, idx + 1]));

  const buildCupCurrentReason = (id: string, changePercent: number, waterLevel: number) => {
    const pct = formatSignedPercent(changePercent);
    if (id === "jp-equity") {
      if (changePercent >= 0.7) {
        return `日経平均 ${formatSignedPercent(nikkeiPct)} / TOPIX ${formatSignedPercent(topixPct)} と買い優勢。${
          nikkeiPct > topixPct + 0.2
            ? "値がさ半導体・ハイテク株が牽引しています。"
            : topixPct > nikkeiPct + 0.2
            ? "銀行・自動車など幅広い主力株へ買いが広がっています。"
            : "指数寄与度銘柄と主力株全体へバランスよく資金が入っています。"
        }${usdjpyPct > 0.15 ? ` ドル円（${usdjpyVal.toFixed(1)}円・円安方向）も追い風です。` : ""}`;
      }
      if (changePercent <= -0.7) {
        return `日経平均 ${formatSignedPercent(nikkeiPct)} / TOPIX ${formatSignedPercent(topixPct)} と軟調。海外株安や利益確定売り、${
          usdjpyPct < -0.15 ? "円高方向への振れ" : "主力株への売り圧力"
        }が重荷となり、日本株から一時的に資金が抜けています。`;
      }
      return `日経平均 ${formatSignedPercent(nikkeiPct)} / TOPIX ${formatSignedPercent(topixPct)}（水位 ${waterLevel}%）。海外市場と為替の方向感を見極めながら、個別テーマ株への選別物色が中心です。`;
    }
    if (id === "us-tech") {
      if (changePercent >= 0.7) {
        return `NASDAQが ${pct} と強い値動き。${
          nasdaqPct > dowPct + 0.25
            ? "NYダウを上回るグロース主導の展開で、AI・半導体・メガテックへ世界の成長マネーが集中しています。"
            : "米国株全体のリスク選好に乗り、大型ハイテク株が相場の牽引役になっています。"
        }`;
      }
      if (changePercent <= -0.7) {
        return `NASDAQが ${pct} と反落。米金利警戒や高値圏のAI・半導体株への利益確定売りが優勢で、資金が債券・ドル現金・バリュー株へ一時退避しています。`;
      }
      return `NASDAQは ${pct}（水位 ${waterLevel}%）。大型テックの決算や米金利動向を見極める様子見ムードです。`;
    }
    if (id === "us-bluechip") {
      if (changePercent >= 0.5) {
        return `NYダウ ${formatSignedPercent(dowPct)} / S&P500 ${formatSignedPercent(sp500Pct)} と底堅い推移。${
          dowPct > nasdaqPct + 0.25
            ? "ハイテクから景気敏感・大型バリュー株へ資金が回るローテーションが鮮明です。"
            : "米大型株全体にバランスよく資金が流入しています。"
        }`;
      }
      if (changePercent <= -0.5) {
        return `NYダウ ${formatSignedPercent(dowPct)} / S&P500 ${formatSignedPercent(sp500Pct)} と弱含み。景気指標や金利動向への警戒から持ち高調整の売りが出ています。`;
      }
      return `NYダウ ${formatSignedPercent(dowPct)} / S&P500 ${formatSignedPercent(sp500Pct)}（水位 ${waterLevel}%）。大型株全体は小動きで、セクター間での資金入れ替えが中心です。`;
    }
    if (id === "us-bond") {
      if (changePercent >= 0.4) {
        return `米国債（TLT）が ${pct} と上昇（＝米長期金利は低下方向）。景気減速への備えや利下げ織り込み、株安時の安全資産需要から債券市場へ資金が流れ込んでいます。`;
      }
      if (changePercent <= -0.4) {
        return `米国債（TLT）が ${pct} と下落（＝米長期金利は上昇方向）。インフレ警戒やリスク選好の回復に伴い、債券から株式やキャッシュ側へ資金がシフトしています。`;
      }
      return `米国債（TLT）は ${pct}（水位 ${waterLevel}%）。米国の物価・雇用指標待ちで、債券市場の資金は中立圏で待機しています。`;
    }
    if (id === "usd-cash") {
      if (changePercent >= 0.3) {
        return `米ドル指数（DXY）が ${pct} と上昇。米金利優位やリスク回避の「現金化（キャッシュ・イズ・キング）」の動きから、世界中の資金が基軸通貨ドルへ集まっています。`;
      }
      if (changePercent <= -0.3) {
        return `米ドル指数（DXY）が ${pct} と軟調。待機していたドル現金が株式・ゴールド・新興国・暗号資産など他のリスク資産へ振り向けられやすい環境です。`;
      }
      return `米ドル指数（DXY）は ${pct}（水位 ${waterLevel}%）。為替全体は落ち着いた値動きで、ドル現金への極端な偏りは見られません。`;
    }
    if (id === "gold") {
      if (changePercent >= 0.5) {
        return `ゴールドが ${pct} と上昇。米実質金利の低下観測や地政学・インフレ警戒、あるいは株式の調整に対するヘッジ需要から安全資産へ資金が向かっています。`;
      }
      if (changePercent <= -0.5) {
        return `ゴールドが ${pct} と軟調。株式市場のリスク選好回復やドル高・金利上昇を受けて、守りの資金がリスク資産側へシフトしています。`;
      }
      return `ゴールドは ${pct}（水位 ${waterLevel}%）。株式市場の方向感を見ながら、ヘッジ資金は一定の待機水準にとどまっています。`;
    }
    if (id === "oil-commodity") {
      if (changePercent >= 0.8) {
        return `WTI原油が ${pct} と上昇。供給制約・地政学リスクや景気回復期待、インフレヘッジ需要からエネルギー・実物資源のコップへ資金が流入しています。`;
      }
      if (changePercent <= -0.8) {
        return `WTI原油が ${pct} と下落。世界需要の鈍化懸念や増産観測から資源関連の資金が抜けており、インフレ懸念の和らぎ要因にもなっています。`;
      }
      return `WTI原油は ${pct}（水位 ${waterLevel}%）。需給と地政学ニュースを見極めながらレンジ内での推移です。`;
    }
    // crypto
    if (changePercent >= 1.2) {
      return `BTCが ${pct} と大きく上昇。現物ETFフローやリスク選好の強まりを背景に、最も積極的なリスクマネーが暗号資産へ流れ込んでいます。`;
    }
    if (changePercent <= -1.2) {
      return `BTCが ${pct} と下落。短期レバレッジの解消やリスク回避の動きが先行し、高ボラティリティ資産から資金が抜けています。`;
    }
    return `BTCは ${pct}（水位 ${waterLevel}%）。株式や債券と比べると資金の偏りは限定的で、次の流動性イベント待ちの状態です。`;
  };

  const cups: MoneyFlowCup[] = items.map((item, idx) => {
    const waterLevel = waterLevels[idx];
    const { flowLevel, flowBadge } = classifyFlowLevel(waterLevel);
    return {
      id: item.id,
      label: item.label,
      shortLabel: item.shortLabel,
      subtitle: item.subtitle,
      waterLevel,
      changePercent: item.changePercent,
      displayMetric: item.displayMetric,
      flowLevel,
      flowBadge,
      rank: rankMap.get(item.id) ?? idx + 1,
      currentReason: buildCupCurrentReason(item.id, item.changePercent, waterLevel),
      structuralBackground: item.structuralBackground,
      watchPoints: item.watchPoints,
      tags: item.tags,
    };
  });

  const sortedCups = [...cups].sort((a, b) => a.rank - b.rank);
  const top1 = sortedCups[0];
  const top2 = sortedCups[1];
  const bottom = sortedCups[sortedCups.length - 1];

  const equityAvg = (jpAvgPct + nasdaqPct + usLargePct) / 3;
  const defensiveAvg = (bondPct + goldPct + dxyPct) / 3;
  const isRiskOn = equityAvg >= 0.45 * scale && equityAvg > defensiveAvg;
  const isRiskOff = equityAvg <= -0.45 * scale || (defensiveAvg >= 0.35 * scale && equityAvg < 0);
  const isRotation = !isRiskOn && !isRiskOff && Math.abs(top1.changePercent - bottom.changePercent) >= 0.8 * scale;

  const regimeTone = isRiskOn ? "risk-on" : isRiskOff ? "risk-off" : isRotation ? "rotation" : "neutral";
  const regimeLabel = isRiskOn
    ? "リスクオン（株へ資金集中）"
    : isRiskOff
    ? "リスクオフ（債券・ドル・金へ逃避）"
    : isRotation
    ? "資金ローテーション局面"
    : "様子見・分散局面";

  const headline = isRiskOn
    ? `${tfMeta.longLabel}の資金は「${top1.shortLabel}」「${top2.shortLabel}」のコップに集中しています`
    : isRiskOff
    ? `${tfMeta.longLabel}は株式から資金が抜け、「${top1.shortLabel}」「${top2.shortLabel}」へ守りのマネーが移動しています`
    : `${tfMeta.longLabel}は「${top1.shortLabel}」寄りに集まり、「${bottom.shortLabel}」は少なめです`;

  const leadSummary = `${tfMeta.longLabel}（${tfMeta.hint}）で世界の主要8アセットを比べると、最も水が満ちているのは「${top1.label}（水位 ${top1.waterLevel}% / ${formatSignedPercent(top1.changePercent)}）」、次いで「${top2.label}（${top2.waterLevel}% / ${formatSignedPercent(top2.changePercent)}）」です。一方、「${bottom.label}（${bottom.waterLevel}% / ${formatSignedPercent(bottom.changePercent)}）」は相対的に水が少なくなっています。`;

  const reasons: FlowSummaryReason[] = [
    {
      title: isRiskOn
        ? "1. 株式リスク選好 vs 債券・ドル現金からのシフト"
        : isRiskOff
        ? "1. リスク回避による債券・ドル現金・金への逃避"
        : "1. 株・債券・現金・資源の選別的な資金配分",
      body: isRiskOn
        ? `日米株式が堅調（日本株 ${formatSignedPercent(jpAvgPct)}・NASDAQ ${formatSignedPercent(nasdaqPct)}）な一方、米国債（${formatSignedPercent(bondPct)}）や米ドル指数（${formatSignedPercent(dxyPct)}）は落ち着いており、待機マネーが株式へ流れ込みやすい構図です。`
        : isRiskOff
        ? `株式全体が軟調（平均 ${formatSignedPercent(equityAvg)}）となるなか、米国債（${formatSignedPercent(bondPct)}）・米ドル（${formatSignedPercent(dxyPct)}）・ゴールド（${formatSignedPercent(goldPct)}）が受け皿になり、守りの資産へ資金が移っています。`
        : `トップの「${top1.shortLabel}（${formatSignedPercent(top1.changePercent)}）」と最下位の「${bottom.shortLabel}（${formatSignedPercent(bottom.changePercent)}）」で濃淡があり、全面リスクオン／オフではなく資産間の入れ替えが進んでいます。`,
      tone: isRiskOn ? "hot" : isRiskOff ? "cool" : "neutral",
    },
    {
      title:
        nikkeiPct > topixPct + 0.15 || nasdaqPct > dowPct + 0.15
          ? "2. 株式内部はハイテク・AIグロース優位"
          : "2. 株式内部は大型バリュー・景気敏感へ広がり",
      body:
        nikkeiPct > topixPct + 0.15 || nasdaqPct > dowPct + 0.15
          ? `日本は日経（${formatSignedPercent(nikkeiPct)}）vs TOPIX（${formatSignedPercent(topixPct)}）、米国はNASDAQ（${formatSignedPercent(nasdaqPct)}）vs ダウ（${formatSignedPercent(dowPct)}）。成長期待の高いハイテク・半導体関連へ資金が寄りやすい地合いです。`
          : `TOPIX（${formatSignedPercent(topixPct)}）やNYダウ（${formatSignedPercent(dowPct)}）が底堅く、一部のハイテクだけでなく金融・自動車・景気敏感など幅広い大型株へ資金が循環しています。`,
      tone: "hot",
    },
    {
      title: `3. 実物資産（金・原油）と為替（ドル円 ${usdjpyVal.toFixed(2)}円 / DXY ${formatSignedPercent(dxyPct)}）`,
      body: `原油（${formatSignedPercent(oilPct)}）とゴールド（${formatSignedPercent(goldPct)}）の動きはインフレや地政学リスクの体温計です。${
        oilPct >= 0.8
          ? "原油高がインフレ警戒や資源株物色につながりやすい局面です。"
          : usdjpyPct > 0.15
          ? "円安方向への推移が日本株（輸出主力）の支援材料になっています。"
          : usdjpyPct < -0.15
          ? "円高方向への振れは日本の輸出株の上値を抑えやすく、内需や債券・安全資産への目線が高まりやすい環境です。"
          : "原油・為替ともに急変動は限定的で、株式・債券それぞれの材料で資金が動きやすい状態です。"
      }`,
      tone: usdjpyPct > 0.15 ? "hot" : usdjpyPct < -0.15 ? "cool" : "neutral",
    },
  ];

  const rotationHint = isRiskOn
    ? "株式コップの水位が高い局面では、米国債（金利）や米ドル（DXY）が反転上昇し始めたときがリスクオフ転換の初期サインになります。日本株の細かな資金先は「日本株セクター別」タブで確認できます。"
    : isRiskOff
    ? "リスクオフ時は米国債・米ドル・ゴールドのコップが高くなりやすい局面です。ドル独歩高が一服し、NASDAQや日本株に水が戻り始めるタイミングを見極めるのが定石です。"
    : "株・債券・ドル現金・資源のどこに水が偏り始めているかを追うことで、次のトレンドの初動を捉えやすくなります。";

  return {
    mode: "global",
    timeframe,
    timeframeLabel: tfMeta.longLabel,
    headline,
    regimeLabel,
    regimeTone,
    leadSummary,
    reasons,
    rotationHint,
    cups,
  };
};

export const buildSectorMoneyFlow = (
  liveStocks: StockData[],
  indices: MarketIndex[],
  timeframe: FlowTimeframe = "1D"
): MoneyFlowOverview => {
  const tfMeta = FLOW_TIMEFRAME_META[timeframe];
  const scale = tfMeta.scale;
  const stockByCode = new Map(liveStocks.map((stock) => [stock.code, stock]));
  const usdjpy = findIndex(indices, /USD|JPY|ドル|円/);
  const nasdaq = findIndex(indices, /NASDAQ/);
  const nikkei = findIndex(indices, /日経/);
  const topix = findIndex(indices, /TOPIX/);
  const usdjpyPct = pickIndexChangeByTimeframe(usdjpy, timeframe);
  const nasdaqPct = pickIndexChangeByTimeframe(nasdaq, timeframe);
  const nikkeiPct = pickIndexChangeByTimeframe(nikkei, timeframe);
  const topixPct = pickIndexChangeByTimeframe(topix, timeframe);

  // 1週間/1ヶ月では各セクターの指数感応度（NASDAQ・TOPIX・為替）を織り込んで期間推移を推定補正
  const getSectorTimeframeShift = (sectorId: string) => {
    if (timeframe === "1D") return 0;
    const factor = timeframe === "1W" ? 0.45 : 0.72;
    switch (sectorId) {
      case "ai-semi":
        return (nasdaqPct * 0.65 + nikkeiPct * 0.35) * factor;
      case "ai-infra":
        return (nasdaqPct * 0.5 + nikkeiPct * 0.5) * factor;
      case "auto-export":
        return (topixPct * 0.55 + usdjpyPct * 0.9) * factor;
      case "defense":
        return (topixPct * 0.4 + Math.max(0, -nasdaqPct * 0.15) + 0.6 * scale) * (factor * 0.6);
      case "finance":
        return (topixPct * 0.7 - usdjpyPct * 0.25) * factor;
      case "defensive":
        return (topixPct * 0.35 - Math.min(0, nasdaqPct) * 0.12) * factor;
      default:
        return topixPct * factor;
    }
  };

  const sectorStats = SECTOR_CUP_DEFINITIONS.map((sector) => {
    const tfShift = getSectorTimeframeShift(sector.id);
    const constituents: CupConstituent[] = sector.stocks.map((seed) => {
      const live = stockByCode.get(seed.code);
      const hasValidLive = Boolean(live && live.price > 0 && Number.isFinite(live.changePercent));
      const price = hasValidLive ? live!.price : seed.fallbackPrice;
      const baseChange = hasValidLive ? live!.changePercent : seed.fallbackChange;
      const changePercent =
        timeframe === "1D" ? baseChange : Number((baseChange * 0.55 + tfShift).toFixed(2));
      const volume = hasValidLive && live!.volume > 0 ? live!.volume : seed.fallbackVolume;
      return {
        code: seed.code,
        name: seed.name,
        price,
        changePercent,
        turnoverYen: price * volume,
      };
    });

    const avgChange =
      constituents.reduce((sum, item) => sum + item.changePercent, 0) / constituents.length;
    const positiveRatio =
      constituents.filter((item) => item.changePercent > 0).length / constituents.length;
    const totalTurnoverOku =
      constituents.reduce((sum, item) => sum + item.turnoverYen, 0) / 1e8;

    // 騰落率（主軸・期間スケール補正）＋ 上昇銘柄比率 ＋ 売買代金の活況度で資金集中スコアを算出
    const turnoverBoost = Math.log10(Math.max(totalTurnoverOku, 10)) * 0.25;
    const rawScore = (avgChange / scale) * 0.72 + (positiveRatio - 0.5) * 1.4 + (turnoverBoost - 0.65);

    const sortedConstituents = [...constituents].sort((a, b) => b.changePercent - a.changePercent);
    const leader = sortedConstituents[0];
    const laggard = sortedConstituents[sortedConstituents.length - 1];

    return {
      sector,
      constituents: sortedConstituents,
      avgChange,
      positiveRatio,
      totalTurnoverOku,
      rawScore,
      leader,
      laggard,
    };
  });

  const waterLevels = computeWaterLevels(sectorStats.map((item) => item.rawScore));
  const rankedOrder = sectorStats
    .map((item, idx) => ({ id: item.sector.id, level: waterLevels[idx], avgChange: item.avgChange }))
    .sort((a, b) => (b.level !== a.level ? b.level - a.level : b.avgChange - a.avgChange));
  const rankMap = new Map(rankedOrder.map((entry, idx) => [entry.id, idx + 1]));

  const cups: MoneyFlowCup[] = sectorStats.map((item, idx) => {
    const waterLevel = waterLevels[idx];
    const { flowLevel, flowBadge } = classifyFlowLevel(waterLevel);
    const risingCount = item.constituents.filter((c) => c.changePercent > 0).length;
    const currentReason =
      item.avgChange >= 1.0
        ? `セクター平均 ${formatSignedPercent(item.avgChange)}（${risingCount}/${item.constituents.length}銘柄が上昇）。特に ${item.leader.name}（${formatSignedPercent(item.leader.changePercent)}）が牽引し、売買代金も約${Math.round(item.totalTurnoverOku).toLocaleString()}億円規模と活発に資金が流入しています。`
        : item.avgChange <= -1.0
        ? `セクター平均 ${formatSignedPercent(item.avgChange)}（上昇は ${risingCount}/${item.constituents.length}銘柄）。${item.laggard.name}（${formatSignedPercent(item.laggard.changePercent)}）を中心に利益確定・乗り換え売りが優勢となり、他セクターへ資金が移っています。`
        : `セクター平均 ${formatSignedPercent(item.avgChange)}（水位 ${waterLevel}%）。${item.leader.name}（${formatSignedPercent(item.leader.changePercent)}）と ${item.laggard.name}（${formatSignedPercent(item.laggard.changePercent)}）で強弱が分かれ、個別選別の動きです。`;

    return {
      id: item.sector.id,
      label: item.sector.label,
      shortLabel: item.sector.shortLabel,
      subtitle: item.sector.subtitle,
      waterLevel,
      changePercent: item.avgChange,
      displayMetric: `売買約${Math.round(item.totalTurnoverOku).toLocaleString()}億円`,
      flowLevel,
      flowBadge,
      rank: rankMap.get(item.sector.id) ?? idx + 1,
      currentReason,
      structuralBackground: item.sector.structuralBackground,
      watchPoints: item.sector.watchPoints,
      tags: item.sector.tags,
      constituents: item.constituents,
    };
  });

  const sortedCups = [...cups].sort((a, b) => a.rank - b.rank);
  const top1 = sortedCups[0];
  const top2 = sortedCups[1];
  const bottom = sortedCups[sortedCups.length - 1];

  const isTechLed = ["ai-semi", "ai-infra"].includes(top1.id);
  const isDefensiveLed = top1.id === "defensive";
  const isFinanceLed = top1.id === "finance";

  const regimeTone = isDefensiveLed ? "risk-off" : isTechLed ? "risk-on" : "rotation";
  const regimeLabel = isTechLed
    ? "AI・成長テーマ主導"
    : isDefensiveLed
    ? "ディフェンシブ回避"
    : isFinanceLed
    ? "金利・バリュー主導"
    : "テーマ選別・循環物色";

  const headline = `${tfMeta.longLabel}の日本株資金は「${top1.shortLabel}」「${top2.shortLabel}」に集中、「${bottom.shortLabel}」は弱含み`;

  const leadSummary = `${tfMeta.longLabel}（${tfMeta.hint}）で東証の主要6セクターを比べると、最も資金が溜まっているのは「${top1.label}（水位 ${top1.waterLevel}% / 平均 ${formatSignedPercent(top1.changePercent)}）」、次いで「${top2.label}（${top2.waterLevel}% / 平均 ${formatSignedPercent(top2.changePercent)}）」です。反対に「${bottom.label}（${bottom.waterLevel}% / 平均 ${formatSignedPercent(bottom.changePercent)}）」は相対的に資金が抜けています。`;

  const reasons: FlowSummaryReason[] = [
    {
      title: `1. 「${top1.shortLabel}」が買いの受け皿になっている理由`,
      body: top1.currentReason,
      tone: top1.changePercent >= 0 ? "hot" : "neutral",
    },
    {
      title: `2. 「${bottom.shortLabel}」から水が抜けている理由`,
      body:
        bottom.id === "defensive"
          ? `攻めのテーマ株（${top1.shortLabel}など）に資金が向かうリスクオン局面では、値動きの穏やかな通信・医薬などのディフェンシブ株から資金が乗り換えられやすくなります（平均 ${formatSignedPercent(bottom.changePercent)}）。`
          : bottom.id === "finance"
          ? `金利上昇一服やグロース株優位の地合いでは、メガバンクなど金利敏感株に利益確定売りが出やすく（平均 ${formatSignedPercent(bottom.changePercent)}）、成長セクターへ資金が移る傾向があります。`
          : `${bottom.label}は平均 ${formatSignedPercent(bottom.changePercent)} と相対的に弱含み。強いセクター（${top1.shortLabel}・${top2.shortLabel}）へ短期資金が移動するローテーションの影響を受けています。`,
      tone: "cool",
    },
    {
      title: "3. 外部環境（米NASDAQ・ドル円）とのつながり",
      body: `米NASDAQ（${formatSignedPercent(nasdaqPct)}）とドル円（${formatSignedPercent(usdjpyPct)}）の動きが東京市場のセクター強弱に直結しています。${
        nasdaqPct >= 0.4
          ? "米ハイテク高が日本のAI・半導体やAIインフラ（電線・重電）への連想買いを後押ししています。"
          : nasdaqPct <= -0.4
          ? "米ハイテク安を受けて、日本のグロース株からバリュー・防衛・内需系へ資金を逃がす動きが出やすい地合いです。"
          : "海外指数の方向感が限られるぶん、業績や国策テーマ（AIインフラ・防衛・金利）に沿った個別選別が強まっています。"
      }`,
      tone: nasdaqPct >= 0.4 ? "hot" : nasdaqPct <= -0.4 ? "cool" : "neutral",
    },
  ];

  const rotationHint = `コップの水位差が大きい日は「最も満水に近いセクターの押し目」を追う順張りと、「次点（2〜3位）で出来高が増え始めたセクター」へ先回りする見方が効果的です。各コップをクリックすると構成銘柄の騰落率とチャートリンクを確認できます。`;

  return {
    mode: "sectors",
    timeframe,
    timeframeLabel: tfMeta.longLabel,
    headline,
    regimeLabel,
    regimeTone,
    leadSummary,
    reasons,
    rotationHint,
    cups,
  };
};

const NOISE_NEWS_PATTERN =
  /ロト|宝くじ|当せん|当選|抽せん|占い|芸能|結婚|熱愛|野球|サッカー|プロレス|競馬|マリーゴールド|イルミネーション|ライトアップ|ゴールド免許|ゴールドカード|ゴールドメダル|金メダル|ゴールドシップ|グルメ|観光スポット|花火大会|映画公開/;

const CUP_NEWS_RULES: Record<
  string,
  { pattern: RegExp; strongPattern: RegExp; excludePattern?: RegExp; label: string }
> = {
  "jp-equity": {
    pattern: /日経平均|TOPIX|日本株|東京株|東京株式|東証|日銀|植田|プライム市場|日本企業/,
    strongPattern: /日経平均|TOPIX|日本株|東京株|東京株式|東証/,
    // 米国株メインの記事が日本株コップに混ざるのを防ぐ（日本株ワードが明示されている場合のみ許可）
    excludePattern: /米国株|米株|NY株|NYダウ|ダウ平均|NASDAQ|ナスダック|S&P\s?500|ウォール街|米市場/,
    label: "日本株",
  },
  "us-tech": {
    pattern: /NASDAQ|ナスダック|NVIDIA|エヌビディア|米ハイテク|メガテック|SOX|アップル|マイクロソフト|アルファベット|アマゾン|メタ|AI半導体規制|対中.*半導体|輸出規制.*半導体|TSMC|ASML/,
    strongPattern: /NASDAQ|ナスダック|NVIDIA|エヌビディア|米ハイテク|AI半導体規制|メガテック/,
    excludePattern: /日経平均|TOPIX|日本株|東京株|東証/,
    label: "米ハイテク",
  },
  "us-bluechip": {
    pattern: /NYダウ|ダウ平均|S&P\s?500|米国株|米株|NY株|ウォール街|米景気|米雇用|米小売|トランプ.*株|米政権.*関税/,
    strongPattern: /NYダウ|ダウ平均|S&P\s?500|米国株|米株|NY株/,
    excludePattern: /日経平均|TOPIX|日本株|東京株|東証/,
    label: "米大型株",
  },
  "us-bond": {
    pattern: /米国債|米長期金利|米金利|米10年債|FRB|FOMC|パウエル|米利下げ|米利上げ|米CPI|米インフレ|PCE|米雇用統計|米財政/,
    strongPattern: /米国債|米長期金利|FRB|FOMC|米利下げ|米利上げ/,
    label: "米国債",
  },
  "usd-cash": {
    pattern: /ドル円|ドル指数|DXY|ドル高|ドル安|円安|円高|為替|為替介入|日米金利差/,
    strongPattern: /ドル円|ドル指数|DXY|ドル高|円安|円高|為替/,
    label: "米ドル現金",
  },
  gold: {
    pattern:
      /金価格|金先物|金相場|金地金|純金|NY金|COMEX.*金|XAU|安全資産|地政学.*金|中央銀行.*金|(?:^|[^ァ-ヶー])ゴールド(?:価格|相場|先物|ETF|投資|市場|高|安|買い|売り)/,
    strongPattern:
      /金価格|金先物|金相場|金地金|NY金|XAU|(?:^|[^ァ-ヶー])ゴールド(?:価格|相場|先物|ETF|投資)/,
    label: "金・ゴールド",
  },
  "oil-commodity": {
    pattern: /原油|WTI|ブレント|OPEC|エネルギー価格|中東.*原油|ガソリン価格|液化天然ガス|銅相場/,
    strongPattern: /原油|WTI|ブレント|OPEC/,
    label: "原油・資源",
  },
  crypto: {
    pattern: /ビットコイン|BTC|暗号資産|仮想通貨|イーサリアム|ETH|リップル|XRP|ソラナ|現物ETF|クリプト|マイニング|コインベース|バイナンス/,
    strongPattern: /ビットコイン|BTC|暗号資産|仮想通貨|イーサリアム/,
    label: "暗号資産BTC",
  },
  // セクター別
  "ai-semi": {
    pattern: /半導体|NVIDIA|エヌビディア|東京エレクトロン|アドバンテスト|ディスコ|信越化学|生成AI|SOX|ウエハー|輸出規制|半導体規制|スパイ|TSMC|ASML/,
    strongPattern: /半導体規制|輸出規制|半導体|東京エレクトロン|アドバンテスト|NVIDIA|エヌビディア/,
    label: "AI・半導体",
  },
  "ai-infra": {
    pattern: /データセンター|光ファイバー|電線|フジクラ|古河電|日立|ソフトバンク|AIインフラ|電力需要|送配電|AI投資/,
    strongPattern: /データセンター|フジクラ|日立|ソフトバンク|電線/,
    label: "AIインフラ",
  },
  "auto-export": {
    pattern: /トヨタ|ホンダ|デンソー|ソニー|自動車|EV|ハイブリッド|自動車関税|円安|輸出/,
    strongPattern: /トヨタ|ホンダ|自動車|自動車関税/,
    label: "自動車・輸出",
  },
  defense: {
    pattern: /防衛|三菱重工|川崎重工|IHI|重工|宇宙|自衛隊|NATO|安全保障|ミサイル/,
    strongPattern: /防衛|三菱重工|川崎重工|IHI|重工/,
    label: "防衛・重工",
  },
  finance: {
    pattern: /日銀|国内.*利上げ|長期金利|銀行|メガバンク|三菱UFJ|三井住友|みずほ|保険|東京海上/,
    strongPattern: /日銀|銀行|メガバンク|三菱UFJ/,
    label: "金融・銀行",
  },
  defensive: {
    pattern: /ディフェンシブ|通信|NTT|KDDI|医薬|武田薬品|JT|内需|高配当|生活必需品|食品|薬価/,
    strongPattern: /ディフェンシブ|NTT|KDDI|武田薬品|医薬/,
    label: "ディフェンシブ",
  },
};

const classifyNewsImpact = (
  title: string,
  primaryCup: MoneyFlowCup | undefined
): {
  impactTag: string;
  direction: NewsImpactDirection;
  directionLabel: string;
  isDirectCatalyst: boolean;
  impactSummary: string;
} => {
  const cupName = primaryCup?.shortLabel ?? "主要アセット";
  const cupMove = primaryCup ? formatSignedPercent(primaryCup.changePercent) : "";
  const isUp = (primaryCup?.changePercent ?? 0) >= 0;

  // 1. 企業スキャンダル・スパイ疑惑・当局調査（最重要の直接下落カタリスト）
  if (/スパイ|情報漏洩|機密|不正|疑惑|捜査|司法省|独禁法|訴訟|制裁金|不祥事|CEO.*問題|問題視|調査対象/.test(title)) {
    return {
      impactTag: "企業疑惑・調査リスク",
      direction: "bearish",
      directionLabel: "下落原因・売り材料",
      isDirectCatalyst: true,
      impactSummary: `主力企業や経営陣を巡るスパイ疑惑・情報漏洩・当局調査などの報道は、事業継続やガバナンスへの不透明感を一気に高め、機関投資家のリスク回避売り（ポジション縮小）を引き起こす直接の下げ要因になります（現在 ${cupName} ${cupMove}）。`,
    };
  }

  // 2. AI半導体規制・対中輸出規制（ハイテク・半導体セクターの直接カタリスト）
  if (/半導体規制|輸出規制|対中.*規制|規制強化|禁輸|エンティティ|規制対象|先端半導体.*制限/.test(title)) {
    return {
      impactTag: "AI・半導体規制",
      direction: "bearish",
      directionLabel: "下落原因・売り材料",
      isDirectCatalyst: true,
      impactSummary: `AI半導体や製造装置の輸出規制強化は、NVIDIAや日本の半導体製造装置メーカーの中国向け売上減少懸念に直結します。米ハイテク・日本の半導体コップから資金が抜け、内需・債券・安全資産へ移る直接原因になりやすい材料です（現在 ${cupName} ${cupMove}）。`,
    };
  }

  // 3. トランプ政権・関税・通商政策
  if (/トランプ|関税|報復関税|通商|貿易摩擦|米政権|ホワイトハウス|保護主義/.test(title)) {
    const isRelief = /延期|撤回|緩和|合意|免除|協議進展/.test(title);
    return {
      impactTag: "米政権・関税リスク",
      direction: isRelief ? "bullish" : "bearish",
      directionLabel: isRelief ? "上昇原因・安心材料" : "下落・警戒材料",
      isDirectCatalyst: true,
      impactSummary: isRelief
        ? `関税の緩和・延期・合意観測は、輸出企業（自動車・半導体）の業績悪化懸念とインフレ再燃リスクを和らげるため、株式コップへ買い戻し資金が入る直接の追い風になります（現在 ${cupName} ${cupMove}）。`
        : `トランプ政権の関税・通商発言は、輸出企業の採算悪化と米インフレ再燃（金利高止まり）の両面から株式の重荷になりやすく、米ドル現金・ゴールド・防衛などへ資金が退避・移動する直接のきっかけになります（現在 ${cupName} ${cupMove}）。`,
    };
  }

  // 4. 地政学衝突・軍事・供給途絶
  if (/攻撃|ミサイル|報復|紛争|停戦|海峡|封鎖|中東|ウクライナ|台湾|制裁/.test(title)) {
    const isDeescalation = /停戦|和平|合意|緩和/.test(title);
    return {
      impactTag: "地政学・供給リスク",
      direction: isDeescalation ? "bullish" : "bearish",
      directionLabel: isDeescalation ? "リスク後退・買い材料" : "リスク回避・逃避材料",
      isDirectCatalyst: true,
      impactSummary: isDeescalation
        ? `地政学リスクの後退は、安全資産（ゴールド・原油・ドル）に逃げていた資金が株式市場へ戻るきっかけになります。`
        : `地政学リスクの高まりは、株式から原油・ゴールド・米国債・米ドル・防衛関連へ一気に資金が動く典型的なリスクオフ要因です（現在 ${cupName} ${cupMove}）。`,
    };
  }

  // 5. 決算サプライズ・業績修正・資本政策
  if (/好決算|上方修正|過去最高|自社株買い|増配|予想上回|急騰|最高益/.test(title)) {
    return {
      impactTag: "好決算・買い材料",
      direction: "bullish",
      directionLabel: "上昇原因・買い材料",
      isDirectCatalyst: true,
      impactSummary: `市場予想を上回る好決算や業績上方修正・株主還元強化は、関連セクター全体への連想買いを呼び込み、コップの水位を押し上げる直接の上昇要因になります（現在 ${cupName} ${cupMove}）。`,
    };
  }
  if (/下方修正|減益|赤字|予想下回|急落|失望|ショック|業績悪化/.test(title)) {
    return {
      impactTag: "業績悪化・売り材料",
      direction: "bearish",
      directionLabel: "下落原因・売り材料",
      isDirectCatalyst: true,
      impactSummary: `業績の下方修正や市場予想を下回る決算は、セクター全体の成長鈍化懸念につながり、機関投資家の利益確定や乗り換え売りを加速させる直接の下落要因になります（現在 ${cupName} ${cupMove}）。`,
    };
  }

  // 6. FRB・米金利・インフレ
  if (/FRB|FOMC|パウエル|利下げ|利上げ|米金利|米国債|CPI|雇用統計|インフレ/.test(title)) {
    const isDovish = /利下げ|ハト派|鈍化|低下|減速/.test(title);
    const isHawkish = /利上げ|タカ派|上振れ|再燃|急上昇|慎重/.test(title);
    return {
      impactTag: "米金利・金融政策",
      direction: isDovish ? "bullish" : isHawkish ? "bearish" : "mixed",
      directionLabel: isDovish
        ? "金利低下・株債券追い風"
        : isHawkish
        ? "金利警戒・グロース重荷"
        : "金利動向・注目材料",
      isDirectCatalyst: isDovish || isHawkish,
      impactSummary: `米金融政策やインフレ指標は世界の資金コストを決める最重要トリガーです。利下げ・金利低下観測は米国債と米ハイテク株の追い風に、利上げ・金利上昇警戒はドル現金やバリュー株への資金シフトを促します（現在 ${cupName} ${cupMove}）。`,
    };
  }

  // 7. 日銀・国内金利
  if (/日銀|植田|国内.*金利|国債利回り/.test(title)) {
    return {
      impactTag: "日銀・国内金利",
      direction: "mixed",
      directionLabel: "為替・金融セクター変動要因",
      isDirectCatalyst: /利上げ|サプライズ|決定|修正/.test(title),
      impactSummary: `日銀の政策スタンスや国内金利観測は、為替（ドル円）と日本の銀行・金融株の水位に直結します。利上げ観測は銀行株に買い材料となる一方、円高を通じて輸出株には重荷になりやすい材料です。`,
    };
  }

  // 8. AI・半導体投資
  if (/半導体|NVIDIA|エヌビディア|AI|データセンター|電線|光ファイバー/.test(title)) {
    const isBear = /下落|安|売り|懸念|調整|減速/.test(title);
    return {
      impactTag: "AI・半導体投資",
      direction: isBear ? "bearish" : "bullish",
      directionLabel: isBear ? "調整・売り材料" : "成長期待・買い材料",
      isDirectCatalyst: /NVIDIA|エヌビディア|設備投資|受注|新製品/.test(title),
      impactSummary: `AIサーバーやデータセンター投資の動向は、米NASDAQだけでなく日本の半導体装置・電線インフラへ連鎖的に資金を動かします（現在 ${cupName} ${cupMove}で${isUp ? "買い優勢" : "調整含み"}）。`,
    };
  }

  // 9. 原油・資源
  if (/原油|WTI|OPEC|エネルギー/.test(title)) {
    return {
      impactTag: "原油・エネルギー",
      direction: "mixed",
      directionLabel: "インフレ・資源変動要因",
      isDirectCatalyst: /減産|増産|急騰|急落/.test(title),
      impactSummary: `原油価格の変動は資源セクターの収益だけでなく、インフレ見通しを通じて米国債金利や株式全体のバリュエーションに波及します。`,
    };
  }

  // 10. 為替
  if (/円安|円高|ドル円|為替|ドル高|ドル安/.test(title)) {
    return {
      impactTag: "為替・ドル資金",
      direction: "mixed",
      directionLabel: "輸出・内需の分岐材料",
      isDirectCatalyst: /介入|急落|急騰|突破/.test(title),
      impactSummary: `為替の方向性は日本株（輸出主力 vs 内需）と米ドル現金コップのバランスを大きく左右します。円安は外需株の追い風、急激な円高はディフェンシブや安全資産への資金移動につながります。`,
    };
  }

  // 11. 暗号資産
  if (/ビットコイン|BTC|暗号資産|仮想通貨|現物ETF/.test(title)) {
    const isBear = /流出|下落|売り|規制|ハッキング/.test(title);
    return {
      impactTag: "暗号資産・流動性",
      direction: isBear ? "bearish" : "bullish",
      directionLabel: isBear ? "流出・リスク回避" : "流入・リスク選好",
      isDirectCatalyst: /ETF|最高値|急騰|急落/.test(title),
      impactSummary: `ビットコイン関連のETFフローや規制ニュースは、市場全体のリスク許容度を測る先行指標として注目されます（現在 ${cupName} ${cupMove}）。`,
    };
  }

  return {
    impactTag: "市況・需給材料",
    direction: "mixed",
    directionLabel: "市況・注目材料",
    isDirectCatalyst: false,
    impactSummary: `直近の相場テーマや企業・マクロ動向を映すヘッドラインとして、${cupName}（現在 ${cupMove}）を中心とした短期の資金配分の判断材料になっています。`,
  };
};

const parseNewsTimestamp = (date?: string, time?: string): number => {
  if (!date && !time) return 0;
  const normalizedDate = (date ?? "").trim().replace(/\//g, "-");
  const normalizedTime = (time ?? "").trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalizedDate)) {
    const [y, m, d] = normalizedDate.split("-").map(Number);
    const [hh, mm] = /^\d{1,2}:\d{2}$/.test(normalizedTime)
      ? normalizedTime.split(":").map(Number)
      : [0, 0];
    return Date.UTC(y, m - 1, d, hh, mm);
  }
  const parsed = Date.parse(`${normalizedDate} ${normalizedTime}`.trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortNewestFirst = (a: FlowNewsImpact, b: FlowNewsImpact) =>
  b.publishedAtMs !== a.publishedAtMs
    ? b.publishedAtMs - a.publishedAtMs
    : b.importanceScore - a.importanceScore;

export const analyzeFlowNews = (
  newsItems: NewsItem[],
  cups: MoneyFlowCup[]
): {
  topNews: FlowNewsImpact[];
  newsByCupId: Record<string, FlowNewsImpact[]>;
} => {
  const cupIds = new Set(cups.map((cup) => cup.id));
  const cupById = new Map(cups.map((cup) => [cup.id, cup]));
  const seenTitles = new Set<string>();

  const analyzed: FlowNewsImpact[] = [];

  for (const item of newsItems) {
    const title = item.title?.trim() ?? "";
    if (!title || title.length < 8 || NOISE_NEWS_PATTERN.test(title)) continue;
    const normalized = title.toLowerCase().replace(/\s+/g, "");
    if (seenTitles.has(normalized)) continue;
    seenTitles.add(normalized);

    const matched: Array<{ id: string; score: number; label: string }> = [];
    for (const id of cupIds) {
      const rule = CUP_NEWS_RULES[id];
      if (!rule) continue;
      const isStrong = rule.strongPattern.test(title);
      const isPattern = rule.pattern.test(title);
      if (!isStrong && !isPattern) continue;
      // 除外パターンに一致し、かつ自身の強キーワードを含まない記事は他地域・他アセット扱いとして除外
      if (rule.excludePattern && rule.excludePattern.test(title) && !isStrong) {
        continue;
      }
      const score = (isPattern ? 3 : 0) + (isStrong ? 4 : 0);
      if (score > 0) {
        matched.push({ id, score, label: rule.label });
      }
    }

    if (!matched.length) continue;
    matched.sort((a, b) => b.score - a.score);

    // 明確に該当するコップ（最上位、または強一致のコップ）だけに紐づけ、無関係な混入を防ぐ
    const topScore = matched[0].score;
    const strictMatched = matched.filter(
      (entry, idx) => idx === 0 || (entry.score >= 7 && entry.score >= topScore)
    );

    const primaryCup = cupById.get(strictMatched[0].id);
    const { impactTag, direction, directionLabel, isDirectCatalyst, impactSummary } =
      classifyNewsImpact(title, primaryCup);

    // 具体的な騰落カタリスト（規制・政権・疑惑・サプライズ決算）を優先表示
    const catalystBonus = isDirectCatalyst ? 5 : 0;
    // 該当コップの実際の騰落方向とニュースの方向が一致していれば「今の騰落の直接原因」として高スコア
    const moveAlignBonus =
      primaryCup &&
      ((direction === "bearish" && primaryCup.changePercent <= -0.3) ||
        (direction === "bullish" && primaryCup.changePercent >= 0.3))
        ? 4
        : 0;
    const topCupBonus = primaryCup && (primaryCup.rank <= 2 || primaryCup.rank === cups.length) ? 2 : 0;
    const importanceScore =
      strictMatched[0].score +
      Math.min(strictMatched.length, 3) * 1.5 +
      catalystBonus +
      moveAlignBonus +
      topCupBonus +
      (item.isHot ? 1 : 0);

    const dateLabel = [item.date?.replace(/^\d{4}\//, ""), item.time].filter(Boolean).join(" ");
    const publishedAtMs = parseNewsTimestamp(item.date, item.time);

    analyzed.push({
      id: `${item.id}-${normalized.slice(0, 16)}`,
      title,
      source: item.source || item.provider || "ニュース",
      dateLabel,
      publishedAtMs,
      url: item.url,
      matchedCupIds: strictMatched.map((m) => m.id),
      matchedCupLabels: strictMatched.slice(0, 2).map((m) => m.label),
      impactTag,
      direction,
      directionLabel,
      isDirectCatalyst,
      impactSummary,
      importanceScore,
    });
  }

  // 重要度順に上位ニュースを選出したあと、表示は必ず新しい順（日時降順）に並べる
  analyzed.sort((a, b) =>
    b.importanceScore !== a.importanceScore
      ? b.importanceScore - a.importanceScore
      : b.publishedAtMs - a.publishedAtMs
  );

  // 全体TOPニュースは同じテーマに偏りすぎないよう最大4件を選出 → 新しい順に並べ替え
  const topNews: FlowNewsImpact[] = [];
  const usedTags = new Map<string, number>();
  for (const entry of analyzed) {
    if (topNews.length >= 4) break;
    const tagCount = usedTags.get(entry.impactTag) ?? 0;
    if (tagCount >= 2 && analyzed.length > 4) continue;
    topNews.push(entry);
    usedTags.set(entry.impactTag, tagCount + 1);
  }
  topNews.sort(sortNewestFirst);

  // 各コップの関連ニュースは新しい順で最大3件を表示
  const newsByCupId: Record<string, FlowNewsImpact[]> = {};
  for (const cup of cups) {
    newsByCupId[cup.id] = analyzed
      .filter((entry) => entry.matchedCupIds.includes(cup.id))
      .sort(sortNewestFirst)
      .slice(0, 3);
  }

  return { topNews, newsByCupId };
};


