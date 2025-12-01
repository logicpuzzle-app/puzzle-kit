# Claude Memory for puzzle-kit

## Puzzle Export Format Versioning

When modifying the puzzle serialization format:

1. **バージョン定数**: `src/constants/version.ts` の `PUZZLE_EXPORT_VERSION` を更新する
2. **バージョン履歴**: 同ファイルのコメントに変更内容を記載する
3. **バージョニングポリシー**:
   - Major: 破壊的変更、後方互換性なし
   - Minor: 新機能追加、後方互換性あり
   - Patch: バグ修正

### Version History

- **1.0.0**: 初期フォーマット（elements に layer フィールド含む）
- **1.1.0**: layer フィールドをストリップ（problem/answer構造から推論可能）

### 関連ファイル

- `src/constants/version.ts` - バージョン定数
- `src/utils/puzzleExport.ts` - シリアライズ最適化
- `src/store/slices/puzzleIOSlice.ts` - export/import処理
- `src/utils/export.ts` - exportToJson関数

## Migration System

メジャーバージョン変更時はマイグレーションが必要。

### マイグレーション追加手順

1. `src/migrations/migrations/index.ts` にマイグレーション定義を追加:

```typescript
const migration1to2: Migration = {
  from: '1.0.0',
  to: '2.0.0',
  description: 'Migrate to v2 format',
  migrate: (data) => {
    return {
      ...data,
      // Transform data structure here
    };
  },
};

migrationRegistry.register(migration1to2);
```

2. `src/constants/version.ts` のバージョンを更新
3. マイグレーションは `importPuzzle` 時に自動実行される

### マイグレーション関連ファイル

- `src/migrations/types.ts` - 型定義
- `src/migrations/registry.ts` - マイグレーションレジストリ
- `src/migrations/migrations/index.ts` - マイグレーション定義
