import { Activity, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fundamentalPicks, futureGrowthPicks, type CandleData, type FundamentalPick, type StockData } from "@/data/stockData";

interface ShikihoStyleAnalysisProps {
  stock: StockData;
  embedded?: boolean;
}

interface ChartSignal {
  close: number;
  sma20: number | null;
  sma200: number | null;
  volumeRatio: number | null;
  rsi14: number | null;
  macdHistogram: number | null;
  bollingerPosition: number | null;
  trendLabel: string;
  trendNote: string;
  checks: SignalCheck[];
}

type SignalTone = "positive" | "warning" | "neutral";

interface SignalCheck {
  label: string;
  value: string;
  tone: SignalTone;
  note: string;
}

const monitoredPicks = [...fundamentalPicks, ...futureGrowthPicks];

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const movingAverage = (data: CandleData[], period: number) => {
  if (data.length < period) return null;
  return average(data.slice(-period).map((item) => item.close));
};

const standardDeviation = (values: number[]) => {
  const mean = average(values);
  if (mean === null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};

const emaSeries = (values: number[], period: number) => {
  if (values.length < period) return [];

  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  let ema = average(values.slice(0, period));
  if (ema === null) return [];
  result.push(ema);

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
};

const calculateRsi = (closes: number[], period = 14) => {
  if (closes.length <= period) return null;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
};

const calculateMacdHistogram = (closes: number[]) => {
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  if (!ema12.length || !ema26.length) return null;

  const offset = ema12.length - ema26.length;
  const macd = ema26.map((value, index) => ema12[index + offset] - value);
  const signal = emaSeries(macd, 9);
  if (!signal.length) return null;

  return macd.at(-1)! - signal.at(-1)!;
};

const calculateBollingerPosition = (closes: number[], period = 20) => {
  if (closes.length < period) return null;

  const window = closes.slice(-period);
  const middle = average(window);
  const deviation = standardDeviation(window);
  if (middle === null || deviation === null) return null;
  if (!deviation) return 0.5;

  const lower = middle - deviation * 2;
  const upper = middle + deviation * 2;
  return (closes.at(-1)! - lower) / (upper - lower);
};

const formatSigned = (value: number, digits = 2) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

const buildChecks = (
  rsi14: number | null,
  macdHistogram: number | null,
  bollingerPosition: number | null,
  volumeRatio: number | null
): SignalCheck[] => [
  {
    label: "RSI",
    value: rsi14 === null ? "算出中" : rsi14.toFixed(1),
    tone: rsi14 === null ? "neutral" : rsi14 > 72 || rsi14 < 30 ? "warning" : rsi14 >= 45 && rsi14 <= 68 ? "positive" : "neutral",
    note:
      rsi14 === null
        ? "日足データ不足"
        : rsi14 > 72
          ? "短期過熱"
          : rsi14 < 30
            ? "売られ過ぎ"
            : rsi14 >= 45 && rsi14 <= 68
              ? "良好"
              : "中立",
  },
  {
    label: "MACD",
    value: macdHistogram === null ? "算出中" : formatSigned(macdHistogram),
    tone: macdHistogram === null ? "neutral" : macdHistogram > 0 ? "positive" : macdHistogram < 0 ? "warning" : "neutral",
    note:
      macdHistogram === null
        ? "日足データ不足"
        : macdHistogram > 0
          ? "買い優勢"
          : macdHistogram < 0
            ? "弱含み"
            : "横ばい",
  },
  {
    label: "BB",
    value: bollingerPosition === null ? "算出中" : `${Math.round(bollingerPosition * 100)}%`,
    tone:
      bollingerPosition === null
        ? "neutral"
        : bollingerPosition > 1 || bollingerPosition < 0.2
          ? "warning"
          : bollingerPosition >= 0.45 && bollingerPosition <= 0.9
            ? "positive"
            : "neutral",
    note:
      bollingerPosition === null
        ? "日足データ不足"
        : bollingerPosition > 1
          ? "上限超え"
          : bollingerPosition < 0.2
            ? "下限接近"
            : bollingerPosition >= 0.45 && bollingerPosition <= 0.9
              ? "上向き"
              : "中立",
  },
  {
    label: "出来高",
    value: volumeRatio === null ? "算出中" : `${volumeRatio.toFixed(2)}倍`,
    tone: volumeRatio === null ? "neutral" : volumeRatio >= 1.2 ? "positive" : volumeRatio <= 0.75 ? "warning" : "neutral",
    note:
      volumeRatio === null
        ? "20日平均待ち"
        : volumeRatio >= 1.2
          ? "増加"
          : volumeRatio <= 0.75
            ? "薄い"
            : "通常",
  },
];

const buildChartSignal = (candles: CandleData[]): ChartSignal | null => {
  const data = candles.filter((item) =>
    [item.open, item.high, item.low, item.close, item.volume].every(Number.isFinite)
  );
  const latest = data.at(-1);
  if (!latest) return null;

  const sma20 = movingAverage(data, 20);
  const sma200 = movingAverage(data, 200);
  const avgVolume20 = average(data.slice(-21, -1).map((item) => item.volume));
  const volumeRatio = avgVolume20 && avgVolume20 > 0 ? latest.volume / avgVolume20 : null;
  const closes = data.map((item) => item.close);
  const rsi14 = calculateRsi(closes);
  const macdHistogram = calculateMacdHistogram(closes);
  const bollingerPosition = calculateBollingerPosition(closes);
  const checks = buildChecks(rsi14, macdHistogram, bollingerPosition, volumeRatio);

  let trendLabel = "判定保留";
  let trendNote = "移動平均の計算に必要な日足データを確認中です。";

  if (sma20 && sma200) {
    if (latest.close > sma20 && sma20 > sma200 && (macdHistogram ?? 0) > 0) {
      trendLabel = "上昇基調";
      trendNote = "終値が20SMAを上回り、20SMAも200SMAを上回っています。MACDもプラス圏で買い優勢です。";
    } else if ((rsi14 ?? 50) > 72 || (bollingerPosition ?? 0.5) > 1) {
      trendLabel = "過熱注意";
      trendNote = "上昇基調はありますが、RSIやボリンジャーバンドでは短期過熱に注意したい状態です。";
    } else if (latest.close > sma200) {
      trendLabel = "中期線上";
      trendNote = "終値は200SMAを上回っています。RSI、MACD、出来高の改善が続くかを確認したい状態です。";
    } else {
      trendLabel = "回復待ち";
      trendNote = "終値が200SMAを下回っており、MACD陽転や出来高増を伴う回復を確認したい状態です。";
    }
  }

  return {
    close: latest.close,
    sma20,
    sma200,
    volumeRatio,
    rsi14,
    macdHistogram,
    bollingerPosition,
    trendLabel,
    trendNote,
    checks,
  };
};

const checkToneClass: Record<SignalTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-border bg-card text-foreground",
};

