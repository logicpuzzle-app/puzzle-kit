# カーソル設定フロー統合のQA

SurfaceとNumberの2ケースを、共有設定を保存・再読込する1シナリオに統合しました。両方のSVG描画経路について、青色と画面上の線幅8pxを再読込の前後で検査します。セル選択と描画検査のhelper本文は不変です。アプリコード変更はありません。

共有設定の操作・保存待ち・再読込が各2回から1回になります。Chromium/WebKitのPC・mobile設定はすべて維持します。ツールごとに独立した初期状態で検査する保証は減りますが、現行rendererは同じcomponentから共有設定を直接読みます。保存完了を待つpollは維持しています。行数は2行増で、実行の重複削減が目的です。

| 検査 | 結果 |
|---|---|
| 対象全profile | 4成功（整理前8実行枠） |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 249成功、既存skip 1（収集252→250） |
| 本番E2E | 68成功、既存skip 1（収集71→69） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型検査成功、開発191→189 / 本番62→60、意図した集合差分のみ。統合全Unit/E2Eは未再実行 |

Before `aa89a6802d1be460e39640737a1a188a77fd7f06` / After `8beb5f9425f95f9e0c266cbfa54542e7c0ef03b1`。撮影時clean。Before manifestの557ファイルをbaselineと照合し、Afterとの差が対象specのみであることを確認しました。PR #102をbaseにしています。

PC/mobile ChromiumでBefore4件・After2件を撮影し、全件成功しました。公開代表はmobileのNumber最終画面です。Before動画はNumber単独、After動画はSurface→Numberの統合フローを含みます。Afterでは先にSurfaceを操作するためセルが塗られ、最終盤面の内容も異なります。比較対象はカーソルの色・幅で、画面全体のpixel一致を検査したものではありません。Surface単独のBefore動画はローカルcaptureに保存しています。

公開2画像の内容、2動画の全decode・Chromium再生/シークを確認済み。[revision・コマンド・SHA256](evidence-test-cursor-style-20260915/evidence.json) / [ローカルで開く動画比較ページ](evidence-test-cursor-style-20260915/index.html)。詳細監査とUI Reviewは非追跡 `.work` のみです。

再現:

```sh
QA_INCLUDE_PRODUCTION_TESTS=1 npx playwright test e2e/cursor-style.spec.ts
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/cursor-style.spec.ts --project=chromium --project=mobile-chrome
```
