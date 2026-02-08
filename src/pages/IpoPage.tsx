import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";
import { Rocket, Calendar, TrendingUp } from "lucide-react";

const upcomingIpos = [
  { code: "未定", company: "AIソリューションズ", market: "グロース", sector: "情報・通信", listingDate: "2/18", priceRange: "2,200〜2,600", broker: "野村證券" },
  { code: "未定", company: "グリーンエナジーテック", market: "グロース", sector: "電気機器", listingDate: "2/20", priceRange: "1,800〜2,200", broker: "大和証券" },
  { code: "未定", company: "メディカルDX", market: "グロース", sector: "サービス業", listingDate: "2/25", priceRange: "3,000〜3,500", broker: "みずほ証券" },
  { code: "未定", company: "サステナブルフーズ", market: "スタンダード", sector: "食料品", listingDate: "2/27", priceRange: "1,500〜1,800", broker: "SMBC日興証券" },
];

const recentIpos = [
  { code: "5765", company: "クラウドセキュア", market: "グロース", listingDate: "2/5", offerPrice: 2400, firstPrice: 3850, currentPrice: 3620, change: -5.97 },
  { code: "5764", company: "EV充電ネットワーク", market: "グロース", listingDate: "2/3", offerPrice: 1800, firstPrice: 2650, currentPrice: 2890, change: 9.06 },
  { code: "5763", company: "ロボティクスラボ", market: "グロース", listingDate: "1/30", offerPrice: 3200, firstPrice: 4100, currentPrice: 3980, change: -2.93 },
  { code: "5762", company: "フィンテックハブ", market: "グロース", listingDate: "1/28", offerPrice: 2000, firstPrice: 2980, currentPrice: 3450, change: 15.77 },
  { code: "5761", company: "バイオイノベーション", market: "グロース", listingDate: "1/24", offerPrice: 4500, firstPrice: 5200, currentPrice: 4100, change: -21.15 },
];

const IpoPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="IPO" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Rocket className="h-4 w-4 text-header-accent" />
          IPO情報
        </h2>

        {/* Upcoming IPOs */}
        <div className="mb-3 rounded border border-border bg-card">
          <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
            <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
              <Calendar className="h-3 w-3" />
              今後のIPO予定
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">上場日</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">企業名</th>
                  <th className="px-3 py-1.5 text-center font-semibold text-muted-foreground">市場</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">業種</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">想定価格帯</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">主幹事</th>
                </tr>
              </thead>
              <tbody>
                {upcomingIpos.map((ipo, i) => (
                  <tr key={ipo.company} className={`border-b border-border hover:bg-muted/50 ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                    <td className="px-3 py-2 tabular-nums font-semibold text-primary">{ipo.listingDate}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{ipo.company}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xxs font-bold">{ipo.market}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{ipo.sector}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{ipo.priceRange}円</td>
                    <td className="px-3 py-2 text-muted-foreground">{ipo.broker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent IPOs */}
        <div className="rounded border border-border bg-card">
          <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
            <h3 className="flex items-center gap-1 text-xs font-bold text-foreground">
              <TrendingUp className="h-3 w-3" />
              直近上場銘柄のパフォーマンス
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">コード</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">企業名</th>
                  <th className="px-3 py-1.5 text-center font-semibold text-muted-foreground">上場日</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">公募価格</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">初値</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">現在値</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">初値比</th>
                </tr>
              </thead>
              <tbody>
                {recentIpos.map((ipo, i) => {
                  const isUp = ipo.change > 0;
                  return (
                    <tr key={ipo.code} className={`border-b border-border hover:bg-muted/50 ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                      <td className="px-3 py-2 font-mono font-semibold text-primary cursor-pointer hover:underline">{ipo.code}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{ipo.company}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{ipo.listingDate}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{ipo.offerPrice.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{ipo.firstPrice.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{ipo.currentPrice.toLocaleString()}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                        {isUp ? "+" : ""}{ipo.change.toFixed(2)}%
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

export default IpoPage;
