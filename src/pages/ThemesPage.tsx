import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { useEffect, useMemo, useState } from "react";
import { marketIndices, type CandleData, type StockData } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { Flame, Gauge, Layers, RadioTower, TrendingUp } from "lucide-react";

const blankStock = (code: string, name: string): StockData => ({
  code,
  name,
  market: "プライム",
  price: 0,
  change: 0,
  changePercent: 0,
  volume: 0,
  open: 0,
  high: 0,
  low: 0,
  previousClose: 0,
});

const themes = [
  {
    name: "AI・半導体",
    isHot: true,
    description: "AIサーバー、半導体製造装置、検査装置、先端パッケージ、車載半導体関連",
    stocks: [
      blankStock("8035", "東京エレクトロン"),
      blankStock("285A", "キオクシアHD"),
      blankStock("6857", "アドバンテスト"),
      blankStock("6146", "ディスコ"),
      blankStock("6315", "TOWA"),
      blankStock("6526", "ソシオネクスト"),
      blankStock("6723", "ルネサスエレクトロニクス"),
      blankStock("7735", "SCREENホールディングス"),
      blankStock("3436", "SUMCO"),
    ],
  },
  {
    name: "自動車・EV",
    description: "完成車、電装、電動化、ハイブリッド、駆動・電池周辺関連",
    stocks: [
      blankStock("7203", "トヨタ自動車"),
      blankStock("6902", "デンソー"),
      blankStock("7267", "本田技研工業"),
      blankStock("6594", "ニデック"),
      blankStock("7270", "SUBARU"),
      blankStock("7201", "日産自動車"),
    ],
  },
  {
    name: "金融・金利",
    description: "銀行、保険、金利上昇局面で利ざや改善を見込みやすい銘柄",
    stocks: [
      blankStock("8306", "三菱UFJ"),
      blankStock("8316", "三井住友FG"),
      blankStock("8411", "みずほFG"),
      blankStock("8766", "東京海上HD"),
      blankStock("8750", "第一生命HD"),
      blankStock("7182", "ゆうちょ銀行"),
    ],
  },
  {
    name: "ディフェンシブ",
    description: "医薬品、通信、生活必需品など景気耐性を見たい銘柄",
    stocks: [
      blankStock("4502", "武田薬品工業"),
      blankStock("4503", "アステラス製薬"),
      blankStock("4519", "中外製薬"),
      blankStock("4568", "第一三共"),
      blankStock("2914", "日本たばこ産業"),
      blankStock("3382", "セブン&アイ"),
      blankStock("9432", "日本電信電話"),
      blankStock("9433", "KDDI"),
    ],
  },
  {
    name: "AIインフラ",
    isHot: true,
    description: "データセンター、光通信、電力・通信インフラ、サーバー周辺関連",
    stocks: [
      blankStock("5803", "フジクラ"),
      blankStock("5801", "古河電気工業"),
      blankStock("5802", "住友電気工業"),
      blankStock("6701", "NEC"),
      blankStock("6702", "富士通"),
      blankStock("6501", "日立製作所"),
      blankStock("3778", "さくらインターネット"),
      blankStock("9984", "ソフトバンクグループ"),
    ],
  },
  {
    name: "サイバー・DX",
    isHot: true,
    description: "セキュリティ、クラウド、企業DX、AI実装支援の成長候補",
    stocks: [
      blankStock("4704", "トレンドマイクロ"),
      blankStock("2326", "デジタルアーツ"),
      blankStock("4493", "サイバーセキュリティクラウド"),
      blankStock("3697", "SHIFT"),
      blankStock("4813", "ACCESS"),
      blankStock("3687", "フィックスターズ"),
    ],
  },
  {
    name: "電力・送電網",
    description: "AIデータセンター増設、電力需要、送配電投資で注目される銘柄",
    stocks: [
      blankStock("9501", "東京電力HD"),
      blankStock("9503", "関西電力"),
      blankStock("9508", "九州電力"),
      blankStock("1942", "関電工"),
      blankStock("1944", "きんでん"),
      blankStock("5801", "古河電気工業"),
      blankStock("5802", "住友電気工業"),
    ],
  },
  {
    name: "防衛・宇宙",
    description: "防衛予算、航空宇宙、衛星・通信、重工業の中期テーマ",
    stocks: [
      blankStock("7011", "三菱重工業"),
      blankStock("7012", "川崎重工業"),
      blankStock("7013", "IHI"),
      blankStock("6503", "三菱電機"),
      blankStock("6701", "NEC"),
      blankStock("6208", "石川製作所"),
    ],
  },
  {
    name: "内需・インバウンド",
    description: "訪日需要、消費回復、低価格帯で値動きが出やすい内需候補",
    stocks: [
      blankStock("3092", "ZOZO"),
      blankStock("4680", "ラウンドワン"),
      blankStock("3197", "すかいらーくHD"),
      blankStock("8233", "高島屋"),
      blankStock("9201", "日本航空"),
      blankStock("9202", "ANAホールディングス"),
    ],
  },
];

