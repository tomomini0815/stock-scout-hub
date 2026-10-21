import React, { useState, useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";
import { chartPatternPairs, type ChartPatternItem } from "@/data/chartPatternsData";
import { PatternCard } from "@/components/patterns/PatternCard";
import { PatternDetailModal } from "@/components/patterns/PatternDetailModal";
import {
  TrendingUp,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  BookOpen,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FilterCategory = "all" | "bullish" | "bearish" | "reversal" | "continuation";

export const PatternsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [selectedPattern, setSelectedPattern] = useState<ChartPatternItem | null>(null);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader activeTab="チャートパターン" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto space-y-3 px-2 py-2 sm:px-4 sm:py-3 flex-1">
        {/* ページタイトル & コントロール行（サイト共通のコンパクトヘッダー） */}
        <div className="flex flex-col gap-2 py-1 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-4 w-4 shrink-0 text-foreground" />
            <h1 className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
              チャートパターン一覧
            </h1>
            <span className="hidden xl:inline text-xxs text-muted-foreground truncate">
              天底の反転・保ち合いブレイク等の王道チャートパターン（全20型）。売買エントリー・損切り・利確目標を解説
            </span>
          </div>

          {/* 凡例（赤:上昇 / 青:下降） ＆ 印刷ボタン */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* 凡例バッジ */}
            <div className="flex items-center gap-1.5 text-xxs sm:text-xs font-bold">
              <span className="inline-flex items-center gap-1 text-white px-2 py-0.5 rounded shadow-2xs bg-red-600">
                <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                買い (赤: 上昇)
              </span>
              <span className="inline-flex items-center gap-1 text-white px-2 py-0.5 rounded shadow-2xs bg-blue-600">
                <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                売り (青: 下降)
              </span>
              <span className="hidden sm:inline-block text-xxs text-muted-foreground pl-1">
                SL: 損切り / TP: 利確
              </span>
            </div>

            {/* 印刷ボタン */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-6 sm:h-7 px-2 text-xxs gap-1 shrink-0 hidden sm:inline-flex"
              title="チートシートを印刷・PDF保存"
            >
              <Printer className="w-3 h-3" />
              <span>印刷</span>
            </Button>
          </div>
        </div>

        {/* ツールバー（カテゴリフィルター ＆ 検索バー） */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded border border-border/70 bg-card p-1.5 shadow-2xs">
          {/* カテゴリフィルタータブ */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "all", label: "すべて (全20型)" },
              { id: "bullish", label: "🔴 買い (Bullish)" },
              { id: "bearish", label: "🔵 売り (Bearish)" },
              { id: "reversal", label: "🔄 反転型" },
              { id: "continuation", label: "➡️ 継続型" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as FilterCategory)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  selectedCategory === tab.id
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 検索入力 */}
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="パターン名で絞り込み..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-7 text-xs bg-background border-border/80"
            />
          </div>
        </div>

        {/* 2カラム対比チートシート一覧（画像通りのレイアウト） */}
        <section className="space-y-4">
          {/* 列ヘッダーラベル（デスクトップ時） */}
          {selectedCategory === "all" && (
            <div className="hidden md:grid grid-cols-2 gap-4 text-center font-extrabold text-sm tracking-wide">
              <div className="py-2 rounded-lg flex items-center justify-center gap-2 border bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900/60">
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                <span>強気・買いパターン（BULLISH SIGNALS: 赤）</span>
              </div>
              <div className="py-2 rounded-lg flex items-center justify-center gap-2 border bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/60">
                <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                <span>弱気・売りパターン（BEARISH SIGNALS: 青）</span>
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
                      <PatternCard item={pair.bullish} onSelect={setSelectedPattern} colorMode="jp" />
                    </div>
                  );
                }

                if (selectedCategory === "bearish") {
                  return (
                    <div key={pair.bearish.id} className="grid grid-cols-1">
                      <PatternCard item={pair.bearish} onSelect={setSelectedPattern} colorMode="jp" />
                    </div>
                  );
                }

                return (
                  <div key={pair.id} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <PatternCard item={pair.bullish} onSelect={setSelectedPattern} colorMode="jp" />
                    <PatternCard item={pair.bearish} onSelect={setSelectedPattern} colorMode="jp" />
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
        colorMode="jp"
      />

      <SiteFooter />
    </div>
  );
};

export default PatternsPage;
