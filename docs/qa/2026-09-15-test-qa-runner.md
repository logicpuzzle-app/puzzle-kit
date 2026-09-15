# QA runnerテスト整理の検証

`scripts/qa-check.test.mjs` のみ変更。成功・失敗・起動不能の3ケースを維持し、失敗ケースで繰り返していた正常ログの検査、全子プロセスでのartifact path検査、開始と重複する完了markerを削除した。実際のrunnerを別プロセスで実行し、npmコマンドには小さな実プロセスfixtureを使う。

成功ケースでログへのstdout/stderr保存と転送、E2E artifact path配線を確認。失敗ケースではtypecheckの終了コード2と後続E2Eまでの継続、起動不能では非zero終了とENOENT記録を確認する。全ケースで実行したチェックの順序とrunner終了コードを検査する。起動不能の子の数値コードはOS/Node依存なので固定しない。

streaming検査は150msの前後で判定する方式から、親が開始出力を受け取って解放ファイルを作る方式へ変更。子はそれを確認するまで終了しない。10秒は故障時の打ち切り期限で、正常性を判断する待ち時間ではない。成功/失敗の計10子に入っていた合計1.5秒の固定待機を撤去した。コードは36行追加・21行削除で純増15行。件数と行数の減少を目的にしていない。

維持する保証の対価として、失敗した子専用のログ保存・streamingの独立検査は外す。同じrunner転送経路を成功ケースで検査し、終了コードに応じた転送分岐はない。全5子のENOENTログ内容の反復も最初のログへ集約する。

Before/Afterともrunnerテスト3件成功。別コピーでstdoutを終了までbufferする変更と、最初の失敗でループをbreakする変更を試し、対象テストがそれぞれ失敗することを確認した。実際のrunner本体は変更していない。公開する故障ログの絶対パスは `<repo>` に置換した。[結果とhash](evidence-test-qa-runner-20260915/runner-results.json)、[Beforeログ](evidence-test-qa-runner-20260915/runner-before.txt)、[Afterログ](evidence-test-qa-runner-20260915/runner-after.txt)、[buffer故障](evidence-test-qa-runner-20260915/mutation-buffer-output.txt)、[継続故障](evidence-test-qa-runner-20260915/mutation-stop-after-failure.txt)。ログの所要時間は各1回のローカル実行で、性能比較の測定結果とは扱わない。

実際の `qa:check` も全5段階成功。source map・app/E2E型検査、全Unit954件/72file、開発E2E255件成功・1既存skipを確認。本番build/E2Eは今回ローカルでは再実行せず、PR CIで実行する。

先行PRとのローカル統合でもrunnerテスト3件成功。今回、統合ブランチの全Unit/E2Eは再実行していない。

Before `c6e07799cfec71aa7d345216acca780f048c0bb2` / After `1c988dc0f19a8f002c74abd02c279c513d8e45ab`、撮影時clean。552 sourceファイルを比較し、Beforeは基点SHAと一致、差分はrunnerテスト1fileのみ。既存ハーネスのシナリオ切替とJSON確認をdesktop/mobile Chromiumで実行し、両phaseで各2件成功。下記は同じ操作のmobile記録。画面・動画はUI操作の証跡で、runner内部の正しさは上記のプロセステストで評価する。

| 証跡 | Before | After |
|---|---|---|
| ハーネスのシナリオ切替とJSON確認 | ![Before](evidence-test-qa-runner-20260915/qa-harness-before.png) | ![After](evidence-test-qa-runner-20260915/qa-harness-after.png) |
| 操作動画 | [Before](evidence-test-qa-runner-20260915/qa-harness-before.webm) | [After](evidence-test-qa-runner-20260915/qa-harness-after.webm) |

2画像を確認し、2動画の全decodeとChromium再生/シークを確認した。[gallery](evidence-test-qa-runner-20260915/index.html) / [動画・画像のrevisionとSHA256](evidence-test-qa-runner-20260915/evidence.json)。詳細監査・UI Reviewは非追跡 `.work` に保存。

```bash
node --test scripts/qa-check.test.mjs
npm run qa:check
# 各revisionでbefore/afterを指定
npm run qa:capture -- before e2e/ui-audit.spec.ts --project=chromium --project=mobile-chrome
```

ローカル開発/撮影は専用Vite4186へ `QA_EXTERNAL_BASE_URL` で接続し、`.work`/`docs/qa` watch除外と専用cacheを設定。
