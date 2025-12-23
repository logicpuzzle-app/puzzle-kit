import * as solverKit from '@logicpuzzle-app/solver-kit';

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
} from '@logicpuzzle-app/solver-kit';

export type { HeyawakeRoom } from '@logicpuzzle-app/solver-kit';
