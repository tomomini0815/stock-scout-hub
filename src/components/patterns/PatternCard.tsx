import React from "react";
import { type ChartPatternItem } from "@/data/chartPatternsData";
import { SchemaDiagram, CandleChartDiagram, type PatternColorMode } from "./PatternDiagram";
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";

interface PatternCardProps {
  item: ChartPatternItem;
  onSelect: (item: ChartPatternItem) => void;
  colorMode?: PatternColorMode;
}

export const PatternCard: React.FC<PatternCardProps> = ({ item, onSelect, colorMode = "jp" }) => {
  const isBullish = item.category === "bullish";

  // カラーモードに応じたバッジ色
  const badgeBg = colorMode === "jp"
    ? isBullish ? "bg-red-600 dark:bg-red-600" : "bg-blue-600 dark:bg-blue-600"
    : isBullish ? "bg-emerald-600 dark:bg-emerald-600" : "bg-rose-600 dark:bg-rose-600";

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-white dark:bg-card border-2 border-slate-200 dark:border-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between hover:border-slate-400 dark:hover:border-primary/50"
    >
      {/* 上部バッジ見出し */}
      <div className="mb-2">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-white shadow-sm tracking-wide ${badgeBg}`}
        >
          {isBullish ? (
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />
          )}
          <span>{item.nameEn}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate pr-1">
            {item.nameJa}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-slate-100 dark:bg-muted px-1.5 py-0.5 rounded font-medium">
            {item.type === "reversal" ? "反転型" : "継続型"}
          </span>
        </div>
      </div>

      {/* ダイアグラム表示エリア（左: 概念図, 右: ローソク足チャート図） */}
      <div className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-border/60">
        {/* 左: 幾何学ダイアグラム (約38%) */}
        <div className="col-span-4 flex items-center justify-center bg-white dark:bg-slate-900 rounded border border-slate-200/80 dark:border-slate-800 p-1">
          <SchemaDiagram patternId={item.id} isBullish={isBullish} colorMode={colorMode} />
        </div>

        {/* 右: ローソク足チャート図 (約62%) */}
        <div className="col-span-8 flex items-center justify-center bg-white dark:bg-slate-900 rounded border border-slate-200/80 dark:border-slate-800 p-1 overflow-hidden">
          <CandleChartDiagram patternId={item.id} isBullish={isBullish} colorMode={colorMode} />
        </div>
      </div>

      {/* フッター（Entry / SL / TP の要約 ＆ 詳細ボタン） */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-border/60 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-muted-foreground">信頼度:</span>
          <span className="text-amber-500 font-bold">
            {"★".repeat(item.reliability)}
            {"☆".repeat(5 - item.reliability)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary group-hover:text-primary/80 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>トレード戦略</span>
        </div>
      </div>
    </div>
  );
};