const allThemeStocks = themes
  .flatMap((theme) => theme.stocks)
  .filter((stock, index, stocks) => stocks.findIndex((item) => item.code === stock.code) === index);

interface StockTrendSignal {
  code: string;
  name: string;
  score: number;
  changePercent: number;
  volumeRatio: number;
  rsi14: number;
  macdHistogram: number;
  bollingerPosition: number;
  closeAbove20: boolean;
  closeAbove200: boolean;
}

interface ThemeTrendSignal {
  name: string;
  score: number;
  averageChange: number;
  averageVolumeRatio: number;
  averageRsi14: number;
  averageMacdHistogram: number;
  averageBollingerPosition: number;
  positiveCount: number;
  checkedCount: number;
  tags: string[];
  leaders: StockTrendSignal[];
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

const analyzeStockTrend = (stock: StockData, candles: CandleData[]): StockTrendSignal | null => {
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

  const closes = valid.map((item) => item.close);
  const avgVolume20 = average(valid.slice(-21, -1).map((item) => item.volume));
  const volumeRatio = avgVolume20 ? latest.volume / avgVolume20 : 1;
  const changePercent = previous.close ? ((latest.close - previous.close) / previous.close) * 100 : 0;
  const closeAbove20 = latest.close >= sma20;
  const closeAbove200 = latest.close >= sma200;
  const sma20Slope = ((sma20 - previousSma20) / previousSma20) * 100;
  const rsi14 = calculateRsi(closes) ?? 50;
  const macdHistogram = calculateMacdHistogram(closes) ?? 0;
  const bollingerPosition = calculateBollingerPosition(closes) ?? 0.5;

  let score = 45;
  if (closeAbove20) score += 14;
  if (closeAbove200) score += 18;
  if (sma20 > sma200) score += 12;
  if (sma20Slope > 0) score += 8;
  if (volumeRatio >= 1.25 && changePercent > 0) score += 12;
  if (rsi14 >= 45 && rsi14 <= 65) score += 10;
  else if (rsi14 >= 30 && rsi14 < 45) score += 6;
  else if (rsi14 > 72) score -= 8;
  else if (rsi14 < 30) score += 4;
  if (macdHistogram > 0) score += 10;
  else score -= 4;
  if (bollingerPosition >= 0.45 && bollingerPosition <= 0.9) score += 8;
  else if (bollingerPosition > 1) score -= 5;
  else if (bollingerPosition < 0.2) score -= 6;
  if (changePercent < -3) score -= 8;

  return {
    code: stock.code,
    name: stock.name,
    score: Math.max(0, Math.min(96, Math.round(score))),
    changePercent,
    volumeRatio,
    rsi14,
    macdHistogram,
    bollingerPosition,
    closeAbove20,
    closeAbove200,
  };
};

const ThemesPage = () => {
  const { stocks: liveStocks, status, updatedAt } = useLiveStockQuotes(allThemeStocks);
  const liveByCode = new Map(liveStocks.map((stock) => [stock.code, stock]));
  const [themeSignals, setThemeSignals] = useState<ThemeTrendSignal[]>([]);
  const [signalStatus, setSignalStatus] = useState<"loading" | "live" | "fallback">("loading");
  const [signalUpdatedAt, setSignalUpdatedAt] = useState("");
  const signalTargets = useMemo(
    () =>
      themes.map((theme) => ({
        name: theme.name,
        stocks: theme.stocks.slice(0, 4).map((stock) => liveByCode.get(stock.code) ?? stock),
      })),
    [liveStocks]
  );

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeout = window.setTimeout(() => controller.abort(), 14000);

    const loadThemeSignals = async () => {
      try {
        const nextSignals = await Promise.all(
          signalTargets.map(async (theme) => {
            const results = await Promise.allSettled(
              theme.stocks.map(async (stock) => {
                const response = await fetch(
                  `/api/stock-chart?symbol=${encodeURIComponent(`${stock.code}.T`)}&range=2y&interval=1d`,
                  { signal: controller.signal }
                );
                if (!response.ok) throw new Error("chart unavailable");
                const payload = await response.json();
                return analyzeStockTrend(stock, payload.candles ?? []);
              })
            );

            const leaders = results
              .map((result) => (result.status === "fulfilled" ? result.value : null))
              .filter((signal): signal is StockTrendSignal => Boolean(signal))
              .sort((a, b) => b.score - a.score);

            const positiveCount = leaders.filter((signal) => signal.closeAbove20 && signal.closeAbove200).length;
            const averageScore = average(leaders.map((signal) => signal.score));
            const averageChange = average(leaders.map((signal) => signal.changePercent));
            const averageVolumeRatio = average(leaders.map((signal) => signal.volumeRatio));
            const averageRsi14 = average(leaders.map((signal) => signal.rsi14));
            const averageMacdHistogram = average(leaders.map((signal) => signal.macdHistogram));
            const averageBollingerPosition = average(leaders.map((signal) => signal.bollingerPosition));
            const tags = [
              positiveCount >= 2 ? "上昇優勢" : "選別物色",
              averageMacdHistogram > 0 ? "MACD陽転" : "MACD弱含み",
              averageRsi14 > 72 ? "過熱注意" : averageRsi14 >= 45 ? "RSI良好" : "RSI反発待ち",
              averageVolumeRatio >= 1.25 ? "出来高増" : "出来高通常",
            ].slice(0, 4);

            return {
              name: theme.name,
              score: Math.max(0, Math.min(96, Math.round(averageScore || 50))),
              averageChange,
              averageVolumeRatio: averageVolumeRatio || 1,
              averageRsi14: averageRsi14 || 50,
              averageMacdHistogram: averageMacdHistogram || 0,
              averageBollingerPosition: averageBollingerPosition || 0.5,
              positiveCount,
              checkedCount: leaders.length,
              tags,
              leaders: leaders.slice(0, 3),
              note:
                positiveCount >= 2 && averageMacdHistogram > 0
                  ? "主要銘柄のSMAが上向き、MACDもプラス圏でテーマ内の買い優勢を確認。"
                  : averageRsi14 > 72 || averageBollingerPosition > 1
                    ? "テーマ内の上昇はありますが、RSIやボリンジャーバンドでは短期過熱に注意。"
                    : "テーマ内で強弱が分かれており、RSI・MACD・出来高の改善を確認したい状態。",
            } satisfies ThemeTrendSignal;
          })
        );

        if (!isActive) return;
        const liveSignals = nextSignals
          .filter((signal) => signal.checkedCount > 0)
          .sort((a, b) => b.score - a.score);
        setThemeSignals(liveSignals);
        setSignalStatus(liveSignals.length ? "live" : "fallback");
        setSignalUpdatedAt(
          new Intl.DateTimeFormat("ja-JP", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date())
        );
      } catch {
        if (isActive) setSignalStatus("fallback");
      } finally {
        window.clearTimeout(timeout);
      }
    };

    loadThemeSignals();
    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [signalTargets]);

  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="テーマ別" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            テーマ株
          </h2>
          <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              {updatedLabel ? `更新 ${updatedLabel}` : status === "loading" ? "取得中" : "更新確認中"}
            </span>
          </div>
        </div>

