# Puzzle Kit Discord 議論まとめ

Discord サーバー「Puzzle Kit」(ID: `1445066069176750254`) の議論を整理したもの。

- 取得日: 2026-07-26
- 対象チャンネル: `#general` / `#update` / `#bug-report` / `#request` / フォーラムスレッド `#solver integration`
- `#secret` は Bot のアクセス権限がなく未取得
- 議論期間: 2025-12-01 〜 2026-01-10

## 参加者

| ハンドル | 立ち位置 |
| --- | --- |
| wand125 | Puzzle Kit の開発者（プロジェクトオーナー） |
| m.enderbug | Penpa ヘビーユーザー。区分けパズルゲームを Steam でデモ公開予定 |
| fff1015 | バグ報告・機能要望の主力。WPC 系の作例を提供 |
| thegreatescaper | 稲葉直貴の約370ジャンルを解答可能リンク化したい。Mender-Penpa から移行検討中 |
| rever | ソルバー/マルチスレッド周りの知見提供 |
| semiexp | cspuz / cspuz_core / logic-pad-solver の作者。ソルバー統合の主担当 |

## 関連リンク

- 本体: https://puzzle-kit.logicpuzzle.app/
- リポジトリ: https://github.com/logicpuzzle-app/puzzle-kit
- cspuz-js: https://github.com/semiexp/cspuz-js
- cspuz_core: https://github.com/semiexp/cspuz_core
- logic-pad-solver: https://github.com/semiexp/logic-pad-solver
- Menderbug の大型パス系パズル（Puzzle Kit への移植希望）: https://brokensign.com/puzzle/2025/12/31/rorschachs-river.html

---

## 1. プロジェクト概要（wand125 による紹介、2025-12-15）

Puzzle Kit は「次世代のパズル作成環境」を目指すプロジェクト。

- **技術スタック**: React + TypeScript + Tailwind。AI 支援開発を前提とした設計
- **入力系**: Penpa-edit の入力方式を移植・拡張
- **描画**: SVG による高品質レンダリング
- **ハイブリッドトポロジー**: グラフ構造（バリアント盤面用）とグリッド構造の両方で盤面データを管理
- **制約システム**: puzz.link のインターフェースを再現・拡張
- **ソルバー内蔵**: cspuz-solver を統合し即時チェック
- **互換性**: Penpa と puzz.link の両方から URL インポート可能
- **OSS**

注意事項として「アーキテクチャがまだ流動的で、昨日動いた機能が今日壊れることもある」と明言されている。

### 設計方針メモ（2025-12-15）

- **ストレージ戦略**: URL 圧縮方式をやめ、サーバーサイド保存に切り替え
- **デスクトップアプリ**: 将来的に Electron 版のリリースを検討
- **パフォーマンス**: 100x100 の大型グリッドでも安定動作を確認
  - https://puzzle-kit.logicpuzzle.app/?id=469944e2-f14c-48af-a4b1-cfb45d5b4c69

---

## 2. 制約（Constraint）システム

### 現状（2025-12-07 リリース、2025-12-15 時点の説明）

「Constraint Preset」機能として実装済み。puzz.link と penpa-solver から移植。

対応プリセット 5 種:
- スリザーリンク (Slitherlink)
- ましゅ (Masyu)
- ヤジリン (Yajilin)
- ぬりかべ (Nurikabe)
- へやわけ (Heyawake)

サンプル（puzz.link からインポートしたヤジリン）:
https://puzzle-kit.logicpuzzle.app/?id=bb3b828d-713c-4b69-960f-c9d710c11df4

### アーキテクチャ（`src/constraints`）

https://github.com/logicpuzzle-app/puzzle-kit/tree/develop/src/constraints

- `schemas`: プリセットのスキーマ定義（シリアライズ可能な形式）
- `testCases`: テストケース（puzz.link フォーマットと比較可能）
- `validators`: 実際の解答チェックロジック

### ロードマップ（2025-12-14 / 2025-12-15）

制約システムの拡張が次の主要テーマ。現状は基本的な入出力制限とバリデーションのみ。

1. **ハイライト（Highlighting）**
   - 美術館の光線表示
   - ヤジリンの充足済みヒントのグレーアウト
   - LITS の完成済み部屋のマーキング
2. **オートコンプリート（Auto-Completion）**
   - 論理的に確定するマスを自動で埋める
3. **カスタマイズ（Customization）**

新ルールの追加はこの制約システム上で行う。稲葉直貴系ジャンルの移植先もここになる。

---

