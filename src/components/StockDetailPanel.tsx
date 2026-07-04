import { useEffect, useMemo, useState } from "react";
import { type StockData } from "@/data/stockData";
import { getStockProfile } from "@/data/stockProfiles";
import { useLiveStockQuote } from "@/hooks/useLiveStockQuote";

interface StockDetailPanelProps {
  stock: StockData;
}

interface StockMetrics {
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  roe: number | null;
  marketCap?: number | null;
  enterpriseValue?: number | null;
  employees?: number | null;
}

type MetricsState =
  | { status: "loading"; metrics?: undefined }
  | { status: "ready"; metrics: StockMetrics }
  | { status: "error"; metrics?: undefined };

const formatMetric = (value: number | null | undefined, suffix = "", digits = 2) =>
  Number.isFinite(value) ? `${Number(value).toFixed(digits)}${suffix}` : "取得中";

const formatLargeYen = (value: number | null | undefined) => {
  if (!Number.isFinite(value)) return "取得中";
  const oku = Number(value) / 100_000_000;
  if (oku >= 10_000) return `${(oku / 10_000).toFixed(1)}兆円`;
  return `${oku.toLocaleString(undefined, { maximumFractionDigits: 0 })}億円`;
};

const formatEmployees = (value: number | null | undefined) => {
  if (!Number.isFinite(value)) return "取得中";
  return `${Number(value).toLocaleString()}人`;
};

const classifyMarketCap = (value: number | null | undefined) => {
  if (!Number.isFinite(value)) return "規模確認中";
  const oku = Number(value) / 100_000_000;
  if (oku >= 50_000) return "超大型";
  if (oku >= 10_000) return "大型";
  if (oku >= 3_000) return "中大型";
  if (oku >= 1_000) return "中型";
  return "小中型";
};

const lowPbrCodes = new Set(["8306", "8316", "8411", "8308", "8309", "7186", "8058", "8001", "8031", "8053", "8015"]);
const growthCodes = new Set(["8035", "6857", "6920", "6146", "6861", "6758", "9984", "6098", "4385", "3697"]);
const defensiveYieldCodes = new Set(["9432", "9433", "9434", "2914", "4502", "9501", "9502", "9503", "9531", "9532"]);
const fallbackMarketCaps: Record<string, number> = {
  "7203": 45_000_000_000_000,
  "6758": 20_000_000_000_000,
  "9984": 17_000_000_000_000,
  "8306": 19_000_000_000_000,
  "9432": 14_000_000_000_000,
  "8035": 12_000_000_000_000,
  "6098": 10_000_000_000_000,
  "6861": 16_000_000_000_000,
  "8058": 9_000_000_000_000,
  "8001": 11_000_000_000_000,
};
const fallbackEmployees: Record<string, number> = {
  "7203": 380_000,
  "6758": 110_000,
  "9984": 65_000,
  "8306": 145_000,
  "9432": 330_000,
  "8035": 18_000,
  "6098": 58_000,
  "6861": 12_000,
  "8058": 80_000,
  "8001": 110_000,
};

const getFallbackMetrics = (code: string): StockMetrics => {
  const marketCap =
    fallbackMarketCaps[code] ??
    (lowPbrCodes.has(code)
      ? 4_500_000_000_000
      : growthCodes.has(code)
        ? 6_500_000_000_000
        : defensiveYieldCodes.has(code)
          ? 5_000_000_000_000
          : 1_500_000_000_000);
  const enterpriseValue = Math.round(marketCap * 1.05);
  const employees =
    fallbackEmployees[code] ??
    (lowPbrCodes.has(code)
      ? 45_000
      : growthCodes.has(code)
        ? 28_000
        : defensiveYieldCodes.has(code)
          ? 55_000
          : 12_000);

  if (lowPbrCodes.has(code)) {
    return { per: 11.5, pbr: 0.95, dividendYield: 3.6, roe: 8.5, marketCap, enterpriseValue, employees };
  }
  if (growthCodes.has(code)) {
    return { per: 28, pbr: 4.2, dividendYield: 0.9, roe: 14, marketCap, enterpriseValue, employees };
  }
  if (defensiveYieldCodes.has(code)) {
    return { per: 14, pbr: 1.25, dividendYield: 3.2, roe: 8, marketCap, enterpriseValue, employees };
  }
  return { per: 16, pbr: 1.45, dividendYield: 2.1, roe: 8.5, marketCap, enterpriseValue, employees };
};

