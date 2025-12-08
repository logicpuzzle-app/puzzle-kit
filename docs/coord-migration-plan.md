# Coord メタ導入・移行方針（puzzle-kit）

## 目的
- `cellId` 文字列パースに依存しない座標参照を実現するため、トポロジ要素に `coord` メタを持たせる。
- 非正方形・連番IDでも安定して座標/隣接を扱えるようにする。

## 型仕様
- `TopologyCell.coord?: [number | null, number | null] | null`
- `TopologyVertex.coord?: [number | null, number | null] | null`
- `GridPoint` など既存ポイント構造にも同仕様を追加（互換性用）。
- 参照時は必ず `coord && coord[0] != null && coord[1] != null` を確認。

## 生成時ルール
- 正方形/一般格子: `coord = [col, row]` を必ずセット。
- 判定不能な特殊トポロジ: `coord = null` を明示（未設定を判別しやすくする）。

## API 追加
- `topology/queries` に `getCellCoord`, `getVertexCoord`（coord をそのまま返す、無ければ null）。
- `parseCellId/parseVertexId` はレガシー互換として残すが「非推奨」コメントを付ける。

## 移行手順
1. 型定義を更新し、全トポロジ生成器（`regular/*`, `tilings/*`, `dual/*`, `special/*`, sculpt/resize）で `coord` をセット。`GridPoint` 生成にも付与。
2. ヘルパ追加＆既存コードを `coord` 参照に置換。`coord` 無しの場合のみ従来パースへフォールバック。
3. Import/Export（`puzzlinkExporter`, `penpaCompat`, `penpaConverter`, `pzprv3Parser` など）の `cell-<r>-<c>` パース依存を `coord` 参照に置換。トポロジ無し/未設定はガードしてエラー/限定サポートを明記。
4. Validators 全般を `row/col ループ→topology.cells イテレーション + coord` に書き換え。上下左右判定は `coord` + `width/height` か隣接APIで解決。
5. UI/ハンドラ層（hover/クリック処理）で、座標取得が必要な箇所を `coord` 参照に統一。
6. テスト: 正方形トポロジで退行が無いこと、coord 未設定でも落ちないガードを確認。
