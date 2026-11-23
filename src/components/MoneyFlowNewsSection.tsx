import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { marketIndices } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { useLiveNewsSearch } from "@/hooks/useLiveNewsSearch";
import {
  analyzeFlowNews,
  buildGlobalMoneyFlow,
  formatSignedPercent,
  type FlowNewsImpact,
  type NewsImpactDirection,
} from "@/lib/moneyFlowAnalysis";

const MONEY_FLOW_NEWS_QUERY =
  "日経平均 OR TOPIX OR 米国株 OR NASDAQ OR FRB OR 日銀 OR 米国債 OR 米金利 OR ドル円 OR 半導体 OR AI OR 防衛 when:3d";

const MONEY_FLOW_CATALYST_QUERY =
  "(トランプ OR 関税 OR 輸出規制 OR 半導体規制 OR エヌビディア OR NVIDIA OR スパイ OR 制裁 OR 訴訟 OR 地政学 OR FOMC OR 日銀) (株 OR 市場 OR 半導体 OR 為替 OR 金利) when:5d";

const MONEY_FLOW_CRYPTO_COMMODITY_QUERY =
  "ビットコイン OR BTC OR 暗号資産 OR 仮想通貨 OR 金価格 OR 金先物 OR 金相場 OR NY金 OR 原油 OR WTI when:5d";

type ArticleSummaryState =
  | { status: "loading"; summary?: string }
  | { status: "ready"; summary: string }
  | { status: "error"; summary?: string };

const getAssetBadgeClass = (label: string) => {
  switch (label) {
    case "日本株":
      return "border border-slate-300 bg-slate-100 text-slate-800";
    case "米国テック":
      return "border border-indigo-200 bg-indigo-50 text-indigo-700";
    case "米国優良株":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "米国債":
      return "border border-blue-200 bg-blue-50 text-blue-700";
    case "米ドル":
      return "border border-cyan-200 bg-cyan-50 text-cyan-800";
    case "ゴールド":
      return "border border-amber-200 bg-amber-50 text-amber-800";
    case "原油":
      return "border border-orange-200 bg-orange-50 text-orange-800";
    case "仮想通貨":
      return "border border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border border-slate-300 bg-slate-100 text-slate-700";
  }
};

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

const getRegimeBadgeClass = (tone: "risk-on" | "risk-off" | "rotation" | "neutral") => {
  switch (tone) {
    case "risk-on":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
    case "risk-off":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300";
    case "rotation":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "border-border bg-muted text-foreground/80";
  }
};

