# タッチ操作テスト整理のQA

合成PointerEventによるburst panとsubpixel移動は既存Unitへ集約し、native CDPによるpan、描画、キャンセル、残った指の操作を維持しました。pan量を累積しない変異と、累積移動をタップ扱いする変異は、残すUnitがそれぞれ検出しています。実装は復元済みです。

free-segmentとmerge/splitの正常操作・Undo/Redoを、キャンセル後の正常操作へ統合しました。初回正常操作だけの独立状態は失います。orthogonal描画、Surfaceの最初の接触とUndo/Redo、Pan modeによるSurface編集抑止は残します。

ピンチの3条件は「拡大後に中心を動かす」1件へ集約し、中心位置に加えて描画幅が指の間隔に対応して40px増えることを確認します。100%開始・中心移動0の個別browser条件や同一taskの合成イベントとDOM配線の組合せに対する保証は減ります。Unitでは連続/一括イベント、倍率上下限、SVG offset、padding等を維持します。アプリ変更なし、3specで135行減。速度・flake改善は未計測です。

| 検査 | 結果 |
|---|---|
| 対象mobile Chromium | 9成功（整理前16件） |
| 全Unit | 954成功 / 72ファイル |
| 開発E2E | 244成功、既存skip 1（252→245枠） |
| 本番E2E | 70成功、既存skip 1（71枠不変） |
| アプリ/E2E型検査・source map・build | 成功 |
| 先行PRローカル統合 | 型・集合差分成功、開発171→164、本番56枠不変。統合全Unit/E2Eは未再実行 |

PR #102がbase。Before `aa89a6802d1be460e39640737a1a188a77fd7f06` / After `fcef1c5f0575a14ad408ea3d34f3131a05e69bf4`。撮影時clean、Before manifestの557ファイルをbaselineと照合し、Afterとの差は対象3specのみでした。

Playwright Chromiumのmobile profileでBefore16件・After9件を撮影。公開代表はpan/pinch/line/merge/splitの5組です。panは同じ空盤面、pinchは双方170%でAfterのみ中心が12/10px移動します。lineのBeforeはUndo後、AfterはRedo後で線が残ります。merge/splitの最終形は同じですが、Afterはキャンセル復帰を含む動画です。10画像の内容と10動画の全decode・Chromium再生/シークを確認済み。動画は同期しておらず、pixel一致は主張しません。

[revision・実行コマンド・SHA256](evidence-test-touch-flows-20260915/evidence.json) / [ローカルで開く動画比較](evidence-test-touch-flows-20260915/index.html)。詳細監査・UI Reviewは非追跡 `.work` のみです。

再現:

```sh
npx playwright test e2e/gestures.chromium-touch.spec.ts e2e/pinch-anchor.chromium-touch.spec.ts e2e/multitouch-grid.chromium-touch.spec.ts --project=mobile-chrome
npm run qa:check
npm run build
npm run qa:production
npm run qa:capture -- after e2e/gestures.chromium-touch.spec.ts e2e/pinch-anchor.chromium-touch.spec.ts e2e/multitouch-grid.chromium-touch.spec.ts --project=mobile-chrome
```
