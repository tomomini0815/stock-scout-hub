import { Languages, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

const timelineSettings = {
  feedMode: "all_symbols",
  width: "100%",
  height: 420,
  market: "stock",
  colorTheme: "light",
  displayMode: "regular",
  isTransparent: false,
  locale: "en",
};

const timelineSrc = `https://www.tradingview-widget.com/embed-widget/timeline/?locale=en&market=stock#${encodeURIComponent(
  JSON.stringify(timelineSettings)
)}`;

const translatedTimelineSrc = `https://translate.google.com/translate?sl=en&tl=ja&u=${encodeURIComponent(
  timelineSrc
)}`;

const TradingViewMarketNews = () => (
    <section className="mt-3 flex min-h-[420px] flex-col rounded border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-table-header-bg px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="truncate text-xs font-bold text-foreground">TradingView 市況ニュース</h3>
            <div className="truncate text-xxs font-medium text-muted-foreground">Timeline Widget</div>
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-6 gap-1 rounded px-2 text-xxs font-bold"
            title="TradingView ニュースを日本語翻訳で開く"
          >
            <a href={translatedTimelineSrc} target="_blank" rel="noreferrer">
              <Languages className="h-3 w-3" />
              翻訳
            </a>
          </Button>
          <span className="rounded bg-stock-up-bg px-1.5 py-0.5 text-xxs font-bold text-stock-up">
            LIVE
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <iframe
          title="TradingView 市況ニュース"
          lang="en"
          src={timelineSrc}
          className="block h-[420px] w-full border-0"
          scrolling="no"
        />
      </div>
    </section>
);

export default TradingViewMarketNews;
