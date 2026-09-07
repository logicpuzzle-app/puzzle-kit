/**
 * Shikaku (Rectangles) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangles
 * 2. Each rectangle contains exactly one number
 * 3. The number indicates the area of that rectangle
 */
import { rect, rectContains, rectPositions, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Shikaku Field State
// ============================================
export class ShikakuField {
    height;
    width;
    /** Rooms with their candidates */
    rooms;
    /** Map from clue position to room index */
    clueToRoom;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.rooms = [];
        this.clueToRoom = new Map();
    }
    /** Add a clue */
    addClue(row, col, area) {
        const pivot = { row, col };
        const candidates = this.generateCandidates(pivot, area);
        const roomIndex = this.rooms.length;
        this.rooms.push({ area, pivot, candidates });
        this.clueToRoom.set(`${row},${col}`, roomIndex);
    }
    /** Generate all possible rectangles containing the pivot with given area */
    generateCandidates(pivot, area) {
        const candidates = [];
        // Find all factor pairs
        for (let h = 1; h <= area; h++) {
            if (area % h !== 0)
                continue;
            const w = area / h;
            // The rectangle must contain the pivot
            // Try all possible top-left positions
            for (let top = Math.max(0, pivot.row - h + 1); top <= Math.min(pivot.row, this.height - h); top++) {
                for (let left = Math.max(0, pivot.col - w + 1); left <= Math.min(pivot.col, this.width - w); left++) {
                    const bottom = top + h - 1;
                    const right = left + w - 1;
                    if (bottom < this.height && right < this.width) {
                        const r = rect(top, left, bottom, right);
                        // Verify pivot is inside
                        if (rectContains(r, pivot)) {
                            candidates.push(r);
                        }
                    }
                }
            }
        }
        return candidates;
    }
    /** Check if two rectangles overlap */
    rectanglesOverlap(r1, r2) {
        return !(r1.right < r2.left || r2.right < r1.left ||
            r1.bottom < r2.top || r2.bottom < r1.top);
    }
    /** Check if rectangle contains another room's pivot */
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
    /** Filter candidates that would conflict with other rooms */
    filterConflictingCandidates() {
        let changed = false;
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            const validCandidates = [];
            for (const candidate of room.candidates) {
                // Check if this candidate contains another pivot
                if (this.containsOtherPivot(i, candidate)) {
                    changed = true;
                    continue;
                }
                // Check if there's at least one non-conflicting option for every other room
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
    /**
     * Cell coverage constraint - if a cell can only be covered by one room,
     * filter that room's candidates to only those that cover the cell
     */
    solveCellCoverage() {
        let changed = false;
        // For each cell, find which rooms can cover it
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const coveringRooms = [];
                for (let i = 0; i < this.rooms.length; i++) {
                    const room = this.rooms[i];
                    const coveringCandidates = [];
                    for (const candidate of room.candidates) {
                        if (rectContains(candidate, { row, col })) {
                            coveringCandidates.push(candidate);
                        }
                    }
                    if (coveringCandidates.length > 0) {
                        coveringRooms.push({ roomIndex: i, candidates: coveringCandidates });
                    }
                }
                // If only one room can cover this cell, filter that room's candidates
                if (coveringRooms.length === 1) {
                    const { roomIndex, candidates } = coveringRooms[0];
                    const room = this.rooms[roomIndex];
                    if (candidates.length < room.candidates.length) {
                        room.candidates = candidates;
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    /**
     * If a room has only one candidate, remove overlapping cells from other rooms' candidates
     */
    propagateFixedRooms() {
        let changed = false;
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            if (room.candidates.length !== 1)
                continue;
            const fixedRect = room.candidates[0];
            // Remove candidates from other rooms that overlap with this fixed rectangle
            for (let j = 0; j < this.rooms.length; j++) {
                if (i === j)
                    continue;
                const otherRoom = this.rooms[j];
                const nonOverlapping = otherRoom.candidates.filter(cand => !this.rectanglesOverlap(fixedRect, cand));
                if (nonOverlapping.length < otherRoom.candidates.length) {
                    otherRoom.candidates = nonOverlapping;
                    changed = true;
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new ShikakuField(this.height, this.width);
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
        // Each room must have exactly one candidate
        for (const room of this.rooms) {
            if (room.candidates.length !== 1)
                return false;
        }
        // Check no overlaps
        for (let i = 0; i < this.rooms.length; i++) {
            for (let j = i + 1; j < this.rooms.length; j++) {
                if (this.rectanglesOverlap(this.rooms[i].candidates[0], this.rooms[j].candidates[0])) {
                    return false;
                }
            }
        }
        // Check all cells are covered
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
        // Check for rooms with no candidates
        for (const room of this.rooms) {
            if (room.candidates.length === 0)
                return false;
        }
        let changed = true;
        while (changed) {
            changed = false;
            // Propagate fixed rooms first
            if (this.propagateFixedRooms())
                changed = true;
            // Filter conflicting candidates
            if (this.filterConflictingCandidates())
                changed = true;
            // Cell coverage constraint
            if (this.solveCellCoverage())
                changed = true;
            for (const room of this.rooms) {
                if (room.candidates.length === 0)
                    return false;
            }
        }
        return true;
    }
    toString() {
        // Create a grid showing room assignments
        const grid = new Grid(this.height, this.width, () => '.');
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            const label = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
            if (room.candidates.length === 1) {
                for (const pos of rectPositions(room.candidates[0])) {
                    grid.set(pos, label);
                }
            }
            // Mark pivot with number
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
    /** Get rooms with most constrained (fewest candidates > 1) */
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
    /** Get candidates for a room */
    getRoomCandidates(roomIndex) {
        return this.rooms[roomIndex].candidates;
    }
    /** Set room to a specific rectangle */
    setRoomRectangle(roomIndex, rect) {
        this.rooms[roomIndex].candidates = [rect];
    }
}
// ============================================
// Shikaku Solver
// ============================================
export class ShikakuSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new ShikakuField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch && ch >= '1' && ch <= '9') {
                    field.addClue(row, col, parseInt(ch));
                }
                else if (ch && ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'z') {
                    // Letters for 10+ (a=10, b=11, etc.)
                    field.addClue(row, col, ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                }
            }
        }
        return new ShikakuSolver(field);
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
//# sourceMappingURL=shikaku.js.map