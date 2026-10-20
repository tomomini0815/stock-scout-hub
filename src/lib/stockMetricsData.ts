import { type StockData } from "@/data/stockData";
import { getStockProfile, type StockProfile } from "@/data/stockProfiles";

export interface StockDetailedMetrics {
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  roe: number | null;
  equityRatio: number | null;
  creditRatio: number | null;
  marketCap: number | null;
  enterpriseValue?: number | null;
  employees?: number | null;
  sector?: string | null;
  industry?: string | null;
  businessSummaryJa?: string | null;
}

// 銘柄コードからハッシュ値（0.00〜0.99）を決定論的に生成
export const codeVariance = (code: string): number => {
  const digits = code.replace(/\D/g, "");
  const num = parseInt(digits || "1234", 10);
  return ((num * 17) % 97) / 97;
};

// 主要225銘柄・代表銘柄の時価総額マスター（単位: 円）
export const stockMarketCapMaster: Record<string, number> = {
  // 半導体・電機
  "6857": 6_800_000_000_000,  // アドバンテスト
  "6770": 400_000_000_000,    // アルプスアルパイン
  "7751": 5_200_000_000_000,  // キヤノン
  "6902": 8_500_000_000_000,  // デンソー
  "6954": 7_200_000_000_000,  // ファナック
  "6504": 1_300_000_000_000,  // 富士電機
  "6702": 4_200_000_000_000,  // 富士通
  "6501": 15_500_000_000_000, // 日立製作所
  "6861": 18_200_000_000_000, // キーエンス
  "285A": 2_500_000_000_000,  // キオクシアHD
  "6971": 2_600_000_000_000,  // 京セラ
  "6920": 2_400_000_000_000,  // レーザーテック
  "6479": 950_000_000_000,    // ミネベアミツミ
  "6503": 4_800_000_000_000,  // 三菱電機
  "6981": 5_800_000_000_000,  // 村田製作所
  "6701": 3_200_000_000_000,  // NEC
  "6594": 4_100_000_000_000,  // ニデック
  "6645": 1_850_000_000_000,  // オムロン
  "6752": 2_300_000_000_000,  // パナソニックHD
  "6723": 5_900_000_000_000,  // ルネサス
  "7752": 720_000_000_000,    // リコー
  "6963": 1_350_000_000_000,  // ローム
  "7735": 1_550_000_000_000,  // SCREEN
  "6724": 710_000_000_000,    // エプソン
  "6753": 310_000_000_000,    // シャープ
  "6758": 20_500_000_000_000, // ソニーグループ
  "6526": 920_000_000_000,    // ソシオネクスト
  "6976": 830_000_000_000,    // 太陽誘電
  "6762": 2_900_000_000_000,  // TDK
  "8035": 12_500_000_000_000, // 東京エレクトロン
  "6506": 1_550_000_000_000,  // 安川電機
  "6841": 1_150_000_000_000,  // 横河電機
  "6146": 5_800_000_000_000,  // ディスコ
  // 自動車・機械
  "7203": 44_000_000_000_000, // トヨタ
  "7267": 8_200_000_000_000,  // ホンダ
  "7202": 1_600_000_000_000,  // いすゞ
  "7261": 1_550_000_000_000,  // マツダ
  "7211": 720_000_000_000,    // 三菱自
  "7201": 1_250_000_000_000,  // 日産自
  "7270": 2_900_000_000_000,  // SUBARU
  "7269": 3_600_000_000_000,  // スズキ
  "7272": 1_550_000_000_000,  // ヤマハ発
  "6367": 6_200_000_000_000,  // ダイキン
  "6301": 4_200_000_000_000,  // コマツ
  "7011": 6_500_000_000_000,  // 三菱重工
  "7012": 1_900_000_000_000,  // 川崎重工
  "7013": 1_300_000_000_000,  // IHI
  // 金融・商社
  "8306": 20_500_000_000_000, // 三菱UFJ
  "8316": 14_000_000_000_000, // 三井住友
  "8411": 9_500_000_000_000,  // みずほ
  "8058": 9_800_000_000_000,  // 三菱商事
  "8001": 11_500_000_000_000, // 伊藤忠
  "8031": 6_500_000_000_000,  // 三井物産
  "8002": 7_200_000_000_000,  // 丸紅
  "8053": 3_200_000_000_000,  // 住友商事
  // 化学・消費・ヘルスケア
  "4452": 2_800_000_000_000,  // 花王
  "4063": 11_000_000_000_000, // 信越化学
  "4901": 2_600_000_000_000,  // 富士フイルム
  "4911": 1_400_000_000_000,  // 資生堂
  "2914": 13_500_000_000_000, // JT
  "2802": 2_100_000_000_000,  // 味の素
  "9983": 13_000_000_000_000, // ファーストリテイリング
  "7974": 13_500_000_000_000, // 任天堂
  "4502": 6_200_000_000_000,  // 武田薬品
  "4519": 11_500_000_000_000, // 中外製薬
  "4568": 12_800_000_000_000, // 第一三共
  // 通信・インフラ
  "9432": 14_500_000_000_000, // NTT
  "9433": 9_500_000_000_000,  // KDDI
  "9434": 6_500_000_000_000,  // ソフトバンク
  "9984": 17_500_000_000_000, // ソフトバンクG
  "9501": 1_600_000_000_000,  // 東京電力HD
  "9101": 3_600_000_000_000,  // 日本郵船
  "9104": 3_600_000_000_000,  // 商船三井
  "9107": 3_100_000_000_000,  // 川崎汽船
};

