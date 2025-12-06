# pzprv3 座標・方向マッピング調査

## 概要

pzprv3形式のパズルデータをpuzzle-kitに読み込む際の座標・方向マッピングについての調査結果。

## 1. エッジ（Slitherlink等）

### pzprv3データ構造（5x5グリッドの例）

```
pzprv3/slither/5/5/
[クルーデータ: 5行]
[第1エッジセクション: 5行 × 6値]
[第2エッジセクション: 6行 × 5値]
```

### マッピング

| pzprv3セクション | 構造 | puzzle-kit |
|-----------------|------|------------|
| 第1セクション | rows行 × (cols+1)値 | **縦エッジ** (`edge-v-{r}-{c}`) |
| 第2セクション | (rows+1)行 × cols値 | **横エッジ** (`edge-h-{r}-{c}`) |

### 注意点

- 当初「第1セクション = 横エッジ」と誤認していた
- pzprjsの内部用語「horizontal border」「vertical border」は視覚的な線の向きではなく、セルの境界位置を指す

### puzzle-kit ID規約

```
edge-h-{r}-{c}: 横線、vertex-(r)-(c) から vertex-(r)-(c+1) へ
edge-v-{r}-{c}: 縦線、vertex-(r)-(c) から vertex-(r+1)-(c) へ
vertex-(r)-(c): 位置 x = col * cellSize, y = row * cellSize
```

## 2. 方向（Yajilin矢印等）

### pzprjs内部定数（Address.js）

```javascript
NDIR: 0  // 方向なし
UP: 1    // 上
DN: 2    // 下
LT: 3    // 左
RT: 4    // 右
```

### pzprv3ファイル形式のエンコーディング（yajilin.js decodeCellDirecQnum_kanpen より）

```javascript
dir = 0 → cell.UP
dir = 1 → cell.LT
dir = 2 → cell.DN
dir = 3 → cell.RT
```

つまり pzprv3: `0=UP, 1=LT, 2=DN, 3=RT`

### 実際に正しく動作するマッピング（経験的検証）

```javascript
const dirMap = {
  0: 2, // pzprv3 up    → puzzle-kit down（実測: 0 が下向きで届くため補正）
  1: 1, // pzprv3 left  → puzzle-kit up
  2: 4, // pzprv3 down  → puzzle-kit right
  3: 3, // pzprv3 right → puzzle-kit left
};
```

### 実装方針
- 実測に合わせた補正マップ（0→↓, 2→→ を 0→↑, 2→← に合わせる）を `pzprv3Parser` に入れる。
- DirectionalClueLayer/Topology は座標反転をしていないので、補正はパース時点で完結させる。

## 3. Yajilinデータ構造

### pzprv3形式（5x5グリッドの例）

```
pzprv3/yajirin/5/5/
[セクション1: クルーセル 5行 × 5値] - 方向付き数字 "dir,val" または "."
[セクション2: セル状態 5行 × 5値]   - "#"=塗り, "+"=非塗り, "."=空
[セクション3: 横線 5行 × 4値]       - rows × (cols-1)
[セクション4: 縦線 4行 × 5値]       - (rows-1) × cols
```

### 当初の問題

クルーとセル状態を同じセクションで処理しようとしていた。

## 4. 今後の調査項目

- [ ] DirectionalClueLayer.tsx の getArrowPath 関数で方向がどう解釈されているか
- [ ] Topology変換時の座標系変換の確認
- [ ] pzprjsとpuzzle-kitのY軸方向の比較
- [ ] 他のパズル（Mashu等）での方向の検証

## 関連ファイル

- `src/utils/pzprv3Parser.ts` - pzprv3パーサー
- `src/utils/gridIds.ts` - Grid/Topology ID変換
- `src/components/canvas/DirectionalClueLayer.tsx` - 矢印描画
- `src/components/canvas/LineLayer.tsx` - 線/エッジ描画

## 参考: pzprjsソースコード

- `/PuzzleTools/pzprjs/src/puzzle/Address.js` - 方向定数定義
- `/PuzzleTools/pzprjs/src/variety/yajilin.js` - Yajilin実装
