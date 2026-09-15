# 数字履歴 E2E 整理のQA

キーボードの数字・記号3ケースに `@desktop` を付け、モバイル設定で同じマウス・キーボード操作を反復していた6実行枠を削除しました。キーボードのケース本文は不変で、挿入・置換・削除それぞれのUndo/Redoを維持しています。Chromium/WebKitのdesktopで検査します。これら3フロー固有のモバイルviewport・端末設定に依存する不具合の直接保証は減ります。

数字パッドはNurikabe/Yajilinとも実tapとmouseの検査を維持し、末尾の二回目の削除Undoのみ削除しました。同じ削除のUndo復元とRedo再削除は直前に検査済みです。アプリコード変更はありません。PR #103 のdesktopタグ設定に依存します。

| 検査 | 結果 |
|---|---|
| 対象5ケースの全profile | 14成功（整理前20枠） |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 240成功、既存skip 1（収集244→241枠） |
| 本番E2E | 67成功、既存skip 1（収集71→68枠） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型検査成功、開発194→191 / 本番65→62枠、意図した6枠のみ減少。全Unit/E2Eは統合状態では未再実行 |

Before: `8fa7f59f1126dfad4d74275211fd84bfd74cdb84`、After: `6d3b109bb6dcff4ee6a97ed7c64cd97732062191`。撮影時は両方clean。557ファイルのBefore manifestをgit baselineと照合し、Afterとの差は対象2specのみでした。

撮影は同じChromium PC/モバイル指定でBefore10件、After7件成功。各段階のQA commandとrevision、公開画像・動画のSHA256は [evidence.json](evidence-test-number-history-20260915/evidence.json) に記録しています。[動画比較ページ](evidence-test-number-history-20260915/index.html) はローカルで開くと再生できます。

公開した3組の画像・動画は、desktop方向付き数字、mobile Nurikabe、mobile Yajilinです。キーボード画像は数字削除後の最終画面、数字パッド画像は置換をUndoして15/5に復元した共通の途中画面です。数字パッド動画はBeforeが末尾Undoで6、AfterがRedo削除後の空状態で終わります。画像のピクセル一致は検査していません。6画像の内容確認、6動画の全decodeとChromium再生・シークを確認済みです。

再現:

```sh
QA_INCLUDE_PRODUCTION_TESTS=1 npx playwright test e2e/number-history.spec.ts e2e/number-pad-history.spec.ts
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/number-history.spec.ts e2e/number-pad-history.spec.ts --project=chromium --project=mobile-chrome
```

詳細の削除判断・UI Reviewは非追跡 `.work` に保存しています。
