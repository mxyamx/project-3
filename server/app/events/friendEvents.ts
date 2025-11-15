import { EventEmitter } from 'events';

class FriendEventEmitter extends EventEmitter {
    constructor() {
        super();
    }
}

export const friendEvents = new FriendEventEmitter();