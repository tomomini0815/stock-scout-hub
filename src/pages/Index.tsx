import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import MarketOverview from "@/components/MarketOverview";
import StockRankingTable from "@/components/StockRankingTable";
import NewsFeed from "@/components/NewsFeed";
import TradingViewMarketNews from "@/components/TradingViewMarketNews";
import FundamentalPicks from "@/components/FundamentalPicks";
import TrendSignalSection from "@/components/TrendSignalSection";
import {
  marketIndices,
  stockUniverse,
  fundamentalPicks,
  futureGrowthPicks,
} from "@/data/stockData";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="トップ" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto space-y-3 px-4 py-3">
        <div>
          <MarketOverview indices={marketIndices} />
        </div>

        <div>
          <TrendSignalSection
            stocks={stockUniverse}
            growthPicks={futureGrowthPicks}
            dailyPicks={fundamentalPicks}
          />
        </div>

        <div>
          <FundamentalPicks
            picks={fundamentalPicks}
            title="本日のおすすめ銘柄"
            compact
            initialCount={4}
            defaultOpenChartCount={4}
          />
        </div>

        <div>
          <FundamentalPicks
            picks={futureGrowthPicks}
            title="今後の注目銘柄"
            badge="低〜中価格帯も重視"
            note="AI・半導体後工程・データセンター・通信/電力インフラを市場調査"
            compact
            initialCount={4}
            defaultOpenChartCount={4}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <StockRankingTable
            title="📈 値上がりランキング"
            stocks={stockUniverse}
            type="gainers"
            limit={5}
          />
          <StockRankingTable
            title="📉 値下がりランキング"
            stocks={stockUniverse}
            type="losers"
            limit={5}
          />
          <StockRankingTable
            title="🔥 売買代金ランキング"
            stocks={stockUniverse}
            type="active"
            limit={5}
          />
        </div>

        <div>
          <NewsFeed />
          <TradingViewMarketNews />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
