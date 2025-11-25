import { GameEventType } from '@common/enums/game-event-type';
import { ItemName } from '@common/enums/item-name';
import { EventLog } from '@common/game-event';
import { Player } from '@common/player';
import * as dataForm from '@common/socket-data-forms';
import * as io from 'socket.io';

export class EventLogManager {
    logs: EventLog[] = [];
    roomCode: string = '';

    combatRoomCode: string = '';

    private itemNamesFR: Map<string, string> = new Map([
        [ItemName.AttributeEditor1, 'Plume du Faucon'],
        [ItemName.AttributeEditor2, 'Carapace Enchantée'],
        [ItemName.ConditionBased1, 'Griffe de Survie'],
        [ItemName.ConditionBased2, 'Racine de Vengeance'],
        [ItemName.GameEditor1, "Fruit de l'Invisible"],
        [ItemName.GameEditor2, 'Retourneur de Temps'],
        [ItemName.RandomItem, 'Pierre de Résurrection'],
        [ItemName.StartingPoint, 'Point de Départ'],
        [ItemName.Flag, 'Drapeau'],
        [ItemName.Torch, 'Torche'],
    ]);

    private itemNamesEN: Map<string, string> = new Map([
        [ItemName.AttributeEditor1, 'Hawk Feather'],
        [ItemName.AttributeEditor2, 'Enchanted Shell'],
        [ItemName.ConditionBased1, 'Claw of Survival'],
        [ItemName.ConditionBased2, 'Root of Vengeance'],
        [ItemName.GameEditor1, 'Fruit of Invisibility'],
        [ItemName.GameEditor2, 'Time Reverser'],
        [ItemName.RandomItem, 'Resurrection Stone'],
        [ItemName.StartingPoint, 'Starting Point'],
        [ItemName.Flag, 'Flag'],
        [ItemName.Torch, 'Torch'],
    ]);

    private logSentSocketEventName: string = 'log-sent';
    constructor(
        private sio: io.Server,
        roomCode: string,
    ) {
        this.roomCode = roomCode;
        this.combatRoomCode = `COMBAT-${roomCode}`;
    }