## 3. 盤面要素モデルの整理（2025-12-09、wand125）

### 要素の分類

現状 Surface / Line / Number / Symbol / Special があるが、これを次のように整理する:

- **Surface / Number / Symbol**: 単一要素（cell / vertex / edge）に対するラベル
- **Line**: 2 要素を接続するもの
- **Area**: 複数要素の束

### 内部セマンティック状態

上記の分類に基づき、内部的なセマンティック状態を実装する予定。

例: 「薄緑の Surface」と「Dot Symbol」はどちらも解答判定上は同じ "White Cell" 状態にマップする。

これにより **一括変換機能**（シェーディング ←→ ⚪︎ ←→ ⭐︎ の相互変換）が可能になる。

さらに将来的には **Line と Symbol を等価に扱う**（異なる要素型どうしのマッピング）ことにも関心がある。
参考パズル: https://puzsq.logicpuzzle.app/puzzle/104048

---

## 4. Area モード（2025-12-09）

### wand125 の提案

「Area」分類の導入。

- 複数マスを選択して Area を定義すると、自動で太線の輪郭が描かれる（Line モードと互換）
- Area に数字を割り当てられるようにする（へやわけなど）
- 既存の Cage 機能を最終的にこれに統合する
- 解答モードでのフィルオミノなどにも有用

**未決事項**: グリッド点以外の点を使う Area をサポートすべきか？
ナナメグリはグリッド点ベースだが、他にこれが必要なパズルはあるか？

### フィードバック（m.enderbug）

- **Tonttiraja**: マス中心ベースの領域分割の例として挙がった
- **Slash Pack**: 特別な考慮が必要かもしれない（ナナメグリを考慮しているなら問題にならないかも）
- 区分けパズルゲームの Steam デモを 1 週間ほどで公開予定で、その UI 設計にかなり時間をかけたので参考になるかもしれない（特に解答モードでのこの手の入力について）

---

## 5. Line 周りの拡張（2025-12-09）

### Directed Line モード（wand125 提案）

線に方向記号を付与するモード（例: `--->---`）。

**狙い**: Thermo・Arrow・BoxLine といった異なる線種を「特定の Directed Line パターン」として統一的に扱う。

参考: https://www.hempuli.com/blog/index.php?rule=id&ruleid=539

**m.enderbug の反応**: 方向付き線のネイティブサポートは良さそう。ただし矢印だらけで視覚的に煩雑にならないようスタイリングの作り込みが必要。

### 線の交差（Line Jump / Bridge）

m.enderbug の当初の要望は「他の線要素と重ならずに長距離接続を示せる、緩く弧を描くフリーライン」（主にメモ用途なので、フリーハンドツールがあれば不要かもしれない）。

これを受けて wand125:
- 交差点で線が互いを「またぐ」表現（交差していないことを示す）を使うパズルがあることを想起
- したがって「Line Jump」「Bridge」機能はフリーハンドのメモ用途だけでなく、通常のグリッド線にも必要かもしれない

m.enderbug は交差表現について具体案を提示（画像添付）。
使用例: https://mastodon.gamedev.place/@Menderbug/110086433598155249

wand125 の結論: 「Penpa でも実現はできるが、Line ツールにネイティブ対応させるのが筋が良さそう」

---

## 6. 複数盤面（Multi-Grid）サポート（2025-12-06 / 2025-12-25）

### 複数解を持つ盤面（m.enderbug）

- Penpa でも何度か欲しくなった機能
- **Twopa** のように、同じグリッドのコピーが複数あり、どのグリッドがどの解を取るかは任意、というものをサポートしたい
- 実装案: 作者が解のリストを定義できるようにし、それらの解をどう扱うかの UI オプションを用意すれば両方いけそう

### 盤面のリンク（fff1015、2025-12-06）

スターバトルのような複数盤面パズルを作る際、複数の盤面をリンクして同時にシェーディング／辺描画できると嬉しい。

### 盤面の自由配置（m.enderbug、2025-12-25）

複数グリッド対応を入れるなら、グリッドを自由に移動（できれば回転も）できるオプションが欲しい。複数パーツを組み立てるタイプのパズル向け。

---

## 7. 稲葉直貴ジャンルの移植（2025-12-15）

**thegreatescaper**: 稲葉直貴のオリジナル約 370 ジャンルを解答可能リンクとして移植したい。Mender-Penpa で着手済みだが、Puzzle Kit への移行を検討中。

> ジャンルの提示方法・メカニクスの幅が非常に広いので、機能アイデアの供給源としても面白いかもしれない（作業量を増やす意図はないけれど）

