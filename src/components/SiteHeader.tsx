import { Search } from "lucide-react";
import { useState } from "react";

const SiteHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header>
      {/* Top bar */}
      <div className="bg-header-bg text-header-foreground">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-header-accent">株</span>ナビ
            </h1>
            <span className="hidden text-xxs opacity-60 sm:inline">
              株式投資の総合情報サイト
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="銘柄コード・名称で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-36 rounded bg-nav-bg pl-7 pr-2 text-xs text-nav-foreground placeholder:text-nav-foreground/50 focus:outline-none focus:ring-1 focus:ring-header-accent sm:w-52"
              />
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-nav-foreground/50" />
            </div>
            <span className="hidden text-xxs opacity-60 md:inline">
              2026年2月8日(土) 15:30
            </span>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <nav className="bg-nav-bg">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-0 overflow-x-auto text-xs">
            {[
              "トップ",
              "市況",
              "個別銘柄",
              "ランキング",
              "決算速報",
              "IPO",
              "テーマ",
              "スクリーニング",
              "チャート",
              "ニュース",
            ].map((item, i) => (
              <li key={item}>
                <button
                  className={`whitespace-nowrap px-3 py-2 font-medium transition-colors hover:bg-nav-hover ${
                    i === 0
                      ? "border-b-2 border-header-accent text-header-accent"
                      : "text-nav-foreground"
                  }`}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default SiteHeader;