const MoneyFlowNewsSection = () => {
  const { indices, macroAssets, status: marketStatus } = useLiveMarketData(marketIndices);
  const isLive = marketStatus === "live";
  const [selectedCupId, setSelectedCupId] = useState<string>("all");
  const [articleSummaries, setArticleSummaries] = useState<Record<string, ArticleSummaryState>>({});

  const { news: macroNews, status: macroStatus } = useLiveNewsSearch({
    query: MONEY_FLOW_NEWS_QUERY,
    limit: 24,
    cacheKey: "stock-scout-money-flow-news-v1",
    cacheMs: 1000 * 60 * 15,
  });
  const { news: catalystNews, status: catalystStatus } = useLiveNewsSearch({
    query: MONEY_FLOW_CATALYST_QUERY,
    limit: 20,
    cacheKey: "stock-scout-money-flow-catalyst-v1",
    cacheMs: 1000 * 60 * 15,
  });
  const { news: altNews, status: altStatus } = useLiveNewsSearch({
    query: MONEY_FLOW_CRYPTO_COMMODITY_QUERY,
    limit: 24,
    cacheKey: "stock-scout-money-flow-alt-v2",
    cacheMs: 1000 * 60 * 15,
  });

  const flowSnapshot = useMemo(
    () => buildGlobalMoneyFlow(indices, macroAssets, "1D"),
    [indices, macroAssets]
  );

  const combinedNews = useMemo(
    () => [...catalystNews, ...macroNews, ...altNews],
    [catalystNews, macroNews, altNews]
  );

  const { allFlowNews, newsByCupId } = useMemo(() => {
    const { newsByCupId: byCup } = analyzeFlowNews(combinedNews, flowSnapshot.cups);
    // 全コップの関連ニュースを重複排除し、新しい順に並べる
    const seen = new Set<string>();
    const merged: FlowNewsImpact[] = [];
    for (const cup of flowSnapshot.cups) {
      for (const item of byCup[cup.id] ?? []) {
        const key = item.url || item.title;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    }
    merged.sort((a, b) =>
      b.publishedAtMs !== a.publishedAtMs
        ? b.publishedAtMs - a.publishedAtMs
        : b.importanceScore - a.importanceScore
    );
    return { allFlowNews: merged, newsByCupId: byCup };
  }, [combinedNews, flowSnapshot.cups]);

  const visibleItems = useMemo(() => {
    if (selectedCupId === "all") return allFlowNews;
    return newsByCupId[selectedCupId] ?? [];
  }, [allFlowNews, newsByCupId, selectedCupId]);

  const isLoading =
    macroStatus === "loading" &&
    catalystStatus === "loading" &&
    altStatus === "loading" &&
    allFlowNews.length === 0;

  useEffect(() => {
    const targets = visibleItems.filter((item) => item.url && !articleSummaries[item.url]).slice(0, 8);
    if (!targets.length) return;

    setArticleSummaries((prev) => ({
      ...prev,
      ...Object.fromEntries(targets.map((item) => [item.url as string, { status: "loading" as const }])),
    }));

    targets.forEach((item) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 9500);
      fetch(`/api/article-summary?url=${encodeURIComponent(item.url as string)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((payload) => {
          const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
          setArticleSummaries((prev) => ({
            ...prev,
            [item.url as string]: summary ? { status: "ready", summary } : { status: "error" },
          }));
        })
        .catch(() => {
          setArticleSummaries((prev) => ({
            ...prev,
            [item.url as string]: { status: "error" },
          }));
        })
        .finally(() => window.clearTimeout(timeout));
    });
  }, [visibleItems, articleSummaries]);

  const topCups = useMemo(
    () => [...flowSnapshot.cups].sort((a, b) => a.rank - b.rank).slice(0, 2),
    [flowSnapshot.cups]
  );

  return (
    <section className="mb-3 rounded border border-border bg-card">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold text-foreground">資金フロー関連ニュース</h3>
            <span
              className={`rounded border px-2 py-0.5 text-xxs font-bold ${getRegimeBadgeClass(
                flowSnapshot.regimeTone
              )}`}
            >
              {flowSnapshot.regimeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xxs">
            <span className="text-muted-foreground">
              資金集中:{" "}
              {topCups.map((cup, idx) => (
                <span key={cup.id}>
                  {idx > 0 && " / "}
                  <strong className="text-foreground">{cup.shortLabel}</strong>{" "}
                  <span
                    className={`tabular-nums font-bold ${
                      cup.changePercent >= 0 ? "text-stock-up" : "text-stock-down"
                    }`}
                  >
                    {formatSignedPercent(cup.changePercent)}
                  </span>
                </span>
              ))}
            </span>
            <Link
              to="/"
              className="rounded border border-border bg-background px-2 py-0.5 font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
            >
              資金フローカップを見る
            </Link>
          </div>
        </div>

        {isLive && (
          <span className="inline-flex shrink-0 self-start items-center gap-1 whitespace-nowrap rounded border border-red-600 bg-white px-1.5 py-0.5 text-xxs font-bold text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            LIVE
          </span>
        )}
      </div>

      {/* アセット別フィルタタブ */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-muted/20 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setSelectedCupId("all")}
          className={`shrink-0 rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
            selectedCupId === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground/80 hover:bg-muted"
          }`}
        >
          すべて（{allFlowNews.length}）
        </button>
        {flowSnapshot.cups.map((cup) => {
          const count = (newsByCupId[cup.id] ?? []).length;
          const active = selectedCupId === cup.id;
          return (
            <button
              key={cup.id}
              type="button"
              onClick={() => setSelectedCupId(cup.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground/80 hover:bg-muted"
              }`}
            >
              <span>{cup.shortLabel}</span>
              <span
                className={`tabular-nums ${
                  active
                    ? "text-primary-foreground/90"
                    : cup.changePercent >= 0
                      ? "text-stock-up"
                      : "text-stock-down"
                }`}
              >
                {formatSignedPercent(cup.changePercent)}
              </span>
              <span
                className={`rounded px-1 text-[10px] ${
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ニュース一覧（全件スクロール表示） */}
      {isLoading ? (
        <div className="px-3 py-5 text-center text-xs text-muted-foreground">
          資金フロー関連ニュースを取得しています...
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="px-3 py-5 text-center text-xs text-muted-foreground">
          この資産に関連する直近ニュースはまだ取得されていません。
        </div>
      ) : (
        <div className="always-scrollbar max-h-[300px] overscroll-contain sm:max-h-[320px]">
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-y-0">
            {visibleItems.map((item, idx) => {
              const summaryState = item.url ? articleSummaries[item.url] : undefined;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block px-3 py-2.5 transition-colors hover:bg-muted/40 ${
                    idx >= 2 ? "md:border-t md:border-border" : ""
                  } ${idx % 2 === 1 ? "md:border-l md:border-border" : ""}`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {item.dateLabel && (
                      <span className="shrink-0 tabular-nums text-xxs font-medium text-muted-foreground">
                        {item.dateLabel}
                      </span>
                    )}
                    {item.matchedCupLabels.map((label) => (
                      <span
                        key={label}
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xxs font-bold ${getAssetBadgeClass(
                          label
                        )}`}
                      >
                        {label}
                      </span>
                    ))}
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-xxs font-bold ${getDirectionBadgeClass(
                        item.direction
                      )}`}
                    >
                      {item.directionLabel}
                    </span>
                    {item.url && (
                      <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </div>

                  <div className="text-xs font-bold leading-relaxed text-foreground hover:text-primary">
                    {item.title}
                  </div>

                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {summaryState?.status === "loading"
                      ? "記事本文を取得して要約しています。"
                      : summaryState?.status === "ready"
                        ? summaryState.summary
                        : item.impactSummary}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xxs">
                    <span className="font-semibold text-foreground/75">
                      材料: {item.impactTag}
                    </span>
                    <span className="text-muted-foreground">出典: {item.source}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default MoneyFlowNewsSection;