**wand125**: 強い関心あり。稲葉ジャンルは他で見ない独自のインタラクションを要求することが多いと同意:
- 多色塗り分け
- 異なる色の線の使用（デコレーションツリーなど）
- ループでマス群を囲む

これらのユースケースをぜひサポートしたい。

---

## 8. ソルバー統合（フォーラムスレッド `#solver integration`、2026-01-10）

`#general` での議論から派生して、semiexp が専用フォーラムスレッドを作成。

### 出発点（`#general`、2026-01-10）

- **semiexp**: 新しいパズルエディタの開発に関心あり。ソルバー統合も手伝える
- **wand125**: 現状は特定ジャンルを内部的に puzz.link URL へ変換して組み込み cspuz に渡している。将来的には URL 変換を経由せず、ルールセットで直接ソルバーとやり取りしたい
- **rever**: マルチスレッド周りの知見を提供可能
- **rever**: ルールチェッカーとソルバーを何らかの形で統合できないか？
- **semiexp**: logic-pad 向けにルール指向ソルバーを実装済み（https://github.com/semiexp/logic-pad-solver ）。ただし logic-pad のルールに特化しており、Puzzle Kit にそのまま適用できるものではない
- **wand125**: logicPad と logicPad Solver は Puzzle Kit の要件を洗い出すのに大いに参考になりそう
- **rever**: LogicPad (IOI) は多くのジャンルをエンコードする良い土台を持っている

### ルールチェッカーとソルバーの統合（semiexp）

可能。2 つのアプローチがある:

1. 各ルール指定子（連結性、個数など）ごとに、正当性チェッカーと CSP エンコーダの両方を書く
2. 解答自体も CSP 制約としてエンコードし、CSP モデルが充足可能かを判定する

### 中心的な提案: cspuz の JavaScript/TypeScript インターフェース（semiexp）

現状のブリッジは puzz.link のような URL しか受け付けない。より柔軟なものにしたい。

**提案内容**: CSP ソルバーの生成、制約の追加など、すべてのインターフェースを JavaScript 側に公開する。
具体的には https://github.com/semiexp/cspuz-js の再実装を想定。

**メリット**:
- 制約が複雑化するほど、JS ベースのインターフェースが有用になる
- そうでないと制約を中間表現に変換する（JS ↔ Rust のブリッジ用）手間が発生する
- 新しいルール形式のサポートが容易になる
- 内部ソルバー（Rust）はグリッドフォーマットを気にする必要がなくなる。JS 側で各マスに対応する「変数」を必要に応じて宣言できる
- グリッド構造をグラフとして抽象化できるので、矩形以外のグリッドもサポートできる

イメージとしては、ジャンルごとのソルバー（例: https://github.com/semiexp/cspuz_core/blob/main/cspuz_rs_puzzles/src/puzzles/akari.rs ）を JavaScript で書けるようにするのに近い。
※ 既存の 100 以上のソルバーを JS で再実装するという意味ではない。

### パフォーマンス懸念（rever）とその回答

- **rever**: JS 側に処理を寄せると遅くならないか。可能な限り wasm / Rust 側で計算すべき。グリッド状態＋ルールリストという形で渡す方式は？
- **semiexp**: ソルバーコア自体は引き続き wasm 内で動く。制約の構築は Rust 側の方が速いが、そのコストはソルバー部分に比べればずっと小さい
- **rever**: 制約生成の移植でそこまで遅くならないなら、この方向で良さそう

### 制約記述の表現力に関する議論

**rever の要望**:
- `For all X` のようなキーワード記号を追加したい。制約を数学的な文として書けるように
- 1 つの制約から複数の制約を生成する仕組み
- `a <=> b` を `a.iff(b)` に変換するような基本的な糖衣構文
- グリッド状態を前提としたキーワードを設計し、「グリッドのレイヤー Y の全 X について」を素早く for ループに変換できるように
- パーサ（`solver.addConstraint(y)` が `y` を解釈する部分）からグリッドの各レイヤーにアクセスできる cspuz の改造版が良さそう
- 「num の全 x について、領域のサイズ = x」のような文を |x| 個の新しい式に展開できるようにしたい

**semiexp の説明**:
- `solver.addConstraint(y)` — `y` が式ならそのまま追加、配列ならその中の式を個別に追加
- `y` は JavaScript オブジェクトなのでそのままは渡せず、本質を変えずに文字列へ変換して内部ソルバーに渡す
- 例: `a.gt(b.add(c))` は `"(> a (+ b c))"` のような形に変換される（関数名は異なるかもしれない）

