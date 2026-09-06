# NPGenerator seed QA動画

[比較ページ](index.html)で再生できる。Chromium desktop、別実行のためフレーム同期ではない。

| 記録 | 結果 | 動画 |
| --- | --- | --- |
| Before: 自動seedで生成成功を期待した旧テスト | FAIL: 100回の試行上限に到達 | [before](xml-before.webm) |
| After: 成功経路のPRNG seedを1に固定 | PASS: 一意解を生成 | [after](xml-after.webm) |
| エラー後の再生成 | PASS: 失敗seedで上限到達後、seed 1で成功 | [復帰](xml-recovery.webm) |

これは不安定なテスト入力の修正であり、生成アルゴリズムの修正ではない。元の失敗seedは`-8157813607070382776`。XMLの初期解とPRNG seedは別の入力である。

コミット、テストソース、capture名、動画SHA-256、再生時間は[metadata.json](metadata.json)。全体結果・実行手順は[QA記録](../2026-09-07-chromium-recheck.md)。
