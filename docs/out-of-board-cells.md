# 盤面外マス（Out-of-board cell）導入方針

## 目的
- 不定形盤面や穴あき盤、解答禁止領域を「セルとして扱わない」明示的領域として表現する。
- 検証や入力処理で「無視」「通過不可」を判定しやすくする。

## 現状の表現
- **GridConfig**: `voidCells` / `outboardCells` を保持（legacy `disabledCells` は void 扱い）。
- **TopologyCell**: `outboard?: boolean` を保持。void はトポロジに生成されない。
- **ID 方針**: outboard は通常の `cell-*` ID を維持（ID 体系変更なし）。

## 入力・UI
- void はヒットしない（hover も無効）。
- outboard は問題レイヤーでヒント系のみ許可（number/text/symbol/select）。
- line/surface/edge と answer レイヤーは outboard を禁止。
- grid 編集は outboard を許可（切替用）。
- 判定は `pointResolver` + `outboardPolicy` に集約。

## 検証/ソルバー
- 連結判定・隣接探索で void は「セルが無い」扱い：隣接リスト構築時に除外するか、探索時に `kind==='void'` をスキップ。
- ルールにより「壁」として扱うか「欠損」として扱うかを選択できるよう、`topology` 生成時に隣接を張る/張らないで制御する（張らなければ空隙、張れば固定壁と同等）。
- ソルバーへも `kind` 情報を渡し、盤面サイズやクルーの位置計算で void を除外。

## Import/Export
- Penpa/Puzz.link は基本「盤面外」をサポートしないため、
  - **Import**: 形状から void を推定できる場合のみ生成、それ以外は全セル normal。
  - **Export**: void がある場合は Penpa の不可マス（背景色や枠無し）に写像するか、非対応エラーを返す方針を明示。

## ストレージ/シリアライズ
- `PuzzleState` に void を直接持たせず、`topology` のセル属性で表現。保存時は topology を含めて永続化。
- 互換性確保のため、新フィールドは後方互換（欠落時は normal と解釈）。

## 決定事項
- outboard への special ツール（thermo/arrow/cage/boxline）は禁止。
- auto-mode の line-cell で dot 置きは outboard 禁止。

## 論点
- **隣接の定義**: void を「空隙」とするか「壁」とするかでループ/連結ルールが変わる。パズル種別ごとに設定が必要。
- **見た目**: 透明にするか、淡色マスクで示すか。印刷時も考慮。
- **操作感**: void に近接したドラッグ操作の許容幅（スナップ範囲）をどうするか。
- **互換性**: 既存 ID 体系を崩さないこと（非正方形トポロジでの void も同様に扱う）。
- **外周ヒント**: 盤面外セルに数字や矢印を配置する要望に対応する場合、
  - 現状は outboardCells + `shouldAllowOutboardForTool` で number/text/symbol/select のみ対応。
  - 追加ツールの許可は `outboardPolicy` の更新で対応。
  - Export/Import は対応フォーマットが限定されるため、非対応時はエラーまたは無視を明示する。
