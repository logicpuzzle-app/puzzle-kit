# Chromium QA再検証（2026-09-07 JST）

Playwright 1.62.0のChromiumでDesktop Chrome / Pixel 7設定を実行した。モバイル設定はエミュレーション。ユーザー指定によりComputer Useから切り替えた検証であり、実機のテスト結果ではない。

## 発見と対応

HEAD `4cb6431`の全体実行は89 PASS / 1 FAIL / 4既存skip。XMLを読み込んで生成するE2Eが、OS乱数で生成成功を要求していた。失敗時のPRNG seedは`-8157813607070382776`で、画面は`generation failed after 100 attempts`を表示していた。XML内の`<seed>`は初期解の盤面であり、PRNG seedの固定にはならない。

成功経路のテストはUIからPRNG seed `1`を指定する。別の回帰テストで失敗seedの試行上限到達、Generateボタンの復帰、結果XMLの出力禁止、その後seed `1`での再生成成功・エラー消去・XML出力の復帰を確認する。生成アルゴリズムや試行上限は変更していない。乱数seedが異なるbefore/afterなので、アプリの生成不具合を修正したという証拠にはしない。

## 結果と証跡

- 最終Chromium全体: **92 PASS / 4既存skip / 0 FAIL / 0 flaky**、リトライなし。動画・traceは全実行で保存。
- XML成功／失敗後の復帰: 両Chromium設定で各3回、**12 PASS**。E2E型チェック成功。
- ピンチ6フローの再検証: `1c3b0ff`で4 FAIL / 2 PASS → `4cb6431`で6 PASS。同一テストソースを使用。比較動画12本をローカルに保存。
- [XMLのbefore / afterと復帰動画3本](evidence-npgen-seed-20260907/README.md)。動画は元のWebMをコピーし、SHA-256と再生時間を検証した。

| 実行 | ローカルcapture（`artifacts/qa/`） |
| --- | --- |
| ピンチ修正前 | `2026-09-06T23-38-12-366Z-before` |
| 最初の全体検証・XML失敗 | `2026-09-06T23-38-47-823Z-after` |
| XML関連の反復検証 | `2026-09-06T23-42-02-639Z-after` |
| テスト修正後の全体検証 | `2026-09-06T23-42-50-012Z-after` |

最初の全体検証のphase名`after`はピンチ修正に対する名称である。XMLのテスト修正に対してはbeforeとして扱い、元のmetadataは書き換えていない。最終撮影はHEAD `4cb6431`にE2E変更を加えた状態で、working-tree.patchとsource-manifest.jsonを保存した。

```bash
npm run qa:capture -- after --project=chromium --project=mobile-chrome
npm run qa:capture -- after e2e/npgen.spec.ts --grep 'initial solution seed|exhausted attempts' --project=chromium --project=mobile-chrome --repeat-each=3
npm run typecheck:e2e
```

既存の自動seed更新テストは維持する。今回の変更はXML成功経路の再現性とエラー復帰の検証に限定する。UI Reviewは非追跡の`.work/`のみで管理する。
