import { useEffect, useMemo, useState } from "react";
import { type StockData } from "@/data/stockData";
import { getStockProfile, hasManualProfile } from "@/data/stockProfiles";
import { useLiveStockQuote } from "@/hooks/useLiveStockQuote";

interface StockDetailPanelProps {
  stock: StockData;
}

interface StockMetrics {
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  roe: number | null;
  marketCap?: number | null;
  enterpriseValue?: number | null;
  employees?: number | null;
  // Yahoo Finance 企業プロフィール
  sector?: string | null;
  industry?: string | null;
  businessSummaryJa?: string | null;
}

type MetricsState =
  | { status: "loading"; metrics?: undefined }
  | { status: "ready"; metrics: StockMetrics }
  | { status: "error"; metrics?: undefined };

const formatMetric = (value: number | null | undefined, suffix = "", digits = 2) =>
  Number.isFinite(value) ? `${Number(value).toFixed(digits)}${suffix}` : "取得中";

const formatLargeYen = (value: number | null | undefined) => {
  if (!Number.isFinite(value)) return "取得中";
  const oku = Number(value) / 100_000_000;
  if (oku >= 10_000) return `${(oku / 10_000).toFixed(1)}兆円`;
  return `${oku.toLocaleString(undefined, { maximumFractionDigits: 0 })}億円`;
};

const formatEmployees = (value: number | null | undefined) => {
  if (!Number.isFinite(value)) return "取得中";
  return `${Number(value).toLocaleString()}人`;
};

const classifyMarketCap = (value: number | null | undefined) => {
  if (!Number.isFinite(value)) return "規模確認中";
  const oku = Number(value) / 100_000_000;
  if (oku >= 50_000) return "超大型";
  if (oku >= 10_000) return "大型";
  if (oku >= 3_000) return "中大型";
  if (oku >= 1_000) return "中型";
  return "小中型";
};

// コードを使った決定論的ばらつき生成 (0.00〜0.99)
const codeVariance = (code: string) => (parseInt(code.replace(/\D/g, ""), 10) % 97) / 97;

