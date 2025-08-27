/* eslint-disable max-lines */
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { BoardGame } from '@common/board-game';
import { DiceBonus } from '@common/enums/dice-bonus';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';

describe('VpGameSessionManager', () => {
    let vpSocket: VpSocketManager;
    let vpState: VpState;
    let initialPlayer: VirtualPlayer;
    let initialGameId: string;
    let initialBoardGame: BoardGame;
    let initialListOfPlayers: Player[];
    let vpGameSessionManager: VpGameSessionManager;

    beforeEach(() => {
        vpSocket = new VpSocketManager();
        sinon.spy(vpSocket, 'emit');
        vpState = new VpState();
        initialPlayer = { name: 'VP1' } as VirtualPlayer;
        initialGameId = 'test-game';
        initialBoardGame = { tiles: [[{}]] } as BoardGame;
        initialListOfPlayers = [{ name: 'Player1' }, { name: 'Player2' }] as Player[];

        vpGameSessionManager = new VpGameSessionManager(vpSocket, vpState, {
            initialPlayer,
            initialGameId,
            initialBoardGame,
            initialListOfPlayers,
        });
    });

    it('should initialize with correct values', () => {
        assert.deepEqual(vpGameSessionManager.chosenPlayer.get(), initialPlayer);
        assert.deepEqual(vpGameSessionManager.gameId.get(), initialGameId);
        assert.deepEqual(vpGameSessionManager.boardGame.get(), initialBoardGame);
        assert.deepEqual(vpGameSessionManager.listOfPlayers.get(), initialListOfPlayers);
    });

    it('should update game state correctly', () => {
        const newGameState: dataForm.GetGameStateRes = {
            successful: true,
            message: '',
            boardGame: { tiles: [[{}]] } as BoardGame,
            listOfPlayers: [{ name: 'Player3' }] as Player[],
            activePlayer: { name: 'Player3' } as Player,
        };
        vpGameSessionManager.updateGameState(newGameState);
        assert.deepEqual(vpGameSessionManager.boardGame.get(), newGameState.boardGame);
        assert.deepEqual(vpGameSessionManager.listOfPlayers.get(), newGameState.listOfPlayers);
        assert.deepEqual(vpGameSessionManager.activePlayer.get(), newGameState.activePlayer);
    });

    it('should move player correctly', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);
        vpState.isMovingToItem = false;

        const positions: Position[] = [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
        ];
        vpGameSessionManager.movePlayer(positions);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.Move, {
                gameCode: initialGameId,
                path: positions,
                isMovingToItem: false,
            }),
        );
    });

    it('should start attack correctly', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);
        vpGameSessionManager.canStartFight.set(true);

        const targetPosition: Position = { x: 0, y: 0 };
        vpGameSessionManager.startAttack(targetPosition);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.StartFight, {
                gameCode: initialGameId,
                targetPlayerPosition: targetPosition,
            }),
        );
    });

    it('should toggle door state correctly', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);
        vpGameSessionManager.canToggleDoor.set(true);

        const doorPosition: Position = { x: 0, y: 0 };
        vpGameSessionManager.toggleDoorState(doorPosition);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.ToggleDoorState, {
                gameCode: initialGameId,
                doorPosition,
            }),
        );
    });

    it('should attack player correctly', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canExecuteAttack.set(true);

        const defendingPlayer: Player = {
            name: 'Defender',
            character: 'Defender',
            attributes: {
                healthValue: 5,
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            inventory: [],
        };
        vpGameSessionManager.defendingPlayer.set(defendingPlayer);

        vpGameSessionManager.attackPlayer();

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.ExecuteAttack, {
                gameCode: initialGameId,
            }),
        );
    });

    it('should not attack player if playerState is not Attacking', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);

        vpGameSessionManager.attackPlayer();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not attack player if canExecuteAttack is false', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canExecuteAttack.set(false);

        vpGameSessionManager.attackPlayer();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not attack player if defendingPlayer health is 0', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canExecuteAttack.set(true);
        vpGameSessionManager.defendingPlayer.set({ attributes: { healthValue: 0 } } as Player);

        vpGameSessionManager.attackPlayer();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should attack player if conditions are met', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canExecuteAttack.set(true);
        vpGameSessionManager.defendingPlayer.set({ attributes: { healthValue: 10 } } as Player);

        vpGameSessionManager.attackPlayer();

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.ExecuteAttack, {
                gameCode: initialGameId,
            }),
        );
    });

    it('should attempt escape correctly', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canEscape.set(true);

        const defendingPlayer: Player = {
            name: 'Defender',
            character: 'Defender',
            attributes: {
                healthValue: 5,
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            inventory: [],
        };
        vpGameSessionManager.defendingPlayer.set(defendingPlayer);

        vpGameSessionManager.attemptEscape();

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.AttemptEscape, {
                gameCode: initialGameId,
            }),
        );
    });

    it('should not attempt escape if playerState is not Attacking', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);

        vpGameSessionManager.attemptEscape();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not attempt escape if canEscape is false', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canEscape.set(false);

        vpGameSessionManager.attemptEscape();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not attempt escape if defendingPlayer health is 0', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canEscape.set(true);
        vpGameSessionManager.defendingPlayer.set({ attributes: { healthValue: 0 } } as Player);

        vpGameSessionManager.attemptEscape();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should attempt escape if conditions are met', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);
        vpGameSessionManager.canEscape.set(true);
        vpGameSessionManager.defendingPlayer.set({ attributes: { healthValue: 10 } } as Player);

        vpGameSessionManager.attemptEscape();

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.AttemptEscape, {
                gameCode: initialGameId,
            }),
        );
    });

    it('should end turn correctly', () => {
        vpGameSessionManager.endTurn();
        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketClientEventNames.EndTurn, {
                gameCode: initialGameId,
            }),
        );
    });

    it('should pick up item correctly', () => {
        vpGameSessionManager.playerState.set(PlayerState.Moving);
        vpGameSessionManager.canPickUpItem.set(true);

        vpGameSessionManager.pickUpItem();

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.PickUpItem, {
                gameCode: initialGameId,
                player: initialPlayer,
            }),
        );
    });

    it('should drop item correctly', () => {
        vpGameSessionManager.playerState.set(PlayerState.DroppingItem);
        vpGameSessionManager.canDropItem.set(true);

        const item: Item = { name: 'Item1' } as Item;
        vpGameSessionManager.dropItem(item);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.DropItem, {
                gameCode: initialGameId,
                player: initialPlayer,
                item,
            }),
        );
    });

    it('should refresh chosen player correctly', () => {
        const newPlayer = { name: 'VP1', virtualPlayer: true } as Player;
        vpGameSessionManager.listOfPlayers.set([newPlayer]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vpGameSessionManager as any).refreshChosenPlayer();

        assert.deepEqual(vpGameSessionManager.chosenPlayer.get(), newPlayer as VirtualPlayer);
    });

    it('should update attackingPlayer correctly', () => {
        const attackingPlayer: Player = { name: 'Attacker' } as Player;
        vpGameSessionManager.updateAttackingPlayer(attackingPlayer);
        assert.deepEqual(vpGameSessionManager.attackingPlayer.get(), attackingPlayer);
    });

    it('should update defendingPlayer correctly', () => {
        const defendingPlayer: Player = { name: 'Defender' } as Player;
        vpGameSessionManager.updateDefendingPlayer(defendingPlayer);
        assert.deepEqual(vpGameSessionManager.defendingPlayer.get(), defendingPlayer);
    });

    it('should update nbOfActions correctly', () => {
        vpGameSessionManager.updateNbOfActions(2);
        assert.equal(vpGameSessionManager.nbOfActions.get(), 2);
    });

    it('should update nbOfEvasions correctly', () => {
        vpGameSessionManager.updateNbOfEvasions(2);
        assert.equal(vpGameSessionManager.nbOfEvasions.get(), 2);
    });

    it('should update canEndTurn correctly', () => {
        vpGameSessionManager.updateCanEndTurn(false);
        assert.isFalse(vpGameSessionManager.canEndTurn.get());
    });

    it('should update canStartFight correctly', () => {
        vpGameSessionManager.updateCanStartFight(false);
        assert.isFalse(vpGameSessionManager.canStartFight.get());
    });

    it('should update canExecuteAttack correctly', () => {
        vpGameSessionManager.updateCanExecuteAttack(false);
        assert.isFalse(vpGameSessionManager.canExecuteAttack.get());
    });

    it('should update canEscape correctly', () => {
        vpGameSessionManager.updateCanEscape(false);
        assert.isFalse(vpGameSessionManager.canEscape.get());
    });

    it('should update canToggleDoor correctly', () => {
        vpGameSessionManager.updateCanToggleDoor(false);
        assert.isFalse(vpGameSessionManager.canToggleDoor.get());
    });

    it('should update canPickUpItem correctly', () => {
        vpGameSessionManager.updateCanPickUpItem(false);
        assert.isFalse(vpGameSessionManager.canPickUpItem.get());
    });

    it('should update canDropItem correctly', () => {
        vpGameSessionManager.updateCanDropItem(false);
        assert.isFalse(vpGameSessionManager.canDropItem.get());
    });

    it('should not move player if playerState is not WaitingForAction', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);

        vpGameSessionManager.movePlayer([{ x: 0, y: 0 }]);

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should move player if playerState is WaitingForAction', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);

        const positions: Position[] = [{ x: 0, y: 0 }];
        vpGameSessionManager.movePlayer(positions);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.Move, {
                gameCode: initialGameId,
                path: positions,
                isMovingToItem: vpState.isMovingToItem,
            }),
        );
    });

    it('should not start attack if playerState is not WaitingForAction', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);

        vpGameSessionManager.startAttack({ x: 0, y: 0 });

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not start attack if canStartFight is false', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);
        vpGameSessionManager.canStartFight.set(false);

        vpGameSessionManager.startAttack({ x: 0, y: 0 });

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should start attack if conditions are met', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);
        vpGameSessionManager.canStartFight.set(true);

        const targetPosition: Position = { x: 0, y: 0 };
        vpGameSessionManager.startAttack(targetPosition);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.StartFight, {
                gameCode: initialGameId,
                targetPlayerPosition: targetPosition,
            }),
        );
    });

    it('should not toggle door state if playerState is not WaitingForAction', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);

        vpGameSessionManager.toggleDoorState({ x: 0, y: 0 });

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not toggle door state if canToggleDoor is false', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);
        vpGameSessionManager.canToggleDoor.set(false);

        vpGameSessionManager.toggleDoorState({ x: 0, y: 0 });

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should toggle door state if conditions are met', () => {
        vpGameSessionManager.playerState.set(PlayerState.WaitingForAction);
        vpGameSessionManager.canToggleDoor.set(true);

        const doorPosition: Position = { x: 0, y: 0 };
        vpGameSessionManager.toggleDoorState(doorPosition);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.ToggleDoorState, {
                gameCode: initialGameId,
                doorPosition,
            }),
        );
    });

    it('should not pick up item if playerState is not Moving', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);

        vpGameSessionManager.pickUpItem();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not pick up item if canPickUpItem is false', () => {
        vpGameSessionManager.playerState.set(PlayerState.Moving);
        vpGameSessionManager.canPickUpItem.set(false);

        vpGameSessionManager.pickUpItem();

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should pick up item if conditions are met', () => {
        vpGameSessionManager.playerState.set(PlayerState.Moving);
        vpGameSessionManager.canPickUpItem.set(true);

        vpGameSessionManager.pickUpItem();

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.PickUpItem, {
                gameCode: initialGameId,
                player: initialPlayer,
            }),
        );
    });

    it('should not drop item if playerState is not DroppingItem', () => {
        vpGameSessionManager.playerState.set(PlayerState.Attacking);

        vpGameSessionManager.dropItem({ name: 'Item1' } as Item);

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should not drop item if canDropItem is false', () => {
        vpGameSessionManager.playerState.set(PlayerState.DroppingItem);
        vpGameSessionManager.canDropItem.set(false);

        vpGameSessionManager.dropItem({ name: 'Item1' } as Item);

        assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
    });

    it('should drop item if conditions are met', () => {
        vpGameSessionManager.playerState.set(PlayerState.DroppingItem);
        vpGameSessionManager.canDropItem.set(true);

        const item: Item = { name: 'Item1' } as Item;
        vpGameSessionManager.dropItem(item);

        assert.isTrue(
            (vpSocket.emit as sinon.SinonSpy).calledWith(SocketServerEventNames.DropItem, {
                gameCode: initialGameId,
                player: initialPlayer,
                item,
            }),
        );
    });

    describe('shouldChangeTurn', () => {
        it('should return true if speedValue is 0 and nbOfActions is 0', () => {
            vpGameSessionManager.chosenPlayer.set({ attributes: { speedValue: 0 } } as VirtualPlayer);
            vpGameSessionManager.nbOfActions.set(0);

            const result = vpGameSessionManager.shouldChangeTurn();

            assert.isTrue(result);
        });

        it('should return false if speedValue is not 0', () => {
            vpGameSessionManager.chosenPlayer.set({ attributes: { speedValue: 5 } } as VirtualPlayer);
            vpGameSessionManager.nbOfActions.set(0);

            const result = vpGameSessionManager.shouldChangeTurn();

            assert.isFalse(result);
        });

        it('should return false if nbOfActions is not 0', () => {
            vpGameSessionManager.chosenPlayer.set({ attributes: { speedValue: 0 } } as VirtualPlayer);
            vpGameSessionManager.nbOfActions.set(1);

            const result = vpGameSessionManager.shouldChangeTurn();

            assert.isFalse(result);
        });

        it('should not end turn if canEndTurn is false', () => {
            vpGameSessionManager.canEndTurn.set(false);

            vpGameSessionManager.endTurn();

            assert.isFalse((vpSocket.emit as sinon.SinonSpy).called);
        });
    });
});
