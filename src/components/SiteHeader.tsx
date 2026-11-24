import {
  BarChart3,
  Bot,
  Calendar,
  ChevronRight,
  Flame,
  Globe,
  Home,
  Info,
  Layers,
  Menu,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SiteHeaderProps {
  activeTab?: string;
}

const navItems = [
  { label: "トップ", path: "/", icon: Home, desc: "市況概況・シグナル・注目銘柄" },
  { label: "市況・スクリーニング", path: "/market", icon: Globe, desc: "指数・セクター・スクリーニング" },
  { label: "銘柄・チャート", path: "/chart", icon: BarChart3, desc: "高機能チャート・テクニカル分析" },
  { label: "チャートパターン", path: "/patterns", icon: TrendingUp, desc: "反転・継続20パターンの解説" },
  { label: "銘柄診断", path: "/advisor", icon: Bot, desc: "シミュレーター・スタイル診断" },
  { label: "大口・ファンド", path: "/smart-money", icon: ShieldAlert, desc: "EDINET大量保有・機関投資家動向" },
  { label: "テーマ別", path: "/themes", icon: Layers, desc: "AI・半導体・国策テーマ銘柄" },
  { label: "ランキング", path: "/ranking", icon: Flame, desc: "値上がり・値下がり・売買代金" },
  { label: "決算・IPO", path: "/earnings", icon: Calendar, desc: "決算発表予定・IPO新規上場情報" },
  { label: "ニュース", path: "/news", icon: Newspaper, desc: "速報・主要経済ニュースまとめ" },
];

const SiteHeader = ({ activeTab = "トップ" }: SiteHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    const code = matchedStock?.code ?? query.toUpperCase();
    navigate(`/chart?q=${encodeURIComponent(code)}`);
    setIsMobileMenuOpen(false);

    // すでに /chart にいる場合や自動スクロールを即時連動させるためのイベント通知
    window.dispatchEvent(
      new CustomEvent("stock-search-navigate", { detail: { code } })
    );
  };

  const handleManualRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Top bar */}
      <header className="bg-header-bg text-header-foreground">
        <div className="container mx-auto flex items-center justify-between px-2.5 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="inline-flex items-baseline font-black tracking-[0.08em]">
              <span className="text-lg sm:text-xl text-header-accent">株</span>
              <span className="text-base sm:text-lg">Navi</span>
            </Link>
            <span className="hidden text-xs opacity-90 sm:inline">
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
                className="h-9 w-32 rounded bg-nav-bg px-2.5 text-base text-nav-foreground placeholder:text-xs placeholder:text-nav-foreground/75 focus:outline-none focus:ring-1 focus:ring-header-accent sm:h-8 sm:w-56 sm:text-xs"
              />
              <button
                type="submit"
                aria-label="銘柄検索"
                className="inline-flex h-9 w-9 items-center justify-center rounded bg-nav-bg text-nav-foreground/90 transition-colors hover:bg-nav-hover hover:text-header-accent focus:outline-none focus:ring-1 focus:ring-header-accent sm:h-8 sm:w-8"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            <span className="hidden text-xs opacity-90 md:inline">
              {todayLabel}
            </span>

            {/* モバイル用ハンバーガーメニューボタン */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="メニューを開く"
                  className="inline-flex h-9 w-9 items-center justify-center rounded bg-nav-bg text-nav-foreground/90 transition-colors hover:bg-nav-hover hover:text-header-accent focus:outline-none focus:ring-1 focus:ring-header-accent md:hidden"
                >
                  <Menu className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[82vw] max-w-xs flex-col p-0 bg-background text-foreground">
                <SheetHeader className="border-b border-border bg-header-bg p-4 text-left text-header-foreground">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="flex items-baseline gap-1.5 font-black tracking-[0.08em] text-header-foreground">
                      <span className="text-xl text-header-accent">株</span>
                      <span className="text-lg">Navi</span>
                      <span className="ml-1 text-xxs font-normal opacity-70">メニュー</span>
                    </SheetTitle>
                  </div>
                  <p className="mt-1 text-xxs opacity-70">{todayLabel}</p>
                </SheetHeader>

                {/* ナビゲーションリンク一覧 */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.label;
                    return (
                      <Link
                        key={item.label}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                          <div className="min-w-0">
                            <div className="truncate">{item.label}</div>
                            <div className={`text-xs truncate ${isActive ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/50"}`} />
                      </Link>
                    );
                  })}
                </div>

                {/* ドロワーフッター情報 */}
                <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xxs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Info className="h-3 w-3 text-primary" />
                      <span>LIVE以外は約5分更新</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleManualRefresh();
                      }}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xxs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <RefreshCw className="h-3 w-3" />
                      手動更新
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Navigation bar（PC・モバイルともにスクロールしても常時表示） */}
      <nav aria-label="メインナビゲーション" className="sticky top-0 z-40 bg-nav-bg shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-2 px-2 sm:px-4">
          <ul className="flex min-w-0 flex-1 items-center justify-start gap-0.5 overflow-x-auto no-scrollbar text-xs sm:text-[13px]">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.path}
                  aria-current={activeTab === item.label ? "page" : undefined}
                  className={`inline-flex min-h-[38px] items-center whitespace-nowrap px-2.5 py-2 font-medium transition-colors hover:bg-nav-hover sm:min-h-0 sm:px-3 ${
                    activeTab === item.label
                      ? "border-b-2 border-header-accent font-bold text-header-accent"
                      : "text-nav-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-nav-foreground/90 lg:flex">
            <Info className="h-3.5 w-3.5 text-header-accent" />
            <span>LIVE以外は約5分更新</span>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="ml-1 inline-flex h-6.5 items-center gap-1 rounded border border-nav-foreground/30 bg-nav-hover px-2 text-xs font-semibold text-nav-foreground transition-colors hover:border-header-accent hover:text-header-accent"
              title="ページを再読み込みして最新データを取得"
            >
              <RefreshCw className="h-3 w-3" />
              手動更新
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default SiteHeader;
