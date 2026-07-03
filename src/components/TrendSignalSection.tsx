import { Gauge, RadioTower, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type CandleData, type FundamentalPick, type StockData } from "@/data/stockData";
import RealStockChart from "@/components/RealStockChart";

interface TrendSignalSectionProps {
  stocks: StockData[];
  growthPicks: FundamentalPick[];
  dailyPicks: FundamentalPick[];
}

interface TrendSignal {
  code: string;
  name: string;
  close: number;
  changePercent: number;
  sma20: number;
  sma200: number;
  volumeRatio: number;
  rsi14: number;
  macdHistogram: number;
  bollingerPosition: number;
  score: number;
  tags: string[];
  note: string;
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const movingAverageAt = (data: CandleData[], period: number, index = data.length - 1) => {
  if (index < period - 1) return null;
  return average(data.slice(index - period + 1, index + 1).map((item) => item.close));
};

const standardDeviation = (values: number[]) => {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
};

const emaSeries = (values: number[], period: number) => {
  if (values.length < period) return [];

  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  let ema = average(values.slice(0, period));
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
  if (!deviation) return 0.5;

  const lower = middle - deviation * 2;
  const upper = middle + deviation * 2;
  return (closes.at(-1)! - lower) / (upper - lower);
};

const analyzeTrend = (stock: StockData, candles: CandleData[]): TrendSignal | null => {
  const valid = candles.filter((item) =>
    [item.open, item.high, item.low, item.close, item.volume].every(Number.isFinite)
  );
  if (valid.length < 220) return null;

  const latest = valid.at(-1);
  const previous = valid.at(-2);
  if (!latest || !previous) return null;

  const sma20 = movingAverageAt(valid, 20);
  const sma200 = movingAverageAt(valid, 200);
  const previousSma20 = movingAverageAt(valid, 20, valid.length - 6);
  if (!sma20 || !sma200 || !previousSma20) return null;

  const avgVolume20 = average(valid.slice(-21, -1).map((item) => item.volume));
  const closes = valid.map((item) => item.close);
  const volumeRatio = avgVolume20 ? latest.volume / avgVolume20 : 1;
  const changePercent = previous.close ? ((latest.close - previous.close) / previous.close) * 100 : 0;
  const priceVs20 = ((latest.close - sma20) / sma20) * 100;
  const priceVs200 = ((latest.close - sma200) / sma200) * 100;
  const trendSlope = ((sma20 - previousSma20) / previousSma20) * 100;
  const rsi14 = calculateRsi(closes) ?? 50;
  const macdHistogram = calculateMacdHistogram(closes) ?? 0;
  const bollingerPosition = calculateBollingerPosition(closes) ?? 0.5;

  const tags: string[] = [];
  let score = 50;

  if (latest.close > sma20 && sma20 > sma200) {
    score += 24;
    tags.push("上昇トレンド");
  }
  if (priceVs20 > -2 && priceVs20 < 4 && latest.close >= sma200) {
    score += 14;
    tags.push("押し目候補");
  }
  if (priceVs200 > 0 && priceVs200 < 8) {
    score += 12;
    tags.push("200日線回復");
  }
  if (volumeRatio >= 1.25 && changePercent > 0) {
    score += 12;
    tags.push("出来高増");
  }
  if (rsi14 >= 45 && rsi14 <= 65) {
    score += 10;
    tags.push("RSI良好");
  } else if (rsi14 >= 30 && rsi14 < 45) {
    score += 6;
    tags.push("RSI反発圏");
  } else if (rsi14 > 72) {
    score -= 8;
    tags.push("過熱注意");
  } else if (rsi14 < 30) {
    score += 4;
    tags.push("売られ過ぎ");
  }
  if (macdHistogram > 0) {
    score += 10;
    tags.push("MACD陽転");
  } else {
    score -= 4;
  }
  if (bollingerPosition >= 0.45 && bollingerPosition <= 0.9) {
    score += 8;
    tags.push("BB上向き");
  } else if (bollingerPosition > 1) {
    score -= 5;
    tags.push("BB上限超え");
  } else if (bollingerPosition < 0.2) {
    score -= 6;
  }
  if (trendSlope > 0) score += 8;
  if (latest.close < sma200) score -= 14;
  if (changePercent < -3) score -= 8;

  const note =
    latest.close > sma20 && sma20 > sma200 && macdHistogram > 0
      ? "SMAの上昇基調に加え、MACDがプラス圏で買い優勢を確認。"
      : rsi14 > 72 || bollingerPosition > 1
        ? "上昇基調はありますが、RSIやボリンジャーバンドでは短期過熱に注意。"
        : latest.close >= sma200
          ? "200SMA上で推移し、RSI・出来高を確認しながら押し目を監視。"
          : "200SMA回復待ち。MACDや出来高の改善を確認したい状態。";

  return {
    code: stock.code,
    name: stock.name,
    close: latest.close,
    changePercent,
    sma20,
    sma200,
    volumeRatio,
    rsi14,
    macdHistogram,
    bollingerPosition,
    score: Math.max(0, Math.min(96, Math.round(score))),
    tags: tags.length ? tags.slice(0, 4) : ["監視"],
    note,
  };
};

const buildCandidateStocks = (
  stocks: StockData[],
  growthPicks: FundamentalPick[],
  dailyPicks: FundamentalPick[]
) => {
  const pickedCodes = [...growthPicks, ...dailyPicks].map((pick) => pick.code);
  const preferredCodes = [
    ...pickedCodes,
    "5803",
    "5801",
    "5802",
    "6315",
    "6723",
    "6857",
    "3687",
    "9432",
    "9984",
    "7011",
  ];

  return preferredCodes
    .map((code) => {
      const fromStock = stocks.find((stock) => stock.code === code);
      const fromPick = [...growthPicks, ...dailyPicks].find((pick) => pick.code === code);
      return fromStock ?? (fromPick ? {
        code: fromPick.code,
        name: fromPick.name,
        market: fromPick.market,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        open: 0,
        high: 0,
        low: 0,
        previousClose: 0,
      } : null);
    })
    .filter((stock): stock is StockData => Boolean(stock))
    .filter((stock, index, list) => list.findIndex((item) => item.code === stock.code) === index)
    .slice(0, 14);
};

const TrendSignalSection = ({ stocks, growthPicks, dailyPicks }: TrendSignalSectionProps) => {
  const candidates = useMemo(
    () => buildCandidateStocks(stocks, growthPicks, dailyPicks),
    [stocks, growthPicks, dailyPicks]
  );
  const [signals, setSignals] = useState<TrendSignal[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "fallback">("loading");
  const [updatedAt, setUpdatedAt] = useState("");
  const [updatedAtIso, setUpdatedAtIso] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    const loadSignals = async () => {
      try {
        const results = await Promise.allSettled(
          candidates.map(async (stock) => {
            const response = await fetch(
              `/api/stock-chart?symbol=${encodeURIComponent(`${stock.code}.T`)}&range=2y&interval=1d`,
              { signal: controller.signal }
            );
            if (!response.ok) throw new Error("chart unavailable");
            const payload = await response.json();
            return analyzeTrend(stock, payload.candles ?? []);
          })
        );

        const nextSignals = results
          .map((result) => (result.status === "fulfilled" ? result.value : null))
          .filter((signal): signal is TrendSignal => Boolean(signal))
          .sort((a, b) => b.score - a.score)
          .slice(0, 4);

        if (!isActive) return;
        const now = new Date();
        setSignals(nextSignals);
        setStatus(nextSignals.length ? "live" : "fallback");
        setUpdatedAt(
          new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(now)
        );
        setUpdatedAtIso(now.toISOString());
      } catch {
        if (isActive) setStatus("fallback");
      } finally {
        window.clearTimeout(timeout);
      }
    };

    loadSignals();
    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [candidates]);

  return (
    <section className="rounded border border-border bg-card">
      <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <RadioTower className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">トレンド・需給シグナル</h2>
          <span className="rounded bg-primary px-2 py-0.5 text-xxs font-bold text-primary-foreground">
            SMA/RSI/MACD/BB
          </span>
        </div>
        <div className="flex items-center gap-2 text-xxs text-muted-foreground">
          <span>{updatedAt ? `${updatedAt}更新` : "チャート解析中"}</span>
          {!updatedAt && <span className="rounded bg-muted px-1.5 py-0.5 font-bold">取得中</span>}
        </div>
      </div>
      <div className="border-b border-border bg-muted/20 px-3 py-1.5 text-xs leading-relaxed text-muted-foreground">
        <span className="mr-1 font-bold text-primary">判定</span>
        移動平均、RSI、MACD、ボリンジャーバンド、出来高で総合判定。
      </div>

      <div className="grid grid-cols-1 gap-2 p-2 md:grid-cols-2 xl:grid-cols-4">
        {(signals.length ? signals : candidates.slice(0, 4).map((stock, index) => ({
          code: stock.code,
          name: stock.name,
          close: stock.price,
          changePercent: stock.changePercent,
          sma20: 0,
          sma200: 0,
          volumeRatio: 1,
          rsi14: 50,
          macdHistogram: 0,
          bollingerPosition: 0.5,
          score: 65 - index * 3,
          tags: ["解析中"],
          note: "チャートデータ取得後にシグナルを更新します。",
        } satisfies TrendSignal))).map((signal) => {
          const isUp = signal.changePercent >= 0;

          return (
            <article key={signal.code} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-xxs font-bold text-primary-foreground">
                      {signal.code}
                    </span>
                    <h3 className="text-xs font-bold text-foreground">{signal.name}</h3>
                  </div>
                  <div className={`mt-1 text-xxs font-bold tabular-nums ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                    {isUp ? "+" : ""}
                    {signal.changePercent.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xxs text-muted-foreground">強度</div>
                  <div className="text-lg font-black tabular-nums text-primary">{signal.score}</div>
                </div>
              </div>

              <div className="mb-2 flex flex-wrap gap-1">
                {signal.tags.map((tag) => (
                  <span key={tag} className="rounded bg-stock-up-bg px-1.5 py-0.5 text-xxs font-bold text-stock-up">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mb-2 grid grid-cols-2 gap-1.5">
                <div className="rounded border border-border bg-card px-2 py-1.5">
                  <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    終値/20SMA
                  </div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                    {signal.close ? `${signal.close.toLocaleString(undefined, { maximumFractionDigits: 1 })}` : "-"}
                  </div>
                  <div className="text-xxs text-sky-600">
                    20SMA {signal.sma20 ? signal.sma20.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "-"}
                  </div>
                </div>
                <div className="rounded border border-border bg-card px-2 py-1.5">
                  <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                    <Gauge className="h-3 w-3" />
                    200SMA
                  </div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-amber-600">
                    {signal.sma200 ? signal.sma200.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "-"}
                  </div>
                  <div className="text-xxs text-muted-foreground">
                    出来高 {signal.volumeRatio.toFixed(2)}倍
                  </div>
                </div>
                <div className="rounded border border-border bg-card px-2 py-1.5">
                  <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                    <Gauge className="h-3 w-3" />
                    RSI / MACD
                  </div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                    RSI {signal.rsi14.toFixed(1)}
                  </div>
                  <div className={`text-xxs ${signal.macdHistogram >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                    MACD {signal.macdHistogram >= 0 ? "+" : ""}{signal.macdHistogram.toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-border bg-card px-2 py-1.5">
                  <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                    <Gauge className="h-3 w-3" />
                    BB位置
                  </div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                    {(signal.bollingerPosition * 100).toFixed(0)}%
                  </div>
                  <div className="text-xxs text-muted-foreground">
                    20日 ±2σ
                  </div>
                </div>
              </div>

              <p className="rounded bg-muted/40 px-2 py-1.5 text-xs leading-relaxed text-foreground">
                {signal.note}
              </p>

              <div className="mt-2">
                <RealStockChart
                  code={signal.code}
                  name={signal.name}
                  chartSymbol={`TSE:${signal.code}`}
                  chartApiSymbol={`${signal.code}.T`}
                  currentPrice={signal.close}
                  currentPriceLabel="解析終値"
                  currentPriceUpdatedAt={updatedAtIso}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default TrendSignalSection;
