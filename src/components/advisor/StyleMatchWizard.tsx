import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  HelpCircle,
  PieChart,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import {
  wizardQuestions,
  calculateInvestmentType,
  resolveEffectiveStock,
  type InvestmentTypeResult,
} from "@/data/advisorData";
import { stockUniverse, type StockData } from "@/data/stockData";
import { findSearchableStock } from "@/lib/stockSearch";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";

interface StyleMatchWizardProps {
  onSelectStockForHealthCheck?: (code: string) => void;
  embedded?: boolean;
}

const ALLOCATION_BAR_TONES = [
  "bg-primary",
  "bg-emerald-500/80",
  "bg-amber-500/80",
  "bg-slate-400",
];

const getQuestionIcon = (iconName: string) => {
  switch (iconName) {
    case "Clock":
      return <Clock className="h-4 w-4 text-primary" />;
    case "Target":
      return <Target className="h-4 w-4 text-primary" />;
    case "Wallet":
      return <Wallet className="h-4 w-4 text-primary" />;
    case "ShieldAlert":
      return <ShieldAlert className="h-4 w-4 text-primary" />;
    default:
      return <Sparkles className="h-4 w-4 text-primary" />;
  }
};

export const StyleMatchWizard = ({
  onSelectStockForHealthCheck,
  embedded = false,
}: StyleMatchWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<InvestmentTypeResult | null>(null);

  const totalSteps = wizardQuestions.length;
  const currentQ = wizardQuestions[currentStep];

  const handleSelectOption = (optionId: string) => {
    const updatedAnswers = { ...answers, [currentQ.id]: optionId };
    setAnswers(updatedAnswers);

    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // 診断結果を計算
      const diagnosed = calculateInvestmentType(updatedAnswers);
      setResult(diagnosed);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setResult(null);
  };

  // 診断結果のおすすめ銘柄リストを解決し、ライブ株価を取得
  const baseMatchedStocks: StockData[] = useMemo(() => {
    if (!result) return [];
    return result.recommendedStockCodes
      .map((code) => {
        const found = findSearchableStock(code) ?? stockUniverse.find((s) => s.code === code);
        return found ? resolveEffectiveStock(found) : null;
      })
      .filter((s): s is StockData => Boolean(s));
  }, [result]);

  const { stocks: matchedStocks } = useLiveStockQuotes(baseMatchedStocks);

  const content = (
    <>
      {/* 診断前 / 診断中ヘッダー */}
      {!result ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col justify-between gap-2 border-b border-border pb-2.5 sm:flex-row sm:items-center">
            <h3 className="text-xs font-bold tracking-tight text-foreground sm:text-sm">
              あなたに最適な投資スタイルと厳選銘柄を見つける
            </h3>
            <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
              <span className="tabular-nums">ステップ {currentStep + 1} / {totalSteps}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 質問カード */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded border border-primary/25 bg-primary/10">
                {getQuestionIcon(currentQ.icon)}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold tracking-wider text-primary">
                  QUESTION {currentStep + 1}
                </span>
                <h3 className="text-sm font-bold text-foreground sm:text-base">{currentQ.title}</h3>
                <p className="text-xxs sm:text-xs text-muted-foreground">{currentQ.subtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
              {currentQ.options.map((option) => {
                const isSelected = answers[currentQ.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className={`group relative flex flex-col items-start rounded border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className={`font-bold text-xs sm:text-sm transition-colors ${isSelected ? "text-primary" : "text-foreground group-hover:text-primary"}`}>
                        {option.label}
                      </span>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <p className="mt-1 text-xxs sm:text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {currentStep > 0 && (
            <div className="flex justify-start pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                ← 前の質問に戻る
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 診断結果画面 */
        <div className="space-y-4 animate-in fade-in-50 duration-300">
          <div className="flex flex-col justify-between gap-2.5 border-b border-border pb-3 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xxs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>診断完了・最適なスタイル</span>
              </div>
              <h2 className="mt-1.5 text-base font-black tracking-tight text-foreground sm:text-xl">
                {result.name}
              </h2>
              <p className="text-xxs sm:text-xs text-muted-foreground mt-0.5 font-medium">
                {result.badge}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors self-end sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              もう一度診断する
            </button>
          </div>

          {/* スタイル概要カード */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded border border-border bg-background p-3 sm:p-4 lg:col-span-2 space-y-2.5">
              <h4 className="text-xxs font-bold tracking-wider text-muted-foreground">
                スタイル解説・特徴
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground">
                {result.description}
              </p>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1 text-xs">
                <div className="rounded border border-border border-t-2 border-t-primary bg-muted/20 p-2 sm:p-2.5">
                  <span className="text-muted-foreground block text-[10px] sm:text-xxs font-medium">推奨投資期間</span>
                  <span className="font-bold text-foreground mt-0.5 block text-[11px] sm:text-xs">{result.targetHorizon}</span>
                </div>
                <div className="rounded border border-border border-t-2 border-t-emerald-500 bg-emerald-500/[0.04] p-2 sm:p-2.5">
                  <span className="text-muted-foreground block text-[10px] sm:text-xxs font-medium">期待リターン目安</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block text-[11px] sm:text-xs">{result.expectedYield}</span>
                </div>
                <div className="rounded border border-border border-t-2 border-t-amber-500 bg-amber-500/[0.04] p-2 sm:p-2.5">
                  <span className="text-muted-foreground block text-[10px] sm:text-xxs font-medium">リスク許容度</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 mt-0.5 block text-[11px] sm:text-xs">{result.riskTolerance}</span>
                </div>
              </div>
            </div>

            {/* 推奨ポートフォリオ構成比 */}
            <div className="rounded border border-border bg-background p-3 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xxs font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5 text-primary" />
                  推奨ポートフォリオ配分
                </h4>
              </div>
              <div className="space-y-2 pt-0.5">
                {result.portfolioAllocation.map((item, idx) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{item.label}</span>
                      <span className="font-mono font-bold tabular-nums text-foreground">{item.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ALLOCATION_BAR_TONES[idx % ALLOCATION_BAR_TONES.length]
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* プロのアドバイス3箇条 */}
          <div className="rounded border border-border border-l-2 border-l-primary bg-primary/[0.03] p-3 sm:p-3.5">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              このスタイルを成功させる実践ルール
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs text-foreground/90">
              {result.keyAdvice.map((advice, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{advice}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 相性抜群のおすすめ銘柄カード */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                あなたのスタイルに合致する厳選おすすめ銘柄
              </h3>
              <span className="text-xxs font-semibold text-muted-foreground">
                全 {matchedStocks.length} 銘柄
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {matchedStocks.map((stock) => {
                const isPositive = stock.change >= 0;
                return (
                  <div
                    key={stock.code}
                    className="flex flex-col justify-between rounded border border-border bg-background p-3 transition-colors hover:border-primary/50"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xxs font-mono font-bold text-muted-foreground">
                              {stock.code}
                            </span>
                            <span className="text-xxs text-muted-foreground font-medium truncate">
                              {stock.market}
                            </span>
                          </div>
                          <h4 className="mt-1 font-bold text-xs sm:text-sm text-foreground line-clamp-1">
                            {stock.name}
                          </h4>
                        </div>
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          相性度 95%
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between border-t border-border/60 pt-2 text-xs">
                        <span className="text-muted-foreground text-xxs">現在株価</span>
                        <div className="text-right">
                          {stock.price > 0 ? (
                            <>
                              <span className="font-bold font-mono text-sm tabular-nums text-foreground">
                                ¥{stock.price.toLocaleString()}
                              </span>
                              <span className={`ml-1.5 font-mono text-xxs font-bold tabular-nums ${isPositive ? "text-stock-up" : "text-stock-down"}`}>
                                {isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xxs font-medium text-muted-foreground">取得中...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-border/60">
                      {onSelectStockForHealthCheck && (
                        <button
                          type="button"
                          onClick={() => onSelectStockForHealthCheck(stock.code)}
                          className="flex-1 rounded border border-primary/50 bg-primary/10 py-1.5 text-center text-xs font-bold text-primary hover:bg-primary/15 transition-colors"
                        >
                          カルテ診断を見る
                        </button>
                      )}
                      <Link
                        to={`/chart?q=${stock.code}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="チャートを確認"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
      {content}
    </div>
  );
};
