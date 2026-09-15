# シンボルサイズfixture整理のQA

シンボルサイズテストの内部ストアへの動的import・直接seed/readbackを、[固定ファイル](../../e2e/fixtures/overlapping-symbols.json)と公開File Open/Save、ツール選択へ置き換えました。初期データは同じセルに重なるcircleとarrow_Nで、識別子を固定しています。アプリコード変更はありません。

「新規配置の既定値」と「選択した既存オブジェクト」の2入口を維持します。Largestの二度目の130確認と、10を入力→Apply→入力値10を確認するだけの末尾を削除しました。後者はApplyが機能しなくても通るためです。不正入力からpresetで復帰する操作と10を使うUI反復は失いますが、Largest初回・175・301無効のUI検査、下限値のUnitと実custom配置E2Eは維持します。

選択オブジェクト変更は、円の半径28、Undoで元の半径、Redo/再読込で28を確認します。File SaveのJSONでsize以外の属性と重なった別オブジェクトが保たれることを直後・再読込後に検査します。Undo時の全属性の内部値再確認はDOM復元へ置き換え、全属性Undoは既存Unitで検査します。mobileは実Apply tapとdrawerを通るため4profileを維持します。

2ケース・実行枠数は不変。specは12行減、固定JSON72行追加でコード差分は合計60行増です。目的は内部依存・無効な検査の除去であり、件数や行数の削減ではありません。

| 検査 | 結果 |
|---|---|
| 対象全profile | 8成功 |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 251成功、既存skip 1（252枠不変） |
| 本番E2E | 70成功、既存skip 1（71枠不変） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型と集合確認成功、開発188/本番57不変、タイトル変更のみ。統合全Unit/E2Eは未再実行 |

PR #102がbase。Before `aa89a6802d1be460e39640737a1a188a77fd7f06` / After `ec85cd5b0f4aa52d49443e98d355bdd1faa20ff0`。撮影時clean。Before manifestの557ファイルをbaselineと照合し、Afterは558ファイル、差分は対象specと追加fixtureのみでした。

PC/mobile ChromiumでBefore/After各4件成功。公開代表はmobileのselected-object場面です。両画像で175%と拡大した円のプレビューを確認しました。Beforeの内部cursor seedがなくなるため、Afterの盤面には緑の選択枠がありません。公開ツール選択に伴うribbon/paletteの差もあります。動画はAfterにFile Open/Saveの操作が加わります。2画像の内容と2動画の全decode・Chromium再生/シークを確認済み。pixel一致や速度・flake改善率を主張しません。

[revision・コマンド・SHA256](evidence-test-symbol-fixture-20260915/evidence.json) / [ローカルで開く動画比較](evidence-test-symbol-fixture-20260915/index.html)。詳細監査・UI Reviewは非追跡 `.work` のみです。

再現:

```sh
npx playwright test e2e/symbol-sizing.spec.ts
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/symbol-sizing.spec.ts --project=chromium --project=mobile-chrome
```
