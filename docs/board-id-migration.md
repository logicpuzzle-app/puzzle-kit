# 盤面ID: 現状との差分と移行順序

2026-09-16、develop `2396c889a3c1b5ee06c79e7dfeaa1cdb3231636e` の調査。
設計規則は[盤面IDの契約](board-id-contract.md)を正本とする。
ここに挙げる既存コードは未修正。関数が存在することだけで実際の画面操作での
不具合を再現したとはみなさず、修正時に呼出経路と症状を確認する。

進捗: [ネイティブ形式1.2](board-topology-format.md)で使用中の盤面の保存・復元を追加。
以下の一覧は上記基準コミットでの調査を保持している。編集時の再生成・採番の寿命管理、
アプリ本体のID解釈の除去は引き続き未完了。
[セル除外・解除](board-cell-exclusion.md)は、保持した盤面を投影する方式へ変更し、
存続IDと非表示要素を保存・履歴でも保持する。
[セルサイズ・外側余白](board-layout-identity.md)の変更も現在の盤面の座標変換へ移行した。
[正方格子の行列・周囲セル編集](board-extent-identity.md)は存続IDを引き継ぐ方式へ移行。
[接続を変えない表示変形](board-preset-identity.md)も、元座標を保存して実際のグラフへ適用する。
[六角格子も共通の編集器](hex-extent-identity.md)へ移行し、元座標を持つ正方・六角の表示変形中も存続IDを保持する。
[新規の結合・解除](board-merge-identity.md)は結合前の実グラフを保持する方式へ移行。
[既知の旧結合ファイル](legacy-merge-identity.md)も実際のIDと境界を保持して移行する。
[結合後の正方・六角格子の行列変更](merged-extent-identity.md)も、元セルの編集と結合の再投影へ移行した。
[境界頂点間の分割・復元](board-split-identity.md)と新規の結合／分割の混合操作も、元グラフと明示的な操作列を保持する方式へ移行した。選択と通常の数字入力も実際のセルIDを保持する。
他の格子・独自形状の行列変更、除外等を伴う旧結合の読込、除外・彫刻を伴う旧分割、分割端点を失う縮小、彫刻等の再生成は未移行。
[既知の旧分割](legacy-split-identity.md)は、保存済みの全グラフを照合して復元用の元グラフ・境界情報を補完する方式へ移行した。
公開の低水準resize APIも正方格子では同じ編集器を使う。適用条件と未対応範囲はリンク先に記す。

## 最優先: 永続化と再生成を一つの変更として扱う

- [builder](../src/utils/topology/builder.ts) の `buildTopologyFromCells` は、
  走査順で頂点・辺に連番を振る。除外や列数の変更で番号と位置の対応が変わり得る。
- [resize](../src/utils/topology/resize.ts) の `resizeTopology` は盤面を生成し直し、
  現状の対応表はセルの同じID同士だけ。頂点・辺の同一性は保証していない。
- [除外等の編集](../src/store/slices/grid/cellOperations.ts) もトポロジを再生成する。
- [ネイティブ入出力](../src/store/slices/puzzleIOSlice.ts) はトポロジ本体を保存せず、
  Grid設定とプリセットから再生成する。線には個別の辺ID変換処理があるが、
  すべての参照に対する永続化の保証にはならない。
- [serializeTopology / deserializeTopology](../src/utils/serialization.ts) はMapのキーを
  保持する。しかし[設定の復元](../src/hooks/useStoragePersistence.ts)は保存済みトポロジ本体を
  適用せず設定から再生成するため、この関数の存在だけで保存の問題が解決済みとはいえない。

**対応方針:** 採番方式だけを変えない。ネイティブ形式にID・参照関係を保持する表現を
導入し、形式バージョンと旧データの移行を決める。同時に編集操作で存続要素のIDを
引き継ぐ。初期の採番文字列自体は変更を必須としない。
除外、余白・列の増減、結合・分割、保存・復元、履歴での参照を検証してから切り替える。
行列番号・浮動小数点位置・配列順を恒久キーにする方法では解決しない。

## 次: アプリ本体のID解釈を除去する

以下は実コードを確認した代表的な移行対象。単純な文字列検索の全件を
バグとして数えた一覧ではない。

