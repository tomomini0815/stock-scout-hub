import { useState, useEffect } from "react";
import {
  BookOpen,
  Calculator,
  Compass,
  LineChart,
  RotateCcw,
  Scale,
  ShieldCheck,
} from "lucide-react";

interface ProMetricsGuideProps {
  initialMetric?: string;
  onNavigateToStockSearch?: (keyword: string) => void;
}

interface CalcPreset {
  id: string;
  name: string;
  tag: string;
  price: number;
  eps: number;
  bps: number;
  growth: number;
  dividend: number;
}

const CALC_PRESETS: CalcPreset[] = [
  {
    id: "toyota",
    name: "トヨタ自動車",
    tag: "割安バリュー",
    price: 2750,
    eps: 320,
    bps: 2850,
    growth: 8,
    dividend: 90,
  },
  {
    id: "mitsubishi",
    name: "三菱商事",
    tag: "高配当・PBR改善",
    price: 3150,
    eps: 280,
    bps: 2450,
    growth: 12,
    dividend: 110,
  },
  {
    id: "disco",
    name: "ディスコ",
    tag: "高成長グロース",
    price: 43200,
    eps: 1200,
    bps: 8500,
    growth: 45,
    dividend: 380,
  },
  {
    id: "trap",
    name: "低迷バリュー例",
    tag: "罠チェック用",
    price: 1200,
    eps: 55,
    bps: 2000,
    growth: 2,
    dividend: 45,
  },
];

// 4つの統合セクション定義（程よいアイコン配置）
const sections = [
  { id: "overview", label: "全体像・購入チェック", icon: Compass },
  { id: "valuation", label: "3大指標 (PER・PBR・ROE)", icon: Scale },
  { id: "safety", label: "財務・配当・需給", icon: ShieldCheck },
  { id: "calculator", label: "指標計算機", icon: Calculator },
];

// 初期パラメータの適切なタブへの自動マッピング
const resolveInitialSection = (metric?: string): string => {
  if (!metric) return "overview";
  if (["per", "pbr", "roe", "valuation"].includes(metric)) return "valuation";
  if (["dividend", "financial", "supply", "safety"].includes(metric)) return "safety";
  if (["checklist"].includes(metric)) return "overview";
  if (["calculator"].includes(metric)) return "calculator";
  return "overview";
};

