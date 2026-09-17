# 座標参照の移行方針

設計の正本は[盤面IDの契約](board-id-contract.md)、
現状との差分は[移行一覧](board-id-migration.md)を参照する。

旧版の `coord: [col, row]` 案は現在の型定義と一致していないため廃止する。
現在の `TopologyCell / TopologyVertex / TopologyEdge` は
`index?: [number | null, number | null] | null` を持ち、順序は **[row, col]**。
描画位置は `center / position / midpoint` の **{x, y}** として取得する。

移行時には以下に従う。

1. トポロジ要素をIDで引き、既存の `getCellIndex / getVertexIndex / getEdgeIndex`
   または要素の `index` を使う。欠損やnullを確認する。
2. indexがない場合もID文字列を解析しない。対応不能な操作は明示的に扱う。
3. 旧Grid形式は入力形式が分かる境界でlookup/変換する。Gridのlookupは
   任意のTopology IDを解決するAPIではない。
4. 隣接は接続データから取得する。indexの一意性・永続性を仮定しない。
5. 保存、盤面編集、Undo/RedoでIDと参照の同一性を検証する。

新たな `coord` フィールドや「indexがなければparseする」フォールバックを追加しない。
