# Properties before / after（2026-09-06）

[index.html](index.html)をブラウザーで開き、3フロー・6本の動画を左右に比較できる。別実行のためフレーム同期ではない。360/412pxの静止画はPropertiesを開いた状態。

| フロー | Before | After |
| --- | --- | --- |
| 360pxで開閉→盤面編集→Undo | [動画](width-360-before.webm) / failed | [動画](width-360-after.webm) / passed |
| 412pxで開閉→盤面編集→Undo | [動画](width-412-before.webm) / failed | [動画](width-412-after.webm) / passed |
| Escape→フォーカス復帰 | [動画](escape-before.webm) / failed | [動画](escape-after.webm) / passed |

同じmobile-chrome設定と操作フロー。before: `2026-09-06T10-25-52-416Z-before`、after: `2026-09-06T10-36-06-058Z-after`。基準HEADは3742aa5、afterは撮影時に未コミットの実装差分を含む。`metadata.json`に動画/source manifestのSHA-256を記録し、全manifest・差分・traceはローカルcaptureに保存している。

Propertiesはtouchscreen.tap、閉じた後の盤面線入力はmouse、Escapeはkeyboard。実機Safari・OS割込み・ソフトウェアキーボードの動画ではない。追加の設定保持・背景タップ・画像/保存エラー通知のafter動画はローカルcaptureとCI artifactで確認できる。
