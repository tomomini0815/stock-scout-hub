import { type MarketIndex } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { Newspaper, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface MarketTickerProps {
  indices: MarketIndex[];
}

const fallbackHeadlines = [
  "日経平均、主要企業の決算動向と為替水準をにらみながら推移",
  "半導体関連に買い、AI投資とデータセンター需要が支え",
  "金融株は金利見通しを材料に売買交錯",
  "為替市場は米金利と日銀政策への思惑で上下",
];

const decodeHtml = (value: string) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const extractRssTitles = (text: string) => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const titles = Array.from(doc.querySelectorAll("item > title"))
    .map((item) => decodeHtml(item.textContent?.trim() ?? ""))
    .filter(Boolean);

  return titles.length ? titles.slice(0, 10) : fallbackHeadlines;
};

const MarketTicker = ({ indices }: MarketTickerProps) => {
  const { indices: displayIndices, status, updatedAt } = useLiveMarketData(indices);
  const [headlines, setHeadlines] = useState(fallbackHeadlines);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  useEffect(() => {
    const controller = new AbortController();

    const loadHeadlines = async () => {
      try {
        const response = await fetch("/api/yahoo-business-rss", { signal: controller.signal });
        if (!response.ok) throw new Error("news ticker unavailable");
        const text = await response.text();
        setHeadlines(extractRssTitles(text));
      } catch {
        if (!controller.signal.aborted) setHeadlines(fallbackHeadlines);
      }
    };

    loadHeadlines();

    return () => controller.abort();
  }, []);

  return (
    <div className="overflow-hidden border-b border-border bg-card">
      <div className="flex animate-ticker-scroll gap-6 whitespace-nowrap py-1.5 px-4">
        <div className="flex items-center gap-1 text-xxs font-bold text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
            {updatedLabel ? `更新 ${updatedLabel}` : status === "cached" ? "前回値" : "更新確認中"}
          </span>
        </div>
        {[...displayIndices, ...displayIndices].map((index, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{index.name}</span>
            <span className="tabular-nums font-semibold text-foreground">
              {index.value.toLocaleString()}
            </span>
            <span
              className={`flex items-center gap-0.5 tabular-nums font-medium ${
                index.change >= 0 ? "text-stock-up" : "text-stock-down"
              }`}
            >
              {index.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {index.change >= 0 ? "+" : ""}
              {index.change.toFixed(2)} ({index.change >= 0 ? "+" : ""}
              {index.changePercent.toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 bg-muted/30">
        <div className="flex animate-ticker-scroll gap-8 whitespace-nowrap px-4 py-1.5">
          <div className="flex items-center gap-1 text-xxs font-bold text-primary">
            <Newspaper className="h-3 w-3" />
            NEWS
          </div>
          {[...headlines, ...headlines].map((headline, i) => (
            <div key={`${headline}-${i}`} className="flex items-center gap-2 text-xxs text-foreground">
              <span className="h-1 w-1 rounded-full bg-primary/70" />
              <span>{headline}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketTicker;