**rever の追加提案**（2026-01-10 夕方、議論の続き）:
- pzpr が既にルールをチェックしているような形で、ヘルパー関数を用意すると良さそう。共通する制約群をまとめて追加する関数
- 内部ソルバーが常に同じ形式のグリッド（構造ではなく、「塗りマス層が 1 つ、ループ層が 1 つ」といったレイヤー構成）を持つなら、より自由度が上がるのではないか

> この最後の論点（グリッドレイヤーの標準化 vs グラフ抽象化）は 2026-01-10 時点で未決着。

---

## 9. バグ報告（`#bug-report` および `#general`）

| 日付 | 報告者 | 内容 | 状態 | Issue |
| --- | --- | --- | --- | --- |
| 2025-12-08 | m.enderbug | ソルバーが動作しない（ましゅで確認） | wand125 が確認 → **修正済み** | — |
| 2025-12-08 | fff1015 | ヘックス盤面でマスの除外(exclude)が効かない。無効マスの色を変更して初めて反映される | 未確認 | #18 |
| 2025-12-18 | fff1015 | Problem > Number > Normal で、マスをクリックして入力・編集した数字が BackSpace で削除できない | **修正済み → PR #37** | #19 |
| 2025-12-18 | fff1015 | Problem > Line > Center, Orthogonal で、同じ経路を再ドラッグしてもパスが削除されない | 未確認 | #20 |
| 2026-01-06 | m.enderbug | 半端な線（half line）が引けない。辺の中点を端点とする線がまったく引けない | 未確認 | #21 |
| 2025-12-18 | fff1015 | 盤面外（グレー領域）のクリックで選択中マスの状態が変わってしまう | **修正済み → PR #38** | #22 |
| 2026-01-06 | m.enderbug | 除外したマスを個別に戻す方法がなく、全リセットしかない | **修正済み → PR #39** | #23 |
| 2026-01-06 | m.enderbug | 用語の不一致: 操作名は "exclude" なのにボタンは "reset all disabled cells" | **修正済み → PR #39** | #23 |

## 10. 機能要望（`#request`）

### wand125 自身の要望（2025-12-20）

1. **頂点中心のシェーディング**: Line や Symbol だけでなく、Shading (Surface) にも "Vertex" モードが必要。
   理由: マス中心を線が通るパズル（通常のループ系）では、内側／外側を塗るということは実質的にグリッド頂点を中心とする領域（双対グリッド）を塗ることになるため。
2. **Special ツール用の消しゴム**: Special ツールに部分消去または修正機能が必要。
   例: 矢印の先端を短くしたい（`o--->` → `o->`）ときに全体を描き直さずに済むようにしたい。

### fff1015（2025-12-18）

- キーボードからの記号入力。特にヒント位置をマークする `?` や `.` が直接打てるとパズル作成に便利
- 選択中マスの表示設定: 枠線をもっと太く、色をはっきりさせたい
- 盤面外（グレー領域）をクリックすると選択中のマスが変化してしまう（塗られる・数字が入るなど）。盤面外のクリックは盤面状態に影響すべきでない

### fff1015（2025-12-20 / 2025-12-28）

- 上記「2. Special ツール用の消しゴム」に関連して、矢印を全部描き直さずに修正できると嬉しい（画像添付）
- WPC 2023 R17 & R19 の変則ピース作例を提供
- WPC 2025 R5 の作例を提供

### m.enderbug（2025-12-25）

- 複数グリッド対応を入れるなら、グリッドの自由移動・回転オプションが欲しい（複数パーツ組み立て型パズル向け）。ニッチかもしれないが

### m.enderbug（2026-01-03）

- 公開済みの大型パス系パズルを、いずれ Puzzle Kit に移植したい
  https://brokensign.com/puzzle/2025/12/31/rorschachs-river.html

---

## 11. 更新履歴（`#update`）

| 日付 | 内容 |
| --- | --- |
| 2025-12-02 | PNG/SVG エクスポート時のトポロジカルグリッドのサイズ指定を修正 |
| 2025-12-07 | Constraint Preset 機能を追加（スリザーリンク／ましゅ／ヤジリン／ぬりかべ／へやわけ） |
| 2025-12-08 | トポロジカルグリッドの座標処理を改善／辺に垂直な矢印数字のフリック入力を追加／アルファベット・ひらがな・カタカナ・長文テキスト入力に対応 |
| 2025-12-08 | Exclude モードを追加 |

