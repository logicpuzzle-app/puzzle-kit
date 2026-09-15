# NPGeneratorテスト整理のQA

rot2の2シード反復を削除し、既存のseeded生成・結果表示・盤面への適用フローでrot2を選択するようにしました。生成・適用とGUI編集は全4profileを維持します。GUIのRetry limitの100表示・25入力・25読み戻しは、制限回数が実処理に適用されることを検査していなかったため削除しました。

XMLの枯渇→seed変更→再生成と、多制約グループの読込→実Wasm Solveはdesktop Chromium/WebKitへ集約しました。XML操作・assertionはtag/title以外不変です。旧タイトルの「declaration order」は順序を直接検査していなかったため、実際の読込・solveを表す名前に修正しました。

default rot4だけの生成失敗、rot2 seed2や成功後の再生成だけの故障、mobile条件でのXML操作に対する保証は減ります。新旧ともseedの厳密な再現性や生成maskの対称性自体はassertしていません。実Wasm連携・復旧とGUI寸法を優先する判断です。アプリ変更なし、1specで16行減。速度/flake改善は未計測です。

| 検査 | 結果 |
|---|---|
| 対象全profile | 12成功（整理前20枠） |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 235成功、既存skip 1（244→236枠） |
| 本番E2E | 70成功、既存skip 1（71枠不変） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型・集合比較成功、開発164→156、本番56枠不変。統合全Unit/E2Eは未再実行 |

PR #103がbase。Before `8fa7f59f1126dfad4d74275211fd84bfd74cdb84` / After `e0b57a8d675af9f53fba3060a51c386b83b4e549`。撮影時clean、557ファイルのsource manifestをbaselineと照合し、After差はnpgen.specのみでした。

PC/mobile ChromiumでBefore10件・After6件撮影。公開は生成mobile、GUI mobile、XML復旧desktop、XML多制約desktopの4組です。生成画像はBeforeがdefault rot4、Afterがrot2なので数字配置が異なります。GUI最終画像はスクロール後で入力cellが上に隠れています。XML最終画像は設定部分で、Unique resultはテストassertionで確認しています。XML多制約のseed表示は自動生成により異なります。8画像の内容と8動画の全decode・Chromium再生/シークを確認済み。pixel一致は主張しません。

[revision・実行コマンド・SHA256](evidence-test-npgen-flows-20260915/evidence.json) / [ローカルで開く動画比較](evidence-test-npgen-flows-20260915/index.html)。詳細監査・UI Reviewは非追跡 `.work` のみです。

再現:

```sh
QA_INCLUDE_PRODUCTION_TESTS=1 npx playwright test e2e/npgen.spec.ts
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/npgen.spec.ts --project=chromium --project=mobile-chrome
```
