# Migration Checklist (puzzle-kit vs penpa-edit)

Status: 2025-02-xx — code snapshot from `src/` (80 TS/TSX files) and 18 test files (515 tests reported upstream; local run blocked by Node version)

## What’s implemented (parity-focused)
- **Penpa互換シリアライズ**: `src/utils/penpaSerializer.ts`（30置換 + zlib/Base64URL）、`penpaCompat.ts`（puzz.link URLパース）、`penpaConverter.ts`（Penpa ⇔ PuzzleKit変換）。対応テスト: `penpaSerializer.test.ts`、`penpaRoundTrip.test.ts`、`importExport.test.ts`。
- **グリッド/幾何**: square/hex/tri/pyramid（`src/types/*Point.ts`, `gridPointUtils.ts`）で隣接/周囲/対角を網羅。対応テスト: `hexPoint.test.ts` など幾何系多数。
- **モード/描画レイヤー**: surface/line/edge/wall/cage/thermo-arrow/special/symbol/number（`src/components/canvas/*Layer.tsx`）。ペンパの線/シンボル/色定義は `penpaModes.ts`, `penpaElements.ts` に整理済み。
- **入力/操作感**: キーショートカット（`useKeyboardShortcuts.ts`, `usePenpaKeyboard.ts`）、タッチ（`usePenpaTouch.ts`）、矩形選択（`useRectangleSelect.ts`）、右クリック/長押し（`useRightClick.ts`）、ペンパ風モード/色/スタイルパネル（`src/components/panels/*`）。
- **エクスポート**: PNG/SVG/JSON出力とUI（`src/utils/export.ts`, `ImportExportDialog.tsx`）。グリッド設定ダイアログあり。
- **ストア**: Zustandでproblem/answer両レイヤー・全ツール要素を保持、Undo/Redo履歴付き（`src/store/puzzleStore.ts`）。ストア統合テストあり。

## Gaps vs penpa-edit
- **i18n/翻訳**: 基盤はあるが辞書未完。
- **制約・ジャンルタグ**: 未実装。
- **Solution Area（マスク）**: 未実装。
- **Multicolor Surface**: 型はあるがUI/入力が未完（多色塗り・第2色運用）。
- **背景画像編集**: 未実装。
- **設定保存**: ローカル設定の永続化は未整備。
- **CI/実行環境**: Nodeバージョン依存でローカル test:run が失敗（要 Node>=20）。CI未設定。

## Recommended next steps
1) **環境整備**: Node 20系でCI（lint/test）を回す。ローカル test:run を復活。
2) **Solution Area & Multicolor**: マスク描画/入力と多色塗りUIを実装し、ペンパ互換テストを追加。
3) **i18n/設定/背景**: 翻訳辞書投入、設定永続化、背景画像編集を移植。
4) **制約・ジャンルタグ**: データ定義とUIを追加し、既存リンクとの互換性をテスト。
5) **回帰テスト拡充**: 既存 penpa スナップショットを使った往復・描画スナップテストを強化（特に未実装領域）。 
