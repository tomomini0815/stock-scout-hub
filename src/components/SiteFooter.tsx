import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "メイン",
    links: [
      { label: "トップ", path: "/" },
      { label: "市況・スクリーニング", path: "/market" },
      { label: "銘柄・チャート", path: "/chart" },
      { label: "大口・ファンド", path: "/smart-money" },
    ],
  },
  {
    title: "マーケット",
    links: [
      { label: "個別銘柄一覧", path: "/stocks" },
      { label: "ランキング", path: "/ranking" },
      { label: "テーマ別", path: "/themes" },
    ],
  },
  {
    title: "ツール",
    links: [
      { label: "日経225スクリーニング", path: "/market" },
      { label: "銘柄検索・チャート", path: "/chart" },
      { label: "EDINET検知", path: "/smart-money" },
    ],
  },
  {
    title: "情報",
    links: [
      { label: "ニュース", path: "/news" },
      { label: "決算", path: "/earnings" },
      { label: "IPO", path: "/ipo" },
      { label: "利用規約", path: "/terms" },
    ],
  },
];

const SiteFooter = () => {
  return (
    <footer className="mt-6 bg-header-bg text-header-foreground">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 text-xxs text-nav-foreground/80 sm:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-2 text-xs font-bold text-header-foreground">{section.title}</h4>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="transition-colors hover:text-header-accent">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded border border-header-accent/40 bg-nav-bg px-3 py-2 text-center text-xs font-bold leading-relaxed text-header-accent">
          当サイトの情報は投資勧誘を目的としたものではありません。投資判断は自己責任でお願いいたします。
        </div>
        <div className="mt-3 border-t border-nav-foreground/15 pt-3 text-center text-xxs text-nav-foreground/60">
          <p className="mt-1">© 2026 株Navi All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
