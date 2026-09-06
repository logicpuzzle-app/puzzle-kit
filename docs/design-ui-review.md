# Puzzle Kit 設計・UI調査

調査日: 2026-09-06。対象は `puzzle-kit-refactor` のHEAD `511a926` から開始したローカル作業ツリー。GitHub open Issue 35件、ソース、Vitest、Chromium Desktop / Pixel 7設定の表示と録画を確認した。本番サイトや実機では未検証。

## 設計の把握

`src/main.tsx` がpathnameで Home / Master / Edit / Paint / Player を選ぶ。MasterはRibbon、Canvas、PropertiesPanelからなる。入力は `useCanvasInputRouter` → `useCanvasInteraction` / state machine → tool handler → Zustand slice / ActionExecutor → HistoryManagerを経由し、Canvasの要素レイヤーへ描画される。

`createPuzzleStore()` とProviderで独立したインスタンスを作れる一方、Providerがない場合はdefault singletonを使う。GridConfigとTopologyの両表現、problem/answerの要素レイヤー、tool settingsとinput modeが共存する。NPGeneratorはWasm Worker、既存solverは同梱JS、作業中のヤジリンadapterは兄弟workspaceパッケージに依存する。

## 再現確認済みの問題

| 優先度 | 問題・影響 | 根拠 / 状態 | 次の対応 |
| --- | --- | --- | --- |
| P1 | Free Segmentがpointer releaseで確定しない | [#40](https://github.com/logicpuzzle-app/puzzle-kit/issues/40)。`getToolCategory`のimport漏れ。unit + desktop E2Eで再現し今回修正。Undo/Redoも確認 | special全種類、touchの回帰を追加 |
| P1 | 数字の矢印移動で例外 | `useNumberKeyboard.ts`: callback引数`_key`に対し`key`を参照。before動画で例外を確認し今回修正 | 漢字/かな/方向数字の入力回帰を拡充 |
| P1 | `/edit` が起動時にクラッシュ | Desktop/Pixel両方で `Maximum update depth exceeded`。stackは `setPan` → `useBoardCentering` → `EditApp`。未修正 | 下記のeffect依存を安定化し、同一panを再設定しない |
| P1 | Mobile Masterの横方向overflowと盤面操作の失敗 | 412px幅に対してdocument幅560px、properties幅224px、canvas幅188px。ツール選択後の動画で盤面が見えなくなる。line/クリック数字の3テストが失敗 | モバイル用にpropertiesをdrawer化。Ribbonのoverflowを局所化し盤面を自動fit |
| P1 | Mobile Paintの盤面領域が極端に小さい | Pixel設定初期表示でcanvas 394×19.906px。スクリーンショットでもツール群の上に細い盤面だけ見える。未修正 | Canvasの最小高・flex shrink方針、ツール領域のスクロール/折りたたみを定義 |
| P1 | build前提の型チェックが通らない | 開始時37 diagnostics、今回の2変数修正で34。Paintの型、古い入力action、作業中yajilin adapterなど | 型エラーを領域別に修正。Vite起動成功をbuild成功とみなさない |

モバイルIssueテストの失敗はまずレイアウト/入力到達の問題として扱う。デスクトップで修正済みの#40と同じ例外がモバイルでも残ると断定しない。狭いviewportのmouse/keyboard操作であり、実機のtouch試験は別途必要。

## コードから確認した設計上の懸念

### effectとストア更新の循環

`EditApp` は `getCurrentZoom: () => store.getState().canvas.zoom` を毎renderで生成する。`useBoardCentering`の `centerBoard` はこれを依存に持ち、`useEffect([centerBoard])` が `setPan` を呼ぶ。`setPan`は同じ値でも新しいcanvasオブジェクトを作る。この循環が上記クラッシュの原因と考えられる（stackとソースが一致）。callbackの安定化と値の同値判定を行い、起動E2Eで検証する。

### 購読の範囲が広い

hooks/componentsには `usePuzzleStore()` の引数なし使用が85箇所ある。Provider実装はその場合state全体を返すため、pointer移動などの更新が広く伝播し得る。性能劣化の定量測定は未実施。まず入力経路とCanvasで必要な値だけをselectorで購読し、Profilerで計測する。レンダリング時間を今回の結果から推定しない。

### state machine単体と実際の配線の間にテストの隙間

開始時の944件は成功していたが、実際のmouse upフックは未定義関数で落ちていた。純粋なtransitionのテストだけではimport漏れやhook配線を検知できない。今回の `canvasInteractionRegression.test.tsx` は本物のフック・ストア・履歴を通し、この隙間を埋める。

### 状態の複数表現

GridConfig / Topology、currentTool / currentCategory / currentInputMode、problem / answer / trialが重なる。型チェックでは入力routerに既にunionから消えたactionのcaseも残っている。入力から保存までの責務を明示し、変換境界に契約テストを追加する。特に[#15](https://github.com/logicpuzzle-app/puzzle-kit/issues/15)・[#21](https://github.com/logicpuzzle-app/puzzle-kit/issues/21)はhalf/full線と端点の正規化仕様を先に確定する。

### 環境再現性

READMEのnpm installと現在のworkspace依存が矛盾していた。今回READMEを訂正しXML fixtureを同梱したが、親workspaceのlockfileとyajilin-kitに依存する構造は残る。node_modulesはpnpm11で作成、PATHはpnpm10で、依存追加が最初に失敗した。固定したpnpmで追加し、手順を記載した。単独clone用CIは依存の公開/同梱方針を決めてから追加する。

同梱solverのsourcemapは存在しない元ソースを参照しており大量の警告が出る。失敗ではないが調査ログを圧迫する。将来の配布処理でmapにソースを含めるか、無効なmapを同梱しない方針が必要。

## UI上の改善候補

| 問題 | 証拠の種別 | 提案・受け入れ条件 |
| --- | --- | --- |
| 選択中のモードを色だけで表す | Ribbon/RibbonPickersのソース: 選択classはあるが `aria-pressed` / tab semanticsがない | toggleにaria-pressed、tabにaria-selectedと矢印移動。キーボード・スクリーンリーダーで現在値が分かる |
| 盤面セルの意味を取得しにくい | CanvasはSVG＋座標入力。NPGeneratorはgrid/gridcellを持つ | 描画表示を維持しつつ選択セルと入力状態を読み上げる仕組み。テストにも安定した意味情報を提供 |
| 初期画面でGrid/Problem/Answer/Constraint/Trialが並ぶ | Desktop Masterスクリーンショット | 新規作成→問題編集→解答確認の導線を示し、mode間の役割を説明する。ユーザーテストで理解度を確認（今回は未実施） |
| 小さい画面で操作領域が盤面を圧迫する | 上記Master/Paintの実測 | 412×839で盤面の最小操作領域を定める。長いツール一覧は選択部分だけ展開 |
| 除外/無効化の用語が不統一 | [#23](https://github.com/logicpuzzle-app/puzzle-kit/issues/23)の報告。現版の全ラベル照合は未実施 | 用語統一と個別復元を仕様化し、除外→1セル復帰のE2Eを作る |

名前のないbutton簡易検査は確認した初期画面で0だった。ただしtitleの有無を含めた簡易集計であり、アクセシブルネーム計算やWCAG監査の代用ではない。

## GitHub Issueとの対応

[open Issues](https://github.com/logicpuzzle-app/puzzle-kit/issues?q=is%3Aissue%20is%3Aopen) を35件読み込んだ。Issueのcloseやコメント投稿は行っていない。

| Issue | 調査状況 |
| --- | --- |
| [#40](https://github.com/logicpuzzle-app/puzzle-kit/issues/40) Free Segment / special completion | Free Segmentを再現→修正→desktop成功。special全種類は未検証 |
| [#20](https://github.com/logicpuzzle-app/puzzle-kit/issues/20) 再ドラッグ消去 | desktopの描画/消去自体はbeforeでも成功。ただしmouse up例外あり。修正後は例外なし |
| [#19](https://github.com/logicpuzzle-app/puzzle-kit/issues/19) Backspace削除 | desktopの今回の手順ではbefore/afterとも成功。全入力条件で解決済みとはしない |
| [#22](https://github.com/logicpuzzle-app/puzzle-kit/issues/22) 盤面外クリック | 選択済み数字→盤面外クリックではbefore/afterとも変更なし。Surface等は未検証 |
| [#18](https://github.com/logicpuzzle-app/puzzle-kit/issues/18) Hex除外反映 | 追加E2Eが必要。再現未確認 |
| [#21](https://github.com/logicpuzzle-app/puzzle-kit/issues/21) half線/edge端点 | 関連unitはあるが、報告操作のE2Eは未追加 |
| [#23](https://github.com/logicpuzzle-app/puzzle-kit/issues/23) 個別復帰/用語 | 仕様・UI課題として継続 |
| [#15](https://github.com/logicpuzzle-app/puzzle-kit/issues/15) 線正規化 | データ仕様と回帰テストの拡張対象 |

その他27件は機能/設計要望として扱う。未実装の要望を確認済みバグとして数えない。

- Grid/盤面: #3 新grid、#4 graph editor、#6 回転、#14 dual grid、#17 Kakuro、#29 vertex surface、#32 multi-grid。
- 描画/入力: #5 edge crossing、#7 symbol追加、#8 symbol整理、#9 image、#10 text、#12 circle/arc、#13 contrast、#24 selection、#25 keyboard symbol、#26 area、#27 directed line、#28 crossing bridge、#30 partial eraser、#31 semantic states。
- 公開/ゲーム/solver: #2 player公開、#11 movable objects、#16 cloud管理、#33 highlight/auto-completion、#34 cspuz JS interface、#35 Inaba genres。

## 推奨する次の作業順

1. `/edit` の更新ループ、型チェック残件を直す。before/afterを録画して起動回帰を通す。
2. Master / Paintのモバイル領域配分を設計し、viewportとtouch双方で検証する。
3. #18 / #21 / #23 の最小fixtureと操作仕様を作り、今回のハーネスへ追加する。
4. ストア購読と入力責務を整理し、パフォーマンスとアクセシビリティを測定する。
5. workspaceの配布境界を確定し、同じQAコマンドをCIで回して動画をartifactとして保持する。

## 公開準備で確認した既存PR

2026-09-06、今回のPR作成前にopen PRも確認した。次の修正作業では新規実装前に適用先と差分をレビューする。今回のテスト結果は既存PR未適用の作業ツリーのもの。

| PR | 関連する修正 |
| --- | --- |
| [#41](https://github.com/logicpuzzle-app/puzzle-kit/pull/41) | getToolCategoryのimport。本PRの修正と重複 |
| [#42](https://github.com/logicpuzzle-app/puzzle-kit/pull/42) | WIP Paintの型エラーと2つの入力例外。次の優先度2で参照 |
| [#44](https://github.com/logicpuzzle-app/puzzle-kit/pull/44) | Vitest/E2E分離。今回のinclude設定と目的が重複 |
| [#47](https://github.com/logicpuzzle-app/puzzle-kit/pull/47) | Mobile Masterの横overflowとproperties初期状態 |
| [#43](https://github.com/logicpuzzle-app/puzzle-kit/pull/43) | #21 edge/halfのTopology入力 |
| [#39](https://github.com/logicpuzzle-app/puzzle-kit/pull/39) | #23 除外セルの復元・用語 |
| [#38](https://github.com/logicpuzzle-app/puzzle-kit/pull/38) | #22 盤面の穴へのクリック。今回の盤面外テストとは再現条件が異なる |
| [#37](https://github.com/logicpuzzle-app/puzzle-kit/pull/37) | #19 方向数字/制約数字の削除。Normalのみの今回テストでは不十分 |
| [#45](https://github.com/logicpuzzle-app/puzzle-kit/pull/45), [#46](https://github.com/logicpuzzle-app/puzzle-kit/pull/46) | 選択カーソル設定、?/.のキーボード入力 |

PR公開時には今回の依存だけを取り出し、単独checkout用package-lockを更新した。親workspace依存の注意は元のヤジリン作業ツリーに対するもの。