---

## 12. Issue 対応表

本ドキュメントの内容から起票した GitHub Issue（2026-07-26 作成、#18〜#35）。

| Issue | タイトル | 本文の該当章 | 状態 |
| --- | --- | --- | --- |
| [#18](https://github.com/logicpuzzle-app/puzzle-kit/issues/18) | Hex grid: cell exclusion is not applied until the disabled-cell color is changed | 9 | 要再現確認 |
| [#19](https://github.com/logicpuzzle-app/puzzle-kit/issues/19) | Numbers entered by clicking a cell cannot be deleted with Backspace | 9 | **PR #37** |
| [#20](https://github.com/logicpuzzle-app/puzzle-kit/issues/20) | Re-dragging the same route does not erase the line | 9 | 要再現確認 |
| [#21](https://github.com/logicpuzzle-app/puzzle-kit/issues/21) | Cannot draw half lines or lines with edge midpoints as endpoints | 9 | 未着手 |
| [#22](https://github.com/logicpuzzle-app/puzzle-kit/issues/22) | Clicking outside the board modifies the selected cell | 9 / 10 | **PR #38** |
| [#23](https://github.com/logicpuzzle-app/puzzle-kit/issues/23) | Restore excluded cells individually, and unify exclude/disabled terminology | 9 | **PR #39** |
| [#24](https://github.com/logicpuzzle-app/puzzle-kit/issues/24) | Configurable selection highlight | 10 | 未着手 |
| [#25](https://github.com/logicpuzzle-app/puzzle-kit/issues/25) | Direct keyboard input for symbols | 10 | 未着手 |
| [#26](https://github.com/logicpuzzle-app/puzzle-kit/issues/26) | Area mode | 4 | 未着手 |
| [#27](https://github.com/logicpuzzle-app/puzzle-kit/issues/27) | Directed Line mode | 5 | 未着手 |
| [#28](https://github.com/logicpuzzle-app/puzzle-kit/issues/28) | Line crossing representation (jump / bridge) | 5 | 未着手 |
| [#29](https://github.com/logicpuzzle-app/puzzle-kit/issues/29) | Vertex-centered shading (Surface on vertices) | 10 | 未着手 |
| [#30](https://github.com/logicpuzzle-app/puzzle-kit/issues/30) | Partial eraser and editing for Special tools | 10 | 未着手 |
| [#31](https://github.com/logicpuzzle-app/puzzle-kit/issues/31) | Semantic element states and batch conversion | 3 | 未着手 |
| [#32](https://github.com/logicpuzzle-app/puzzle-kit/issues/32) | Multi-grid support | 6 | 未着手 |
| [#33](https://github.com/logicpuzzle-app/puzzle-kit/issues/33) | Constraint system phase 2: Highlighting and Auto-Completion | 2 | 未着手 |
| [#34](https://github.com/logicpuzzle-app/puzzle-kit/issues/34) | JavaScript/TypeScript interface for cspuz_core | 8 | 未着手 |
| [#35](https://github.com/logicpuzzle-app/puzzle-kit/issues/35) | Support requirements for Naoki Inaba's genres | 7 | 未着手 |

既存 Issue との関連: #21 → #15 (Line Normalization)、#25 → #10 (Text Input Improvements)、#29 → #14 (Dual Grid Conversion)、#32 → #6 (Board Graph Rotation)、#33 → #1 (Constraint Features、クローズ済み)

## 13. 未解決・要判断の論点

1. **Area がグリッド点以外の点を使うケースをサポートするか** — ナナメグリ以外に必要な例があるか未確定（Tonttiraja、Slash Pack が候補として挙がった）→ #26
2. **ソルバーのグリッド表現** — 内部ソルバーが標準化されたレイヤー構成を持つべきか（rever）、グラフとして抽象化して JS 側で変数を宣言すべきか（semiexp）。2026-01-10 時点で未決着 → #34
3. **制約 DSL の表現力** — `For all X in Y` 相当の量化子、糖衣構文、ヘルパー関数群をどこまで用意するか → #34
4. **ルールチェッカーとソルバーの統合方式** — ①ルール指定子ごとにチェッカー＋CSP エンコーダを書く ②解答も CSP 制約としてエンコードして充足性判定、のどちらを採るか → #34
5. **複数解・複数グリッドの UI** — 作者が解のリストを定義し、その扱い方を UI オプションで選ぶ案が出ているが未設計 → #32
6. **デスクトップアプリ化** — Electron 版の是非（未起票。方針判断が先）
