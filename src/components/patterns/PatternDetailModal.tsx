import React from "react";
import { type ChartPatternItem } from "@/data/chartPatternsData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SchemaDiagram, CandleChartDiagram, type PatternColorMode } from "./PatternDiagram";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldAlert,
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";

interface PatternDetailModalProps {
  item: ChartPatternItem | null;
  isOpen: boolean;
  onClose: () => void;
  colorMode?: PatternColorMode;
}

export const PatternDetailModal: React.FC<PatternDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  colorMode = "jp",
}) => {
  if (!item) return null;
  const isBullish = item.category === "bullish";

  const badgeBg = colorMode === "jp"
    ? isBullish ? "bg-red-600" : "bg-blue-600"
    : isBullish ? "bg-emerald-600" : "bg-rose-600";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-white ${badgeBg}`}
            >
              {isBullish ? (
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              ) : (
                <ArrowDownRight className="w-4 h-4 stroke-[3]" />
              )}
              {item.typeLabel}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-muted font-medium text-slate-700 dark:text-slate-300">
              {item.type === "reversal" ? "トレンド転換型" : "トレンド継続型"}
            </span>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex flex-col gap-0.5">
            <span>{item.nameJa}</span>
            <span className="text-sm font-normal text-muted-foreground">{item.nameEn}</span>
          </DialogTitle>

          <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
            {item.description}
          </DialogDescription>
        </DialogHeader>

        {/* チャート図プレビュー */}
        <div className="mt-3 grid grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-border">
          <div className="col-span-12 sm:col-span-5 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-muted-foreground mb-1">
              幾何学ダイアグラム（骨格）
            </span>
            <div className="w-full max-w-[160px] h-[100px]">
              <SchemaDiagram patternId={item.id} isBullish={isBullish} colorMode={colorMode} />
            </div>
          </div>

          <div className="col-span-12 sm:col-span-7 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-muted-foreground mb-1">
              ローソク足チャート ＆ 売買ポイント
            </span>
            <div className="w-full h-[100px]">
              <CandleChartDiagram patternId={item.id} isBullish={isBullish} colorMode={colorMode} />
            </div>
          </div>
        </div>

        {/* 実戦トレード戦略カード（Entry, SL, TP） */}
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-primary" />
            <span>トレード執行ルール（エントリー・利確・損切り）</span>
          </h4>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Entry */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white">
                  ENTRY
                </span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  {isBullish ? "買いエントリー（仕掛け）の基準" : "売りエントリー（空売り）の基準"}
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
                {item.entryPoint}
              </p>
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-300">
                    損切り（SL: Stop Loss）
                  </span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-400 leading-relaxed">
                  {item.stopLoss}
                </p>
              </div>

              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    利確目標（TP: Take Profit）
                  </span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
                  {item.takeProfit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 市場心理の解説 */}
        <div className="mt-4 bg-slate-50 dark:bg-muted/50 rounded-lg p-3.5 border border-slate-200 dark:border-border">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
            <BrainCircuit className="w-4 h-4 text-indigo-500" />
            <span>なぜこのパターンで勝てるのか（相場心理と機関投資家の動き）</span>
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {item.marketPsychology}
          </p>
        </div>

        {/* だましを回避するプロのコツ */}
        <div className="mt-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg p-3.5 border border-amber-200 dark:border-amber-800/50">
          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>だまし（Fakeout）を防ぐ実戦チェックリスト</span>
          </h4>
          <ul className="space-y-1.5">
            {item.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-amber-900/90 dark:text-amber-300/90">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};