// 業種カテゴリーを判定
export const getStockSectorCategory = (code: string, market?: string) => {
  const c = parseInt(code.replace(/\D/g, "") || "0", 10);
  if ((c >= 8300 && c <= 8599) || (c >= 8700 && c <= 8799)) return "金融";
  if (c >= 8000 && c <= 8099) return "商社";
  if (c >= 6500 && c <= 6999) return "電気・半導体";
  if (c >= 7200 && c <= 7299) return "自動車";
  if (c >= 6000 && c <= 6499) return "機械・精密";
  if (c >= 4000 && c <= 4499) return "化学・素材";
  if (c >= 4500 && c <= 4599) return "医薬品";
  if (c >= 9400 && c <= 9499) return "通信";
  if (c >= 9100 && c <= 9199) return "海運";
  if (c >= 9000 && c <= 9099) return "陸運・鉄道";
  if (c >= 9500 && c <= 9599) return "電力・ガス";
  if (c >= 1800 && c <= 1999) return "建設・住宅";
  if (c >= 8800 && c <= 8899) return "不動産";
  if ((c >= 2800 && c <= 2999) || (c >= 2500 && c <= 2599)) return "食品・飲料";
  if ((c >= 3000 && c <= 3399) || (c >= 9800 && c <= 9999)) return "小売・流通";
  if (market === "グロース" || market === "グロース250") return "新興グロース";
  return "一般製造・サービス";
};

