/**
 * Renban Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers in cells connected by a line form a consecutive sequence (in any order)
 */
import { Grid } from '../core/field.js';
import { posKey } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Renban Field State
// ============================================
export class RenbanField {
    height;
    width;
    /** Number candidates for each cell */
    numbersCand;
    /** Group ID for each cell (cells in same group form consecutive sequence) */
    groupIds;
    /** Group member positions */
    groups;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        const size = Math.max(height, width);
        this.numbersCand = new Grid(height, width, () => {
            const cands = [];
            for (let n = 1; n <= size; n++) {
                cands.push(n);
            }
            return cands;
        });
        this.groupIds = new Grid(height, width, () => -1);
        this.groups = new Map();
    }
    /** Set a clue number */
    setClue(row, col, num) {
        this.numbersCand.set(row, col, [num]);
    }
    /** Set groups from connection data */
    setGroups(connections) {
        // Build adjacency list
        const adjList = new Map();
        for (const [pos1, pos2] of connections) {
            const key1 = posKey(pos1);
            const key2 = posKey(pos2);
            if (!adjList.has(key1))
                adjList.set(key1, new Set());
            if (!adjList.has(key2))
                adjList.set(key2, new Set());
            adjList.get(key1).add(key2);
            adjList.get(key2).add(key1);
        }
        // Find connected components using BFS
        const visited = new Set();
        let nextGroupId = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const startKey = posKey({ row: y, col: x });
                if (visited.has(startKey))
                    continue;
                if (!adjList.has(startKey))
                    continue;
                const group = [];
                const queue = [{ row: y, col: x }];
                while (queue.length > 0) {
                    const pos = queue.shift();
                    const key = posKey(pos);
                    if (visited.has(key))
                        continue;
                    visited.add(key);
                    group.push(pos);
                    this.groupIds.set(pos.row, pos.col, nextGroupId);
                    const neighbors = adjList.get(key);
                    if (neighbors) {
                        for (const neighborKey of neighbors) {
                            if (!visited.has(neighborKey)) {
                                const [rowStr, colStr] = neighborKey.split(',');
                                queue.push({ row: parseInt(rowStr), col: parseInt(colStr) });
                            }
                        }
                    }
                }
                if (group.length > 0) {
                    this.groups.set(nextGroupId, group);
                    nextGroupId++;
                }
            }
        }
    }
    /** Latin square constraint */
    latinSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand.get(y, x);
                if (cands.length === 1) {
                    const val = cands[0];
                    // Eliminate from same row
                    for (let x2 = 0; x2 < this.width; x2++) {
                        if (x2 === x)
                            continue;
                        const otherCands = this.numbersCand.get(y, x2);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x2, filtered);
                    }
                    // Eliminate from same column
                    for (let y2 = 0; y2 < this.height; y2++) {
                        if (y2 === y)
                            continue;
                        const otherCands = this.numbersCand.get(y2, x);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y2, x, filtered);
                    }
                }
                // Hidden single in row
                if (cands.length > 1) {
                    for (const cand of cands) {
                        let isHiddenSingle = true;
                        for (let x2 = 0; x2 < this.width; x2++) {
                            if (x2 === x)
                                continue;
                            if (this.numbersCand.get(y, x2).includes(cand)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.numbersCand.set(y, x, [cand]);
                            break;
                        }
                    }
                }
                // Hidden single in column
                const updatedCands = this.numbersCand.get(y, x);
                if (updatedCands.length > 1) {
                    for (const cand of updatedCands) {
                        let isHiddenSingle = true;
                        for (let y2 = 0; y2 < this.height; y2++) {
                            if (y2 === y)
                                continue;
                            if (this.numbersCand.get(y2, x).includes(cand)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.numbersCand.set(y, x, [cand]);
                            break;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Renban group constraint: numbers must form consecutive sequence */
    renbanSolve() {
        for (const [, members] of this.groups) {
            const groupSize = members.length;
            // Collect all candidates in the group
            const allCands = new Set();
            for (const pos of members) {
                for (const cand of this.numbersCand.get(pos.row, pos.col)) {
                    allCands.add(cand);
                }
            }
            // Find valid consecutive ranges of length groupSize
            const validRanges = [];
            const candArray = Array.from(allCands).sort((a, b) => a - b);
            for (let i = 0; i <= candArray.length - groupSize; i++) {
                const min = candArray[i];
                const max = min + groupSize - 1;
                // Check if all numbers in range are available
                let valid = true;
                for (let n = min; n <= max; n++) {
                    if (!allCands.has(n)) {
                        valid = false;
                        break;
                    }
                }
                if (valid) {
                    validRanges.push({ min, max });
                }
            }
            if (validRanges.length === 0)
                return false;
            // Find union of all valid numbers
            const validNumbers = new Set();
            for (const range of validRanges) {
                for (let n = range.min; n <= range.max; n++) {
                    validNumbers.add(n);
                }
            }
            // Eliminate candidates not in valid numbers
            for (const pos of members) {
                const cands = this.numbersCand.get(pos.row, pos.col);
                const filtered = cands.filter((c) => validNumbers.has(c));
                if (filtered.length === 0)
                    return false;
                this.numbersCand.set(pos.row, pos.col, filtered);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new RenbanField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.numbersCand.set(y, x, [...this.numbersCand.get(y, x)]);
                cloned.groupIds.set(y, x, this.groupIds.get(y, x));
            }
        }
        cloned.groups = new Map();
        for (const [groupId, members] of this.groups) {
            cloned.groups.set(groupId, [...members]);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.numbersCand.get(y, x).length + ':';
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbersCand.get(y, x).length !== 1)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.latinSolve())
                return false;
            if (!this.renbanSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand.get(y, x);
                if (cands.length === 0) {
                    line += 'X';
                }
                else if (cands.length === 1) {
                    line += String(cands[0]);
                }
                else {
                    line += '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branching info */
    getBranchInfo() {
        let minCount = Infinity;
        let bestPos = null;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const count = this.numbersCand.get(y, x).length;
                if (count > 1 && count < minCount) {
                    minCount = count;
                    bestPos = { row: y, col: x };
                }
            }
        }
        if (!bestPos)
            return null;
        return {
            row: bestPos.row,
            col: bestPos.col,
            candidates: this.numbersCand.get(bestPos.row, bestPos.col),
        };
    }
    /** Set cell to specific value */
    setCell(row, col, value) {
        this.numbersCand.set(row, col, [value]);
    }
}
// ============================================
// Renban Solver
// ============================================
export class RenbanSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new RenbanField(height, width);
        // Parse parameter - numbers and connections
        const parts = param.split('/');
        const numberPart = parts[0] || '';
        // connectionPart would be used for line/group connections if needed
        // const connectionPart = parts[1] || '';
        // Parse numbers
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < numberPart.length; i++) {
            const ch = numberPart[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    let num;
                    if (ch === '-') {
                        num = parseInt(numberPart[i + 1] + numberPart[i + 2], 16);
                        i += 2;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    if (!isNaN(num) && num >= 1) {
                        field.setClue(row, col, num);
                    }
                }
                index++;
            }
        }
        // Parse connections
        const connections = [];
        // Connection format parsing depends on pzprv3 encoding
        field.setGroups(connections);
        return new RenbanSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { row, col, candidates } = branchInfo;
        return candidates.map((cand) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setCell(row, col, cand);
                return cloned;
            },
            description: `Set (${row}, ${col}) to ${cand}`,
        }));
    }
}
//# sourceMappingURL=renban.js.map