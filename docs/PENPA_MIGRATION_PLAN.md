# Penpa-edit 完全互換移植計画

## 概要

puzzle-kitをPenpa-edit完全互換にするための段階的移植計画。
既存のURL形式との後方互換性を維持しながら、操作感・機能を再現する。

---

## フェーズ構成

### Phase 1: 基盤整備（互換シリアライズ + 回帰テスト）
**目標**: 既存Penpa URLの読み込み・保存が完全に動作する

### Phase 2: グリッド拡張
**目標**: hex/tri/pyramid等の非正方形グリッドに対応

### Phase 3: モード・描画拡充
**目標**: 全描画要素・モード・サブモードの実装

### Phase 4: 操作感・UI再現
**目標**: ショートカット・タッチ・パネル等のUI完全互換

---

## Phase 1: 基盤整備（2-3週間相当の作業量）

### 1.1 Penpa互換シリアライズ
**ファイル**: `src/utils/penpaSerializer.ts`

```
タスク:
├─ [ ] 圧縮置換テーブル実装（30ペア）
│     - "qa" → z9, "pu_q" → zQ, "surface" → zS, etc.
├─ [ ] エンコード処理
│     - JSON stringify → 置換 → Base64 → zlib圧縮
├─ [ ] デコード処理
│     - zlib解凍 → Base64 → 逆置換 → JSON parse
├─ [ ] puzz.link URL形式対応
│     - ?p=<data> および #<data> 形式
└─ [ ] 旧形式URLの後方互換性
```

### 1.2 Penpaデータ構造への変換
**ファイル**: `src/utils/penpaDataConverter.ts`

```
タスク:
├─ [ ] PuzzleKit → Penpa変換
│     ├─ surface → pu.surface (色ID変換)
│     ├─ line → pu.line (線種変換)
│     ├─ number → pu.number/numberS (位置・サイズ変換)
│     └─ symbol → pu.symbol (シンボルID変換)
├─ [ ] Penpa → PuzzleKit変換
│     └─ 上記の逆変換
└─ [ ] モード状態の保存・復元
      - qa, edit_mode, サブモード設定
```

### 1.3 コマンドスタック互換
**ファイル**: `src/store/commandHistory.ts`

```
タスク:
├─ [ ] Penpa互換Command構造
│     - type, target, changes[], timestamp
├─ [ ] ReversibleChange形式
│     - key, oldValue, newValue
├─ [ ] バッチ操作対応
│     - startBatch(), endBatch()
├─ [ ] シリアライズ対応
│     - command_undo, command_redo をURLに含める
└─ [ ] 既存HistoryManagerとの統合
```

### 1.4 回帰テスト
**ファイル**: `src/test/penpaCompat.test.ts` (拡張)

```
テストケース:
├─ [ ] URL往復テスト
│     - 実際のPenpa URLをデコード→再エンコード→一致確認
├─ [ ] 各要素の変換テスト
│     - surface, line, lineE, wall, number, symbol, cage
├─ [ ] グリッドサイズ境界テスト
│     - 1x1, 100x100, 非正方形
├─ [ ] 旧形式互換テスト
│     - 古いPenpa URLの読み込み
└─ [ ] puzz.linkパーステスト
```

---

## Phase 2: グリッド拡張（3-4週間相当の作業量）

### 2.1 Point型システム
**ファイル**: `src/types/point.ts`

```
Penpa Point構造:
├─ type 0: セル中心
├─ type 1: 頂点
├─ type 2: 水平エッジ
├─ type 3: 垂直エッジ
├─ type 4: 1/4分割点（小シンボル用）
└─ type 5: コンパス方向（NESW）

タスク:
├─ [ ] Point型定義
├─ [ ] 隣接関係計算
│     - adjacent (4方向), adjacent_dia (対角)
│     - surround (周囲頂点), neighbor (周囲エッジ)
└─ [ ] use/degreeプロパティ
```

### 2.2 Hexグリッド
**ファイル**: `src/utils/hexGrid.ts` (既存拡張)

