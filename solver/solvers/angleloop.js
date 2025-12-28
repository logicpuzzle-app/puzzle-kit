/**
 * Angleloop Solver
 *
 * Rules:
 * 1. Connect all marked points with straight lines to form a single closed loop
 * 2. Each marked point has exactly 2 lines connecting to other points
 * 3. Lines cannot cross each other
 * 4. The angle at each marked point must match the symbol:
 *    - ▲ (ACUTE): angle < 90 degrees
 *    - □ (RIGHT): angle = 90 degrees
 *    - ☆ (OBTUSE): angle > 90 degrees (but < 180)
 */
import { posKey } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Angleloop Types
// ============================================
/** Angle type at a vertex */
export var AngleType;
(function (AngleType) {
    /** Acute angle (< 90 degrees) */
    AngleType["ACUTE"] = "acute";
    /** Right angle (= 90 degrees) */
    AngleType["RIGHT"] = "right";
    /** Obtuse angle (> 90 degrees, < 180 degrees) */
    AngleType["OBTUSE"] = "obtuse";
})(AngleType || (AngleType = {}));
/** Connection state between two points */
export var ConnectionState;
(function (ConnectionState) {
    ConnectionState["UNKNOWN"] = "unknown";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["NOT_CONNECTED"] = "not_connected";
})(ConnectionState || (ConnectionState = {}));
// ============================================
// Angleloop Field State
// ============================================
export class AngleloopField {
    height;
    width;
    /** Angle types at grid vertices (height+1 x width+1) */
    angles;
    /** Connection candidates - maps from position key to target position key to state */
    candidates;
    /** List of all marked positions */
    markedPositions;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.angles = Array.from({ length: height + 1 }, () => Array.from({ length: width + 1 }, () => null));
        this.candidates = new Map();
        this.markedPositions = [];
    }
    /** Set an angle marker at a vertex position */
    setAngle(row, col, angle) {
        this.angles[row][col] = angle;
        this.markedPositions.push({ row, col });
    }
    /** Initialize connection candidates after all angles are set */
    initializeCandidates() {
        this.candidates.clear();
        // For each marked position, create candidates to all other marked positions
        for (const pos1 of this.markedPositions) {
            const key1 = posKey(pos1);
            const candidateMap = new Map();
            for (const pos2 of this.markedPositions) {
                if (pos1.row === pos2.row && pos1.col === pos2.col)
                    continue;
                const key2 = posKey(pos2);
                candidateMap.set(key2, ConnectionState.UNKNOWN);
            }
            this.candidates.set(key1, candidateMap);
        }
        // Optimization: For each direction from each point, only keep the nearest point
        this.pruneDistantCandidates();
    }
    /** Remove candidates that aren't the nearest in their direction */
    pruneDistantCandidates() {
        for (const pos1 of this.markedPositions) {
            const key1 = posKey(pos1);
            const candidateMap = this.candidates.get(key1);
            // Group by direction and keep only nearest
            const directionDistanceMap = new Map();
            for (const pos2 of this.markedPositions) {
                if (pos1.row === pos2.row && pos1.col === pos2.col)
                    continue;
                const direction = this.getDirection(pos1, pos2);
                const distance = this.getDistance(pos1, pos2);
                const existing = directionDistanceMap.get(direction);
                if (!existing || distance < existing.distance) {
                    directionDistanceMap.set(direction, { pos: pos2, distance });
                }
            }
            // Mark non-nearest as NOT_CONNECTED
            for (const pos2 of this.markedPositions) {
                if (pos1.row === pos2.row && pos1.col === pos2.col)
                    continue;
                const key2 = posKey(pos2);
                const direction = this.getDirection(pos1, pos2);
                const nearest = directionDistanceMap.get(direction);
                if (nearest && (nearest.pos.row !== pos2.row || nearest.pos.col !== pos2.col)) {
                    candidateMap.set(key2, ConnectionState.NOT_CONNECTED);
                }
            }
        }
    }
    /** Get direction in degrees from pos1 to pos2 */
    getDirection(pos1, pos2) {
        const angle = Math.atan2(pos1.col - pos2.col, pos1.row - pos2.row);
        return Math.round((angle * 180) / Math.PI);
    }
    /** Get distance between two positions */
    getDistance(pos1, pos2) {
        const dx = pos2.col - pos1.col;
        const dy = pos2.row - pos1.row;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * 1000) / 1000;
    }
    /** Get angle between three points in degrees */
    getAngle(pos1, pos2, pivot) {
        const angle1 = Math.atan2(pos1.col - pivot.col, pos1.row - pivot.row);
        const angle2 = Math.atan2(pos2.col - pivot.col, pos2.row - pivot.row);
        return Math.round(((angle1 - angle2) * 180) / Math.PI);
    }
    /** Check if two line segments cross */
    linesCross(from1, to1, from2, to2) {
        // Check if line segments intersect (excluding endpoints)
        const ccw = (A, B, C) => {
            return (C.row - A.row) * (B.col - A.col) - (B.row - A.row) * (C.col - A.col);
        };
        const d1 = ccw(from1, to1, from2);
        const d2 = ccw(from1, to1, to2);
        const d3 = ccw(from2, to2, from1);
        const d4 = ccw(from2, to2, to1);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        return false;
    }
    /** Get connection state between two positions */
    getConnection(pos1, pos2) {
        const key1 = posKey(pos1);
        const key2 = posKey(pos2);
        return this.candidates.get(key1)?.get(key2) ?? ConnectionState.NOT_CONNECTED;
    }
    /** Set connection state */
    setConnection(pos1, pos2, state) {
        const key1 = posKey(pos1);
        const key2 = posKey(pos2);
        this.candidates.get(key1)?.set(key2, state);
        this.candidates.get(key2)?.set(key1, state);
    }
    // ========== Constraint solving ==========
    /** Mirror solve: if A->B is set, B->A must match */
    mirrorSolve() {
        for (const pos1 of this.markedPositions) {
            const key1 = posKey(pos1);
            const candidateMap = this.candidates.get(key1);
            for (const pos2 of this.markedPositions) {
                if (pos1.row === pos2.row && pos1.col === pos2.col)
                    continue;
                const key2 = posKey(pos2);
                const state = candidateMap.get(key2);
                if (state === undefined || state === ConnectionState.UNKNOWN)
                    continue;
                const targetMap = this.candidates.get(key2);
                const targetState = targetMap.get(key1);
                if (targetState === undefined || targetState === ConnectionState.UNKNOWN) {
                    targetMap.set(key1, state);
                }
                else if (targetState !== state) {
                    return false;
                }
            }
        }
        return true;
    }
    /** Count solve: each point must have exactly 2 connections */
    countSolve() {
        for (const pos of this.markedPositions) {
            const key = posKey(pos);
            const candidateMap = this.candidates.get(key);
            let connectedCount = 0;
            let unknownCount = 0;
            for (const state of candidateMap.values()) {
                if (state === ConnectionState.CONNECTED)
                    connectedCount++;
                else if (state === ConnectionState.UNKNOWN)
                    unknownCount++;
            }
            if (connectedCount + unknownCount < 2)
                return false;
            if (connectedCount > 2)
                return false;
            const needMore = 2 - connectedCount;
            if (needMore === 0) {
                // Already have 2, close the rest
                for (const [targetKey, state] of candidateMap.entries()) {
                    if (state === ConnectionState.UNKNOWN) {
                        candidateMap.set(targetKey, ConnectionState.NOT_CONNECTED);
                    }
                }
            }
            else if (unknownCount === needMore) {
                // Must connect all unknowns
                for (const [targetKey, state] of candidateMap.entries()) {
                    if (state === ConnectionState.UNKNOWN) {
                        candidateMap.set(targetKey, ConnectionState.CONNECTED);
                    }
                }
            }
        }
        return true;
    }
    /** Angle solve: check angle constraints and line crossings */
    angleSolve() {
        for (const pivot of this.markedPositions) {
            const pivotKey = posKey(pivot);
            const candidateMap = this.candidates.get(pivotKey);
            const angleType = this.angles[pivot.row][pivot.col];
            // Get all connected positions
            const connectedPositions = [];
            for (const pos of this.markedPositions) {
                if (pos.row === pivot.row && pos.col === pivot.col)
                    continue;
                const key = posKey(pos);
                if (candidateMap.get(key) === ConnectionState.CONNECTED) {
                    connectedPositions.push(pos);
                }
            }
            // Check angle constraint if we have exactly 2 connections
            if (connectedPositions.length === 2) {
                const [pos1, pos2] = connectedPositions;
                const angle = Math.abs(this.getAngle(pos1, pos2, pivot));
                // Normalize angle to [0, 180]
                const normalizedAngle = angle > 180 ? 360 - angle : angle;
                if (angleType === AngleType.RIGHT && normalizedAngle !== 90)
                    return false;
                if (angleType === AngleType.ACUTE && normalizedAngle >= 90)
                    return false;
                if (angleType === AngleType.OBTUSE && (normalizedAngle <= 90 || normalizedAngle >= 180))
                    return false;
            }
            // For each connected line, check angle constraints against unknowns
            for (const connected of connectedPositions) {
                for (const pos of this.markedPositions) {
                    if (pos.row === pivot.row && pos.col === pivot.col)
                        continue;
                    if (pos.row === connected.row && pos.col === connected.col)
                        continue;
                    const key = posKey(pos);
                    const state = candidateMap.get(key);
                    if (state === ConnectionState.NOT_CONNECTED)
                        continue;
                    const angle = this.getAngle(connected, pos, pivot);
                    const absAngle = Math.abs(angle);
                    const normalizedAngle = absAngle > 180 ? 360 - absAngle : absAngle;
                    // Check if angle would be invalid
                    let invalid = false;
                    if (normalizedAngle === 180 || normalizedAngle === 0) {
                        // 180 degrees is always invalid
                        invalid = true;
                    }
                    else if (angleType === AngleType.RIGHT && normalizedAngle !== 90) {
                        invalid = true;
                    }
                    else if (angleType === AngleType.ACUTE && normalizedAngle >= 90) {
                        invalid = true;
                    }
                    else if (angleType === AngleType.OBTUSE && (normalizedAngle <= 90 || normalizedAngle >= 180)) {
                        invalid = true;
                    }
                    if (invalid) {
                        if (state === ConnectionState.CONNECTED)
                            return false;
                        candidateMap.set(key, ConnectionState.NOT_CONNECTED);
                    }
                }
            }
            // Check line crossings for connected lines
            for (const connected of connectedPositions) {
                for (const otherPivot of this.markedPositions) {
                    if (otherPivot.row === pivot.row && otherPivot.col === pivot.col)
                        continue;
                    if (otherPivot.row === connected.row && otherPivot.col === connected.col)
                        continue;
                    const otherKey = posKey(otherPivot);
                    const otherCandidateMap = this.candidates.get(otherKey);
                    for (const otherTarget of this.markedPositions) {
                        if (otherTarget.row === pivot.row && otherTarget.col === pivot.col)
                            continue;
                        if (otherTarget.row === connected.row && otherTarget.col === connected.col)
                            continue;
                        if (otherTarget.row === otherPivot.row && otherTarget.col === otherPivot.col)
                            continue;
                        const otherTargetKey = posKey(otherTarget);
                        const otherState = otherCandidateMap.get(otherTargetKey);
                        if (otherState === ConnectionState.NOT_CONNECTED)
                            continue;
                        if (this.linesCross(pivot, connected, otherPivot, otherTarget)) {
                            if (otherState === ConnectionState.CONNECTED)
                                return false;
                            otherCandidateMap.set(otherTargetKey, ConnectionState.NOT_CONNECTED);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Connectivity solve: all points must be reachable */
    connectSolve() {
        if (this.markedPositions.length === 0)
            return true;
        const visited = new Set();
        const start = this.markedPositions[0];
        visited.add(posKey(start));
        this.collectReachable(start, visited);
        for (const pos of this.markedPositions) {
            if (!visited.has(posKey(pos)))
                return false;
        }
        return true;
    }
    collectReachable(pos, visited) {
        const key = posKey(pos);
        const candidateMap = this.candidates.get(key);
        for (const [targetKey, state] of candidateMap.entries()) {
            if (state !== ConnectionState.NOT_CONNECTED && !visited.has(targetKey)) {
                visited.add(targetKey);
                const [row, col] = targetKey.split(',').map(Number);
                this.collectReachable({ row, col }, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new AngleloopField(this.height, this.width);
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                cloned.angles[row][col] = this.angles[row][col];
            }
        }
        cloned.markedPositions = [...this.markedPositions];
        cloned.candidates = new Map();
        for (const [key, map] of this.candidates.entries()) {
            cloned.candidates.set(key, new Map(map));
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (const pos of this.markedPositions) {
            const key = posKey(pos);
            dump += key + ':';
            const candidateMap = this.candidates.get(key);
            for (const [targetKey, state] of candidateMap.entries()) {
                dump += targetKey + '=' + state + ',';
            }
        }
        return dump;
    }
    isSolved() {
        for (const pos of this.markedPositions) {
            const key = posKey(pos);
            const candidateMap = this.candidates.get(key);
            for (const state of candidateMap.values()) {
                if (state === ConnectionState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.mirrorSolve())
                return false;
            if (!this.angleSolve())
                return false;
            if (!this.countSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        lines.push(`Angleloop ${this.width}x${this.height}`);
        for (const pos of this.markedPositions) {
            const angle = this.angles[pos.row][pos.col];
            const symbol = angle === AngleType.ACUTE ? '▲' : angle === AngleType.RIGHT ? '□' : '☆';
            const key = posKey(pos);
            const candidateMap = this.candidates.get(key);
            let connections = '';
            for (const [targetKey, state] of candidateMap.entries()) {
                if (state === ConnectionState.CONNECTED) {
                    connections += ` -> ${targetKey}`;
                }
            }
            lines.push(`${symbol} at (${pos.row},${pos.col})${connections}`);
        }
        return lines.join('\n');
    }
    /** Get unknown connections for branching */
    getUnknownConnections() {
        const unknowns = [];
        for (const pos1 of this.markedPositions) {
            const key1 = posKey(pos1);
            const candidateMap = this.candidates.get(key1);
            for (const pos2 of this.markedPositions) {
                if (pos1.row > pos2.row || (pos1.row === pos2.row && pos1.col >= pos2.col))
                    continue;
                const key2 = posKey(pos2);
                if (candidateMap.get(key2) === ConnectionState.UNKNOWN) {
                    unknowns.push({ from: pos1, to: pos2 });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Angleloop Solver
// ============================================
export class AngleloopSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver with angle markers */
    static create(height, width, config) {
        const field = new AngleloopField(height, width);
        for (const a of config.angles) {
            field.setAngle(a.row, a.col, a.type);
        }
        field.initializeCandidates();
        return new AngleloopSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownConnections();
        if (unknowns.length === 0)
            return [];
        const conn = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setConnection(conn.from, conn.to, ConnectionState.CONNECTED);
                    return cloned;
                },
                description: `Connect (${conn.from.row},${conn.from.col}) to (${conn.to.row},${conn.to.col})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setConnection(conn.from, conn.to, ConnectionState.NOT_CONNECTED);
                    return cloned;
                },
                description: `Don't connect (${conn.from.row},${conn.from.col}) to (${conn.to.row},${conn.to.col})`,
            },
        ];
    }
}
//# sourceMappingURL=angleloop.js.map