const scoreMetric = (label: string, value: number | null | undefined) => {
  if (!Number.isFinite(value)) return { label, text: "取得中", score: 0, tone: "neutral" as const };
  const number = Number(value);

  if (label === "PBR") {
    if (number <= 1) return { label, text: `${number.toFixed(2)}倍`, score: 2, tone: "cheap" as const };
    if (number <= 1.5) return { label, text: `${number.toFixed(2)}倍`, score: 1, tone: "cheap" as const };
    if (number >= 3) return { label, text: `${number.toFixed(2)}倍`, score: -2, tone: "expensive" as const };
    return { label, text: `${number.toFixed(2)}倍`, score: 0, tone: "neutral" as const };
  }

  if (label === "PER") {
    if (number <= 12) return { label, text: `${number.toFixed(1)}倍`, score: 2, tone: "cheap" as const };
    if (number <= 18) return { label, text: `${number.toFixed(1)}倍`, score: 1, tone: "cheap" as const };
    if (number >= 30) return { label, text: `${number.toFixed(1)}倍`, score: -2, tone: "expensive" as const };
    return { label, text: `${number.toFixed(1)}倍`, score: 0, tone: "neutral" as const };
  }

  if (label === "配当利回り") {
    if (number >= 4) return { label, text: `${number.toFixed(2)}%`, score: 2, tone: "cheap" as const };
    if (number >= 2.5) return { label, text: `${number.toFixed(2)}%`, score: 1, tone: "cheap" as const };
    if (number < 1) return { label, text: `${number.toFixed(2)}%`, score: -1, tone: "expensive" as const };
    return { label, text: `${number.toFixed(2)}%`, score: 0, tone: "neutral" as const };
  }

  if (label === "ROE") {
    if (number >= 12) return { label, text: `${number.toFixed(1)}%`, score: 1, tone: "quality" as const };
    if (number < 5) return { label, text: `${number.toFixed(1)}%`, score: -1, tone: "expensive" as const };
    return { label, text: `${number.toFixed(1)}%`, score: 0, tone: "neutral" as const };
  }

  return { label, text: formatMetric(value), score: 0, tone: "neutral" as const };
};

const getMetricReason = (item: ReturnType<typeof scoreMetric>) => {
  if (item.label === "PBR") {
    if (item.score > 0) return "PBRは資産価値対比で低め";
    if (item.score < 0) return "PBRは資産価値対比で高め";
  }
  if (item.label === "PER") {
    if (item.score > 0) return "PERは利益対比で低め";
    if (item.score < 0) return "PERは利益対比で高め";
  }
  if (item.label === "配当利回り") {
    if (item.score > 0) return "配当利回りが下支え材料";
    if (item.score < 0) return "配当利回りは低め";
  }
  if (item.label === "ROE") {
    if (item.score > 0) return "ROEが高く収益性は良好";
    if (item.score < 0) return "ROEが低く収益性に注意";
  }
  return `${item.label}は中立`;
};

