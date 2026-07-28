<!-- Doc-ID: DOC-QA-PR-46 -->

# PR #46 (Issue #25) QA Report

## 対象

- Repository: `logicpuzzle-app/puzzle-kit`
- Issue: #25
- PR: #46
- Before: `origin/develop` (112d999f)
- After: `feat/symbol-keyboard-input` (cc3f9fc4ee95566efc36aee26601bb6f73ea8300)
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

1. Problem > Number > Normal でセルを選び ? と . を打鍵。
2. 修正前は ? が無反応、. は数字ハンドラに流れて 0 が入った。修正後はそれぞれ正しく入る。
3. モバイル(Pixel 7)はレイアウト撮影のみ。

### モバイル撮影の範囲

Master エディタのリボンは Pixel 7 の 412px 幅に収まらず、一部のツールボタンに到達できない。したがってモバイルは**レイアウト撮影のみ**とし、対話を伴う確認はデスクトップで実施した。モバイルではプロパティパネルが盤面に重なりキャンバスを 188px に切り詰めるため、撮影前にパネルを畳んでいる。

## データの取り扱い

- Firebase / 外部データ: 該当なし。アクセス・更新とも実施していない。
- 作成した一時データ: ブラウザ内の盤面操作のみ（永続化なし）。
- 削除・復元: 不要（QA 用の worktree・一時ブランチは作成していない）。

## スクリーンショット

### Before (origin/develop)

![01-before-develop-desktop-marker-keys-full](./01-before-develop-desktop-marker-keys-full.png)
![01-before-develop-desktop-marker-keys-markers](./01-before-develop-desktop-marker-keys-markers.png)
![02-before-develop-mobile-marker-keys-board](./02-before-develop-mobile-marker-keys-board.png)
![02-before-develop-mobile-marker-keys-editor](./02-before-develop-mobile-marker-keys-editor.png)

### After (feat/symbol-keyboard-input)

![03-after-branch-desktop-marker-keys-full](./03-after-branch-desktop-marker-keys-full.png)
![03-after-branch-desktop-marker-keys-markers](./03-after-branch-desktop-marker-keys-markers.png)
![04-after-branch-mobile-marker-keys-board](./04-after-branch-mobile-marker-keys-board.png)
![04-after-branch-mobile-marker-keys-editor](./04-after-branch-mobile-marker-keys-editor.png)

## 自動検証

```
npx tsc -b --force   # 0 errors
npx vitest run
npx eslint <changed files>
```

## 判定

**Pass**
