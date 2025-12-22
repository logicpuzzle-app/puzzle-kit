# Refactor Priority: Point/Target 解決の統一（puzzle-kit）

## 背景
入力系ロジックで「画面座標→セル/頂点/辺」の判定が分散しており、境界判定・トポロジ分岐・例外対応が各所で重複している。今後の機能追加とバグ修正の基盤として、最初にこの判定系を統一する。

## 目的
- オフボード操作やトポロジ境界の判定を一箇所で管理する。
- クリック/ドラッグ/キーボード入力の対象決定ロジックを再利用可能にする。
- ツールハンドラから「境界/トポロジ判定の重複」を排除する。

## 現状の課題
- `useCellFinder`、`useGridPointUtils`、`toolHandlerUtils.findNearestTarget` などで同様の分岐が増殖している。
- オフボードや outboard 判定の扱いが場所ごとに違い、仕様が不明瞭。
- ツール追加時に「また境界判定を書き足す」流れになっている。

## 方針（設計）
**Point/Target Resolver を新設し、全入力判定を経由させる。**

### 追加する純関数API（実装済み）
- `isPointInBounds(point, ctx): boolean`
  - topology あり: `topology.bounds` 判定
  - topology なし: `isPointInGrid`
- `resolveCell(point, ctx, options): CellInfo | null`
- `resolveVertex(point, ctx, options): TargetResult | null`
- `resolveEdge(point, ctx, options): TargetResult | null`
- `resolveTarget(point, ctx, types, options): TargetResult | null`
- `resolveGridPoint(point, ctx, allowedTypes, halfMode): { id, position } | null`

### ctx 構造
```
type ResolveContext = {
  grid: GridConfig;
  useTopology: boolean;
  topology: GridTopology | null;
};
```

### options
- `allowOutboard?: boolean`（デフォルト false）
- `maxDistance?: number`（既存の threshold と連携）

## 進捗
- [x] `src/utils/pointResolver.ts` を追加し、上記APIを実装（純関数のみ）
- [x] `src/hooks/useCellFinder.ts` を resolver 経由に置き換え
- [x] `src/hooks/useGridPointUtils.ts` の境界判定を resolver に委譲
- [x] `src/hooks/tool-handlers/toolHandlerUtils.ts` の `findNearestTarget` / `findCellIdFromPoint` を resolver に寄せる
- [x] 既存の境界判定・トポロジ分岐を削除（重複排除）
- [x] テストを追加（オフボード/トポロジ/outboard）

## Outboard handling policy
- allow outboard only for hint-like tools on problem layer
  - number*, text*, symbol*, select
- disallow outboard for line/surface/edge and all answer-layer inputs
- allow outboard in grid edit mode (toggle)
- helper: `src/utils/outboardPolicy.ts` for `shouldAllowOutboardForTool`

## Decisions
- special tools (thermo/arrow/cage/boxline) are not allowed on outboard
- auto-mode "line-cell" dot placement is not allowed on outboard
- selection/hover includes outboard only in problem layer

## Remaining questions
- none for now (revisit if outboard hint workflows expand)
## 完了条件
- オフボード操作で盤面が変化しない。
- トポロジ有無に関わらず入力挙動が一致する（同じルールで決まる）。
- 主要ツールハンドラに境界判定の重複が残っていない。

## Tests
- `src/test/pointResolver.test.ts` (bounds + outboard behavior)

## 影響範囲
- `src/hooks/useCellFinder.ts`
- `src/hooks/useGridPointUtils.ts`
- `src/hooks/tool-handlers/toolHandlerUtils.ts`
- `src/hooks/tool-handlers/useSurfaceToolHandler.ts`
- `src/hooks/useSelectionTool.ts`
- `src/hooks/tool-handlers/useElementToolHandler.ts`
- `src/hooks/tool-handlers/useLineToolHandler.ts`
- `src/hooks/useCanvasInteraction.ts`
- `src/components/canvas/InputHandlerLayer.tsx`
- `src/hooks/useSculptMode.ts`
- `src/utils/outboardPolicy.ts`