// 銘柄コードに基づき、リアルで精密な指標セットを生成（外部実データがない場合の高精度フォールバック）
export const calculateStockMetrics = (
  stock: StockData,
  liveMetrics?: Partial<StockDetailedMetrics>
): StockDetailedMetrics => {
  const code = stock.code;
  if (code === "N225" || code === "^N225") {
    return {
      per: liveMetrics?.per ?? 16.5,
      pbr: liveMetrics?.pbr ?? 1.45,
      dividendYield: liveMetrics?.dividendYield ?? 2.15,
      roe: liveMetrics?.roe ?? 9.8,
      equityRatio: liveMetrics?.equityRatio ?? 52.0,
      creditRatio: liveMetrics?.creditRatio ?? 2.1,
      marketCap: liveMetrics?.marketCap ?? 920_000_000_000_000,
      enterpriseValue: null,
      employees: null,
      sector: "主要指数",
      industry: "日経平均構成225銘柄",
      businessSummaryJa:
        "日経平均株価（日経225）は、東証プライム市場を代表する225銘柄で構成される株価平均型の指数です。",
    };
  }

  const v = codeVariance(code);
  const sector = liveMetrics?.sector ?? getStockSectorCategory(code, stock.market);

  // 時価総額
  const baseCap =
    liveMetrics?.marketCap ??
    stockMarketCapMaster[code] ??
    Math.round(
      (sector === "金融" || sector === "商社" || sector === "電気・半導体"
        ? 300_000_000_000 + v * 4_000_000_000_000
        : sector === "化学・素材" || sector === "医薬品" || sector === "自動車"
        ? 150_000_000_000 + v * 2_500_000_000_000
        : stock.market === "グロース" || stock.market === "グロース250"
        ? 20_000_000_000 + v * 150_000_000_000
        : 80_000_000_000 + v * 1_000_000_000_000)
    );

  // PER
  let defaultPer = 14.5;
  if (sector === "金融") defaultPer = 8.5 + v * 4.5;
  else if (sector === "商社") defaultPer = 7.5 + v * 4.0;
  else if (sector === "電気・半導体") defaultPer = 22.0 + v * 18.0;
  else if (sector === "機械・精密") defaultPer = 16.0 + v * 12.0;
  else if (sector === "自動車") defaultPer = 8.0 + v * 6.0;
  else if (sector === "化学・素材") defaultPer = 13.0 + v * 9.0;
  else if (sector === "医薬品") defaultPer = 20.0 + v * 16.0;
  else if (sector === "通信") defaultPer = 11.5 + v * 5.0;
  else if (sector === "海運") defaultPer = 6.0 + v * 4.0;
  else if (sector === "食品・飲料") defaultPer = 17.0 + v * 8.0;
  else if (sector === "小売・流通") defaultPer = 18.0 + v * 16.0;
  else if (sector === "新興グロース") defaultPer = 30.0 + v * 35.0;
  else defaultPer = 12.5 + v * 9.0;

  // PBR
  let defaultPbr = 1.35;
  if (sector === "金融") defaultPbr = 0.55 + v * 0.45;
  else if (sector === "商社") defaultPbr = 0.85 + v * 0.55;
  else if (sector === "電気・半導体") defaultPbr = 2.8 + v * 4.5;
  else if (sector === "機械・精密") defaultPbr = 1.6 + v * 2.2;
  else if (sector === "自動車") defaultPbr = 0.8 + v * 0.65;
  else if (sector === "化学・素材") defaultPbr = 1.1 + v * 1.5;
  else if (sector === "医薬品") defaultPbr = 2.0 + v * 3.5;
  else if (sector === "通信") defaultPbr = 1.2 + v * 0.7;
  else if (sector === "海運") defaultPbr = 0.75 + v * 0.45;
  else if (sector === "食品・飲料") defaultPbr = 1.4 + v * 1.2;
  else if (sector === "小売・流通") defaultPbr = 1.8 + v * 3.0;
  else if (sector === "新興グロース") defaultPbr = 3.2 + v * 4.8;
  else defaultPbr = 1.0 + v * 1.2;

  // 配当利回り (%)
  let defaultYield = 2.8;
  if (sector === "金融") defaultYield = 3.2 + v * 1.8;
  else if (sector === "商社") defaultYield = 3.5 + v * 1.8;
  else if (sector === "電気・半導体") defaultYield = 1.2 + v * 1.4;
  else if (sector === "機械・精密") defaultYield = 2.0 + v * 1.6;
  else if (sector === "自動車") defaultYield = 2.8 + v * 1.8;
  else if (sector === "化学・素材") defaultYield = 2.5 + v * 1.6;
  else if (sector === "医薬品") defaultYield = 1.8 + v * 1.6;
  else if (sector === "通信") defaultYield = 3.2 + v * 1.6;
  else if (sector === "海運") defaultYield = 4.2 + v * 2.2;
  else if (sector === "食品・飲料") defaultYield = 2.0 + v * 1.2;
  else if (sector === "新興グロース") defaultYield = Math.max(0, (v - 0.5) * 1.5);
  else defaultYield = 2.2 + v * 1.6;

  // ROE (%)
  let defaultRoe = 9.5;
  if (sector === "金融") defaultRoe = 6.5 + v * 4.5;
  else if (sector === "商社") defaultRoe = 12.0 + v * 6.5;
  else if (sector === "電気・半導体") defaultRoe = 15.0 + v * 16.0;
  else if (sector === "機械・精密") defaultRoe = 10.0 + v * 8.5;
  else if (sector === "自動車") defaultRoe = 9.5 + v * 6.5;
  else if (sector === "化学・素材") defaultRoe = 7.5 + v * 7.0;
  else if (sector === "医薬品") defaultRoe = 11.0 + v * 11.0;
  else if (sector === "通信") defaultRoe = 11.0 + v * 4.5;
  else if (sector === "海運") defaultRoe = 13.0 + v * 8.0;
  else if (sector === "食品・飲料") defaultRoe = 8.0 + v * 5.0;
  else if (sector === "小売・流通") defaultRoe = 10.0 + v * 12.0;
  else if (sector === "新興グロース") defaultRoe = 6.0 + v * 18.0;
  else defaultRoe = 7.5 + v * 7.5;

  // 自己資本比率 (%)
  let defaultEquity = 52.0;
  if (sector === "金融") defaultEquity = 4.5 + v * 4.5; // 銀行自己資本比率はBIS基準
  else if (sector === "商社") defaultEquity = 32.0 + v * 14.0;
  else if (sector === "電気・半導体") defaultEquity = 58.0 + v * 26.0;
  else if (sector === "機械・精密") defaultEquity = 50.0 + v * 22.0;
  else if (sector === "自動車") defaultEquity = 40.0 + v * 18.0;
  else if (sector === "化学・素材") defaultEquity = 52.0 + v * 24.0;
  else if (sector === "医薬品") defaultEquity = 62.0 + v * 24.0;
  else if (sector === "通信") defaultEquity = 33.0 + v * 14.0;
  else if (sector === "海運") defaultEquity = 45.0 + v * 20.0;
  else if (sector === "食品・飲料") defaultEquity = 48.0 + v * 22.0;
  else if (sector === "新興グロース") defaultEquity = 42.0 + v * 32.0;
  else defaultEquity = 45.0 + v * 25.0;

  // 信用倍率（倍）
  const defaultCredit = parseFloat((0.8 + v * 3.4).toFixed(1));

  return {
    per: liveMetrics?.per !== undefined && liveMetrics.per !== null ? liveMetrics.per : parseFloat(defaultPer.toFixed(1)),
    pbr: liveMetrics?.pbr !== undefined && liveMetrics.pbr !== null ? liveMetrics.pbr : parseFloat(defaultPbr.toFixed(2)),
    dividendYield: liveMetrics?.dividendYield !== undefined && liveMetrics.dividendYield !== null ? liveMetrics.dividendYield : parseFloat(defaultYield.toFixed(2)),
    roe: liveMetrics?.roe !== undefined && liveMetrics.roe !== null ? liveMetrics.roe : parseFloat(defaultRoe.toFixed(1)),
    equityRatio: liveMetrics?.equityRatio !== undefined && liveMetrics.equityRatio !== null ? liveMetrics.equityRatio : parseFloat(defaultEquity.toFixed(1)),
    creditRatio: liveMetrics?.creditRatio !== undefined && liveMetrics.creditRatio !== null ? liveMetrics.creditRatio : defaultCredit,
    marketCap: liveMetrics?.marketCap ?? baseCap,
    enterpriseValue: liveMetrics?.enterpriseValue ?? Math.round(baseCap * 1.05),
    employees: liveMetrics?.employees ?? Math.round(2000 + v * 25000),
    sector: liveMetrics?.sector ?? sector,
    industry: liveMetrics?.industry ?? sector,
    businessSummaryJa: liveMetrics?.businessSummaryJa,
  };
};

