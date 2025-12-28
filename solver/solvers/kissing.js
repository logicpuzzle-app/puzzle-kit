/**
 * Kissing Solver
 *
 * Rules:
 * 1. Place ships of given shapes on the grid
 * 2. Ships must touch walls (be adjacent to at least one wall)
 * 3. Ships cannot cross walls
 * 4. Ships of different types can touch without walls between them
 * 5. When multiple identical ships exist, they are placed in order from top-left
 * 6. Continuous cells along walls must all belong to the same ship
 */
import { posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Kissing Types
// ============================================
var Direction;
(function (Direction) {
    Direction[Direction["UP"] = 0] = "UP";
    Direction[Direction["RIGHT"] = 1] = "RIGHT";
    Direction[Direction["DOWN"] = 2] = "DOWN";
    Direction[Direction["LEFT"] = 3] = "LEFT";
})(Direction || (Direction = {}));
/**
 * A fixed ship shape with its positions
 */
class FixedShape {
    positions;
    constructor(positions) {
        this.positions = new Set(positions.map(posKey));
    }
    /** Get all rotations and reflections of this shape */
    getSamePosSetList() {
        const result = [];
        const originalPositions = Array.from(this.positions).map(k => {
            const [row, col] = k.split(',').map(Number);
            return { row, col };
        });
        if (originalPositions.length === 0)
            return [[]];
        // Generate all 8 transformations (4 rotations × 2 reflections)
        const transformations = this.generateTransformations(originalPositions);
        // Normalize each transformation to top-left (0,0)
        for (const transformed of transformations) {
            const normalized = this.normalizeToOrigin(transformed);
            const key = this.shapeKey(normalized);
            // Check if this shape is already in results
            if (!result.some(existing => this.shapeKey(existing) === key)) {
                result.push(normalized);
            }
        }
        return result;
    }
    generateTransformations(positions) {
        const result = [];
        // Original
        result.push([...positions]);
        // Rotate 90°
        result.push(positions.map(p => ({ row: p.col, col: -p.row })));
        // Rotate 180°
        result.push(positions.map(p => ({ row: -p.row, col: -p.col })));
        // Rotate 270°
        result.push(positions.map(p => ({ row: -p.col, col: p.row })));
        // Flip horizontally
        result.push(positions.map(p => ({ row: p.row, col: -p.col })));
        // Flip horizontally + rotate 90°
        result.push(positions.map(p => ({ row: p.col, col: p.row })));
        // Flip horizontally + rotate 180°
        result.push(positions.map(p => ({ row: -p.row, col: p.col })));
        // Flip horizontally + rotate 270°
        result.push(positions.map(p => ({ row: -p.col, col: -p.row })));
        return result;
    }
    normalizeToOrigin(positions) {
        if (positions.length === 0)
            return [];
        const minRow = Math.min(...positions.map(p => p.row));
        const minCol = Math.min(...positions.map(p => p.col));
        return positions.map(p => ({
            row: p.row - minRow,
            col: p.col - minCol,
        }));
    }
    shapeKey(positions) {
        return positions
            .map(p => `${p.row},${p.col}`)
            .sort()
            .join(';');
    }
    isSame(other) {
        return this.shapeKey(Array.from(this.positions).map(k => {
            const [row, col] = k.split(',').map(Number);
            return { row, col };
        })) === this.shapeKey(Array.from(other.positions).map(k => {
            const [row, col] = k.split(',').map(Number);
            return { row, col };
        }));
    }
}
/**
 * A ship placement option (one way to place a ship)
 */
class ShipPosObj {
    shapeBase;
    posSet;
    positions;
    constructor(shapeBase, positions) {
        this.shapeBase = shapeBase;
        this.positions = [...positions].sort((a, b) => a.row * 1000 + a.col - (b.row * 1000 + b.col));
        this.posSet = new Set(this.positions.map(posKey));
    }
    getPosSet() {
        return this.posSet;
    }
    getPositions() {
        return this.positions;
    }
    isSame(other) {
        return this.shapeBase.isSame(other.shapeBase);
    }
}
/**
 * Ship placement candidates for one ship
 */
class ShipCand {
    no;
    shipPosObjList;
    constructor(no, shipPosObjList) {
        this.no = no;
        this.shipPosObjList = [...shipPosObjList];
    }
    copy() {
        return new ShipCand(this.no, [...this.shipPosObjList]);
    }
    getShipPosObjList() {
        return this.shipPosObjList;
    }
    setShipPosObjList(list) {
        this.shipPosObjList = list;
    }
    isFixed() {
        return this.shipPosObjList.length === 1;
    }
    getCandPosSet() {
        const result = new Set();
        for (const shipPosObj of this.shipPosObjList) {
            for (const pos of shipPosObj.getPosSet()) {
                result.add(pos);
            }
        }
        return result;
    }
}
// ============================================
// Kissing Field State
// ============================================
export class KissingField {
    height;
    width;
    /** Horizontal walls (between columns) */
    yokoWall;
    /** Vertical walls (between rows) */
    tateWall;
    /** Banned cells where ships cannot be placed */
    banned;
    /** Ship placement candidates */
    shipCandList;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.yokoWall = Array(height).fill(0).map(() => Array(width - 1).fill(false));
        this.tateWall = Array(height - 1).fill(0).map(() => Array(width).fill(false));
        this.banned = Array(height).fill(0).map(() => Array(width).fill(false));
        this.shipCandList = [];
    }
    setYokoWall(row, col, value) {
        this.yokoWall[row][col] = value;
    }
    setTateWall(row, col, value) {
        this.tateWall[row][col] = value;
    }
    setBanned(row, col, value) {
        this.banned[row][col] = value;
    }
    /** Initialize ship candidates from shape parameters */
    initCand(paramList) {
        this.shipCandList = this.makeShipCandBase(paramList);
    }
    makeShipCandBase(paramList) {
        const result = [];
        for (let idx = 0; idx < paramList.length; idx++) {
            const oneParam = paramList[idx];
            const basePosSet = [];
            const shipXLength = parseInt(oneParam[0]);
            const shipYLength = parseInt(oneParam[1]);
            const encoded = oneParam.substring(2);
            // Decode the ship shape from base-32 encoding
            let readPos = 0;
            let bit = 0;
            for (let cnt = 0; cnt < shipYLength * shipXLength; cnt++) {
                const mod = cnt % 5;
                if (mod === 0) {
                    if (readPos >= encoded.length)
                        break;
                    bit = parseInt(encoded[readPos], 32);
                    readPos++;
                }
                if (mod === 4 || cnt === shipYLength * shipXLength - 1) {
                    if (mod >= 0 && Math.floor(bit / 16) % 2 === 1) {
                        basePosSet.push({ row: Math.floor((cnt - mod + 0) / shipXLength), col: (cnt - mod + 0) % shipXLength });
                    }
                    if (mod >= 1 && Math.floor(bit / 8) % 2 === 1) {
                        basePosSet.push({ row: Math.floor((cnt - mod + 1) / shipXLength), col: (cnt - mod + 1) % shipXLength });
                    }
                    if (mod >= 2 && Math.floor(bit / 4) % 2 === 1) {
                        basePosSet.push({ row: Math.floor((cnt - mod + 2) / shipXLength), col: (cnt - mod + 2) % shipXLength });
                    }
                    if (mod >= 3 && Math.floor(bit / 2) % 2 === 1) {
                        basePosSet.push({ row: Math.floor((cnt - mod + 3) / shipXLength), col: (cnt - mod + 3) % shipXLength });
                    }
                    if (mod >= 4 && Math.floor(bit / 1) % 2 === 1) {
                        basePosSet.push({ row: Math.floor((cnt - mod + 4) / shipXLength), col: (cnt - mod + 4) % shipXLength });
                    }
                }
            }
            // Get all cells adjacent to walls
            const blackPosSet = new Set();
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    if (row !== 0 && this.tateWall[row - 1][col]) {
                        blackPosSet.add(posKey({ row, col }));
                    }
                    else if (col !== this.width - 1 && this.yokoWall[row][col]) {
                        blackPosSet.add(posKey({ row, col }));
                    }
                    else if (row !== this.height - 1 && this.tateWall[row][col]) {
                        blackPosSet.add(posKey({ row, col }));
                    }
                    else if (col !== 0 && this.yokoWall[row][col - 1]) {
                        blackPosSet.add(posKey({ row, col }));
                    }
                }
            }
            // Find continuous fence positions
            const fencesPosSet = new Set(blackPosSet);
            const continuePosSetList = [];
            while (fencesPosSet.size > 0) {
                const targetPos = Array.from(fencesPosSet)[0];
                const whitePosSet = new Set();
                whitePosSet.add(targetPos);
                const [row, col] = targetPos.split(',').map(Number);
                this.setContinuePosSet(fencesPosSet, { row, col }, whitePosSet, null);
                continuePosSetList.push(whitePosSet);
                for (const pos of whitePosSet) {
                    fencesPosSet.delete(pos);
                }
            }
            const ship = new FixedShape(basePosSet);
            const shipPosObjList = [];
            for (const posSetBase of ship.getSamePosSetList()) {
                let useShipYLength = 0;
                let useShipXLength = 0;
                for (const posBase of posSetBase) {
                    if (useShipYLength < posBase.row) {
                        useShipYLength = posBase.row;
                    }
                    if (useShipXLength < posBase.col) {
                        useShipXLength = posBase.col;
                    }
                }
                for (let row = 0; row < this.height - useShipYLength; row++) {
                    for (let col = 0; col < this.width - useShipXLength; col++) {
                        const posSet = [];
                        for (const posBase of posSetBase) {
                            posSet.push({ row: posBase.row + row, col: posBase.col + col });
                        }
                        // Check if candidate is valid
                        let isCand = true;
                        // Must not contain banned cells
                        for (const pos of posSet) {
                            if (this.banned[pos.row][pos.col]) {
                                isCand = false;
                                break;
                            }
                        }
                        if (!isCand)
                            continue;
                        // Must not cross walls
                        for (const pos of posSet) {
                            if (pos.col !== this.width - 1 && this.yokoWall[pos.row][pos.col]) {
                                if (posSet.some(p => p.row === pos.row && p.col === pos.col + 1)) {
                                    isCand = false;
                                    break;
                                }
                            }
                            if (pos.row !== this.height - 1 && this.tateWall[pos.row][pos.col]) {
                                if (posSet.some(p => p.row === pos.row + 1 && p.col === pos.col)) {
                                    isCand = false;
                                    break;
                                }
                            }
                        }
                        if (!isCand)
                            continue;
                        // Must not be adjacent to black positions without walls between
                        const posSetKeys = new Set(posSet.map(posKey));
                        const nextPosSet = new Set();
                        for (const pos of posSet) {
                            if (pos.row !== 0 && !this.tateWall[pos.row - 1][pos.col] && !posSetKeys.has(posKey({ row: pos.row - 1, col: pos.col }))) {
                                nextPosSet.add(posKey({ row: pos.row - 1, col: pos.col }));
                            }
                            if (pos.col !== this.width - 1 && !this.yokoWall[pos.row][pos.col] && !posSetKeys.has(posKey({ row: pos.row, col: pos.col + 1 }))) {
                                nextPosSet.add(posKey({ row: pos.row, col: pos.col + 1 }));
                            }
                            if (pos.row !== this.height - 1 && !this.tateWall[pos.row][pos.col] && !posSetKeys.has(posKey({ row: pos.row + 1, col: pos.col }))) {
                                nextPosSet.add(posKey({ row: pos.row + 1, col: pos.col }));
                            }
                            if (pos.col !== 0 && !this.yokoWall[pos.row][pos.col - 1] && !posSetKeys.has(posKey({ row: pos.row, col: pos.col - 1 }))) {
                                nextPosSet.add(posKey({ row: pos.row, col: pos.col - 1 }));
                            }
                        }
                        const checkNextPosSet = new Set(blackPosSet);
                        for (const pos of nextPosSet) {
                            checkNextPosSet.delete(pos);
                        }
                        if (checkNextPosSet.size !== blackPosSet.size) {
                            isCand = false;
                        }
                        if (!isCand)
                            continue;
                        // Check continuous fence positions: must contain all or none
                        for (const continuePosSet of continuePosSetList) {
                            const checkPosSet = new Set(continuePosSet);
                            for (const pos of posSet.map(posKey)) {
                                checkPosSet.delete(pos);
                            }
                            if (checkPosSet.size !== 0 && checkPosSet.size !== continuePosSet.size) {
                                isCand = false;
                                break;
                            }
                        }
                        if (isCand) {
                            shipPosObjList.push(new ShipPosObj(ship, posSet));
                        }
                    }
                }
            }
            result.push(new ShipCand(idx, shipPosObjList));
        }
        return result;
    }
    setContinuePosSet(fencesPosSet, pos, continuePosSet, from) {
        if (pos.row !== 0 && from !== Direction.UP) {
            const nextPos = { row: pos.row - 1, col: pos.col };
            const nextKey = posKey(nextPos);
            if (!this.tateWall[pos.row - 1][pos.col] && fencesPosSet.has(nextKey) && !continuePosSet.has(nextKey)) {
                continuePosSet.add(nextKey);
                this.setContinuePosSet(fencesPosSet, nextPos, continuePosSet, Direction.DOWN);
            }
        }
        if (pos.col !== this.width - 1 && from !== Direction.RIGHT) {
            const nextPos = { row: pos.row, col: pos.col + 1 };
            const nextKey = posKey(nextPos);
            if (!this.yokoWall[pos.row][pos.col] && fencesPosSet.has(nextKey) && !continuePosSet.has(nextKey)) {
                continuePosSet.add(nextKey);
                this.setContinuePosSet(fencesPosSet, nextPos, continuePosSet, Direction.LEFT);
            }
        }
        if (pos.row !== this.height - 1 && from !== Direction.DOWN) {
            const nextPos = { row: pos.row + 1, col: pos.col };
            const nextKey = posKey(nextPos);
            if (!this.tateWall[pos.row][pos.col] && fencesPosSet.has(nextKey) && !continuePosSet.has(nextKey)) {
                continuePosSet.add(nextKey);
                this.setContinuePosSet(fencesPosSet, nextPos, continuePosSet, Direction.UP);
            }
        }
        if (pos.col !== 0 && from !== Direction.LEFT) {
            const nextPos = { row: pos.row, col: pos.col - 1 };
            const nextKey = posKey(nextPos);
            if (!this.yokoWall[pos.row][pos.col - 1] && fencesPosSet.has(nextKey) && !continuePosSet.has(nextKey)) {
                continuePosSet.add(nextKey);
                this.setContinuePosSet(fencesPosSet, nextPos, continuePosSet, Direction.RIGHT);
            }
        }
    }
    sikakuSolve() {
        // Remove overlapping candidates
        for (const shipCand of this.shipCandList) {
            if (shipCand.getShipPosObjList().length === 0) {
                return false;
            }
            if (shipCand.isFixed()) {
                const candPosSet = shipCand.getCandPosSet();
                for (const otherShipCand of this.shipCandList) {
                    if (shipCand.no !== otherShipCand.no) {
                        const newList = otherShipCand.getShipPosObjList().filter(otherShipPosObj => {
                            for (const pos of otherShipPosObj.getPosSet()) {
                                if (candPosSet.has(pos)) {
                                    return false;
                                }
                            }
                            return true;
                        });
                        otherShipCand.setShipPosObjList(newList);
                    }
                }
            }
        }
        // Wall checks
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall[row][col]) {
                    // Both sides of wall must have a ship
                    const leftKey = posKey({ row, col });
                    const rightKey = posKey({ row, col: col + 1 });
                    const leftShips = this.shipCandList.filter(sc => sc.getCandPosSet().has(leftKey));
                    if (leftShips.length === 0)
                        return false;
                    if (leftShips.length === 1) {
                        const newList = leftShips[0].getShipPosObjList().filter(spo => spo.getPosSet().has(leftKey));
                        leftShips[0].setShipPosObjList(newList);
                    }
                    const rightShips = this.shipCandList.filter(sc => sc.getCandPosSet().has(rightKey));
                    if (rightShips.length === 0)
                        return false;
                    if (rightShips.length === 1) {
                        const newList = rightShips[0].getShipPosObjList().filter(spo => spo.getPosSet().has(rightKey));
                        rightShips[0].setShipPosObjList(newList);
                    }
                }
                else {
                    // No wall: check adjacency constraints
                    const leftKey = posKey({ row, col });
                    const rightKey = posKey({ row, col: col + 1 });
                    const leftFixed = this.shipCandList.find(sc => sc.isFixed() && sc.getCandPosSet().has(leftKey));
                    if (leftFixed) {
                        for (const shipCand of this.shipCandList) {
                            if (leftFixed !== shipCand) {
                                const newList = shipCand.getShipPosObjList().filter(spo => !spo.getPosSet().has(rightKey));
                                shipCand.setShipPosObjList(newList);
                                if (shipCand.getShipPosObjList().length === 0)
                                    return false;
                            }
                        }
                    }
                    const rightFixed = this.shipCandList.find(sc => sc.isFixed() && sc.getCandPosSet().has(rightKey));
                    if (rightFixed) {
                        for (const shipCand of this.shipCandList) {
                            if (rightFixed !== shipCand) {
                                const newList = shipCand.getShipPosObjList().filter(spo => !spo.getPosSet().has(leftKey));
                                shipCand.setShipPosObjList(newList);
                                if (shipCand.getShipPosObjList().length === 0)
                                    return false;
                            }
                        }
                    }
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall[row][col]) {
                    const topKey = posKey({ row, col });
                    const bottomKey = posKey({ row: row + 1, col });
                    const topShips = this.shipCandList.filter(sc => sc.getCandPosSet().has(topKey));
                    if (topShips.length === 0)
                        return false;
                    if (topShips.length === 1) {
                        const newList = topShips[0].getShipPosObjList().filter(spo => spo.getPosSet().has(topKey));
                        topShips[0].setShipPosObjList(newList);
                    }
                    const bottomShips = this.shipCandList.filter(sc => sc.getCandPosSet().has(bottomKey));
                    if (bottomShips.length === 0)
                        return false;
                    if (bottomShips.length === 1) {
                        const newList = bottomShips[0].getShipPosObjList().filter(spo => spo.getPosSet().has(bottomKey));
                        bottomShips[0].setShipPosObjList(newList);
                    }
                }
                else {
                    const topKey = posKey({ row, col });
                    const bottomKey = posKey({ row: row + 1, col });
                    const topFixed = this.shipCandList.find(sc => sc.isFixed() && sc.getCandPosSet().has(topKey));
                    if (topFixed) {
                        for (const shipCand of this.shipCandList) {
                            if (topFixed !== shipCand) {
                                const newList = shipCand.getShipPosObjList().filter(spo => !spo.getPosSet().has(bottomKey));
                                shipCand.setShipPosObjList(newList);
                                if (shipCand.getShipPosObjList().length === 0)
                                    return false;
                            }
                        }
                    }
                    const bottomFixed = this.shipCandList.find(sc => sc.isFixed() && sc.getCandPosSet().has(bottomKey));
                    if (bottomFixed) {
                        for (const shipCand of this.shipCandList) {
                            if (bottomFixed !== shipCand) {
                                const newList = shipCand.getShipPosObjList().filter(spo => !spo.getPosSet().has(topKey));
                                shipCand.setShipPosObjList(newList);
                                if (shipCand.getShipPosObjList().length === 0)
                                    return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    shipSolve() {
        // Same-shape ships must be placed in order from top-left
        for (const shipCand of this.shipCandList) {
            if (shipCand.isFixed()) {
                for (const otherShipCand of this.shipCandList) {
                    if (otherShipCand.getShipPosObjList().length === 0) {
                        return false;
                    }
                    if (shipCand.no !== otherShipCand.no && shipCand.getShipPosObjList()[0].isSame(otherShipCand.getShipPosObjList()[0])) {
                        const pos = shipCand.getShipPosObjList()[0].getPositions()[0];
                        const posValue = pos.row * 10000 + pos.col;
                        const newList = otherShipCand.getShipPosObjList().filter(shipPosObj => {
                            const otherPos = shipPosObj.getPositions()[0];
                            const otherPosValue = otherPos.row * 10000 + otherPos.col;
                            if (shipCand.no > otherShipCand.no && posValue <= otherPosValue) {
                                return false;
                            }
                            else if (shipCand.no < otherShipCand.no && posValue >= otherPosValue) {
                                return false;
                            }
                            return true;
                        });
                        otherShipCand.setShipPosObjList(newList);
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new KissingField(this.height, this.width);
        cloned.yokoWall = this.yokoWall.map(row => [...row]);
        cloned.tateWall = this.tateWall.map(row => [...row]);
        cloned.banned = this.banned.map(row => [...row]);
        cloned.shipCandList = this.shipCandList.map(sc => sc.copy());
        return cloned;
    }
    getStateDump() {
        return this.shipCandList.map(sc => sc.getShipPosObjList().length).join(':');
    }
    isSolved() {
        for (const shipCand of this.shipCandList) {
            if (!shipCand.isFixed()) {
                return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const str = this.getStateDump();
        if (!this.sikakuSolve()) {
            return false;
        }
        if (!this.shipSolve()) {
            return false;
        }
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const grid = new Grid(this.height, this.width, () => '.');
        // Mark banned cells
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.banned[row][col]) {
                    grid.set({ row, col }, 'X');
                }
            }
        }
        // Mark fixed ships
        for (let i = 0; i < this.shipCandList.length; i++) {
            const shipCand = this.shipCandList[i];
            if (shipCand.isFixed()) {
                const label = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
                for (const pos of shipCand.getShipPosObjList()[0].getPositions()) {
                    grid.set(pos, label);
                }
            }
        }
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                line += grid.get(row, col);
                if (col < this.width - 1) {
                    line += this.yokoWall[row][col] ? '|' : ' ';
                }
            }
            lines.push(line);
            if (row < this.height - 1) {
                let wallLine = '';
                for (let col = 0; col < this.width; col++) {
                    wallLine += this.tateWall[row][col] ? '-' : ' ';
                    if (col < this.width - 1) {
                        wallLine += ' ';
                    }
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
    /** Get ship with most constrained (fewest candidates > 1) */
    getMostConstrainedShip() {
        let minCandidates = Infinity;
        let bestShip = -1;
        for (let i = 0; i < this.shipCandList.length; i++) {
            const count = this.shipCandList[i].getShipPosObjList().length;
            if (count > 1 && count < minCandidates) {
                minCandidates = count;
                bestShip = i;
            }
        }
        return bestShip;
    }
    getShipCandidates(shipIndex) {
        return this.shipCandList[shipIndex].getShipPosObjList();
    }
    setShipPlacement(shipIndex, placement) {
        this.shipCandList[shipIndex].setShipPosObjList([placement]);
    }
    removeShipPlacement(shipIndex, placement) {
        const newList = this.shipCandList[shipIndex].getShipPosObjList().filter(spo => spo !== placement);
        this.shipCandList[shipIndex].setShipPosObjList(newList);
    }
}
// ============================================
// Kissing Solver
// ============================================
export class KissingSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from URL format
     * URL format: kissing/width/height/walls/ships
     * Example: kissing/5/5/0000.../337k/15v/...
     */
    static fromURL(url) {
        const paramBase = url.split('kissing/')[1];
        const width = parseInt(paramBase.split('/')[0]);
        const height = parseInt(paramBase.split('/')[1]);
        const param = paramBase.split('/')[2];
        const field = new KissingField(height, width);
        // Parse horizontal walls (yokoWall)
        let readPos = 0;
        for (let cnt = 0; cnt < height * (width - 1); cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                const bit = parseInt(param[readPos], 32);
                readPos++;
                const row = Math.floor((cnt - mod + 0) / (width - 1));
                const col = (cnt - mod + 0) % (width - 1);
                if (mod >= 0 && row < height && col < width - 1) {
                    field.setYokoWall(row, col, Math.floor(bit / 16) % 2 === 1);
                }
            }
            if (mod >= 1 && cnt + 1 - mod < height * (width - 1)) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 1 - mod) / (width - 1));
                const col = (cnt + 1 - mod) % (width - 1);
                if (row < height && col < width - 1) {
                    field.setYokoWall(row, col, Math.floor(bit / 8) % 2 === 1);
                }
            }
            if (mod >= 2 && cnt + 2 - mod < height * (width - 1)) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 2 - mod) / (width - 1));
                const col = (cnt + 2 - mod) % (width - 1);
                if (row < height && col < width - 1) {
                    field.setYokoWall(row, col, Math.floor(bit / 4) % 2 === 1);
                }
            }
            if (mod >= 3 && cnt + 3 - mod < height * (width - 1)) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 3 - mod) / (width - 1));
                const col = (cnt + 3 - mod) % (width - 1);
                if (row < height && col < width - 1) {
                    field.setYokoWall(row, col, Math.floor(bit / 2) % 2 === 1);
                }
            }
            if (mod >= 4 && cnt + 4 - mod < height * (width - 1)) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 4 - mod) / (width - 1));
                const col = (cnt + 4 - mod) % (width - 1);
                if (row < height && col < width - 1) {
                    field.setYokoWall(row, col, Math.floor(bit / 1) % 2 === 1);
                }
            }
        }
        // Parse vertical walls (tateWall)
        for (let cnt = 0; cnt < (height - 1) * width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                const bit = parseInt(param[readPos], 32);
                readPos++;
                const row = Math.floor((cnt - mod + 0) / width);
                const col = (cnt - mod + 0) % width;
                if (mod >= 0 && row < height - 1 && col < width) {
                    field.setTateWall(row, col, Math.floor(bit / 16) % 2 === 1);
                }
            }
            if (mod >= 1 && cnt + 1 - mod < (height - 1) * width) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 1 - mod) / width);
                const col = (cnt + 1 - mod) % width;
                if (row < height - 1 && col < width) {
                    field.setTateWall(row, col, Math.floor(bit / 8) % 2 === 1);
                }
            }
            if (mod >= 2 && cnt + 2 - mod < (height - 1) * width) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 2 - mod) / width);
                const col = (cnt + 2 - mod) % width;
                if (row < height - 1 && col < width) {
                    field.setTateWall(row, col, Math.floor(bit / 4) % 2 === 1);
                }
            }
            if (mod >= 3 && cnt + 3 - mod < (height - 1) * width) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 3 - mod) / width);
                const col = (cnt + 3 - mod) % width;
                if (row < height - 1 && col < width) {
                    field.setTateWall(row, col, Math.floor(bit / 2) % 2 === 1);
                }
            }
            if (mod >= 4 && cnt + 4 - mod < (height - 1) * width) {
                const bit = parseInt(param[readPos - 1], 32);
                const row = Math.floor((cnt + 4 - mod) / width);
                const col = (cnt + 4 - mod) % width;
                if (row < height - 1 && col < width) {
                    field.setTateWall(row, col, Math.floor(bit / 1) % 2 === 1);
                }
            }
        }
        // Parse banned cells if present
        if (readPos < param.length) {
            for (let cnt = 0; cnt < height * width; cnt++) {
                const mod = cnt % 5;
                if (mod === 0) {
                    const bit = parseInt(param[readPos], 32);
                    readPos++;
                    const row = Math.floor((cnt - mod + 0) / width);
                    const col = (cnt - mod + 0) % width;
                    if (mod >= 0 && row < height && col < width) {
                        field.setBanned(row, col, Math.floor(bit / 16) % 2 === 1);
                    }
                }
                if (mod >= 1 && cnt + 1 - mod < height * width) {
                    const bit = parseInt(param[readPos - 1], 32);
                    const row = Math.floor((cnt + 1 - mod) / width);
                    const col = (cnt + 1 - mod) % width;
                    if (row < height && col < width) {
                        field.setBanned(row, col, Math.floor(bit / 8) % 2 === 1);
                    }
                }
                if (mod >= 2 && cnt + 2 - mod < height * width) {
                    const bit = parseInt(param[readPos - 1], 32);
                    const row = Math.floor((cnt + 2 - mod) / width);
                    const col = (cnt + 2 - mod) % width;
                    if (row < height && col < width) {
                        field.setBanned(row, col, Math.floor(bit / 4) % 2 === 1);
                    }
                }
                if (mod >= 3 && cnt + 3 - mod < height * width) {
                    const bit = parseInt(param[readPos - 1], 32);
                    const row = Math.floor((cnt + 3 - mod) / width);
                    const col = (cnt + 3 - mod) % width;
                    if (row < height && col < width) {
                        field.setBanned(row, col, Math.floor(bit / 2) % 2 === 1);
                    }
                }
                if (mod >= 4 && cnt + 4 - mod < height * width) {
                    const bit = parseInt(param[readPos - 1], 32);
                    const row = Math.floor((cnt + 4 - mod) / width);
                    const col = (cnt + 4 - mod) % width;
                    if (row < height && col < width) {
                        field.setBanned(row, col, Math.floor(bit / 1) % 2 === 1);
                    }
                }
            }
        }
        // Parse ship definitions
        let wkParam = paramBase.split('/', 4)[3].split('/', 2)[1];
        // Handle presets
        if (wkParam === 'p') {
            wkParam = '337k/15v/24as/24bo/23fg/337i/23rg/334u/335s/33bk/24bk/337p';
        }
        else if (wkParam === 't') {
            wkParam = '14u/23bg/22u/23f/23eg';
        }
        else if (wkParam === 'd') {
            wkParam = '14u/14u/23bg/23bg/22u/22u/23f/23f/23eg/23eg';
        }
        field.initCand(wkParam.split('/'));
        return new KissingSolver(field);
    }
    getBranchCandidates(state) {
        const shipIndex = state.getMostConstrainedShip();
        if (shipIndex === -1)
            return [];
        const candidates = state.getShipCandidates(shipIndex);
        return candidates.map((placement) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setShipPlacement(shipIndex, placement);
                return cloned;
            },
            description: `Place ship ${shipIndex} at positions ${placement.getPositions().map(p => `(${p.row},${p.col})`).join(',')}`,
        }));
    }
}
//# sourceMappingURL=kissing.js.map