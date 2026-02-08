const SiteFooter = () => {
  return (
    <footer className="mt-6 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-4 text-xxs text-muted-foreground md:grid-cols-4">
          <div>
            <h4 className="mb-2 text-xs font-bold text-foreground">マーケット</h4>
            <ul className="space-y-1">
              <li className="cursor-pointer hover:text-foreground">日本株</li>
              <li className="cursor-pointer hover:text-foreground">米国株</li>
              <li className="cursor-pointer hover:text-foreground">為替</li>
              <li className="cursor-pointer hover:text-foreground">商品先物</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold text-foreground">ツール</h4>
            <ul className="space-y-1">
              <li className="cursor-pointer hover:text-foreground">スクリーニング</li>
              <li className="cursor-pointer hover:text-foreground">ポートフォリオ</li>
              <li className="cursor-pointer hover:text-foreground">アラート設定</li>
              <li className="cursor-pointer hover:text-foreground">比較チャート</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold text-foreground">情報</h4>
            <ul className="space-y-1">
              <li className="cursor-pointer hover:text-foreground">決算カレンダー</li>
              <li className="cursor-pointer hover:text-foreground">IPO情報</li>
              <li className="cursor-pointer hover:text-foreground">株主優待</li>
              <li className="cursor-pointer hover:text-foreground">配当情報</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold text-foreground">サポート</h4>
            <ul className="space-y-1">
              <li className="cursor-pointer hover:text-foreground">利用ガイド</li>
              <li className="cursor-pointer hover:text-foreground">お問い合わせ</li>
              <li className="cursor-pointer hover:text-foreground">利用規約</li>
              <li className="cursor-pointer hover:text-foreground">プライバシーポリシー</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3 text-center text-xxs text-muted-foreground">
          <p>※ 当サイトの情報は投資勧誘を目的としたものではありません。投資判断は自己責任でお願いいたします。</p>
          <p className="mt-1">© 2026 株ナビ All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
