<!-- Doc-ID: DOC-QA-PR-37 -->

# PR #37 (Issue #19) QA Report

## 対象

- Repository: `logicpuzzle-app/puzzle-kit`
- Issue: #19
- PR: #37
- Before: `origin/develop` (112d999f)
- After: `fix/number-backspace-delete` (181c44beedbfc6a551c269d0367acac6ef2f9e10)
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

1. Problem > Number > Normal: 数字入力・Backspace とも修正前から動作（回帰なし）。
2. Problem > Number > Arrow Number: 修正前は Backspace が無反応で 5 が残った。修正後は削除される。
3. モバイル(Pixel 7)はレイアウト撮影のみ。エディタ表示に破綻なし。

### モバイル撮影の範囲

Master エディタのリボンは Pixel 7 の 412px 幅に収まらず、一部のツールボタンに到達できない。したがってモバイルは**レイアウト撮影のみ**とし、対話を伴う確認はデスクトップで実施した。モバイルではプロパティパネルが盤面に重なりキャンバスを 188px に切り詰めるため、撮影前にパネルを畳んでいる。

## データの取り扱い

- Firebase / 外部データ: 該当なし。アクセス・更新とも実施していない。
- 作成した一時データ: ブラウザ内の盤面操作のみ（永続化なし）。
- 削除・復元: 不要（QA 用の worktree・一時ブランチは作成していない）。

## スクリーンショット

### Before (origin/develop)

![01-before-develop-desktop-number-backspace-after-backspace](./01-before-develop-desktop-number-backspace-after-backspace.png)
![01-before-develop-desktop-number-backspace-full](./01-before-develop-desktop-number-backspace-full.png)
![01-before-develop-desktop-number-backspace-typed](./01-before-develop-desktop-number-backspace-typed.png)
![02-before-develop-mobile-number-backspace-board](./02-before-develop-mobile-number-backspace-board.png)
![02-before-develop-mobile-number-backspace-editor](./02-before-develop-mobile-number-backspace-editor.png)

### After (fix/number-backspace-delete)

![03-after-branch-desktop-number-backspace-after-backspace](./03-after-branch-desktop-number-backspace-after-backspace.png)
![03-after-branch-desktop-number-backspace-full](./03-after-branch-desktop-number-backspace-full.png)
![03-after-branch-desktop-number-backspace-typed](./03-after-branch-desktop-number-backspace-typed.png)
![04-after-branch-mobile-number-backspace-board](./04-after-branch-mobile-number-backspace-board.png)
![04-after-branch-mobile-number-backspace-editor](./04-after-branch-mobile-number-backspace-editor.png)

## 自動検証

```
npx tsc -b --force   # 0 errors
npx vitest run
npx eslint <changed files>
```

## 判定

**Pass**
