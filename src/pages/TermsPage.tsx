import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

const sections = [
  {
    title: "第1条 目的",
    body: "本規約は、株Naviが提供する株式情報、マーケット情報、チャート、ニュース、EDINET検知、大口投資家関連情報などの利用条件を定めるものです。",
  },
  {
    title: "第2条 投資判断について",
    body: "当サイトの情報は、投資判断の参考情報を提供するものであり、特定の金融商品、銘柄、取引、投資行動を推奨または勧誘するものではありません。最終的な投資判断は、利用者ご自身の責任で行ってください。",
  },
  {
    title: "第3条 情報の正確性",
    body: "当サイトでは、可能な限り正確な情報の掲載に努めますが、情報の正確性、完全性、最新性、有用性を保証するものではありません。表示内容には遅延、誤差、取得失敗、外部データの制約が含まれる場合があります。",
  },
  {
    title: "第4条 損失等の責任",
    body: "当サイトの情報を利用したこと、または利用できなかったことにより発生した損失、損害、不利益について、当サイトは一切の責任を負いません。株価、為替、指数、開示情報は変動し、将来の成果を保証するものではありません。",
  },
  {
    title: "第5条 外部情報・外部リンク",
    body: "当サイトでは、EDINET、ニュース、株価データ、チャートサービスなど外部の情報源を参照する場合があります。外部サイトまたは外部サービスの内容、可用性、仕様変更について、当サイトは責任を負いません。",
  },
  {
    title: "第6条 禁止事項",
    body: "利用者は、当サイトの情報を不正アクセス、過度な自動取得、第三者への誤解を招く再配布、法令または公序良俗に反する目的で利用してはなりません。",
  },
  {
    title: "第7条 規約の変更",
    body: "当サイトは、必要に応じて本規約を変更できるものとします。変更後の規約は、当サイト上に掲載された時点で効力を生じます。",
  },
];

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="利用規約" />

      <main className="container mx-auto px-4 py-4">
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3">
          <h1 className="text-base font-black text-amber-950">利用規約・免責事項</h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-amber-900">
            当サイトの情報は投資勧誘を目的としたものではありません。投資判断は自己責任でお願いいたします。
          </p>
        </div>

        <section className="rounded border border-border bg-card">
          <div className="border-b border-border bg-table-header-bg px-4 py-2">
            <h2 className="text-sm font-bold text-foreground">株Navi 利用規約</h2>
          </div>
          <div className="divide-y divide-border">
            {sections.map((section) => (
              <section key={section.title} className="px-4 py-3">
                <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default TermsPage;