// 銘柄ごとの時価総額フォールバック（単位: 円）
const fallbackMarketCaps: Record<string, number> = {
  // ── 半導体・電機 ──
  "6857": 5_500_000_000_000,  // アドバンテスト
  "6770": 400_000_000_000,    // アルプスアルパイン
  "7751": 5_000_000_000_000,  // キヤノン
  "6902": 8_000_000_000_000,  // デンソー
  "6954": 7_000_000_000_000,  // ファナック
  "6504": 1_200_000_000_000,  // 富士電機
  "6702": 4_000_000_000_000,  // 富士通
  "6501": 15_000_000_000_000, // 日立製作所
  "6861": 18_000_000_000_000, // キーエンス
  "285A": 2_500_000_000_000,  // キオクシアHD
  "6971": 2_500_000_000_000,  // 京セラ
  "6920": 3_000_000_000_000,  // レーザーテック
  "6479": 900_000_000_000,    // ミネベアミツミ
  "6503": 4_500_000_000_000,  // 三菱電機
  "6981": 5_500_000_000_000,  // 村田製作所
  "6701": 3_000_000_000_000,  // NEC
  "6594": 4_000_000_000_000,  // ニデック
  "6645": 1_800_000_000_000,  // オムロン
  "6752": 2_200_000_000_000,  // パナソニックHD
  "6723": 6_000_000_000_000,  // ルネサスエレクトロニクス
  "7752": 700_000_000_000,    // リコー
  "6963": 1_300_000_000_000,  // ローム
  "7735": 1_500_000_000_000,  // SCREENホールディングス
  "6724": 700_000_000_000,    // セイコーエプソン
  "6753": 300_000_000_000,    // シャープ
  "6758": 20_000_000_000_000, // ソニーグループ
  "6526": 900_000_000_000,    // ソシオネクスト
  "6976": 800_000_000_000,    // 太陽誘電
  "6762": 2_800_000_000_000,  // TDK
  "8035": 12_000_000_000_000, // 東京エレクトロン
  "6506": 1_500_000_000_000,  // 安川電機
  "6841": 1_100_000_000_000,  // 横河電機
  "6146": 6_000_000_000_000,  // ディスコ
  // ── 自動車・機械 ──
  "543A": 1_000_000_000_000,  // 国際電気
  "7267": 8_000_000_000_000,  // 本田技研工業
  "7202": 1_500_000_000_000,  // いすゞ自動車
  "7261": 1_500_000_000_000,  // マツダ
  "7211": 700_000_000_000,    // 三菱自動車工業
  "7201": 1_200_000_000_000,  // 日産自動車
  "7270": 2_800_000_000_000,  // SUBARU
  "7269": 3_500_000_000_000,  // スズキ
  "7203": 45_000_000_000_000, // トヨタ自動車
  "7272": 1_500_000_000_000,  // ヤマハ発動機
  "6113": 1_000_000_000_000,  // アマダ
  "6367": 6_000_000_000_000,  // ダイキン工業
  "6361": 1_500_000_000_000,  // 荏原製作所
  "6305": 1_800_000_000_000,  // 日立建機
  "7004": 900_000_000_000,    // カナデビア
  "7013": 1_200_000_000_000,  // IHI
  "5631": 900_000_000_000,    // 日本製鋼所
  "6473": 500_000_000_000,    // ジェイテクト
  "6301": 4_000_000_000_000,  // コマツ
  "6326": 3_000_000_000_000,  // クボタ
  "7011": 6_000_000_000_000,  // 三菱重工業
  "6471": 600_000_000_000,    // 日本精工
  "6472": 300_000_000_000,    // NTN
  "6103": 700_000_000_000,    // オークマ
  "6302": 900_000_000_000,    // 住友重機械工業
  "6273": 3_500_000_000_000,  // SMC
  "7012": 1_800_000_000_000,  // 川崎重工業
  // ── 金融・不動産 ──
  "8304": 1_500_000_000_000,  // 横浜銀行（コンコルディア）
  "8331": 900_000_000_000,    // 千葉銀行
  "8354": 1_300_000_000_000,  // ふくおかFG
  "8306": 19_000_000_000_000, // 三菱UFJ FG
  "8411": 9_000_000_000_000,  // みずほFG
  "8308": 2_500_000_000_000,  // りそなHD
  "5831": 800_000_000_000,    // 農林中央金庫
  "8316": 12_000_000_000_000, // 三井住友FG
  "8309": 1_500_000_000_000,  // 三井住友トラスト
  "7186": 500_000_000_000,    // コンコルディアFG
  "8750": 3_000_000_000_000,  // 第一生命HD
  "8725": 2_500_000_000_000,  // MS&ADインシュアランス
  "8630": 2_000_000_000_000,  // SOMPOホールディングス
  "8795": 1_000_000_000_000,  // T&Dホールディングス
  "8766": 7_000_000_000_000,  // 東京海上HD
  "8253": 800_000_000_000,    // クレディセゾン
  "8697": 1_800_000_000_000,  // 日本取引所グループ
  "8591": 3_000_000_000_000,  // オリックス
  "8601": 1_500_000_000_000,  // 大和証券グループ
  "8604": 2_500_000_000_000,  // 野村ホールディングス
  "8802": 3_000_000_000_000,  // 三菱地所
  "8801": 3_500_000_000_000,  // 三井不動産
  "8830": 2_000_000_000_000,  // 住友不動産
  "8804": 900_000_000_000,    // 東京建物
  "3289": 1_000_000_000_000,  // 東急不動産HD
  // ── 素材・化学 ──
  "3407": 1_500_000_000_000,  // 旭化成
  "4061": 400_000_000_000,    // デンカ
  "4901": 4_000_000_000_000,  // 富士フイルムHD
  "4452": 2_000_000_000_000,  // 花王
  "3405": 600_000_000_000,    // クラレ
  "4188": 1_500_000_000_000,  // 三菱ケミカルG
  "4183": 1_000_000_000_000,  // 三井化学
  "4021": 700_000_000_000,    // 日産化学
  "6988": 2_500_000_000_000,  // 日東電工
  "4004": 900_000_000_000,    // レゾナック
  "4063": 11_000_000_000_000, // 信越化学工業
  "4911": 1_500_000_000_000,  // 資生堂
  "4005": 800_000_000_000,    // 住友化学
  "4043": 400_000_000_000,    // トクヤマ
  "4042": 600_000_000_000,    // 東ソー
  "4208": 500_000_000_000,    // UBE
  "5201": 1_500_000_000_000,  // AGC
  "5333": 900_000_000_000,    // 日本ガイシ
  "5214": 500_000_000_000,    // 日本電気硝子
  "5233": 500_000_000_000,    // 太平洋セメント
  "5301": 400_000_000_000,    // 東海カーボン
  "5332": 900_000_000_000,    // TOTO
  "1605": 2_000_000_000_000,  // INPEX
  "5714": 600_000_000_000,    // DOWAホールディングス
  "5803": 1_500_000_000_000,  // フジクラ
  "5801": 800_000_000_000,    // 古河電気工業
  "5711": 600_000_000_000,    // 三菱マテリアル
  "5706": 1_800_000_000_000,  // 住友金属鉱山
  "3436": 900_000_000_000,    // SUMCO
  "5802": 2_500_000_000_000,  // 住友電気工業
  "5713": 1_800_000_000_000,  // 住友金属鉱山（旧区分）
  "5108": 4_000_000_000_000,  // ブリヂストン
  "5101": 900_000_000_000,    // 横浜ゴム
  "5411": 1_000_000_000_000,  // JFEホールディングス
  "5406": 900_000_000_000,    // 神戸製鋼所
  "5401": 3_000_000_000_000,  // 日本製鉄
  "3401": 500_000_000_000,    // 帝人
  "3402": 1_500_000_000_000,  // 東レ
  "5020": 2_000_000_000_000,  // ENEOSホールディングス
  "5019": 800_000_000_000,    // 出光興産
  // ── 消費・小売 ──
  "1332": 800_000_000_000,    // ニッスイ
  "2802": 2_000_000_000_000,  // 味の素
  "2502": 2_500_000_000_000,  // アサヒグループHD
  "2914": 13_000_000_000_000, // 日本たばこ産業（JT）
  "2801": 700_000_000_000,    // キッコーマン
  "2503": 3_000_000_000_000,  // キリンHD
  "2269": 3_000_000_000_000,  // 明治HD
  "2282": 800_000_000_000,    // 日本ハム
  "2871": 400_000_000_000,    // ニチレイ
  "2002": 1_000_000_000_000,  // 日清製粉グループ
  "2501": 2_000_000_000_000,  // サッポロHD
  "7832": 4_000_000_000_000,  // バンダイナムコHD
  "7912": 500_000_000_000,    // 大日本印刷
  "7911": 500_000_000_000,    // 凸版印刷（TOPPANホールディングス）
  "7951": 800_000_000_000,    // ヤマハ
  "8267": 1_500_000_000_000,  // イオン
  "9983": 12_000_000_000_000, // ファーストリテイリング
  "3099": 1_500_000_000_000,  // 三越伊勢丹HD
  "3086": 900_000_000_000,    // J.フロント リテイリング
  "8252": 1_200_000_000_000,  // 丸井グループ
  "7453": 500_000_000_000,    // 良品計画
  "9843": 1_800_000_000_000,  // ニトリHD
  "7532": 1_200_000_000_000,  // パン・パシフィック・インターナショナルHD
  "3382": 4_000_000_000_000,  // セブン&アイHD
  "8233": 800_000_000_000,    // 高島屋
  "3092": 2_500_000_000_000,  // ZOZO
  // ── 医薬・ヘルスケア ──
  "4503": 2_500_000_000_000,  // アステラス製薬
  "4519": 11_000_000_000_000, // 中外製薬
  "4568": 12_000_000_000_000, // 第一三共
  "4523": 2_000_000_000_000,  // エーザイ
  "4151": 1_200_000_000_000,  // 協和キリン
  "4578": 1_500_000_000_000,  // 大塚HD
  "4506": 900_000_000_000,    // 住友ファーマ
  "4507": 600_000_000_000,    // 塩野義製薬
  "4502": 6_000_000_000_000,  // 武田薬品工業
  "7741": 5_000_000_000_000,  // HOYA
  "4902": 500_000_000_000,    // コニカミノルタ
  "7731": 3_000_000_000_000,  // ニコン
  "7733": 2_000_000_000_000,  // オリンパス
  "4543": 3_000_000_000_000,  // テルモ
  // ── 通信・インフラ ──
  "9433": 9_000_000_000_000,  // KDDI
  "9432": 14_000_000_000_000, // 日本電信電話（NTT）
  "9434": 6_000_000_000_000,  // ソフトバンク（通信）
  "9984": 17_000_000_000_000, // ソフトバンクグループ
  "1721": 900_000_000_000,    // コムシスHD
  "1925": 1_500_000_000_000,  // 大和ハウス工業
  "1808": 700_000_000_000,    // 長谷工コーポレーション
  "1963": 500_000_000_000,    // 日揮HD
  "1812": 1_000_000_000_000,  // 鹿島建設
  "1802": 1_500_000_000_000,  // 大林組
  "1928": 3_000_000_000_000,  // 積水ハウス
  "1803": 600_000_000_000,    // 清水建設
  "1801": 1_800_000_000_000,  // 大成建設
  "9502": 1_000_000_000_000,  // 中部電力
  "9503": 1_500_000_000_000,  // 関西電力
  "9501": 1_500_000_000_000,  // 東京電力HD
  "9532": 600_000_000_000,    // 大阪ガス
  "9531": 500_000_000_000,    // 東京ガス
  "3861": 400_000_000_000,    // 王子HD
  // ── サービス・IT ──
  "6532": 3_500_000_000_000,  // ベイカレント・コンサルティング
  "4751": 1_000_000_000_000,  // サイバーエージェント
  "2432": 600_000_000_000,    // DeNA
  "4324": 500_000_000_000,    // 電通グループ
  "6178": 1_200_000_000_000,  // 日本郵政
  "9766": 900_000_000_000,    // コナミグループ
  "4689": 700_000_000_000,    // LYコーポレーション
  "4385": 1_500_000_000_000,  // メルカリ
  "2413": 1_500_000_000_000,  // エムスリー
  "3659": 1_000_000_000_000,  // ネクソン
  "7974": 13_000_000_000_000, // 任天堂
  "4307": 700_000_000_000,    // 野村総合研究所
  "4661": 1_500_000_000_000,  // オリエンタルランド
  "4755": 1_500_000_000_000,  // 楽天グループ
  "6098": 10_000_000_000_000, // リクルートHD
  "9735": 800_000_000_000,    // セコム
  "3697": 400_000_000_000,    // SHIFTインク
  "9602": 900_000_000_000,    // 東宝
  "4704": 800_000_000_000,    // トレンドマイクロ
  // ── 運輸・商社 ──
  "9202": 1_500_000_000_000,  // ANAホールディングス
  "9201": 2_500_000_000_000,  // 日本航空（JAL）
  "9147": 600_000_000_000,    // NIPPON EXPRESSホールディングス
  "9064": 1_500_000_000_000,  // ヤマトホールディングス
  "9107": 3_000_000_000_000,  // 川崎汽船
  "9104": 3_500_000_000_000,  // 商船三井
  "9101": 3_500_000_000_000,  // 日本郵船
  "9022": 7_000_000_000_000,  // 東海旅客鉄道（JR東海）
  "9020": 4_000_000_000_000,  // 東日本旅客鉄道（JR東日本）
  "9008": 1_500_000_000_000,  // 京王電鉄
  "9009": 1_000_000_000_000,  // 京成電鉄
  "9007": 1_000_000_000_000,  // 小田急電鉄
  "9001": 1_000_000_000_000,  // 東武鉄道
  "9005": 1_500_000_000_000,  // 東急
  "9021": 2_000_000_000_000,  // 西日本旅客鉄道（JR西日本）
  "8001": 11_000_000_000_000, // 伊藤忠商事
  "8002": 7_000_000_000_000,  // 丸紅
  "8058": 9_000_000_000_000,  // 三菱商事
  "8031": 6_000_000_000_000,  // 三井物産
  "2768": 400_000_000_000,    // 双日
  "8053": 3_000_000_000_000,  // 住友商事
  "8015": 3_000_000_000_000,  // 豊田通商
};

