import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  LineChart,
  Newspaper,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import RealStockChart from "@/components/RealStockChart";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import {
  generateStockHealthReport,
  fetchStockNewsDirect,
  resolveEffectiveStock,
  type StockHealthReport,
} from "@/data/advisorData";
import { type StockDetailedMetrics } from "@/lib/stockMetricsData";
import { useLiveStockQuote } from "@/hooks/useLiveStockQuote";
import { findSearchableStock } from "@/lib/stockSearch";
import {
  addChartWatchlistStock,
  CHART_WATCHLIST_UPDATED_EVENT,
  readChartWatchlist,
  removeChartWatchlistStock,
} from "@/lib/chartWatchlist";
import { toast } from "@/components/ui/sonner";
import { stockUniverse, type StockData, type NewsItem } from "@/data/stockData";

interface StockHealthCheckProps {
  initialCode?: string;
  onAskAdvisorWithStock?: (code: string) => void;
  onOpenMetricsGuide?: (metric: string) => void;
}

const quickPickCodes = [
  { code: "7203", name: "トヨタ" },
  { code: "8306", name: "三菱UFJ" },
  { code: "8035", name: "東エレク" },
  { code: "6857", name: "アドバンテスト" },
  { code: "4452", name: "花王" },
  { code: "8058", name: "三菱商事" },
  { code: "7974", name: "任天堂" },
  { code: "9432", name: "NTT" },
];

