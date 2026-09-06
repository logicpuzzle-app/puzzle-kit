# Touch / WebKit QA記録

2026-09-06、branch `feature/touch-browser-quality`、検証対象HEAD `8964440`（追加のパンE2Eは未コミット差分を含むcaptureで確認）。前提はPR #49の712ccc3。Playwright 1.62.0、Vitest 4.1.11、ローカルNode v25.2.1 / npm 11.7.0。

## 全体検証

| 検査 | 結果 |
| --- | --- |
| アプリ型検査 / E2E型検査 | PASS |
| Unit / integration | 60 files / 986 tests PASS |
| E2E | 116 PASS / 8 SKIP / 0 FAIL、追加パンE2E 1 PASS |
| 本番build | PASS |

E2Eのprojectは `chromium`、`mobile-chrome` (Pixel 7)、`webkit` (Desktop Safari)、`mobile-webkit` (iPhone 13)。8 SKIPは既存の手動NPGenerator撮影2件×4設定。Chromium CDP専用のドラッグテストはmobile-chromeにだけ収集する。

全検査ログ・E2E動画・traceは `artifacts/check/2026-09-06T03-08-56-683Z`。既存solverのsource map不足とbuildの大きなchunk警告は残る。CIは独立したLinux/Node 24環境で同じ検査を実行し、結果はPR checksで確認する。

## Before / after

| テスト群 | Before | After |
| --- | --- | --- |
| Chromium touch: 描画・Undo/Redo・パン・中断・除外・数字 | 4 FAIL / 3 PASS | 7 PASS |
| WebKit Desktop/iPhone全E2E | 6 FAIL / 50 PASS / 4 SKIP | 56 PASS / 4 SKIP |
| タッチ終了処理unit | 3 FAIL / 1 PASS | 4 PASS（さらに中断済みrouteのUndoを1件追加） |
| NPGeneratorセル操作unit | 2 FAIL / 3 PASS | 5 PASS |

[7フロー・14本の比較動画](evidence-touch-webkit-20260906/README.md) を同梱。比較ページの全動画の読み込みを実ブラウザーで確認した。

- パンモード中の1本指ドラッグは、編集を開始せず盤面を移動する。
- pointercancelはtap/long press/未確定Free Segmentの確定として扱わない。入力・履歴状態を解放し、次のstrokeが描画・Undoできる。既に反映したorthogonal routeはキャンセル後も1つのUndoで戻せる。
- 正方形・六角形のGrid/Excludeをtouchで操作し、除外直後の表示更新と同じ場所のタップによる復元を検証する。
- NPGeneratorのセルをクリックすると、直前の入力欄からセルへフォーカスが移る。矢印キーは選択とDOMフォーカスを一緒に移動し、Tab順序には選択セルだけを含める。WebKitで以前失敗していた実際のキー入力も成功した。

## 実行方法と範囲

```bash
npm ci
npx playwright install chromium webkit
npm run qa:doctor
npm run qa:check
npm run build
npm run qa:capture -- before e2e/gestures.chromium-touch.spec.ts e2e/tap-input.spec.ts --project=mobile-chrome
# 修正後に同じテストを実行
npm run qa:capture -- after e2e/gestures.chromium-touch.spec.ts e2e/tap-input.spec.ts --project=mobile-chrome
npm run qa:compare -- artifacts/qa/<before> artifacts/qa/<after>
```

Chromiumのドラッグ・中断は [CDP dispatchTouchEvent](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent)、tapはPlaywright touchscreen APIを使う。WebKitではtapと既存mouse/keyboard操作を実行し、CDPを使ったとは表現しない。[デバイス設定](https://playwright.dev/docs/emulation) は実機ではないため、実機iOS Safari、OS割込み、ソフトウェアキーボードを検証済みとはしていない。Grid Merge/Split/Sculptや複数指ジェスチャー全体の同等性は今回の対象外。

## 連続パンイベントの追加回帰

同一描画サイクル内で20pxずつ3回移動すると、古い座標から加算され60pxの入力が20pxになる不具合をunitとE2Eで再現。各イベントで最新のstore座標を参照するよう修正した。E2EはCDPの接触開始後に合成PointerEventを同一JavaScriptタスク内で3回送信する条件であり、実機の入力周期を検証したものではない。

Before capture: `2026-09-06T03-11-41-390Z-before`（20px、FAIL）。After: `2026-09-06T03-11-46-798Z-after`（60px、PASS）。beforeはTouchHandlersを217dc66の状態へ戻して実行し、差分とsource manifestを保存した。
