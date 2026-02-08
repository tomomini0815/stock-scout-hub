import { type NewsItem } from "@/data/stockData";
import { Flame, Sparkles } from "lucide-react";

interface NewsFeedProps {
  news: NewsItem[];
}

const NewsFeed = ({ news }: NewsFeedProps) => {
  const categoryColors: Record<string, string> = {
    市況: "bg-primary text-primary-foreground",
    決算: "bg-stock-up text-primary-foreground",
    企業: "bg-muted text-muted-foreground",
    "M&A": "bg-header-accent text-foreground",
    金融: "bg-stock-down text-primary-foreground",
    医薬品: "bg-muted text-foreground",
  };

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-table-header-bg px-3 py-1.5">
        <h3 className="text-xs font-bold text-foreground">最新ニュース</h3>
        <button className="text-xxs text-muted-foreground hover:text-foreground transition-colors">
          一覧を見る →
        </button>
      </div>
      <div className="divide-y divide-border">
        {news.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <span className="mt-0.5 shrink-0 tabular-nums text-xxs font-medium text-muted-foreground">
              {item.time}
            </span>
            <span
              className={`mt-0.5 shrink-0 rounded px-1 py-0 text-xxs font-bold ${
                categoryColors[item.category] || "bg-muted text-muted-foreground"
              }`}
            >
              {item.category}
            </span>
            <span className="flex-1 text-xs leading-relaxed text-foreground hover:text-primary">
              {item.title}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {item.isHot && (
                <span className="flex items-center gap-0.5 rounded bg-badge-hot px-1 py-0 text-xxs font-bold text-primary-foreground">
                  <Flame className="h-2.5 w-2.5" />
                  注目
                </span>
              )}
              {item.isNew && (
                <span className="flex items-center gap-0.5 rounded bg-badge-new px-1 py-0 text-xxs font-bold text-primary-foreground">
                  <Sparkles className="h-2.5 w-2.5" />
                  NEW
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
