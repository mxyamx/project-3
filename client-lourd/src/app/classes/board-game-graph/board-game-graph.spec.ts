import { STANDARD_PLAYER } from '@app/constants/development-constants';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';
import { BoardGameGraph, BoardGameNode } from './board-game-graph';

describe('BoardGameGraph - findReachableNodes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function extractPositions(nodes: any[]): Position[] {
        return nodes.map((n) => n.tilePosition).sort((a, b) => a.x - b.x || a.y - b.y);
    }

    it('should return all reachable nodes in a 2x2 fully walkable grid', () => {
        const boardGame: Tile[][] = [
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
        ];

        const graph = new BoardGameGraph(boardGame);
        const result = graph.findReachableNodes({ x: 0, y: 0 }, 2);
        const positions = extractPositions(result);

        expect(positions).toEqual([
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
        ]);
    });
    it('should return all reachable nodes in a 2x2 fully walkable grid - 2', () => {
        const boardGame: Tile[][] = [
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Ice, shortestDistanceFromPosition: [] },
            ],
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
        ];

        const graph = new BoardGameGraph(boardGame);
        const result = graph.findReachableNodes({ x: 0, y: 0 }, 1);
        const positions = extractPositions(result);

        expect(positions).toEqual([
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
        ]);
    });
    it('should use all infinity and not block execution if a problem occurs with distances', () => {
        const boardGame: Tile[][] = [
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Ice, shortestDistanceFromPosition: [] },
            ],
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
        ];

        const graph = new BoardGameGraph(boardGame);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (graph as any).distances = {
            get: () => {
                return undefined;
            },
            clear: () => {
                return undefined;
            },
            set: () => {
                return undefined;
            },
            push: () => {
                return undefined;
            },
            forEach: () => {
                return undefined;
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (graph as any).queue = [
            new BoardGameNode({ type: TileType.Grass, shortestDistanceFromPosition: [] }, { x: 1, y: 1 }),
            new BoardGameNode({ type: TileType.Grass, shortestDistanceFromPosition: [] }, { x: 1, y: 2 }),
            new BoardGameNode({ type: TileType.Grass, shortestDistanceFromPosition: [] }, { x: 1, y: 1 }),
            new BoardGameNode({ type: TileType.Grass, shortestDistanceFromPosition: [] }, { x: 1, y: 2 }),
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (graph as any).resetValues = () => {
            return;
        };
        const result = graph.findReachableNodes({ x: 0, y: 0 }, 1);
        const positions = extractPositions(result);

        expect(positions).toEqual([]);
    });

    it('should block movement through a closed door', () => {
        const boardGame: Tile[][] = [
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Door, doorState: false, shortestDistanceFromPosition: [] },
            ],
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
        ];
        const speedValue = 3;
        const graph = new BoardGameGraph(boardGame);
        const result = graph.findReachableNodes({ x: 0, y: 0 }, speedValue);
        const positions = extractPositions(result);

        expect(positions).toEqual([
            { x: 1, y: 0 },
            { x: 1, y: 1 },
        ]);
    });

    it('should allow movement through an open door', () => {
        const boardGame: Tile[][] = [
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Door, doorState: true, shortestDistanceFromPosition: [] },
            ],
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
        ];
        const speedValue = 3;
        const graph = new BoardGameGraph(boardGame);
        const result = graph.findReachableNodes({ x: 0, y: 0 }, speedValue);
        const positions = extractPositions(result);

        expect(positions).toEqual([
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
        ]);
    });

    it('should block walls and tiles with players', () => {
        const boardMap: Tile[][] = [
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Wall, shortestDistanceFromPosition: [] },
            ],
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, containedPlayer: STANDARD_PLAYER, shortestDistanceFromPosition: [] },
            ],
        ];
        const speedValue = 3;
        const graph = new BoardGameGraph(boardMap);
        const result = graph.findReachableNodes({ x: 0, y: 0 }, speedValue);
        const positions = extractPositions(result);

        expect(positions).toEqual([{ x: 1, y: 0 }]);
    });

    it('should handle tile weights correctly', () => {
        const boardGame: Tile[][] = [
            [
                { type: TileType.Ice, shortestDistanceFromPosition: [] },
                { type: TileType.Water, shortestDistanceFromPosition: [] },
            ],
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
        ];

        const graph = new BoardGameGraph(boardGame);
        const result = graph.findReachableNodes({ x: 0, y: 0 }, 2);
        const positions = extractPositions(result);

        expect(positions).toEqual([
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
        ]);
    });

    it('should return no nodes if speed is 0', () => {
        const boardGame: Tile[][] = [
            [
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
                { type: TileType.Grass, shortestDistanceFromPosition: [] },
            ],
        ];

        const graph = new BoardGameGraph(boardGame);
        const result = graph.findReachableNodes({ x: 0, y: 0 }, 0);
        const positions = extractPositions(result);

        expect(positions).toEqual([]);
    });
});