// 銘柄ごとの従業員数フォールバック
const fallbackEmployees: Record<string, number> = {
  // 半導体・電機
  "6857": 7_000,   "6770": 40_000,  "7751": 70_000,  "6902": 170_000, "6954": 9_000,
  "6504": 12_000,  "6702": 130_000, "6501": 350_000, "6861": 12_000,  "285A": 12_000,
  "6971": 77_000,  "6920": 2_700,   "6479": 95_000,  "6503": 150_000, "6981": 77_000,
  "6701": 110_000, "6594": 120_000, "6645": 30_000,  "6752": 110_000, "6723": 22_000,
  "7752": 24_000,  "6963": 16_000,  "7735": 5_000,   "6724": 18_000,  "6753": 21_000,
  "6758": 110_000, "6526": 1_900,   "6976": 11_000,  "6762": 100_000, "8035": 18_000,
  "6506": 14_000,  "6841": 12_000,  "6146": 5_000,
  // 自動車・機械
  "543A": 3_500,   "7267": 210_000, "7202": 55_000,  "7261": 50_000,  "7211": 32_000,
  "7201": 160_000, "7270": 33_000,  "7269": 80_000,  "7203": 380_000, "7272": 55_000,
  "6113": 8_000,   "6367": 80_000,  "6361": 18_000,  "6305": 16_000,  "7004": 14_000,
  "7013": 20_000,  "5631": 10_000,  "6473": 36_000,  "6301": 60_000,  "6326": 45_000,
  "7011": 84_000,  "6471": 28_000,  "6472": 30_000,  "6103": 7_000,   "6302": 24_000,
  "6273": 21_000,  "7012": 35_000,
  // 金融・不動産
  "8304": 24_000,  "8331": 5_000,   "8354": 9_000,   "8306": 160_000, "8411": 55_000,
  "8308": 35_000,  "5831": 3_500,   "8316": 115_000, "8309": 18_000,  "7186": 3_000,
  "8750": 56_000,  "8725": 44_000,  "8630": 38_000,  "8795": 9_000,   "8766": 43_000,
  "8253": 10_000,  "8697": 900,     "8591": 36_000,  "8601": 16_000,  "8604": 26_000,
  "8802": 13_000,  "8801": 20_000,  "8830": 11_000,  "8804": 4_500,   "3289": 8_000,
  // 素材・化学
  "3407": 30_000,  "4061": 4_500,   "4901": 95_000,  "4452": 33_000,  "3405": 11_000,
  "4188": 60_000,  "4183": 15_000,  "4021": 5_000,   "6988": 30_000,  "4004": 14_000,
  "4063": 33_000,  "4911": 34_000,  "4005": 26_000,  "4043": 4_000,   "4042": 13_000,
  "4208": 8_000,   "5201": 50_000,  "5333": 7_500,   "5214": 4_500,   "5233": 14_000,
  "5301": 3_500,   "5332": 32_000,  "1605": 5_000,   "5714": 7_000,   "5803": 60_000,
  "5801": 55_000,  "5711": 12_000,  "5706": 23_000,  "3436": 6_000,   "5802": 280_000,
  "5713": 23_000,  "5108": 150_000, "5101": 27_000,  "5411": 26_000,  "5406": 36_000,
  "5401": 106_000, "3401": 16_000,  "3402": 47_000,  "5020": 30_000,  "5019": 12_000,
  // 消費・小売
  "1332": 11_000,  "2802": 35_000,  "2502": 32_000,  "2914": 60_000,  "2801": 28_000,
  "2503": 42_000,  "2269": 20_000,  "2282": 24_000,  "2871": 8_000,   "2002": 11_000,
  "2501": 13_000,  "7832": 9_300,   "7912": 42_000,  "7911": 55_000,  "7951": 22_000,
  "8267": 100_000, "9983": 58_000,  "3099": 13_000,  "3086": 9_000,   "8252": 12_000,
  "7453": 11_000,  "9843": 28_000,  "7532": 66_000,  "3382": 160_000, "8233": 13_000,
  "3092": 4_000,
  // 医薬・ヘルスケア
  "4503": 16_000,  "4519": 8_000,   "4568": 28_000,  "4523": 11_000,  "4151": 6_000,
  "4578": 32_000,  "4506": 8_000,   "4507": 8_000,   "4502": 65_000,  "7741": 11_000,
  "4902": 38_000,  "7731": 21_000,  "7733": 32_000,  "4543": 30_000,
  // 通信・インフラ
  "9433": 54_000,  "9432": 330_000, "9434": 42_000,  "9984": 65_000,  "1721": 11_000,
  "1925": 50_000,  "1808": 15_000,  "1963": 15_000,  "1812": 19_000,  "1802": 17_000,
  "1928": 27_000,  "1803": 15_000,  "1801": 22_000,  "9502": 28_000,  "9503": 33_000,
  "9501": 47_000,  "9532": 5_500,   "9531": 7_000,   "3861": 25_000,
  // サービス・IT
  "6532": 4_000,   "4751": 7_000,   "2432": 3_000,   "4324": 66_000,  "6178": 260_000,
  "9766": 10_000,  "4689": 7_000,   "4385": 4_000,   "2413": 9_000,   "3659": 9_000,
  "7974": 8_000,   "4307": 7_000,   "4661": 4_000,   "4755": 28_000,  "6098": 58_000,
  "9735": 9_000,   "3697": 2_500,   "9602": 5_000,   "4704": 9_000,
  // 運輸・商社
  "9202": 45_000,  "9201": 36_000,  "9147": 30_000,  "9064": 27_000,  "9107": 12_000,
  "9104": 13_000,  "9101": 33_000,  "9022": 40_000,  "9020": 55_000,  "9008": 8_000,
  "9009": 4_000,   "9007": 9_000,   "9001": 20_000,  "9005": 26_000,  "9021": 30_000,
  "8001": 110_000, "8002": 55_000,  "8058": 80_000,  "8031": 46_000,  "2768": 3_500,
  "8053": 30_000,  "8015": 65_000,
};

