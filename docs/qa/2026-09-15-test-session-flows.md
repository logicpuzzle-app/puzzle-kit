# 保存・セッション E2E 整理のQA

autosaveの1ケースをdesktopに限定し、同じmouse/keyboard操作を繰り返すmobile2枠を削減しました。再読込後のclue5→click6→keyboard7→Undo6→Undo5、およびproblem/answer両方の保存と復元は本文を変えずに維持しています。このフロー固有の狭幅・端末設定差を直接検査する保証は減ります。Chromium/WebKitの2engineを残します。

File Open/Newでは、旧撮影用の条件付きUndo/Reject操作とその前後で重複するassertion、途中comparison.pngを削除しました。読み込み・新規作成直後のclue/空盤面、Undo/Redo無効、Reject不在を直接検査します。続く編集のUndo/Redoは維持します。ファイル・メニュー・alertのブラウザー経路とmobile操作を残すため、session3ケースは全4profileで継続します。JSON構文不正とgrid/state不足も別入口として維持します。

アプリ変更なし。2specで7行削減。旧途中画像の削除後も、qa:captureのfinal-screenと動画でBefore/Afterを比較できます。

| 検査 | 結果 |
|---|---|
| 対象4ケースの全profile | 14成功（整理前16枠） |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 242成功、既存skip 1（収集244→243） |
| 本番E2E | 69成功、既存skip 1（収集71→70） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型検査と集合差分成功、開発189→188 / 本番60→59。統合全Unit/E2Eは未再実行 |

PR #103をbaseにしています。Before `8fa7f59f1126dfad4d74275211fd84bfd74cdb84` / After `d967796b721c60e8329449b549d312ca3179482b`。撮影時clean。Beforeの557ファイルをbaselineと照合し、Afterとの差が対象2specのみであることを確認しました。

PC/mobile ChromiumでBefore8件・After7件が成功。公開代表はautosave desktop、File Open mobile、New mobileの3組です。最終画像は、順に5とanswer塗り、9と新規0、空盤面＋選択枠を表示しています。途中の状態遷移は動画とassertionで確認します。6画像の内容、6動画の全decodeとChromium再生・シークを確認済みです。pixel一致は主張しません。

[revision・コマンド・SHA256](evidence-test-session-flows-20260915/evidence.json) / [ローカルで開く動画比較ページ](evidence-test-session-flows-20260915/index.html)。詳細監査・UI Reviewは非追跡 `.work` のみです。

再現:

```sh
QA_INCLUDE_PRODUCTION_TESTS=1 npx playwright test e2e/persistence.spec.ts e2e/puzzle-session.spec.ts
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/persistence.spec.ts e2e/puzzle-session.spec.ts --project=chromium --project=mobile-chrome
```
