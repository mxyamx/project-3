import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ChatDockService {
    private bus = new BroadcastChannel('chat');
    chatDetache = signal(false);

    constructor() {
        this.bus.onmessage = (e) => {
            if (e.data?.type === 'POPUP_OPENED') this.chatDetache.set(true);
            if (e.data?.type === 'POPUP_CLOSED') this.chatDetache.set(false);
        };
    }
}
