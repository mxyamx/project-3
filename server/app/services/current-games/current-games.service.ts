/* eslint-disable no-console */
import { ID_GENERATION } from '@app/constants/development-constants';
import { UsersService } from '@app/services/users/users.service';
import { CurrentGame, CurrentGamePhase, CurrentGamePreview } from '@common/current-game';
import { PlayerLimits } from '@common/enums/players-limit';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { Player } from '@common/player';
import 'dotenv/config';
import * as io from 'socket.io';
import { Service } from 'typedi';
import { DatabaseService } from '../database/database.service';

const clone = <T>(x: T): T => structuredClone(x);

@Service()
export class CurrentGamesService {
    private sio: io.Server;
    private games: Map<string, CurrentGame> = new Map();

    constructor(
        private databaseService: DatabaseService,
        private usersService: UsersService,
    ) {}

    async getAllGames(): Promise<CurrentGame[]> {
        const values = Array.from(this.games.values());
        return values.map(clone);
    }

    setIo(io: io.Server) {
        this.sio = io;
    }

    getCurrentGamePreviews(): CurrentGamePreview[] {
        const values = Array.from(this.games.values());

        return values
            .filter((game) => game.phase !== CurrentGamePhase.Ended && game.players.length > 0)
            .map((game) => {
                const playerCount = game.players.length;
                const maxPlayerCount = PlayerLimits[game.boardGame.size].maxPlayers;
                const isJoinable: boolean = this.canJoin(game);
                const preview: CurrentGamePreview = {
                    id: game.id,
                    playerCount,
                    maxPlayerCount,
                    boardgameSize: game.boardGame.size,
                    gameMode: game.boardGame.gameMode,
                    phase: game.phase,
                    previewImage: game.boardGame.previewImage,
                    isJoinable,
                    entryPrice: game.entryPrice,
                    friendsOnly: game.friendsOnly || false,
                };
                return preview;
            });
    }

    canJoin(game: CurrentGame): boolean {
        const maxPlayerCount = PlayerLimits[game.boardGame.size].maxPlayers;
        return (
            ((game.phase === CurrentGamePhase.Waiting && !game.locked) || (game.phase === CurrentGamePhase.Running && game.dropInEnabled)) &&
            game.players.length < maxPlayerCount
        );
    }

    async canUserJoinGame(
        gameId: string,
        userId: string,
        getFirebaseIdBySocketId: (socketId: string) => string | null,
    ): Promise<{ canJoin: boolean; reason?: string }> {
        try {
            const game = this.games.get(gameId);
            if (!game) {
                return { canJoin: false, reason: 'GAME_NOT_FOUND' };
            }

            const adminFirebaseId = getFirebaseIdBySocketId(game.adminId) || game.adminId;

            if (game.friendsOnly && adminFirebaseId !== userId) {
                try {
                    const admin = await this.usersService.getUser(adminFirebaseId);
                    const adminFriends = admin.friends || [];

                    if (!adminFriends.includes(userId)) {
                        return { canJoin: false, reason: 'NOT_FRIEND_OF_ADMIN' };
                    }
                } catch (error) {
                    console.error(`Error checking admin ${adminFirebaseId}:`, error);
                    return { canJoin: false, reason: 'NOT_FRIEND_OF_ADMIN' };
                }
            }

            if (game.players.length > 0) {
                try {
                    const user = await this.usersService.getUser(userId);
                    let hasBlockedUserInRoom = false;

                    for (const player of game.players) {
                        const playerFirebaseId = player.userId;
                        if (!playerFirebaseId) continue;

                        try {
                            const playerData = await this.usersService.getUser(playerFirebaseId);

                            if (playerData.blocked?.includes(userId)) {
                                return { canJoin: false, reason: 'BLOCKED_BY_PLAYER' };
                            }

                            if (user.blocked?.includes(playerFirebaseId)) {
                                hasBlockedUserInRoom = true;
                            }
                        } catch (playerError) {
                            console.error(`Error checking player ${playerFirebaseId}:`, playerError);
                        }
                    }

                    if (hasBlockedUserInRoom) {
                        return {
                            canJoin: true,
                            reason: 'USER_BLOCKED_PLAYER_WARNING',
                        };
                    }
                } catch (userError) {
                    console.error(`Error checking user ${userId}:`, userError);
                }
            }

            return { canJoin: true };
        } catch (error) {
            console.error('Error in canUserJoinGame:', error);
            return { canJoin: true };
        }
    }