export const StockHealthCheck = ({
  initialCode = "7203",
  onAskAdvisorWithStock,
  onOpenMetricsGuide,
}: StockHealthCheckProps) => {
  const [searchQuery, setSearchQuery] = useState(initialCode);
  const [selectedCode, setSelectedCode] = useState(initialCode);

  useEffect(() => {
    setSelectedCode(initialCode);
    setSearchQuery(initialCode);
  }, [initialCode]);
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<Partial<StockDetailedMetrics> | null>(null);
  const [tradeStance, setTradeStance] = useState<"income" | "swing" | "value">("income");
  const [riskTolerance, setRiskTolerance] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [targetRiskReward, setTargetRiskReward] = useState<number | null>(null);
  const [watchlistCodes, setWatchlistCodes] = useState<string[]>(() =>
    readChartWatchlist().map((item) => item.code)
  );

  useEffect(() => {
    const sync = () => setWatchlistCodes(readChartWatchlist().map((item) => item.code));
    window.addEventListener(CHART_WATCHLIST_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHART_WATCHLIST_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleToggleWatchlist = (stock: StockData) => {
    if (watchlistCodes.includes(stock.code)) {
      const next = removeChartWatchlistStock(stock.code);
      setWatchlistCodes(next.map((item) => item.code));
      toast.info(`${stock.code} ${stock.name}をチャート監視から外しました`);
    } else {
      const next = addChartWatchlistStock({ ...stock, sourceLabel: "銘柄カルテ" });
      setWatchlistCodes(next.map((item) => item.code));
      toast.success(`${stock.code} ${stock.name}をチャート監視に追加しました`);
    }
  };

  const isNikkei = selectedCode === "N225" || selectedCode === "^N225";

  const baseStock: StockData = useMemo(() => {
    if (isNikkei) {
      return resolveEffectiveStock({
        code: "N225",
        name: "日経平均株価",
        market: "主要指数",
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        open: 0,
        high: 0,
        low: 0,
        previousClose: 0,
      });
    }

    const found = findSearchableStock(selectedCode);
    const raw = (
      found ??
      stockUniverse.find((s) => s.code === selectedCode) ?? {
        code: selectedCode,
        name: selectedCode,
        market: "プライム",
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        open: 0,
        high: 0,
        low: 0,
        previousClose: 0,
      }
    );
    return resolveEffectiveStock(raw);
  }, [selectedCode]);

  // リアルタイム市場株価をAPIから取得
  const { stock: liveStock, status: liveStatus } = useLiveStockQuote(baseStock);

  // 銘柄ごとの詳細財務指標（Yahoo Finance実データ & キャッシュ）を取得
  useEffect(() => {
    const controller = new AbortController();
    const isNikkei = selectedCode === "N225" || selectedCode === "^N225";
    const symbol = isNikkei ? "^N225" : `${selectedCode}.T`;

    try {
      const cached = localStorage.getItem(`stock-scout-metrics-cache-${symbol}`);
      if (cached) {
        setLiveMetrics(JSON.parse(cached));
      } else {
        setLiveMetrics(null);
      }
    } catch {
      setLiveMetrics(null);
    }

    fetch(`/api/stock-metrics?symbol=${encodeURIComponent(symbol)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((payload) => {
        if (payload?.metrics) {
          setLiveMetrics(payload.metrics);
          try {
            localStorage.setItem(`stock-scout-metrics-cache-${symbol}`, JSON.stringify(payload.metrics));
          } catch {}
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [selectedCode]);

  // 最新ニュースを取得
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingNews(true);
    fetchStockNewsDirect(selectedCode, baseStock.name).then((news) => {
      if (!isCancelled) {
        setStockNews(news);
        setIsLoadingNews(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [selectedCode, baseStock.name]);

  // 親コンポーネントからの初期コード変更を検知
  useEffect(() => {
    if (initialCode && initialCode !== selectedCode) {
      setSelectedCode(initialCode);
      setSearchQuery(initialCode);
    }
  }, [initialCode]);

  const report: StockHealthReport | null = useMemo(() => {
    return generateStockHealthReport(liveStock, liveMetrics ?? undefined);
  }, [liveStock, liveMetrics]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSelectedCode(searchQuery.trim());
  };

  const getVerdictBadge = (verdict: StockHealthReport["verdict"]) => {
    switch (verdict) {
      case "強力買い候補":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: <Flame className="h-4 w-4" />,
        };
      case "押し目買い好機":
        return {
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          icon: <TrendingUp className="h-4 w-4" />,
        };
      case "中立・様子見":
        return {
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          icon: <Activity className="h-4 w-4" />,
        };
      case "過熱感あり警戒":
        return {
          bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
          icon: <AlertCircle className="h-4 w-4" />,
        };
      case "見送り推奨":
        return {
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: <XCircle className="h-4 w-4" />,
        };
    }
  };

  const calculatedScenario = useMemo(() => {
    const price = report?.stock.price ?? 0;
    if (price <= 0) return null;

    let targetRate1 = 1.08;
    let targetRate2 = 1.2;
    let entryLowRate = 0.98;
    let entryHighRate = 1.01;
    let deepLowRate = 0.94;
    let deepHighRate = 0.97;
    let stopLossRate = 0.93;

    if (tradeStance === "income") {
      targetRate1 = 1.06;
      targetRate2 = 1.15;
      entryLowRate = 0.97;
      entryHighRate = 1.0;
      deepLowRate = 0.92;
      deepHighRate = 0.95;
      stopLossRate = 0.9;
    } else if (tradeStance === "swing") {
      targetRate1 = 1.09;
      targetRate2 = 1.22;
      entryLowRate = 0.99;
      entryHighRate = 1.02;
      deepLowRate = 0.95;
      deepHighRate = 0.98;
      stopLossRate = 0.95;
    } else if (tradeStance === "value") {
      targetRate1 = 1.12;
      targetRate2 = 1.25;
      entryLowRate = 0.96;
      entryHighRate = 0.99;
      deepLowRate = 0.91;
      deepHighRate = 0.94;
      stopLossRate = 0.92;
    }

    if (riskTolerance === "safe") {
      entryLowRate -= 0.01;
      entryHighRate -= 0.01;
      deepLowRate -= 0.01;
      deepHighRate -= 0.01;
      stopLossRate += 0.01;
    } else if (riskTolerance === "aggressive") {
      entryHighRate += 0.01;
      targetRate1 += 0.02;
      targetRate2 += 0.03;
      stopLossRate -= 0.01;
    }

    const entryZone = `¥${Math.round(price * entryLowRate).toLocaleString()} 〜 ¥${Math.round(price * entryHighRate).toLocaleString()}`;
    const deepEntryZone = `¥${Math.round(price * deepLowRate).toLocaleString()} 〜 ¥${Math.round(price * deepHighRate).toLocaleString()}`;
    const stopLossPrice = Math.round(price * stopLossRate);
    const downsidePct = ((price - stopLossPrice) / price) * 100;

    if (targetRiskReward !== null) {
      const riskFraction = Math.max(0.005, downsidePct / 100);
      targetRate1 = 1 + riskFraction * targetRiskReward;
      targetRate2 = 1 + riskFraction * (targetRiskReward + 1.0);
    }

    const targetPrice1 = Math.round(price * targetRate1);
    const targetPrice2 = Math.round(price * targetRate2);

    const upsidePct = ((targetPrice1 - price) / price) * 100;
    const upsidePct2 = ((targetPrice2 - price) / price) * 100;
    const riskReward =
      targetRiskReward !== null
        ? targetRiskReward.toFixed(1)
        : (upsidePct / Math.max(0.5, downsidePct)).toFixed(1);

    return {
      price,
      entryZone,
      deepEntryZone,
      targetPrice1,
      targetPrice2,
      stopLossPrice,
      upsidePct,
      upsidePct2,
      downsidePct,
      riskReward,
    };
  }, [report?.stock.price, tradeStance, riskTolerance, targetRiskReward]);

  const getGradeColor = (grade: StockHealthReport["overallGrade"]) => {
    switch (grade) {
      case "S":
        return "text-amber-500 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
      case "A":
        return "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
      case "B":
        return "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10";
      case "C":
        return "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
      case "D":
        return "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10";
    }
  };

  return (
    <div className="space-y-4">
      {/* 銘柄カルテ検索 & クイック指定（他ページ統一タイトルバー・コンパクト設計） */}
      <section className="rounded border border-border bg-card">
        <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between rounded-t">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-foreground" />
            <h2 className="text-xs sm:text-sm font-bold text-foreground">銘柄カルテ診断</h2>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-xxs font-bold text-foreground/80 shrink-0">
              5軸総合診断
            </span>
          </div>
          <div className="text-xxs text-muted-foreground">
            業績・財務健全性・割安度・配当力・テクニカルをレーダー分析
          </div>
        </div>

        <div className="p-2.5 sm:p-3 space-y-2">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="銘柄コード（例: 7203）または銘柄名でカルテ発行..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-border/80 bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-header-accent focus:outline-none focus:ring-1 focus:ring-header-accent"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-header-accent px-3.5 text-xs font-bold text-header-bg hover:opacity-90 transition-opacity"
            >
              カルテ更新
            </button>
          </form>

          <div className="flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap text-xs">
            <span className="shrink-0 text-muted-foreground font-medium text-xxs">クイック指定:</span>
            {quickPickCodes.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setSearchQuery(item.code);
                  setSelectedCode(item.code);
                }}
                className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xxs transition-colors ${
                  selectedCode === item.code
                    ? "border-header-accent bg-header-accent/10 font-bold text-header-accent"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.code} {item.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 診断結果カルテ */}
      {report ? (
        <div className="space-y-3 sm:space-y-4">
          {/* カルテメインヘッダー */}
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs sm:p-5">
            <div className="space-y-2 border-b border-border/60 pb-2.5 sm:space-y-2.5 sm:pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      {report.stock.code}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {report.stock.market}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-black tracking-tight text-foreground sm:text-2xl">
                    {report.stock.name}
                  </h2>
                </div>

                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                  {isNikkei ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs font-bold text-muted-foreground">
                      <span>主要市場代表指数（東証プライム225）</span>
                    </div>
                  ) : (
                    <>
                      {/* 総合スコアとランク */}
                      <div className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border/80 bg-background/50 px-2.5 py-1.5 sm:px-3.5 sm:py-2">
                        <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-md border text-base sm:text-lg font-black ${getGradeColor(report.overallGrade)}`}>
                          {report.overallGrade}
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xxs font-medium text-muted-foreground">総合AIスコア</div>
                          <div className="flex items-baseline gap-1 font-mono">
                            <span className="text-lg sm:text-xl font-black text-foreground">{report.overallScore}</span>
                            <span className="text-xxs text-muted-foreground">/ 100</span>
                          </div>
                        </div>
                      </div>

                      {/* 総合判定 */}
                      <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 font-bold text-xs ${getVerdictBadge(report.verdict).bg}`}>
                        {getVerdictBadge(report.verdict).icon}
                        <span>{report.verdict}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xxs sm:text-xs text-muted-foreground leading-relaxed">
                {report.shikihoSummary}
              </p>
            </div>

            {/* 主要ファンダメンタルズ & 需給指標実数グリッド（正確な実データのみを掲載） */}
            <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                <span className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">
                  {isNikkei ? "現在値・市場動向" : "主要財務・バリュエーション指標"}
                </span>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                  {!isNikkei && (
                    <button
                      type="button"
                      onClick={() => handleToggleWatchlist(report.stock)}
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-xxs font-bold transition-colors ${
                        watchlistCodes.includes(report.stock.code)
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {watchlistCodes.includes(report.stock.code) ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>チャート監視中</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          <span>チャート監視に追加</span>
                        </>
                      )}
                    </button>
                  )}
                  {!isNikkei && onOpenMetricsGuide && (
                    <button
                      type="button"
                      onClick={() => onOpenMetricsGuide("overview")}
                      className="inline-flex items-center gap-1 sm:gap-1.5 rounded border border-border bg-background px-2 py-0.5 text-xxs font-bold text-primary hover:bg-muted transition-colors"
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>指標ガイド →</span>
                    </button>
                  )}
                </div>
              </div>

              {isNikkei ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs font-mono">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-muted-foreground text-xxs block font-sans">指数現在値</span>
                        {liveStatus === "live" && (
                          <span className="ml-auto inline-flex shrink-0 self-start items-center gap-1 rounded border border-border bg-background px-1.5 py-0.2 text-[10px] font-semibold text-foreground/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            最新値
                          </span>
                        )}
                      </div>
                      <span className="text-base font-bold text-foreground">¥{report.stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className={`text-xxs block font-semibold ${report.stock.change >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                        {report.stock.change >= 0 ? "+" : ""}{report.stock.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}円 ({report.stock.changePercent >= 0 ? "+" : ""}{report.stock.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/10 p-2.5 text-xs text-muted-foreground leading-relaxed">
                    ※ 日経平均株価（日経225）は、東証プライム市場を代表する225銘柄の株価平均型指数です。単一企業ではないため、決算諸表に基づく財務指標（PER・PBR・ROE・自己資本比率等）は記載しておりません。
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-4 lg:grid-cols-7 text-xs font-mono">
                  {/* 現在値 */}
                  <div className="rounded-md border border-border/60 bg-muted/20 p-1.5 sm:p-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-muted-foreground text-xxs block font-sans">現在値</span>
                      {liveStatus === "live" && (
                        <span className="ml-auto inline-flex shrink-0 self-start items-center gap-1 rounded border border-border bg-background px-1.5 py-0.2 text-[10px] font-semibold text-foreground/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          最新値
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-black tabular-nums text-foreground">¥{report.stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span className={`text-xxs block font-semibold ${report.stock.change >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                      {report.stock.change >= 0 ? "+" : ""}{report.stock.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}円 ({report.stock.changePercent >= 0 ? "+" : ""}{report.stock.changePercent.toFixed(2)}%)
                    </span>
                  </div>

                  {/* 予想PER */}
                  <div className="rounded-md border border-border/60 bg-muted/20 p-1.5 sm:p-2">
                    <span className="text-muted-foreground text-xxs block font-sans">予想PER</span>
                    <span className="text-base sm:text-lg font-black tabular-nums text-foreground">{report.metrics.per}</span>
                    <span className="text-xxs text-muted-foreground block truncate">
                      {report.metrics.per !== "―"
                        ? (parseFloat(report.metrics.per) <= 12 ? "割安水準" : parseFloat(report.metrics.per) >= 28 ? "高成長期待" : "適正水準")
                        : "会社予想非開示"}
                    </span>
                  </div>

                  {/* 実績PBR */}
                  <div className="rounded-md border border-border/60 bg-muted/20 p-1.5 sm:p-2">
                    <span className="text-muted-foreground text-xxs block font-sans">実績PBR</span>
                    <span className="text-sm font-bold text-foreground">{report.metrics.pbr}</span>
                    <span className="text-xxs text-muted-foreground block truncate">
                      {report.metrics.pbr !== "―"
                        ? (parseFloat(report.metrics.pbr) <= 1.0 ? "1倍割れ改善" : "適正水準")
                        : "算出不可"}
                    </span>
                  </div>

                  {/* 予想配当利回り */}
                  <div className="rounded-md border border-border/60 bg-muted/20 p-1.5 sm:p-2">
                    <span className="text-muted-foreground text-xxs block font-sans">予想配当利回り</span>
                    <span className={`text-sm font-bold ${report.metrics.dividendYield !== "―" && parseFloat(report.metrics.dividendYield) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {report.metrics.dividendYield}
                    </span>
                    <span className="text-xxs text-muted-foreground block truncate">
                      {report.metrics.dividendYield !== "―"
                        ? (parseFloat(report.metrics.dividendYield) >= 3.5 ? "高配当枠" : parseFloat(report.metrics.dividendYield) > 0 ? "配当還元" : "無配方針")
                        : "未定・非開示"}
                    </span>
                  </div>

                  {/* ROE */}
                  <div className="rounded-md border border-border/60 bg-muted/20 p-1.5 sm:p-2">
                    <span className="text-muted-foreground text-xxs block font-sans">ROE (自己資本利益率)</span>
                    <span className="text-sm font-bold text-foreground">{report.metrics.roe}</span>
                    <span className="text-xxs text-muted-foreground block truncate">
                      {report.metrics.roe !== "―"
                        ? (parseFloat(report.metrics.roe) >= 10 ? "資本効率◎" : "改善余地")
                        : "未算出"}
                    </span>
                  </div>

                  {/* 自己資本比率 */}
                  <div className="rounded-md border border-border/60 bg-muted/20 p-1.5 sm:p-2">
                    <span className="text-muted-foreground text-xxs block font-sans">自己資本比率</span>
                    <span className="text-sm font-bold text-foreground">{report.metrics.equityRatio}</span>
                    <span className="text-xxs text-muted-foreground block truncate">
                      {report.metrics.equityRatio !== "―" ? "財務健全性" : "未算出"}
                    </span>
                  </div>

                  {/* 信用倍率 */}
                  <div className="rounded-md border border-border/60 bg-muted/20 p-1.5 sm:p-2">
                    <span className="text-muted-foreground text-xxs block font-sans">信用倍率</span>
                    <span className="text-sm font-bold text-foreground">{report.metrics.creditRatio}</span>
                    <span className="text-xxs text-muted-foreground block truncate">
                      {report.metrics.creditRatio !== "―"
                        ? (parseFloat(report.metrics.creditRatio) <= 2.5 ? "上値軽い" : "要警戒")
                        : "未算出"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* リアルタイム株価チャート（日足・移動平均線・出来高） */}
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs sm:p-5 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                株価チャート（日足・20日/200日移動平均線・出来高）
              </h3>
              <Link
                to={`/chart?q=${report.stock.code}`}
                className="inline-flex items-center gap-1 text-xxs font-bold text-primary hover:underline"
              >
                <span>銘柄・チャートへ →</span>
              </Link>
            </div>

            {(() => {
              const isNikkei = report.stock.code === "N225" || report.stock.code === "^N225";
              const chartSymbol = isNikkei ? "NIKKEI:NI225" : `TSE:${report.stock.code}`;
              const chartApiSymbol = isNikkei ? "^N225" : `${report.stock.code}.T`;
              const formattedPrice = (liveStock.price || report.stock.price).toLocaleString(undefined, { maximumFractionDigits: 2 });
              const formattedChange = report.stock.change.toLocaleString(undefined, { maximumFractionDigits: 2 });
              const priceLabel = report.stock.change >= 0
                ? `+${formattedChange}円 (+${report.stock.changePercent.toFixed(2)}%)`
                : `${formattedChange}円 (${report.stock.changePercent.toFixed(2)}%)`;

              return (
                <RealStockChart
                  code={report.stock.code}
                  name={report.stock.name}
                  chartSymbol={chartSymbol}
                  chartApiSymbol={chartApiSymbol}
                  currentPrice={liveStock.price || report.stock.price}
                  currentPriceLabel={priceLabel}
                  hideHealthCheckLink
                />
              );
            })()}
          </div>

          {/* 売買シナリオ判定 */}
          {!isNikkei && calculatedScenario && (
            <section className="rounded border border-border bg-card">
              <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between rounded-t">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-foreground" />
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    売買シナリオ判定
                  </h3>
                  <span className="rounded border border-border bg-muted px-2 py-0.5 text-xxs font-bold text-foreground/80 shrink-0">
                    指値・撤退ライン
                  </span>
                </div>
                <div className="text-xxs text-muted-foreground">
                  {report.stock.code} {report.stock.name}（現在値 ¥{calculatedScenario.price.toLocaleString()}）のエントリー・利確・損切り目安
                </div>
              </div>

              <div className="p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
                {/* 投資スタンス & リスク許容度 */}
                <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="block text-xxs font-bold text-muted-foreground">
                      投資スタンス
                    </span>
                    <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                      {(
                        [
                          { id: "income", label: "配当・長期", shortLabel: "配当・長期" },
                          { id: "swing", label: "中期スイング", shortLabel: "スイング" },
                          { id: "value", label: "割安リバウンド", shortLabel: "割安反発" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTradeStance(opt.id)}
                          className={`rounded border px-1.5 sm:px-2 py-1.5 text-[11px] sm:text-xxs font-bold transition-colors whitespace-nowrap ${
                            tradeStance === opt.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <span className="sm:hidden">{opt.shortLabel}</span>
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xxs font-bold text-muted-foreground">
                      リスク許容度
                    </span>
                    <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                      {(
                        [
                          { id: "safe", label: "慎重（損切り浅め）", shortLabel: "慎重" },
                          { id: "balanced", label: "標準バランス", shortLabel: "標準" },
                          { id: "aggressive", label: "積極（上値追い）", shortLabel: "積極" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRiskTolerance(opt.id)}
                          className={`rounded border px-1.5 sm:px-2 py-1.5 text-[11px] sm:text-xxs font-bold transition-colors whitespace-nowrap ${
                            riskTolerance === opt.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <span className="sm:hidden">{opt.shortLabel}</span>
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* リスクリワード比 (RR) 設定バー */}
                <div className="flex flex-col gap-2 rounded border border-border/60 bg-muted/20 px-2.5 sm:px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <span className="text-xs font-bold text-foreground">
                      リスクリワード比 (RR)
                    </span>
                    <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                      1 : {calculatedScenario.riskReward}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:items-center">
                    {(
                      [
                        { value: null, label: "自動" },
                        { value: 1.5, label: "1:1.5" },
                        { value: 2.0, label: "1:2.0" },
                        { value: 2.5, label: "1:2.5" },
                        { value: 3.0, label: "1:3.0" },
                        { value: 4.0, label: "1:4.0" },
                      ] as const
                    ).map((opt) => {
                      const active = targetRiskReward === opt.value;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setTargetRiskReward(opt.value)}
                          className={`rounded border px-2 py-1 font-mono text-xxs font-bold transition-colors whitespace-nowrap text-center ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5段階価格ラダー */}
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 sm:gap-2.5">
                  {/* 第2目標 */}
                  <div className="rounded-lg border border-border border-t-2 border-t-stock-up bg-background p-2 sm:p-2.5 text-center space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xxs font-bold text-stock-up">
                      第2目標 (上値目途)
                    </span>
                    <div className="font-mono font-black text-base tabular-nums text-foreground">
                      ¥{calculatedScenario.targetPrice2.toLocaleString()}
                    </div>
                    <span className="text-[10px] sm:text-xxs text-stock-up font-bold">
                      想定 +{calculatedScenario.upsidePct2.toFixed(1)}%
                    </span>
                  </div>

                  {/* 第1目標 */}
                  <div className="rounded-lg border border-border border-t-2 border-t-primary/70 bg-background p-2 sm:p-2.5 text-center space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xxs font-bold text-primary">
                      第1目標 (直近高値)
                    </span>
                    <div className="font-mono font-black text-base tabular-nums text-foreground">
                      ¥{calculatedScenario.targetPrice1.toLocaleString()}
                    </div>
                    <span className="text-[10px] sm:text-xxs text-stock-up font-bold">
                      想定 +{calculatedScenario.upsidePct.toFixed(1)}%
                    </span>
                  </div>

                  {/* 打診買いゾーン */}
                  <div className="rounded-lg border border-border bg-muted/25 p-2 sm:p-2.5 text-center space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xxs font-bold text-foreground">
                      打診買いゾーン (30%)
                    </span>
                    <div className="font-mono font-black text-xs sm:text-sm tabular-nums text-foreground">
                      {calculatedScenario.entryZone}
                    </div>
                    <span className="text-[10px] sm:text-xxs text-muted-foreground">
                      現在値付近で分割買い
                    </span>
                  </div>

                  {/* 本命押し目ゾーン */}
                  <div className="rounded-lg border border-border bg-muted/25 p-2 sm:p-2.5 text-center space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xxs font-bold text-foreground">
                      本命押し目ゾーン (70%)
                    </span>
                    <div className="font-mono font-black text-xs sm:text-sm tabular-nums text-foreground">
                      {calculatedScenario.deepEntryZone}
                    </div>
                    <span className="text-[10px] sm:text-xxs text-muted-foreground">
                      下値指値で待機
                    </span>
                  </div>

                  {/* 撤退・損切りライン */}
                  <div className="col-span-2 lg:col-span-1 rounded-lg border border-border border-t-2 border-t-stock-down bg-background p-2 sm:p-2.5 text-center space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xxs font-bold text-stock-down">
                      撤退・損切りライン
                    </span>
                    <div className="font-mono font-black text-base tabular-nums text-foreground">
                      ¥{calculatedScenario.stopLossPrice.toLocaleString()} 割れ
                    </div>
                    <span className="text-[10px] sm:text-xxs text-stock-down font-bold">
                      最大 -{calculatedScenario.downsidePct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* 執行アドバイス */}
                <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-xs space-y-1">
                  <div className="font-bold text-foreground">プロの執行アドバイス</div>
                  <p className="text-muted-foreground leading-relaxed">
                    全額を一括購入せず、まず資金の30%を{" "}
                    <strong className="text-foreground">{calculatedScenario.entryZone}</strong>{" "}
                    で打診買い。残りの70%は調整時の{" "}
                    <strong className="text-foreground">{calculatedScenario.deepEntryZone}</strong>{" "}
                    に指値を入れておくことで、相場全体の急落リスクを回避しながら期待値の高い平均取得単価を作れます。
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 5軸レーダー ＆ 詳細分析 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* 5軸レーダーチャート */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  5軸ファンダメンタル・需給レーダー
                </h3>
              </div>

              <div className="my-2 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={report.radarMetrics}>
                    <PolarGrid stroke="#888888" strokeOpacity={0.25} />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: "currentColor", fontSize: 10.5, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="評価スコア"
                      dataKey="score"
                      stroke="#1d4ed8"
                      fill="#2563eb"
                      fillOpacity={0.24}
                    />
                    <Tooltip
                      formatter={(val: number) => [`${val}点`, "評価"]}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.96)",
                        borderColor: "rgba(148, 163, 184, 0.3)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#f8fafc",
                      }}
                      labelStyle={{
                        color: "#f8fafc",
                        fontWeight: 700,
                        marginBottom: "2px",
                      }}
                      itemStyle={{
                        color: "#7dd3fc",
                        fontWeight: 700,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 border-t border-border/40 pt-2 text-xxs">
                {report.radarMetrics.map((m) => (
                  <div key={m.category} className="space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span className="text-foreground">{m.category}</span>
                      <span className="font-mono text-sm font-black tabular-nums text-primary">{m.score}点</span>
                    </div>
                    <p className="text-muted-foreground text-xxs leading-tight">
                      {m.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* カタリスト・強み・リスク */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs lg:col-span-7 flex flex-col justify-between space-y-4">
              {/* カタリスト（上昇起爆剤） */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                <span className="font-bold text-amber-800 dark:text-amber-300 block text-xs">
                  今後の上昇トリガー（カタリスト）
                </span>
                <ul className="space-y-1 text-xs text-foreground/90 leading-relaxed">
                  {report.catalysts.map((cat, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{cat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 強みとリスク */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="space-y-1.5">
                  <span className="font-bold text-foreground block text-xs">
                    買い材料・強み
                  </span>
                  <ul className="space-y-1 text-muted-foreground text-xs leading-relaxed">
                    {report.strengths.map((str, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-foreground block text-xs">
                    警戒リスク・下落要因
                  </span>
                  <ul className="space-y-1 text-muted-foreground text-xs leading-relaxed">
                    {report.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-stock-down font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 業績モメンタム ＆ 機関・大口需給 */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/40 sm:grid-cols-2 text-xxs">
                <div className="rounded bg-muted/40 p-2 space-y-0.5">
                  <span className="font-semibold text-foreground block">決算・業績進捗トレンド</span>
                  <span className="text-muted-foreground leading-relaxed block">{report.quarterlyTrend}</span>
                </div>
                <div className="rounded bg-muted/40 p-2 space-y-0.5">
                  <span className="font-semibold text-foreground block">大口・EDINET需給動向</span>
                  <span className="text-muted-foreground leading-relaxed block">{report.institutionalFlow}</span>
                </div>
              </div>

              {/* 直近の関連ニュース・適時開示 */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">
                    直近の関連ニュース・市場の材料
                  </span>
                  {isLoadingNews && (
                    <span className="text-xxs text-muted-foreground animate-pulse">更新中...</span>
                  )}
                </div>

                {stockNews.length > 0 ? (
                  <div className="space-y-1.5">
                    {stockNews.map((news) => (
                      <a
                        key={news.id}
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start justify-between gap-2 rounded p-1.5 hover:bg-muted/60 transition-colors text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="line-clamp-1 font-medium text-foreground group-hover:text-header-accent transition-colors">
                            {news.title}
                          </p>
                          <p className="text-xxs text-muted-foreground">
                            {news.source} • {news.date}
                          </p>
                        </div>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100 mt-0.5" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xxs text-muted-foreground">
                    {isLoadingNews ? "最新ニュースを取得中..." : "直近の重大なニュース・開示情報はありません"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
          <AlertCircle className="mx-auto h-6 w-6 opacity-40" />
          <p className="mt-2 text-xs font-semibold">該当する銘柄が見つかりませんでした</p>
          <p className="text-xxs">4桁の銘柄コード（例: 7203）または正式な企業名を入力してください。</p>
        </div>
      )}
    </div>
  );
};
