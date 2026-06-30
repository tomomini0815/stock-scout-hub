import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, ExternalLink, Info, Target } from "lucide-react";
import { useState } from "react";
import { type FundamentalPick } from "@/data/stockData";
import RealStockChart from "@/components/RealStockChart";
import { useLiveNewsSearch } from "@/hooks/useLiveNewsSearch";

interface FundamentalPicksProps {
  picks: FundamentalPick[];
  title?: string;
  badge?: string;
  note?: string;
  compact?: boolean;
  initialCount?: number;
  defaultOpenChartCount?: number;
}

const toneClass = {
  positive: "bg-stock-up-bg text-stock-up",
  neutral: "bg-muted text-muted-foreground",
};

const scoreCriteria = [
  "業績の質: 売上、利益、キャッシュフロー、利益率の確認できる改善度",
  "成長テーマ: AI、半導体、データセンター、通信/電力など中期需要との結びつき",
  "株価/需給: 価格帯、出来高、チャートのトレンド、移動平均との位置",
  "リスク調整: 市況循環、為替、規制、テーマ過熱、業績変動の大きさを減点",
];

const FundamentalPicks = ({
  picks,
  title = "本日のおすすめ銘柄",
  badge = "実ファンダメンタル反映",
  note = "会社公表の直近通期実績ベース",
  compact = false,
  initialCount = compact ? 4 : picks.length,
  defaultOpenChartCount = 0,
}: FundamentalPicksProps) => {
  const [expanded, setExpanded] = useState(false);
  const [openCharts, setOpenCharts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(picks.slice(0, defaultOpenChartCount).map((pick) => [pick.code, true]))
  );
  const newsQuery = `${picks.map((pick) => pick.name).join(" OR ")} 株 決算 業績 投資 when:14d`;
  const { news, status, updatedAt } = useLiveNewsSearch({
    query: newsQuery,
    limit: 12,
  });

  const visiblePicks = expanded ? picks : picks.slice(0, initialCount);

  return (
    <section className="rounded border border-border bg-card">
      <div className="flex flex-col gap-1 border-b border-border bg-table-header-bg px-3 py-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <span className="group relative inline-flex" tabIndex={0}>
            <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
            <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-72 rounded border border-border bg-popover p-2 text-left text-xxs leading-relaxed text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
              <span className="mb-1 block font-bold text-foreground">スコア判断基準</span>
              {scoreCriteria.map((item) => (
                <span key={item} className="block">・{item}</span>
              ))}
            </span>
          </span>
          <span className="rounded bg-primary px-2 py-0.5 text-xxs font-bold text-primary-foreground">
            {badge}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xxs text-muted-foreground">
          <span>{updatedAt || picks[0]?.updatedAt}更新・{note}</span>
          <span
            className={`rounded px-1.5 py-0.5 font-bold ${
              status === "live"
                ? "bg-stock-up-bg text-stock-up"
                : status === "loading"
                ? "bg-muted text-muted-foreground"
                : "bg-stock-down-bg text-stock-down"
            }`}
          >
            {status === "live" ? "LIVE材料" : status === "loading" ? "材料取得中" : "固定根拠"}
          </span>
        </div>
      </div>

      <div className={compact ? "grid grid-cols-1 gap-2 p-2 md:grid-cols-2 xl:grid-cols-4" : "divide-y divide-border"}>
        {visiblePicks.map((pick) => {
          const relatedNews = news.filter((item) => item.title.includes(pick.name) || item.title.includes(pick.code)).slice(0, 2);

          return (
          <article key={pick.code} className={`flex flex-col ${compact ? "rounded border border-border bg-background p-2" : "p-3"}`}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-xxs font-bold text-primary-foreground">
                    {pick.code}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{pick.name}</h3>
                </div>
                <p className="mt-0.5 text-xxs text-muted-foreground">{pick.market}</p>
              </div>
              <div className="text-right">
                <div className="text-xxs text-muted-foreground">スコア</div>
                <div className={`${compact ? "text-base" : "text-lg"} font-black tabular-nums text-primary`}>{pick.score}</div>
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xxs font-bold ${
                  pick.recommendation === "買い候補"
                    ? "bg-stock-up-bg text-stock-up"
                    : "bg-muted text-foreground"
                }`}
              >
                {pick.recommendation}
              </span>
              <span className="text-xxs text-muted-foreground">短期値動きより業績の質を重視</span>
            </div>

            <p className={`${compact ? "mb-2 max-h-[2.7rem] overflow-hidden" : "mb-3 min-h-[4.5rem]"} text-xs leading-relaxed text-foreground`}>{pick.thesis}</p>

            {(!compact || openCharts[pick.code]) && (
              <RealStockChart
                code={pick.code}
                name={pick.name}
                chartSymbol={pick.chartSymbol}
                chartApiSymbol={pick.chartApiSymbol}
              />
            )}

            <div className={`${compact ? "mb-2" : "mb-3"} grid grid-cols-2 gap-1.5`}>
              {pick.fundamentals.slice(0, compact ? 2 : pick.fundamentals.length).map((item) => (
                <div key={item.label} className="rounded border border-border bg-background p-2">
                  <div className="text-xxs text-muted-foreground">{item.label}</div>
                  <div
                    className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                      toneClass[item.tone ?? "neutral"]
                    }`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className={`${compact ? "mb-2" : "mb-3"} space-y-1.5`}>
              {!compact && <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-stock-up" />
                選定根拠
              </div>}
              {relatedNews.slice(0, compact ? 1 : 2).map((item) => (
                <a
                  key={`${pick.code}-${item.id}-${item.url}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded border border-stock-up/20 bg-stock-up-bg/40 px-2 py-1.5 text-xs leading-relaxed text-foreground hover:bg-stock-up-bg"
                >
                  <span className="mr-1 font-bold text-stock-up">直近材料</span>
                  {item.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 text-primary" />
                </a>
              ))}
              {pick.reasons.slice(0, compact ? 1 : pick.reasons.length).map((reason) => (
                <p key={reason} className={`${compact ? "max-h-[2.6rem] overflow-hidden rounded bg-muted/40 px-2 py-1.5" : "border-l-2 border-stock-up/40 pl-2"} text-xs leading-relaxed text-foreground`}>
                  {compact && <span className="mr-1 font-bold text-stock-up">根拠</span>}
                  {reason}
                </p>
              ))}
            </div>

            {!compact && <div className="mb-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                注意点
              </div>
              {pick.risks.map((risk) => (
                <p key={risk} className="border-l-2 border-border pl-2 text-xs leading-relaxed text-muted-foreground">
                  {risk}
                </p>
              ))}
            </div>}

            {!compact ? <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
              <div className="flex items-center gap-1.5 text-xxs text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                投資判断は自己責任
              </div>
              <a
                href={pick.source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xxs font-semibold text-primary hover:underline"
              >
                {pick.source.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div> : (
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenCharts((current) => ({
                      ...current,
                      [pick.code]: !current[pick.code],
                    }))
                  }
                  className="inline-flex items-center gap-1 text-xxs font-semibold text-primary hover:underline"
                >
                  <BarChart3 className="h-3 w-3" />
                  {openCharts[pick.code] ? "チャートを閉じる" : "チャートを見る"}
                </button>
                <a
                  href={pick.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xxs font-semibold text-primary hover:underline"
                >
                  IR
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </article>
        );
        })}
      </div>
      {compact && picks.length > initialCount && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-center gap-1 border-t border-border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/50"
        >
          {expanded ? "表示を絞る" : `さらに${picks.length - initialCount}銘柄を見る`}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </section>
  );
};

export default FundamentalPicks;
