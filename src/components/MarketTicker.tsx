import { type MarketIndex } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { Newspaper, TrendingDown, TrendingUp } from "lucide-react";
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

const logoLabelForIndex = (name: string) => {
  if (/日経/.test(name)) return "N";
  if (/TOPIX/.test(name)) return "T";
  if (/ダウ/.test(name)) return "D";
  if (/NASDAQ/.test(name)) return "Q";
  if (/S&P/.test(name)) return "S";
  if (/GOLD/.test(name)) return "G";
  if (/BTC/.test(name)) return "₿";
  if (/USD|JPY/.test(name)) return "FX";
  return "TV";
};


const MarketTicker = ({ indices }: MarketTickerProps) => {
  const { indices: displayIndices } = useLiveMarketData(indices);
  const [headlines, setHeadlines] = useState(fallbackHeadlines);

  useEffect(() => {
    const controller = new AbortController();

    const loadHeadlines = async () => {
      try {
        const response = await fetch("/api/news-feeds?source=yahoo", { signal: controller.signal });
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
      <div className="flex animate-ticker-scroll items-center gap-4 whitespace-nowrap bg-background px-4 py-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
          <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded bg-primary/10 text-primary">
            <TrendingUp className="h-3 w-3" />
          </span>
          <span className="font-bold text-foreground">TradingView</span>
        </div>
        {[...displayIndices, ...displayIndices].map((index, i) => {
          const isUp = index.change >= 0;

          return (
            <div key={`${index.name}-${i}`} className="flex items-center gap-1.5 text-[11px]">
              <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 border border-primary/20">
                <span className="text-[8px] font-black text-primary">
                  {logoLabelForIndex(index.name)}
                </span>
              </span>
              <span className="font-medium text-foreground">{index.name}</span>
              <span className="tabular-nums font-semibold text-foreground">
                {index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center gap-0.5 tabular-nums font-medium ${
                  isUp ? "text-stock-up" : "text-stock-down"
                }`}
              >
                {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {isUp ? "+" : ""}
                {index.change.toFixed(2)}
                <span>
                  ({isUp ? "+" : ""}
                  {index.changePercent.toFixed(2)}%)
                </span>
              </span>
            </div>
          );
        })}
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
