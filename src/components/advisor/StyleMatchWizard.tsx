import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  HelpCircle,
  PieChart,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  wizardQuestions,
  calculateInvestmentType,
  type InvestmentTypeResult,
} from "@/data/advisorData";
import { stockUniverse, type StockData } from "@/data/stockData";
import { findSearchableStock } from "@/lib/stockSearch";

interface StyleMatchWizardProps {
  onSelectStockForHealthCheck?: (code: string) => void;
  embedded?: boolean;
}

const getQuestionIcon = (iconName: string) => {
  switch (iconName) {
    case "Clock":
      return <Clock className="h-5 w-5 text-header-accent" />;
    case "Target":
      return <Target className="h-5 w-5 text-header-accent" />;
    case "Wallet":
      return <Wallet className="h-5 w-5 text-header-accent" />;
    case "ShieldAlert":
      return <ShieldAlert className="h-5 w-5 text-header-accent" />;
    default:
      return <Sparkles className="h-5 w-5 text-header-accent" />;
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

  // 診断結果のおすすめ銘柄リストを解決
  const matchedStocks: StockData[] = result
    ? result.recommendedStockCodes
        .map((code) => {
          const found = findSearchableStock(code);
          return found ?? stockUniverse.find((s) => s.code === code);
        })
        .filter((s): s is StockData => Boolean(s))
    : [];

  const content = (
    <>
      {/* 診断前 / 診断中ヘッダー */}
      {!result ? (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                あなたに最適な投資スタイルと厳選銘柄を見つける
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>ステップ {currentStep + 1} / {totalSteps}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-header-accent transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 質問カード */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-header-accent/10 border border-header-accent/20">
                {getQuestionIcon(currentQ.icon)}
              </div>
              <div>
                <span className="text-xs font-semibold text-header-accent">QUESTION {currentStep + 1}</span>
                <h3 className="text-base font-bold text-foreground sm:text-lg">{currentQ.title}</h3>
                <p className="text-xs text-muted-foreground">{currentQ.subtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentQ.options.map((option) => {
                const isSelected = answers[currentQ.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-header-accent bg-header-accent/5 ring-2 ring-header-accent/20 shadow-sm"
                        : "border-border/80 bg-background/50 hover:border-header-accent/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-semibold text-sm text-foreground group-hover:text-header-accent transition-colors">
                        {option.label}
                      </span>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isSelected ? "text-header-accent" : ""}`} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {currentStep > 0 && (
            <div className="flex justify-start pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ← 前の質問に戻る
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 診断結果画面 */
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex flex-col justify-between gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>診断完了・最適なスタイルを特定</span>
              </div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {result.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {result.badge}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors self-start sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              もう一度診断する
            </button>
          </div>

          {/* スタイル概要カード */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 lg:col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                スタイル解説・特徴
              </h4>
              <p className="text-sm leading-relaxed text-foreground">
                {result.description}
              </p>
              <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <span className="text-muted-foreground block text-xxs font-medium">推奨投資期間</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{result.targetHorizon}</span>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <span className="text-muted-foreground block text-xxs font-medium">期待リターン目安</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{result.expectedYield}</span>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <span className="text-muted-foreground block text-xxs font-medium">リスク許容度</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5 block">{result.riskTolerance}</span>
                </div>
              </div>
            </div>

            {/* 推奨ポートフォリオ構成比 */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5 text-header-accent" />
                  推奨ポートフォリオ配分
                </h4>
              </div>
              <div className="space-y-2 pt-1">
                {result.portfolioAllocation.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{item.label}</span>
                      <span className="font-bold">{item.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* プロのアドバイス3箇条 */}
          <div className="rounded-xl border border-header-accent/20 bg-header-accent/5 p-4">
            <h4 className="text-xs font-bold text-header-accent flex items-center gap-1.5 uppercase tracking-wide">
              <HelpCircle className="h-3.5 w-3.5" />
              このスタイルを成功させる実践ルール
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs text-foreground/90">
              {result.keyAdvice.map((advice, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-header-accent/20 text-xxs font-bold text-header-accent">
                    {i + 1}
                  </span>
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 相性抜群のおすすめ銘柄カード */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                あなたのスタイルに合致する厳選おすすめ銘柄
              </h3>
              <span className="text-xs text-muted-foreground">
                全 {matchedStocks.length} 銘柄
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matchedStocks.map((stock) => {
                const isPositive = stock.change >= 0;
                return (
                  <div
                    key={stock.code}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-4 transition-all hover:border-header-accent/50 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xxs font-mono font-bold text-muted-foreground">
                              {stock.code}
                            </span>
                            <span className="text-xxs text-muted-foreground font-medium">
                              {stock.market}
                            </span>
                          </div>
                          <h4 className="mt-1 font-bold text-sm text-foreground line-clamp-1">
                            {stock.name}
                          </h4>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xxs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          相性度 95%
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between border-t border-border/40 pt-2 text-xs">
                        <span className="text-muted-foreground text-xxs">現在株価</span>
                        <div className="text-right">
                          <span className="font-bold font-mono text-sm">
                            ¥{stock.price.toLocaleString()}
                          </span>
                          <span className={`ml-1.5 font-mono text-xxs font-semibold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/40">
                      {onSelectStockForHealthCheck && (
                        <button
                          type="button"
                          onClick={() => onSelectStockForHealthCheck(stock.code)}
                          className="flex-1 rounded-lg bg-header-accent/10 py-1.5 text-center text-xs font-semibold text-header-accent hover:bg-header-accent/20 transition-colors"
                        >
                          カルテ診断を見る
                        </button>
                      )}
                      <Link
                        to={`/chart?q=${stock.code}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