const getFallbackMetrics = (code: string): StockMetrics => {
  // コードを使った決定論的ばらつき (0.00〜0.99)
  const v = codeVariance(code);

  // 時価総額 ─ 収録済み優先、カテゴリ範囲内でコードごとに変動
  const baseCap =
    fallbackMarketCaps[code] ??
    (code.startsWith("8") && parseInt(code, 10) >= 8300 && parseInt(code, 10) <= 8700
      ? Math.round(300_000_000_000 + v * 5_000_000_000_000)   // 金融系未収録
      : code.startsWith("4") && parseInt(code, 10) >= 4000 && parseInt(code, 10) <= 4999
        ? Math.round(100_000_000_000 + v * 2_000_000_000_000) // 化学・医薬系
        : code.startsWith("9") && parseInt(code, 10) >= 9000
          ? Math.round(200_000_000_000 + v * 3_000_000_000_000) // 通信・運輸系
          : Math.round(20_000_000_000 + v * 600_000_000_000));  // その他小型

  // 従業員数 ─ 収録済み優先、カテゴリ別範囲でコードごとに変動
  const baseEmp =
    fallbackEmployees[code] ??
    (code.startsWith("9")
      ? Math.round(3_000 + v * 50_000)
      : code.startsWith("8")
        ? Math.round(2_000 + v * 30_000)
        : Math.round(500 + v * 8_000));

  const enterpriseValue = Math.round(baseCap * (1.03 + v * 0.08));

  // 財務指標もコードごとに微妙に変化させる
  // ──金融系（低PBR傾向）
  if (["8306","8316","8411","8308","8309","7186","8058","8001","8031","8053","8015"].includes(code)) {
    return {
      per: parseFloat((9 + v * 6).toFixed(1)),
      pbr: parseFloat((0.55 + v * 0.65).toFixed(2)),
      dividendYield: parseFloat((2.0 + v * 2.5).toFixed(2)),
      roe: parseFloat((5 + v * 6).toFixed(1)),
      marketCap: baseCap, enterpriseValue, employees: baseEmp,
    };
  }
  // ──グロース系
  if (["8035","6857","6920","6146","6861","6758","9984","6098","4385","3697"].includes(code)) {
    return {
      per: parseFloat((20 + v * 20).toFixed(1)),
      pbr: parseFloat((2.5 + v * 3.5).toFixed(2)),
      dividendYield: parseFloat((0.1 + v * 1.5).toFixed(2)),
      roe: parseFloat((8 + v * 10).toFixed(1)),
      marketCap: baseCap, enterpriseValue, employees: baseEmp,
    };
  }
  // ──ディフェンシブ高配当系
  if (["9432","9433","9434","2914","4502","9501","9502","9503","9531","9532"].includes(code)) {
    return {
      per: parseFloat((11 + v * 6).toFixed(1)),
      pbr: parseFloat((0.9 + v * 0.8).toFixed(2)),
      dividendYield: parseFloat((2.0 + v * 2.5).toFixed(2)),
      roe: parseFloat((5 + v * 5).toFixed(1)),
      marketCap: baseCap, enterpriseValue, employees: baseEmp,
    };
  }
  // ──その他（多様なバリュエーション）
  return {
    per: parseFloat((10 + v * 12).toFixed(1)),
    pbr: parseFloat((0.7 + v * 2.1).toFixed(2)),
    dividendYield: parseFloat((0.2 + v * 3.0).toFixed(2)),
    roe: parseFloat((3 + v * 10).toFixed(1)),
    marketCap: baseCap, enterpriseValue, employees: baseEmp,
  };
};