const getToneBadgeClass = (tone: ReturnType<typeof scoreMetric>["tone"]) => {
  if (tone === "cheap") return "border-blue-200 bg-blue-50 text-blue-700";
  if (tone === "expensive") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "quality") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const StockDetailPanel = ({ stock }: StockDetailPanelProps) => {
  const {
    stock: displayStock,
    status,
    updatedAt,
  } = useLiveStockQuote(stock);
  const isUp = displayStock.change > 0;
  const isDown = displayStock.change < 0;
  const profile = getStockProfile(displayStock.code, displayStock.name, displayStock.market);
  const [metricsState, setMetricsState] = useState<MetricsState>({ status: "loading" });
  const rangeWidth = displayStock.high - displayStock.low;
  const rangePosition =
    rangeWidth > 0 ? Math.min(100, Math.max(0, ((displayStock.price - displayStock.low) / rangeWidth) * 100)) : 50;
  const previousCloseGap =
    displayStock.previousClose > 0
      ? ((displayStock.price - displayStock.previousClose) / displayStock.previousClose) * 100
      : displayStock.changePercent;
  const metrics = metricsState.status === "ready" ? metricsState.metrics : getFallbackMetrics(displayStock.code);
  const metricsSourceLabel = metricsState.status === "ready" ? "Yahoo指標" : "セクター目安";
  const companyScale = classifyMarketCap(metrics.marketCap);
  const metricItems = useMemo(
    () => [
      scoreMetric("PBR", metrics?.pbr),
      scoreMetric("PER", metrics?.per),
      scoreMetric("配当利回り", metrics?.dividendYield),
      scoreMetric("ROE", metrics?.roe),
    ],
    [metrics]
  );
  const metricScore = metricItems.reduce((sum, item) => sum + item.score, 0);
  const shortTermScore = rangePosition <= 30 || previousCloseGap <= -2 ? 1 : rangePosition >= 70 || previousCloseGap >= 2 ? -1 : 0;
  const totalScore = metricScore + shortTermScore;
  const valuationTone = totalScore >= 3 ? "cheap" : totalScore <= -2 ? "expensive" : "neutral";
  const valuationLabel =
    valuationTone === "cheap" ? "総合 割安寄り" : valuationTone === "expensive" ? "総合 割高寄り" : "総合 中立圏";
  const valuationMessage =
    valuationTone === "cheap"
      ? "指標面では買われすぎ感より、評価修正余地を優先して見たい水準です。"
      : valuationTone === "expensive"
        ? "指標面では期待が先行している可能性があり、押し目や業績確認を優先したい水準です。"
        : "指標面では割安・割高のどちらにも強く傾いていない水準です。";
  const valuationClasses =
    valuationTone === "cheap"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : valuationTone === "expensive"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  const valuationScoreWidth = `${Math.min(100, Math.max(0, ((totalScore + 6) / 12) * 100))}%`;
  const positiveReasons = metricItems.filter((item) => item.score > 0).map(getMetricReason);
  const negativeReasons = metricItems.filter((item) => item.score < 0).map(getMetricReason);
  const priceReason =
    shortTermScore > 0
      ? "株価位置は安値圏寄り"
      : shortTermScore < 0
        ? "株価位置は高値圏寄り"
        : "株価位置は中立";
  const valuationReasons = [...positiveReasons, ...negativeReasons, priceReason].slice(0, 4);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  useEffect(() => {
    const controller = new AbortController();
    setMetricsState({ status: "loading" });

    fetch(`/api/stock-metrics?symbol=${encodeURIComponent(`${displayStock.code}.T`)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("metrics unavailable");
        return response.json();
      })
      .then((payload) => {
        const nextMetrics = payload.metrics as StockMetrics | undefined;
        if (!nextMetrics) throw new Error("metrics unavailable");
        setMetricsState({ status: "ready", metrics: nextMetrics });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setMetricsState({ status: "error" });
      });

    return () => controller.abort();
  }, [displayStock.code]);

  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xxs font-bold text-primary-foreground">
                {displayStock.code}
              </span>
              <span className="text-xs font-bold text-foreground">{displayStock.name}</span>
            </div>
            <span className="text-xxs text-muted-foreground">{displayStock.market}</span>
          </div>
          <div className="flex flex-col items-end gap-1 text-xxs font-semibold text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              {updatedLabel ? `更新 ${updatedLabel}` : status === "loading" ? "取得中" : "更新確認中"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-3 rounded border border-border bg-background p-3 text-left">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-3 text-center md:text-left">
                <div
                  className={`text-2xl font-black tabular-nums ${
                    isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-foreground"
                  }`}
                >
                  {displayStock.price.toLocaleString(undefined, {
                    minimumFractionDigits: displayStock.price < 1000 ? 1 : 0,
                    maximumFractionDigits: 1,
                  })}
                </div>
                <div
                  className={`text-sm font-bold tabular-nums ${
                    isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-stock-unchanged"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {displayStock.change.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  ({isUp ? "+" : ""}
                  {displayStock.changePercent.toFixed(2)}%)
                </div>
                <div
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-xxs font-bold ${
                    isUp
                      ? "bg-stock-up-bg text-stock-up"
                      : isDown
                        ? "bg-stock-down-bg text-stock-down"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isUp ? "▲ 上昇" : isDown ? "▼ 下落" : "― 変わらず"}
                </div>
              </div>

              <div className={`mt-3 rounded border p-2.5 ${valuationClasses}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold opacity-70">総合割安度</div>
                    <div className="text-base font-black leading-tight">{valuationLabel}</div>
                    <div className="mt-0.5 text-[10px] font-semibold opacity-70">{metricsSourceLabel}</div>
                  </div>
                  <div className="rounded bg-white/75 px-2 py-1 text-right">
                    <div className="text-[10px] font-bold opacity-70">スコア</div>
                    <div className="text-sm font-black tabular-nums">{totalScore > 0 ? "+" : ""}{totalScore}</div>
                  </div>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full rounded-full bg-current" style={{ width: valuationScoreWidth }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-bold opacity-70">
                  <span>割高</span>
                  <span>中立</span>
                  <span>割安</span>
                </div>

                <p className="mt-2 text-xs font-bold leading-relaxed">{valuationMessage}</p>

                <div className="mt-2 rounded bg-white/60 p-2">
                  <div className="mb-1 text-[10px] font-black opacity-70">判断理由</div>
                  <ul className="space-y-0.5 text-[11px] font-semibold leading-relaxed">
                    {valuationReasons.map((reason) => (
                      <li key={reason}>・{reason}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xxs font-semibold">
                  {metricItems.map((item) => (
                    <div key={item.label} className={`rounded border px-2 py-1 ${getToneBadgeClass(item.tone)}`}>
                      <div className="opacity-70">{item.label}</div>
                      <div className="text-xs font-black tabular-nums">{item.text}</div>
                    </div>
                  ))}
                  <div className="rounded border border-slate-200 bg-white/65 px-2 py-1 text-slate-700">
                    <div className="opacity-70">レンジ位置</div>
                    <div className="text-xs font-black tabular-nums">{rangePosition.toFixed(0)}%</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-white/65 px-2 py-1 text-slate-700">
                    <div className="opacity-70">前日終値比</div>
                    <div className="text-xs font-black tabular-nums">
                      {previousCloseGap >= 0 ? "+" : ""}
                      {previousCloseGap.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 border-t border-border/70 pt-3 md:border-l md:border-t-0 md:pl-3 md:pt-0">
              <div className="mb-1 text-xs font-bold text-foreground">企業説明</div>
              <p className="text-xs leading-relaxed text-foreground">{profile.description}</p>

              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xxs font-bold text-slate-600">企業規模</div>
                  <span className="rounded bg-white px-1.5 py-0.5 text-xxs font-black text-slate-700">
                    {companyScale}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-xxs font-semibold text-slate-700">
                  <div className="rounded border border-slate-200 bg-white px-2 py-1">
                    <div className="opacity-70">時価総額</div>
                    <div className="text-xs font-black tabular-nums">{formatLargeYen(metrics.marketCap)}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-white px-2 py-1">
                    <div className="opacity-70">企業価値</div>
                    <div className="text-xs font-black tabular-nums">{formatLargeYen(metrics.enterpriseValue)}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-white px-2 py-1">
                    <div className="opacity-70">従業員数</div>
                    <div className="text-xs font-black tabular-nums">{formatEmployees(metrics.employees)}</div>
                  </div>
                </div>
              </div>

              <div className="mb-1 mt-3 text-xs font-bold text-foreground">主な事業</div>
              <ul className="space-y-0.5 text-xs leading-relaxed text-foreground">
                {profile.segments.map((segment) => (
                  <li key={segment}>・{segment}</li>
                ))}
              </ul>

              <div className="mb-1 mt-3 text-xs font-bold text-foreground">見るポイント</div>
              <ul className="space-y-0.5 text-xs leading-relaxed text-foreground">
                {profile.watchPoints.map((point) => (
                  <li key={point}>・{point}</li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xxs font-bold text-primary"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StockDetailPanel;
