export class AvatarContainer {
    private avatarOwners: Map<string, Map<string, string>> = new Map();

    private ensureGame(gameId: string): Map<string, string> {
        if (!this.avatarOwners.has(gameId)) {
            this.avatarOwners.set(gameId, new Map());
        }
        return this.avatarOwners.get(gameId)!;
    }

    selectAvatar(gameId: string, avatar: string, socketId: string): boolean {
        const gameAvatars = this.ensureGame(gameId);

        const currentOwner = gameAvatars.get(avatar);
        if (currentOwner && currentOwner !== socketId) {
            return false;
        }

        gameAvatars.set(avatar, socketId);
        return true;
    }

    deselectAvatar(gameId: string, avatar: string, socketId: string): void {
        const gameAvatars = this.avatarOwners.get(gameId);
        if (!gameAvatars) return;

        const currentOwner = gameAvatars.get(avatar);
        if (currentOwner === socketId) {
            gameAvatars.delete(avatar);
        }
    }

    releaseBySocket(gameId: string, socketId: string): void {
        const gameAvatars = this.avatarOwners.get(gameId);
        if (!gameAvatars) return;

        for (const [avatar, owner] of gameAvatars.entries()) {
            if (owner === socketId) {
                gameAvatars.delete(avatar);
            }
        }
    }

    getSelectedAvatars(gameId: string): string[] {
        return Array.from(this.avatarOwners.get(gameId)?.keys() ?? []);
    }

    getAvatarOwner(gameId: string, avatar: string): string | undefined {
        return this.avatarOwners.get(gameId)?.get(avatar);
    }

    clearGame(gameId: string): void {
        this.avatarOwners.delete(gameId);
    }

    clearAll(): void {
        this.avatarOwners.clear();
    }
}