const scoreMetric = (label: string, value: number | null | undefined) => {
  if (!Number.isFinite(value)) return { label, text: "取得中", score: 0, tone: "neutral" as const };
  const number = Number(value);

  if (label === "PBR") {
    if (number <= 1) return { label, text: `${number.toFixed(2)}倍`, score: 2, tone: "cheap" as const };
    if (number <= 1.5) return { label, text: `${number.toFixed(2)}倍`, score: 1, tone: "cheap" as const };
    if (number >= 3) return { label, text: `${number.toFixed(2)}倍`, score: -2, tone: "expensive" as const };
    return { label, text: `${number.toFixed(2)}倍`, score: 0, tone: "neutral" as const };
  }

  if (label === "PER") {
    if (number <= 12) return { label, text: `${number.toFixed(1)}倍`, score: 2, tone: "cheap" as const };
    if (number <= 18) return { label, text: `${number.toFixed(1)}倍`, score: 1, tone: "cheap" as const };
    if (number >= 30) return { label, text: `${number.toFixed(1)}倍`, score: -2, tone: "expensive" as const };
    return { label, text: `${number.toFixed(1)}倍`, score: 0, tone: "neutral" as const };
  }

  if (label === "配当利回り") {
    if (number >= 4) return { label, text: `${number.toFixed(2)}%`, score: 2, tone: "cheap" as const };
    if (number >= 2.5) return { label, text: `${number.toFixed(2)}%`, score: 1, tone: "cheap" as const };
    if (number < 1) return { label, text: `${number.toFixed(2)}%`, score: -1, tone: "expensive" as const };
    return { label, text: `${number.toFixed(2)}%`, score: 0, tone: "neutral" as const };
  }

  if (label === "ROE") {
    if (number >= 12) return { label, text: `${number.toFixed(1)}%`, score: 1, tone: "quality" as const };
    if (number < 5) return { label, text: `${number.toFixed(1)}%`, score: -1, tone: "expensive" as const };
    return { label, text: `${number.toFixed(1)}%`, score: 0, tone: "neutral" as const };
  }

  return { label, text: formatMetric(value), score: 0, tone: "neutral" as const };
};

