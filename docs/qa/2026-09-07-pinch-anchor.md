# Pinch anchor QA

基準`1c3b0ff`（PR #52）、branch `feature/pinch-anchor-quality`。UI Reviewは非追跡の`.work/ui-review/`に保存。

## 再現と修正

指の中点に対応する盤面位置が、ピンチ後に約72.11 CSS pxずれることを、中点固定・中点移動・拡大済みの3ケースで再現した。ズーム前後の座標関係に合わせてpanを補正し、clamp後のzoomと一緒にストアへ反映する。修正後の誤差は各ケースの許容値1 CSS px未満。

もう1件は0.25pxずつのパンを静止した2本指タップと誤認し、副色へ変えていた。直前のイベントとの差ではなく、各指の接触開始位置からの変位で既存0.5px許容値を判定する。

最初の指ですでに適用したincremental編集は維持し、1回のUndoで戻す既存仕様を変更しない。Pan Modeでは最初から描画せず移動する。これら2フローはbefore/afterとも成功した境界確認であり、不具合修正件数に含めない。

## 証跡と検証

[6フロー・12動画](evidence-pinch-anchor-20260907/README.md)。4 FAIL / 2 PASS → 6 PASS。初期unitは3 FAIL / 2 PASS→5 PASS、その後、上限/下限への到達・export padding・指交代・一括ストア更新を加え新規10件PASS。既存タッチ23件もPASS。

CDP専用E2Eはmobile-chrome、同一JSタスク内のsubpixelテストは合成PointerEventと明記する。ドラッグ終点は150ms静止してから離し、Linux CDPの慣性開始による次タップの抑制を避ける。実機SafariやOS割込みの検証とは区別する。

```bash
npm run test:unit -- src/test/pinchAnchorRegression.test.tsx
npm run qa:capture -- before e2e/pinch-anchor.chromium-touch.spec.ts --project=mobile-chrome
# 修正後に同じ操作条件
npm run qa:capture -- after e2e/pinch-anchor.chromium-touch.spec.ts --project=mobile-chrome
npm run qa:check
npm run build
```

共有動画の撮影後はソースmanifestと最終ソースのSHAを照合する。ローカル全体検証: unit1,013件（62ファイル）、E2E164 PASS / 8既存手動skip、型チェック2種・buildが成功。記録は`artifacts/check/2026-09-06T16-51-17-610Z/`。Linux CIの最終結果はPRに記録する。
