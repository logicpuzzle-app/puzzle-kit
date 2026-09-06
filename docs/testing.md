# 開発・テストハーネス

2026-09-06 / 対象: `PuzzleTools/puzzle-kit`。実測結果と既知不具合は [最新QA記録](qa/2026-09-07-pinch-anchor.md)を参照。UIレビューの作業文書は非追跡の `.work/ui-review/` に保存し、公開しない。

## 構成

- `src/test/fixtures/penpa-edit`: 出典を固定した外部互換テーブル（MIT）。兄弟フォルダ不要でparityを検証。
- `src/test` および `src/**/__tests__` / `*.test.ts`: Vitest + jsdom + Testing Library。純粋関数、Zustandストア、Reactコンポーネント、入力フックの統合を検証。
- `e2e/npgen.spec.ts`: 実際のWasm Workerによる生成、XML読込、盤面編集。XMLは `e2e/fixtures` に同梱。
- `e2e/editor-issues.spec.ts`: GitHub #40 / #20 / #19 / #22 と数字の矢印移動。実際の `/master` のUIを操作し、描画されたSVGを確認。ストアをブラウザーから直接書き換えない。
- `e2e/topology-issues.spec.ts`: 正方形/六角形の除外・復元、辺中点/半分の線とUndo/Redo、方向付き数字のBackspace。ハーネスで初期化して実際のポインターとキーボードを操作。
- `e2e/pinch-anchor.chromium-touch.spec.ts`: ピンチ中心、副色誤判定、最初の描画・Pan Modeの境界を録画付きで検証。
- `e2e/multitouch-grid.chromium-touch.spec.ts`: 複数指の部分リリース、タッチのMerge/Splitと中断、Undo/Redoをmobile-chromeで検証。
- `e2e/grid-sculpt.spec.ts`: Sculpt Rotate/CutとUndo/Redoを全4projectのtouchscreen.tapで検証。
- `e2e/properties-drawer.spec.ts`: 狭幅Propertiesの開閉・設定・フォーカス・リサイズ・エラー通知を4projectで検証。
- `e2e/editor-quality.spec.ts`: Edit起動とPaint/Masterの最低限の盤面寸法。
- `e2e/ui-audit.spec.ts`: Home / Master / Edit / Paint / 開発ハーネスの起動、画面寸法、スクリーンショット。表示スモークテストの成功は操作性やアクセシビリティの適合を意味しない。
- `e2e/fixtures.ts`: uncaught browser exception を失敗として扱い、エラーを添付。QAでは成功時も画面を保存。
- `vite.qa.config.ts`: `.env` を読み込まないローカルQA用Vite設定。シェルから明示的に渡した `VITE_*` は有効なので、Firebase値をexportしている場合は解除する。

## 初回セットアップ

PRのcheckoutでは `npm ci` で依存を再現できる。Node 22.12以上とnpmが必要。親workspaceに依存せず、ローカルにインストールしたCLIで実行する。

```bash
npm ci
npx playwright install chromium webkit
npm run qa:doctor
```

`package-lock.json` はPRに含める依存で更新済み。Vitestとcoverage providerは4.1.11で揃えている。Firebaseの設定は不要。

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
| `npm run test:e2e` | 全E2E、Chromium / WebKitのdesktop・mobile設定 |
| `npm run test:issues -- --project=chromium` | デスクトップのIssue回帰 |
| `npm run test:e2e -- --grep '#40' --project=chromium` | 1つのIssueに絞る |
| `npm run test:e2e:ui` / `npm run test:e2e:debug` | UI / ステップ実行 |
| `npm run test:e2e:report` | 最後の通常実行のHTMLレポート |
| `npm run qa:check` | 型チェック→unit→E2Eをすべて実行しログを保存 |

`qa:check` は途中で失敗しても残りの検査を実行し、どれかが失敗した場合は終了コード1を返す。結果は `artifacts/check/<timestamp>/summary.json`。テストの期待値による失敗と、依存やサーバーの起動失敗は保存ログで区別する。

E2Eは4174番ポートを専有し、既存サーバーを再利用しない。競合時は明示的に失敗する。別プロセスで同時にE2Eを起動しない。通常はテストごとに新しいブラウザーコンテキストを作る。Firebaseのログインや認証情報は不要。

既存Issueテストはmouse/keyboard操作。`tap-input.spec.ts` は全4projectでtouchscreen.tap、`gestures.chromium-touch.spec.ts` はmobile-chrome専用のCDP touch入力でドラッグ・中断・パンを検証する。CDP専用ファイルは他projectのtestIgnoreで対象外にする。WebKit desktop/iPhone設定はSafari実機の検証ではなく、ソフトウェアキーボードやOS割込みも対象外。モバイルレイアウトの失敗を隠すskip/期待失敗指定は追加していない。

## 手動の開発ハーネス

```bash
npm run dev:harness
# http://127.0.0.1:4175/harness.html
# http://127.0.0.1:4175/harness.html?scenario=number
```