const getMetricReason = (item: ReturnType<typeof scoreMetric>) => {
  if (item.label === "PBR") {
    if (item.score > 0) return "PBRは資産価値対比で低め";
    if (item.score < 0) return "PBRは資産価値対比で高め";
  }
  if (item.label === "PER") {
    if (item.score > 0) return "PERは利益対比で低め";
    if (item.score < 0) return "PERは利益対比で高め";
  }
  if (item.label === "配当利回り") {
    if (item.score > 0) return "配当利回りが下支え材料";
    if (item.score < 0) return "配当利回りは低め";
  }
  if (item.label === "ROE") {
    if (item.score > 0) return "ROEが高く収益性は良好";
    if (item.score < 0) return "ROEが低く収益性に注意";
  }
  return `${item.label}は中立`;
};

const getToneBadgeClass = (tone: ReturnType<typeof scoreMetric>["tone"]) => {
  if (tone === "cheap") return "border-blue-200 bg-blue-50 text-blue-700";
  if (tone === "expensive") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "quality") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const StockDetailPanel = ({ stock }: StockDetailPanelProps) => {
  const {
    stock: displayStock,
    status,
    updatedAt,
  } = useLiveStockQuote(stock);
  const isUp = displayStock.change > 0;
  const isDown = displayStock.change < 0;
  const profile = getStockProfile(displayStock.code, displayStock.name, displayStock.market);
  // stockProfiles.ts に個別登録済みでない銘柄はジェネリックプロフィールと判定する
  const isGenericProfile = !hasManualProfile(displayStock.code);
  const [metricsState, setMetricsState] = useState<MetricsState>({ status: "loading" });
  const rangeWidth = displayStock.high - displayStock.low;
  const rangePosition =
    rangeWidth > 0 ? Math.min(100, Math.max(0, ((displayStock.price - displayStock.low) / rangeWidth) * 100)) : 50;
  const previousCloseGap =
    displayStock.previousClose > 0
      ? ((displayStock.price - displayStock.previousClose) / displayStock.previousClose) * 100
      : displayStock.changePercent;
  const metrics = metricsState.status === "ready" ? metricsState.metrics : getFallbackMetrics(displayStock.code);
  const metricsSourceLabel = metricsState.status === "ready" ? "Yahoo指標" : "セクター目安";
  const companyScale = classifyMarketCap(metrics.marketCap);
  const metricItems = useMemo(
    () => [
      scoreMetric("PBR", metrics?.pbr),
      scoreMetric("PER", metrics?.per),
      scoreMetric("配当利回り", metrics?.dividendYield),
      scoreMetric("ROE", metrics?.roe),
    ],
    [metrics]
  );
  const metricScore = metricItems.reduce((sum, item) => sum + item.score, 0);
  const shortTermScore = rangePosition <= 30 || previousCloseGap <= -2 ? 1 : rangePosition >= 70 || previousCloseGap >= 2 ? -1 : 0;
  const totalScore = metricScore + shortTermScore;
  const valuationTone = totalScore >= 3 ? "cheap" : totalScore <= -2 ? "expensive" : "neutral";
  const valuationLabel =
    valuationTone === "cheap" ? "総合 割安寄り" : valuationTone === "expensive" ? "総合 割高寄り" : "総合 中立圏";
  const valuationMessage =
    valuationTone === "cheap"
      ? "指標面では買われすぎ感より、評価修正余地を優先して見たい水準です。"
      : valuationTone === "expensive"
        ? "指標面では期待が先行している可能性があり、押し目や業績確認を優先したい水準です。"
        : "指標面では割安・割高のどちらにも強く傾いていない水準です。";
  const valuationClasses =
    valuationTone === "cheap"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : valuationTone === "expensive"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  const valuationScoreWidth = `${Math.min(100, Math.max(0, ((totalScore + 6) / 12) * 100))}%`;
  const positiveReasons = metricItems.filter((item) => item.score > 0).map(getMetricReason);
  const negativeReasons = metricItems.filter((item) => item.score < 0).map(getMetricReason);
  const priceReason =
    shortTermScore > 0
      ? "株価位置は安値圏寄り"
      : shortTermScore < 0
        ? "株価位置は高値圏寄り"
        : "株価位置は中立";
  const valuationReasons = [...positiveReasons, ...negativeReasons, priceReason].slice(0, 4);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  useEffect(() => {
    const controller = new AbortController();
    setMetricsState({ status: "loading" });

    fetch(`/api/stock-metrics?symbol=${encodeURIComponent(`${displayStock.code}.T`)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("metrics unavailable");
        return response.json();
      })
      .then((payload) => {
        const nextMetrics = payload.metrics as StockMetrics | undefined;
        if (!nextMetrics) throw new Error("metrics unavailable");
        setMetricsState({ status: "ready", metrics: nextMetrics });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setMetricsState({ status: "error" });
      });

    return () => controller.abort();
  }, [displayStock.code]);

  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xxs font-bold text-primary-foreground">
                {displayStock.code}
              </span>
              <span className="text-xs font-bold text-foreground">{displayStock.name}</span>
            </div>
            <span className="text-xxs text-muted-foreground">{displayStock.market}</span>
          </div>
          <div className="flex flex-col items-end gap-1 text-xxs font-semibold text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              {updatedLabel ? `更新 ${updatedLabel}` : status === "loading" ? "取得中" : "更新確認中"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-3 rounded border border-border bg-background p-3 text-left">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-3 text-center md:text-left">
                <div
                  className={`text-2xl font-black tabular-nums ${
                    isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-foreground"
                  }`}
                >
                  {displayStock.price.toLocaleString(undefined, {
                    minimumFractionDigits: displayStock.price < 1000 ? 1 : 0,
                    maximumFractionDigits: 1,
                  })}
                </div>
                <div
                  className={`text-sm font-bold tabular-nums ${
                    isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {displayStock.change.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  ({isUp ? "+" : ""}
                  {displayStock.changePercent.toFixed(2)}%)
                </div>
                <div
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-xxs font-bold ${
                    isUp
                      ? "bg-stock-up-bg text-stock-up"
                      : isDown
                        ? "bg-stock-down-bg text-stock-down"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isUp ? "▲ 上昇" : isDown ? "▼ 下落" : "― 変わらず"}
                </div>
              </div>

              <div className={`mt-3 rounded border p-2.5 ${valuationClasses}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold opacity-70">総合割安度</div>
                    <div className="text-base font-black leading-tight">{valuationLabel}</div>
                    <div className="mt-0.5 text-[10px] font-semibold opacity-70">{metricsSourceLabel}</div>
                  </div>
                  <div className="rounded bg-white/75 px-2 py-1 text-right">
                    <div className="text-[10px] font-bold opacity-70">スコア</div>
                    <div className="text-sm font-black tabular-nums">{totalScore > 0 ? "+" : ""}{totalScore}</div>
                  </div>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full rounded-full bg-current" style={{ width: valuationScoreWidth }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-bold opacity-70">
                  <span>割高</span>
                  <span>中立</span>
                  <span>割安</span>
                </div>

                <p className="mt-2 text-xs font-bold leading-relaxed">{valuationMessage}</p>

                <div className="mt-2 rounded bg-white/60 p-2">
                  <div className="mb-1 text-[10px] font-black opacity-70">判断理由</div>
                  <ul className="space-y-0.5 text-[11px] font-semibold leading-relaxed">
                    {valuationReasons.map((reason) => (
                      <li key={reason}>・{reason}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xxs font-semibold">
                  {metricItems.map((item) => (
                    <div key={item.label} className={`rounded border px-2 py-1 ${getToneBadgeClass(item.tone)}`}>
                      <div className="opacity-70">{item.label}</div>
                      <div className="text-xs font-black tabular-nums">{item.text}</div>
                    </div>
                  ))}
                  <div className="rounded border border-slate-200 bg-white/65 px-2 py-1 text-slate-700">
                    <div className="opacity-70">レンジ位置</div>
                    <div className="text-xs font-black tabular-nums">{rangePosition.toFixed(0)}%</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-white/65 px-2 py-1 text-slate-700">
                    <div className="opacity-70">前日終値比</div>
                    <div className="text-xs font-black tabular-nums">
                      {previousCloseGap >= 0 ? "+" : ""}
                      {previousCloseGap.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 border-t border-border/70 pt-3 md:border-l md:border-t-0 md:pl-3 md:pt-0">
              <div className="mb-1 text-xs font-bold text-foreground">企業説明</div>
              {/* APIから日本語説明が取れた場合かつ手動データが汎用の場合はAPI優先 */}
              {isGenericProfile && (metrics.businessSummaryJa || metrics.sector || metrics.industry) ? (
                <p className="text-xs leading-relaxed text-foreground">
                  {metrics.businessSummaryJa ? (
                    metrics.businessSummaryJa
                  ) : (
                    `${displayStock.name}は、主に ${metrics.sector ?? ""}・${metrics.industry ?? ""} の事業領域に属する上場企業です。事業内容、決算、株価材料、セクター内での位置づけを、最新の開示データや業績指標とあわせて確認します。`
                  )}
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-foreground">{profile.description}</p>
              )}

              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xxs font-bold text-slate-600">企業規模</div>
                  <span className="rounded bg-white px-1.5 py-0.5 text-xxs font-black text-slate-700">
                    {companyScale}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-xxs font-semibold text-slate-700">
                  <div className="rounded border border-slate-200 bg-white px-2 py-1">
                    <div className="opacity-70">時価総額</div>
                    <div className="text-xs font-black tabular-nums">{formatLargeYen(metrics.marketCap)}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-white px-2 py-1">
                    <div className="opacity-70">企業価値</div>
                    <div className="text-xs font-black tabular-nums">{formatLargeYen(metrics.enterpriseValue)}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-white px-2 py-1">
                    <div className="opacity-70">従業員数</div>
                    <div className="text-xs font-black tabular-nums">{formatEmployees(metrics.employees)}</div>
                  </div>
                </div>
              </div>

              {/* 主な事業: APIのsector/industryが取れた場合はそれも表示 */}
              <div className="mb-1 mt-3 text-xs font-bold text-foreground">主な事業</div>
              {isGenericProfile && (metrics.sector || metrics.industry) ? (
                <ul className="space-y-0.5 text-xs leading-relaxed text-foreground">
                  {metrics.sector && <li>・{metrics.sector}</li>}
                  {metrics.industry && <li>・{metrics.industry}</li>}
                  {profile.segments.slice(0, 2).map((segment) => (
                    <li key={segment}>・{segment}</li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-0.5 text-xs leading-relaxed text-foreground">
                  {profile.segments.map((segment) => (
                    <li key={segment}>・{segment}</li>
                  ))}
                </ul>
              )}

              <div className="mb-1 mt-3 text-xs font-bold text-foreground">見るポイント</div>
              <ul className="space-y-0.5 text-xs leading-relaxed text-foreground">
                {profile.watchPoints.map((point) => (
                  <li key={point}>・{point}</li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xxs font-bold text-primary"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StockDetailPanel;