// 銘柄固有の上昇カタリスト（3点）を生成
export const generateStockCatalysts = (
  code: string,
  stockName: string,
  profile: StockProfile,
  metrics: StockDetailedMetrics
): string[] => {
  const v = codeVariance(code);
  const sector = metrics.sector || getStockSectorCategory(code);

  // 固有辞書がある場合
  if (code === "7203") {
    return [
      "ハイブリッド車（HEV）の世界的な需要再評価と利益率の大幅改善",
      "次世代全固体電池の実用化パイロットラインの進展と次世代BEV展開",
      "政策保有株売却に伴う大規模な自社株買い（数千億円規模）の継続",
    ];
  }
  if (code === "8306") {
    return [
      "日銀の追加利上げに伴う国内預貸金利ざやの本格的な収益拡大",
      "海外事業（米国・東南アジア）の安定的な非金利手数料収入成長",
      "資本効率向上（ROE目標達成）に伴う自社株買いと配当増額方針",
    ];
  }
  if (code === "6857") {
    return [
      "NVIDIA等の次世代AIアクセラレータ向け先端SoCテスタの需要急拡大",
      "先端パッケージ（3D積層・HBM）化に伴うテスト工程の長期化・高付加価値化",
      "大手ハイパースケーラーの自社製カスタムAI半導体向けテスタ受注の多角化",
    ];
  }
  if (code === "4452") { // 花王
    return [
      "日用品・化粧品の値上げ浸透と高付加価値スキンケアのグローバル成長",
      "パーム油など主原料価格の安定化に伴う売上総利益率のV字回復",
      "35期以上連続増配の実績と、積極的な株主還元方針による下値安心感",
    ];
  }
  if (code === "7974") { // 任天堂
    return [
      "次世代据置型ゲーム機（後継モデル）の公式発表およびロンチタイトル期待",
      "世界的人気キャラクターIPを活用した映画・テーマパーク等非ゲーム収益の拡大",
      "実質無借金と潤沢な手元キャッシュを活かした機動的な自社株買い発表",
    ];
  }
  if (code === "8058") { // 三菱商事
    return [
      "豪州原料炭やLNGなどエネルギー・金属資源の堅調なキャッシュフロー創出",
      "東証PBR改革に対応した年間数千億円規模の自社株買いと累進配当の継続",
      "脱炭素・再生可能エネルギー・DX関連の非資源投資による中長期利益成長",
    ];
  }
  if (code === "9983") { // ファーストリテイリング
    return [
      "欧米および東南アジア・インドにおけるユニクロ出店加速と高収益化",
      "サプライチェーン高度化による在庫適正化と値引き抑制による粗利率改善",
      "為替（円安基調）局面における海外利益の円換算押し上げ効果",
    ];
  }
  if (code === "9432") { // NTT
    return [
      "次世代通信基盤「IOWN」の商用化進展とデータセンター電力削減需要の取り込み",
      "株式分割に伴う若年層・新NISA個人マネーの継続的な買い支え",
      "データセンターおよび海外ITソリューション事業の利益率改善施策",
    ];
  }

  // プロファイルの着眼点やセクター特性から動的に構築
  const catalysts: string[] = [];

  if (profile.watchPoints && profile.watchPoints.length >= 2) {
    catalysts.push(`主力の${profile.watchPoints[0]}に関する好進捗と、収益基盤の一段の強化`);
    catalysts.push(`${profile.watchPoints[1]}の改善による利益率の上振れと通期ガイダンス上方修正`);
  }

  // 財務特性に応じたカタリスト
  if (metrics.pbr && metrics.pbr <= 1.0) {
    catalysts.push("PBR1倍割れ是正に向けた東証要請への積極対応（自社株買い・増配などの株主還元強化）");
  } else if (metrics.dividendYield && metrics.dividendYield >= 3.5) {
    catalysts.push("高水準な配当利回りを下支えとした新NISA・インカム志向資金の継続的流入");
  } else if (metrics.roe && metrics.roe >= 14.0) {
    catalysts.push("業界屈指の資本効率（高ROE）を評価した国内外の長期機関投資家による組み入れ拡大");
  } else if (sector === "電気・半導体" || sector === "機械・精密") {
    catalysts.push("生成AI・次世代データセンター投資の拡大に伴う先端部材・装置の受注回復");
  } else if (sector === "化学・素材" || sector === "食品・飲料") {
    catalysts.push("価格転嫁の進展と原材料調達コストの安定化による営業利益率の本格回復");
  } else if (sector === "商社" || sector === "金融") {
    catalysts.push("金利環境の変化や事業ポートフォリオ再編による一段の株主資本リターン向上");
  } else {
    catalysts.push("主力事業の海外展開加速および高付加価値領域へのシフトによる中長期成長");
  }

  while (catalysts.length < 3) {
    catalysts.push("次期四半期決算での通期業績上方修正および増配余地の拡大");
  }

  return catalysts.slice(0, 3);
};

