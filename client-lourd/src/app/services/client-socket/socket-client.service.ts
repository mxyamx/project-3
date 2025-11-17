import { Injectable } from '@angular/core';
import { DeviceType } from '@common/enums/deviceType';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;

    isSocketAlive() {
        return this.socket && this.socket.connected;
    }

    connect(firebaseId: string): void {
        if (this.isSocketAlive()) {
            this.disconnect();
        }

        this.socket = io(environment.socketUrl, {
            transports: ['websocket'],
            upgrade: false,
            autoConnect: false,
            auth: {
                userId: firebaseId,
                deviceType: DeviceType.web,
            },
        });
    }

    startConnection(): void {
        if (this.socket && !this.socket.connected) {
            this.socket.connect();
        }
    }

    disconnect(): void {
        this.socket.disconnect();
    }

    on<T>(event: string, action: (data: T) => void): void {
        if (this.socket) {
            this.socket.on(event, action);
        }
    }

    listen<T>(event: string): Observable<T> {
        return new Observable<T>((observer) => {
            if (!this.socket) {
                observer.error(new Error('Socket not initialized'));
                return;
            }

            const handler = (data: T) => {
                observer.next(data);
            };

            this.socket.on(event, handler);

            // Cleanup function when observable is unsubscribed
            return () => {
                if (this.socket) {
                    this.socket.off(event, handler);
                }
            };
        });
    }

    off(event: string, callback?: (...args: any[]) => void): void {
        if (!this.socket) return;

        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }
    }

    send<T>(event: string, data?: T, callback?: (...args: unknown[]) => void): void {
        this.socket.emit(event, ...[data, callback].filter((x) => x));
    }

    emit<T, R>(event: string, data?: T, callback?: (response: R) => void): void {
        if (callback) {
            this.socket.emit(event, data, callback);
        } else {
            this.socket.emit(event, data);
        }
    }
}
