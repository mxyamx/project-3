import { ValidationErrors } from '@app/constants/validation-constants';
import { BoardGameValidation } from '@app/services/board-game/board-game-validation';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { assert } from 'chai';

describe('BoardGame Validation', () => {
    let testBoard: BoardGame;
    let existingBoard: BoardGame | null;

    beforeEach(() => {
        const rows = 10;
        const cols = 10;

        testBoard = {
            id: 'validBoard',
            name: 'Valid Board',
            description: 'A test board',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({ type: TileType.Grass })),
                ),
            previewImage: 'valid-image-url',
            visibility: true,
            itemInfos: [
                {
                    item: {
                        name: 'Entry Point',
                        type: ItemType.StartingPoint,
                        description: 'Starting point for the game',
                    },
                    available: 0,
                },
            ],
            lastModified: new Date(),
        };
        existingBoard = null;
    });

    afterEach(() => {
        testBoard = {
            id: '',
            name: '',
            description: '',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        };
        existingBoard = null;
    });

    it('should not validate board if name is empty', () => {
        testBoard.name = '';
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Le jeu doit avoir un nom.');
    });

    it('should not validate board if description is empty', () => {
        testBoard.description = '';
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Le jeu doit avoir une description.');
    });

    it('should not validate board if name is not unique and not the same existing board', () => {
        existingBoard = { ...testBoard, id: 'different board' };
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Il existe déjà un jeu avec le même nom: utilisez un nom différent.');
    });

    it('should not validate board if less than half is terrain tiles', () => {
        testBoard.tiles = [
            [{ type: TileType.Wall }, { type: TileType.Wall }],
            [{ type: TileType.Wall }, { type: TileType.Grass }],
        ];
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Plus de 50% de la surface totale de la zone de jeu doit être occupée par des tuiles de terrain.');
    });

    it('should not validate board if tile is not accessible', () => {
        const rows = 10;
        const cols = 10;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Grass })),
            );
        testBoard.tiles[0][1] = { type: TileType.Wall };
        testBoard.tiles[1][0] = { type: TileType.Wall };
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Tuile de terrain ne pas doit être inaccessible à cause d’un agencement de murs.');
    });

    it('should not validate board if number of entry points is different than expected', () => {
        testBoard.itemInfos[0].available = 1;
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Tous les points de départ doivent été placés.');
    });

    it('should not validate board if itemInfos is missing', () => {
        testBoard.itemInfos = undefined;
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, ValidationErrors.MissingEntryPoints);
    });

    it('should not validate board if doors are incorrectly placed', () => {
        const rows = 10;
        const cols = 10;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Grass })),
            );
        testBoard.tiles[0][1] = { type: TileType.Door };
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(
            result.errors,
            'Chaque tuile de porte doit se trouver entre deux tuiles de mur sur un même axe' +
                ' et ne peut pas être placée sur les bords de la zone de jeu.',
        );
    });

    it('should return false if the tile is not between walls', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Grass }));
        testBoard.tiles[2][2] = { type: TileType.Door };
        const optionOne = BoardGameValidation['hasAdjacentTerrain'](testBoard, 2, 2);
        const optionTwo = BoardGameValidation['areDoorsCorrectlyPlaced'](testBoard);
        assert.isFalse(optionOne);
        assert.isFalse(optionTwo);
    });

    it('should return false if a door is not between walls', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Grass }));
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['hasAdjacentTerrain'](testBoard, 2, 2);
        assert.isFalse(result);
    });

    it('should not validate board if a door is between walls but has no adjacent terrain', () => {
        const rows = 10;
        const cols = 10;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Grass })),
            );
        testBoard.tiles[5][4] = { type: TileType.Wall };
        testBoard.tiles[5][5] = { type: TileType.Door };
        testBoard.tiles[5][6] = { type: TileType.Wall };
        testBoard.tiles[4][5] = { type: TileType.Wall };
        testBoard.tiles[6][5] = { type: TileType.Wall };
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(
            result.errors,
            'Chaque tuile de porte doit se trouver entre deux tuiles de mur sur un même axe' +
                ' et ne peut pas être placée sur les bords de la zone de jeu.',
        );
    });

    it('should return true if a door is between two vertical walls', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Grass }));
        testBoard.tiles[1][2] = { type: TileType.Wall };
        testBoard.tiles[3][2] = { type: TileType.Wall };
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['isBetweenWalls'](testBoard, 2, 2);
        assert.isTrue(result);
    });

    it('should return true if a door is between two horizontal walls', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Grass }));
        testBoard.tiles[2][1] = { type: TileType.Wall };
        testBoard.tiles[2][3] = { type: TileType.Wall };
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['isBetweenWalls'](testBoard, 2, 2);
        assert.isTrue(result);
    });

    it('should return false if a door has only one adjacent wall', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Grass }));
        testBoard.tiles[2][1] = { type: TileType.Wall };
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['isBetweenWalls'](testBoard, 2, 2);
        assert.isFalse(result);
    });

    it('should return false if a door has no walls around it', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Grass }));
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['isBetweenWalls'](testBoard, 2, 2);
        assert.isFalse(result);
    });

    it('should return null if there is no accessible terrain tile', () => {
        const rows = 10;
        const cols = 10;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Wall }));
        const result = BoardGameValidation['findStartingTile'](testBoard);
        assert.isNull(result);
    });

    it('should not validate board if tile is isolated without adjacent terrain', () => {
        const rows = 10;
        const cols = 10;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Wall })),
            );
        testBoard.tiles[2][2] = { type: TileType.Grass };
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Tuile de terrain ne pas doit être inaccessible à cause d’un agencement de murs.');
    });

    it('should validate correct board', () => {
        const rows = 10;
        const cols = 10;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Grass })),
            );
        testBoard.tiles[0][0] = { type: TileType.Grass, isEntryPoint: true };
        testBoard.tiles[rows - 1][cols - 1] = { type: TileType.Grass, isEntryPoint: true };
        testBoard.tiles[4][4] = { type: TileType.Wall };
        testBoard.tiles[4][5] = { type: TileType.Door };
        testBoard.tiles[4][6] = { type: TileType.Wall };
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isTrue(result.valid);
        assert.strictEqual(result.errors.length, 0);
    });

    it('should return false if the position is out of bounds', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Wall }));
        assert.isFalse(BoardGameValidation['isBetweenWalls'](testBoard, -1, 2));
        assert.isFalse(BoardGameValidation['isBetweenWalls'](testBoard, rows, 2));
        assert.isFalse(BoardGameValidation['isBetweenWalls'](testBoard, 2, -1));
        assert.isFalse(BoardGameValidation['isBetweenWalls'](testBoard, 2, cols));
    });

    it('should return true if a tile between walls has adjacent terrain horizontally', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Wall }));
        testBoard.tiles[2][1] = { type: TileType.Grass };
        testBoard.tiles[2][3] = { type: TileType.Grass };
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['hasAdjacentTerrain'](testBoard, 2, 2);
        assert.isTrue(result);
    });

    it('should return true if a tile between walls has adjacent terrain vertically', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Wall }));
        testBoard.tiles[1][2] = { type: TileType.Grass };
        testBoard.tiles[3][2] = { type: TileType.Grass };
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['hasAdjacentTerrain'](testBoard, 2, 2);
        assert.isTrue(result);
    });

    it('should return false if a tile between walls has no adjacent terrain', () => {
        const rows = 5;
        const cols = 5;
        testBoard.tiles = Array(rows)
            .fill(null)
            .map(() => Array(cols).fill({ type: TileType.Wall }));
        testBoard.tiles[2][2] = { type: TileType.Door };
        const result = BoardGameValidation['hasAdjacentTerrain'](testBoard, 2, 2);
        assert.isFalse(result);
    });
    it('should not validate board if flag is not placed in mode CTF', () => {
        testBoard.gameMode = GameMode.CTF;
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
        assert.include(result.errors, 'Le drapeau doit être placé.');
    });
    it('should not validate board if itemInfos is missing in mode CTF', () => {
        testBoard.itemInfos = undefined;
        testBoard.gameMode = GameMode.CTF;
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
    });
    it('should not validate board if itemInfos is missing in mode CTF', () => {
        testBoard.itemInfos[0].item.name = 'Flag';
        testBoard.itemInfos[0].item.type = ItemType.Flag;
        testBoard.itemInfos[0].item.description = 'Flag for the game';
        testBoard.itemInfos[0].available = 0;
        testBoard.gameMode = GameMode.CTF;
        const result = BoardGameValidation.validateBoard(testBoard, existingBoard);
        assert.isFalse(result.valid);
    });
});
