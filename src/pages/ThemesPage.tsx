import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";
import { Layers, Flame } from "lucide-react";

const themes = [
  {
    name: "AI・人工知能",
    icon: "🤖",
    isHot: true,
    change: 3.45,
    description: "生成AI、機械学習、ディープラーニング関連",
    stocks: [
      { code: "6758", name: "ソニーグループ", change: 4.58 },
      { code: "6861", name: "キーエンス", change: 3.56 },
      { code: "9984", name: "ソフトバンクG", change: 3.44 },
    ],
  },
  {
    name: "半導体",
    icon: "💎",
    isHot: true,
    change: 2.89,
    description: "半導体製造装置、シリコンウエハー、設計",
    stocks: [
      { code: "8035", name: "東京エレクトロン", change: 3.01 },
      { code: "4063", name: "信越化学工業", change: 3.15 },
      { code: "6857", name: "アドバンテスト", change: 2.34 },
    ],
  },
  {
    name: "EV・電気自動車",
    icon: "🔋",
    change: 1.56,
    description: "EV本体、バッテリー、充電インフラ",
    stocks: [
      { code: "7203", name: "トヨタ自動車", change: 2.24 },
      { code: "6902", name: "デンソー", change: 2.67 },
      { code: "7267", name: "本田技研工業", change: -1.93 },
    ],
  },
  {
    name: "インバウンド",
    icon: "✈️",
    change: 0.89,
    description: "訪日外国人向け小売、ホテル、交通",
    stocks: [
      { code: "9603", name: "エイチ・アイ・エス", change: 1.45 },
      { code: "9064", name: "ヤマトHD", change: 0.67 },
      { code: "2670", name: "ABCマート", change: 1.12 },
    ],
  },
  {
    name: "再生可能エネルギー",
    icon: "🌱",
    change: 0.45,
    description: "太陽光、風力、水素エネルギー",
    stocks: [
      { code: "9519", name: "レノバ", change: 2.10 },
      { code: "1407", name: "ウエストHD", change: -0.56 },
      { code: "6255", name: "NPC", change: 1.34 },
    ],
  },
  {
    name: "メタバース・Web3",
    icon: "🌐",
    change: -0.34,
    description: "仮想空間、NFT、ブロックチェーン",
    stocks: [
      { code: "3659", name: "ネクソン", change: -1.23 },
      { code: "2121", name: "MIXI", change: 0.45 },
      { code: "3765", name: "ガンホー", change: -0.78 },
    ],
  },
];

const ThemesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="テーマ" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          テーマ株
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => {
            const isUp = theme.change > 0;
            return (
              <div key={theme.name} className="rounded border border-border bg-card transition-shadow hover:shadow-md cursor-pointer">
                <div className="flex items-center justify-between border-b border-border bg-table-header-bg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{theme.icon}</span>
                    <h3 className="text-xs font-bold text-foreground">{theme.name}</h3>
                    {theme.isHot && (
                      <span className="flex items-center gap-0.5 rounded bg-badge-hot px-1 py-0 text-xxs font-bold text-primary-foreground">
                        <Flame className="h-2.5 w-2.5" />
                        注目
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${isUp ? "text-stock-up" : "text-stock-down"}`}>
                    {isUp ? "+" : ""}{theme.change.toFixed(2)}%
                  </span>
                </div>
                <div className="px-3 py-2">
                  <p className="mb-2 text-xxs text-muted-foreground">{theme.description}</p>
                  <div className="space-y-1">
                    {theme.stocks.map((stock) => {
                      const stockUp = stock.change > 0;
                      return (
                        <div key={stock.code} className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xxs font-semibold text-primary">{stock.code}</span>
                            <span className="ml-1 text-xxs text-foreground">{stock.name}</span>
                          </div>
                          <span className={`text-xxs tabular-nums font-semibold ${stockUp ? "text-stock-up" : "text-stock-down"}`}>
                            {stockUp ? "+" : ""}{stock.change.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ThemesPage;
