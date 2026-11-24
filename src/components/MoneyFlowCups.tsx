import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { type MarketIndex, type StockData } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { useLiveNewsSearch } from "@/hooks/useLiveNewsSearch";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import FlowNewsReaderModal, { type ArticleBodyState } from "@/components/FlowNewsReaderModal";
import {
  analyzeFlowNews,
  buildGlobalMoneyFlow,
  buildSectorMoneyFlow,
  FLOW_TIMEFRAME_META,
  formatSignedPercent,
  SECTOR_STOCK_SEEDS,
  type CupFlowLevel,
  type FlowNewsImpact,
  type FlowTimeframe,
  type FlowViewMode,
  type MoneyFlowCup,
  type NewsImpactDirection,
} from "@/lib/moneyFlowAnalysis";

const MONEY_FLOW_NEWS_QUERY =
  "日経平均 OR TOPIX OR 米国株 OR NASDAQ OR FRB OR 日銀 OR 米国債 OR 米金利 OR ドル円 OR 半導体 OR AI OR 防衛 when:3d";

const MONEY_FLOW_CATALYST_QUERY =
  "(トランプ OR 関税 OR 輸出規制 OR 半導体規制 OR エヌビディア OR NVIDIA OR スパイ OR 制裁 OR 訴訟 OR 地政学 OR FOMC OR 日銀) (株 OR 市場 OR 半導体 OR 為替 OR 金利) when:5d";

const MONEY_FLOW_CRYPTO_COMMODITY_QUERY =
  "ビットコイン OR BTC OR 暗号資産 OR 仮想通貨 OR 金価格 OR 金先物 OR 金相場 OR NY金 OR 原油 OR WTI when:5d";

const getDirectionBadgeClass = (direction: NewsImpactDirection) => {
  switch (direction) {
    case "bullish":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
    case "bearish":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
  }
};

interface MoneyFlowCupsProps {
  indices: MarketIndex[];
  stocks?: StockData[];
}

// 水の色はクリアなブルー系で統一し、水位（集中度）に応じた濃淡と控えめな状態ピルでメリハリをつける
const getWaterTone = (level: CupFlowLevel) => {
  switch (level) {
    case "concentrated":
      return {
        top: "#0284c7",
        mid: "#1d4ed8",
        bottom: "#1e3a8a",
        backWave: "rgba(125, 211, 252, 0.55)",
        surfaceStroke: "rgba(224, 242, 254, 0.92)",
        badgeClass:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
        bubbleCount: 3,
      };
    case "inflow":
      return {
        top: "#38bdf8",
        mid: "#0284c7",
        bottom: "#0369a1",
        backWave: "rgba(186, 230, 253, 0.55)",
        surfaceStroke: "rgba(240, 249, 255, 0.9)",
        badgeClass:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300",
        bubbleCount: 2,
      };
    case "neutral":
      return {
        top: "#7dd3fc",
        mid: "#38bdf8",
        bottom: "#0284c7",
        backWave: "rgba(224, 242, 254, 0.5)",
        surfaceStroke: "rgba(240, 249, 255, 0.85)",
        badgeClass:
          "border-border bg-muted text-foreground/75",
        bubbleCount: 0,
      };
    case "outflow":
      return {
        top: "#bae6fd",
        mid: "#7dd3fc",
        bottom: "#38bdf8",
        backWave: "rgba(224, 242, 254, 0.45)",
        surfaceStroke: "rgba(240, 249, 255, 0.8)",
        badgeClass:
          "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
        bubbleCount: 0,
      };
  }
};

const getRegimeBadgeClass = (tone: "risk-on" | "risk-off" | "rotation" | "neutral") => {
  switch (tone) {
    case "risk-on":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
    case "risk-off":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300";
    case "rotation":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "border-border bg-background text-foreground/80";
  }
};