```
タスク:
├─ [ ] Penpa互換Point生成
│     - 5種類のPointタイプ生成
├─ [ ] 隣接関係計算
│     - 6方向隣接 + 頂点共有
├─ [ ] 座標変換
│     - ピクセル座標 ↔ グリッド座標
└─ [ ] センターリスト生成
```

### 2.3 Triグリッド
**ファイル**: `src/utils/triGrid.ts` (新規)

```
タスク:
├─ [ ] 三角形グリッド生成
├─ [ ] 上向き/下向き三角形の判定
├─ [ ] 3方向隣接計算
└─ [ ] 頂点・エッジPoint生成
```

### 2.4 Pyramidグリッド
**ファイル**: `src/utils/pyramidGrid.ts` (新規)

```
タスク:
├─ [ ] ピラミッド形状グリッド生成
├─ [ ] 段ごとのセル数計算
└─ [ ] 境界判定
```

### 2.5 その他グリッド
**ファイル**: `src/utils/specialGrids.ts` (新規)

```
対応グリッド:
├─ [ ] iso (アイソメトリック)
├─ [ ] tetrakis_square
├─ [ ] truncated_square
├─ [ ] snub_square
├─ [ ] cairo_pentagonal
├─ [ ] rhombitrihexagonal
├─ [ ] deltoidal_trihexagonal
└─ [ ] penrose_P3 (非周期)
```

### 2.6 グリッド描画
**ファイル**: `src/components/renderers/GridRenderer.tsx` (拡張)

```
タスク:
├─ [ ] グリッド種別による描画分岐
├─ [ ] 枠線スタイル対応
├─ [ ] 余白・マージン設定
└─ [ ] セル外領域描画
```

---

## Phase 3: モード・描画拡充（4-5週間相当の作業量）

### 3.1 描画要素の完全実装

#### 3.1.1 Edge/Wall描画
**ファイル**: `src/components/renderers/EdgeRenderer.tsx`, `WallRenderer.tsx`

```
タスク:
├─ [ ] Edge描画（斜め線対応）
│     - lineE形式のデータ読み込み
│     - 5種類の線スタイル
├─ [ ] Wall描画（太線）
│     - 太さ・色の設定
└─ [ ] deletelineE対応（線削除マーク）
```

#### 3.1.2 Cage描画
**ファイル**: `src/components/renderers/CageRenderer.tsx`

```
タスク:
├─ [ ] キラーケージ描画
│     - 点線境界
│     - 合計数字表示
├─ [ ] 自動境界計算
└─ [ ] killercages配列形式対応
```

#### 3.1.3 Special描画（サーモ・矢印・ポリゴン）
**ファイル**: `src/components/renderers/SpecialRenderer.tsx`

```
タスク:
├─ [ ] Thermo（サーモメーター）
│     - 球と線のセット描画
├─ [ ] Arrow（矢印）
│     - 円と矢印線
├─ [ ] Direction（方向指示）
├─ [ ] Polygon（多角形領域）
├─ [ ] Squareframe（枠線）
└─ [ ] nobulbthermo（球なしサーモ）
```

#### 3.1.4 Symbol拡張
**ファイル**: `src/components/renderers/SymbolRenderer.tsx`

```
Penpaシンボル種類（30+）:
├─ [ ] 基本図形: circle, square, diamond, triangle
├─ [ ] クロス系: cross, ox, arrows
├─ [ ] サイコロ: dice (1-6)
├─ [ ] バトルシップ: ship_*, water
├─ [ ] 数学記号: inequality, math arrows
├─ [ ] その他: star, heart, mine, tent, etc.

タスク:
├─ [ ] ms (mark shapes) 定義
├─ [ ] ms1, ms3, ms4 カテゴリ
├─ [ ] 塗り/線のみ切替
└─ [ ] サイズバリエーション (L/M/S)
```

#### 3.1.5 Number拡張
**ファイル**: `src/components/renderers/NumberRenderer.tsx`

```
タスク:
├─ [ ] numberS（小数字）対応
├─ [ ] Tapa形式（4分割数字）
├─ [ ] 矢印付き数字
├─ [ ] カラー数字
└─ [ ] フォントサイズ4段階
```

