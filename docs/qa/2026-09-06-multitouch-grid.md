# Multi-touch / Grid QA記録

基準`e6c5ab7`（PR #50）、branch `feature/multitouch-grid-quality`。Playwright 1.62.0 / Vitest 4.1.11。検証の手順・結果を記録し、UI Reviewは非追跡の`.work/ui-review/`に保存する。

## 再現と修正

- 複数指操作で、最初のリリース後も残った指のパンを継続。最後のリリースまで履歴を保持する。
- 指の増減時にピンチ基準を更新。移動した操作をタップと解釈せず、静止した2本指secondary/3本指deleteは最後に1回実行する。
- キャンセルでは未確定の線・Merge・Splitを破棄。古い指の遅延リリースが、新しい入力を終了しないことをunitで検証。
- Merge/Split/Sculptをタッチから既存のGridハンドラーへ接続。形状とtopologyを同じ履歴へ保存し、Undo/Redoで表示も復元する。操作済みのincremental編集は中断後もUndoできる。
- unmerge、split削除・全削除にも履歴を追加。重複splitは履歴を増やさない。

## Before / after

同一のmobile-chrome 7ケースで **7 FAIL → 7 PASS**。[7フロー・14本の比較動画](evidence-multitouch-grid-20260906/README.md)を保存した。

Before: `artifacts/qa/2026-09-06T08-02-56-086Z-before`。After: `artifacts/qa/2026-09-06T08-07-47-286Z-after`。動画・trace・入力イベント・ソースmanifest・差分を保存。途中のセレクター/入力方法の診断実行は比較証跡に使っていない。

Unitは最初の8ケースで5 FAIL / 3 PASSから修正後8 PASS。さらに指を離す順序、移動と静止、キャンセル後の再入力、同一点での接触、multi-touch無効設定、Grid履歴の往復を追加し17 PASS。

## 再実行

```bash
npm run dev:harness
# square-merge / square-split / iso-sculpt / iso-sculpt-cut
npm run test:unit -- src/test/multitouchGridRegression.test.tsx
npm run qa:capture -- before e2e/multitouch-grid.chromium-touch.spec.ts e2e/grid-sculpt.spec.ts --project=mobile-chrome
# 修正後に同じ指定でafterを実行
npm run qa:capture -- after e2e/multitouch-grid.chromium-touch.spec.ts e2e/grid-sculpt.spec.ts --project=mobile-chrome
npm run qa:check
npm run build
```

Sculptのtapテストは4つのbrowser/device project、CDP複数指・Merge/Splitはmobile-chromeで実行する。部分touchEndは離す接触点を明示するChromium 151の動作を実測したもの。ドラッグは終点で150ms静止してから離し、慣性による次タップの抑制を避ける。実機SafariやOSの割込み、筆圧等の検証とは区別する。

全体検証: `qa:check`で型チェック2種、unit 1,003件（61ファイル）、E2E 130件がPASS。既存の手動QA 8件はskip。Production buildもPASS。記録は`artifacts/check/2026-09-06T08-11-54-268Z/`。比較ページの動画14本は読み込み・再生時間・寸法を確認済み。Linux CIの最終結果は、この変更のPRに記載する。