const GlassCupIllustration = ({
  cup,
  uid,
  compact = false,
}: {
  cup: MoneyFlowCup;
  uid: string;
  compact?: boolean;
}) => {
  const tone = getWaterTone(cup.flowLevel);
  // コップ内側: y=20(満水100%) 〜 y=138(空0%)
  const liquidTopY = 138 - (cup.waterLevel / 100) * 116;
  const clipId = `cup-clip-${uid}-${cup.id}`;
  const gradId = `cup-grad-${uid}-${cup.id}`;
  const glassSheenId = `cup-sheen-${uid}-${cup.id}`;

  return (
    <svg
      viewBox="0 0 120 154"
      className={`mx-auto select-none overflow-hidden ${
        compact
          ? "h-28 w-24 sm:h-32 sm:w-24 lg:h-32 lg:w-full lg:max-w-[96px]"
          : "h-32 w-24 sm:h-36 sm:w-28"
      }`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M 16 20 L 104 20 L 95 134 Q 94 140 87 140 L 33 140 Q 26 140 25 134 Z" />
        </clipPath>

        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={tone.top} stopOpacity="0.92" />
          <stop offset="50%" stopColor={tone.mid} stopOpacity="0.95" />
          <stop offset="100%" stopColor={tone.bottom} stopOpacity="0.98" />
        </linearGradient>

        <linearGradient id={glassSheenId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* コップの影 */}
      <ellipse
        cx="60"
        cy="147"
        rx="34"
        ry="4"
        fill="currentColor"
        className="text-slate-900/10 dark:text-black/35"
      />

      {/* コップ背面のガラス */}
      <path
        d="M 15 19 L 105 19 L 96 135 Q 95 142 87 142 L 33 142 Q 25 142 24 135 Z"
        className="fill-slate-100/80 dark:fill-slate-800/60"
      />

      {/* コップ内の水 */}
      <g clipPath={`url(#${clipId})`}>
        <g
          style={{
            transform: `translateY(${liquidTopY}px)`,
            transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <g className="cup-wave-back">
            <path
              d="M 0 3 Q 25 -4 50 3 T 100 3 T 150 3 T 200 3 T 250 3 L 250 150 L 0 150 Z"
              fill={tone.backWave}
            />
          </g>

          <g className="cup-wave-front">
            <path
              d="M 0 4 Q 25 10 50 4 T 100 4 T 150 4 T 200 4 T 250 4 L 250 155 L 0 155 Z"
              fill={`url(#${gradId})`}
            />
            <path
              d="M 0 4 Q 25 10 50 4 T 100 4 T 150 4 T 200 4 T 250 4"
              fill="none"
              stroke={tone.surfaceStroke}
              strokeWidth="1.5"
            />
          </g>

          {tone.bubbleCount >= 1 && (
            <circle cx="44" cy="48" r="2.6" fill="rgba(255,255,255,0.6)" className="cup-bubble" />
          )}
          {tone.bubbleCount >= 2 && (
            <circle
              cx="74"
              cy="60"
              r="2.1"
              fill="rgba(255,255,255,0.55)"
              className="cup-bubble cup-bubble-delay-1"
            />
          )}
          {tone.bubbleCount >= 3 && (
            <circle
              cx="58"
              cy="70"
              r="3"
              fill="rgba(255,255,255,0.5)"
              className="cup-bubble cup-bubble-delay-2"
            />
          )}
        </g>
      </g>

      {/* 目盛り線（25%, 50%, 75%） */}
      {[25, 50, 75].map((mark) => {
        const y = 138 - (mark / 100) * 116;
        return (
          <line
            key={mark}
            x1="82"
            y1={y}
            x2="94"
            y2={y}
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.55"
            className="text-slate-600 dark:text-slate-300"
          />
        );
      })}

      {/* ガラスの厚底 */}
      <path
        d="M 26 135 Q 27 141 34 141 L 86 141 Q 93 141 94 135 L 93 139 Q 92 144 86 144 L 34 144 Q 28 144 27 139 Z"
        className="fill-slate-300/75 dark:fill-slate-600/65"
      />

      {/* 左側ガラスハイライト */}
      <path d="M 21 24 L 30 24 L 37 134 L 29 134 Z" fill={`url(#${glassSheenId})`} />

      {/* コップの外枠 */}
      <path
        d="M 15 19 L 24 135 Q 25 143 33 143 L 87 143 Q 95 143 96 135 L 105 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-500/85 dark:text-slate-400"
      />

      {/* 飲み口の楕円リム */}
      <ellipse
        cx="60"
        cy="19"
        rx="45"
        ry="5"
        className="fill-white/60 stroke-slate-500/85 dark:fill-slate-700/45 dark:stroke-slate-400"
        strokeWidth="2"
      />

      {/* 中央の水位％ピル */}
      <g>
        <rect
          x="27"
          y="64"
          width="66"
          height="28"
          rx="14"
          className="fill-white/95 stroke-slate-300 dark:fill-slate-950/92 dark:stroke-slate-600"
          strokeWidth="1.4"
        />
        <text
          x="60"
          y="84"
          textAnchor="middle"
          className="fill-slate-950 dark:fill-white text-[16px] font-black tabular-nums"
        >
          {cup.waterLevel}%
        </text>
      </g>
    </svg>
  );
};

const TIMEFRAMES: FlowTimeframe[] = ["1D", "1W", "1M"];

const MoneyFlowCups = ({ indices, stocks = [] }: MoneyFlowCupsProps) => {
  const uid = useId().replace(/:/g, "");
  const [mode, setMode] = useState<FlowViewMode>("global");
  const [timeframe, setTimeframe] = useState<FlowTimeframe>("1D");
  const [activeArticle, setActiveArticle] = useState<FlowNewsImpact | null>(null);
  const [articleBodies, setArticleBodies] = useState<Record<string, ArticleBodyState>>({});

  const openNewsModal = (item: FlowNewsImpact) => {
    setActiveArticle(item);
    const url = item.url;
    if (url && !articleBodies[url]) {
      setArticleBodies((curr) => ({ ...curr, [url]: { status: "loading" } }));
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 9500);
      fetch(`/api/article-summary?url=${encodeURIComponent(url)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((payload) => {
          const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
          const fullText =
            typeof payload.fullText === "string" && payload.fullText.trim()
              ? payload.fullText.trim()
              : summary;
          setArticleBodies((curr) => ({
            ...curr,
            [url]: summary ? { status: "ready", summary, fullText } : { status: "error" },
          }));
        })
        .catch(() => {
          setArticleBodies((curr) => ({ ...curr, [url]: { status: "error" } }));
        })
        .finally(() => window.clearTimeout(timeout));
    }
  };

  const {
    indices: liveIndices,
    macroAssets: liveMacroAssets,
    status: marketStatus,
    updatedAt: marketUpdatedAt,
  } = useLiveMarketData(indices);

  const sectorSeeds = useMemo(() => {
    const stockByCode = new Map(stocks.map((item) => [item.code, item]));
    return SECTOR_STOCK_SEEDS.map((seed) => {
      const existing = stockByCode.get(seed.code);
      if (existing && existing.price > 0) {
        return { ...seed, ...existing };
      }
      return seed;
    });
  }, [stocks]);

  const { stocks: liveSectorStocks, status: sectorStatus } = useLiveStockQuotes(sectorSeeds);
  const { news: macroRawNews, status: macroNewsStatus } = useLiveNewsSearch({
    query: MONEY_FLOW_NEWS_QUERY,
    limit: 24,
    cacheKey: "stock-scout-money-flow-news-v1",
    cacheMs: 1000 * 60 * 15,
  });
  const { news: catalystRawNews, status: catalystNewsStatus } = useLiveNewsSearch({
    query: MONEY_FLOW_CATALYST_QUERY,
    limit: 20,
    cacheKey: "stock-scout-money-flow-catalyst-v1",
    cacheMs: 1000 * 60 * 15,
  });
  const { news: altRawNews, status: altNewsStatus } = useLiveNewsSearch({
    query: MONEY_FLOW_CRYPTO_COMMODITY_QUERY,
    limit: 24,
    cacheKey: "stock-scout-money-flow-alt-v2",
    cacheMs: 1000 * 60 * 15,
  });

  const flowRawNews = useMemo(
    () => [...catalystRawNews, ...altRawNews, ...macroRawNews],
    [catalystRawNews, altRawNews, macroRawNews]
  );
  const newsStatus =
    macroNewsStatus === "loading" && catalystNewsStatus === "loading" && altNewsStatus === "loading"
      ? "loading"
      : "live";

  const overview = useMemo(
    () =>
      mode === "global"
        ? buildGlobalMoneyFlow(liveIndices, liveMacroAssets, timeframe)
        : buildSectorMoneyFlow(liveSectorStocks, liveIndices, timeframe),
    [mode, timeframe, liveIndices, liveMacroAssets, liveSectorStocks]
  );

  const { topNews, newsByCupId } = useMemo(
    () => analyzeFlowNews(flowRawNews, overview.cups),
    [flowRawNews, overview.cups]
  );

  const topCupId = useMemo(
    () => [...overview.cups].sort((a, b) => a.rank - b.rank)[0]?.id ?? overview.cups[0]?.id ?? "",
    [overview.cups]
  );
  const [selectedCupId, setSelectedCupId] = useState<string>(topCupId);

  useEffect(() => {
    setSelectedCupId(topCupId);
  }, [mode, timeframe, topCupId]);

  const selectedCup =
    overview.cups.find((cup) => cup.id === selectedCupId) ?? overview.cups[0];
  const selectedCupNews = selectedCup ? newsByCupId[selectedCup.id] ?? [] : [];

  const liveBadgeStatus: "live" | "cached" | "fallback" =
    mode === "global"
      ? marketStatus
      : sectorStatus === "live"
      ? "live"
      : "fallback";
  const updatedLabel = marketUpdatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(marketUpdatedAt))
    : "";

  return (
    <section
      aria-label="資金集中マップ（コップで可視化）"
      className="overflow-hidden rounded-md border border-border bg-card"
    >
      {/* ヘッダー（モバイル: 1段目タイトル+右上LIVE / 2段目タブ右寄せ、PC: 1行集約） */}
      <div className="flex flex-col gap-1.5 border-b border-border bg-table-header-bg px-3 py-2 sm:px-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-2 lg:contents">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2 lg:order-1">
            <h2 className="text-sm sm:text-base font-extrabold leading-tight text-foreground">
              いま資金はどこに集中している？
            </h2>
            <span
              className={`shrink-0 whitespace-nowrap rounded border px-2 py-0.5 text-xxs font-bold ${getRegimeBadgeClass(
                overview.regimeTone
              )}`}
            >
              {overview.regimeLabel}
            </span>
          </div>

          {/* 常に右端に配置するLIVEバッジ */}
          <span
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xxs font-bold lg:order-3 ${
              liveBadgeStatus === "live"
                ? "border border-red-600 bg-white text-red-600"
                : "bg-muted text-muted-foreground"
            }`}
            title={updatedLabel ? `更新 ${updatedLabel}` : undefined}
          >
            {liveBadgeStatus === "live" && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
            {liveBadgeStatus === "live" ? "LIVE" : liveBadgeStatus === "cached" ? "前回値" : "確認中"}
          </span>
        </div>

        <div className="flex flex-nowrap items-center justify-end gap-1.5 sm:gap-2 lg:order-2 lg:ml-auto">
          {/* 期間切替タブ（今日 / 1週間 / 1ヶ月） */}
          <div
            role="tablist"
            aria-label="資金フローの期間切替"
            className="inline-flex shrink-0 flex-nowrap rounded border border-border bg-background p-0.5 text-xxs font-bold"
          >
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                role="tab"
                aria-selected={timeframe === tf}
                onClick={() => setTimeframe(tf)}
                title={FLOW_TIMEFRAME_META[tf].hint}
                className={`shrink-0 whitespace-nowrap rounded px-2 py-1 transition-colors ${
                  timeframe === tf
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/75 hover:text-foreground"
                }`}
              >
                {FLOW_TIMEFRAME_META[tf].label}
              </button>
            ))}
          </div>

          {/* 視点切替タブ */}
          <div
            role="tablist"
            aria-label="資金フローの視点切替"
            className="inline-flex shrink-0 flex-nowrap rounded border border-border bg-background p-0.5 text-xxs font-bold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "global"}
              onClick={() => setMode("global")}
              className={`shrink-0 whitespace-nowrap rounded px-2 py-1 transition-colors sm:px-2.5 ${
                mode === "global"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/75 hover:text-foreground"
              }`}
            >
              <span className="sm:hidden">世界フロー</span>
              <span className="hidden sm:inline">世界の資金フロー</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sectors"}
              onClick={() => setMode("sectors")}
              className={`shrink-0 whitespace-nowrap rounded px-2 py-1 transition-colors sm:px-2.5 ${
                mode === "sectors"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/75 hover:text-foreground"
              }`}
            >
              <span className="sm:hidden">セクター別</span>
              <span className="hidden sm:inline">日本株セクター別</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3.5 p-3.5">
        {/* ひとこと結論 */}
        <div className="rounded border border-border border-l-4 border-l-primary bg-muted/35 px-3.5 py-2.5">
          <p className="text-sm font-extrabold leading-snug text-foreground">
            {overview.headline}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/75">
            水位が高いコップほど資金が集中している領域です。各コップをクリックすると右側の深掘り解説が切り替わります。
          </p>
        </div>

        {/* コップ横並びエリア */}
        <div
          className={`grid grid-cols-2 gap-2 ${
            mode === "global"
              ? "sm:grid-cols-4 lg:grid-cols-8"
              : "sm:grid-cols-3 lg:grid-cols-6 sm:gap-2.5"
          }`}
        >
          {overview.cups.map((cup) => {
            const tone = getWaterTone(cup.flowLevel);
            const isSelected = selectedCup?.id === cup.id;
            const isUp = cup.changePercent > 0;
            const isDown = cup.changePercent < 0;
            const isEightRow = mode === "global";

            return (
              <button
                key={cup.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedCupId(cup.id)}
                className={`relative flex min-w-0 flex-col items-center justify-between overflow-hidden rounded-lg border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isEightRow ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3"
                } ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/40 ring-1 ring-sky-500/25 dark:bg-sky-950/25"
                    : "border-border bg-background hover:border-sky-400/60 hover:bg-muted/25"
                }`}
              >
                {/* 上部：順位 & 状態 */}
                <div className="mb-1 flex w-full items-center justify-between gap-1">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-extrabold leading-none ${
                      cup.rank === 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground/80"
                    }`}
                  >
                    {cup.rank}位
                  </span>
                  <span
                    className={`truncate rounded border px-1.5 py-0.5 text-[11px] font-bold leading-none ${tone.badgeClass}`}
                  >
                    {cup.flowBadge}
                  </span>
                </div>

                {/* コップ本体SVG */}
                <GlassCupIllustration cup={cup} uid={uid} compact={isEightRow} />

                {/* ラベル & 数値 */}
                <div className="mt-1.5 w-full space-y-0.5">
                  <div className="truncate text-xs sm:text-[13px] font-extrabold leading-snug text-foreground">
                    {cup.shortLabel}
                  </div>
                  <div className="truncate text-[11px] font-medium leading-snug text-foreground/70">
                    {cup.subtitle}
                  </div>
                  <div
                    className={`text-sm font-black tabular-nums ${
                      isUp
                        ? "text-stock-up"
                        : isDown
                        ? "text-stock-down"
                        : "text-stock-unchanged"
                    }`}
                  >
                    {formatSignedPercent(cup.changePercent)}
                  </div>
                  <div className="truncate text-[11px] font-semibold tabular-nums text-foreground/70">
                    {cup.displayMetric}
                  </div>
                </div>

                <div className="mt-1.5 h-5">
                  {isSelected && (
                    <span className="inline-block rounded bg-primary px-2 py-0.5 text-[11px] font-bold leading-none text-primary-foreground">
                      選択中
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 詳しい解説エリア：全体理由 + 選択中のコップ深掘り */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
          {/* 左：なぜ今こうなっているのか（全体の構造解説） */}
          <div className="min-w-0 rounded border border-border bg-background p-3.5 lg:col-span-6">
            <h3 className="mb-2.5 border-b border-border pb-1.5 text-sm font-extrabold text-foreground">
              なぜ今この水位になっているのか？（全体の理由解説）
            </h3>

            <p className="mb-3 text-[13px] leading-relaxed text-foreground/95">
              {overview.leadSummary}
            </p>

            <div className="divide-y divide-border rounded border border-border">
              {overview.reasons.map((reason) => (
                <div key={reason.title} className="px-3 py-2.5">
                  <div className="text-[13px] font-extrabold leading-snug text-foreground">{reason.title}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{reason.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded border border-amber-200/90 bg-amber-50/55 px-3 py-2.5 text-[13px] leading-relaxed text-foreground/90 dark:border-amber-900/60 dark:bg-amber-950/25">
              <span className="font-extrabold text-amber-900 dark:text-amber-200">
                資金ローテーションの着眼点：
              </span>
              {overview.rotationHint}
            </div>

            {/* 最新の重要ニュースと資金フローへの影響解説 */}
            <div className="mt-3.5 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between gap-1.5">
                <h4 className="min-w-0 text-[13px] font-extrabold leading-snug text-foreground">
                  いまの騰落原因・重要ニュース（規制・政権・マクロ）
                </h4>
                <span className="shrink-0 whitespace-nowrap rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-foreground/75">
                  {newsStatus === "loading" ? "取得中" : topNews.length ? `${topNews.length}件反映` : "監視中"}
                </span>
              </div>

              {topNews.length > 0 ? (
                <div className="space-y-2">
                  {topNews.map((item) => (
                    <article
                      key={item.id}
                      className="rounded border border-border bg-card p-2.5 transition-colors hover:border-foreground/30"
                    >
                      <div className="mb-1 flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar text-[10px]">
                        <span
                          className={`shrink-0 whitespace-nowrap rounded border px-1 py-0.5 font-bold leading-none ${getDirectionBadgeClass(
                            item.direction
                          )}`}
                        >
                          {item.directionLabel}
                        </span>
                        <span className="shrink-0 whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-1 py-0.5 font-bold leading-none text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200">
                          {item.impactTag}
                        </span>
                        {item.matchedCupLabels.map((label) => (
                          <span
                            key={label}
                            className="shrink-0 whitespace-nowrap rounded border border-border bg-muted/60 px-1 py-0.5 font-semibold leading-none text-foreground/80"
                          >
                            {label}
                          </span>
                        ))}
                        <span className="ml-auto shrink-0 whitespace-nowrap pl-1 text-[10px] leading-none text-muted-foreground">
                          {item.source}
                          {item.dateLabel ? `・${item.dateLabel}` : ""}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openNewsModal(item)}
                        className="block w-full text-left text-[13px] font-bold leading-snug text-foreground hover:text-primary"
                      >
                        {item.title}
                      </button>

                      <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                        <span className="font-bold text-primary">解説：</span>
                        {item.impactSummary}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xxs">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 font-semibold text-muted-foreground hover:text-primary hover:underline"
                          >
                            <span>元記事</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => openNewsModal(item)}
                          className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-2 py-0.5 font-bold text-primary transition-colors hover:bg-muted"
                        >
                          <span>詳しく見る</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  {newsStatus === "loading"
                    ? "最新の金融・マクロニュースを取得して、各コップの水位と照合しています..."
                    : "現在、主要指数・為替・金利の数値をもとに資金フローを解析しています。最新記事は下部のニュース一覧でも確認できます。"}
                </p>
              )}
            </div>
          </div>

          {/* 右：選択中のコップを詳しく解説 */}
          {selectedCup && (
            <div className="min-w-0 rounded border border-border bg-background p-3.5 lg:col-span-6">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5 border-b border-border pb-1.5">
                <h3 className="text-sm font-extrabold text-foreground">
                  「{selectedCup.label}」の深掘り解説
                </h3>
                <div className="flex shrink-0 items-center gap-1 text-[10px] font-extrabold leading-none tabular-nums">
                  <span className="whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200">
                    水位 {selectedCup.waterLevel}%（{selectedCup.rank}位）
                  </span>
                  <span
                    className={`whitespace-nowrap rounded border border-border px-1.5 py-0.5 ${
                      selectedCup.changePercent > 0
                        ? "text-stock-up"
                        : selectedCup.changePercent < 0
                        ? "text-stock-down"
                        : "text-foreground"
                    }`}
                  >
                    {formatSignedPercent(selectedCup.changePercent)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-[13px] leading-relaxed">
                <div className="rounded border border-border p-3">
                  <div className="mb-1 text-[13px] font-extrabold leading-snug text-foreground">
                    <span className="mr-1 text-primary">①</span>いまの水位になっている直接の理由
                  </div>
                  <p className="leading-relaxed text-foreground/85">{selectedCup.currentReason}</p>
                </div>

                <div className="rounded border border-border p-3">
                  <div className="mb-1 text-[13px] font-extrabold leading-snug text-foreground">
                    <span className="mr-1 text-primary">②</span>資金が集まりやすい／抜けやすい構造的背景
                  </div>
                  <p className="leading-relaxed text-foreground/85">{selectedCup.structuralBackground}</p>
                </div>

                <div className="rounded border border-border p-3">
                  <div className="mb-1 text-[13px] font-extrabold leading-snug text-foreground">
                    <span className="mr-1 text-primary">③</span>今後、水位が上下する転換サイン
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-foreground/85">
                    {selectedCup.watchPoints.map((point) => (
                      <li key={point} className="leading-relaxed">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ④ 選択中コップに関連する最新重要ニュース */}
                <div className="rounded border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[13px] font-extrabold leading-snug text-foreground">
                      <span className="mr-1 text-primary">④</span>「{selectedCup.shortLabel}」に関連する最新ニュース
                    </div>
                    <Link
                      to="/news"
                      className="shrink-0 text-xs font-bold text-primary hover:underline"
                    >
                      ニュース一覧へ →
                    </Link>
                  </div>
                  {selectedCupNews.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCupNews.map((item) => (
                        <div
                          key={item.id}
                          className="rounded border border-border/80 bg-muted/25 p-2.5"
                        >
                          <div className="mb-1 flex flex-nowrap items-center justify-between gap-1 overflow-x-auto no-scrollbar text-[10px] text-muted-foreground">
                            <div className="flex shrink-0 flex-nowrap items-center gap-1">
                              <span
                                className={`shrink-0 whitespace-nowrap rounded border px-1 py-0.5 font-bold leading-none ${getDirectionBadgeClass(
                                  item.direction
                                )}`}
                              >
                                {item.directionLabel}
                              </span>
                              <span className="shrink-0 whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-1 py-0.5 font-bold leading-none text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200">
                                {item.impactTag}
                              </span>
                            </div>
                            <span className="ml-auto shrink-0 whitespace-nowrap pl-1 leading-none">
                              {item.source}
                              {item.dateLabel ? `・${item.dateLabel}` : ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openNewsModal(item)}
                            className="block w-full text-left text-[13px] font-bold leading-snug text-foreground hover:text-primary"
                          >
                            {item.title}
                          </button>
                          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                            {item.impactSummary}
                          </p>

                          <div className="mt-1.5 flex items-center justify-between gap-2 text-xxs">
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 font-semibold text-muted-foreground hover:text-primary hover:underline"
                              >
                                <span>元記事</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span />
                            )}
                            <button
                              type="button"
                              onClick={() => openNewsModal(item)}
                              className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-2 py-0.5 font-bold text-primary transition-colors hover:bg-muted"
                            >
                              <span>詳しく見る</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {newsStatus === "loading"
                        ? "関連ニュースを取得しています..."
                        : `直近のヘッドラインに「${selectedCup.shortLabel}」固有の速報は少なく、現在は左側の全体マクロニュースと金利・為替の連動で動いています。`}
                    </p>
                  )}
                </div>

                {/* セクター別モード時は代表構成銘柄を表示 */}
                {selectedCup.constituents && selectedCup.constituents.length > 0 && (
                  <div className="rounded border border-border p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-extrabold text-foreground">
                        代表銘柄の動き（クリックでチャートへ）
                      </span>
                      <Link
                        to="/themes"
                        className="shrink-0 text-xs font-bold text-primary hover:underline"
                      >
                        テーマ一覧へ →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {selectedCup.constituents.map((item) => (
                        <Link
                          key={item.code}
                          to={`/chart?code=${item.code}`}
                          className="flex items-center justify-between rounded border border-border bg-background px-2.5 py-1.5 transition-colors hover:border-foreground/40 hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <span className="mr-1.5 text-xs font-mono font-semibold text-foreground/65">
                              {item.code}
                            </span>
                            <span className="text-[13px] font-bold text-foreground">
                              {item.name}
                            </span>
                          </div>
                          <span
                            className={`ml-2 shrink-0 text-[13px] font-extrabold tabular-nums ${
                              item.changePercent > 0
                                ? "text-stock-up"
                                : item.changePercent < 0
                                ? "text-stock-down"
                                : "text-stock-unchanged"
                            }`}
                          >
                            {formatSignedPercent(item.changePercent)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* キーワード & 導線 */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedCup.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold text-foreground/80"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {mode === "global" && (
                    <button
                      type="button"
                      onClick={() => setMode("sectors")}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      日本株のセクター別コップを見る →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 計算ロジックの注釈 */}
        <p className="text-xs leading-relaxed text-foreground/70">
          ※水位（14%〜95%）は、
          {mode === "global"
            ? "世界8アセット（株・米国債・米ドル・金・原油・BTC）の騰落率（ボラティリティ補正済み）と相対強弱"
            : "各セクター代表銘柄の平均騰落率・上昇銘柄比率・売買代金規模"}
          から算出した資金集中の目安です。投資判断の最終確認はチャートや一次情報と併せて行ってください。
        </p>
      </div>

      <FlowNewsReaderModal
        item={activeArticle}
        bodyState={activeArticle?.url ? articleBodies[activeArticle.url] : undefined}
        onClose={() => setActiveArticle(null)}
      />
    </section>
  );
};

export default MoneyFlowCups;
