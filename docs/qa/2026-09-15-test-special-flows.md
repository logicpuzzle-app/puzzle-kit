# 特殊図形フロー整理のQA

cancel/multitouch/panの中断テストを、ページ初期化を共有する1ケース・3つの名前付きstepへ統合しました。中断ごとに未確定図形を破棄し、次の描画とUndoが可能なことを確認します。各中断の操作・assertionは変更前と一致しています。独立した新規pageでmultitouch/panを開始する保証は減り、最初のstepで失敗すると後続結果は出ません。

Arrow/Thermoの選択・短縮・描画・出力・再読込はツール別の入口/rendererを通るため、両フローを本文不変で維持します。Cage/BoxLineでは旧撮影用の条件付きUndoを直接tapへ変更しました。成功時qa:captureのafter-release/after-undo画像と動画は維持します。

PNGテストは `width > 200` のみ削除し、包含する `width === 800`、高さ800、選択色なし、矢印画素の不透明・黒を維持します。mobileのdrawer閉鎖→toolbar出力の経路があるため、PNGは4profileすべて継続します。アプリコード変更なし、2specで1行減です。

| 検査 | 結果 |
|---|---|
| 対象全profile | 9成功（整理前11枠） |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 251成功、既存skip 1（252枠不変） |
| 本番E2E | 68成功、既存skip 1（71→69枠） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型と集合差分成功、開発188枠不変・本番59→57。統合全Unit/E2Eは未再実行 |

PR #102がbase。Before `aa89a6802d1be460e39640737a1a188a77fd7f06` / After `877a741d3bc6dd6adcda9355beabea08a3e41fc6`。撮影時clean、Before manifestの557ファイルをbaselineと照合し、Afterとの差が対象2specのみであることを確認しました。

PC/mobile ChromiumでBefore9件・After7件成功。公開は中断mobile、BoxLine mobile、PNG desktopの3組です。中断のBefore動画はpan単独、After動画は3中断の連続フローで、最終盤面位置も異なります。BoxLine画像はafter-undoの空盤面、PNG画像は実際の出力ファイルです。6画像の内容、6動画の全decodeとChromium再生・シークを確認済み。pixel一致や実測の速度向上は主張しません。

[revision・実行コマンド・SHA256](evidence-test-special-flows-20260915/evidence.json) / [ローカルで開く動画比較](evidence-test-special-flows-20260915/index.html)。詳細監査・UI Reviewは非追跡 `.work` のみです。

再現:

```sh
QA_INCLUDE_PRODUCTION_TESTS=1 npx playwright test e2e/special-touch.chromium-touch.spec.ts e2e/special-export.spec.ts
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/special-touch.chromium-touch.spec.ts e2e/special-export.spec.ts --project=chromium --project=mobile-chrome
```
