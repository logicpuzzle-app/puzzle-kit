# セル結合・分割機能の設計

## 概要

グリッド編集モードの「結合」「分割」機能は、トポロジーデータ構造の変更を伴う複雑な操作です。このドキュメントでは、実装に必要な概念と手順を説明します。

## 現在の実装状況

### 完了済み
- UI インタラクション（ドラッグでセル選択、頂点選択）
- プレビュー表示（マージ中のセルハイライト、分割線のプレビュー）
- Store アクション（`mergeCells`, `unmergeCells`）
- `GridConfig.mergedCells` 型定義
- 分割機能の基本実装

### 未実装
- **トポロジーの再構築** ← 現在の課題
- マージ/分割後の描画が反映されない

## 問題点

現在、`mergedCells` や分割情報は `GridConfig` に保存されているが、**topology 自体は再構築されていない**ため、グリッド描画に反映されない。

```
GridConfig.mergedCells → 保存されている
      ↓
topology → 再構築されていない ← ここが問題
      ↓
TopologyGrid → 古い topology を描画
```

---

## トポロジー再構築の方針

### 方針1: 描画時にマージ情報を反映（部分的解決）

最も簡単だが限定的な方法。`TopologyGrid` で `mergedCells` を参照し、内部エッジを非表示にする。

**メリット:**
- 実装が簡単
- 既存のトポロジー構造を変更しない

**デメリット:**
- トポロジーの隣接情報が不正確なまま
- パズル要素（Surface, Number等）がマージセルを認識できない
- パスファインディングが正しく動作しない

**実装:**
```typescript
// TopologyGrid.tsx
const hiddenEdges = useMemo(() => {
  if (!mergedCells) return new Set<string>();
  const hidden = new Set<string>();
  for (const group of mergedCells) {
    // 両側のセルが同じグループ内にあるエッジを非表示
    for (const [edgeId, edge] of topology.edges) {
      if (edge.adjacentCells.every(c => group.includes(c))) {
        hidden.add(edgeId);
      }
    }
  }
  return hidden;
}, [topology, mergedCells]);
```

### 方針2: トポロジーを完全に再構築（推奨）

`GridConfig` の変更時にトポロジーを再生成する。

**メリット:**
- 完全に正確なトポロジー
- 全てのパズル機能が正しく動作

**デメリット:**
- 実装が複雑
- パフォーマンスへの影響（大きなグリッドで）

**実装の流れ:**

```
1. GridConfig 変更検知
   ↓
2. ベーストポロジー生成（gridType から）
   ↓
3. マージ処理（mergedCells を適用）
   ↓
4. 分割処理（splitLines を適用）
   ↓
5. 新しい topology を store に設定
```

### 方針3: 差分更新（最適化版）

変更があった部分のみトポロジーを更新する。

**メリット:**
- パフォーマンスが良い
- 大きなグリッドでも高速

**デメリット:**
- 実装が最も複雑
- エッジケースの処理が難しい

---

## 推奨実装手順

### Step 1: トポロジー再構築関数の作成

```typescript
// src/utils/topology/rebuild.ts

interface RebuildOptions {
  baseTopology: GridTopology;
  mergedCells?: string[][];
  splitLines?: SplitLine[];
}

export function rebuildTopology(options: RebuildOptions): GridTopology {
  const { baseTopology, mergedCells, splitLines } = options;

  // 1. ベーストポロジーをコピー
  let topology = cloneTopology(baseTopology);

  // 2. マージ処理
  if (mergedCells && mergedCells.length > 0) {
    topology = applyMerges(topology, mergedCells);
  }

  // 3. 分割処理
  if (splitLines && splitLines.length > 0) {
    topology = applySplits(topology, splitLines);
  }

  return topology;
}
```

### Step 2: マージ処理の実装

