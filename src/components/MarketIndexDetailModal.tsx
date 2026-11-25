import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MarketIndex } from "@/data/stockData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRO_INDICATOR_BY_NAME } from "@/lib/proMarketIndicators";
import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Newspaper,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type PeriodKey = "1D" | "1W" | "1M" | "3M" | "1Y";

interface DailyCandle {
  date: string;
  close: number;
  high?: number;
  low?: number;
}

interface RelatedNewsItem {
  title: string;
  link: string;
  source: string;
  pubDateLabel: string;
}

const DAILY_CACHE_TTL_MS = 5 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;

const dailyCandleCache = new Map<string, { fetchedAt: number; candles: DailyCandle[] }>();
const relatedNewsCache = new Map<string, { fetchedAt: number; items: RelatedNewsItem[] }>();

const formatNumberByDef = (value: number, name: string) => {
  const def = PRO_INDICATOR_BY_NAME[name];
  const decimals = def?.decimals ?? (value >= 1000 ? 0 : 2);
  const unit = def?.unit ?? "";
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${unit}`;
};

const formatSignedPct = (pct: number | null) => {
  if (pct === null || !Number.isFinite(pct)) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
};

const formatRelativePubDate = (raw: string): string => {
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(new Date(ts));
};

const parseGoogleRssItems = (xmlText: string): RelatedNewsItem[] => {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const items = Array.from(doc.querySelectorAll("item"));
  const parsed: RelatedNewsItem[] = [];

  for (const item of items) {
    const rawTitle = item.querySelector("title")?.textContent?.trim() ?? "";
    const link = item.querySelector("link")?.textContent?.trim() ?? "";
    const sourceNode = item.querySelector("source")?.textContent?.trim() ?? "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() ?? "";
    if (!rawTitle || !link) continue;

    // Google Newsのタイトル末尾「 - メディア名」を分離
    const parts = rawTitle.split(" - ");
    const source = sourceNode || (parts.length > 1 ? parts[parts.length - 1] : "Google News");
    const cleanTitle = parts.length > 1 ? parts.slice(0, -1).join(" - ") : rawTitle;

    if (parsed.some((p) => p.title === cleanTitle)) continue;
    parsed.push({
      title: cleanTitle,
      link,
      source,
      pubDateLabel: formatRelativePubDate(pubDate),
    });
    if (parsed.length >= 4) break;
  }
  return parsed;
};

const computeSma = (closes: number[], period: number): number | null => {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return sum / period;
};

const PeriodSparklineSvg = ({
  name,
  points,
  baseline,
  currentValue,
  startDateLabel,
  endDateLabel,
}: {
  name: string;
  points: number[];
  baseline: number;
  currentValue: number;
  startDateLabel?: string;
  endDateLabel?: string;
}) => {
  const safePoints = points.length >= 2 ? points : [baseline || currentValue || 1, currentValue || 1];
  const lastVal = safePoints[safePoints.length - 1];
  const isUp = lastVal > baseline;
  const isDown = lastVal < baseline;

  const high = Math.max(...safePoints, baseline);
  const low = Math.min(...safePoints, baseline);
  const pad = (high - low) * 0.1 || Math.abs(lastVal) * 0.005 || 1;
  const minY = low - pad;
  const maxY = high + pad;
  const rangeY = maxY - minY || 1;

  const w = 320;
  const h = 92;
  const toY = (val: number) => h - ((val - minY) / rangeY) * (h - 8) - 4;
  const baselineY = toY(baseline);

  const coords = safePoints.map((val, idx) => ({
    x: (idx / Math.max(1, safePoints.length - 1)) * w,
    y: toY(val),
  }));
  const linePath = coords.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w},${baselineY.toFixed(1)} L0,${baselineY.toFixed(1)} Z`;

  const strokeColor = isUp ? "#dc2626" : isDown ? "#2563eb" : "#64748b";
  const areaFill = isUp
    ? "rgba(220, 38, 38, 0.14)"
    : isDown
    ? "rgba(37, 99, 235, 0.14)"
    : "rgba(100, 116, 139, 0.12)";

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <div className="relative h-[92px] min-w-0 flex-1 overflow-hidden rounded border border-border/60 bg-background">
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
            <line x1={0} y1={h * 0.25} x2={w} y2={h * 0.25} stroke="rgba(148,163,184,0.2)" strokeWidth="0.7" />
            <line x1={0} y1={h * 0.5} x2={w} y2={h * 0.5} stroke="rgba(148,163,184,0.2)" strokeWidth="0.7" />
            <line x1={0} y1={h * 0.75} x2={w} y2={h * 0.75} stroke="rgba(148,163,184,0.2)" strokeWidth="0.7" />
            <path d={areaPath} fill={areaFill} />
            <line
              x1={0}
              y1={baselineY}
              x2={w}
              y2={baselineY}
              stroke={strokeColor}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.75"
            />
            <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx={w} cy={coords[coords.length - 1].y} r="2.6" fill={strokeColor} />
          </svg>
        </div>
        <div className="flex shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[10px] leading-none tabular-nums">
          <span className="rounded bg-red-50/90 px-1 py-0.5 font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            高 {formatNumberByDef(high, name)}
          </span>
          <span className="font-bold text-foreground/85">{formatNumberByDef(lastVal, name)}</span>
          <span className="rounded bg-blue-50/90 px-1 py-0.5 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            安 {formatNumberByDef(low, name)}
          </span>
        </div>
      </div>
      {(startDateLabel || endDateLabel) && (
        <div className="mt-1 flex items-center justify-between pr-16 font-mono text-[10px] text-muted-foreground">
          <span>{startDateLabel ?? ""}</span>
          <span>{endDateLabel ?? ""}</span>
        </div>
      )}
    </div>
  );
};

