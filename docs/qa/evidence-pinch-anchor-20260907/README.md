# Pinch before / after（2026-09-07 JST）

[index.html](index.html)をブラウザーで開き、6フロー・12本を比較できる。別実行なのでフレーム同期ではない。動画は加工せずコピーした。

| フロー | Before | After |
| --- | --- | --- |
| 中点固定のピンチ | [動画](stationary-before.webm) / failed | [動画](stationary-after.webm) / passed |
| 中点を動かすピンチ | [動画](moving-before.webm) / failed | [動画](moving-after.webm) / passed |
| 拡大後のピンチ | [動画](prezoomed-before.webm) / failed | [動画](prezoomed-after.webm) / passed |
| 最初の塗りを保持しUndo/Redo | [動画](first-contact-before.webm) / passed | [動画](first-contact-after.webm) / passed |
| Pan Modeでは塗らずに移動 | [動画](pan-mode-before.webm) / passed | [動画](pan-mode-after.webm) / passed |
| 小刻みなパンを副色タップと誤認しない | [動画](subpixel-before.webm) / failed | [動画](subpixel-after.webm) / passed |

先頭5フローはChromium CDP touch入力。最後のフローはCDPで接触後、0.25pxずつのPointerEventを同一JSタスクで送る決定的な回帰テストであり、実機のイベント頻度を再現したものではない。静止した2本指secondary/3本指deleteの既存unit testも保持する。

beforeは`2026-09-06T16-45-00-232Z-before`、小刻みパンのみ`2026-09-06T16-48-38-225Z-before`。afterは`2026-09-06T16-49-38-489Z-after`。基準HEAD1c3b0ff、afterは未コミット修正を含む。`metadata.json`の動画/source manifest SHA-256と、ローカル`artifacts/qa/`の全manifest・差分・traceで比較する。初期色を黒と仮定した診断実行は、この証跡から除外している。

最初の塗りを残すのは既存仕様の境界確認であり、新しい不具合修正として数えない。実機Safari・OS割込みは未検証。
