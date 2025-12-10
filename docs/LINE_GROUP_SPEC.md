# LineGroup（線グループ）仕様書

## 概要

LineGroupは、複数の矢印線を1つの視覚的なチェーンとして扱うための機構です。
特にYajilinや経路系パズルの矢印表現に有効です。

## 型定義

```typescript
interface LineGroup {
  id: string;                    // グループの一意識別子
  lineIds: string[];             // グループに属する線のID配列（描画順序を保持）
  groupType: 'arrow';            // グループ化の種類（現在は'arrow'のみ）
  layer: 'problem' | 'answer';   // グループが属するレイヤー
}
```

## グループの作成

### 自動作成

マウスアップ時（`finalizeLineSelection`）に以下の条件で自動作成：

1. ドラッグ操作で**2本以上の矢印線**（`directed && !isFree`）が追加された場合
2. 追加した矢印線が既存グループに接続している場合は、そのグループに追加

### Store API

```typescript
addLineGroup(lineIds: string[], groupType: 'arrow'): void  // 新規作成
addLinesToGroup(groupId: string, lineIds: string[]): void  // グループに追加
removeLinesFromGroup(groupId: string, lineIds: string[]): void  // グループから削除
removeLineGroup(groupId: string): void  // グループ削除
getLineGroup(lineId: string): LineGroup | undefined  // 線が属するグループを取得
```

## マージ処理

`mergeDirectedLines()` 関数でグループ化された線をマージ。

### directedタイプ別の処理

| directed | マージ関数 | 矢印位置 |
|----------|-----------|---------|
| `endpoint` | `mergeEndpointLines()` | チェーン終端 |
| `both` | `mergeEndpointLines()` | チェーン両端 |
| `midpoint` | `mergeMidpointLines()` | チェーン中点 |

### MergedLineChain

マージ結果の型：

```typescript
interface MergedLineChain {
  lines: LineWithPosition[];  // マージされた線のリスト
  points: Point[];            // 開始から終了までの順序付きポイント列
}
```

### チェーン端点の決定

1. グループ内の全エンドポイントをカウント
2. 1回しか出現しない点がチェーンの端点（2点）
3. **最後の線の `arrowDirection`** に基づいて矢印の向きを決定

## 描画

LineLayerでの描画：

1. グループ化された線は1つのSVGパスとして描画
2. 矢印ヘッドはチェーン終端にのみ描画（個別の矢印は非表示）
3. ハイライトは線ごとに個別に適用可能

### 描画イメージ

```
グループ化前:  ---→  ---→  (2本の矢印)
グループ化後:  ──────────→  (1本の統合矢印)
```

## 選択とハイライト

- グループ内の線は**個別に選択可能**
- 選択された線のみがハイライト表示される
- 矢印反転は**選択された線のみ**に適用（グループ全体ではない）

## 現在の制限

1. **groupTypeが'arrow'のみ**: 他の種類のグループ化は未実装
2. **環状チェーン対応が不完全**: ループの矢印方向が正確に決定されない可能性
3. **Freehand線は非対応**: `isFree: true` の線はグループ化されない
4. **グループ分割機能なし**: チェーンの一部を分割する機能がない

## 今後の実装予定

### チェーン分割機能

チェーン（LineGroup）を指定した位置で2つに分割する機能。

#### ユースケース

1. **矢印の向きを部分的に変えたい**
   - 長いチェーンの途中で矢印の向きを変更したい場合
   - 分割後、片方のグループの向きを反転

2. **チェーンの一部を削除したい**
   - 間違って引いた線を修正する場合
   - 分割後、不要な部分を削除

3. **チェーンを再構成したい**
   - 別のルートに変更したい場合
   - 分割して別の線と再マージ

#### 操作方法（案）

**方法A: 選択した線で分割**
- グループ内の線を1本選択
- 「分割」ボタンをクリック
- 選択した線の**前**で分割（選択した線は後半のグループに入る）

**方法B: コンテキストメニュー**
- グループ内の線を右クリック
- 「ここで分割」を選択

#### 分割ロジック

```
入力:
  - グループ: lineIds = [A, B, C, D, E] （接続順）
  - 分割位置: C

出力:
  - グループ1: lineIds = [A, B]
  - グループ2: lineIds = [C, D, E]
```

#### 考慮事項

1. **分割後の最小サイズ**
   - 1本の線はグループ化不要 → グループから外して単独線に
   - 2本以上の場合のみ新グループを作成

2. **arrowDirectionの処理**
   - 分割後も各グループの矢印方向は維持
   - 必要に応じてユーザーが反転操作

3. **接続順の正規化が前提**
   - 分割前にlineIdsが接続順に並んでいる必要がある
   - 正規化機能と組み合わせて使用

#### Store API（案）

```typescript
// グループを指定した線の位置で分割
// 指定した線は後半のグループに入る
splitLineGroup(groupId: string, splitAtLineId: string): {
  group1: LineGroup | null;  // 前半（1本以下ならnull、線は単独に）
  group2: LineGroup | null;  // 後半（1本以下ならnull、線は単独に）
}
```

---

### グループ選択機能

- グループ全体を選択するオプション
- Shift+クリックでグループ全体を選択

### グループマージ機能

- 2つのグループを1つにマージ
- 接続している線を自動検出してマージ

### 正規化機能

グループ内の線の順序とarrowDirectionを一貫性のある状態に整理する機能。

#### 目的

1. **lineIdsを接続順に並び替え**
   - 現在: 描画順（追加順）で保持
   - 正規化後: チェーンの開始から終了までの接続順

2. **arrowDirectionの統一**
   - 全ての線のarrowDirectionをチェーンの向きに合わせる
   - 「forward」= チェーンの進行方向

#### 正規化ロジック

```
入力:
  グループ: lineIds = [B, D, A, C] （追加順、バラバラ）
  各線: A(0,0)→(1,0), B(1,0)→(2,0), C(3,0)→(4,0), D(2,0)→(3,0)

処理:
  1. チェーンの端点を検出: (0,0) と (4,0)
  2. 開始点を決定（最後の線のarrowDirectionに基づく）
  3. 接続順に並び替え

出力:
  lineIds = [A, B, D, C] （接続順）
  各線のarrowDirection = 'forward'（統一）
```

#### Store API（案）

```typescript
// グループを正規化（接続順に並び替え、arrowDirection統一）
normalizeLineGroup(groupId: string): void
```