### 3.2 モード・サブモード実装

#### 3.2.1 モード定義
**ファイル**: `src/types/modes.ts`

```typescript
// Penpa互換モード定義
type EditMode =
  | 'surface'      // 塗り
  | 'multicolor'   // マルチカラー
  | 'line'         // 線（セル間）
  | 'lineE'        // 線（斜め/エッジ）
  | 'wall'         // 太線
  | 'number'       // 数字
  | 'symbol'       // シンボル
  | 'special'      // 特殊（サーモ等）
  | 'cage'         // ケージ
  | 'combi'        // 複合制約
  | 'sudoku'       // 数独候補
  | 'board'        // 盤面定義
  | 'move'         // 移動記録
  | 'solution_area'; // 解答領域
```

#### 3.2.2 サブモード設定
**ファイル**: `src/store/modeSettings.ts`

```
タスク:
├─ [ ] グリッド種別ごとの利用可能モード
├─ [ ] 各モードのサブモード定義
│     - line: [線種, 色]
│     - number: [桁種, サイズ]
│     - symbol: [種類, スタイル]
├─ [ ] combisubモード（20種類）
│     - battleship, star, tents, magnets, etc.
└─ [ ] カスタムカラー対応
```

### 3.3 マルチカラー対応
**ファイル**: `src/components/tools/MulticolorTool.tsx`

```
タスク:
├─ [ ] 13色パレット
├─ [ ] セル内複数色
├─ [ ] 右クリック第2色
└─ [ ] multicolor データ形式
```

---

## Phase 4: 操作感・UI再現（3-4週間相当の作業量）

### 4.1 キーボードショートカット
**ファイル**: `src/hooks/useKeyboardShortcuts.ts`

```
ショートカット:
├─ [ ] Ctrl+Z/Y: Undo/Redo
├─ [ ] 数字キー: 直接入力
├─ [ ] Q/A: Question/Answer切替
├─ [ ] モード切替キー
├─ [ ] 色選択キー
├─ [ ] Delete/Backspace: 削除
├─ [ ] Escape: 選択解除
└─ [ ] Space: 特殊操作
```

### 4.2 タッチ操作
**ファイル**: `src/hooks/useTouchInput.ts`

```
タスク:
├─ [ ] シングルタップ = クリック
├─ [ ] ロングプレス = 右クリック
├─ [ ] ピンチズーム
├─ [ ] 2本指パン
├─ [ ] ダブルタップ
└─ [ ] デバイス判定（iOS/Android）
```

### 4.3 矩形選択・複数選択
**ファイル**: `src/hooks/useSelection.ts`

```
タスク:
├─ [ ] Shift+クリック: 範囲選択
├─ [ ] Ctrl+クリック: 追加選択
├─ [ ] ドラッグ矩形選択
├─ [ ] 選択領域ハイライト
└─ [ ] 選択要素の一括操作
```

### 4.4 右クリック挙動
**ファイル**: `src/hooks/useContextMenu.ts`

```
タスク:
├─ [ ] モード別右クリック動作
│     - surface: 第2色
│     - line: 線削除
│     - number: 候補入力
├─ [ ] コンテキストメニュー（オプション）
└─ [ ] 長押し = 右クリック（タッチ）
```

### 4.5 パネルUI
**ファイル**: `src/components/panels/*.tsx`

```
パネル:
├─ [ ] ColorPalette: 色選択パネル
├─ [ ] SymbolPalette: シンボル選択
├─ [ ] NumberPad: 数字入力パッド
├─ [ ] ModeSelector: モード切替
├─ [ ] SubModeSelector: サブモード切替
└─ [ ] SettingsPanel: 設定パネル
```

### 4.6 設定・i18n
**ファイル**: `src/config/settings.ts`, `src/i18n/*.ts`

```
タスク:
├─ [ ] ユーザー設定保存
│     - localStorage永続化
├─ [ ] 言語切替
│     - 日本語/英語
├─ [ ] テーマ切替
│     - ライト/ダーク
└─ [ ] グリッド設定プリセット
```

