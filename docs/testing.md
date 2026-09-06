# 開発・テストハーネス

2026-09-06 / 対象: `PuzzleTools/puzzle-kit`。実測結果と既知不具合は [最新QA記録](qa/2026-09-06-editor-quality.md)を参照。UIレビューの作業文書は非追跡の `.work/ui-review/` に保存し、公開しない。

## 構成

- `src/test/fixtures/penpa-edit`: 出典を固定した外部互換テーブル（MIT）。兄弟フォルダ不要でparityを検証。
- `src/test` および `src/**/__tests__` / `*.test.ts`: Vitest + jsdom + Testing Library。純粋関数、Zustandストア、Reactコンポーネント、入力フックの統合を検証。
- `e2e/npgen.spec.ts`: 実際のWasm Workerによる生成、XML読込、盤面編集。XMLは `e2e/fixtures` に同梱。
- `e2e/editor-issues.spec.ts`: GitHub #40 / #20 / #19 / #22 と数字の矢印移動。実際の `/master` のUIを操作し、描画されたSVGを確認。ストアをブラウザーから直接書き換えない。
- `e2e/topology-issues.spec.ts`: 正方形/六角形の除外・復元、辺中点/半分の線とUndo/Redo、方向付き数字のBackspace。ハーネスで初期化して実際のポインターとキーボードを操作。
- `e2e/editor-quality.spec.ts`: Edit起動とPaint/Masterの最低限の盤面寸法。
- `e2e/ui-audit.spec.ts`: Home / Master / Edit / Paint / 開発ハーネスの起動、画面寸法、スクリーンショット。表示スモークテストの成功は操作性やアクセシビリティの適合を意味しない。
- `e2e/fixtures.ts`: uncaught browser exception を失敗として扱い、エラーを添付。QAでは成功時も画面を保存。
- `vite.qa.config.ts`: `.env` を読み込まないローカルQA用Vite設定。シェルから明示的に渡した `VITE_*` は有効なので、Firebase値をexportしている場合は解除する。

## 初回セットアップ

PRのcheckoutでは `npm ci` で依存を再現できる。Node 22.12以上とnpmが必要。親workspaceに依存せず、ローカルにインストールしたCLIで実行する。

```bash
npm ci
npx playwright install chromium
npm run qa:doctor
```

`package-lock.json` はPRに含める依存で更新済み。Vitestとcoverage providerは4.0.16で揃えている。Firebaseの設定は不要。

### 元の作業workspaceについて

このQAを最初に実施したローカル環境には、未コミットの `yajilin-kit: workspace:*` とtsx、および兄弟パッケージへの連携コードがあった。これらは今回のPRに含めない。元の作業ツリーで引き続き開発する場合は、親の `pnpm-workspace.yaml` / `pnpm-lock.yaml` を使う。

```bash
cd PuzzleTools
npm exec --yes --package=pnpm@11.20.0 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@11.20.0 -- pnpm --filter yajilin-kit build
cd puzzle-kit
npm run qa:doctor
```

元workspaceはpnpm11でインストールされ、PATH上のpnpmは10だったため依存更新時に `ERR_PNPM_UNEXPECTED_STORE` が発生した。グローバル設定を変えず同じpnpm11で更新する。doctorはyajilin-kitがpackage.jsonにある場合のみそれを検査する。

## 日常のコマンド

| コマンド | 用途 |
| --- | --- |
| `npm run test:unit` | unit / integrationを一度実行。E2Eは収集しない |
| `npm run test:watch` | 変更を監視して再実行 |
| `npm run test:unit -- src/test/canvasInteractionRegression.test.tsx` | #40の入力フック回帰テスト |
| `npm run test:coverage` | utils/store/hooks/npgenのカバレッジ。`coverage/index.html` |
| `npm run typecheck:e2e` | Playwright設定とE2Eテストの型チェック |
| `npm run typecheck` | アプリの型チェック |
| `npm run test:e2e` | 全E2E、Chromium + Pixel 7設定 |
| `npm run test:issues -- --project=chromium` | デスクトップのIssue回帰 |
| `npm run test:e2e -- --grep '#40' --project=chromium` | 1つのIssueに絞る |
| `npm run test:e2e:ui` / `npm run test:e2e:debug` | UI / ステップ実行 |
| `npm run test:e2e:report` | 最後の通常実行のHTMLレポート |
| `npm run qa:check` | 型チェック→unit→E2Eをすべて実行しログを保存 |

