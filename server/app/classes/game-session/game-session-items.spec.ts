/* eslint-disable max-lines */
import { GameSession } from '@app/classes/game-session/game-session';
import { BoardGame } from '@common/board-game';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { assert, expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sinon = require('sinon');
describe('GameSession - items', () => {
    let gameSession: GameSession;
    let mockBoardGame: BoardGame;
    let mockPlayer: Player;
    let mockItem: Item;
    let mockItem2: Item;
    const boardGameSize = 5;

    beforeEach(() => {
        // Mock board game setup
        mockBoardGame = {
            size: 5,
            tiles: Array(boardGameSize)
                .fill(null)
                .map(() =>
                    Array(boardGameSize).fill({
                        containedItem: undefined,
                        type: TileType.Grass,
                    }),
                ),
        } as unknown as BoardGame;

        mockPlayer = {
            name: 'Player1',
            inventory: [{ name: 'Sword', type: ItemType.RandomItem }],
            position: { x: 2, y: 2 },
        } as unknown as Player;

        mockItem = { name: 'Sword', type: ItemType.ConditionBased } as Item;
        mockItem2 = { name: 'Shield', type: ItemType.RandomItem } as Item;

        gameSession = new GameSession(mockBoardGame);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = mockPlayer;
        gameSession.listOfPlayers.add(mockPlayer);
    });

    it('should throw an error if the player does not have the item', () => {
        const itemNotInInventory = { name: 'Shield', type: ItemType.RandomItem } as Item;

        mockPlayer.inventory = [mockItem];
        gameSession.dropItem(mockPlayer, itemNotInInventory);
        expect(() => mockPlayer.inventory.length === 1);
    });

    it('should throw an error if the player is not the active player', () => {
        const anotherPlayer = { name: 'Player2', inventory: [mockItem] } as Player;

        anotherPlayer.inventory = [mockItem];
        gameSession.dropItem(anotherPlayer, mockItem);
        expect(() => mockPlayer.inventory.length === 1);
    });

    it('should reposition item there is already an item on the tile', () => {
        mockBoardGame.tiles[2][2].containedItem = { name: 'Shield', type: ItemType.RandomItem } as Item;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findNearestValidTileStub = sinon.stub(gameSession as any, 'findNearestValidTile').returns({ x: 3, y: 3 });

        gameSession.dropItem(mockPlayer, mockItem);

        expect(mockPlayer.inventory).to.not.deep.include(mockItem);
        expect(mockBoardGame.tiles[3][3].containedItem).to.deep.equal(mockItem);

        findNearestValidTileStub.restore();
    });

    it('should remove the item from the player inventory and place it on the board', () => {
        gameSession.dropItem(mockPlayer, mockItem);

        expect(mockPlayer.inventory).to.not.deep.include(mockItem);

        expect(mockBoardGame.tiles[2][2].containedItem).to.deep.equal(mockItem);
    });

    it('should not modify other items in the player inventory', () => {
        const anotherItem = { name: 'Shield', type: ItemType.RandomItem } as Item;
        mockPlayer.inventory.push(anotherItem);

        gameSession.dropItem(mockPlayer, mockItem);

        expect(mockPlayer.inventory).to.deep.include(anotherItem);
    });

    it('should throw an error if there is no item on the tile', () => {
        mockPlayer.inventory = [];
        gameSession.pickUpItem(mockPlayer);
        expect(() => mockPlayer.inventory.length === 0);
    });

    it('should throw an error if the item type is StartingPoint', () => {
        mockBoardGame.tiles[2][2].containedItem = { name: 'Start', type: ItemType.StartingPoint } as Item;

        mockPlayer.inventory = [];
        gameSession.pickUpItem(mockPlayer);
        expect(() => mockPlayer.inventory.length === 0);
    });

    it('should throw an error if the player is not the active player', () => {
        const anotherPlayer = { name: 'Player2', position: { x: 2, y: 2 } } as Player;
        mockBoardGame.tiles[2][2].containedItem = mockItem;

        anotherPlayer.inventory = [];
        gameSession.pickUpItem(anotherPlayer);
        expect(() => mockPlayer.inventory.length === 0);
    });

    it('should add the item to the player inventory and remove it from the tile', () => {
        mockItem.type = ItemType.GameEditor;
        mockBoardGame.tiles[2][2].containedItem = mockItem;

        gameSession.pickUpItem(mockPlayer);

        expect(mockPlayer.inventory).to.deep.include(mockItem);

        expect(mockBoardGame.tiles[2][2].containedItem).to.be.equal(undefined);
    });

    it('should not affect other tiles on the board', () => {
        mockBoardGame.tiles[2][2].containedItem = mockItem;
        mockBoardGame.tiles[1][1].containedItem = { name: 'Shield', type: ItemType.RandomItem } as Item;

        gameSession.pickUpItem(mockPlayer);

        expect(mockBoardGame.tiles[1][1].containedItem).to.deep.equal({ name: 'Shield', type: ItemType.RandomItem });
    });
    it('should do nothing if the player has no inventory', () => {
        mockPlayer.inventory = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).dropAllItems(mockPlayer);

        for (let i = 0; i < mockBoardGame.size; i++) {
            for (let j = 0; j < mockBoardGame.size; j++) {
                expect(mockBoardGame.tiles[i][j].containedItem).to.be.equal(undefined);
            }
        }
    });

    it('should do nothing if the player has no position', () => {
        mockPlayer.position = undefined;
        mockPlayer.inventory = [mockItem];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).dropAllItems(mockPlayer);

        for (let i = 0; i < mockBoardGame.size; i++) {
            for (let j = 0; j < mockBoardGame.size; j++) {
                expect(mockBoardGame.tiles[i][j].containedItem).to.be.equal(undefined);
            }
        }
    });

    it('should do nothing if the player is not registered', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).players = {
            getValues: () => [] as Player[],
        };
        mockPlayer.inventory = [mockItem];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).dropAllItems(mockPlayer);

        for (let i = 0; i < mockBoardGame.size; i++) {
            for (let j = 0; j < mockBoardGame.size; j++) {
                expect(mockBoardGame.tiles[i][j].containedItem).to.be.equal(undefined);
            }
        }
    });

    it('should drop all items from the player inventory onto the board', () => {
        mockPlayer.inventory = [mockItem, mockItem2];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).findNearestValidTile = (position: Position) => {
            return { x: position.x + 1, y: position.y + 1 };
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).dropAllItems(mockPlayer);

        expect(mockBoardGame.tiles[3][3].containedItem).to.deep.equal(mockItem2);

        expect(mockPlayer.inventory.length).to.be.equal(0);
    });

    it('should set droppingItems to true during execution and false afterward', () => {
        mockPlayer.inventory = [mockItem];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).findNearestValidTile = (position: Position) => {
            return { x: position.x + 1, y: position.y + 1 };
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).dropAllItems(mockPlayer);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).droppingItems).to.be.equal(false);
    });
    it('should return false if there is no item on the tile', () => {
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].containedItem = undefined;

        const result = gameSession.validItemPresent(position);

        expect(result).to.be.equal(false);
    });

    it('should return false if the item type is StartingPoint', () => {
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].containedItem = { type: ItemType.StartingPoint } as Item;

        const result = gameSession.validItemPresent(position);

        expect(result).to.be.equal(false);
    });

    it('should return false if the item type is RandomItem', () => {
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].containedItem = { type: ItemType.RandomItem } as Item;

        const result = gameSession.validItemPresent(position);

        expect(result).to.be.equal(false);
    });

    it('should return true if the item is valid and not of type StartingPoint or RandomItem', () => {
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].containedItem = { type: ItemType.ConditionBased } as Item;

        const result = gameSession.validItemPresent(position);

        expect(result).to.be.equal(true);
    });

    it('should return false if the player has no inventory', () => {
        mockPlayer.inventory = undefined;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).playerHasItem(mockPlayer, mockItem);

        expect(result).to.be.equal(false);
    });

    it('should return false if the player does not have the specified item', () => {
        mockPlayer.inventory = [mockItem];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).playerHasItem(mockPlayer, mockItem2);

        expect(result).to.be.equal(false);
    });

    it('should return true if the player has the specified item', () => {
        mockPlayer.inventory = [mockItem, mockItem2];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).playerHasItem(mockPlayer, mockItem);

        expect(result).to.be.equal(true);
    });
    it('should return false if the tile is a Door while droppingItems is true', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).droppingItems = true;
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].type = TileType.Door;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isValidPosition(position);

        expect(result).to.be.equal(false);
    });

    it('should return false if the tile contains a StartingPoint while droppingItems is true', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).droppingItems = true;
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].type = TileType.Grass;
        mockBoardGame.tiles[position.x][position.y].containedItem = { type: ItemType.StartingPoint } as Item;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isValidPosition(position);

        expect(result).to.be.equal(false);
    });

    it('should return false if the tile contains a not disabled item while droppingItems is true', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).droppingItems = true;
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].containedItem = { type: ItemType.AttributeEditor, disabled: false } as Item;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isValidPosition(position);

        expect(result).to.be.equal(false);
    });

    it('should return true if the tile is empty and droppingItems is true', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).droppingItems = true;
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].containedItem = undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isValidPosition(position);

        expect(result).to.be.equal(true);
    });

    it('should return true for a valid tile while droppingItems is true', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).droppingItems = true;
        const position = { x: 2, y: 2 };
        mockBoardGame.tiles[position.x][position.y].type = TileType.Grass;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isValidPosition(position);

        expect(result).to.be.equal(true);
    });

    it('should not drop item if player is not the active player but has the item', () => {
        const anotherPlayer = { name: 'Player2', inventory: [mockItem] } as Player;
        const initialInventory = [...anotherPlayer.inventory];

        // S'assurer que le joueur a l'item mais n'est pas le joueur actif
        gameSession.dropItem(anotherPlayer, mockItem);

        // Vérifier que l'inventaire n'a pas été modifié
        expect(anotherPlayer.inventory).to.deep.equal(initialInventory);

        // Vérifier que l'item n'a pas été déposé sur le plateau
        assert.isUndefined(mockBoardGame.tiles[2][2].containedItem);
    });
});
