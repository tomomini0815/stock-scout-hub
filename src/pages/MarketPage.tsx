import { useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import MarketOverview from "@/components/MarketOverview";
import CandlestickChart from "@/components/CandlestickChart";
import { marketIndices, generateCandleData } from "@/data/stockData";
import { Globe, DollarSign, TrendingUp } from "lucide-react";

const sectorPerformance = [
  { name: "電気機器", change: 2.34, representative: "ソニーG" },
  { name: "輸送用機器", change: 1.89, representative: "トヨタ" },
  { name: "精密機器", change: 1.56, representative: "キーエンス" },
  { name: "化学", change: 1.12, representative: "信越化学" },
  { name: "銀行業", change: 0.45, representative: "三菱UFJ" },
  { name: "医薬品", change: -1.23, representative: "武田薬品" },
  { name: "食料品", change: -0.87, representative: "味の素" },
  { name: "小売業", change: -2.15, representative: "セブン&アイ" },
  { name: "通信業", change: -0.98, representative: "KDDI" },
  { name: "不動産業", change: 0.67, representative: "三井不動産" },
];

const worldIndices = [
  { name: "上海総合", value: 3089.45, change: 15.23, changePercent: 0.50 },
  { name: "ハンセン", value: 20312.67, change: -89.45, changePercent: -0.44 },
  { name: "FTSE100", value: 7654.32, change: 34.56, changePercent: 0.45 },
  { name: "DAX", value: 17234.56, change: 123.45, changePercent: 0.72 },
];

const MarketPage = () => {
  const nikkeiCandle = useMemo(() => generateCandleData(), []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="市況" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          市況概況
        </h2>

        <div className="mb-3">
          <MarketOverview indices={marketIndices} />
        </div>

        {/* Nikkei Chart */}
        <div className="mb-3">
          <CandlestickChart data={nikkeiCandle} title="日経平均株価" code="N225" />
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* World Indices */}
          <div className="rounded border border-border bg-card">
            <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
              <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
                <DollarSign className="h-3 w-3" />
                海外主要指数
              </h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">指数</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">値</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">前日比</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">騰落率</th>
                </tr>
              </thead>
              <tbody>
                {worldIndices.map((idx, i) => {
                  const isUp = idx.change > 0;
                  return (
                    <tr key={idx.name} className={`border-b border-border ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                      <td className="px-3 py-1.5 font-medium text-foreground">{idx.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{idx.value.toLocaleString()}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}{idx.change.toFixed(2)}
                      </td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}{idx.changePercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sector Performance */}
          <div className="rounded border border-border bg-card">
            <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
              <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
                <TrendingUp className="h-3 w-3" />
                業種別騰落率
              </h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">業種</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">代表銘柄</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">騰落率</th>
                </tr>
              </thead>
              <tbody>
                {sectorPerformance.map((sector, i) => {
                  const isUp = sector.change > 0;
                  return (
                    <tr key={sector.name} className={`border-b border-border ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                      <td className="px-3 py-1.5 font-medium text-foreground">{sector.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{sector.representative}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}{sector.change.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default MarketPage;
