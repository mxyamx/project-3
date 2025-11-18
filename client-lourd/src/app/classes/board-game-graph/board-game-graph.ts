import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

export class BoardGameNode {
    private value: Tile;
    private position: Position;
    private neighbors: Map<BoardGameNode, number>;

    constructor(value: Tile, position: Position) {
        this.value = value;
        this.neighbors = new Map();
        this.position = position;
    }

    get tile(): Tile {
        return this.value;
    }

    get tilePosition(): Position {
        return this.position;
    }

    get neighborTiles(): Map<BoardGameNode, number> {
        return this.neighbors;
    }

    connect(node: BoardGameNode, weight: number, condition: boolean): void {
        if (condition) {
            this.neighbors.set(node, weight);
        }
    }
}

export class BoardGameGraph {
    private nodes: BoardGameNode[][];
    private visited: Set<BoardGameNode>;
    private previousNodes: Map<BoardGameNode, BoardGameNode>;
    private distances: Map<BoardGameNode, number>;
    private ignoreDoorStateForVP: boolean;
    private ignorePlayerForVP: boolean;
    constructor(boardMap: Tile[][], ignoreDoorStateForVP?: boolean, ignorePlayerForVP?: boolean) {
        this.nodes = [];
        this.visited = new Set<BoardGameNode>();
        this.previousNodes = new Map<BoardGameNode, BoardGameNode>();
        this.distances = new Map<BoardGameNode, number>();
        this.ignoreDoorStateForVP = ignoreDoorStateForVP ?? false;
        this.ignorePlayerForVP = ignorePlayerForVP ?? false;
        this.buildGraph(boardMap);
    }

    findReachableNodes(startPosition: Position, speedValue: number): BoardGameNode[] {
        const startNode = this.nodes[startPosition.x][startPosition.y];
        this.findDistances(startPosition);

        const reachableNodes: BoardGameNode[] = [];
        this.distances.forEach((distance, node) => {
            if (distance !== Infinity && node !== startNode && distance <= speedValue) {
                reachableNodes.push(node);
            }
        });

        this.registerShortestPath();

        return reachableNodes;
    }
    getDistances(): Map<BoardGameNode, number> {
        return this.distances;
    }
    getNodes(): BoardGameNode[][] {
        return this.nodes;
    }
    getPreviousNodes(): Map<BoardGameNode, BoardGameNode> {
        return this.previousNodes;
    }

    findDistances(startPosition: Position): void {
        const startNode = this.nodes[startPosition.x][startPosition.y];
        this.resetValues();

        const queue: BoardGameNode[] = [startNode];
        this.distances.set(startNode, 0);

        while (queue.length > 0) {
            let minIndex = 0;
            for (let i = 1; i < queue.length; i++) {
                const nodeDistance = this.distances.get(queue[i]) ?? Infinity;
                const minNodeDistance = this.distances.get(queue[minIndex]) ?? Infinity;
                if (nodeDistance < minNodeDistance) {
                    minIndex = i;
                }
            }

            const currentNode = queue.splice(minIndex, 1)[0];
            this.visited.add(currentNode);

            for (const [neighbor, weight] of currentNode.neighborTiles) {
                if (this.visited.has(neighbor)) continue;

                const currentDistance = this.distances.get(currentNode) ?? Infinity;
                const neighborDistance = this.distances.get(neighbor) ?? Infinity;
                const newDistance = currentDistance + weight;

                if (newDistance < neighborDistance) {
                    this.distances.set(neighbor, newDistance);
                    this.previousNodes.set(neighbor, currentNode);
                    if (!queue.includes(neighbor)) {
                        queue.push(neighbor);
                    }
                }
            }
        }
    }

    private resetValues(): void {
        this.distances.clear();
        this.previousNodes.clear();
        this.visited.clear();

        for (const row of this.nodes) {
            for (const node of row) {
                this.distances.set(node, Infinity);
            }
        }
    }
    private registerShortestPath(): void {
        for (const row of this.nodes) {
            for (const node of row) {
                if (this.distances.get(node) !== Infinity) {
                    const path: Position[] = [];
                    let current: BoardGameNode | null = node;

                    while (current) {
                        path.unshift(current.tilePosition);
                        current = this.previousNodes.get(current) || null;
                    }

                    node.tile.shortestDistanceFromPosition = path;
                }
            }
        }
    }

    private neighborIsValid(tile: Tile): boolean {
        if (!tile.containedPlayer) {
            if (tile.type !== TileType.Wall) {
                if (tile.type === TileType.Door) {
                    if (!tile.doorState) {
                        if (this.ignoreDoorStateForVP) {
                            return true;
                        }
                        return false;
                    }
                }
                return true;
            }
        }
        if (tile.containedPlayer && this.ignorePlayerForVP) {
            return true;
        }
        return false;
    }

    private weightFunction(tile: Tile): number {
        switch (tile.type) {
            case TileType.Ice:
                return 0;
            case TileType.Water:
                return 2;
            case TileType.Grass:
            case TileType.Teleportation:
                return 1;
            case TileType.Door:
                if (tile.doorState || this.ignoreDoorStateForVP) return 1;
                return Infinity;
            default:
                return Infinity;
        }
    }

    private buildGraph(boardMap: Tile[][]): void {
        const rows = boardMap.length;
        const cols = boardMap[0].length;

        for (let i = 0; i < rows; i++) {
            this.nodes[i] = [];
            for (let j = 0; j < cols; j++) {
                this.nodes[i][j] = new BoardGameNode(boardMap[i][j], { x: i, y: j });
            }
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (i > 0)
                    this.nodes[i][j].connect(this.nodes[i - 1][j], this.weightFunction(boardMap[i - 1][j]), this.neighborIsValid(boardMap[i - 1][j]));
                if (i < rows - 1)
                    this.nodes[i][j].connect(this.nodes[i + 1][j], this.weightFunction(boardMap[i + 1][j]), this.neighborIsValid(boardMap[i + 1][j]));
                if (j > 0)
                    this.nodes[i][j].connect(this.nodes[i][j - 1], this.weightFunction(boardMap[i][j - 1]), this.neighborIsValid(boardMap[i][j - 1]));
                if (j < cols - 1)
                    this.nodes[i][j].connect(this.nodes[i][j + 1], this.weightFunction(boardMap[i][j + 1]), this.neighborIsValid(boardMap[i][j + 1]));
            }
        }
    }
}
