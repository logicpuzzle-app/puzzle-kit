/**
 * Solver Adapters Index
 *
 * Export all solver adapters and register them
 */

import { solverRegistry } from '../registry';
import { solverKitAvailable } from '../solverKit';
import { yajilinSolverAdapter } from './yajilin';
import { slitherlinkSolverAdapter } from './slitherlink';
import { mashuSolverAdapter } from './mashu';
import { nurikabeSolverAdapter } from './nurikabe';
import { heyawakeSolverAdapter } from './heyawake';

// Register all adapters when solver-kit is available
if (solverKitAvailable) {
  solverRegistry.register(yajilinSolverAdapter);
  solverRegistry.register(slitherlinkSolverAdapter);
  solverRegistry.register(mashuSolverAdapter);
  solverRegistry.register(nurikabeSolverAdapter);
  solverRegistry.register(heyawakeSolverAdapter);
}

// Export adapters
export { yajilinSolverAdapter };
export { slitherlinkSolverAdapter };
export { mashuSolverAdapter };
export { nurikabeSolverAdapter };
export { heyawakeSolverAdapter };