## 次のテーマ候補（簡潔に）
- 数字入力ロジックの統合（クリック/キーボード/候補）

## 編集可否ガードの一元化（player/answer/problem）
- [x] `src/utils/editPolicy.ts` を追加（canActivateLayer / canEditActiveLayer / canEditDataLayer / getEditableDataLayer）
- [x] `src/store/slices/layerSlice.ts` に適用
- [x] `src/store/slices/elementsSlice.ts` に適用
- [x] `src/hooks/useNumberKeyboard.ts` に適用
- [x] InputHandlerLayer / tool handlers / keyboard / panel input に横展開
- [x] `src/store/slices/solutionSlice.ts` も編集ガードを適用

## 数字入力ロジックの統合
- [x] 方向番号の direction 変換を `src/utils/directionalClue.ts` に集約
- [x] `src/hooks/useNumberKeyboard.ts` / `src/components/panels/properties/NumberInputPanel.tsx` / `src/components/panels/properties/ArrowDirectionSettings.tsx` に適用
- [x] クリック/キーボード/パネル入力の共通処理化（DirectionalClue/Numberの更新処理）
  - `src/utils/numberEntries.ts` で共通化（DirectionalClue/Numberの検索・変換）
  - InputHandlerLayer / NumberInputPanel / NumberPositionSettings / ColorSelector / useNumberKeyboard などに適用
- [x] 候補数字の取得を共通化（`getCellCandidates`）
- [x] 候補/検出ヘルパー追加（`getCandidateEntries` / `hasNumberAtCell`）
- [x] テスト追加（`src/test/directionalClue.test.ts` / `src/test/numberEntries.test.ts`）
- [x] max digits の算出を `getMaxDigitsForGrid` に統一
  - 方向数字の桁数上限を `<=2000:3桁 / >2000:4桁` に統一（キーボードとパネルで揃える）
- [x] 数字入力の桁数制限を共通化
  - パネルのカスタム入力/NumberInputDialog で数値のみ max digits を適用（非数値は対象外）
  - NumberInputDialog のクイック入力も `appendDigit` に統一（上限到達で置換）
- [x] DirectionalClue のクリック増分ロジックを共通化（`buildDirectionalClueIncrementPlan`）
- [x] Candidates の正規化/表示を共通化（`normalizeCandidates` / `candidatesToValue`）
- [x] 非数値入力の扱いを統一
  - constraint/number-directional ではキーボードとパネルの非数値入力を無効化（数値のみ）

## Directional/Number 統合（Number.direction/angle）
- [x] `NumberElement` に `direction` / `angle` を追加し、方向付き数字を Number 側に統合
- [x] `isDirectionalNumber` / `toPenpaDirectionalClue` を追加（判定とPenpa変換）
- [x] 方向付き数字は numbers に保存し、center 位置では通常数字と排他
- [x] legacy `directionalClues` は内部状態から削除し、互換用の入出力のみで扱う
- [x] `DirectionalClueLayer` は numbers のみを描画（legacy フォールバック削除）
- [x] `TrialStackLayer` は方向付き numbers を除外（方向付きは専用レイヤーで描画）
- [x] import/load 時に legacy `directionalClues` を directional numbers に統合
- [x] validator/highlight/solver は numbers から directional numbers を解決
- [x] export 時に directional numbers から legacy `directionalClues` を生成（Penpa/puzz.link）

## Store のマルチインスタンス対応（history/persistence/modal）
- [x] `PuzzleStore` に manager を持たせる（action/history/persistence）
- [x] `ActionExecutor` を history manager に束縛
- [x] 主要 slice が store 内の history manager を参照
- [x] `useStoreIntegration` / `useHistory` が store 参照に統一
- [x] `StatusBar` の履歴参照を store 参照に統一
- [x] modal store の context + provider + `createModalStore` を追加
- [x] import/export handlers を modal store 注入に変更
- [x] embedded example を modal provider 対応
- [x] `usePersistence` を任意 manager 対応に拡張
- [x] `syncHistoryToCommandStack` が任意 history manager を受け取れる
