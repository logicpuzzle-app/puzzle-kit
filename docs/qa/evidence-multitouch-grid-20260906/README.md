# Multi-touch / Grid before-after (2026-09-06)

[index.html](index.html)をブラウザーで開くと7フロー・14本を左右に比較できる。GitHub上ではフォルダを取得して開くか、各動画をダウンロードする。静止画は終了画面。別実行なのでフレーム同期ではない。

| フロー | Before | After |
| --- | --- | --- |
| ピンチ後に片指を離し、残った指でパン | [動画](pinch-release-before.webm) / failed | [動画](pinch-release-after.webm) / passed |
| Merge / Undo / Redo | [動画](merge-before.webm) / failed | [動画](merge-after.webm) / passed |
| Merge中断後の再操作 | [動画](merge-cancel-before.webm) / failed | [動画](merge-cancel-after.webm) / passed |
| Split / Undo / Redo | [動画](split-before.webm) / failed | [動画](split-after.webm) / passed |
| Split中断後の再操作 | [動画](split-cancel-before.webm) / failed | [動画](split-cancel-after.webm) / passed |
| Sculpt Rotate / Undo / Redo | [動画](sculpt-rotate-before.webm) / failed | [動画](sculpt-rotate-after.webm) / passed |
| Sculpt Cut / Undo / Redo | [動画](sculpt-cut-before.webm) / failed | [動画](sculpt-cut-after.webm) / passed |

同一テスト・Pixel 7設定。beforeは`2026-09-06T08-02-56-086Z-before`、afterは`2026-09-06T08-07-47-286Z-after`。`metadata.json`に動画SHA-256、source manifest SHA-256、capture時のHEADを保存する。capture時は未コミット差分があるためHEADだけでは比較しない。全trace・ソース差分・manifest・入力ログは`artifacts/qa/<capture ID>/`に保存している。

ピンチと部分リリースはChromium 151のCDP入力。`touchEnd`に離す接触点を指定し、pointerupがその指だけに届くことを確認した。一般のtouch APIや実機対応を意味しない。SculptはPlaywright touchscreen.tap。実機iOS Safari、OS割込み、ペン・ソフトウェアキーボードは今回の動画に含まない。
