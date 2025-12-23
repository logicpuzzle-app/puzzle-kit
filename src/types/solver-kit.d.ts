declare module '@logicpuzzle-app/solver-kit' {
  export const SOLVER_KIT_AVAILABLE: boolean;

  export enum SolveStatus {
    SOLVED,
    MULTIPLE,
    TIMEOUT,
    UNSOLVABLE,
  }

  export enum EdgeState {
    UNKNOWN,
    LINE,
    CROSS,
  }

  export enum CellState {
    UNKNOWN,
    BLACK,
    WHITE,
  }

  export enum LoopEdgeState {
    UNKNOWN,
    LINE,
    BLANK,
  }

  export enum PearlType {
    WHITE,
    BLACK,
  }

  export enum Direction {
    UP,
    RIGHT,
    DOWN,
    LEFT,
  }

  export interface HeyawakeRoom {
    blackCount: number;
    members: Array<{ row: number; col: number }>;
  }

  export class SlitherField {
    [key: string]: any;
    constructor(rows: number, cols: number);
    setNumber(row: number, col: number, value: number): void;
    getHorizontalEdge(row: number, col: number): EdgeState;
    getVerticalEdge(row: number, col: number): EdgeState;
  }

  export class SlitherSolver {
    [key: string]: any;
    constructor(field: SlitherField);
    solve(options: any): { status: SolveStatus; state?: SlitherField };
  }

  export class MasyuField {
    [key: string]: any;
    constructor(rows: number, cols: number);
    setPearl(row: number, col: number, pearl: PearlType): void;
    getEdge(row: number, col: number, dir: Direction): EdgeState;
  }

  export class MasyuSolver {
    [key: string]: any;
    constructor(field: MasyuField);
    solve(options: any): { status: SolveStatus; state?: MasyuField };
  }

  export class YajilinField {
    [key: string]: any;
    constructor(rows: number, cols: number);
    setArrow(row: number, col: number, dir: Direction, count: number): void;
    getYokoEdge(row: number, col: number): LoopEdgeState;
    getTateEdge(row: number, col: number): LoopEdgeState;
    getCell(row: number, col: number): CellState;
  }

  export class YajilinSolver {
    [key: string]: any;
    constructor(field: YajilinField);
    static create(rows: number, cols: number, options: any): YajilinSolver;
    solve(options: any): { status: SolveStatus; state?: YajilinField };
    getField(): YajilinField;
  }

  export class HeyawakeField {
    [key: string]: any;
    constructor(rows: number, cols: number);
    setRooms(rooms: HeyawakeRoom[]): void;
    setWalls(horizontal: boolean[][], vertical: boolean[][]): void;
    getCell(row: number, col: number): CellState;
  }

  export class HeyawakeSolver {
    [key: string]: any;
    constructor(field: HeyawakeField);
    static fromRooms(
      rows: number,
      cols: number,
      rooms: HeyawakeRoom[],
      horizontalWalls: boolean[][],
      verticalWalls: boolean[][]
    ): HeyawakeSolver;
    solve(options: any): { status: SolveStatus; state?: HeyawakeField };
    getField(): HeyawakeField;
  }

  export class NurikabeField {
    [key: string]: any;
    constructor(rows: number, cols: number);
    setNumber(row: number, col: number, value: number): void;
    getCell(row: number, col: number): CellState;
  }

  export class NurikabeSolver {
    [key: string]: any;
    constructor(field: NurikabeField);
    solve(options: any): { status: SolveStatus; state?: NurikabeField };
    getField(): NurikabeField;
  }

  export class NurimisakiField {
    [key: string]: any;
    constructor(rows: number, cols: number);
    setNumber(row: number, col: number, value: number): void;
    getCell(row: number, col: number): CellState;
  }

  export class NurimisakiSolver {
    [key: string]: any;
    constructor(field: NurimisakiField);
    solve(options: any): { status: SolveStatus; state?: NurimisakiField };
    getField(): NurimisakiField;
  }
}
