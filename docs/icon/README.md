# アプリのアイコン（案 1「照準リング」）

- `icon-source.html`：アイコンの元データ（SVG）。通常版（`#std`）、タブ用の小さい版（`#small`）、、Android の丸型切り抜き用のマスカブル版（`#mask`）。
- `render.cjs`：各サイズの PNG を `public/` に書き出すスクリプト。

```bash
node docs/icon/render.cjs public
```

書き出されるファイル：`favicon-32.png` `favicon-48.png`（ブラウザのタブ）、`apple-touch-icon.png`（iPhone のホーム画面、180px）、
`icon-192.png` `icon-512.png`（Android のホーム画面）、`icon-maskable-512.png`（Android の丸型など）。
ホーム画面に追加したときの名前は「HS合わせ」（`public/manifest.webmanifest` と `index.html`）。
