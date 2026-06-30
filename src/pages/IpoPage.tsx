import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";
import { useLiveNewsSearch } from "@/hooks/useLiveNewsSearch";
import { Calendar, ExternalLink, Rocket } from "lucide-react";

const IpoPage = () => {
  const { news, status, updatedAt } = useLiveNewsSearch({
    query: "IPO 新規上場 東証 公開価格 初値 上場承認 when:30d",
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="IPO" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Rocket className="h-4 w-4 text-header-accent" />
          IPO情報
        </h2>

        <div className="rounded border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
            <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
              <Calendar className="h-3 w-3" />
              実ニュースから取得したIPO関連情報
            </h3>
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
                IPO関連ニュースを取得しています。
              </div>
            )}
            {news.map((item) => (
              <a
                key={`${item.id}-${item.url}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="grid gap-1 px-3 py-2 transition-colors hover:bg-muted/50 md:grid-cols-[5rem_1fr_8rem]"
              >
                <div className="tabular-nums text-xxs font-medium text-muted-foreground">
                  {item.date} {item.time}
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

export default IpoPage;
