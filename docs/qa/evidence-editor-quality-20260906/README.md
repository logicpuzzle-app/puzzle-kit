# Editor QA before / after (2026-09-06)

[index.html](index.html) をローカルブラウザーで開くと、9フロー・18本の動画を左右に並べて確認できる。GitHub上ではHTMLを直接実行できないため、このフォルダを取得して開くか、各WebMをダウンロードする。静止画は各実行の検証時点で、動画の開始フレームではない。

| フロー | Before | After |
| --- | --- | --- |
| edit-mobile (mobile-chrome) | [動画](edit-mobile-before.webm) / failed | [動画](edit-mobile-after.webm) / passed |
| paint-mobile (mobile-chrome) | [動画](paint-mobile-before.webm) / failed | [動画](paint-mobile-after.webm) / passed |
| master-mobile (mobile-chrome) | [動画](master-mobile-before.webm) / failed | [動画](master-mobile-after.webm) / passed |
| square-restore (chromium) | [動画](square-restore-before.webm) / failed | [動画](square-restore-after.webm) / passed |
| hex-restore (chromium) | [動画](hex-restore-before.webm) / failed | [動画](hex-restore-after.webm) / passed |
| edge-lines (chromium) | [動画](edge-lines-before.webm) / failed | [動画](edge-lines-after.webm) / passed |
| half-lines (chromium) | [動画](half-lines-before.webm) / failed | [動画](half-lines-after.webm) / passed |
| directional-number (chromium) | [動画](directional-number-before.webm) / failed | [動画](directional-number-after.webm) / passed |
| keyboard-tools (chromium) | [動画](keyboard-tools-before.webm) / failed | [動画](keyboard-tools-after.webm) / passed |

動画は別実行でありフレーム同期ではない。`metadata.json` にcapture ID、テスト名、HEAD、動画SHA-256、ソースmanifestのSHA-256を記録している。各captureは当時の未コミット差分も含むため、HEADだけでは修正状態を表さない。完全なmanifest・差分・trace・HTMLレポートは `artifacts/qa/<capture ID>/` に残す。

修正前の10件のtopologyテストは実際の復元/描画/削除の期待値で失敗している。初期化順やセレクターを調整する前の試行は代表証跡に含めていない。アクセシビリティの選択状態はDOMのassertionで検証し、動画の外見だけで判定していない。
