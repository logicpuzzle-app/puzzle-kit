const notAvailable = () => {
  throw new Error('solver-kit is not available');
};

export const SOLVER_KIT_AVAILABLE = false;

export enum SolveStatus {
  SOLVED = 'solved',
  MULTIPLE = 'multiple',
  TIMEOUT = 'timeout',
  UNSOLVABLE = 'unsolvable',
}

export enum EdgeState {
  UNKNOWN = 0,
  LINE = 1,
  CROSS = 2,
}

export enum CellState {
  UNKNOWN = 0,
  BLACK = 1,
  WHITE = 2,
}

export enum LoopEdgeState {
  UNKNOWN = 0,
  LINE = 1,
  BLANK = 2,
}

export enum PearlType {
  WHITE = 1,
  BLACK = 2,
}

export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

class StubField {
  [key: string]: any;

  constructor(..._args: any[]) {}
}

class StubSolver {
  [key: string]: any;

  constructor(..._args: any[]) {}

  solve() {
    notAvailable();
  }
}

export class SlitherField extends StubField {
  setNumber() {
    notAvailable();
  }
  getHorizontalEdge() {
    notAvailable();
  }
  getVerticalEdge() {
    notAvailable();
  }
}

export class SlitherSolver extends StubSolver {}

export class MasyuField extends StubField {
  setPearl() {
    notAvailable();
  }
  getEdge() {
    notAvailable();
  }
}

export class MasyuSolver extends StubSolver {}

export class YajilinField extends StubField {
  setArrow() {
    notAvailable();
  }
  getYokoEdge() {
    notAvailable();
  }
  getTateEdge() {
    notAvailable();
  }
  getCell() {
    notAvailable();
  }
}

export class YajilinSolver extends StubSolver {
  static create() {
    notAvailable();
  }
}

export class HeyawakeField extends StubField {
  setRooms() {
    notAvailable();
  }
  setWalls() {
    notAvailable();
  }
  getCell() {
    notAvailable();
  }
}

export class HeyawakeSolver extends StubSolver {
  static fromRooms() {
    notAvailable();
  }
}

export class NurikabeField extends StubField {
  setNumber() {
    notAvailable();
  }
  getCell() {
    notAvailable();
  }
}

export class NurikabeSolver extends StubSolver {
  getField() {
    notAvailable();
  }
}

export class NurimisakiField extends StubField {
  setNumber() {
    notAvailable();
  }
  getCell() {
    notAvailable();
  }
}

export class NurimisakiSolver extends StubSolver {
  getField() {
    notAvailable();
  }
}