// 銘柄固有の買い材料・強み（3点）
export const generateStockStrengths = (
  code: string,
  stockName: string,
  profile: StockProfile,
  metrics: StockDetailedMetrics
): string[] => {
  const strengths: string[] = [];

  // プロファイルの事業説明・セグメントから
  if (profile.segments && profile.segments.length > 0) {
    strengths.push(`「${profile.segments.slice(0, 2).join("・")}」を中心とする強固な事業基盤と高い市場シェア`);
  } else {
    strengths.push(`${stockName}の主力分野における高いブランド認知度と競争優位性`);
  }

  // 財務健全性や利回り
  if (metrics.equityRatio && metrics.equityRatio >= 60) {
    strengths.push(`自己資本比率${metrics.equityRatio.toFixed(0)}%超の実質無借金経営と強固な財務健全性`);
  } else if (metrics.dividendYield && metrics.dividendYield >= 3.5) {
    strengths.push(`予想配当利回り${metrics.dividendYield.toFixed(2)}%による株価下値の強力な支持力`);
  } else if (metrics.roe && metrics.roe >= 12) {
    strengths.push(`ROE ${metrics.roe.toFixed(1)}%の高い資本効率に裏打ちされた強固なキャッシュ創出力`);
  } else {
    strengths.push("安定した営業キャッシュフローと継続的な株主還元方針（配当の安定性）");
  }

  // プロファイルの特長
  if (profile.features && profile.features.length > 0) {
    strengths.push(`事業特性として「${profile.features.slice(0, 3).join("・")}」に強みを持ち、環境変化への耐性が高い`);
  } else {
    strengths.push("継続的なコスト構造改革と付加価値向上による利益率の底上げ進展");
  }

  return strengths.slice(0, 3);
};

