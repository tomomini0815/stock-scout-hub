import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import MarketOverview from "@/components/MarketOverview";
import RealStockChart from "@/components/RealStockChart";
import { marketIndices, type StockData } from "@/data/stockData";
import { useLiveStockQuotes } from "@/hooks/useLiveStockQuote";
import { Globe, TrendingUp } from "lucide-react";

const sectorRepresentatives: Array<StockData & { sector: string }> = [
  { sector: "電気機器", code: "6758", name: "ソニーG", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "輸送用機器", code: "7203", name: "トヨタ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "精密機器", code: "6861", name: "キーエンス", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "化学", code: "4063", name: "信越化学", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "銀行業", code: "8306", name: "三菱UFJ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "医薬品", code: "4502", name: "武田薬品", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "小売業", code: "3382", name: "セブン&アイ", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
  { sector: "通信業", code: "9433", name: "KDDI", market: "プライム", price: 0, change: 0, changePercent: 0, volume: 0, open: 0, high: 0, low: 0, previousClose: 0 },
];

const MarketPage = () => {
  const { stocks: liveSectors, status, updatedAt } = useLiveStockQuotes(sectorRepresentatives);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

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

        <div className="mb-3">
          <RealStockChart
            code="N225"
            name="日経平均株価"
            chartSymbol="NIKKEI:NI225"
            chartApiSymbol="^N225"
          />
        </div>

        <div className="mb-3">
          <div className="rounded border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-table-header-bg px-3 py-1.5">
              <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
                <TrendingUp className="h-3 w-3" />
                業種代表銘柄の騰落率
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
                  {status === "live" ? "LIVE" : status === "loading" ? "取得中" : "固定値"}
                </span>
                {updatedLabel && <span>更新 {updatedLabel}</span>}
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">業種</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">代表銘柄</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">株価</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">騰落率</th>
                </tr>
              </thead>
              <tbody>
                {liveSectors.map((stock, i) => {
                  const isUp = stock.changePercent > 0;
                  return (
                    <tr key={stock.code} className={`border-b border-border ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                      <td className="px-3 py-1.5 font-medium text-foreground">{sectorRepresentatives[i]?.sector}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{stock.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-foreground">
                        {stock.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
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
