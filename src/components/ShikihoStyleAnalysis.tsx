import { Activity, ShieldCheck, TrendingUp } from "lucide-react";
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
  trendLabel: string;
  trendNote: string;
}

const monitoredPicks = [...fundamentalPicks, ...futureGrowthPicks];

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const movingAverage = (data: CandleData[], period: number) => {
  if (data.length < period) return null;
  return average(data.slice(-period).map((item) => item.close));
};

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

  let trendLabel = "判定保留";
  let trendNote = "移動平均の計算に必要な日足データを確認中です。";

  if (sma20 && sma200) {
    if (latest.close > sma20 && sma20 > sma200) {
      trendLabel = "上昇基調";
      trendNote = "終値が20SMAを上回り、20SMAも200SMAを上回っています。";
    } else if (latest.close > sma200) {
      trendLabel = "中期線上";
      trendNote = "終値は200SMAを上回っていますが、20SMAとの位置関係は確認が必要です。";
    } else {
      trendLabel = "回復待ち";
      trendNote = "終値が200SMAを下回っており、中期トレンドの回復を確認したい状態です。";
    }
  }

  return {
    close: latest.close,
    sma20,
    sma200,
    volumeRatio,
    trendLabel,
    trendNote,
  };
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
  const verifiedRows = [
    { label: "銘柄", value: `${stock.code} ${stock.name}` },
    { label: "市場", value: stock.market },
    {
      label: "終値",
      value: signal?.close || stock.price
        ? (signal?.close ?? stock.price).toLocaleString(undefined, { maximumFractionDigits: 1 })
        : "",
    },
    {
      label: "出来高",
      value: stock.volume > 0 ? `${stock.volume.toLocaleString()}株` : "",
    },
  ].filter((row) => row.value);
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
        {verifiedRows.length > 0 && (
          <div className={`rounded border border-border ${embedded ? "bg-card p-2" : "bg-background p-3"}`}>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-stock-up" />
              確認済みデータ
            </div>
            <div className="space-y-1.5 text-xs">
              {verifiedRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasTrendData && (
          <div className={`rounded border border-border ${embedded ? "bg-card p-2" : "bg-background p-3"}`}>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              トレンド判定
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
