/* eslint-disable max-lines */
import { GameSession } from '@app/classes/game-session/game-session';
import { ItemEffectApplicator } from '@app/classes/item-effect-applicator/item-effect-applicator';
import { LARGE_DICE_VALUE, SMALL_DICE_VALUE } from '@app/constants/development-constants';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Tile } from '@common/tile';
import { assert, expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sinon = require('sinon');

describe('GameSession', () => {
    let boardGame: BoardGame;
    let gameSession: GameSession;
    let player1: Player;
    let player2: Player;
    const rows = 10;
    const cols = 10;
    const initialSpeedValue = 4;
    beforeEach(() => {
        boardGame = {
            id: 'test',
            name: 'TestBoard',
            description: 'desc',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({
                            type: TileType.Grass,
                        })),
                ),
            previewImage: '',
            visibility: true,
            itemInfos: [],
            lastModified: new Date(),
        };
        boardGame.tiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[0][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        player1 = {
            name: 'Player1',
            character: 'Char1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
        };

        player2 = {
            name: 'Player2',
            character: 'Char2',
            attributes: {
                attackValue: 6,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
        };

        gameSession = new GameSession(boardGame);
        gameSession.listOfPlayers.add(player1);
        gameSession.listOfPlayers.add(player2);
        gameSession['staticPlayerMap'].set(player1.name, structuredClone(player1));
        gameSession['staticPlayerMap'].set(player2.name, structuredClone(player2));
    });
    it('should apply AttributeEditor2 effect to the attacking player if they have the item', () => {
        gameSession['ongoingFight'] = {
            attackingPlayer: player1,
            defendingPlayer: player2,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
        player1.inventory = [];
        player2.inventory = [];
        const itemEffectApplicatorStub = sinon.createStubInstance(ItemEffectApplicator);

        gameSession['itemEffectApplicator'] = itemEffectApplicatorStub;
        itemEffectApplicatorStub.hasItem.withArgs(player1, ItemName.AttributeEditor2).returns(true);

        gameSession.endFight();

        expect(itemEffectApplicatorStub.applyEffect.calledWith(player1, ItemName.AttributeEditor2));
    });

    it('should throw an error and end the game if duplicate player names are found', () => {
        gameSession.listOfPlayers.add(player1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endGameSpy = sinon.spy(gameSession as any, 'endGame');

        expect(() => gameSession.startGame()).to.throw('deux joueurs ont le meme nom');
        expect(endGameSpy.calledOnce);
    });

    it('should throw an error and end the game if the number of players is odd in CTF mode', () => {
        boardGame.gameMode = GameMode.CTF;
        gameSession.listOfPlayers.remove(player2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endGameSpy = sinon.spy(gameSession as any, 'endGame');

        expect(() => gameSession.startGame()).to.throw('nombre de joueur impair en ctf');
        expect(endGameSpy.calledOnce);
    });

    it('should not throw an error if the number of players is even in CTF mode', () => {
        boardGame.gameMode = GameMode.CTF;

        expect(() => gameSession.startGame()).to.not.throw();
    });

    it('should not throw an error if there are no duplicate player names', () => {
        expect(() => gameSession.startGame()).to.not.throw();
    });

    it('should not apply AttributeEditor2 effect to the attacking player if they do not have the item', () => {
        gameSession['ongoingFight'] = {
            attackingPlayer: player1,
            defendingPlayer: player2,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
        player1.inventory = [];
        player2.inventory = [];

        const itemEffectApplicatorStub = sinon.createStubInstance(ItemEffectApplicator);

        gameSession['itemEffectApplicator'] = itemEffectApplicatorStub;
        itemEffectApplicatorStub.hasItem.withArgs(player1, ItemName.AttributeEditor2).returns(false);

        gameSession.endFight();

        expect(itemEffectApplicatorStub.applyEffect.notCalled);
    });

    it('should apply AttributeEditor2 effect to the defending player if they have the item', () => {
        gameSession['ongoingFight'] = {
            attackingPlayer: player1,
            defendingPlayer: player2,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
        player1.inventory = [];
        player2.inventory = [];

        const itemEffectApplicatorStub = sinon.createStubInstance(ItemEffectApplicator);

        gameSession['itemEffectApplicator'] = itemEffectApplicatorStub;
        itemEffectApplicatorStub.hasItem.withArgs(player2, ItemName.AttributeEditor2).returns(true);

        gameSession.endFight();

        expect(itemEffectApplicatorStub.applyEffect.calledWith(player2, ItemName.AttributeEditor2));
    });

    it('should not apply AttributeEditor2 effect to the defending player if they do not have the item', () => {
        gameSession['ongoingFight'] = {
            attackingPlayer: player1,
            defendingPlayer: player2,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
        player1.inventory = [];
        player2.inventory = [];

        const itemEffectApplicatorStub = sinon.createStubInstance(ItemEffectApplicator);

        gameSession['itemEffectApplicator'] = itemEffectApplicatorStub;
        itemEffectApplicatorStub.hasItem.withArgs(player2, ItemName.AttributeEditor2).returns(false);

        gameSession.endFight();

        expect(itemEffectApplicatorStub.applyEffect.notCalled);
    });

    it('should start the game and assign players to positions', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).findRemainingItems = () => {
            return [{} as Item, {} as Item];
        };
        gameSession.startGame();
        assert.isDefined(gameSession.activePlayerInstance);
        const playersOnBoard = boardGame.tiles.flat().filter((t) => t.containedPlayer !== undefined);
        assert.equal(playersOnBoard.length, 2);
    });

    it('should move the active player and reduce speed', () => {
        gameSession.startGame();
        const player = gameSession.activePlayerInstance;
        const oldPos = { ...player.position };
        const newPos = { x: 1, y: 1 };
        gameSession.movePlayer(oldPos, newPos);
        assert.deepEqual(player.position, newPos);
        assert.isBelow(player.attributes.speedValue, initialSpeedValue);
    });

    it('should toggle door state', () => {
        boardGame.tiles[0][0].type = TileType.Door;
        boardGame.tiles[0][0].doorState = false;
        gameSession.toggleDoorState({ x: 0, y: 0 });
        assert.isTrue(boardGame.tiles[0][0].doorState);
    });

    it('should start a fight and set the attacker', () => {
        gameSession.startGame();
        gameSession.startFight(player1, player2);
        assert.isDefined(gameSession.fight);
        assert.include([player1.name, player2.name], gameSession.fight.attackingPlayer.name);
    });

    it('should deal damage when attack is executed', () => {
        gameSession.startFight(player1, player2);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isOnIce = () => {
            return true;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isDebugActivated = true;

        player1.inventory = [{ type: ItemType.ConditionBased, name: ItemName.ConditionBased1 } as Item];
        player2.inventory = [{ type: ItemType.ConditionBased, name: ItemName.ConditionBased1 } as Item];
        const initialHealth = 6;
        gameSession.executeAttack(player1, player2);
        assert.isBelow(player2.attributes.healthValue, initialHealth);
    });

    it('should switch turns during fight', () => {
        gameSession.startGame();
        gameSession.startFight(player1, player2);
        const first = gameSession.fight.attackingPlayer;
        gameSession.switchTurn();
        const next = gameSession.fight.attackingPlayer;
        assert.notEqual(first.name, next.name);
    });

    it('should detect a successful escape attempt sometimes', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = {
            attackingPlayer: player1,
            defendingPlayer: player2,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
        const result = gameSession.attemptEscape();
        assert.isBoolean(result);
    });

    it('should return the correct board game', () => {
        const result = gameSession.board;
        assert.strictEqual(result, boardGame);
    });

    it('should return the remaining items found', () => {
        const item = {
            name: 'TestItem',
            type: ItemType.Flag,
            description: 'desc',
        };
        boardGame.itemInfos = [
            {
                item,
                available: 1,
            },
        ];
        const remainingItems = gameSession.findRemainingItems();
        assert.lengthOf(remainingItems, 1);
        assert.deepEqual(remainingItems[0], item);
    });

    it('should reset speed and update the active player', () => {
        player1.inventory = [{ type: ItemType.AttributeEditor, name: ItemName.AttributeEditor1 } as Item];
        player2.inventory = [{ type: ItemType.AttributeEditor, name: ItemName.AttributeEditor1 } as Item];
        gameSession.startGame();
        const originalActivePlayer = gameSession.activePlayerInstance;
        originalActivePlayer.inventory = [{ type: ItemType.ConditionBased, name: ItemName.ConditionBased2 } as Item];
        originalActivePlayer.attributes.speedValue = 0;
        gameSession.changeActivePlayer();
        const playerCopy = gameSession['staticPlayerMap'].get(originalActivePlayer.name);
        assert.strictEqual(originalActivePlayer.attributes.speedValue, playerCopy?.attributes.speedValue);
        const newActivePlayer = gameSession.activePlayerInstance;
        assert.notStrictEqual(newActivePlayer.name, originalActivePlayer.name);
    });
    it('should handle random items with and without remaining items', () => {
        const remainingItem = {
            name: 'Valid Item',
            type: ItemType.Flag,
            description: 'desc',
        };
        boardGame.itemInfos = [
            {
                item: remainingItem,
                available: 1,
            },
        ];
        boardGame.tiles[0][0].containedItem = {
            name: 'Random1',
            type: ItemType.RandomItem,
            description: '',
            disabled: false,
        };
        boardGame.tiles[0][1].containedItem = {
            name: 'Random2',
            type: ItemType.RandomItem,
            description: '',
            disabled: false,
        };
        gameSession.startGame();
        const item1 = boardGame.tiles[0][0].containedItem;
        assert.notEqual(item1.type, ItemType.RandomItem);
        const item2 = boardGame.tiles[0][1].containedItem;
        assert.isTrue(item2.disabled);
    });

    it('should reposition player to static map saved position', () => {
        gameSession.startGame();

        const player = gameSession.activePlayerInstance;
        player.position = { x: 5, y: 5 };

        const staticPosition = { x: 2, y: 2 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).staticPlayerMap.set(player.name, { position: staticPosition } as Player);

        gameSession.repositionPlayer(player);

        assert.deepEqual(player.position, staticPosition);

        const tile = gameSession.board.tiles[staticPosition.x][staticPosition.y];
        assert.strictEqual(tile.containedPlayer, player);
    });

    it('should confirm if player is in session', () => {
        gameSession.startGame();
        const player = gameSession.activePlayerInstance;
        const isInSession = gameSession.playerIsInSession(player);
        assert.isTrue(isInSession);
    });

    it('should return false if player is not in session', () => {
        const fakePlayer = { ...player1, name: 'NonExistant' };
        const isInSession = gameSession.playerIsInSession(fakePlayer);
        assert.isFalse(isInSession);
    });

    it('should return false if player is not on ice tile', () => {
        gameSession.startGame();
        const player = gameSession.activePlayerInstance;
        const pos = player.position;
        boardGame.tiles[pos.x][pos.y].type = TileType.Grass;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isOnIce(player);
        assert.isFalse(result);
    });

    it('should find nearest valid tile if position is invalid or already occupied', () => {
        player1.position = { x: 0, y: 0 };
        gameSession['staticPlayerMap'].set(player1.name, { ...player1, position: { x: 0, y: 0 } });
        boardGame.tiles[0][0].containedPlayer = { ...player2 };
        gameSession.repositionPlayer(player1);
        assert.deepEqual(player1.position, { x: 1, y: 0 });
    });

    it('should reset health and clear ongoing fight at endFight', () => {
        gameSession.startGame();
        gameSession.startFight(player1, player2);
        player1.attributes.healthValue = 1;
        player2.attributes.healthValue = 2;
        gameSession.endFight();
        const player1Copy = gameSession['staticPlayerMap'].get(player1.name);
        const player2Copy = gameSession['staticPlayerMap'].get(player2.name);
        assert.strictEqual(player1.attributes.healthValue, player1Copy.attributes.healthValue);
        assert.strictEqual(player2.attributes.healthValue, player2Copy.attributes.healthValue);
        assert.isUndefined(gameSession.fight);
    });

    it('should remove player from session and clear tile on board', () => {
        gameSession.startGame();
        const player = gameSession.listOfPlayers.getFirst();
        const pos = player.position;
        assert.isDefined(boardGame.tiles[pos.x][pos.y].containedPlayer);
        gameSession.removePlayer(player);
        assert.isUndefined(boardGame.tiles[pos.x][pos.y].containedPlayer);
        assert.isFalse(gameSession.playerIsInSession(player));
    });

    it('should return false for out-of-bounds position in isValidPosition', () => {
        const outOfBounds = { x: -1, y: 1000 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isValidPosition(outOfBounds);
        assert.isFalse(result);
    });
    it('should correctly register and retrieve number of victories', () => {
        gameSession.startGame();
        const player = gameSession.activePlayerInstance;
        player.inventory = [{ type: ItemType.ConditionBased, name: ItemName.ConditionBased2 } as Item];
        gameSession.registerVictory(player);
        const victoryCount = gameSession.getPlayerAmountOfVic(player);
        assert.strictEqual(victoryCount, 1);
    });
    it('should return start position if no valid tiles are found around', () => {
        const pos = { x: 1, y: 1 };
        boardGame.tiles.forEach((row) =>
            row.forEach((tile) => {
                tile.type = TileType.Wall;
                tile.containedPlayer = undefined;
            }),
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).findNearestValidTile(pos);
        assert.deepEqual(result, pos);
    });
    it('should return correct weight for each tile type', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (gameSession as any).weightFunction.bind(gameSession);
        assert.strictEqual(fn({ type: TileType.Ice }), 0);
        assert.strictEqual(fn({ type: TileType.Water }), 2);
        assert.strictEqual(fn({ type: TileType.Grass }), 1);
        assert.strictEqual(fn({ type: TileType.Door, doorState: true }), 1);
        assert.strictEqual(fn({ type: TileType.Door, doorState: false }), Infinity);
        assert.strictEqual(fn({ type: 'unknown' as TileType }), Infinity);
    });
    it('should fallback to STANDARD_LIST_PLAYERS if player not found in staticPlayerMap', () => {
        gameSession['staticPlayerMap'].delete(player1.name);
        boardGame.tiles[0][0].containedItem = {
            name: 'Start',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        gameSession.board.gameMode = GameMode.Normal;

        gameSession.startGame();
        expect(() => gameSession.startGame()).not.to.throw();
    });
    it('should reduce attackValue by 2 if attacker is on Ice', () => {
        const diceRoll = 3;
        gameSession.startGame();
        boardGame.tiles[0][0].type = TileType.Ice;
        player1.position = { x: 0, y: 0 };
        const initialAttackValue = player1.attributes.attackValue - diceRoll;
        gameSession.executeAttack(player1, player2);
        assert.isBelow(initialAttackValue, player1.attributes.attackValue);
    });
    it('should do nothing if there is no ongoing fight when switching turn', () => {
        assert.isUndefined(gameSession.fight);
        expect(() => gameSession.switchTurn()).to.not.throw();
        assert.isUndefined(gameSession.fight);
    });
    it('should reposition if saved position has a different player', () => {
        const savedPos = { x: 1, y: 1 };
        const currentPos = { x: 0, y: 0 };
        player1.position = { ...currentPos };
        const playerClone = structuredClone(player1);
        playerClone.position = { ...savedPos };
        gameSession['staticPlayerMap'].set(player1.name, playerClone);
        boardGame.tiles[savedPos.x][savedPos.y].containedPlayer = {
            ...player1,
            name: 'AutreJoueur',
        };
        boardGame.tiles[currentPos.x][currentPos.y].containedPlayer = player1;
        gameSession.repositionPlayer(player1);
        assert.notDeepEqual(player1.position, currentPos);
    });
    it('should reposition player if current position is occupied by another player', () => {
        const occupiedPosition = { x: 0, y: 0 };
        const validPosition = { x: 1, y: 0 };
        const player = gameSession.listOfPlayers.getFirst();
        gameSession['staticPlayerMap'].set(player.name, { ...player, position: occupiedPosition });
        boardGame.tiles[occupiedPosition.x][occupiedPosition.y].containedPlayer = { name: 'OtherPlayer' } as Player;
        boardGame.tiles[validPosition.x][validPosition.y].type = TileType.Grass;
        player.position = { x: 1, y: 1 };
        gameSession.repositionPlayer(player);
        assert.deepEqual(player.position, validPosition);
    });
    it('should return the player with the highest speedValue as the first attacker', () => {
        const playerCopy1 = { attributes: { speedValue: 7 } } as Player;
        const playerCopy2 = { attributes: { speedValue: 5 } } as Player;
        const activePlayer = { name: 'ActivePlayer' } as Player;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).staticPlayerMap = new Map<string, Player>([
            ['Player1', playerCopy1],
            ['Player2', playerCopy2],
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = activePlayer;

        player1 = { name: 'Player1' } as Player;
        player2 = { name: 'Player2' } as Player;

        let result = gameSession['determineFirstAttacker'](player1, player2);
        assert.strictEqual(result, player1);

        playerCopy1.attributes.speedValue = 3;
        playerCopy2.attributes.speedValue = 7;
        result = gameSession['determineFirstAttacker'](player1, player2);
        assert.strictEqual(result, player2);

        playerCopy1.attributes.speedValue = 5;
        playerCopy2.attributes.speedValue = 5;
        result = gameSession['determineFirstAttacker'](player1, player2);
        assert.strictEqual(result, activePlayer);
    });
    it('should return false if position is a closed door', () => {
        const pos = { x: 5, y: 5 };
        boardGame.tiles[pos.x][pos.y].type = TileType.Door;
        boardGame.tiles[pos.x][pos.y].doorState = false;
        const result = gameSession['isValidPosition'](pos);
        assert.isFalse(result);
    });

    it('should  return debugModeStatus', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isDebugActivated = true;
        assert.isTrue(gameSession.debugModeStatus);
    });
    it('should throw an error if player is not found when teleporting', () => {
        gameSession.startGame();
        const oldPos = { x: 0, y: 0 };
        const newPos = { x: 1, y: 1 };
        boardGame = {
            id: 'test',
            name: 'TestBoard',
            description: 'desc',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({
                            type: TileType.Grass,
                        })),
                ),
            previewImage: '',
            visibility: true,
            itemInfos: [],
            lastModified: new Date(),
        };
        boardGame.tiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[1][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).boardGame = boardGame;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = player1;

        gameSession.teleport(oldPos, newPos);

        const testTiles: Tile[][] = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({
                        type: TileType.Grass,
                    })),
            );
        testTiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        testTiles[1][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        expect(gameSession.board.tiles).to.deep.equal(testTiles);
    });
    it('should throw an error if player is not found when moving', () => {
        gameSession.startGame();
        const oldPos = { x: 0, y: 0 };
        const newPos = { x: 1, y: 1 };
        boardGame = {
            id: 'test',
            name: 'TestBoard',
            description: 'desc',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({
                            type: TileType.Grass,
                        })),
                ),
            previewImage: '',
            visibility: true,
            itemInfos: [],
            lastModified: new Date(),
        };
        boardGame.tiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[1][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).boardGame = boardGame;
        gameSession.movePlayer(oldPos, newPos);

        const testTiles: Tile[][] = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({
                        type: TileType.Grass,
                    })),
            );
        testTiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        testTiles[1][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        expect(gameSession.board.tiles).to.deep.equal(testTiles);
    });
    it('should deactivate debug mode', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isDebugActivated = true;
        gameSession.deactivateDebugMode();
        assert.isFalse(gameSession.debugModeStatus);
    });
    it('should move player to new position', () => {
        const player: Player = player1;
        boardGame = {
            id: 'test',
            name: 'TestBoard',
            description: 'desc',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({
                            type: TileType.Grass,
                        })),
                ),
            previewImage: '',
            visibility: true,
            itemInfos: [],
            lastModified: new Date(),
        };
        boardGame.tiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[1][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[0][0].containedPlayer = player;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).boardGame = boardGame;

        gameSession.teleport({ x: 0, y: 0 }, { x: 1, y: 1 });

        expect(gameSession.board.tiles[0][0].containedPlayer).to.equal(undefined);
        expect(gameSession.board.tiles[1][1].containedPlayer).to.equal(player);
        expect(player.position).to.deep.equal({ x: 1, y: 1 });
    });
    it('should toggle debug mode state', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isDebugActivated = true;
        expect(gameSession.debugModeStatus).to.equal(true);
        gameSession.toggleDebugMode();
        expect(gameSession.debugModeStatus).to.equal(false);
        gameSession.toggleDebugMode();
        expect(gameSession.debugModeStatus).to.equal(true);
    });

    it('should not validate the position if an item is on the tile', () => {
        const player: Player = player1;
        boardGame = {
            id: 'test',
            name: 'TestBoard',
            description: 'desc',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({
                            type: TileType.Grass,
                        })),
                ),
            previewImage: '',
            visibility: true,
            itemInfos: [],
            lastModified: new Date(),
        };
        boardGame.tiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[1][1].containedItem = {
            name: 'Start2',
            type: ItemType.AttributeEditor,
            description: '',
            disabled: false,
        };
        boardGame.tiles[0][0].containedPlayer = player;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).boardGame = boardGame;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isDebugActivated = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).isValidPosition({ x: 1, y: 1 })).to.equal(false);
    });
    it('should return SMALL_DICE_VALUE for DiceBonus.FourSideBonus', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).giveDiceValue(DiceBonus.FourSideBonus)).to.equal(SMALL_DICE_VALUE);
    });

    it('should return LARGE_DICE_VALUE for other dice types', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).giveDiceValue(DiceBonus.SixSideBonus)).to.equal(LARGE_DICE_VALUE);
    });
    it('should apply debug mode dice values', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isDebugActivated = true;

        const attacker: Player = player1;
        const defender: Player = player2;

        player1.inventory = [];
        player2.inventory = [];

        attacker.attributes.bonusAttack = DiceBonus.FourSideBonus;
        gameSession.executeAttack(attacker, defender);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).attackDice).to.equal(SMALL_DICE_VALUE);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).defenseDice).to.equal(1);
    });
    it('should apply debug mode dice values', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isDebugActivated = true;

        const attacker: Player = player1;
        const defender: Player = player2;

        player1.inventory = [];
        player2.inventory = [];

        attacker.attributes.bonusAttack = DiceBonus.SixSideBonus;
        gameSession.executeAttack(attacker, defender);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).attackDice).to.equal(LARGE_DICE_VALUE);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((gameSession as any).defenseDice).to.equal(1);
    });
    it('should not teleport an error if position is not valid', () => {
        const player: Player = player1;
        boardGame = {
            id: 'test',
            name: 'TestBoard',
            description: 'desc',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({
                            type: TileType.Grass,
                        })),
                ),
            previewImage: '',
            visibility: true,
            itemInfos: [],
            lastModified: new Date(),
        };
        boardGame.tiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[1][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[0][0].containedPlayer = player;
        player.position = { x: 0, y: 0 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).boardGame = boardGame;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).isValidPosition = () => false;
        gameSession.teleport({ x: 0, y: 0 }, { x: 1, y: 1 });

        expect(gameSession.board.tiles[0][0].containedPlayer).to.equal(player);
        expect(gameSession.board.tiles[1][1].containedPlayer).to.equal(undefined);
        expect(player.position).to.deep.equal({ x: 0, y: 0 });
    });
    it('should return false when gameMode is normal when asked if ctf is over', () => {
        gameSession.board.gameMode = GameMode.Normal;
        const result = gameSession.ctfIsOver();
        expect(result).to.be.equal(false);
    });
    it('should return false when activePlayer does not have the flag when asked if ctf is over', () => {
        gameSession.board.gameMode = GameMode.CTF;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = player1;
        gameSession.activePlayerInstance.inventory = [];
        const result = gameSession.ctfIsOver();
        expect(result).to.be.equal(false);
    });
    it('should return false when activePlayer is not at start position when asked if ctf is over', () => {
        gameSession.board.gameMode = GameMode.CTF;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = player1;
        gameSession.activePlayerInstance.inventory = [{ type: ItemType.Flag } as Item];
        gameSession.activePlayerInstance.position = { x: 2, y: 1 };
        gameSession.activePlayerInstance.position = { x: 0, y: 0 };

        const result = gameSession.ctfIsOver();
        expect(result).to.be.equal(false);
    });
    it('should return true when all conditions are met when asked if ctf is over', () => {
        gameSession.board.gameMode = GameMode.CTF;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = player1;
        gameSession.activePlayerInstance.inventory = [{ type: ItemType.Flag } as Item];
        gameSession.activePlayerInstance.position = { x: 0, y: 0 };
        gameSession.activePlayerInstance.startPosition = { x: 0, y: 0 };

        const result = gameSession.ctfIsOver();
        expect(result).to.be.equal(true);
    });
    it('should not drop item if player is not the active player', () => {
        const mockItem = { name: 'TestItem', type: ItemType.RandomItem } as Item;
        const inactivePlayer = { name: 'InactivePlayer', inventory: [mockItem] } as Player;
        const initialInventory = [...inactivePlayer.inventory];
        const fakeActivePlayer = { name: 'SomeoneElse', inventory: [], position: { x: 0, y: 0 }, attributes: {} } as Player;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = fakeActivePlayer;
        gameSession.dropItem(inactivePlayer, mockItem);
        assert.deepEqual(inactivePlayer.inventory, initialInventory);
    });
    it('should return false for a closed door position', () => {
        const pos = { x: 0, y: 0 };
        boardGame.tiles[pos.x][pos.y].type = TileType.Door;
        boardGame.tiles[pos.x][pos.y].doorState = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (gameSession as any).isValidPosition(pos);
        assert.isFalse(result);
    });
    it('should return correct dice value for each bonus type', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (gameSession as any).giveDiceValue.bind(gameSession);
        assert.strictEqual(fn(DiceBonus.FourSideBonus), SMALL_DICE_VALUE);
        assert.strictEqual(fn(DiceBonus.SixSideBonus), LARGE_DICE_VALUE);
    });
});
