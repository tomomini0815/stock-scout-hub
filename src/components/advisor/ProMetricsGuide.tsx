import { useState, useEffect } from "react";
import {
  BookOpen,
  Calculator,
  Compass,
  LineChart,
  Scale,
  ShieldCheck,
} from "lucide-react";

interface ProMetricsGuideProps {
  initialMetric?: string;
  onNavigateToStockSearch?: (keyword: string) => void;
}

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
  const [calcPrice, setCalcPrice] = useState<number>(3000);
  const [calcEps, setCalcEps] = useState<number>(200);
  const [calcBps, setCalcBps] = useState<number>(2500);
  const [calcGrowth, setCalcGrowth] = useState<number>(15);
  const [calcDividend, setCalcDividend] = useState<number>(90);

  // 計算値の算出
  const calcPer = calcEps > 0 ? calcPrice / calcEps : 0;
  const calcPbr = calcBps > 0 ? calcPrice / calcBps : 0;
  const calcPeg = calcGrowth > 0 ? calcPer / calcGrowth : 0;
  const calcYield = calcPrice > 0 ? (calcDividend / calcPrice) * 100 : 0;
  const calcRoe = calcBps > 0 ? (calcEps / calcBps) * 100 : 0;

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
    if (calcPbr < 1.0) {
      if (calcRoe >= 8.0) {
        score += 35;
        notes.push("【資本効率 (ROE×PBR)】PBR1倍割れかつROE 8%以上。東証改革の恩恵を受ける理想的なバリュー改善候補。");
      } else {
        score += 5;
        notes.push("【バリュートラップ警戒】PBR1倍割れですがROEが低迷（8%未満）。万年低PBRの疑いがあります。");
      }
    } else if (calcRoe >= 15.0) {
      score += 25;
      notes.push("【高収益性 (ROE)】ROE 15%超のグローバル基準の優良企業。高いPBRが正当化されます。");
    }

    // 配当利回り
    if (calcYield >= 3.5) {
      score += 15;
      notes.push("【インカム (利回り)】3.5%以上の高配当水準。キャッシュフローと配当方針の裏付けを確認してください。");
    }

    let grade = "B";
    let badgeClass = "bg-muted text-foreground border-border";
    let summary = "標準的な水準です。セクター特性や直近の業績推移を精査してください。";

    if (score >= 60) {
      grade = "S (買い妙味が高い水準)";
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
    <div className="space-y-5 text-foreground">
      {/* 投資指標の実践ガイド ヘッダー & セクションタブ（他ページ統一タイトルバー・コンパクト設計） */}
      <section className="rounded border border-border bg-card">
        <div className="flex flex-col gap-2 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between rounded-t">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 shrink-0 text-header-accent" />
            <h2 className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
              投資指標の実践ガイド（PBR・PER・ROE）
            </h2>
            <span className="rounded bg-primary px-2 py-0.5 text-xxs font-bold text-primary-foreground shrink-0">
              実践ガイド
            </span>
            <span className="hidden xl:inline text-xxs text-muted-foreground truncate">
              実際の売買で使える「真の割安判定」と「バリュートラップ回避」の要点
            </span>
          </div>

          {/* 4つの統合タブナビゲーション（ヘッダー内右寄せ・コンパクト設計） */}
          <div className="flex items-center">
            <div className="flex max-w-full overflow-x-auto no-scrollbar rounded-md border border-border/70 bg-background/90 p-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs">
              {sections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`relative flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                      isActive
                        ? "bg-muted text-foreground font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 transition-colors ${
                        isActive ? "text-header-accent" : "text-muted-foreground/70"
                      }`}
                    />
                    <span>{sec.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-header-accent"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* メインコンテンツエリア */}
      <div className="space-y-5">
        {/* 1. 全体像 ＆ 購入前チェック */}
        {activeSection === "overview" && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* 全体像・理論方程式 */}
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <Compass className="h-4 w-4 text-header-accent" />
                <h2 className="text-sm font-bold text-foreground sm:text-base">
                  理論株価の基本方程式（立体的アプローチ）
                </h2>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">
                指標を単体で見ず、収益性（ROE）、割安性（PER・PBR）、財務健全性、需給の4次元で総合判定します。
              </p>

              {/* 理論株価の計算式ボックス（上品なアンバーアクセント） */}
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 space-y-2 text-center">
                <div className="text-xxs uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">
                  黄金方程式
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-base font-bold text-foreground sm:text-lg">
                  <span className="font-mono">PBR（純資産倍率）</span>
                  <span className="text-muted-foreground">＝</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">PER（利益倍率）</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">ROE（稼ぐ力）</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                  数学的に <code>(株価 ÷ 純資産) ＝ (株価 ÷ 利益) × (利益 ÷ 純資産)</code> が常に成立します。<br />
                  <strong className="text-foreground">「ROE（稼ぐ力）が高い企業ほど市場で高いPBRが許容され、株価が大化けする」</strong>という本質原理を表しています。
                </p>
              </div>

              {/* 4つの評価軸テーブル */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">1. 利益の割安度</div>
                  <div className="text-sm font-bold text-foreground">予想PER / PEG</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    過去平均との比較や、成長率で割安度を測るPEGレシオを活用。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">2. 資産の安全域</div>
                  <div className="text-sm font-bold text-foreground">実績PBR / 解散価値</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    東証PBR1倍是正の動向と、現預金が豊富な本物のバリュー株を選別。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">3. 資本の稼ぐ力</div>
                  <div className="text-sm font-bold text-foreground">ROE / デュポン分解</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    自己資本を使って何%稼げているか。借金頼みでない真の高収益性を解剖。
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400">4. 需給と上値圧力</div>
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
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <Calculator className="h-4 w-4 text-header-accent" />
                <h2 className="text-sm font-bold text-foreground sm:text-base">
                  投資指標の簡易計算機
                </h2>
              </div>

              {/* 使い方の3ステップ案内 */}
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-2">
                <div className="text-xs font-bold text-foreground">使い方の3ステップ</div>
                <div className="grid gap-2 sm:grid-cols-3 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-foreground text-background text-xxs font-bold">1</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">数値を入力</strong>（または下のサンプル銘柄を押す）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-foreground text-background text-xxs font-bold">2</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">指標が自動算出</strong>（PER・PBR・PEG・ROE）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-foreground text-background text-xxs font-bold">3</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">プロ判定を確認</strong>（S〜Cランクと改善点）</span>
                  </div>
                </div>
              </div>

              {/* ワンクリック・サンプル銘柄 */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  ワンクリックで試せるサンプル銘柄（クリックで自動入力）：
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCalcPrice(2750);
                      setCalcEps(320);
                      setCalcBps(2850);
                      setCalcGrowth(8);
                      setCalcDividend(90);
                    }}
                    className="rounded border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70 hover:border-header-accent transition-colors"
                  >
                    🚗 トヨタ自動車（割安バリューの例）
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcPrice(3150);
                      setCalcEps(280);
                      setCalcBps(2450);
                      setCalcGrowth(12);
                      setCalcDividend(110);
                    }}
                    className="rounded border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70 hover:border-header-accent transition-colors"
                  >
                    💎 三菱商事（高配当・低PBR改善の例）
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcPrice(43200);
                      setCalcEps(1200);
                      setCalcBps(8500);
                      setCalcGrowth(45);
                      setCalcDividend(380);
                    }}
                    className="rounded border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70 hover:border-header-accent transition-colors"
                  >
                    ⚡ ディスコ（高成長グロースの例）
                  </button>
                </div>
              </div>

              {/* 入力フォーム */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 border-t border-border/60 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">株価（円）</label>
                  <input
                    type="number"
                    value={calcPrice}
                    onChange={(e) => setCalcPrice(Number(e.target.value))}
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:border-header-accent"
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    現在の購入株価
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">予想EPS（円）</label>
                  <input
                    type="number"
                    value={calcEps}
                    onChange={(e) => setCalcEps(Number(e.target.value))}
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:border-header-accent"
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    1株あたり当期純利益
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">実績BPS（円）</label>
                  <input
                    type="number"
                    value={calcBps}
                    onChange={(e) => setCalcBps(Number(e.target.value))}
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:border-header-accent"
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    1株あたり純資産
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">予想利益成長率（%）</label>
                  <input
                    type="number"
                    value={calcGrowth}
                    onChange={(e) => setCalcGrowth(Number(e.target.value))}
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:border-header-accent"
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    今期の予想増益率（例: 15）
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">予想配当金（円）</label>
                  <input
                    type="number"
                    value={calcDividend}
                    onChange={(e) => setCalcDividend(Number(e.target.value))}
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:border-header-accent"
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    年間1株配当金
                  </span>
                </div>
              </div>

              {/* 算出結果カード */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground block">予想PER</span>
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    {calcPer > 0 ? `${calcPer.toFixed(1)}倍` : "--"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">株価 ÷ 予想EPS</span>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground block">実績PBR</span>
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    {calcPbr > 0 ? `${calcPbr.toFixed(2)}倍` : "--"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">株価 ÷ 実績BPS</span>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground block">PEGレシオ</span>
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    {calcPeg > 0 ? `${calcPeg.toFixed(2)}` : "--"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">PER ÷ 成長率</span>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground block">予想配当利回り</span>
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    {calcYield > 0 ? `${calcYield.toFixed(2)}%` : "--"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">配当 ÷ 株価</span>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 col-span-2 sm:col-span-1">
                  <span className="text-xs text-muted-foreground block">ROE</span>
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    {calcRoe > 0 ? `${calcRoe.toFixed(1)}%` : "--"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">EPS ÷ BPS</span>
                </div>
              </div>

              {/* 総合判定結果 */}
              <div className="rounded-lg border border-border/80 bg-muted/10 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">総合判定結果</span>
                  <span className={`rounded border px-2 py-0.5 text-xs font-bold ${verdict.badgeClass}`}>
                    {verdict.grade}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                  {verdict.summary}
                </p>
                {verdict.notes.length > 0 && (
                  <ul className="border-t border-border/60 pt-2 space-y-1 text-xs text-muted-foreground">
                    {verdict.notes.map((note, idx) => (
                      <li key={idx}>・{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