```typescript
function applyMerges(topology: GridTopology, mergedCells: string[][]): GridTopology {
  for (const group of mergedCells) {
    if (group.length < 2) continue;

    // 1. グループ内のセルを取得
    const cells = group.map(id => topology.cells.get(id)).filter(Boolean);

    // 2. 外周頂点を計算
    const outerVertices = computeOuterBoundary(topology, cells);

    // 3. 内部エッジを削除
    const internalEdges = findInternalEdges(topology, group);
    for (const edgeId of internalEdges) {
      topology.edges.delete(edgeId);
    }

    // 4. 内部頂点を削除（全ての隣接セルがグループ内）
    const internalVertices = findInternalVertices(topology, group);
    for (const vertexId of internalVertices) {
      topology.vertices.delete(vertexId);
    }

    // 5. 新しいマージセルを作成
    const mergedCell = createMergedCell(cells, outerVertices);

    // 6. 古いセルを削除し、新しいセルを追加
    for (const id of group) {
      topology.cells.delete(id);
    }
    topology.cells.set(mergedCell.id, mergedCell);

    // 7. 隣接情報を更新
    updateAdjacencyInfo(topology, mergedCell, group);
  }

  return topology;
}
```

### Step 3: 分割処理の実装

```typescript
function applySplits(topology: GridTopology, splitLines: SplitLine[]): GridTopology {
  for (const split of splitLines) {
    const { cellId, startPoint, endPoint } = split;
    const cell = topology.cells.get(cellId);
    if (!cell) continue;

    // 1. 分割線の頂点を取得/作成
    const v1 = getOrCreateVertex(topology, startPoint);
    const v2 = getOrCreateVertex(topology, endPoint);

    // 2. セルを2つに分割
    const [newCell1, newCell2] = splitCellByLine(cell, v1, v2);

    // 3. 新しいエッジを作成
    const newEdge = createEdge(v1, v2, [newCell1.id, newCell2.id]);
    topology.edges.set(newEdge.id, newEdge);

    // 4. 古いセルを削除し、新しいセルを追加
    topology.cells.delete(cellId);
    topology.cells.set(newCell1.id, newCell1);
    topology.cells.set(newCell2.id, newCell2);

    // 5. 隣接情報を更新
    updateAdjacencyAfterSplit(topology, cellId, newCell1, newCell2);
  }

  return topology;
}
```

### Step 4: Store での統合

```typescript
// puzzleStore.ts

// GridConfig 変更時にトポロジーを再構築
setGrid: (updates) => set((state) => {
  const newGrid = { ...state.grid, ...updates };

  // マージ/分割情報が変更された場合、トポロジーを再構築
  if (updates.mergedCells !== undefined || updates.splitLines !== undefined) {
    const baseTopology = generateBaseTopology(newGrid);
    const rebuiltTopology = rebuildTopology({
      baseTopology,
      mergedCells: newGrid.mergedCells,
      splitLines: newGrid.splitLines,
    });
    return { grid: newGrid, topology: rebuiltTopology };
  }

  return { grid: newGrid };
}),
```

### Step 5: useEffect での自動再構築

```typescript
// App.tsx または専用フック

useEffect(() => {
  if (grid.mergedCells || grid.splitLines) {
    const baseTopology = generateTopology(grid);
    const rebuiltTopology = rebuildTopology({
      baseTopology,
      mergedCells: grid.mergedCells,
      splitLines: grid.splitLines,
    });
    setTopology(rebuiltTopology);
  }
}, [grid.mergedCells, grid.splitLines, grid.gridType, grid.rows, grid.cols]);
```

---

## セル結合（Merge）

### データ構造

```typescript
// GridConfig に追加済み
interface GridConfig {
  // ...
  mergedCells?: string[][];  // 各配列がマージされたセルのグループ
}

// 例: cell-0-0, cell-0-1, cell-1-0, cell-1-1 を結合
mergedCells: [
  ['cell-0-0', 'cell-0-1', 'cell-1-0', 'cell-1-1']
]
```

### トポロジー再構築の手順

1. **マージ対象セルの収集**
   ```typescript
   const cellsToMerge = mergedCells[groupIndex];
   const topologyCells = cellsToMerge.map(id => topology.cells.get(id));
   ```

