<!-- Doc-ID: DOC-QA-PR-39 -->

# PR #39 (Issue #23) QA Report

## 対象

- Repository: `logicpuzzle-app/puzzle-kit`
- Issue: #23
- PR: #39
- Before: `origin/develop` (112d999f)
- After: `fix/exclude-cell-restore` (d38c0b4b5483d066438d3b72317e0d24772251db)
- Base URL: http://localhost:5199/master
- Viewport: Desktop Chrome (1600x1000) / Pixel 7 (`mobile-chrome` 相当)
- Captured at: 2026-07-28T02:57:26Z
- Firebase project: 該当なし（puzzle-kit はローカル完結）

## 確認環境

- macOS 26.2 (arm64)
- Node.js v22.21.1
- Playwright 1.62.0 / bundled Chromium
- dev server: `npm run dev -- --port 5199`

## 確認結果

1. Grid > Exclude でセル(4,4)をクリック→除外、もう一度クリック→復元。
2. 修正前はセル数が 81→80→79 となり、穴のクリックが隣接セルを巻き込んで除外していた。修正後は 81→80→81 で正しく復元。
3. クリアボタンの表記が Clear all disabled cells から Clear all excluded cells に変わったことを確認。
4. レガシー disabledCells の個別復元は UI から到達できないため src/test/cellExclusion.test.ts で担保。
5. モバイル(Pixel 7)はレイアウト撮影のみ。

### モバイル撮影の範囲

Master エディタのリボンは Pixel 7 の 412px 幅に収まらず、一部のツールボタンに到達できない。したがってモバイルは**レイアウト撮影のみ**とし、対話を伴う確認はデスクトップで実施した。モバイルではプロパティパネルが盤面に重なりキャンバスを 188px に切り詰めるため、撮影前にパネルを畳んでいる。

## データの取り扱い

- Firebase / 外部データ: 該当なし。アクセス・更新とも実施していない。
- 作成した一時データ: ブラウザ内の盤面操作のみ（永続化なし）。
- 削除・復元: 不要（QA 用の worktree・一時ブランチは作成していない）。

## スクリーンショット

### Before (origin/develop)

![01-before-develop-desktop-exclude-restore-excluded](./01-before-develop-desktop-exclude-restore-excluded.png)
![01-before-develop-desktop-exclude-restore-panel](./01-before-develop-desktop-exclude-restore-panel.png)
![01-before-develop-desktop-exclude-restore-restored](./01-before-develop-desktop-exclude-restore-restored.png)
![02-before-develop-mobile-exclude-restore-board](./02-before-develop-mobile-exclude-restore-board.png)
![02-before-develop-mobile-exclude-restore-editor](./02-before-develop-mobile-exclude-restore-editor.png)

### After (fix/exclude-cell-restore)

![03-after-branch-desktop-exclude-restore-excluded](./03-after-branch-desktop-exclude-restore-excluded.png)
![03-after-branch-desktop-exclude-restore-panel](./03-after-branch-desktop-exclude-restore-panel.png)
![03-after-branch-desktop-exclude-restore-restored](./03-after-branch-desktop-exclude-restore-restored.png)
![04-after-branch-mobile-exclude-restore-board](./04-after-branch-mobile-exclude-restore-board.png)
![04-after-branch-mobile-exclude-restore-editor](./04-after-branch-mobile-exclude-restore-editor.png)

## 自動検証

```
npx tsc -b --force   # 0 errors
npx vitest run
npx eslint <changed files>
```

## 判定

**Pass**
