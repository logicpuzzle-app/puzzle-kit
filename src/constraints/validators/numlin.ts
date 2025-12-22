/**
 * Numberlink (Numlin) Puzzle Validator
 *
 * Based on pzprjs/src/variety/numlin.js checklist:
 * - checkDeadendConnectLine (line ends must be on numbers)
 * - checkDisconnectLine (lines must connect numbers)
 * - checkTripleObject (no line connects 3+ numbers)
 * - checkLinkSameNumber (numbers connected must match)
 * - checkLineOverLetter (lines cannot pass through numbers)
 * - checkNoLineObject (each number has a line)
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
  type Direction,
} from './core';

type LineComponent = {
  cells: string[];
  numberCells: { cellId: string; value: string }[];
};

function inBounds(ctx: ValidationContext, row: number, col: number): boolean {
  return row >= 0 && row < ctx.grid.rows && col >= 0 && col < ctx.grid.cols;
}

function getNeighbor(row: number, col: number, dir: Direction): { row: number; col: number } {
  switch (dir) {
    case 'up':
      return { row: row - 1, col };
    case 'down':
      return { row: row + 1, col };
    case 'left':
      return { row, col: col - 1 };
    case 'right':
      return { row, col: col + 1 };
  }
}

const getLineComponents = (ctx: ValidationContext): LineComponent[] => {
  const components: LineComponent[] = [];
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 0) continue;

      const key = `${row}-${col}`;
      if (visited.has(key)) continue;

      const queue: { row: number; col: number }[] = [{ row, col }];
      const component: LineComponent = { cells: [], numberCells: [] };
      visited.add(key);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const cellId = `cell-${current.row}-${current.col}`;
        component.cells.push(cellId);

        const numberValue = ctx.getNumber(current.row, current.col);
        if (numberValue !== null) {
          component.numberCells.push({ cellId, value: numberValue });
        }

        const currentInfo = ctx.getCellLines(current.row, current.col);
        for (const dir of currentInfo.directions) {
          const neighbor = getNeighbor(current.row, current.col, dir);
          if (!inBounds(ctx, neighbor.row, neighbor.col)) continue;

          const neighborInfo = ctx.getCellLines(neighbor.row, neighbor.col);
          if (neighborInfo.count === 0) continue;

          const neighborKey = `${neighbor.row}-${neighbor.col}`;
          if (visited.has(neighborKey)) continue;

          visited.add(neighborKey);
          queue.push(neighbor);
        }
      }

      components.push(component);
    }
  }

  return components;
};

/**
 * checkLineOverLetter - Lines cannot pass through numbered cells.
 */
function checkLineOverLetter(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const numberValue = ctx.getNumber(row, col);
      if (numberValue === null) continue;
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count >= 2) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkNoLineObject - Every number must have at least one line.
 */
function checkNoLineObject(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const numberValue = ctx.getNumber(row, col);
      if (numberValue === null) continue;
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 0) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkDeadendConnectLine - Line endpoints must be on numbered cells.
 */
function checkDeadendConnectLine(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (ctx.getNumber(row, col) !== null) continue;
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 1) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkDisconnectLine - Every line component must connect at least one number.
 */
function checkDisconnectLine(ctx: ValidationContext): CheckResult {
  const components = getLineComponents(ctx);
  for (const component of components) {
    if (component.numberCells.length === 0) {
      return { ok: false, elements: component.cells };
    }
  }
  return { ok: true };
}

/**
 * checkTripleObject - A line cannot connect 3 or more numbers.
 */
function checkTripleObject(ctx: ValidationContext): CheckResult {
  const components = getLineComponents(ctx);
  for (const component of components) {
    if (component.numberCells.length >= 3) {
      return { ok: false, elements: component.cells };
    }
  }
  return { ok: true };
}

/**
 * checkLinkSameNumber - Connected numbers must be identical.
 */
function checkLinkSameNumber(ctx: ValidationContext): CheckResult {
  const components = getLineComponents(ctx);
  for (const component of components) {
    if (component.numberCells.length <= 1) continue;
    const uniqueValues = new Set(component.numberCells.map((cell) => cell.value));
    if (uniqueValues.size > 1) {
      return { ok: false, elements: component.numberCells.map((cell) => cell.cellId) };
    }
  }
  return { ok: true };
}

registerCheckFunction('checkLineOverLetter', checkLineOverLetter);
registerCheckFunction('checkNoLineObject', checkNoLineObject);
registerCheckFunction('checkDeadendConnectLine', checkDeadendConnectLine);
registerCheckFunction('checkDisconnectLine', checkDisconnectLine);
registerCheckFunction('checkTripleObject', checkTripleObject);
registerCheckFunction('checkLinkSameNumber', checkLinkSameNumber);
