/**
 * Sukororoom Solver
 *
 * Rules:
 * 1. Fill each cell with a number 1-4 or leave empty
 * 2. Each number N indicates exactly N adjacent cells contain numbers
 * 3. Same numbers cannot be orthogonally adjacent
 * 4. All numbered cells must be connected
 * 5. Each room must contain at least one number
 */
import { posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
export class SukororoomField {
    height;
    width;
    cells;
    roomIds;
    rooms;
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => 'unknown');
        this.roomIds = new Grid(height, width, () => -1);
        this.rooms = [];
        this.clues = new Grid(height, width, () => null);
    }
    setRooms(rooms) {
        this.rooms = rooms;
        for (let roomId = 0; roomId < rooms.length; roomId++) {
            for (const pos of rooms[roomId].members) {
                this.roomIds.set(pos.row, pos.col, roomId);
            }
        }
    }
    setClue(row, col, num) {
        this.clues.set(row, col, num);
        this.cells.set(row, col, num);
    }
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    getAdjacentCells(pos) {
        const result = [];
        for (const dir of DIRECTIONS) {
            const adj = adjacent(pos, dir);
            if (adj.row >= 0 && adj.row < this.height && adj.col >= 0 && adj.col < this.width) {
                result.push(adj);
            }
        }
        return result;
    }
    countAdjacentNumbered(y, x) {
        let confirmed = 0;
        let possible = 0;
        for (const adj of this.getAdjacentCells({ row: y, col: x })) {
            const cell = this.cells.get(adj.row, adj.col);
            if (typeof cell === 'number') {
                confirmed++;
                possible++;
            }
            else if (cell === 'unknown') {
                possible++;
            }
        }
        return { confirmed, possible };
    }
    hasSameAdjacent() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (typeof cell !== 'number')
                    continue;
                for (const adj of this.getAdjacentCells({ row, col })) {
                    if (this.cells.get(adj.row, adj.col) === cell)
                        return true;
                }
            }
        }
        return false;
    }
    checkRoomConstraint() {
        for (const room of this.rooms) {
            let hasNumber = false;
            let hasUnknown = false;
            for (const pos of room.members) {
                const cell = this.cells.get(pos.row, pos.col);
                if (typeof cell === 'number') {
                    hasNumber = true;
                    break;
                }
                if (cell === 'unknown')
                    hasUnknown = true;
            }
            if (!hasNumber && !hasUnknown)
                return false;
        }
        return true;
    }
    isNumberedConnected() {
        const numberedCells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (typeof this.cells.get(row, col) === 'number') {
                    numberedCells.push({ row, col });
                }
            }
        }
        if (numberedCells.length === 0)
            return true;
        const visited = new Set();
        const queue = [numberedCells[0]];
        visited.add(posKey(numberedCells[0]));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const adj of this.getAdjacentCells(current)) {
                const key = posKey(adj);
                if (typeof this.cells.get(adj.row, adj.col) === 'number' && !visited.has(key)) {
                    visited.add(key);
                    queue.push(adj);
                }
            }
        }
        return visited.size === numberedCells.length;
    }
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (typeof cell !== 'number')
                    continue;
                const { confirmed, possible } = this.countAdjacentNumbered(row, col);
                if (cell < confirmed)
                    return false;
                if (cell > possible)
                    return false;
                const adjacents = this.getAdjacentCells({ row, col });
                if (cell === confirmed) {
                    for (const adj of adjacents) {
                        if (this.cells.get(adj.row, adj.col) === 'unknown') {
                            this.cells.set(adj.row, adj.col, 'empty');
                        }
                    }
                }
            }
        }
        return true;
    }
    clone() {
        const cloned = new SukororoomField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
            }
        }
        cloned.roomIds = this.roomIds;
        cloned.rooms = this.rooms;
        cloned.clues = this.clues;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (typeof cell === 'number')
                    dump += cell;
                else if (cell === 'empty')
                    dump += 'e';
                else
                    dump += '?';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === 'unknown')
                    return false;
            }
        }
        if (this.hasSameAdjacent())
            return false;
        if (!this.checkRoomConstraint())
            return false;
        if (!this.isNumberedConnected())
            return false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (typeof cell === 'number') {
                    const { confirmed } = this.countAdjacentNumbered(row, col);
                    if (confirmed !== cell)
                        return false;
                }
            }
        }
        return true;
    }
    solveAndCheck() {
        if (this.hasSameAdjacent())
            return false;
        if (!this.checkRoomConstraint())
            return false;
        if (!this.numberSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (typeof cell === 'number')
                    line += String(cell);
                else if (cell === 'empty')
                    line += '.';
                else
                    line += '?';
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    getFirstUnknownCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === 'unknown') {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
export class SukororoomSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromRooms(height, width, rooms) {
        const field = new SukororoomField(height, width);
        field.setRooms(rooms);
        return new SukororoomSolver(field);
    }
    getBranchCandidates(state) {
        const unknown = state.getFirstUnknownCell();
        if (!unknown)
            return [];
        const candidates = [];
        for (let num = 1; num <= 4; num++) {
            candidates.push({
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(unknown.row, unknown.col, num);
                    return cloned;
                },
                description: `Set (${unknown.row}, ${unknown.col}) to ${num}`,
            });
        }
        candidates.push({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setCell(unknown.row, unknown.col, 'empty');
                return cloned;
            },
            description: `Set (${unknown.row}, ${unknown.col}) to empty`,
        });
        return candidates;
    }
}
//# sourceMappingURL=sukororoom.js.map