import { Search } from "lucide-react";
import { type FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SiteHeaderProps {
  activeTab?: string;
}

const navItems = [
  { label: "トップ", path: "/" },
  { label: "市況", path: "/market" },
  { label: "銘柄・チャート", path: "/chart" },
  { label: "ランキング", path: "/ranking" },
  { label: "決算・IPO", path: "/earnings" },
  { label: "テーマ", path: "/themes" },
  { label: "スクリーニング", path: "/screening" },
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

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/chart?q=${encodeURIComponent(query)}`);
  };

  return (
    <header>
      {/* Top bar */}
      <div className="bg-header-bg text-header-foreground">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-baseline font-black tracking-[0.08em]">
              <span className="text-xl text-header-accent">株</span>
              <span className="text-lg">Navi</span>
            </Link>
            <span className="hidden text-xxs opacity-60 sm:inline">
              株式投資の総合情報サイト
            </span>
          </div>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <input
                type="text"
                placeholder="銘柄コード・名称で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-36 rounded bg-nav-bg px-2 text-xs text-nav-foreground placeholder:text-nav-foreground/50 focus:outline-none focus:ring-1 focus:ring-header-accent sm:w-52"
              />
              <button
                type="submit"
                aria-label="銘柄検索"
                className="inline-flex h-7 w-7 items-center justify-center rounded bg-nav-bg text-nav-foreground/70 transition-colors hover:bg-nav-hover hover:text-header-accent focus:outline-none focus:ring-1 focus:ring-header-accent"
              >
                <Search className="h-3.5 w-3.5" />
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
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-0 overflow-x-auto text-xs">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.path}
                  className={`block whitespace-nowrap px-3 py-2 font-medium transition-colors hover:bg-nav-hover ${
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
        </div>
      </nav>
    </header>
  );
};

export default SiteHeader;