### 4.7 エクスポート機能
**ファイル**: `src/utils/export.ts`

```
タスク:
├─ [ ] PNG出力
├─ [ ] SVG出力
├─ [ ] GIF出力（アニメーション）
├─ [ ] 印刷用PDF
└─ [ ] クリップボード画像コピー
```

---

## 優先度マトリクス

| フェーズ | タスク | 優先度 | 依存関係 |
|---------|--------|--------|----------|
| P1 | Penpa URLデコード | 最高 | なし |
| P1 | Penpa URLエンコード | 最高 | デコード |
| P1 | 回帰テスト | 最高 | エンコード |
| P1 | コマンド履歴互換 | 高 | なし |
| P2 | Point型システム | 高 | P1完了 |
| P2 | Hexグリッド | 中 | Point型 |
| P2 | Tri/Pyramidグリッド | 低 | Point型 |
| P3 | Edge/Wall描画 | 高 | P1完了 |
| P3 | Cage描画 | 中 | P1完了 |
| P3 | Special描画 | 中 | P1完了 |
| P3 | モード・サブモード | 高 | P1完了 |
| P4 | キーボードショートカット | 高 | P3完了 |
| P4 | タッチ操作 | 中 | P3完了 |
| P4 | エクスポート | 低 | P3完了 |

---

## 推定作業量

| フェーズ | 作業量 | 累計 |
|---------|--------|------|
| Phase 1 | 2-3週間 | 2-3週間 |
| Phase 2 | 3-4週間 | 5-7週間 |
| Phase 3 | 4-5週間 | 9-12週間 |
| Phase 4 | 3-4週間 | 12-16週間 |

**合計: 約3-4ヶ月**（フルタイム換算）

---

## 実装進捗

### ✅ Phase 1: 完了 (2024-11-28)

- **1.1 Penpa互換シリアライズ** ✅
  - `src/utils/penpaSerializer.ts`: 31圧縮置換ペア、Base64エンコード、zlib圧縮
  - `src/test/penpaSerializer.test.ts`: 44テスト

- **1.2 Penpaデータ変換** ✅
  - `src/utils/penpaConverter.ts`: 双方向変換 (PuzzleKit ↔ Penpa)
  - `src/test/penpaConverter.test.ts`: 23テスト

- **1.3 コマンドスタック互換** ✅
  - `src/store/penpaCommandStack.ts`: Penpa互換Command構造、バッチ操作
  - `src/store/index.ts`: エクスポート追加

- **1.4 回帰テスト** ✅
  - `src/test/penpaRoundTrip.test.ts`: 21テスト

### ✅ Phase 2: 完了 (2024-11-28)

- **2.1 Point型システム** ✅
  - `src/types/point.ts`: PointType enum、Point interface、GridPoints、正方形グリッド生成
  - `src/test/point.test.ts`: 29テスト

- **2.2 Hexグリッド拡張** ✅
  - `src/types/hexPoint.ts`: Hex グリッドPoint生成、隣接計算、座標変換
  - `src/test/hexPoint.test.ts`: 31テスト

- **2.3 Triグリッド実装** ✅
  - `src/types/triPoint.ts`: 三角形グリッドPoint生成、上向き/下向き判定
  - `src/test/triPoint.test.ts`: 38テスト

- **2.4 Pyramidグリッド実装** ✅
  - `src/types/pyramidPoint.ts`: ピラミッドグリッドPoint生成
  - `src/test/pyramidPoint.test.ts`: 44テスト

- **2.5 グリッド描画拡張** ✅
  - `src/utils/gridPointUtils.ts`: 統合Point操作ユーティリティ
  - `src/test/gridPointUtils.test.ts`: 39テスト

**総テスト数**: 377テスト (すべてパス)

---

## 次のアクション

1. **Phase 3.1 開始**: Edge/Wall描画の完全実装
   - lineE形式のデータ読み込み
   - 斜め線対応

2. **Phase 3.2**: Cage描画
   - キラーケージ
   - 自動境界計算

3. **Phase 3.3**: Special描画
   - サーモメーター
   - 矢印
   - ポリゴン