| 対象 | 現状と想定される問題 | 移行先 |
| --- | --- | --- |
| [選択状態](../src/store/slices/types.ts)、[選択処理](../src/hooks/useCanvasInputRouter.ts)、[セル検索](../src/hooks/useCellFinder.ts)、[数字キーボード](../src/hooks/useNumberKeyboard.ts)、[数字パネル](../src/components/panels/properties/NumberInputPanel.tsx) | 選択に行列番号だけを保存し、行列のないセルを選択対象から外す。検索ではIDの `hex` を優先し、数字入力では未解決時に `cell-${row}-${col}` を組み立てるため、任意ID・結合・分割セルで入力先を失う可能性がある | 選択した実際のcellIdを保持し、現在の盤面で解決する。未解決・曖昧な検索結果は入力を止め、キーボード・数字パネル・カーソルの参照先を揃える |
| [LITSの判定・部屋同期・強調表示](lits-validation-identity.md) | 実セル・辺・頂点参照へ移行済み。mapだけの公開読込も実境界を補い、境界と部屋番号を履歴で復元する | 正方格子の明示indexと接続を検証し、未解決・非対応は検証不能。他ジャンル・汎用線入力の移行は継続 |
| [ぬりみさき判定](nurimisaki-validation-identity.md) | 実セルID・行列・接続の検証へ移行済み。数字・塗りの未解決参照を成功にしない | 非対応の形状・曖昧な行列は検証不能を返す。他ジャンルの判定は継続対象 |
| [リサイズ後の要素処理](../src/store/slices/gridSlice.ts) | from/to/positionの接頭辞で種類を判定する | 明示した対象種類と旧→新参照の対応 |
| [汎用線入力・端点参照](line-input-identity.md) | 新しい入力は端点の種類を保持し、明示モードで実接続を解決する。線レコードIDに依存せず消去し、混合端点と矢印方向を保存する | 型なしの旧データは辺参照または一意な点から解決し、曖昧な参照を推測しない。参照モード切替は検証した対応表による一体の移行へ変更。公開互換APIや他ジャンルのID解析の整理は継続 |
| [LineLayer](../src/components/canvas/LineLayer.tsx)、[SolverLayer](../src/components/canvas/SolverLayer.tsx)、[要素入力](../src/hooks/tool-handlers/useElementToolHandler.ts) | `parseEdgeId` を直接呼ぶ。Grid形式とTopology形式が混在する | 形式を明示した共通resolverへの集約 |
| [線の出力](../src/utils/puzzleExport.ts)、[重複判定](../src/utils/lineOverlap.ts)、[共通判定](../src/constraints/validators/core.ts)、[スリザーリンク](../src/constraints/validators/slitherlink.ts)、[pzpr形式処理](../src/utils/pzprv3Parser.ts) | `lineTarget` がない場合などに端点接頭辞を解釈する | 旧形式の解釈を読込境界に集め、以降は明示した対象種類を使う |
| [結合セル操作](../src/store/slices/grid/cellOperations.ts)、[彫刻操作](../src/store/slices/grid/sculptOperations.ts)、[彫刻モード](../src/hooks/useSculptMode.ts) | `merged-N` を配列添字に、接頭辞を形状判定に使う | 元セル・形状・編集対象の明示メタデータ |

## 続いて: 公開互換APIと危険な補助関数の整理

- [gridIds](../src/utils/gridIds.ts): `parseGridCellId / parseGridVertexId / parseEdgeId`、
  `isGridModeId / isTopologyModeId` は既知の形式にしか使えない。
  IDだけを見てデータの形式や盤面のモードが判別できるという契約にはしない。
- [lineNormalization](../src/utils/lineNormalization.ts): 公開されている `parseLineId` は
  ハイフンを含む端点IDを曖昧に分割する。例えば
  `line-cell-0-0-cell-0-1` は意図した2セルに分解できない。端点フィールドを使うAPIへ移行し、
  公開APIの互換性を確認して廃止する。対称な端点の並べ替え自体は許可する。
- [lineUtils](../src/utils/lineUtils.ts): `areVerticesOrthogonallyAdjacent` は解析できないIDを
  `true` とする。対象盤面の接続を確認するAPIへ置換するか、利用状況を確認して削除する。
