# Properties drawer QA

基準`3742aa5`（PR #51）、作業branch `feature/properties-drawer`。UI Reviewは非追跡の`.work/ui-review/properties-drawer-review.md`。

## 再現結果

MasterでPropertiesを開くと、360px画面では盤面幅327→136px、412px画面では379→188pxに縮小。Escapeで閉じる操作も未対応だった。同一の3ケースがbefore 3 FAIL → after 3 PASS。

768px未満では右側drawerを重ね、盤面の幅・位置を維持する。閉じるボタン、Escape、背景タップに対応し、閉じた後は起動ボタンへフォーカスを戻す。Tabは内部に留まり、Hなどの盤面ショートカットは背面へ伝播しない。広い画面では隣接パネルを使い、画面幅を往復しても設定と開閉状態を保持する。

[HTML dialogのshowModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)で背面のポインター・フォーカス操作を無効にする。アプリの画像エラー・保存エラー等の通知が表示されたときはdrawerを閉じ、通知を操作可能にする。

## 検証範囲

`e2e/properties-drawer.spec.ts`は7ケースをChromium/WebKitのdesktop/mobile設定で実行する。全ケースhasTouchを有効化し、Propertiesはtapで操作。閉じた後の線入力はmouse、Escape/Tab/Hはkeyboardで検証する。

- 360/412pxで開く→寸法確認→閉じる→線を描く→Undo。
- Escapeで閉じ、起動ボタンへフォーカス復帰。
- Shift+Tab/Tab、Hの伝播防止、色設定、背景タップによる閉じる操作。
- 1024→412→1024→360pxのサイズ変更と色設定・開閉状態の維持。
- 短い画面で内部スクロールし、画像ファイル形式エラーを閉じて再開。
- 保存エラー通知を受けてdrawerを閉じ、通知を閉じて再開。これは`puzzlekit:storage-error`の通知境界の検証であり、実際のストレージ容量枯渇は発生させていない。

画像エラー追加テストの初回はStyleラベル/初期Gridモードの指定ミスで停止した。この診断実行を修正前の不具合証跡に含めない。

## 再実行・証跡

```bash
npm run qa:capture -- before e2e/properties-drawer.spec.ts --project=mobile-chrome
# 修正後
npm run qa:capture -- after e2e/properties-drawer.spec.ts --project=mobile-chrome
npm run test:e2e -- e2e/properties-drawer.spec.ts
npm run qa:check
npm run build
```

[3フロー・6本の比較動画](evidence-properties-drawer-20260906/README.md)。撮影時の差分・source manifest・全traceはローカル`artifacts/qa/`に保存。共有動画はGit管理し、CIの全体検証動画・traceは30日保存する。

実機Safari、OS割込み、ソフトウェアキーボード・safe areaの実機評価は未実施。ローカル全体検証はunit 1,003件（61ファイル）、E2E 158 PASS / 8既存手動skip / 0 FAIL / 0 flaky、型チェック2種・buildが成功。新規Propertiesは28件PASS。記録は`artifacts/check/2026-09-06T10-37-39-733Z/`。Linux CIの最終結果はPRに記載する。
