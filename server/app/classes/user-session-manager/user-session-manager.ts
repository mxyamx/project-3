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

    /**
     * Register a new user session
     */
    connectUser(firebaseId: string, socketId: string, deviceType: DeviceType = DeviceType.web): boolean {
        // Check if user is already connected
        if (this.isUserOnline(firebaseId)) {
            return false; // User already online
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

    /**
     * Disconnect a user session by socket ID
     */
    disconnectBySocketId(socketId: string): string | null {
        const firebaseId = this.socketToFirebaseMap.get(socketId);
        
        if (!firebaseId) {
            return null;
        }

        this.activeSessions.delete(firebaseId);
        this.socketToFirebaseMap.delete(socketId);

        return firebaseId;
    }

    /**
     * Disconnect a user session by firebase ID
     */
    disconnectByFirebaseId(firebaseId: string): boolean {
        const session = this.activeSessions.get(firebaseId);
        
        if (!session) {
            return false;
        }

        this.socketToFirebaseMap.delete(session.socketId);
        this.activeSessions.delete(firebaseId);

        return true;
    }

    /**
     * Check if a user is currently online
     */
    isUserOnline(firebaseId: string): boolean {
        return this.activeSessions.has(firebaseId);
    }

    /**
     * Get user session information
     */
    getUserSession(firebaseId: string): UserSession | null {
        return this.activeSessions.get(firebaseId) || null;
    }

    /**
     * Get firebase ID from socket ID
     */
    getFirebaseIdBySocketId(socketId: string): string | null {
        return this.socketToFirebaseMap.get(socketId) || null;
    }

    /**
     * Get all active sessions
     */
    getAllActiveSessions(): UserSession[] {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Get count of active users
     */
    getActiveUserCount(): number {
        return this.activeSessions.size;
    }

    /**
     * Update device type for a session
     */
    updateDeviceType(firebaseId: string, deviceType: DeviceType): boolean {
        const session = this.activeSessions.get(firebaseId);
        
        if (!session) {
            return false;
        }

        session.deviceType = deviceType;
        this.activeSessions.set(firebaseId, session);

        return true;
    }

    /**
     * Clear all sessions (useful for testing or server restart)
     */
    clearAllSessions(): void {
        this.activeSessions.clear();
        this.socketToFirebaseMap.clear();
    }
}