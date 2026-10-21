import React, { useState, useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { chartPatternPairs, type ChartPatternItem } from "@/data/chartPatternsData";
import { PatternCard } from "@/components/patterns/PatternCard";
import { PatternDetailModal } from "@/components/patterns/PatternDetailModal";
import { type PatternColorMode } from "@/components/patterns/PatternDiagram";
import {
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  BookOpen,
  Sparkles,
  HelpCircle,
  CheckCircle,
  Palette,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FilterCategory = "all" | "bullish" | "bearish" | "reversal" | "continuation";

export const PatternsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [selectedPattern, setSelectedPattern] = useState<ChartPatternItem | null>(null);
  const [colorMode, setColorMode] = useState<PatternColorMode>("jp"); // デフォルトは日本株標準（上昇:赤 / 下降:青）

  // 検索とフィルター処理
  const filteredPairs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return chartPatternPairs.filter((pair) => {
      // 検索クエリ判定
      const matchSearch = (item: ChartPatternItem) => {
        if (!query) return true;
        return (
          item.nameEn.toLowerCase().includes(query) ||
          item.nameJa.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        );
      };

      const matchCategory = (item: ChartPatternItem) => {
        if (selectedCategory === "all") return true;
        if (selectedCategory === "bullish") return item.category === "bullish";
        if (selectedCategory === "bearish") return item.category === "bearish";
        if (selectedCategory === "reversal") return item.type === "reversal";
        if (selectedCategory === "continuation") return item.type === "continuation";
        return true;
      };

      const bullishMatch = matchSearch(pair.bullish) && matchCategory(pair.bullish);
      const bearishMatch = matchSearch(pair.bearish) && matchCategory(pair.bearish);

      if (selectedCategory === "bullish") return bullishMatch;
      if (selectedCategory === "bearish") return bearishMatch;

      return bullishMatch || bearishMatch;
    });
  }, [searchQuery, selectedCategory]);

  const handlePrint = () => {
    window.print();
  };

  const isJp = colorMode === "jp";

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-background text-foreground flex flex-col">
      <SiteHeader activeTab="チャートパターン" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 space-y-6">
        {/* チートシート・メインヘッダー（画像の雰囲気を美しく再現） */}
        <section className="bg-white dark:bg-card border-2 border-slate-300 dark:border-border rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-border pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Forex & Stock Technical Analysis</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                CHART PATTERN CHEAT SHEET
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-muted-foreground mt-1">
                Spot the Pattern &nbsp;|&nbsp; Plan Your Trade &nbsp;|&nbsp; Trade with Confidence（パターンを見極め、計画を立て、確信を持ってトレードする）
              </p>
            </div>

            {/* カラーモード切替 ＆ 凡例バー */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* カラー設定トグル */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-muted p-1 rounded-xl border border-slate-200 dark:border-border self-start sm:self-auto">
                <button
                  onClick={() => setColorMode("jp")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    isJp
                      ? "bg-white dark:bg-card text-red-600 dark:text-red-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="日本株標準（東証・証券会社標準：上昇が赤 / 下降が青）"
                >
                  🇯🇵 日本株 (上昇:赤 / 下降:青)
                </button>
                <button
                  onClick={() => setColorMode("global")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    !isJp
                      ? "bg-white dark:bg-card text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="欧米・FX標準（TradingView標準：上昇が緑 / 下落が赤）"
                >
                  🌐 グローバル (上昇:緑 / 下落:赤)
                </button>
              </div>

              {/* 凡例バッジ */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-muted/50 p-2 rounded-xl border border-slate-200 dark:border-border/80 text-xs font-bold">
                <span
                  className={`inline-flex items-center gap-1 text-white px-2.5 py-1 rounded-md shadow-xs ${
                    isJp ? "bg-red-600" : "bg-emerald-600"
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                  Bullish = 買い (Long)
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-white px-2.5 py-1 rounded-md shadow-xs ${
                    isJp ? "bg-blue-600" : "bg-rose-600"
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />
                  Bearish = 売り (Short)
                </span>
                <div className="hidden xl:flex items-center gap-2 px-1 text-slate-700 dark:text-slate-300">
                  <span className={`${isJp ? "text-blue-600" : "text-rose-600"} font-extrabold`}>
                    SL = Stop Loss (損切り)
                  </span>
                  <span>|</span>
                  <span className={`${isJp ? "text-red-600" : "text-emerald-600"} font-extrabold`}>
                    TP = Take Profit (利確)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ツールバー（検索・カテゴリタブ・印刷ボタン） */}
          <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* カテゴリフィルタータブ */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "すべて (全20型)" },
                { id: "bullish", label: isJp ? "🔴 買い (Bullish)" : "🟢 買い (Bullish)" },
                { id: "bearish", label: isJp ? "🔵 売り (Bearish)" : "🔴 売り (Bearish)" },
                { id: "reversal", label: "🔄 トレンド転換" },
                { id: "continuation", label: "➡️ トレンド継続" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as FilterCategory)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === tab.id
                      ? "bg-slate-900 text-white dark:bg-primary dark:text-primary-foreground shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-muted dark:hover:bg-muted/80 dark:text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 検索入力 & 印刷ボタン */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="パターン名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-50 dark:bg-background border-slate-200"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 px-3 text-xs gap-1.5 shrink-0 hidden sm:inline-flex"
                title="チートシートを印刷・PDF保存"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>印刷 / 保存</span>
              </Button>
            </div>
          </div>
        </section>

        {/* 2カラム対比チートシート一覧（画像通りのレイアウト） */}
        <section className="space-y-4">
          {/* 列ヘッダーラベル（デスクトップ時） */}
          {selectedCategory === "all" && (
            <div className="hidden md:grid grid-cols-2 gap-4 text-center font-extrabold text-sm tracking-wide">
              <div
                className={`py-2 rounded-lg flex items-center justify-center gap-2 border ${
                  isJp
                    ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900/60"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                <span>強気・買いパターン（BULLISH SIGNALS）</span>
              </div>
              <div
                className={`py-2 rounded-lg flex items-center justify-center gap-2 border ${
                  isJp
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/60"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                }`}
              >
                <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                <span>弱気・売りパターン（BEARISH SIGNALS）</span>
              </div>
            </div>
          )}

          {/* パターン行リスト */}
          {filteredPairs.length === 0 ? (
            <div className="bg-white dark:bg-card border rounded-xl p-12 text-center text-muted-foreground">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium">条件に一致するチャートパターンが見つかりませんでした。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPairs.map((pair) => {
                if (selectedCategory === "bullish") {
                  return (
                    <div key={pair.bullish.id} className="grid grid-cols-1">
                      <PatternCard item={pair.bullish} onSelect={setSelectedPattern} colorMode={colorMode} />
                    </div>
                  );
                }

                if (selectedCategory === "bearish") {
                  return (
                    <div key={pair.bearish.id} className="grid grid-cols-1">
                      <PatternCard item={pair.bearish} onSelect={setSelectedPattern} colorMode={colorMode} />
                    </div>
                  );
                }

                return (
                  <div key={pair.id} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <PatternCard item={pair.bullish} onSelect={setSelectedPattern} colorMode={colorMode} />
                    <PatternCard item={pair.bearish} onSelect={setSelectedPattern} colorMode={colorMode} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* チャートパターン実戦攻略ガイド */}
        <section className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              チャートパターントレードで勝率を高める「4つの鉄則」
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-border p-4 rounded-xl space-y-1.5">
              <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>1. 終値ブレイクを待つ</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ザラ場中にラインを一瞬抜けただけの「ヒゲ」で飛びつくと、機関投資家のダマシ（騙し）に巻き込まれます。必ず日足や4時間足の**ローソク足実体が確定**したことを確認してエントリーしましょう。
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-border p-4 rounded-xl space-y-1.5">
              <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>2. ネックラインのリテスト</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ブレイクアウト後、一度突破したネックラインまで戻す動き（プルバック/リテスト）は絶好の押し目買い・戻り売り場です。損切り幅を小さく抑え、リスクリワード比を最大化できます。
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-border p-4 rounded-xl space-y-1.5">
              <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>3. 出来高（ボリューム）の裏付け</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                本物のブレイクアウトには必ず**出来高の急増**が伴います。特にカップウィズハンドルやフラッグ、レクタングルの上放れでは、通常時の1.5倍〜2倍以上の大商いがあるか確認してください。
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-border p-4 rounded-xl space-y-1.5">
              <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>4. リスクリワードは1:2以上</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                パターンが成立する前にあらかじめ「SL（損切り位置）」と「TP（利確目標）」を計算し、想定利益が想定損失の2倍以上（リスクリワード 1:2 以上）取れる勝負のみにエントリーを厳選します。
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 詳細解説モーダル */}
      <PatternDetailModal
        item={selectedPattern}
        isOpen={Boolean(selectedPattern)}
        onClose={() => setSelectedPattern(null)}
        colorMode={colorMode}
      />

      <SiteFooter />
    </div>
  );
};

export default PatternsPage;
