import * as solverKit from '../../solver/index.js';

type SolverKitModule = typeof solverKit & { SOLVER_KIT_AVAILABLE?: boolean };

export const solverKitAvailable =
  (solverKit as SolverKitModule).SOLVER_KIT_AVAILABLE ?? true;

export {
  SlitherField,
  SlitherSolver,
  MasyuField,
  MasyuSolver,
  PearlType,
  EdgeState,
  SolveStatus,
  Direction,
  YajilinField,
  YajilinSolver,
  LoopEdgeState,
  CellState,
  HeyawakeField,
  HeyawakeSolver,
  NurikabeField,
  NurikabeSolver,
  NurimisakiField,
  NurimisakiSolver,
} from '../../solver/index.js';

export type { HeyawakeRoom } from '../../solver/index.js';
