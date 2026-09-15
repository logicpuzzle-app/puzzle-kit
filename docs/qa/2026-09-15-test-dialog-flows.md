# ダイアログテスト整理のQA

合成compositionイベントのEscape検査をdesktop Chromium/WebKitへ限定しました。OS IMEは操作していません。長文編集・保存・再読込と実tapのテキスト入力は維持します。

Properties drawerは全ケースがtouch有効・viewport指定であるため、mobile Chromium/WebKitの2profileに集約しました。desktop UA/isMobile/DPR条件の検査は減ります。Escape dismissalをフォーカス隔離・色保存・背景dismiss・再openのフロー末尾へ統合し、非表示・opener表示・focus復帰を維持しました。初回open直後の独立Escapeケースは失います。360/412px geometry、sidebar切替、alert/storage通知、閉じるbuttonの経路は残しています。

| 検査 | 結果 |
|---|---|
| 対象全profile | 14成功 |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 226成功、既存skip 1（244→227枠） |
| 本番E2E | 69成功、既存skip 1（71→70枠） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型・集合差分成功、開発188→171、本番57→56。統合全Unit/E2Eは未再実行 |

PR #103がbase。Before `8fa7f59f1126dfad4d74275211fd84bfd74cdb84` / After `5844d7c52ca32e7d658c377bee360bc97a49d5a1`。撮影時clean、Before manifestの557ファイルをbaselineと照合し、Afterとの差は対象2specとPlaywright configでした。アプリコード変更なし。

PC/mobile Chromium撮影はBefore16件・After7件成功。公開はcomposition desktop、focus mobile、geometry 412px mobileの3組です。focusのBeforeは閉じるbutton、AfterはEscapeで終了するため、Afterにはopenerの青いfocus ringがあります。composition draftとgeometry盤面は対応する場面です。6画像の内容と6動画の全decode・Chromium再生/シークを確認済み。pixel一致や実測の速度向上は主張しません。

[revision・実行コマンド・SHA256](evidence-test-dialog-flows-20260915/evidence.json) / [ローカルで開く動画比較](evidence-test-dialog-flows-20260915/index.html)。詳細監査・UI Reviewは非追跡 `.work` のみです。

再現:

```sh
QA_INCLUDE_PRODUCTION_TESTS=1 npx playwright test e2e/text-editing.spec.ts e2e/properties-drawer.spec.ts --grep 'composition Escape|Properties'
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/text-editing.spec.ts e2e/properties-drawer.spec.ts --grep 'composition Escape|Properties' --project=chromium --project=mobile-chrome
```
