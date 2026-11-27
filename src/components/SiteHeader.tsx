import {
  BarChart3,
  Bot,
  Calendar,
  ChevronDown,
  ChevronRight,
  Home,
  Info,
  Layers,
  Menu,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
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

interface NavSubItem {
  label: string;
  path: string;
  desc?: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: typeof Home;
  desc: string;
  subItems?: NavSubItem[];
}

const navItems: NavItem[] = [
  { label: "トップ", path: "/", icon: Home, desc: "市況概況・シグナル・注目銘柄" },
  {
    label: "スクリーニング",
    path: "/market",
    icon: SlidersHorizontal,
    desc: "6指数・条件絞り込み・ランキング",
    subItems: [
      { label: "日経平均 225", path: "/market?index=nikkei225", desc: "主力225銘柄をスクリーニング" },
      { label: "TOPIX Core30", path: "/market?index=topix", desc: "超大型コア銘柄" },
      { label: "JPXプライム150", path: "/market?index=prime150", desc: "資本効率・高収益銘柄" },
      { label: "東証グロース250", path: "/market?index=growth250", desc: "中小型成長株" },
      { label: "東証REIT", path: "/market?index=reit", desc: "不動産投資信託・高分配" },
      { label: "ランキング", path: "/market?index=ranking", desc: "値上がり・出来高・高配当" },
    ],
  },
  {
    label: "銘柄・チャート",
    path: "/chart",
    icon: BarChart3,
    desc: "高機能チャート・パターン事典",
    subItems: [
      { label: "銘柄チャート分析", path: "/chart", desc: "マイリスト・日足チャート・OHLC" },
      { label: "チャートパターン20選", path: "/patterns", desc: "反転・継続の王道20型と売買目安" },
    ],
  },
  {
    label: "銘柄診断",
    path: "/advisor",
    icon: Bot,
    desc: "シミュレーター・カルテ・新NISA",
    subItems: [
      { label: "投資シミュレーター & 診断", path: "/advisor?tab=simulator", desc: "2銘柄比較・売買シナリオ・ポートフォリオ" },
      { label: "銘柄カルテ", path: "/advisor?tab=health", desc: "5軸レーダー・財務指標・売買シナリオ" },
      { label: "新NISAシミュレーター", path: "/advisor?tab=nisa", desc: "生涯1,800万枠・節税・配当試算" },
      { label: "指標ガイド", path: "/advisor?tab=guide", desc: "PER・PBR・ROEなど指標解説" },
    ],
  },
  {
    label: "大口・ファンド",
    path: "/smart-money",
    icon: ShieldAlert,
    desc: "EDINET大量保有・機関投資家動向",
    subItems: [
      { label: "すべて表示", path: "/smart-money?tab=all", desc: "日米の大口シグナル一覧" },
      { label: "日本株 (EDINET)", path: "/smart-money?tab=jp", desc: "大量保有報告書・変更報告" },
      { label: "米国株 (SEC)", path: "/smart-money?tab=us", desc: "SEC 13F・13D開示動向" },
      { label: "調査優先", path: "/smart-money?tab=priority", desc: "注目度の高い優先シグナル" },
      { label: "監視ファンド", path: "/smart-money?tab=funds", desc: "著名ファンド・アクティビスト一覧" },
    ],
  },
  { label: "テーマ別", path: "/themes", icon: Layers, desc: "AI・半導体・国策テーマ銘柄" },
  { label: "決算・IPO", path: "/earnings", icon: Calendar, desc: "決算発表予定・IPO新規上場情報" },
  { label: "ニュース", path: "/news", icon: Newspaper, desc: "速報・主要経済ニュースまとめ" },
];

const SiteHeader = ({ activeTab = "トップ" }: SiteHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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
                    const normalizedActiveTab = activeTab === "チャートパターン" ? "銘柄・チャート" : activeTab;
                    const isActive = normalizedActiveTab === item.label;
                    return (
                      <div key={item.label} className="space-y-1">
                        <Link
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
                        {item.subItems && item.subItems.length > 0 && (
                          <div className="ml-6 flex flex-wrap gap-1 pb-1">
                            {item.subItems.map((sub) => (
                              <Link
                                key={sub.path}
                                to={sub.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-foreground"
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ドロワーフッター情報 */}
                <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xxs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Info className="h-3 w-3 text-primary" />
                      <span>市況20秒・ニュース定期更新</span>
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
          <ul className="flex min-w-0 flex-1 items-center justify-start gap-0.5 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x md:overflow-visible no-scrollbar text-xs sm:text-[13px]">
            {navItems.map((item) => {
              const normalizedActiveTab = activeTab === "チャートパターン" ? "銘柄・チャート" : activeTab;
              const isActive = normalizedActiveTab === item.label;
              const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
              const isDropdownOpen = hasSubItems && openDropdown === item.label;
              return (
                <li
                  key={item.label}
                  className="relative shrink-0"
                  onMouseEnter={() => {
                    if (hasSubItems) setOpenDropdown(item.label);
                  }}
                  onMouseLeave={() => {
                    if (hasSubItems) {
                      setOpenDropdown((current) => (current === item.label ? null : current));
                    }
                  }}
                >
                  <Link
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(event) => {
                      setOpenDropdown(null);
                      event.currentTarget.blur();
                    }}
                    className={`inline-flex min-h-[38px] items-center gap-1 whitespace-nowrap border-b-2 px-2.5 py-2 font-medium transition-colors hover:bg-nav-hover sm:min-h-0 sm:px-3 ${
                      isActive
                        ? "border-header-accent font-bold text-header-accent"
                        : "border-transparent text-nav-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    {hasSubItems && (
                      <ChevronDown
                        className={`hidden h-3 w-3 opacity-65 transition-transform duration-150 md:inline-block ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </Link>

                  {/* PCホバー時のプルダウンメニュー（クリック後は自動で閉じる） */}
                  {hasSubItems && (
                    <div
                      className={`absolute left-0 top-full z-50 hidden min-w-[224px] pt-1 transition-opacity duration-150 md:block ${
                        isDropdownOpen
                          ? "pointer-events-auto visible opacity-100"
                          : "pointer-events-none invisible opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                        {item.subItems!.map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={(event) => {
                              setOpenDropdown(null);
                              event.currentTarget.blur();
                            }}
                            className="flex flex-col rounded px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
                          >
                            <span className="text-xs font-bold text-foreground">
                              {sub.label}
                            </span>
                            {sub.desc && (
                              <span className="text-[10px] leading-snug text-muted-foreground">
                                {sub.desc}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-nav-foreground/90 lg:flex">
            <Info className="h-3.5 w-3.5 text-header-accent" />
            <span>市況20秒・ニュース定期更新</span>
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
