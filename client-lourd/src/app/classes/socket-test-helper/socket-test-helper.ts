// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
type CallbackSignature = (params: any) => {};

export class SocketTestHelper {
    on(event: string, callback: CallbackSignature): void {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }

        this.callbacks.get(event)?.push(callback);
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-explicit-any
    emit(event: string, ...params: any): void {
        return;
    }

    disconnect(): void {
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peerSideEmit(event: string, params?: any) {
        if (!this.callbacks.has(event)) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const callback of this.callbacks.get(event)!) {
            callback(params);
        }
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    private callbacks = new Map<string, CallbackSignature[]>();
}