2. **外周頂点の計算**
   - マージされたセル群の外周を構成する頂点のみを抽出
   - 内部の頂点（全ての隣接セルがマージ対象）は削除

   ```typescript
   function getOuterBoundary(cells: TopologyCell[]): string[] {
     const cellIdSet = new Set(cells.map(c => c.id));
     const outerVertices: string[] = [];

     for (const cell of cells) {
       for (const vertexId of cell.boundaryVertices) {
         const vertex = topology.vertices.get(vertexId);
         // この頂点に隣接するセルのうち、マージ対象外のものがあれば外周
         const hasExternalNeighbor = vertex.adjacentCells.some(
           adjCellId => !cellIdSet.has(adjCellId)
         );
         if (hasExternalNeighbor) {
           outerVertices.push(vertexId);
         }
       }
     }

     // 頂点を順番に並べ替え（時計回り）
     return sortVerticesClockwise(outerVertices);
   }
   ```

3. **内部エッジの削除**
   - 両端のセルが両方ともマージ対象のエッジを削除

   ```typescript
   function getInternalEdges(cells: TopologyCell[]): string[] {
     const cellIdSet = new Set(cells.map(c => c.id));
     const internalEdges: string[] = [];

     for (const cell of cells) {
       for (const edgeId of cell.boundaryEdges) {
         const edge = topology.edges.get(edgeId);
         // 両側のセルがマージ対象なら内部エッジ
         if (edge.cells.every(cellId => cellIdSet.has(cellId))) {
           internalEdges.push(edgeId);
         }
       }
     }
     return internalEdges;
   }
   ```

4. **新しいマージセルの作成**
   ```typescript
   const mergedCell: TopologyCell = {
     id: `merged-${groupIndex}`,  // または最初のセルIDを使用
     center: computeCentroid(outerVertices),
     boundaryVertices: outerBoundary,
     adjacentCells: getExternalAdjacentCells(cells),
     boundaryEdges: getOuterEdges(cells),
     row: cells[0].row,  // 代表値
     col: cells[0].col,
   };
   ```

5. **隣接情報の更新**
   - 外部セルの `adjacentCells` を更新
   - 頂点の `adjacentCells` を更新

### 描画の変更

`GridLayer.tsx` での描画時：
```typescript
// マージされたセルは1つのポリゴンとして描画
if (grid.mergedCells) {
  for (const group of grid.mergedCells) {
    const mergedPolygon = computeMergedPolygon(group, topology);
    // 単一のポリゴンとして描画
  }
}
```

---

## セル分割（Split）

### 操作の種類

1. **頂点-頂点分割**: 既存の2頂点を結ぶ線でセルを分割
2. **辺-辺分割**: 2つの辺上に新しい頂点を追加して分割
3. **頂点-辺分割**: 1つの頂点と1つの辺上の点を結んで分割

### データ構造

```typescript
// GridConfig に追加（案）
interface GridConfig {
  // ...
  splitLines?: SplitLine[];
}

interface SplitLine {
  cellId: string;           // 分割対象のセル
  startPoint: SplitPoint;   // 開始点
  endPoint: SplitPoint;     // 終了点
}

interface SplitPoint {
  type: 'vertex' | 'edge';
  vertexId?: string;        // type === 'vertex' の場合
  edgeId?: string;          // type === 'edge' の場合
  t?: number;               // type === 'edge' の場合、辺上の位置 (0-1)
}
```

### 頂点-頂点分割の手順

1. **分割対象セルの特定**
   ```typescript
   function findCellToSplit(vertexId1: string, vertexId2: string): string | null {
     const v1 = topology.vertices.get(vertexId1);
     const v2 = topology.vertices.get(vertexId2);

     // 両方の頂点を持つセルを探す
     const commonCells = v1.adjacentCells.filter(
       cellId => v2.adjacentCells.includes(cellId)
     );

     // 2頂点が隣接していないセルを返す（分割可能）
     return commonCells.find(cellId => {
       const cell = topology.cells.get(cellId);
       const idx1 = cell.boundaryVertices.indexOf(vertexId1);
       const idx2 = cell.boundaryVertices.indexOf(vertexId2);
       const n = cell.boundaryVertices.length;
       // 隣接していない = インデックスの差が1でも n-1 でもない
       const diff = Math.abs(idx1 - idx2);
       return diff !== 1 && diff !== n - 1;
     });
   }
   ```