`free-segment` / `orthogonal` / `number` / `thermo` に加え、`square-exclusion` / `hex-exclusion` / `edge-lines` / `half-lines` / `directional-number` 、`square-merge` / `square-split` / `iso-sculpt` / `iso-sculpt-cut` を選択できる。6×6の盤面と独立したストア・履歴・モーダルで開始する。Resetでシナリオを再初期化し、Inspect puzzle JSONでexport結果を確認する。

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

`artifacts/` と `coverage/` はGit対象外。証跡は作業フォルダに残るがGit pushでは共有されない。共有する場合はbefore/after/comparisonを相対位置を保ったまままとめて渡す。初期ハーネスの証跡に加え、[修正後の9フロー・18動画](qa/evidence-editor-quality-20260906/README.md) と[複数指・Gridの7フロー・14動画](qa/evidence-multitouch-grid-20260906/README.md)をGit管理している。

既存の `qa-npgen-capture.spec.ts` は `QA_VARIANT=before|after` の手動スクリーンショット用途。通常は4件skipされる。旧 `QA_STATIC_DIR` はそのファイル専用の静的ルーティングなので、全E2Eには設定しない。録画には新しい `qa:capture` を使う。

## テスト追加時の判断

純粋な変換/境界条件はunit、状態・Undo/Redo・フック連携はintegration、実ポインター入力/画面/WorkerはE2Eで検証する。Issue番号と望ましい動作をテスト名に書き、先にbeforeが実際の不具合で失敗することを確認する。セレクターの誤りによる失敗をbeforeの根拠にしない。例外を握りつぶしたり、固定sleepで通したりしない。

## CI

`.github/workflows/qa.yml` はPR/push時に独立した `npm ci` から型検査・unit・E2E・buildを実行する。成功時も動画・trace・レポートを30日保存する。[PlaywrightのCI手順](https://playwright.dev/docs/ci) に従いChromium/WebKitとOS依存をインストールする。UIレビューの `.work/` はアップロード対象に含めない。

## タッチとWebKitの回帰

```bash
npm run qa:capture -- before e2e/gestures.chromium-touch.spec.ts e2e/tap-input.spec.ts --project=mobile-chrome
npm run qa:capture -- after e2e/gestures.chromium-touch.spec.ts e2e/tap-input.spec.ts --project=mobile-chrome
npm run test:e2e -- --project=webkit --project=mobile-webkit
```

[Playwrightのデバイス設定](https://playwright.dev/docs/emulation) と [CDP touch入力](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent) を使う。マウスイベントをtouchと呼び換える方法ではなく、ブラウザーのtouch/pointer経路を実行する。WebKitではCDPを使わずtapと既存操作を検証する。

CIはPRおよびdevelop/puzzle-kit-refactorへのpushで実行し、featureへのpushとPRで同じ検査・大容量動画が二重保存されることを避ける。

### LinuxコンテナでCIのタッチ入力を再現する

MacとLinuxで入力処理が違う場合は、インストール済みのPlaywrightと同じ版の公式コンテナから専用ハーネスに接続する。Docker Desktopと`npm ci`が必要。`QA_EXTERNAL_BASE_URL`を指定した場合、Playwright自身はViteを起動しない。

別ターミナルでQAサーバーを起動する（コンテナ用のポート。検証後はCtrl+Cで停止）。

```bash
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=host.docker.internal npm run dev -- --config vite.qa.config.ts --host 0.0.0.0 --port 4176 --strictPort
```

```bash
qa_root="$PWD"
qa_evidence="$qa_root/artifacts/linux-touch-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$qa_evidence"
docker run --rm --init \
  --mount "type=bind,source=$qa_root,target=/work,readonly" \
  --mount "type=bind,source=$qa_evidence,target=/evidence" \
  --env QA_ARTIFACT_DIR=/evidence \
  --env QA_EXTERNAL_BASE_URL=http://host.docker.internal:4176 \
  --workdir /work mcr.microsoft.com/playwright:v1.62.0-noble \
  node node_modules/@playwright/test/cli.js test \
  e2e/gestures.chromium-touch.spec.ts e2e/tap-input.spec.ts --project=mobile-chrome
```

録画・trace・入力イベント・HTMLレポートは作成した証跡フォルダに残る。ソースは読み取り専用。Apple Silicon上ではLinux arm64であり、GitHub Actionsのx64と同一ハードウェアとはしない。

描画ドラッグは終点で150ms静止してから指を離す入力条件を使う。高速移動中のまま離すと、LinuxのCDPが`GestureFlingStart`を発生させ、直後のタップが慣性停止に消費されることを内部トレースで確認した。この150msは指を接触させている時間で、操作後にアプリの状態が変わるのを待つsleepではない。Undoボタンは通常の`locator.tap()`で操作し、結果をそのまま検証する。`touchCancel`は静止を挟まず送信する。
