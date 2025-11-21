import { DeviceType } from '@common/enums/deviceType';

export interface UserSession {
    firebaseId: string;
    socketId: string;
    deviceType: DeviceType;
    connectedAt: Date;
}

export class UserSessionManager {
    private activeSessions: Map<string, UserSession>;
    private socketToFirebaseMap: Map<string, string>;

    constructor() {
        this.activeSessions = new Map();
        this.socketToFirebaseMap = new Map();
    }

    connectUser(firebaseId: string, socketId: string, deviceType: DeviceType): boolean {
        if (this.isUserOnline(firebaseId)) {
            const oldSession = this.activeSessions.get(firebaseId);
            if (oldSession) {
                this.socketToFirebaseMap.delete(oldSession.socketId);
            }
        }

        const session: UserSession = {
            firebaseId,
            socketId,
            deviceType,
            connectedAt: new Date(),
        };

        this.activeSessions.set(firebaseId, session);
        this.socketToFirebaseMap.set(socketId, firebaseId);

        return true;
    }

    disconnectBySocketId(socketId: string): string | null {
        const firebaseId = this.socketToFirebaseMap.get(socketId);

        if (!firebaseId) {
            return null;
        }

        this.activeSessions.delete(firebaseId);
        this.socketToFirebaseMap.delete(socketId);

        return firebaseId;
    }

    disconnectByFirebaseId(firebaseId: string): boolean {
        const session = this.activeSessions.get(firebaseId);

        if (!session) {
            return false;
        }

        this.socketToFirebaseMap.delete(session.socketId);
        this.activeSessions.delete(firebaseId);

        return true;
    }

    isUserOnline(firebaseId: string): boolean {
        return this.activeSessions.has(firebaseId);
    }

    getUserSession(firebaseId: string): UserSession | null {
        return this.activeSessions.get(firebaseId) || null;
    }

    getFirebaseIdBySocketId(socketId: string): string | null {
        return this.socketToFirebaseMap.get(socketId) || null;
    }

    getSocketIdByFirebaseId(firebaseId: string): string | null {
        const session = this.activeSessions.get(firebaseId);
        return session ? session.socketId : null;
    }

    getAllActiveSessions(): UserSession[] {
        return Array.from(this.activeSessions.values());
    }

    getActiveUserCount(): number {
        return this.activeSessions.size;
    }

    updateDeviceType(firebaseId: string, deviceType: DeviceType): boolean {
        const session = this.activeSessions.get(firebaseId);

        if (!session) {
            return false;
        }

        session.deviceType = deviceType;
        this.activeSessions.set(firebaseId, session);

        return true;
    }

    clearAllSessions(): void {
        this.activeSessions.clear();
        this.socketToFirebaseMap.clear();
    }
}
