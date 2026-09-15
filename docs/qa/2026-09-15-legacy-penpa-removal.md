# 未使用Penpa変換実装の撤去 QA

`src/utils/penpaConverter.ts` はアプリから参照されず、公開ライブラリのexportsにも含まれていませんでした。参照元は `penpaConverter.test.ts` と `penpaRoundTrip.test.ts` の2つだけで、アプリ・ライブラリの型検査からも明示的に除外されていました。現役の処理は `penpaCompat.ts` にあります。

旧実装935行と専用テスト594行・29件を撤去し、2つのtsconfigから不要な除外指定を削除しました。監査C024–C026は、利用経路の追加調査に基づいて「テストを縮約」から「未使用実装と専用テストを撤去」へ判断を更新しています。これらのテストを削除しても、現役アプリ・公開ライブラリの不具合検出は失われません。

変更コミットは `e7b7f651e09a679484a01508eca908960ac350b8`。基準コミットは `c6e07799cfec71aa7d345216acca780f048c0bb2` です。

検証結果:

- アプリbuild成功。撤去前後の生成物87ファイルは、すべてSHA256が一致しました。
- Unit925件／70ファイル、開発版E2E255成功・1既存スキップ、本番版Chromium70成功・1既存スキップ。
- source map確認、アプリ／E2E型検査成功。
- PR #72との一時統合は競合なし、`build:lib` 成功。基準コミットにあるライブラリの型エラーはPR #72で修正されます。

Masterのツールバーから既存のPenrose solve URLを取り込み、10セルの塗り・対象セルの色・SVG中心座標をPlaywright + Chromiumで確認しました。Beforeは同じ基準コミットで取得した共通録画を使用し、作業用worktreeのソース552ファイルとの一致も検証しています。Afterは撤去コミットの変更なしの作業ツリーで撮影しました。

| Before `c6e0779` | After `e7b7f65` |
|---|---|
| ![Before](evidence-legacy-penpa-removal-20260915/penrose-import-before.png) | ![After](evidence-legacy-penpa-removal-20260915/penrose-import-after.png) |
| [Before動画](evidence-legacy-penpa-removal-20260915/penrose-import-before.webm) | [After動画](evidence-legacy-penpa-removal-20260915/penrose-import-after.webm) |

録画2本の全デコード、Chromiumでの再生・シークを確認済み。runtime errorは0件。[revision・固定期待値・SHA256](evidence-legacy-penpa-removal-20260915/evidence.json) / [比較用HTML](evidence-legacy-penpa-removal-20260915/index.html)。

現役Penpa APIのテスト整理はPR #74に分離しており、この撤去はそのPRに依存しません。詳細な利用経路調査とUIレビューは非追跡 `.work` に保存しています。