    emitTurnNotification(player: Player) {
        if (!player) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `C'est le tour de: ${player.name}`,
            english: `It's ${player.name}'s turn`,
            timestamp: now.toISOString(),
            playerIds: [player.userId],
            type: GameEventType.StartTurn,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }
    emitToggleDoorNotification(player: Player, doorState: boolean) {
        if (!player) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `${player.name} a ${doorState ? 'ouvert' : 'fermé'} la porte`,
            english: `${player.name} ${doorState ? 'opened' : 'closed'} the door`,
            timestamp: now.toISOString(),
            playerIds: [player.userId],
            type: GameEventType.DoorState,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitToggleDebugModeNotification(status: boolean) {
        const now = new Date();

        const log: EventLog = {
            french: `Mode débogage  ${status ? 'activé' : 'désactivé'} `,
            english: `Debug mode ${status ? 'enabled' : 'disabled'} `,
            timestamp: now.toISOString(),
            playerIds: [],
            type: GameEventType.DebugMode,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitStartAttackNotification(attackingPlayer: Player, defendingPlayer: Player) {
        if (!attackingPlayer || !defendingPlayer) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `${attackingPlayer.name} commence le combat avec ${defendingPlayer.name}`,
            english: `${attackingPlayer.name} starts the fight with ${defendingPlayer.name}`,
            timestamp: now.toISOString(),
            playerIds: [attackingPlayer.userId, defendingPlayer.userId],
            type: GameEventType.StartFight,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitEndNotification(players: Player[]) {
        if (players.length < 1) {
            return;
        }
        const playersString = players.map((player) => player.name).join(', ');
        const now = new Date();

        const log: EventLog = {
            french: `Il reste ${playersString} dans la partie`,
            english: `There is ${playersString} left in the game`,
            timestamp: now.toISOString(),
            playerIds: players.map((player) => player.userId),
            type: GameEventType.EndGame,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitResultFightNotification(winner: Player, loser: Player) {
        if (!loser || !winner) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `${winner.name} a gagné et ${loser.name} a perdu le combat`,
            english: `${winner.name} won and ${loser.name} lost the fight`,
            timestamp: now.toISOString(),
            playerIds: [winner.userId, loser.userId],
            type: GameEventType.EndFight,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }
    emitEndFightNotification(winner: Player, loser: Player) {
        if (!loser || !winner) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `${winner.name} et ${loser.name} ont terminé le combat`,
            english: `${winner.name} and ${loser.name} have finished the fight`,
            timestamp: now.toISOString(),
            playerIds: [winner.userId, loser.userId],
            type: GameEventType.EndFight,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitAbandonNotification(player: Player) {
        if (!player) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `${player.name} a abandonné la partie`,
            english: `${player.name} has forfeited the game`,
            timestamp: now.toISOString(),
            playerIds: [player.userId],
            type: GameEventType.AbandonGame,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitJoinNotification(player: Player) {
        if (!player) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `${player.name} a rejoint la partie`,
            english: `${player.name} has joined the game`,
            timestamp: now.toISOString(),
            playerIds: [player.userId],
            type: GameEventType.JoinGame,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitFlagNotification(player: Player) {
        if (!player) {
            return;
        }
        const now = new Date();

        const log: EventLog = {
            french: `${player.name} a ramassé le drapeau`,
            english: `${player.name} picked up the flag`,
            timestamp: now.toISOString(),
            playerIds: [player.userId],
            type: GameEventType.AbandonGame,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitItemNotification(player: Player, itemKey: string) {
        if (!player) {
            return;
        }
        const now = new Date();
        const itemNameFR: string = this.itemNamesFR.has(itemKey) ? this.itemNamesFR.get(itemKey) : itemKey;
        const itemNameEN: string = this.itemNamesEN.has(itemKey) ? this.itemNamesEN.get(itemKey) : itemKey;

        const log: EventLog = {
            french: `${player.name} a ramassé un item: ${itemNameFR}`,
            english: `${player.name} picked up an item: ${itemNameEN}`,
            timestamp: now.toISOString(),
            playerIds: [player.userId],
            type: GameEventType.PickUpItem,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitAttackNotification(data: dataForm.ExecuteAttackRes) {
        const now = new Date();

        const log: EventLog = {
            french: `${data.attackingPlayer.name} roule ${data.attackDice} \n 
            ${data.defendingPlayer.name} roule ${data.defenseDice} \n
            ~   ${data.damageDoneAttackingPlayer} points de vie perdus    ~`,
            english: `${data.attackingPlayer.name} rolls ${data.attackDice} \n 
            ${data.defendingPlayer.name} rolls ${data.defenseDice} \n
            ~ ${data.damageDoneAttackingPlayer} life points lost ~`,
            timestamp: now.toISOString(),
            playerIds: [data.attackingPlayer.userId, data.defendingPlayer.userId],
            type: GameEventType.Fight,
        };

        this.sio.to(this.combatRoomCode).emit('combat-log-sent', log);
    }

    emitResultEscapeNotification(player: Player, escaped: boolean) {
        const now = new Date();

        const log: EventLog = {
            french: `${player.name} essaie de s'évader contre ${player.name}.\n
             ${player.name} a ${escaped ? 'réussi' : 'échoué'} l'évasion`,
            english: `${player.name} is trying to escape against ${player.name}.\n
            ${player.name} has ${escaped ? 'successfully' : 'failed'} escape`,
            timestamp: now.toISOString(),
            playerIds: [player.userId],
            type: GameEventType.Escape,
        };

        this.sio.to(this.combatRoomCode).emit('combat-log-sent', log);
    }

    emitTrapNotification(data: dataForm.TrapResolvedData) {
        if (!data) {
            return;
        }
        const playerName = data.activePlayer.name;
        const now = new Date();

        let message: string;
        let messageEN: string;

        if (data.avoided) {
            message = `${playerName} a évité le piège (-3 points de mouvement)`;
            messageEN = `${playerName} avoided the trap (-3 movement points)`;
        } else if (data.trapActivated) {
            message = `${playerName} a tenté de traverser le piège... ⚠️ LE PIÈGE S'EST ACTIVÉ! Son tour est terminé.`;
            messageEN = `${playerName} tried to cross the trap... ⚠️ THE TRAP HAS BEEN ACTIVATED! Their turn is over.`;
        } else {
            message = `${playerName} a tenté de traverser le piège et a réussi! (-1 point de mouvement)`;
            messageEN = message = `${playerName} attempted to cross the trap and succeeded! (-1 movement point)`;
        }

        const log: EventLog = {
            french: message,
            english: messageEN,
            timestamp: now.toISOString(),
            playerIds: [data.activePlayer.userId],
            type: GameEventType.Trap,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }

    emitDepositTorchNotificationWithPosition(data: dataForm.DepositTorchRes): void {
        if (!data) {
            return;
        }
        const now = new Date();
        const position = data.depositedPosition;

        const log: EventLog = {
            french: `${data.activePlayer.name} a déposé une torche à la position (${position.x}, ${position.y})`,
            english: `${data.activePlayer.name} dropped a torch at position (${position.x}, ${position.y})`,
            timestamp: now.toISOString(),
            playerIds: [data.activePlayer.userId],
            type: GameEventType.PickUpItem,
        };
        this.logs.push(log);
        this.sio.to(this.roomCode).emit(this.logSentSocketEventName, log);
    }
}
