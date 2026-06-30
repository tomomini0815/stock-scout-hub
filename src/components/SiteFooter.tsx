import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "マーケット",
    links: [
      { label: "市況", path: "/market" },
      { label: "銘柄・チャート", path: "/chart" },
      { label: "ランキング", path: "/ranking" },
    ],
  },
  {
    title: "ツール",
    links: [
      { label: "スクリーニング", path: "/screening" },
      { label: "テーマ株", path: "/themes" },
    ],
  },
  {
    title: "情報",
    links: [
      { label: "ニュース", path: "/news" },
      { label: "決算・IPO", path: "/earnings" },
    ],
  },
];

const SiteFooter = () => {
  return (
    <footer className="mt-6 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 gap-4 text-xxs text-muted-foreground sm:grid-cols-3">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-2 text-xs font-bold text-foreground">{section.title}</h4>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border pt-3 text-center text-xxs text-muted-foreground">
          <p>※ 当サイトの情報は投資勧誘を目的としたものではありません。投資判断は自己責任でお願いいたします。</p>
          <p className="mt-1">© 2026 株Navi All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
