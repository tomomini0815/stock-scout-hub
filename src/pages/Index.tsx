import { useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import MarketOverview from "@/components/MarketOverview";
import CandlestickChart from "@/components/CandlestickChart";
import StockDetailPanel from "@/components/StockDetailPanel";
import StockRankingTable from "@/components/StockRankingTable";
import NewsFeed from "@/components/NewsFeed";
import {
  marketIndices,
  featuredStock,
  generateCandleData,
  topGainers,
  topLosers,
  activeStocks,
  newsItems,
} from "@/data/stockData";

const Index = () => {
  const candleData = useMemo(() => generateCandleData(), []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        {/* Market Overview */}
        <div className="mb-3">
          <MarketOverview indices={marketIndices} />
        </div>

        {/* Chart + Stock Detail */}
        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <CandlestickChart
              data={candleData}
              title={featuredStock.name}
              code={featuredStock.code}
            />
          </div>
          <div className="lg:col-span-1">
            <StockDetailPanel stock={featuredStock} />
          </div>
        </div>

        {/* Rankings */}
        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <StockRankingTable
            title="📈 値上がりランキング"
            stocks={topGainers}
            type="gainers"
          />
          <StockRankingTable
            title="📉 値下がりランキング"
            stocks={topLosers}
            type="losers"
          />
          <StockRankingTable
            title="🔥 売買代金ランキング"
            stocks={activeStocks}
            type="active"
          />
        </div>

        {/* News */}
        <div className="mb-3">
          <NewsFeed news={newsItems} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