- [resize](../src/utils/topology/resize.ts): `remapPuzzleElements` はキーの部分一致や
  数値から組み立てたセルIDで削除を判定し、受け取った対応表を使っていない。
  呼出元と公開APIを確認し、実際の参照フィールドを使う実装へ置換するか削除する。

採番器の [idGenerator](../src/utils/idGenerator.ts) が自身の形式を読んで衝突を避ける処理と、
外部形式固有のポイント番号を読むインポーターは、一律削除の対象ではない。
局所的な座標キーのsplitも、それが永続IDの解析でなければこの禁止に含まれない。

## 参照モード切替の移行

`gridSlice.setUseTopology` はモードの変更と、必要に応じたトポロジ生成だけを行い、
既存データの参照変換・モードを含むUndo／Redoを行っていなかった。
Gridで作った頂点線がTopologyへの切替で未解決となることを、
実ストアと描画用resolverで確認し、開発ハーネスによる画面操作でも再現する。

移行は[参照モード切替の契約](board-id-contract.md#参照モードの切替はデータ移行として扱う)に従う。
[実装した移行](reference-mode-identity.md)では数字・塗り・記号・部屋・試行・設定等を一体で変換する。
Gridモードでも保持したトポロジを参照する頂点塗りは、Grid形式のIDへ変換しない。
変換元の形式が曖昧なデータや対応不能な形状では、推測で成功させない。

## #29 頂点塗りへの適用

頂点塗りも盤面の頂点を参照するため、共通のID契約に従う。
セルの何番目の角かを記録する補助情報は移行の手がかりにはなるが、
結合・分割や境界配列の並び替えをまたぐ恒久的な頂点IDの代わりにはしない。
再生成後に古い `vertexId` が別の位置を指す状態を、描画時の補正だけで正常扱いしない。
共通の同一性保持と参照の移行を優先し、その上で新機能を仕上げる。

## 完了条件

優先順は「保存・編集で別要素へ移る可能性」「入力・判定の誤解釈」
「互換APIの縮小」とする。機能ごとのPRで現実の症状と回帰防止の確認を示す。
この文書を追加しただけでは上記の移行は完了しない。
現時点で専用のlint/CIによるID解析禁止は未導入であり、開発ルールに基づきレビューする。

## 方向入力の移行

方向数字のフリックをマウス・タッチ共通のセルID参照へ移行した。
行列のないセル、重複した行列情報でも入力先を保持し、盤面・レイヤー・構造の変更で保留入力を解除する。
[方向入力の仕様と検証範囲](directional-input-identity.md)を参照。制約線・塗りのクリック完了判定も実セルID同士で比較する。

## 除外を伴う旧構造編集の移行

[除外・旧結合・旧分割の移行](legacy-excluded-edits-identity.md)では、保存された可視グラフを保持したまま
元グラフと操作を復元する。分割端点は除外前後で明示的に対応させ、同じ採番文字列を使い回さない。
除外後の実際の構成員と境界を保存し、空グループで後続IDを詰め直さない。
同じ位置の元の内部辺と新しい分割線も別IDにする。検証できた非連結・反復境界や盤外属性も復元し、元経路が不明な形状・彫刻は同文書に記録する。

全グループが除外で消滅した既知の旧盤面でも、グラフと正規化済み設定を一体で復元する。
公開ファイル読込・ストア読込・設定復元は同じ結果を適用し、空の旧結合設定で次の編集を妨げない。
未検証の盤面では構造設定を推測で消去しない。

旧除外元グラフに構造編集の元情報がない場合も、元設定と全グラフを照合して移行する。
元グラフと現在の除外を区別し、移行後の可視グラフを再検証する。由来不明の元グラフは推測しない。

## ぬりみさき判定の移行

[実セル参照と参照モードを使う判定](nurimisaki-validation-identity.md)へ移行した。
検証不能を共通runnerで区別し、入力先の欠損を正解へ置き換えない。
MasterのFile Open/Save・共有・自動保存は[設定保存の共通契約](constraint-settings-persistence.md)へ移行した。盤面ID・参照を変更せず、ジャンルと検査設定を一緒に復元する。
