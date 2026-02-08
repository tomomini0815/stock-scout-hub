import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";
import { FileText } from "lucide-react";

const earningsData = [
  { date: "2/10", code: "7203", name: "トヨタ自動車", period: "3Q", revenue: "34.2兆", profit: "4.2兆", forecast: "上方修正", surprise: "+8.5%" },
  { date: "2/10", code: "6758", name: "ソニーグループ", period: "3Q", revenue: "8.9兆", profit: "9,800億", forecast: "据え置き", surprise: "+2.1%" },
  { date: "2/7", code: "8035", name: "東京エレクトロン", period: "3Q", revenue: "1.8兆", profit: "4,500億", forecast: "上方修正", surprise: "+12.3%" },
  { date: "2/7", code: "6861", name: "キーエンス", period: "3Q", revenue: "7,200億", profit: "3,600億", forecast: "据え置き", surprise: "+5.6%" },
  { date: "2/6", code: "9984", name: "ソフトバンクG", period: "3Q", revenue: "5.8兆", profit: "-2,300億", forecast: "下方修正", surprise: "-15.2%" },
  { date: "2/6", code: "4063", name: "信越化学工業", period: "3Q", revenue: "1.6兆", profit: "4,800億", forecast: "上方修正", surprise: "+6.8%" },
  { date: "2/5", code: "8306", name: "三菱UFJ", period: "3Q", revenue: "6.2兆", profit: "1.2兆", forecast: "据え置き", surprise: "+1.2%" },
  { date: "2/5", code: "4502", name: "武田薬品工業", period: "3Q", revenue: "3.2兆", profit: "2,100億", forecast: "下方修正", surprise: "-8.4%" },
];

const upcomingEarnings = [
  { date: "2/12", code: "7741", name: "HOYA", period: "3Q" },
  { date: "2/12", code: "6902", name: "デンソー", period: "3Q" },
  { date: "2/13", code: "9433", name: "KDDI", period: "3Q" },
  { date: "2/13", code: "9432", name: "日本電信電話", period: "3Q" },
  { date: "2/14", code: "2914", name: "日本たばこ産業", period: "3Q" },
  { date: "2/14", code: "3382", name: "セブン&アイ", period: "3Q" },
];

const EarningsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="決算速報" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          決算速報
        </h2>

        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Latest Earnings */}
          <div className="lg:col-span-2 rounded border border-border bg-card">
            <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
              <h3 className="text-xs font-bold text-foreground">📋 最新決算発表</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">日付</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">コード</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">銘柄名</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">決算期</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">売上高</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">営業利益</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">予想修正</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">サプライズ</th>
                  </tr>
                </thead>
                <tbody>
                  {earningsData.map((item, i) => {
                    const isPositive = item.surprise.startsWith("+");
                    return (
                      <tr key={item.code} className={`border-b border-border hover:bg-muted/50 ${i % 2 === 1 ? "bg-table-stripe" : ""}`}>
                        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{item.date}</td>
                        <td className="px-2 py-1.5 font-mono font-semibold text-primary cursor-pointer hover:underline">{item.code}</td>
                        <td className="px-2 py-1.5 font-medium text-foreground">{item.name}</td>
                        <td className="px-2 py-1.5 text-center text-muted-foreground">{item.period}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{item.revenue}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{item.profit}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`rounded px-1.5 py-0.5 text-xxs font-bold ${
                            item.forecast === "上方修正" ? "bg-stock-up-bg text-stock-up" :
                            item.forecast === "下方修正" ? "bg-stock-down-bg text-stock-down" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {item.forecast}
                          </span>
                        </td>
                        <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${isPositive ? "text-stock-up" : "text-stock-down"}`}>
                          {item.surprise}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Earnings */}
          <div className="rounded border border-border bg-card">
            <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
              <h3 className="text-xs font-bold text-foreground">📅 今後の決算発表予定</h3>
            </div>
            <div className="divide-y divide-border">
              {upcomingEarnings.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50">
                  <div>
                    <span className="font-mono text-xxs font-semibold text-primary">{item.code}</span>
                    <span className="ml-1.5 text-xs font-medium text-foreground">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xxs text-muted-foreground">{item.date}</div>
                    <div className="text-xxs text-muted-foreground">{item.period}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default EarningsPage;