    async getGame(id: string): Promise<CurrentGame | null> {
        const game = this.games.get(id) || null;
        return game ? clone(game) : null;
    }

    async createGame(input: CurrentGame): Promise<CurrentGame> {
        if (!input) throw new Error('Les données du jeu actuel sont manquantes.');

        const base = clone(input);

        if (base.boardGame?.name) {
            base.name = base.boardGame.name;
        }

        base.id = await this.generateGameId();
        base.phase = CurrentGamePhase.Waiting;
        base.friendsOnly = base.friendsOnly || false;

        const toStore = clone(base);
        this.games.set(toStore.id, toStore);
        this.emitUpdatedCurrentGamePreviews();

        return clone(toStore);
    }

    setGameEnded(id: string): void {
        const existing = this.games.get(id);
        if (!existing) return;
        const next: CurrentGame = {
            ...existing,
            phase: CurrentGamePhase.Ended,
        };
        this.games.set(next.id, next);
        this.emitUpdatedCurrentGamePreviews();
    }

    async deleteGame(id: string): Promise<void> {
        const game = this.games.get(id);
        if (!game) {
            console.log(`Game ${id} not found for deletion (already deleted)`);
            return; // Don't throw, just return
        }

        try {
            this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME).deleteMany({ roomId: `GAME-${id}` });
        } catch (error) {
            console.warn(`Impossible de supprimer les messages du chat pour ${id} (ignoré).`);
        }

        this.games.delete(id);
        this.emitUpdatedCurrentGamePreviews();
    }

    async updateGame(patch: Partial<CurrentGame> & { id: string }): Promise<void> {
        const existing = this.games.get(patch.id);
        if (!existing) throw new Error('Échec lors de la mise à jour du jeu actuel.');

        const next: CurrentGame = {
            ...existing,
            name: patch.name ?? patch.boardGame?.name ?? existing.name,
            locked: patch.locked ?? existing.locked,
            phase: patch.phase ?? existing.phase,
            dropInEnabled: patch.dropInEnabled ?? existing.dropInEnabled,
            adminId: patch.adminId ?? existing.adminId,
            friendsOnly: patch.friendsOnly ?? existing.friendsOnly,
            boardGame: patch.boardGame !== undefined ? { ...existing.boardGame, ...patch.boardGame } : existing.boardGame,
            players: patch.players !== undefined ? patch.players.map((p) => ({ ...p })) : existing.players,
            id: existing.id,
        };

        this.games.set(next.id, next);
        this.emitUpdatedCurrentGamePreviews();
    }

    async addPlayer(player: Player, gameId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Le jeu actuel est introuvable.');

        if (game.players.some((p) => p.name === player.name)) return;

        const next: CurrentGame = {
            ...game,
            players: [...game.players, clone(player)],
        };

        this.games.set(next.id, next);
        this.emitUpdatedCurrentGamePreviews();
    }

    async removePlayer(player: Player, gameId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Le jeu actuel est introuvable.');

        const nextPlayers = game.players.filter((p) => p.name !== player.name);
        const next: CurrentGame = {
            ...game,
            players: clone(nextPlayers),
        };

        this.games.set(next.id, next);
        this.emitUpdatedCurrentGamePreviews();
    }
    private async generateGameId(): Promise<string> {
        let gameId = '';
        let isExistingGame = true;

        while (isExistingGame) {
            gameId = `${Math.floor(Math.random() * ID_GENERATION.max)}`.padStart(ID_GENERATION.length, ID_GENERATION.defaultValue);
            if (!this.games.has(gameId) && gameId !== '0000') {
                isExistingGame = false;
            }
        }
        return gameId;
    }

    private emitUpdatedCurrentGamePreviews() {
        this.sio.emit(SocketEventNames.CurrentGamePreviewsUpdated, this.getCurrentGamePreviews());
    }
}
