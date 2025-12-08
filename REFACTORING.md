# リファクタリング計画

## 概要

コードベースの大きなファイル・複数機能が混在するコンポーネントを洗い出し、リファクタリング案をまとめる。

## 優先度: 高

### 1. `src/utils/penpaCompat.ts` (1902行)

**問題点:**
- 複数のパーサー（Penpa, Puzzlink, Puzsq）が1ファイルに混在
- パズルタイプごとのパーサー（yajilin, sudoku, slitherlink, nurikabe, masyu, heyawake等）が同一ファイル内
- URL判定、パース、変換、エクスポートが混在

**リファクタリング案:**
```
src/utils/import/
├── index.ts              # Re-exports
├── penpaParser.ts        # Penpa URL パース
├── puzzlinkParser.ts     # Puzzlink URL パース
├── puzsqParser.ts        # Puzsq API連携
├── puzzleTypes/
│   ├── index.ts
│   ├── yajilin.ts
│   ├── sudoku.ts
│   ├── slitherlink.ts
│   ├── nurikabe.ts
│   ├── masyu.ts
│   └── heyawake.ts
└── urlDetection.ts       # isPenpaUrl, isPuzzlinkUrl等
```

---

### 2. `src/components/canvas/InputHandlerLayer.tsx` (1215行)

**問題点:**
- 1つの巨大コンポーネントに全入力処理が集中
- マウス、タッチ、キーボード、フリック処理が混在
- ツールタイプごとの分岐が複雑

**リファクタリング案:**
```
src/components/canvas/input/
├── index.ts
├── InputHandlerLayer.tsx     # 統合レイヤー（軽量化）
├── useMouseHandlers.ts       # マウスイベント処理
├── useTouchHandlers.ts       # タッチイベント処理
├── useKeyboardHandlers.ts    # キーボードイベント処理
├── useFlickGesture.ts        # フリックジェスチャー処理
└── types.ts                  # 共有型定義
```

---

### 3. `src/store/slices/gridSlice.ts` (1068行)

**問題点:**
- Grid設定、Topology管理、Sculpt機能、Merge/Split、Resize機能が混在
- `sculptRotateCluster`と`sculptCutCluster`だけで500行以上

**リファクタリング案:**
```
src/store/slices/grid/
├── index.ts              # Re-exports createGridSlice
├── gridSlice.ts          # 基本Grid設定のみ（〜200行）
├── topologySlice.ts      # Topology関連
├── sculptSlice.ts        # Sculpt機能（rotate, cut）
├── mergeSplitSlice.ts    # Merge/Split機能
└── resizeSlice.ts        # Grid resize機能
```

---

## 優先度: 中

### 4. `src/components/toolbar/MenuBar.tsx` (861行)

**問題点:**
- メニュー定義とハンドラーが混在
- 長いメニュー項目定義がコンポーネント内にインライン

**リファクタリング案:**
```
src/components/toolbar/menu/
├── index.ts
├── MenuBar.tsx           # 描画ロジックのみ
├── menuDefinitions.ts    # メニュー構造定義
├── menuHandlers.ts       # アクションハンドラー
└── useMenuActions.ts     # メニューアクションhook
```

---

### 5. `src/components/panels/PropertiesPanel.tsx` (718行)

**問題点:**
- 全ツールタイプのプロパティUIが1ファイルに
- 条件分岐が深くネスト

**リファクタリング案:**
```
src/components/panels/properties/
├── index.ts
├── PropertiesPanel.tsx         # ルーティングのみ
├── SurfaceProperties.tsx       # Surface系
├── LineProperties.tsx          # Line系
├── SymbolProperties.tsx        # Symbol系
├── NumberProperties.tsx        # Number系
└── GridProperties.tsx          # Grid系
```

---

### 6. `src/components/canvas/SymbolLayer.tsx` (729行)

**問題点:**
- 30種以上のシンボルコンポーネントが1ファイルに
- 各シンボルは独立しているが分離されていない

**リファクタリング案:**
```
src/components/canvas/symbols/
├── index.ts
├── SymbolLayer.tsx       # 描画ロジック
├── renderSymbol.ts       # シンボル選択ロジック
├── basic/               # 基本図形
│   ├── CircleSymbol.tsx
│   ├── SquareSymbol.tsx
│   └── TriangleSymbol.tsx
├── arrows/              # 矢印系
│   └── ArrowSymbol.tsx
├── special/             # 特殊シンボル
│   ├── MineSymbol.tsx
│   └── BulbSymbol.tsx
└── unicode/             # Unicode文字系
    └── UnicodeSymbol.tsx
```

---

### 7. `src/components/toolbar/Ribbon.tsx` (643行)

**問題点:**
- 複数のリボンタブコンテンツが1ファイルに

**リファクタリング案:**
```
src/components/toolbar/ribbon/
├── index.ts
├── Ribbon.tsx                  # タブ切替ロジック
├── RibbonHomeContent.tsx       # Homeタブ
├── RibbonSurfaceContent.tsx    # Surfaceタブ
├── RibbonLineContent.tsx       # Lineタブ
└── RibbonGridContent.tsx       # Gridタブ（既存）
```

---

## 優先度: 低

### 8. `src/i18n/index.ts` (1731行)

**問題点:**
- 全言語の翻訳が1ファイルに

**リファクタリング案:**
```
src/i18n/
├── index.ts
├── ja.ts    # 日本語
├── en.ts    # 英語
└── types.ts # 型定義
```

---

### 9. `src/utils/penpaConverter.ts` (895行)

**問題点:**
- Penpa形式への変換ロジックが大きい
- `penpaCompat.ts`のリファクタリングと同時に整理

---

### 10. `src/hooks/tool-handlers/useElementToolHandler.ts` (814行)

**問題点:**
- Number, Symbol, Special, Text, Cage, BoxLineの6種のハンドラーが混在

**リファクタリング案:**
```
src/hooks/tool-handlers/element/
├── index.ts
├── useNumberToolHandler.ts
├── useSymbolToolHandler.ts
├── useSpecialToolHandler.ts
├── useTextToolHandler.ts
├── useCageToolHandler.ts
└── useBoxLineToolHandler.ts
```

---

## 実施順序の提案

1. **Phase 1** (影響範囲小、効果大)
   - `penpaCompat.ts` の分割
   - `SymbolLayer.tsx` の分割

2. **Phase 2** (UIコンポーネント整理)
   - `PropertiesPanel.tsx` の分割
   - `MenuBar.tsx` の分割
   - `Ribbon.tsx` の分割

3. **Phase 3** (ロジック層整理)
   - `gridSlice.ts` の分割
   - `InputHandlerLayer.tsx` の分割
   - `useElementToolHandler.ts` の分割

4. **Phase 4** (i18n整理)
   - `i18n/index.ts` の分割

---

## 共通の注意点

- 分割時は既存のimportパスを維持するためre-exportを活用
- テストがある場合は分割後もテストが通ることを確認
- 1つのPRで1ファイルの分割に留める（レビューしやすさのため）
