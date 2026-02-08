import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices, newsItems } from "@/data/stockData";
import { Newspaper, Flame, Sparkles } from "lucide-react";

const categories = ["すべて", "市況", "決算", "企業", "M&A", "金融", "医薬品"];

const extendedNews = [
  ...newsItems,
  { id: 13, time: "12:20", title: "半導体関連株が軒並み上昇、AI需要期待が継続", category: "市況", isHot: true },
  { id: 14, time: "12:00", title: "HOYA、コンタクトレンズ事業の拡大戦略を発表", category: "企業" },
  { id: 15, time: "11:45", title: "三井不動産、都心再開発プロジェクトの概要を公表", category: "企業" },
  { id: 16, time: "11:30", title: "デンソー、自動運転技術で米テック企業と提携", category: "企業", isNew: true },
  { id: 17, time: "11:15", title: "アステラス製薬、がん免疫療法の新薬承認申請へ", category: "医薬品" },
  { id: 18, time: "11:00", title: "日経平均、前場は400円超の上昇で39000円台を回復", category: "市況" },
  { id: 19, time: "10:45", title: "任天堂、次世代ゲーム機の発売時期について言及", category: "企業", isHot: true },
  { id: 20, time: "10:30", title: "みずほFG、フィンテック子会社の設立を発表", category: "金融", isNew: true },
];

const NewsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("すべて");

  const filtered = selectedCategory === "すべて"
    ? extendedNews
    : extendedNews.filter((n) => n.category === selectedCategory);

  const categoryColors: Record<string, string> = {
    市況: "bg-primary text-primary-foreground",
    決算: "bg-stock-up text-primary-foreground",
    企業: "bg-muted text-muted-foreground",
    "M&A": "bg-header-accent text-foreground",
    金融: "bg-stock-down text-primary-foreground",
    医薬品: "bg-muted text-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="ニュース" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-4 py-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Newspaper className="h-4 w-4 text-primary" />
          ニュース
        </h2>

        {/* Category Filter */}
        <div className="mb-3 flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* News List */}
        <div className="rounded border border-border bg-card">
          <div className="border-b border-border bg-table-header-bg px-3 py-1.5">
            <h3 className="text-xs font-bold text-foreground">
              {selectedCategory === "すべて" ? "最新ニュース" : `${selectedCategory}ニュース`}（{filtered.length}件）
            </h3>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <span className="mt-0.5 shrink-0 tabular-nums text-xxs font-medium text-muted-foreground">
                  {item.time}
                </span>
                <span
                  className={`mt-0.5 shrink-0 rounded px-1 py-0 text-xxs font-bold ${
                    categoryColors[item.category] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.category}
                </span>
                <span className="flex-1 text-xs leading-relaxed text-foreground hover:text-primary">
                  {item.title}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {item.isHot && (
                    <span className="flex items-center gap-0.5 rounded bg-badge-hot px-1 py-0 text-xxs font-bold text-primary-foreground">
                      <Flame className="h-2.5 w-2.5" />
                      注目
                    </span>
                  )}
                  {item.isNew && (
                    <span className="flex items-center gap-0.5 rounded bg-badge-new px-1 py-0 text-xxs font-bold text-primary-foreground">
                      <Sparkles className="h-2.5 w-2.5" />
                      NEW
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default NewsPage;