        <section className="mb-3 rounded border border-border bg-card">
          <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">テーマ別トレンド・需給シグナル</h3>
              <span className="rounded bg-primary px-2 py-0.5 text-xxs font-bold text-primary-foreground">
                SMA/RSI/MACD/BB
              </span>
            </div>
            <div className="flex items-center gap-2 text-xxs text-muted-foreground">
              <span>{signalUpdatedAt ? `${signalUpdatedAt}更新` : "チャート解析中"}</span>
              {!signalUpdatedAt && <span className="rounded bg-muted px-1.5 py-0.5 font-bold">{signalStatus === "loading" ? "取得中" : "確認待ち"}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 p-2 md:grid-cols-2 xl:grid-cols-4">
            {(themeSignals.length
              ? themeSignals.slice(0, 8)
              : signalTargets.slice(0, 4).map((theme, index) => ({
                  name: theme.name,
                  score: 62 - index * 3,
                  averageChange: 0,
                  averageVolumeRatio: 1,
                  averageRsi14: 50,
                  averageMacdHistogram: 0,
                  averageBollingerPosition: 0.5,
                  positiveCount: 0,
                  checkedCount: theme.stocks.length,
                  tags: ["解析中"],
                  leaders: theme.stocks.slice(0, 3).map((stock) => ({
                    code: stock.code,
                    name: stock.name,
                    score: 0,
                    changePercent: stock.changePercent,
                    volumeRatio: 1,
                    rsi14: 50,
                    macdHistogram: 0,
                    bollingerPosition: 0.5,
                    closeAbove20: false,
                    closeAbove200: false,
                  })),
                  note: "チャートデータ取得後にテーマ別シグナルを更新します。",
                } satisfies ThemeTrendSignal))
            ).map((signal) => {
              const isUp = signal.averageChange >= 0;

              return (
                <article key={signal.name} className="rounded border border-border bg-background p-2">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{signal.name}</h4>
                      <div className={`mt-1 text-xxs font-bold tabular-nums ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}
                        {signal.averageChange.toFixed(2)}%
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
                        上昇銘柄
                      </div>
                      <div className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                        {signal.positiveCount}/{signal.checkedCount}
                      </div>
                    </div>
                    <div className="rounded border border-border bg-card px-2 py-1.5">
                      <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                        <Gauge className="h-3 w-3" />
                        出来高
                      </div>
                      <div className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                        {signal.averageVolumeRatio.toFixed(2)}倍
                      </div>
                    </div>
                    <div className="rounded border border-border bg-card px-2 py-1.5">
                      <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                        <Gauge className="h-3 w-3" />
                        RSI / MACD
                      </div>
                      <div className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                        RSI {signal.averageRsi14.toFixed(1)}
                      </div>
                      <div className={`text-xxs ${signal.averageMacdHistogram >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                        MACD {signal.averageMacdHistogram >= 0 ? "+" : ""}{signal.averageMacdHistogram.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded border border-border bg-card px-2 py-1.5">
                      <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                        <Gauge className="h-3 w-3" />
                        BB位置
                      </div>
                      <div className="mt-0.5 text-xs font-bold tabular-nums text-foreground">
                        {(signal.averageBollingerPosition * 100).toFixed(0)}%
                      </div>
                      <div className="text-xxs text-muted-foreground">20日 ±2σ</div>
                    </div>
                  </div>

                  <div className="mb-2 space-y-1">
                    {signal.leaders.map((leader) => (
                      <div key={leader.code} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-xxs">
                        <span>
                          <span className="font-mono font-bold text-primary">{leader.code}</span>
                          <span className="ml-1 text-foreground">{leader.name}</span>
                        </span>
                        <span className="font-bold tabular-nums text-primary">{leader.score || "-"}</span>
                      </div>
                    ))}
                  </div>

                  <p className="rounded bg-muted/40 px-2 py-1.5 text-xs leading-relaxed text-foreground">
                    <span className="mr-1 font-bold text-primary">根拠</span>
                    {signal.note}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {themes.map((theme) => {
            const stocks = theme.stocks.map((stock) => liveByCode.get(stock.code) ?? stock);
            const themeChange =
              stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / Math.max(stocks.length, 1);
            const isUp = themeChange > 0;

            return (
              <div key={theme.name} className="rounded border border-border bg-card transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between border-b border-border bg-table-header-bg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground">{theme.name}</h3>
                    {theme.isHot && (
                      <span className="flex items-center gap-0.5 rounded bg-badge-hot px-1 py-0 text-xxs font-bold text-primary-foreground">
                        <Flame className="h-2.5 w-2.5" />
                        注目
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                    {isUp ? "+" : ""}{themeChange.toFixed(2)}%
                  </span>
                </div>
                <div className="px-3 py-2">
                  <p className="mb-2 text-xxs text-muted-foreground">{theme.description}</p>
                  <div className="space-y-1">
                    {stocks.map((stock) => {
                      const stockUp = stock.changePercent > 0;
                      return (
                        <div key={stock.code} className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xxs font-semibold text-primary">{stock.code}</span>
                            <span className="ml-1 text-xxs text-foreground">{stock.name}</span>
                          </div>
                          <span className={`text-xxs tabular-nums font-semibold ${stockUp ? "text-stock-up" : "text-stock-down"}`}>
                            {stockUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ThemesPage;
