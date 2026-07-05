# 株Navi

日本株の市況、ランキング、ローソク足チャート、ニュースをまとめて確認できる投資情報ダッシュボードです。

## 開発

```sh
npm install
npm run dev
```

## ビルド

```sh
npm run build
```

## 主な技術

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-ui
- Vercel Functions

## デプロイ

Vercel に接続している本番環境へデプロイします。

```sh
vercel deploy --prod --scope tomomi-eras-projects
```

## EDINET 本番更新

Vercel から EDINET API へ直接アクセスすると 403 になる場合があるため、本番は保存済みの EDINET snapshot と PDF キャッシュを表示します。Mac が起動している間だけローカルから EDINET を取得し、保存データを更新して本番へ反映できます。

手動で1回更新する場合:

```sh
npm run edinet:publish
```

このコマンドは以下をまとめて実行します。

- EDINET APIをローカルMacから取得
- `api/_shared/edinet-snapshot.js` を更新
- `public/edinet-cache/*.pdf` を更新
- 変更があれば commit / push
- Vercel本番へ deploy

Macで定期実行する場合は、LaunchAgent を登録します。

```sh
mkdir -p ~/Library/LaunchAgents
cp scripts/com.stockscouthub.edinet-refresh.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.stockscouthub.edinet-refresh.plist
```

登録後は 9:15 / 12:15 / 15:45 / 18:15 に実行します。ログは `logs/edinet-refresh.log` と `logs/edinet-refresh.launchd.err.log` に出ます。止める場合:

```sh
launchctl unload ~/Library/LaunchAgents/com.stockscouthub.edinet-refresh.plist
```

国内IPの中継サーバーを使える場合は、Vercel の環境変数に `EDINET_PROXY_BASE_URL` と必要に応じて `EDINET_PROXY_AUTH_TOKEN` を設定すると、Vercel本番からプロキシ経由でライブ取得できます。