2. **セルの分割**
   ```typescript
   function splitCell(cellId: string, v1: string, v2: string): [TopologyCell, TopologyCell] {
     const cell = topology.cells.get(cellId);
     const vertices = cell.boundaryVertices;
     const idx1 = vertices.indexOf(v1);
     const idx2 = vertices.indexOf(v2);

     // idx1 < idx2 になるよう調整
     const [start, end] = idx1 < idx2 ? [idx1, idx2] : [idx2, idx1];

     // 2つの新しいセルの頂点リストを作成
     const vertices1 = vertices.slice(start, end + 1);
     const vertices2 = [...vertices.slice(end), ...vertices.slice(0, start + 1)];

     return [
       createNewCell(vertices1, cell),
       createNewCell(vertices2, cell),
     ];
   }
   ```

3. **新しいエッジの追加**
   ```typescript
   const newEdge: TopologyEdge = {
     id: `edge-split-${cellId}`,
     startVertex: v1,
     endVertex: v2,
     midpoint: midpoint(v1pos, v2pos),
     cells: [newCell1.id, newCell2.id],
   };
   ```

4. **隣接情報の更新**
   - 元のセルを2つの新セルで置換
   - 頂点の `adjacentCells` を更新
   - 隣接セルの `adjacentCells` を更新

### 辺上での分割

辺上に新しい頂点を追加する場合：

```typescript
function addVertexOnEdge(edgeId: string, t: number): string {
  const edge = topology.edges.get(edgeId);
  const v1 = topology.vertices.get(edge.startVertex);
  const v2 = topology.vertices.get(edge.endVertex);

  // 新しい頂点の位置
  const newPos = {
    x: v1.position.x + (v2.position.x - v1.position.x) * t,
    y: v1.position.y + (v2.position.y - v1.position.y) * t,
  };

  // 新しい頂点を作成
  const newVertex: TopologyVertex = {
    id: `vertex-split-${edgeId}`,
    position: newPos,
    adjacentCells: [...edge.cells],
    adjacentEdges: [], // 後で設定
    adjacentVertices: [edge.startVertex, edge.endVertex],
  };

  // 元のエッジを2つに分割
  // ...

  return newVertex.id;
}
```

---

## 実装の優先順位

### Phase 1: 描画のみ（現状） ✅ 完了
- `mergedCells` に基づいてマージされたセルを視覚的に表示
- 内部の境界線を非表示にする
- UI インタラクション（ドラッグでセル選択、頂点選択）

### Phase 2: トポロジー再構築基盤 ← **次のステップ**
- `rebuildTopology()` 関数の作成
- `cloneTopology()` ユーティリティ
- Store との統合（`setGrid` 時の自動再構築）

### Phase 3: マージ処理の実装
- `applyMerges()` 関数
- 外周頂点の計算 `computeOuterBoundary()`
- 内部エッジ/頂点の削除
- 隣接情報の更新

### Phase 4: 分割処理の実装
- `applySplits()` 関数
- 頂点-頂点分割
- セルの頂点リスト分割ロジック
- 新しいエッジの作成

### Phase 5: 永続化と互換性
- マージ/分割情報のエクスポート
- インポート時の復元
- Penpa形式との互換性検討

---

## 注意事項

### パフォーマンス
- トポロジー再構築は重い操作
- 可能な限り増分更新を行う
- 大きな変更時はバッチ処理

### 整合性
- 孤立した頂点/エッジを許可しない
- 隣接情報の双方向一貫性を保証
- 無効な分割（セルを3つ以上に分割など）を防止

### UI/UX
- 操作のプレビューを必ず表示
- Undo/Redo のサポート
- 無効な操作の視覚的フィードバック

---

## 関連ファイル

- `src/types/index.ts` - `GridConfig.mergedCells` 定義
- `src/store/puzzleStore.ts` - `mergeCells`, `unmergeCells` アクション
- `src/hooks/useCanvasInteraction.ts` - UI インタラクション
- `src/components/canvas/InputHandlerLayer.tsx` - プレビュー描画
- `src/utils/topology/` - トポロジー関連ユーティリティ
