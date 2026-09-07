# Touch / WebKit before-after (2026-09-06)

[index.html](index.html) をブラウザーで開くと、7つのアプリ回帰＋Linux入力条件の比較1件・計16本の動画を左右に並べて比較できる。GitHub上ではこのフォルダを取得して開くか、各動画をダウンロードする。静止画は各検証の終了時点であり、動画の開始フレームではない。別実行のためフレーム同期はしていない。

| フロー | Before | After |
| --- | --- | --- |
| touch-pan-burst (mobile-chrome) | [動画](touch-pan-burst-before.webm) / 20px: failed | [動画](touch-pan-burst-after.webm) / 60px: passed |
| touch-pan (mobile-chrome) | [動画](touch-pan-before.webm) / failed | [動画](touch-pan-after.webm) / passed |
| touch-cancel (mobile-chrome) | [動画](touch-cancel-before.webm) / failed | [動画](touch-cancel-after.webm) / passed |
| touch-square (mobile-chrome) | [動画](touch-square-before.webm) / failed | [動画](touch-square-after.webm) / passed |
| touch-hex (mobile-chrome) | [動画](touch-hex-before.webm) / failed | [動画](touch-hex-after.webm) / passed |
| webkit-npgen (webkit) | [動画](webkit-npgen-before.webm) / failed | [動画](webkit-npgen-after.webm) / passed |
| mobile-webkit-npgen (mobile-webkit) | [動画](mobile-webkit-npgen-before.webm) / failed | [動画](mobile-webkit-npgen-after.webm) / passed |

`metadata.json` にcapture ID、テスト名、HEAD、動画SHA-256、source manifest SHA-256を記録している。capture時のソースには未コミット差分があるため、HEADだけで状態を判断しない。全動画がChromiumで読み込めることを確認した。全trace・manifest・差分・HTMLレポートはローカルの `artifacts/qa/<capture ID>/` に保存する。

タッチドラッグ・中断・パンはChromiumのCDP touch入力、セル除外はPlaywright touchscreen.tap。WebKitの動画はPlaywrightのDesktop Safari/iPhone設定でNPGeneratorを操作したもので、iPhone実機の動画ではない。

追加のtouch-pan-burstは、CDPで指の接触を開始してから3つのPointerEventを同じJavaScriptタスク内で送る合成イベントの回帰検証。60pxの入力に対してbeforeは20px、afterは60px移動する。実機の入力周期の再現とはしていない。beforeはTouchHandlersを217dc66の版に戻し、afterはaf6aa17の修正を適用した状態。

Linux CIの入力条件比較: [before](linux-undo-input-before.webm) / [after](linux-undo-input-after.webm)。同じLinux arm64コンテナで、アプリのソースは変更せず、指を終点で静止してから離す条件へ変更したもの。before/afterとも同じUndo/Redo E2EとPixel 7設定を使っている。これはアプリのUndo修正動画とは区別する。
