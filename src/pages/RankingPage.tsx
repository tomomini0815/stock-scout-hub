import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import StockRankingTable from "@/components/StockRankingTable";
import { marketIndices, topGainers, topLosers, activeStocks } from "@/data/stockData";
import { Trophy } from "lucide-react";

const tabs = [
  { key: "gainers", label: "📈 値上がり", stocks: topGainers, type: "gainers" as const },
  { key: "losers", label: "📉 値下がり", stocks: topLosers, type: "losers" as const },
  { key: "active", label: "🔥 売買代金", stocks: activeStocks, type: "active" as const },
];

const RankingPage = () => {
  const [activeTab, setActiveTab] = useState("gainers");
  const current = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="ランキング" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Trophy className="h-4 w-4 text-header-accent" />
          ランキング
        </h2>

        {/* Tab selector */}
        <div className="mb-3 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Full width ranking table */}
        <StockRankingTable
          title={`${current.label}ランキング`}
          stocks={current.stocks}
          type={current.type}
        />

        {/* All rankings side by side */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {tabs.map((tab) => (
            <StockRankingTable
              key={tab.key}
              title={`${tab.label}ランキング`}
              stocks={tab.stocks.slice(0, 5)}
              type={tab.type}
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default RankingPage;
