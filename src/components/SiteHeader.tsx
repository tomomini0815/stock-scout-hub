import { Info, RefreshCw, Search } from "lucide-react";
import { type FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { readChartWatchlist } from "@/lib/chartWatchlist";

interface SiteHeaderProps {
  activeTab?: string;
}

const navItems = [
  { label: "トップ", path: "/" },
  { label: "市況・スクリーニング", path: "/market" },
  { label: "銘柄・チャート", path: "/chart" },
  { label: "銘柄診断", path: "/advisor" },
  { label: "大口・ファンド", path: "/smart-money" },
  { label: "テーマ別", path: "/themes" },
  { label: "ランキング", path: "/ranking" },
  { label: "決算・IPO", path: "/earnings" },
  { label: "ニュース", path: "/news" },
];

const SiteHeader = ({ activeTab = "トップ" }: SiteHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const todayLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    const { findSearchableStock } = await import("@/lib/stockSearch");
    const matchedStock = findSearchableStock(query);
    // 見つかった場合はコードを使用、見つからない場合はそのまま銘柄コードとして扱う
    const code = matchedStock?.code ?? query.toUpperCase();
    navigate(`/chart?q=${encodeURIComponent(code)}`);
  };
  const handleManualRefresh = () => {
    window.location.reload();
  };

  return (
    <header>
      {/* Top bar */}
      <div className="bg-header-bg text-header-foreground">
        <div className="container mx-auto flex items-center justify-between px-2.5 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="inline-flex items-baseline font-black tracking-[0.08em]">
              <span className="text-lg sm:text-xl text-header-accent">株</span>
              <span className="text-base sm:text-lg">Navi</span>
            </Link>
            <span className="hidden text-xxs opacity-60 sm:inline">
              株式投資の総合情報サイト
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <input
                type="text"
                placeholder="銘柄検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-6.5 w-28 rounded bg-nav-bg px-2 text-xxs text-nav-foreground placeholder:text-nav-foreground/50 focus:outline-none focus:ring-1 focus:ring-header-accent xs:w-36 sm:h-7 sm:w-52 sm:text-xs"
              />
              <button
                type="submit"
                aria-label="銘柄検索"
                className="inline-flex h-6.5 w-6.5 items-center justify-center rounded bg-nav-bg text-nav-foreground/70 transition-colors hover:bg-nav-hover hover:text-header-accent focus:outline-none focus:ring-1 focus:ring-header-accent sm:h-7 sm:w-7"
              >
                <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
            </form>
            <span className="hidden text-xxs opacity-60 md:inline">
              {todayLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <nav className="bg-nav-bg">
        <div className="container mx-auto flex items-center justify-between gap-2 px-2.5 sm:px-4">
          <ul className="flex min-w-0 flex-1 items-center justify-start gap-0 overflow-x-auto no-scrollbar text-xxs sm:text-xs">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.path}
                  className={`block whitespace-nowrap px-2.5 py-1.5 font-medium transition-colors hover:bg-nav-hover sm:px-3 sm:py-2 ${
                    activeTab === item.label
                      ? "border-b-2 border-header-accent text-header-accent"
                      : "text-nav-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden shrink-0 items-center gap-1.5 text-xxs font-medium text-nav-foreground/70 lg:flex">
            <Info className="h-3 w-3 text-header-accent" />
            <span>LIVE以外は約5分更新</span>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="ml-1 inline-flex h-6 items-center gap-1 rounded border border-nav-foreground/20 bg-nav-hover px-2 text-xxs font-semibold text-nav-foreground transition-colors hover:border-header-accent hover:text-header-accent"
              title="ページを再読み込みして最新データを取得"
            >
              <RefreshCw className="h-3 w-3" />
              手動更新
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default SiteHeader;
