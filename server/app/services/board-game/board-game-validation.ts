import { ValidationErrors } from '@app/constants/validation-constants';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Tile } from '@common/tile';
import { ValidationResult } from '@common/validation-result';

export class BoardGameValidation {
    private static readonly directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];

    static validateBoard(board: BoardGame | null, existingBoard: BoardGame | null): ValidationResult {
        const errors: string[] = [
            board.name.length === 0 && ValidationErrors.AbsentName,
            !board.description && ValidationErrors.AbsentDescription,
            existingBoard && existingBoard.id !== board.id && ValidationErrors.ExistingName,
            !this.hasMoreThanHalfTerrainTiles(board) && ValidationErrors.InvalidTerrainTiles,
            !this.isEveryTileAccessible(board) && ValidationErrors.InaccessibleTiles,
            !this.areDoorsCorrectlyPlaced(board) && ValidationErrors.IncorrectlyPlacedDoor,
            !this.hasAllEntryPoints(board) && ValidationErrors.MissingEntryPoints,
            board.gameMode === GameMode.CTF ? !this.isFlagPresentForModeCTF(board) && ValidationErrors.MissingFlag : '',
        ].filter(Boolean) as string[];
        return { valid: errors.length === 0, errors };
    }
    private static isFlagPresentForModeCTF(board: BoardGame): boolean {
        if (!board.itemInfos) return false;
        const flagItem = board.itemInfos.find((itemInfo) => itemInfo.item.type === ItemType.Flag);
        return flagItem && flagItem.available === 0;
    }
    private static hasMoreThanHalfTerrainTiles(board: BoardGame): boolean {
        const totalTilesBySize = {
            [BoardGameSize.Small]: 100,
            [BoardGameSize.Medium]: 225,
            [BoardGameSize.Large]: 400,
        };
        const totalTiles = totalTilesBySize[board.size];
        const terrainTilesCount = board.tiles.flat().filter((tile) => [TileType.Grass, TileType.Water, TileType.Ice].includes(tile.type)).length;
        return terrainTilesCount > totalTiles / 2;
    }

    private static hasAllEntryPoints(board: BoardGame): boolean {
        if (!board.itemInfos) return false;
        const entryPointItem = board.itemInfos.find((itemInfo) => itemInfo.item.type === ItemType.StartingPoint);
        return entryPointItem && entryPointItem.available === 0;
    }

    private static isOnEdge(i: number, j: number, rows: number, cols: number): boolean {
        return i === 0 || i === rows - 1 || j === 0 || j === cols - 1;
    }

    private static isBetweenWalls(board: BoardGame, i: number, j: number): boolean {
        if (i <= 0 || i >= board.tiles.length - 1 || j <= 0 || j >= board.tiles[0].length - 1) {
            return false;
        }
        const isBetweenVerticalWalls = board.tiles[i - 1][j].type === TileType.Wall && board.tiles[i + 1][j].type === TileType.Wall;
        const isBetweenHorizontalWalls = board.tiles[i][j - 1].type === TileType.Wall && board.tiles[i][j + 1].type === TileType.Wall;
        return isBetweenVerticalWalls || isBetweenHorizontalWalls;
    }

    private static isTerrainTile(tile: Tile): boolean {
        return tile.type === TileType.Grass || tile.type === TileType.Ice || tile.type === TileType.Water;
    }

    private static hasAdjacentTerrain(board: BoardGame, i: number, j: number): boolean {
        if (this.isBetweenWalls(board, i, j)) {
            return (
                (this.isTerrainTile(board.tiles[i][j - 1]) && this.isTerrainTile(board.tiles[i][j + 1])) ||
                (this.isTerrainTile(board.tiles[i - 1][j]) && this.isTerrainTile(board.tiles[i + 1][j]))
            );
        }
        return false;
    }

    private static areDoorsCorrectlyPlaced(board: BoardGame): boolean {
        const rows = board.tiles.length;
        const cols = board.tiles[0].length;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (board.tiles[i][j].type === TileType.Door) {
                    if (this.isOnEdge(i, j, rows, cols)) return false;
                    if (!this.isBetweenWalls(board, i, j)) return false;
                    if (!this.hasAdjacentTerrain(board, i, j)) return false;
                }
            }
        }
        return true;
    }

    private static isEveryTileAccessible(board: BoardGame): boolean {
        const rows = board.tiles.length;
        const cols = board.tiles[0].length;
        const visited = this.initializeVisited(rows, cols);
        const start = this.findStartingTile(board);
        if (!start || this.isStartingTileIsolated(board, start[0], start[1])) return false;
        this.performDFS(board, start[0], start[1], visited);
        return this.areAllTerrainTilesVisited(board, visited);
    }

    private static initializeVisited(rows: number, cols: number): boolean[][] {
        return Array.from({ length: rows }, () => Array(cols).fill(false));
    }

    private static findStartingTile(board: BoardGame): [number, number] | null {
        for (let i = 0; i < board.tiles.length; i++) {
            for (let j = 0; j < board.tiles[i].length; j++) {
                if (this.isAccessibleTerrain(board.tiles[i][j])) {
                    return [i, j];
                }
            }
        }
        return null;
    }

    private static performDFS(board: BoardGame, startX: number, startY: number, visited: boolean[][]): void {
        const stack: [number, number][] = [[startX, startY]];
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (!this.isValidPosition(board, x, y) || visited[x][y]) continue;
            visited[x][y] = true;

            for (const [dx, dy] of this.directions) {
                const newX = x + dx;
                const newY = y + dy;
                if (this.isValidPosition(board, newX, newY)) {
                    const nextTile = board.tiles[newX][newY];
                    if (this.isAccessibleTerrain(nextTile) || nextTile.type === TileType.Door) {
                        stack.push([newX, newY]);
                    }
                }
            }
        }
    }

    private static isValidPosition(board: BoardGame, x: number, y: number): boolean {
        return x >= 0 && x < board.tiles.length && y >= 0 && y < board.tiles[0].length;
    }

    private static isAccessibleTerrain(tile: Tile): boolean {
        return tile.type === TileType.Grass || tile.type === TileType.Water || tile.type === TileType.Ice;
    }

    private static areAllTerrainTilesVisited(board: BoardGame, visited: boolean[][]): boolean {
        for (let i = 0; i < board.tiles.length; i++) {
            for (let j = 0; j < board.tiles[i].length; j++) {
                if (this.isAccessibleTerrain(board.tiles[i][j]) && !visited[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }

    private static isStartingTileIsolated(board: BoardGame, x: number, y: number): boolean {
        const badAmountOfWallsAroundTile = 4;
        let wallCount = 0;
        for (const [dx, dy] of this.directions) {
            const newX = x + dx;
            const newY = y + dy;
            if (newX >= 0 && newX < board.tiles.length && newY >= 0 && newY < board.tiles[0].length) {
                if (board.tiles[newX][newY].type === TileType.Wall) {
                    wallCount++;
                }
            }
        }
        return wallCount === badAmountOfWallsAroundTile;
    }
}
