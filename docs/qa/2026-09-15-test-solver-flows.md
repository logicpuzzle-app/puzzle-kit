# ソルバーテスト整理のQA

ツールバーURL取込の独立Solveを、Nurikabe正常→不可能ケースの正常側へ統合しました。File menu取込も維持し、Solveボタンの可視確認は実clickへ集約しています。

Heyawakeでは、画面へ取込んだデータを使わず、Node側で解析したgrid/problemをbundled Workerへ直接送っていたため、不要な画面取込を削除しました。browser originへのnavigateとWorkerの入力・呼出し・結果assertionは維持し、desktop Chromium/WebKitへ限定します。mobile条件のWorker実行とHeyawake画面取込のsmokeは減ります。旧ケースもHeyawakeのUI Solve/解描画は検査していません。

Wasm再取得、Worker起動失敗の復旧、loading cancel→fresh worker、複数解の確定cell、Slitherlinkの5フローは本文不変で全4profileを維持します。mobileのdrawer閉鎖→retryも残します。アプリ変更なし、1specで7行減。速度/flake改善は未計測です。

| 検査 | 結果 |
|---|---|
| 対象全profile | 26成功（整理前32枠） |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 240成功、既存skip 1（244→241枠） |
| 本番E2E | 67成功、既存skip 1（71→68枠） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型・集合比較成功、開発156→153、本番56→53。統合全Unit/E2Eは未再実行 |

PR #103がbase。Before `8fa7f59f1126dfad4d74275211fd84bfd74cdb84` / After `21603ffbe5222b9de157a55ee114872e638dd902`。撮影時clean、557ファイルのsource manifestをbaselineと照合し、After差はsolver.specのみでした。

PC/mobile ChromiumでBefore16件・After13件を撮影。公開はimports mobile、Heyawake desktop、retry mobileの3組です。importsは両方No solution exists、retryは両方Solved。HeyawakeはBeforeが取込済み2x2、Afterは初期9x9で画面が異なりますが、Worker結果は両方solved、cell-0-1です。

[Heyawake Before結果](evidence-test-solver-flows-20260915/heyawake-before-result.json) / [After結果](evidence-test-solver-flows-20260915/heyawake-after-result.json)。6画像の内容と6動画の全decode・Chromium再生/シークを確認済み。pixel一致は主張しません。

[revision・実行コマンド・SHA256](evidence-test-solver-flows-20260915/evidence.json) / [ローカルで開く動画比較](evidence-test-solver-flows-20260915/index.html)。詳細監査・UI Reviewは非追跡 `.work` のみです。

再現:

```sh
QA_INCLUDE_PRODUCTION_TESTS=1 npx playwright test e2e/solver.spec.ts
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/solver.spec.ts --project=chromium --project=mobile-chrome
```
