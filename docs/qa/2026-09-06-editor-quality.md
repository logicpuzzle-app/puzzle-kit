# Editor修正のQA記録

検証日: 2026-09-06。`feature/editor-quality`、アプリ修正の検証対象HEAD `da2a9cb`。依存更新後にも下記の全検査を再実行。独立したnpm checkoutで実行。前提のハーネスはPR #48。

## 全体検証

| 検査 | 結果 |
| --- | --- |
| アプリ型検査 | PASS（修正前の32 diagnosticsを解消） |
| E2E型検査 | PASS |
| Vitest unit/integration | 59 files / 978 tests PASS |
| Playwright | 50 PASS / 4 SKIP / 0 FAIL、Chromium Desktop・Pixel 7設定 |
| 本番build | PASS |
| coverage実行 | 978件PASS、Statements 33.28% / Branches 28.16% / Functions 32.38% / Lines 33.58% |
| npm audit | 22件（critical 4）→0件 |

4 SKIPは既存の `qa-npgen-capture.spec.ts` の手動captureで、通常実行には `QA_VARIANT` を設定しないため。今回の不具合テストをskipしていない。ローカルNode v25.2.1 / npm 11.7.0、CIはNode 24。既存solverのsource map不足とbuildの500KB超chunk警告は残る。

実行記録: `artifacts/check/2026-09-06T01-54-51-810Z`、依存更新後は `artifacts/check/2026-09-06T02-02-28-499Z`。成功時も動画・trace・スクリーンショットを保存。CIの実行結果はGitHubのchecksを参照し、このローカル成功と区別する。

## 回帰の証拠

[9フローのbefore/after動画](evidence-editor-quality-20260906/README.md) を同梱。完全なcaptureの相対位置を保持すれば `npm run qa:compare -- <before> <after>` でも比較できる。

| 修正・検証 | Before | After |
| --- | --- | --- |
| Edit起動、Paint/Masterの盤面寸法、既存Issue入力 | 7 FAIL / 9 PASS | 16 PASS |
| 正方形・六角形の除外復元、辺中点・半分の線、方向数字削除 | 10 FAIL | 10 PASS |
| Masterの選択状態とキーボード操作 | 2 FAIL | 2 PASS |
| 除外・クリック吸着のunit | 5 FAIL / 11 PASS | 16 PASS |
| topology接続ルール | 追加19件 | 19 PASS |
| StatusBarのcursor/pan更新によるcommit | 2回（Profiler） | 0回。zoom/grid変更は反映 |

除外したセルを再クリックすると隣接セルが消えていた。除外用の当たり判定では除外前のtopologyを使い、通常入力の穴への過剰な吸着も制限した。legacy `disabledCells` の個別復元にも対応。

#18の六角形の除外直後の表示反映は、この基準では既に成功していた。#23の復元は正方形・六角形の両方で再現し修正。#21は辺の中点とcell-edge半分の線を描画し、Undo/Redoまで検証。#19は通常数字に加え方向付き数字のBackspace削除を検証。

既存PR #37/#38/#39/#42/#43/#47の関連実装を確認し、必要なソース差分を現在のブランチへ適合させた。これらのPRをmerge/closeしていない。

## 再現手順

```bash
npm ci
npx playwright install chromium
npm run qa:doctor
npm run qa:check
npm run build
npm run qa:capture -- before e2e/topology-issues.spec.ts
# 修正後、同じテストを実行
npm run qa:capture -- after e2e/topology-issues.spec.ts
npm run qa:compare -- artifacts/qa/<before> artifacts/qa/<after>
```

操作フローの制約: Pixel 7設定でmouse/keyboard操作を実行。実機touch、iOS Safari、ソフトウェアキーボードは未検証。選択状態の公開は限定的なa11y改善でありWCAG適合の判定ではない。ストア購読の改善はStatusBarと同値viewport更新に限定し、アプリ全体の性能改善率は計測していない。

## 依存の追加検証

Vitest/coverageを4.1.11に揃え、Vite 7.3.6、PostCSS 8.5.28、uuid 13.0.2など、既存semver範囲内の修正版へlockfileを更新した。`npm ci` から再実行し、型検査・unit978件・E2E50件・build・coverageが成功。監査の0件は2026-09-06時点のnpm advisory結果であり、未知の問題まで保証しない。

[Vitestの公式advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp) が4.0系のUIサーバー利用条件での問題を報告している。[Viteの公式advisory](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff) も確認した。元のテスト実行でこれらが悪用されたという意味ではない。

[最終検証の数値とlockfile SHA-256](editor-quality-verification.json)。coverageの対象は `vite.config.ts` のutils/store/hooks/npgenであり、アプリ全コードの比率ではない。`coverage/index.html` に詳細を生成する。