const findPick = (code: string): FundamentalPick | undefined =>
  monitoredPicks.find((pick) => pick.code === code);

const safeThemeItems = (pick?: FundamentalPick) =>
  (pick?.fundamentals ?? []).filter((item) =>
    /成長テーマ|収益ドライバー|注目指標|投資視点|強み/.test(item.label)
  );

const ShikihoStyleAnalysis = ({ stock, embedded = false }: ShikihoStyleAnalysisProps) => {
  const pick = useMemo(() => findPick(stock.code), [stock.code]);
  const themeItems = useMemo(() => safeThemeItems(pick), [pick]);
  const [signal, setSignal] = useState<ChartSignal | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "fallback">("loading");
  const hasTrendData = Boolean(signal?.sma20 || signal?.sma200 || signal?.trendNote);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    const loadSignal = async () => {
      try {
        const response = await fetch(
          `/api/stock-chart?symbol=${encodeURIComponent(`${stock.code}.T`)}&range=2y&interval=1d`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("chart unavailable");

        const payload = await response.json();
        const nextSignal = buildChartSignal(payload.candles ?? []);
        if (!nextSignal) throw new Error("signal unavailable");

        if (!isActive) return;
        setSignal(nextSignal);
        setStatus("live");
      } catch {
        if (!isActive) return;
        setSignal(null);
        setStatus("fallback");
      } finally {
        window.clearTimeout(timeout);
      }
    };

    loadSignal();
    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [stock.code]);

  return (
    <section className={`rounded border border-border ${embedded ? "h-full bg-background" : "bg-card"}`}>
      <div className={`grid grid-cols-1 gap-2 ${embedded ? "p-2" : "p-3 lg:grid-cols-3"}`}>
        {hasTrendData && (
          <div className={`rounded border border-border ${embedded ? "bg-card p-2" : "bg-background p-3"}`}>
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-bold text-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>トレンド判定</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                日足ベース
              </span>
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xxs font-bold text-foreground">
                {signal?.trendLabel}
              </span>
              {signal?.volumeRatio && (
                <span className="rounded bg-stock-up-bg px-1.5 py-0.5 text-xxs font-bold text-stock-up">
                  出来高 {signal.volumeRatio.toFixed(2)}倍
                </span>
              )}
            </div>
            {signal?.checks && (
              <div className="mb-2 grid grid-cols-2 gap-1.5">
                {signal.checks.map((check) => (
                  <div key={check.label} className={`rounded border px-2 py-1.5 ${checkToneClass[check.tone]}`}>
                    <div className="text-xxs font-semibold opacity-75">{check.label}</div>
                    <div className="text-xs font-black tabular-nums">{check.value}</div>
                    <div className="text-[10px] font-bold leading-tight opacity-80">{check.note}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {signal?.sma20 && (
                <div className="rounded bg-card px-2 py-1.5">
                  <div className="text-xxs text-muted-foreground">20SMA</div>
                  <div className="font-bold tabular-nums text-sky-600">
                    {signal.sma20.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </div>
                </div>
              )}
              {signal?.sma200 && (
                <div className="rounded bg-card px-2 py-1.5">
                  <div className="text-xxs text-muted-foreground">200SMA</div>
                  <div className="font-bold tabular-nums text-amber-600">
                    {signal.sma200.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </div>
                </div>
              )}
            </div>
            {signal?.trendNote && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{signal.trendNote}</p>
            )}
          </div>
        )}

        {themeItems.length > 0 && (
          <div className={`rounded border border-border ${embedded ? "bg-card p-2" : "bg-background p-3"}`}>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              監視テーマ
            </div>
            <div className="space-y-1.5">
              {themeItems.map((item) => (
                <div key={`${stock.code}-${item.label}`} className="rounded bg-card px-2 py-1.5">
                  <div className="text-xxs text-muted-foreground">{item.label}</div>
                  <div className="text-xs font-bold text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </section>
  );
};

export default ShikihoStyleAnalysis;