`qa:check` は途中で失敗しても残りの検査を実行し、どれかが失敗した場合は終了コード1を返す。結果は `artifacts/check/<timestamp>/summary.json`。テストの期待値による失敗と、依存やサーバーの起動失敗は保存ログで区別する。

E2Eは4174番ポートを専有し、既存サーバーを再利用しない。競合時は明示的に失敗する。別プロセスで同時にE2Eを起動しない。通常はテストごとに新しいブラウザーコンテキストを作る。Firebaseのログインや認証情報は不要。

Pixel 7設定のIssueテストは狭いviewportでのmouse/keyboard操作。実機の指ドラッグ・ソフトウェアキーボード・Safariまで保証するものではない。モバイルレイアウトの失敗を隠すskip/期待失敗指定は追加していない。

## 手動の開発ハーネス

```bash
npm run dev:harness
# http://127.0.0.1:4175/harness.html
# http://127.0.0.1:4175/harness.html?scenario=number
```

`free-segment` / `orthogonal` / `number` / `thermo` に加え、`square-exclusion` / `hex-exclusion` / `edge-lines` / `half-lines` / `directional-number` を選択できる。6×6の盤面と独立したストア・履歴・モーダルで開始する。Resetでシナリオを再初期化し、Inspect puzzle JSONでexport結果を確認する。

ハーネスはQA専用originの `puzzlekit*` 設定を初期化する。日常編集には別ポートの通常devを使う。保存済みパズルや別originのデータは削除しない。デスクトップでの利用を基本とする。`harness.html` はViteの本番build入力に含めず、開発時のみモジュールを読み込む。

## before / after の動画証跡

```bash
npm run qa:capture -- before e2e/editor-issues.spec.ts
# 修正する。beforeのフォルダは変更しない。
npm run qa:capture -- after e2e/editor-issues.spec.ts
npm run qa:compare -- artifacts/qa/<timestamp>-before artifacts/qa/<timestamp>-after
```

同じテストファイル・project・viewportを使う。`--project=chromium` や `--grep '#40'` で絞れる。生成されたcomparisonの `index.html` はブラウザーで直接開ける。左右の動画を同時に先頭から再生できるが、別実行なのでフレーム同期ではない。

各captureはユニークな日時フォルダに保存し、前回結果を上書きしない。

- `metadata.json`: phase、日時、HEAD、branch、作業ツリー状態、Node/npm、実行コマンド、終了コード。
- `working-tree.patch`: HEADからの追跡ファイル差分。未追跡ファイル本文は含まない。
- `source-manifest.json`: ソース・テスト・設定・スクリプトのSHA-256一覧。初期の実測captureにはこの後追加したmanifestはない。
- `results.json` / `run.log` / `report/`: 結果・ログ・HTMLレポート。
- `test-results/`: 成功・失敗両方の `video.webm`、trace、QAスクリーンショット。最初のbeforeではtraceは失敗時のみ。

```bash
npx playwright show-report artifacts/qa/<run>/report
npx playwright show-trace artifacts/qa/<run>/test-results/<test>/trace.zip
```

`artifacts/` と `coverage/` はGit対象外。証跡は作業フォルダに残るがGit pushでは共有されない。共有する場合はbefore/after/comparisonを相対位置を保ったまままとめて渡す。初期ハーネスの証跡に加え、[修正後の9フロー・18動画](qa/evidence-editor-quality-20260906/README.md) をGit管理している。

既存の `qa-npgen-capture.spec.ts` は `QA_VARIANT=before|after` の手動スクリーンショット用途。通常は4件skipされる。旧 `QA_STATIC_DIR` はそのファイル専用の静的ルーティングなので、全E2Eには設定しない。録画には新しい `qa:capture` を使う。

## テスト追加時の判断

純粋な変換/境界条件はunit、状態・Undo/Redo・フック連携はintegration、実ポインター入力/画面/WorkerはE2Eで検証する。Issue番号と望ましい動作をテスト名に書き、先にbeforeが実際の不具合で失敗することを確認する。セレクターの誤りによる失敗をbeforeの根拠にしない。例外を握りつぶしたり、固定sleepで通したりしない。

## CI

`.github/workflows/qa.yml` はPR/push時に独立した `npm ci` から型検査・unit・E2E・buildを実行する。成功時も動画・trace・レポートを30日保存する。[PlaywrightのCI手順](https://playwright.dev/docs/ci) に従いChromiumとOS依存をインストールする。UIレビューの `.work/` はアップロード対象に含めない。
