/**
 * Oneroom (Single Room) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular rooms
 * 2. Each room contains exactly one clue
 * 3. Numbers indicate the area of the room
 * 4. All rooms must be rectangular
 */
import { rect, rectContains, rectPositions } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
export class OneroomField {
    height;
    width;
    rooms;
    clueToRoom;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.rooms = [];
        this.clueToRoom = new Map();
    }
    addClue(row, col, area) {
        const pivot = { row, col };
        const candidates = this.generateCandidates(pivot, area);
        const roomIndex = this.rooms.length;
        this.rooms.push({ area, pivot, candidates });
        this.clueToRoom.set(`${row},${col}`, roomIndex);
    }
    generateCandidates(pivot, area) {
        const candidates = [];
        for (let h = 1; h <= area; h++) {
            if (area % h !== 0)
                continue;
            const w = area / h;
            for (let top = Math.max(0, pivot.row - h + 1); top <= Math.min(pivot.row, this.height - h); top++) {
                for (let left = Math.max(0, pivot.col - w + 1); left <= Math.min(pivot.col, this.width - w); left++) {
                    const bottom = top + h - 1;
                    const right = left + w - 1;
                    if (bottom < this.height && right < this.width) {
                        const r = rect(top, left, bottom, right);
                        if (rectContains(r, pivot)) {
                            candidates.push(r);
                        }
                    }
                }
            }
        }
        return candidates;
    }
    rectanglesOverlap(r1, r2) {
        return !(r1.right < r2.left || r2.right < r1.left ||
            r1.bottom < r2.top || r2.bottom < r1.top);
    }
    containsOtherPivot(roomIndex, rect) {
        for (let i = 0; i < this.rooms.length; i++) {
            if (i === roomIndex)
                continue;
            if (rectContains(rect, this.rooms[i].pivot)) {
                return true;
            }
        }
        return false;
    }
    filterConflictingCandidates() {
        let changed = false;
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            const validCandidates = [];
            for (const candidate of room.candidates) {
                if (this.containsOtherPivot(i, candidate)) {
                    changed = true;
                    continue;
                }
                let valid = true;
                for (let j = 0; j < this.rooms.length && valid; j++) {
                    if (i === j)
                        continue;
                    const otherRoom = this.rooms[j];
                    let hasNonConflicting = false;
                    for (const otherCand of otherRoom.candidates) {
                        if (!this.rectanglesOverlap(candidate, otherCand)) {
                            hasNonConflicting = true;
                            break;
                        }
                    }
                    if (!hasNonConflicting) {
                        valid = false;
                    }
                }
                if (valid) {
                    validCandidates.push(candidate);
                }
                else {
                    changed = true;
                }
            }
            room.candidates = validCandidates;
        }
        return changed;
    }
    clone() {
        const cloned = new OneroomField(this.height, this.width);
        cloned.rooms = this.rooms.map(room => ({
            area: room.area,
            pivot: { ...room.pivot },
            candidates: [...room.candidates],
        }));
        cloned.clueToRoom = new Map(this.clueToRoom);
        return cloned;
    }
    getStateDump() {
        return this.rooms.map(r => r.candidates.length).join(':');
    }
    isSolved() {
        for (const room of this.rooms) {
            if (room.candidates.length !== 1)
                return false;
        }
        for (let i = 0; i < this.rooms.length; i++) {
            for (let j = i + 1; j < this.rooms.length; j++) {
                if (this.rectanglesOverlap(this.rooms[i].candidates[0], this.rooms[j].candidates[0])) {
                    return false;
                }
            }
        }
        const covered = new Grid(this.height, this.width, () => false);
        for (const room of this.rooms) {
            for (const pos of rectPositions(room.candidates[0])) {
                covered.set(pos, true);
            }
        }
        for (const [, val] of covered.entries()) {
            if (!val)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        for (const room of this.rooms) {
            if (room.candidates.length === 0)
                return false;
        }
        let changed = true;
        while (changed) {
            changed = false;
            if (this.filterConflictingCandidates())
                changed = true;
            for (const room of this.rooms) {
                if (room.candidates.length === 0)
                    return false;
            }
        }
        return true;
    }
    toString() {
        const grid = new Grid(this.height, this.width, () => '.');
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            const label = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
            if (room.candidates.length === 1) {
                for (const pos of rectPositions(room.candidates[0])) {
                    grid.set(pos, label);
                }
            }
            grid.set(room.pivot, room.area < 10 ? String(room.area) : '+');
        }
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                line += grid.get(row, col);
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    getMostConstrainedRoom() {
        let minCandidates = Infinity;
        let bestRoom = -1;
        for (let i = 0; i < this.rooms.length; i++) {
            const count = this.rooms[i].candidates.length;
            if (count > 1 && count < minCandidates) {
                minCandidates = count;
                bestRoom = i;
            }
        }
        return bestRoom;
    }
    getRoomCandidates(roomIndex) {
        return this.rooms[roomIndex].candidates;
    }
    setRoomRectangle(roomIndex, rect) {
        this.rooms[roomIndex].candidates = [rect];
    }
}
// ============================================
// Oneroom Solver
// ============================================
export class OneroomSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new OneroomField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                let num;
                if (ch === '-') {
                    num = parseInt(param[i + 1] + param[i + 2], 16);
                    i += 2;
                }
                else {
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num) && num > 0 && row < height && col < width) {
                    field.addClue(row, col, num);
                }
                index++;
            }
        }
        return new OneroomSolver(field);
    }
    getBranchCandidates(state) {
        const roomIndex = state.getMostConstrainedRoom();
        if (roomIndex === -1)
            return [];
        const candidates = state.getRoomCandidates(roomIndex);
        return candidates.map((rect) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setRoomRectangle(roomIndex, rect);
                return cloned;
            },
            description: `Set room ${roomIndex} to rect (${rect.top},${rect.left})-(${rect.bottom},${rect.right})`,
        }));
    }
}
//# sourceMappingURL=oneroom.js.map