export const ProMetricsGuide = ({
  initialMetric,
  onNavigateToStockSearch,
}: ProMetricsGuideProps) => {
  const [activeSection, setActiveSection] = useState<string>(() =>
    resolveInitialSection(initialMetric)
  );

  // initialMetricが変わった場合の追従
  useEffect(() => {
    if (initialMetric) {
      setActiveSection(resolveInitialSection(initialMetric));
    }
  }, [initialMetric]);

  // 指標シミュレーター用の状態管理
  const [activePresetId, setActivePresetId] = useState<string | null>("toyota");
  const [calcPrice, setCalcPrice] = useState<number>(2750);
  const [calcEps, setCalcEps] = useState<number>(320);
  const [calcBps, setCalcBps] = useState<number>(2850);
  const [calcGrowth, setCalcGrowth] = useState<number>(8);
  const [calcDividend, setCalcDividend] = useState<number>(90);

  const applyPreset = (preset: CalcPreset) => {
    setActivePresetId(preset.id);
    setCalcPrice(preset.price);
    setCalcEps(preset.eps);
    setCalcBps(preset.bps);
    setCalcGrowth(preset.growth);
    setCalcDividend(preset.dividend);
  };

  // 計算値の算出
  const calcPer = calcEps > 0 ? calcPrice / calcEps : 0;
  const calcPbr = calcBps > 0 ? calcPrice / calcBps : 0;
  const calcPeg = calcGrowth > 0 ? calcPer / calcGrowth : 0;
  const calcYield = calcPrice > 0 ? (calcDividend / calcPrice) * 100 : 0;
  const calcRoe = calcBps > 0 ? (calcEps / calcBps) * 100 : 0;
  const calcPayoutRatio = calcEps > 0 ? (calcDividend / calcEps) * 100 : 0;
  const calcMixFactor = calcPer > 0 && calcPbr > 0 ? calcPer * calcPbr : 0;

  // プロ判定ロジック
  const getProVerdict = () => {
    let score = 0;
    const notes: string[] = [];

    // PEG判定
    if (calcPeg > 0 && calcPeg < 1.0) {
      score += 30;
      notes.push("【成長割安度 (PEG)】1.0倍未満で成長性に対して割安圏内です。");
    } else if (calcPeg >= 2.0) {
      score -= 15;
      notes.push("【成長割安度 (PEG)】2.0倍を超えており、将来成長を過剰に織り込んでいる警戒水準です。");
    }

    // PBR & ROE 連動判定
    if (calcPbr > 0 && calcPbr < 1.0) {
      if (calcRoe >= 8.0) {
        score += 35;
        notes.push("【資本効率 (ROE×PBR)】PBR1倍割れかつROE 8%以上。東証改革の恩恵を受ける理想的なバリュー改善候補です。");
      } else {
        score += 5;
        notes.push("【バリュートラップ警戒】PBR1倍割れですがROEが8%未満。業績改善や還元の具体策がないか要確認です。");
      }
    } else if (calcRoe >= 15.0) {
      score += 25;
      notes.push("【高収益性 (ROE)】ROE 15%超の優良水準。高いPBRが正当化されやすい体質です。");
    }

    // ミックス係数（グレアム基準 22.5以下）
    if (calcMixFactor > 0 && calcMixFactor <= 22.5) {
      score += 15;
      notes.push(`【ミックス係数】${calcMixFactor.toFixed(1)}（22.5以下）。グレアムの割安基準を満たしています。`);
    }

    // 配当利回り & 配当性向
    if (calcYield >= 3.5) {
      score += 15;
      if (calcPayoutRatio > 70) {
        notes.push(`【インカム警戒】利回り${calcYield.toFixed(2)}%ですが配当性向${calcPayoutRatio.toFixed(0)}%と高め。減配余地に注意。`);
      } else {
        notes.push(`【インカム優良】利回り${calcYield.toFixed(2)}%・配当性向${calcPayoutRatio.toFixed(0)}%と無理のない高還元水準です。`);
      }
    }

    let grade = "B (標準水準)";
    let badgeClass = "bg-muted text-foreground border-border";
    let summary = "標準的な水準です。セクター特性や直近の業績推移と併せて精査してください。";

    if (score >= 60) {
      grade = "S (買い妙味が高い)";
      badgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      summary = "成長性と割安性、あるいは資本効率が極めて高いバランス。押し目で積極的に狙える水準です。";
    } else if (score >= 40) {
      grade = "A (良好な投資妙味)";
      badgeClass = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
      summary = "財務または割安性に強みがあります。テクニカル節目でのエントリーが有効です。";
    } else if (score < 10) {
      grade = "C (要警戒・様子見)";
      badgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
      summary = "成長性の鈍化または割高感、もしくは万年低迷のバリュートラップの懸念があります。";
    }

    return { grade, badgeClass, summary, notes };
  };

  const verdict = getProVerdict();

  return (
    <div className="min-w-0 text-foreground">
      {/* 上部バー: タイトル＋4セクション切替（新NISAシミュレーター統一トンマナ） */}
      <div className="border-b border-border bg-table-header-bg px-3 py-2.5 sm:px-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <BookOpen className="h-4 w-4 shrink-0 text-primary" />
              投資指標の実践ガイド（PBR・PER・ROE）
            </h2>
          </div>
          <span className="text-xxs text-muted-foreground">
            実際の売買で使える「真の割安判定」と「バリュートラップ回避」の要点
          </span>
        </div>

        {/* 4つの統合タブ（モバイル2カラム・PCピル塗りボタン） */}
        <div className="mt-2.5 border-t border-border/70 pt-2">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`inline-flex min-w-0 items-center justify-center sm:justify-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xxs font-bold transition-colors sm:h-7 sm:rounded-full sm:py-0 ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="space-y-4 p-3 sm:p-4">
        {/* 1. 全体像 ＆ 購入前チェック */}
        {activeSection === "overview" && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* 全体像・理論方程式 */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <h2 className="text-sm font-bold text-foreground sm:text-base">
                  理論株価の基本方程式（立体的アプローチ）
                </h2>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">
                指標を単体で見ず、収益性（ROE）、割安性（PER・PBR）、財務健全性、需給の4次元で総合判定します。
              </p>

              {/* 理論株価の計算式ボックス（控えめなプライマリトーン） */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2 text-center">
                <div className="text-xxs uppercase tracking-wider font-bold text-primary">
                  黄金方程式
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-base font-bold text-foreground sm:text-lg">
                  <span className="font-mono">PBR（純資産倍率）</span>
                  <span className="text-muted-foreground">＝</span>
                  <span className="font-mono text-primary">PER（利益倍率）</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="font-mono text-primary">ROE（稼ぐ力）</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                  数学的に <code>(株価 ÷ 純資産) ＝ (株価 ÷ 利益) × (利益 ÷ 純資産)</code> が常に成立します。<br />
                  <strong className="text-foreground">「ROE（稼ぐ力）が高い企業ほど市場で高いPBRが許容され、株価が大化けする」</strong>という本質原理を表しています。
                </p>
              </div>

              {/* 4つの評価軸テーブル */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-primary">1. 利益の割安度</div>
                  <div className="text-sm font-bold text-foreground">予想PER / PEG</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    過去平均との比較や、成長率で割安度を測るPEGレシオを活用。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-primary">2. 資産の安全域</div>
                  <div className="text-sm font-bold text-foreground">実績PBR / 解散価値</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    東証PBR1倍是正の動向と、現預金が豊富な本物のバリュー株を選別。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-primary">3. 資本の稼ぐ力</div>
                  <div className="text-sm font-bold text-foreground">ROE / デュポン分解</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    自己資本を使って何%稼げているか。借金頼みでない真の高収益性を解剖。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-primary">4. 需給と上値圧力</div>
                  <div className="text-sm font-bold text-foreground">信用倍率 / 貸借比率</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    信用買い残が多い銘柄は戻り売りが重い。1倍割れの踏み上げ余地を確認。
                  </p>
                </div>
              </div>
            </section>

            {/* プロの購入前チェック5箇条 */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <h2 className="text-sm font-bold text-foreground sm:text-base">
                  購入前の確認チェックリスト
                </h2>
                <span className="text-xxs text-muted-foreground font-semibold">
                  全5項目
                </span>
              </div>

              <div className="divide-y divide-border/60 text-xs sm:text-sm">
                <div className="py-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xxs font-mono font-bold text-foreground">
                    01
                  </span>
                  <div>
                    <span className="font-bold text-foreground">事業の強み（参入障壁）</span>
                    <p className="text-xs text-muted-foreground mt-0.5">他社が真似できないシェア、特許、高いスイッチングコストがあるか。</p>
                  </div>
                </div>

                <div className="py-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xxs font-mono font-bold text-foreground">
                    02
                  </span>
                  <div>
                    <span className="font-bold text-foreground">収益性と健全性</span>
                    <p className="text-xs text-muted-foreground mt-0.5">ROEが8〜10%以上あり、本業の営業キャッシュフローが黒字継続しているか。</p>
                  </div>
                </div>

                <div className="py-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xxs font-mono font-bold text-foreground">
                    03
                  </span>
                  <div>
                    <span className="font-bold text-foreground">割安性と成長性</span>
                    <p className="text-xs text-muted-foreground mt-0.5">成長株ならPEG 1.0以下か、バリュー株ならPBR1倍割れ改善の具体的カタリストがあるか。</p>
                  </div>
                </div>

                <div className="py-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xxs font-mono font-bold text-foreground">
                    04
                  </span>
                  <div>
                    <span className="font-bold text-foreground">信用需給の確認</span>
                    <p className="text-xs text-muted-foreground mt-0.5">信用買い残が過大でないか（信用倍率3倍以下が理想水準）。</p>
                  </div>
                </div>

                <div className="py-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xxs font-mono font-bold text-foreground">
                    05
                  </span>
                  <div>
                    <span className="font-bold text-foreground">損切りラインとリスクリワード</span>
                    <p className="text-xs text-muted-foreground mt-0.5">想定損切り幅（-5〜-8%）に対し、目標利益がその2倍以上（+15%以上）見込めるか。</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 2. 3大指標 (PER・PBR・ROE) */}
        {activeSection === "valuation" && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* ① PER ＆ PEG */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <LineChart className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold text-foreground sm:text-base">
                  1. PER（株価収益率）とPEGレシオ
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="font-bold text-foreground">一般的な誤解</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    「日本株平均の15倍以下なら割安」と考え、成長の止まった成熟・衰退産業の低PER株を買って資金を固定化させてしまう。
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="font-bold text-foreground">実践的な見方</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    PERは市場が織り込む期待成長率の裏返し。高成長なら30倍でも割安であり、減益企業なら8倍でも割高と判断します。
                  </p>
                </div>
              </div>

              {/* PEGレシオ */}
              <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-2">
                <div className="text-xs font-bold text-foreground">PEGレシオ（成長株の割安判定）</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-foreground">
                  PEGレシオ ＝ 予想PER ÷ 予想純利益成長率（%）
                </div>
                <div className="grid gap-2 sm:grid-cols-3 pt-1 text-xs">
                  <div className="border border-border/80 bg-card p-2.5 rounded-md border-l-2 border-l-emerald-500">
                    <span className="font-bold block text-foreground">1.0倍 未満</span>
                    <span className="text-muted-foreground">成長力に対して株価が割安な水準</span>
                  </div>
                  <div className="border border-border/80 bg-card p-2.5 rounded-md border-l-2 border-l-blue-500">
                    <span className="font-bold block text-foreground">1.0倍 〜 1.5倍</span>
                    <span className="text-muted-foreground">成長に見合った適正な評価水準</span>
                  </div>
                  <div className="border border-border/80 bg-card p-2.5 rounded-md border-l-2 border-l-rose-500">
                    <span className="font-bold block text-foreground">2.0倍 超</span>
                    <span className="text-muted-foreground">期待先行で買われすぎの警戒水準</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ② PBR ＆ 東証改革 */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <Scale className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold text-foreground sm:text-base">
                  2. PBR（株価純資産倍率）とバリュートラップの見極め
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                PBR 1.0倍割れは解散価値を下回る状態ですが、単に放置されているだけの低迷株（バリュートラップ）は避ける必要があります。
              </p>

              <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                <div className="rounded-lg border border-border/80 bg-card p-3.5 space-y-2 border-t-2 border-t-rose-500/80">
                  <div className="font-bold text-foreground border-b border-border/60 pb-1">
                    避けるべき低PBR
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>・ROEが5%未満で長期間低迷している</li>
                    <li>・本業の営業キャッシュフローがマイナス</li>
                    <li>・親子上場などで少数株主への還元意欲が乏しい</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-border/80 bg-card p-3.5 space-y-2 border-t-2 border-t-emerald-500/80">
                  <div className="font-bold text-foreground border-b border-border/60 pb-1">
                    狙うべき低PBR
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>・現預金が豊富で実質無借金（ネットキャッシュ）</li>
                    <li>・中期経営計画でROE 8〜10%への向上を明言</li>
                    <li>・増配や自社株買い（DOE導入など）を積極推進</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ③ ROE ＆ デュポン分解 */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <h2 className="text-base font-bold text-foreground">
                  3. ROE（自己資本利益率）とデュポン分解
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                株主資本を使ってどれだけ利益を上げたかを示す指標。グローバル基準では8%以上、優良企業では10〜15%以上が目安です。
              </p>

              <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-2">
                <div className="text-xs font-bold text-foreground">デュポン分解（ROEの質を判定）</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-foreground">
                  ROE ＝ 売上高純利益率 × 総資産回転率 × 財務レバレッジ
                </div>
                <div className="grid gap-2 sm:grid-cols-3 pt-1 text-xs">
                  <div className="border border-border/80 bg-card p-2.5 rounded-md">
                    <span className="font-bold block text-foreground">1. 売上高純利益率</span>
                    <span className="text-muted-foreground">製品の粗利や価格決定力の高さ</span>
                  </div>
                  <div className="border border-border/80 bg-card p-2.5 rounded-md">
                    <span className="font-bold block text-foreground">2. 総資産回転率</span>
                    <span className="text-muted-foreground">保有資産を売上に変える効率の良さ</span>
                  </div>
                  <div className="border border-border/80 bg-card p-2.5 rounded-md">
                    <span className="font-bold block text-foreground">3. 財務レバレッジ</span>
                    <span className="text-muted-foreground">負債のテコ。過大な場合は警戒</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 3. 財務・配当・需給 */}
        {activeSection === "safety" && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* ④ 配当・キャッシュフロー */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-foreground sm:text-base border-b border-border/60 pb-2">
                4. 配当利回り・DOE・フリーキャッシュフロー
              </h2>

              <div className="grid gap-3 sm:grid-cols-3 text-xs sm:text-sm">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <span className="font-bold text-foreground block">DOE（自己資本配当率）</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    純資産ベースで配当を決定。業績の一時的な赤字でも減配されにくい特徴があります。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <span className="font-bold text-foreground block">配当性向の適正水準</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    30〜50%が投資と還元のバランス域。70〜100%超は将来の減配余地に注意が必要です。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <span className="font-bold text-foreground block">フリーキャッシュフロー</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    営業CFから設備投資を引いた現金。継続的なプラスが配当の真の原泉となります。
                  </p>
                </div>
              </div>
            </section>

            {/* ⑤ 財務健全性・ネットキャッシュ */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-foreground sm:text-base border-b border-border/60 pb-2">
                5. 自己資本比率とネットキャッシュ
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1.5">
                  <span className="font-bold text-foreground block">自己資本比率の目安</span>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>・<strong>50%以上</strong>：製造業やIT企業で健全とされる水準</li>
                    <li>・<strong>70%以上</strong>：実質無借金経営の強固な財務体質</li>
                    <li>・<strong>20%未満</strong>：金利上昇時の利払い負担に注意（金融業を除く）</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1.5">
                  <span className="font-bold text-foreground block">ネットキャッシュ（実質無借金）</span>
                  <div className="rounded bg-card p-2 font-mono text-xs text-center border border-border">
                    現預金 ＋ 有価証券 － 有利子負債 ＞ 0
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    時価総額に対して現預金の比率が高い企業は、機動的な自社株買い余力を持ちます。
                  </p>
                </div>
              </div>
            </section>

            {/* ⑥ 信用倍率と需給 */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-foreground sm:text-base border-b border-border/60 pb-2">
                6. 信用倍率と需給関係
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <span className="font-bold text-foreground block">信用買い残が多い状態（倍率5倍超）</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    含み損を抱えた買い手の戻り待ち売りが出やすく、株価の上値が重くなりやすい傾向があります。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <span className="font-bold text-foreground block">信用倍率1.0倍割れ（売り残超過）</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    空売り残が多く、好材料が出た際に買い戻しを巻き込んで急反発しやすい需給環境です。
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 4. 指標シミュレーター */}
        {activeSection === "calculator" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <section className="rounded border border-border bg-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calculator className="h-4 w-4 shrink-0 text-primary" />
                  <h2 className="text-xs sm:text-sm font-bold text-foreground">
                    投資指標の簡易計算機
                  </h2>
                  <span className="hidden sm:inline text-xxs text-muted-foreground">
                    数値入力またはサンプル選択で6指標・ミックス係数・総合ランクを即時試算
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => applyPreset(CALC_PRESETS[0])}
                  className="ml-auto inline-flex h-6 items-center gap-1 whitespace-nowrap rounded border border-border bg-background px-2 text-xxs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>リセット</span>
                </button>
              </div>

              <div className="p-3 sm:p-4 space-y-3.5">
                {/* ワンクリック・サンプル銘柄（モバイル2カラム・PC4カラム） */}
                <div className="space-y-1.5">
                  <span className="block text-xxs font-bold text-muted-foreground">
                    サンプル銘柄で試す（タップで数値入力）
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {CALC_PRESETS.map((preset) => {
                      const isActive = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className={`flex min-w-0 flex-col items-start rounded border px-2.5 py-1.5 text-left transition-colors ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <span className="w-full truncate text-[11px] sm:text-xs font-bold leading-tight">
                            {preset.name}
                          </span>
                          <span
                            className={`w-full truncate text-[10px] leading-tight mt-0.5 ${
                              isActive ? "text-primary/80" : "text-muted-foreground"
                            }`}
                          >
                            {preset.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 入力フォーム（モバイル2カラム・株価は-10%/+10%シミュレーション対応） */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-5 border-t border-border/70 pt-3">
                  <div className="col-span-2 lg:col-span-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <label htmlFor="calc-price" className="text-xxs font-bold text-foreground">
                        株価（円）
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePresetId(null);
                            setCalcPrice((prev) => Math.max(1, Math.round(prev * 0.9)));
                          }}
                          className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-bold text-stock-down hover:bg-muted"
                        >
                          -10%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePresetId(null);
                            setCalcPrice((prev) => Math.max(1, Math.round(prev * 1.1)));
                          }}
                          className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-bold text-stock-up hover:bg-muted"
                        >
                          +10%
                        </button>
                      </div>
                    </div>
                    <input
                      id="calc-price"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={calcPrice}
                      onChange={(e) => {
                        setActivePresetId(null);
                        setCalcPrice(Math.max(0, Number(e.target.value) || 0));
                      }}
                      className="h-8 w-full rounded border border-border bg-background px-2.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="calc-eps" className="block text-xxs font-bold text-foreground">
                      予想EPS（円）
                    </label>
                    <input
                      id="calc-eps"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={calcEps}
                      onChange={(e) => {
                        setActivePresetId(null);
                        setCalcEps(Math.max(0, Number(e.target.value) || 0));
                      }}
                      className="h-8 w-full rounded border border-border bg-background px-2.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground block">1株あたり利益</span>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="calc-bps" className="block text-xxs font-bold text-foreground">
                      実績BPS（円）
                    </label>
                    <input
                      id="calc-bps"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={calcBps}
                      onChange={(e) => {
                        setActivePresetId(null);
                        setCalcBps(Math.max(0, Number(e.target.value) || 0));
                      }}
                      className="h-8 w-full rounded border border-border bg-background px-2.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground block">1株あたり純資産</span>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="calc-growth" className="block text-xxs font-bold text-foreground">
                      予想成長率（%）
                    </label>
                    <input
                      id="calc-growth"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={calcGrowth}
                      onChange={(e) => {
                        setActivePresetId(null);
                        setCalcGrowth(Math.max(0, Number(e.target.value) || 0));
                      }}
                      className="h-8 w-full rounded border border-border bg-background px-2.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground block">今期の予想増益率</span>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="calc-dividend" className="block text-xxs font-bold text-foreground">
                      年間配当（円）
                    </label>
                    <input
                      id="calc-dividend"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={calcDividend}
                      onChange={(e) => {
                        setActivePresetId(null);
                        setCalcDividend(Math.max(0, Number(e.target.value) || 0));
                      }}
                      className="h-8 w-full rounded border border-border bg-background px-2.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground block">1株あたり年間配当</span>
                  </div>
                </div>

                {/* 算出結果カード（6指標・モバイル2カラム） */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-center">
                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <span className="text-[10px] sm:text-xxs font-semibold text-muted-foreground block">予想PER</span>
                    <span className="font-mono text-base sm:text-lg font-black tabular-nums text-foreground">
                      {calcPer > 0 ? `${calcPer.toFixed(1)}倍` : "--"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {calcPer > 0 && calcPer <= 15 ? "割安圏" : calcPer > 25 ? "高期待" : "標準圏"}
                    </span>
                  </div>

                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <span className="text-[10px] sm:text-xxs font-semibold text-muted-foreground block">実績PBR</span>
                    <span className={`font-mono text-base sm:text-lg font-black tabular-nums ${calcPbr > 0 && calcPbr < 1 ? "text-primary" : "text-foreground"}`}>
                      {calcPbr > 0 ? `${calcPbr.toFixed(2)}倍` : "--"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {calcPbr > 0 && calcPbr < 1 ? "1倍割れ" : "1倍以上"}
                    </span>
                  </div>

                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <span className="text-[10px] sm:text-xxs font-semibold text-muted-foreground block">ROE</span>
                    <span className={`font-mono text-base sm:text-lg font-black tabular-nums ${calcRoe >= 10 ? "text-emerald-600 dark:text-emerald-400" : calcRoe > 0 && calcRoe < 8 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                      {calcRoe > 0 ? `${calcRoe.toFixed(1)}%` : "--"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {calcRoe >= 10 ? "優良10%+" : calcRoe >= 8 ? "合格8%+" : "8%未満"}
                    </span>
                  </div>

                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <span className="text-[10px] sm:text-xxs font-semibold text-muted-foreground block">PEGレシオ</span>
                    <span className={`font-mono text-base sm:text-lg font-black tabular-nums ${calcPeg > 0 && calcPeg < 1 ? "text-emerald-600 dark:text-emerald-400" : calcPeg >= 2 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                      {calcPeg > 0 ? `${calcPeg.toFixed(2)}` : "--"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {calcPeg > 0 && calcPeg < 1 ? "成長割安" : calcPeg >= 2 ? "割高警戒" : "適正圏"}
                    </span>
                  </div>

                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <span className="text-[10px] sm:text-xxs font-semibold text-muted-foreground block">配当利回り</span>
                    <span className="font-mono text-base sm:text-lg font-black tabular-nums text-foreground">
                      {calcYield > 0 ? `${calcYield.toFixed(2)}%` : "--"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      性向 {calcPayoutRatio > 0 ? `${calcPayoutRatio.toFixed(0)}%` : "--"}
                    </span>
                  </div>

                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <span className="text-[10px] sm:text-xxs font-semibold text-muted-foreground block">ミックス係数</span>
                    <span className={`font-mono text-base sm:text-lg font-black tabular-nums ${calcMixFactor > 0 && calcMixFactor <= 22.5 ? "text-primary" : "text-foreground"}`}>
                      {calcMixFactor > 0 ? calcMixFactor.toFixed(1) : "--"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {calcMixFactor > 0 && calcMixFactor <= 22.5 ? "22.5以下(割安)" : "PER×PBR"}
                    </span>
                  </div>
                </div>

                {/* 総合判定結果 */}
                <div className="rounded border border-border bg-muted/15 p-3 sm:p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">総合判定結果</span>
                    <span className={`ml-auto whitespace-nowrap rounded border px-2 py-0.5 text-xxs sm:text-xs font-bold ${verdict.badgeClass}`}>
                      {verdict.grade}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                    {verdict.summary}
                  </p>
                  {verdict.notes.length > 0 && (
                    <ul className="border-t border-border/60 pt-2 space-y-1 text-xxs sm:text-xs text-muted-foreground leading-relaxed">
                      {verdict.notes.map((note, idx) => (
                        <li key={idx}>・{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
