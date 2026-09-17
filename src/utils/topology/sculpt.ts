import type { GridConfig } from '../../types';
import type { GridTopology } from './types';
import { replayLegacySculpt } from './legacySculpt';

/** Compatibility boundary for GridConfig-only sculpt files. New edits use
 * retainedSculpt and persist their graph and explicit allocations directly. */
export function applySculptOperations(topology: GridTopology, config: GridConfig): GridTopology {
  if (!config.sculptOperations?.length || config.gridType !== 'iso') return topology;
  const migrated = replayLegacySculpt(topology, config);
  if (!migrated) throw new Error('Cannot restore legacy sculpt operations');
  return migrated.topology;
}