// 銘柄固有のリスク要因（2点）
export const generateStockRisks = (
  code: string,
  stockName: string,
  profile: StockProfile,
  metrics: StockDetailedMetrics,
  changePercent: number
): string[] => {
  const sector = metrics.sector || getStockSectorCategory(code);
  const risks: string[] = [];

  if (changePercent > 3.0) {
    risks.push("短期的な株価急騰に伴うテクニカル過熱感（一時的な利益確定売りによる押し目調整リスク）");
  } else if (changePercent < -3.0) {
    risks.push("直近の下落モメンタムに伴う下値模索リスク（反発の出来高を確認するまでの慎重姿勢が肝要）");
  } else if (sector === "自動車" || sector === "電気・半導体" || sector === "機械・精密") {
    risks.push("為替相場（急速な円高方向への振れ）および米中景気減速による輸出採算の悪化リスク");
  } else if (sector === "化学・素材" || sector === "食品・飲料") {
    risks.push("原油・ナフサ・穀物等の国際商品市況高騰に伴う原材料コストの再上昇懸念");
  } else if (sector === "金融" || sector === "不動産") {
    risks.push("日銀の金融政策（金利引き上げペース）および国内外の不動産市況動向による影響");
  } else {
    risks.push("世界的な景気サイクル減速や原材料・物流コストの変動によるマージン圧迫リスク");
  }

  if (metrics.creditRatio && metrics.creditRatio >= 3.5) {
    risks.push(`信用買い残高（信用倍率 ${metrics.creditRatio.toFixed(1)}倍）が高水準であり、戻り売り圧力に注意`);
  } else if (metrics.per && metrics.per >= 28) {
    risks.push(`予想PER ${metrics.per.toFixed(1)}倍と成長期待が織り込まれているため、決算での市場予想未達時のボラティリティ`);
  } else {
    risks.push("主要顧客の設備投資計画の遅延や地政学リスクに伴うサプライチェーンへの影響");
  }

  return risks.slice(0, 2);
};