export interface MarketIndexDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailIndex: MarketIndex | null;
  intradayPoints?: number[];
  focusTags: string[];
  marketBrief: string;
  driverText: string;
  moveLabel: string;
  driverPanelClass: string;
  urgentMove: boolean;
  isAfterHours: boolean;
}

const MarketIndexDetailModal = ({
  open,
  onOpenChange,
  detailIndex,
  intradayPoints,
  focusTags,
  marketBrief,
  driverText,
  moveLabel,
  driverPanelClass,
  urgentMove,
  isAfterHours,
}: MarketIndexDetailModalProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("1M");
  const [dailyCandles, setDailyCandles] = useState<DailyCandle[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [relatedNews, setRelatedNews] = useState<RelatedNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const def = detailIndex ? PRO_INDICATOR_BY_NAME[detailIndex.name] : undefined;

  useEffect(() => {
    if (!open || !detailIndex || !def) return;
    setSelectedPeriod("1M");

    const controller = new AbortController();

    // 1. 1年分の日足データ取得（期間パフォーマンス・52週レンジ・移動平均線）
    const cachedDaily = dailyCandleCache.get(def.chartSymbol);
    if (cachedDaily && Date.now() - cachedDaily.fetchedAt < DAILY_CACHE_TTL_MS) {
      setDailyCandles(cachedDaily.candles);
      setDailyLoading(false);
    } else {
      setDailyCandles([]);
      setDailyLoading(true);
      fetch(`/api/stock-chart?symbol=${encodeURIComponent(def.chartSymbol)}&range=1y&interval=1d`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const raw = Array.isArray(data?.candles) ? data.candles : [];
          const normalized: DailyCandle[] = raw
            .filter(
              (c: { close?: number; date?: string }) =>
                typeof c?.close === "number" && Number.isFinite(c.close) && c.close > 0
            )
            .map((c: { date?: string; close: number; high?: number; low?: number }) => ({
              date: typeof c.date === "string" ? c.date.slice(0, 10) : "",
              close: c.close,
              high: typeof c.high === "number" && Number.isFinite(c.high) ? c.high : c.close,
              low: typeof c.low === "number" && Number.isFinite(c.low) ? c.low : c.close,
            }));
          if (normalized.length >= 2) {
            dailyCandleCache.set(def.chartSymbol, { fetchedAt: Date.now(), candles: normalized });
            setDailyCandles(normalized);
          }
        })
        .catch(() => {
          // ignore abort / transient network error
        })
        .finally(() => {
          if (!controller.signal.aborted) setDailyLoading(false);
        });
    }

    // 2. 関連ニュース取得
    const query = def.newsQuery ?? `${detailIndex.name} 相場 when:3d`;
    const cachedNews = relatedNewsCache.get(query);
    if (cachedNews && Date.now() - cachedNews.fetchedAt < NEWS_CACHE_TTL_MS) {
      setRelatedNews(cachedNews.items);
      setNewsLoading(false);
    } else {
      setRelatedNews([]);
      setNewsLoading(true);
      const params = new URLSearchParams({
        source: "google",
        q: query,
        hl: "ja",
        gl: "JP",
        ceid: "JP:ja",
      });
      fetch(`/api/news-feeds?${params.toString()}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.text() : ""))
        .then((xml) => {
          if (!xml) return;
          const items = parseGoogleRssItems(xml);
          relatedNewsCache.set(query, { fetchedAt: Date.now(), items });
          setRelatedNews(items);
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          if (!controller.signal.aborted) setNewsLoading(false);
        });
    }

    return () => controller.abort();
  }, [open, detailIndex?.name, def]);

  const hasFutures = typeof detailIndex?.futuresValue === "number";
  const mainValue = detailIndex
    ? hasFutures
      ? detailIndex.futuresValue!
      : detailIndex.value
    : 0;
  const mainChange = detailIndex
    ? hasFutures
      ? (detailIndex.futuresChange ?? 0)
      : detailIndex.change
    : 0;
  const mainChangePercent = detailIndex
    ? hasFutures
      ? (detailIndex.futuresChangePercent ?? 0)
      : detailIndex.changePercent
    : 0;
  const prevClose = mainValue - mainChange;
  const isUp = mainChange > 0;
  const isDown = mainChange < 0;

  // 期間別パフォーマンス & テクニカル計算
  const analytics = useMemo(() => {
    if (!dailyCandles.length || !mainValue) {
      return null;
    }

    const closes = dailyCandles.map((c) => c.close);
    const latestPrice = mainValue > 0 ? mainValue : closes[closes.length - 1];

    const calcReturnByOffset = (tradingDaysBack: number): number | null => {
      if (closes.length <= tradingDaysBack) return null;
      const base = closes[closes.length - 1 - tradingDaysBack];
      return base > 0 ? ((latestPrice - base) / base) * 100 : null;
    };

    const currentYear = new Date().getFullYear().toString();
    const ytdBaseCandle =
      dailyCandles.find((c) => c.date.startsWith(currentYear)) ?? dailyCandles[0];
    const ytdReturn =
      ytdBaseCandle && ytdBaseCandle.close > 0
        ? ((latestPrice - ytdBaseCandle.close) / ytdBaseCandle.close) * 100
        : null;

    const oneYearBase = closes[0];
    const oneYearReturn = oneYearBase > 0 ? ((latestPrice - oneYearBase) / oneYearBase) * 100 : null;

    const high52w = Math.max(...dailyCandles.map((c) => c.high ?? c.close), latestPrice);
    const low52w = Math.min(...dailyCandles.map((c) => c.low ?? c.close), latestPrice);
    const range52w = high52w - low52w;
    const positionPct52w = range52w > 0 ? Math.min(100, Math.max(0, ((latestPrice - low52w) / range52w) * 100)) : 50;
    const fromHighPct = high52w > 0 ? ((latestPrice - high52w) / high52w) * 100 : 0;

    const sma25 = computeSma(closes, 25);
    const sma75 = computeSma(closes, 75);
    const sma200 = computeSma(closes, 200);

    return {
      returns: {
        "1D": mainChangePercent,
        "1W": calcReturnByOffset(5),
        "1M": calcReturnByOffset(21),
        "3M": calcReturnByOffset(63),
        YTD: ytdReturn,
        "1Y": oneYearReturn,
      },
      high52w,
      low52w,
      positionPct52w,
      fromHighPct,
      smas: [
        { label: "25日線", value: sma25, diffPct: sma25 ? ((latestPrice - sma25) / sma25) * 100 : null },
        { label: "75日線", value: sma75, diffPct: sma75 ? ((latestPrice - sma75) / sma75) * 100 : null },
        { label: "200日線", value: sma200, diffPct: sma200 ? ((latestPrice - sma200) / sma200) * 100 : null },
      ],
    };
  }, [dailyCandles, mainChangePercent, mainValue]);

  // 選択中期間のチャート系列
  const chartSeries = useMemo(() => {
    if (selectedPeriod === "1D") {
      const pts = intradayPoints && intradayPoints.length >= 2 ? intradayPoints : [prevClose || mainValue, mainValue];
      return {
        points: pts,
        baseline: prevClose || pts[0],
        startDateLabel: "前日終値基準",
        endDateLabel: "現在値",
      };
    }

    const sliceCount =
      selectedPeriod === "1W" ? 6 : selectedPeriod === "1M" ? 22 : selectedPeriod === "3M" ? 65 : dailyCandles.length;
    const sliced = dailyCandles.slice(-sliceCount);
    if (sliced.length < 2) {
      const pts = intradayPoints && intradayPoints.length >= 2 ? intradayPoints : [prevClose || mainValue, mainValue];
      return {
        points: pts,
        baseline: prevClose || pts[0],
        startDateLabel: "",
        endDateLabel: "",
      };
    }

    const pts = sliced.map((c) => c.close);
    if (mainValue > 0) {
      pts[pts.length - 1] = mainValue;
    }

    return {
      points: pts,
      baseline: pts[0],
      startDateLabel: sliced[0].date,
      endDateLabel: sliced[sliced.length - 1].date,
    };
  }, [dailyCandles, intradayPoints, mainValue, prevClose, selectedPeriod]);

  if (!detailIndex) return null;

  const futuresGap =
    hasFutures && detailIndex.value > 0
      ? {
          diff: detailIndex.futuresValue! - detailIndex.value,
          pct: ((detailIndex.futuresValue! - detailIndex.value) / detailIndex.value) * 100,
        }
      : null;

  const relatedStocks = def?.relatedJpStocks ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[95vw] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border bg-table-header-bg px-4 py-3 pr-10 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-foreground">
            <span aria-hidden="true">{def?.flag ?? "📊"}</span>
            <span>{detailIndex.name}</span>
            {hasFutures ? (
              <span className="whitespace-nowrap rounded border border-red-600 bg-white px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                LIVE 先物
              </span>
            ) : isAfterHours ? (
              <span className="whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                時間外
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-xxs text-muted-foreground">
            期間推移・テクニカル節目・連動日本株・関連ニュースをまとめて確認できます
          </DialogDescription>
        </DialogHeader>

        <div className="always-scrollbar min-h-0 flex-1 space-y-3 px-4 py-3 text-xs">
          {/* 1. 現在値・前日比・先物ギャップ ＋ 期間切替チャート */}
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xl font-black tabular-nums text-foreground">
                  {mainValue > 0 ? formatNumberByDef(mainValue, detailIndex.name) : "取得中..."}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-extrabold tabular-nums ${
                    isUp
                      ? "bg-stock-up-bg text-stock-up"
                      : isDown
                      ? "bg-stock-down-bg text-stock-down"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isUp ? "▲+" : isDown ? "▼" : ""}
                  {mainChange.toLocaleString(undefined, {
                    minimumFractionDigits: Math.abs(mainChange) >= 100 ? 0 : 2,
                    maximumFractionDigits: Math.abs(mainChange) >= 100 ? 0 : 2,
                  })}{" "}
                  ({mainChangePercent >= 0 ? "+" : ""}
                  {mainChangePercent.toFixed(2)}%)
                </span>
              </div>

              {/* 期間切替タブ */}
              <div className="ml-auto inline-flex items-center rounded border border-border bg-background p-0.5 text-[10px] font-bold">
                {(["1D", "1W", "1M", "3M", "1Y"] as PeriodKey[]).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedPeriod(period)}
                    className={`whitespace-nowrap rounded px-2 py-0.5 transition-colors ${
                      selectedPeriod === period
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {hasFutures && futuresGap && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xxs text-muted-foreground">
                <span>
                  現物終値:{" "}
                  <strong className="tabular-nums text-foreground">
                    {formatNumberByDef(detailIndex.value, detailIndex.name)}
                  </strong>{" "}
                  <span
                    className={
                      detailIndex.changePercent >= 0 ? "font-bold text-stock-up" : "font-bold text-stock-down"
                    }
                  >
                    ({detailIndex.changePercent >= 0 ? "+" : ""}
                    {detailIndex.changePercent.toFixed(2)}%)
                  </span>
                </span>
                <span>
                  現物比ギャップ:{" "}
                  <strong
                    className={`tabular-nums ${
                      futuresGap.diff >= 0 ? "text-stock-up" : "text-stock-down"
                    }`}
                  >
                    {futuresGap.diff >= 0 ? "+" : ""}
                    {futuresGap.diff.toLocaleString(undefined, { maximumFractionDigits: 1 })} (
                    {futuresGap.pct >= 0 ? "+" : ""}
                    {futuresGap.pct.toFixed(2)}%)
                  </strong>
                </span>
              </div>
            )}

            <div className="mt-2.5">
              <PeriodSparklineSvg
                name={detailIndex.name}
                points={chartSeries.points}
                baseline={chartSeries.baseline}
                currentValue={mainValue || 1}
                startDateLabel={chartSeries.startDateLabel}
                endDateLabel={chartSeries.endDateLabel}
              />
            </div>

            {/* 期間別騰落率サマリー */}
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {(
                [
                  { key: "1D", label: "前日比" },
                  { key: "1W", label: "1週間" },
                  { key: "1M", label: "1ヶ月" },
                  { key: "3M", label: "3ヶ月" },
                  { key: "YTD", label: "年初来" },
                  { key: "1Y", label: "1年" },
                ] as const
              ).map(({ key, label }) => {
                const val =
                  key === "1D"
                    ? mainChangePercent
                    : analytics?.returns[key] ?? null;
                const up = val !== null && val > 0;
                const down = val !== null && val < 0;
                return (
                  <div
                    key={key}
                    className="rounded border border-border/70 bg-background px-2 py-1.5 text-center"
                  >
                    <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
                    <div
                      className={`mt-0.5 text-xxs font-extrabold tabular-nums ${
                        up ? "text-stock-up" : down ? "text-stock-down" : "text-muted-foreground"
                      }`}
                    >
                      {dailyLoading && key !== "1D" ? "…" : formatSignedPct(val)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. テクニカル節目（52週レンジバー & 移動平均線） */}
          <div className="rounded-md border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xxs font-extrabold text-foreground">テクニカル節目（52週レンジ・移動平均線）</span>
              {analytics && (
                <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                  52週高値比 {analytics.fromHighPct.toFixed(1)}%
                </span>
              )}
            </div>

            {analytics ? (
              <div className="space-y-2.5">
                {/* 52週レンジバー */}
                <div>
                  <div className="mb-1 flex items-center justify-between font-mono text-[10px] tabular-nums">
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      52週安値 {formatNumberByDef(analytics.low52w, detailIndex.name)}
                    </span>
                    <span className="font-bold text-red-700 dark:text-red-300">
                      52週高値 {formatNumberByDef(analytics.high52w, detailIndex.name)}
                    </span>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-blue-200 via-muted to-red-200 dark:from-blue-950 dark:via-muted dark:to-red-950">
                    <div
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
                      style={{ left: `${analytics.positionPct52w}%` }}
                      title={`現在位置: ${analytics.positionPct52w.toFixed(0)}%`}
                    />
                  </div>
                </div>

                {/* 移動平均線 25/75/200日 */}
                <div className="grid grid-cols-3 gap-1.5">
                  {analytics.smas.map((sma) => {
                    const above = sma.diffPct !== null && sma.diffPct >= 0;
                    return (
                      <div
                        key={sma.label}
                        className="rounded border border-border/70 bg-muted/20 px-2 py-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{sma.label}</span>
                          {sma.diffPct !== null && (
                            <span
                              className={`text-[10px] font-extrabold tabular-nums ${
                                above ? "text-stock-up" : "text-stock-down"
                              }`}
                            >
                              {above ? "+" : ""}
                              {sma.diffPct.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-xxs font-bold tabular-nums text-foreground">
                          {sma.value ? formatNumberByDef(sma.value, detailIndex.name) : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-2 text-xxs text-muted-foreground">
                {dailyLoading ? "テクニカルデータを取得中..." : "日足データを取得できませんでした"}
              </div>
            )}
          </div>

          {/* 3. 連動しやすい日本株・セクター導線 */}
          {relatedStocks.length > 0 && (
            <div className="rounded-md border border-border bg-background p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xxs font-extrabold text-foreground">
                  この指標が動いたら見るべき日本株
                </span>
                {def?.relatedScreeningIndex && (
                  <Link
                    to={`/market?index=${def.relatedScreeningIndex}`}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-muted"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    スクリーニングで見る
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {relatedStocks.map((stock) => (
                  <Link
                    key={stock.code}
                    to={`/chart?q=${encodeURIComponent(stock.code)}`}
                    onClick={() => onOpenChange(false)}
                    className="group flex items-center justify-between gap-2 rounded border border-border/80 bg-muted/20 px-2.5 py-1.5 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-primary">{stock.code}</span>
                        <span className="truncate text-xs font-bold text-foreground group-hover:text-primary">
                          {stock.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        {stock.tone === "tailwind" ? (
                          <TrendingUp className="h-2.5 w-2.5 text-stock-up" />
                        ) : stock.tone === "headwind" ? (
                          <TrendingDown className="h-2.5 w-2.5 text-stock-down" />
                        ) : null}
                        <span>{stock.relation}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 4. 関連ニュース（クリック可能な最新ヘッドライン） */}
          <div className="rounded-md border border-border bg-background p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xxs font-extrabold text-foreground">
              <Newspaper className="h-3.5 w-3.5 text-primary" />
              <span>関連ニュース（最新）</span>
            </div>
            {newsLoading ? (
              <div className="py-2 text-xxs text-muted-foreground">関連ニュースを取得中...</div>
            ) : relatedNews.length > 0 ? (
              <ul className="divide-y divide-border/60">
                {relatedNews.map((item) => (
                  <li key={item.link} className="py-1.5 first:pt-0 last:pb-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-2 text-xs leading-snug text-foreground hover:text-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 font-semibold group-hover:underline">{item.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{item.source}</span>
                          {item.pubDateLabel && <span>{item.pubDateLabel}</span>}
                        </div>
                      </div>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-1 text-xxs text-muted-foreground">
                現在表示できる関連ニュースはありません。
              </div>
            )}
          </div>

          {/* 5. 注目キーワード & 地合い解説 & 最新材料 */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xxs font-bold text-muted-foreground">注目ポイント:</span>
              {focusTags.map((tag) => (
                <span
                  key={tag}
                  className="whitespace-nowrap rounded border border-border bg-muted/50 px-2 py-0.5 text-xxs font-bold text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="rounded-md border border-border bg-background p-3">
              <div className="mb-1 text-xxs font-extrabold text-foreground">地合い・見方のポイント</div>
              <p className="text-xs leading-relaxed text-foreground/90">{marketBrief}</p>
            </div>

            {driverText && (
              <div className={`rounded-md border p-3 ${driverPanelClass}`}>
                <div className="mb-1 flex items-center gap-1 text-xxs font-extrabold text-foreground">
                  {urgentMove && <AlertTriangle className="h-3 w-3 text-amber-500" aria-hidden="true" />}
                  <span>{moveLabel}（最新材料）</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">{driverText}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end border-t border-border bg-muted/20 px-4 py-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="shrink-0 whitespace-nowrap rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            閉じる
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketIndexDetailModal;
