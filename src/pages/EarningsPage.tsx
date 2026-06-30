import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";
import { useLiveNewsSearch } from "@/hooks/useLiveNewsSearch";
import { ExternalLink, FileText } from "lucide-react";

const EarningsPage = () => {
  const { news, status, updatedAt } = useLiveNewsSearch({
    query: "日本株 決算 OR 業績 OR 上方修正 OR 下方修正 OR 決算発表 when:7d",
    limit: 18,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="決算速報" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          決算速報
        </h2>

        <div className="rounded border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
            <h3 className="text-xs font-bold text-foreground">実ニュースから取得した決算関連情報</h3>
            <div className="flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
              <span
                className={`rounded px-1.5 py-0.5 ${
                  status === "live"
                    ? "bg-stock-up-bg text-stock-up"
                    : status === "loading"
                    ? "bg-muted text-muted-foreground"
                    : "bg-stock-down-bg text-stock-down"
                }`}
              >
                {status === "live" ? "LIVE" : status === "loading" ? "取得中" : "取得失敗"}
              </span>
              {updatedAt && <span>更新 {updatedAt}</span>}
            </div>
          </div>

          <div className="divide-y divide-border">
            {!news.length && (
              <div className="px-3 py-6 text-xs text-muted-foreground">
                決算関連ニュースを取得しています。
              </div>
            )}
            {news.map((item) => (
              <a
                key={`${item.id}-${item.url}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="grid gap-1 px-3 py-2 transition-colors hover:bg-muted/50 md:grid-cols-[5rem_6rem_1fr_7rem]"
              >
                <div className="tabular-nums text-xxs font-medium text-muted-foreground">
                  {item.date} {item.time}
                </div>
                <div>
                  <span className="rounded bg-stock-up-bg px-1.5 py-0.5 text-xxs font-bold text-stock-up">
                    {item.category}
                  </span>
                </div>
                <div className="text-xs font-medium leading-relaxed text-foreground">
                  {item.title}
                </div>
                <div className="flex items-center justify-end gap-1 text-xxs text-muted-foreground">
                  {item.source}
                  <ExternalLink className="h-3 w-3" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default EarningsPage;
