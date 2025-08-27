import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';

describe('SocketTestHelper', () => {
    let socketHelper: SocketTestHelper;

    beforeEach(() => {
        socketHelper = new SocketTestHelper();
    });

    it('should register an event listener', () => {
        const event = 'testEvent';
        const callback = jasmine.createSpy('callback');

        socketHelper.on(event, callback);

        // @ts-ignore
        expect(socketHelper.callbacks.has(event)).toBeTruthy();
    });

    it('should call all registered callbacks when emitting an event', () => {
        const event = 'testEvent';
        const callback1 = jasmine.createSpy('callback1');
        const callback2 = jasmine.createSpy('callback2');

        socketHelper.on(event, callback1);
        socketHelper.on(event, callback2);

        // @ts-ignore
        socketHelper.callbacks.get(event)?.forEach((cb) => cb());

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
    });

    it('should execute emit without throwing an error', () => {
        expect(() => socketHelper.emit('testEvent')).not.toThrow();
    });

    it('should execute disconnect without throwing an error', () => {
        expect(() => socketHelper.disconnect()).not.toThrow();
    });
    it('should call registered callback with correct params', () => {
        const callback = jasmine.createSpy('callback');

        socketHelper.on('event1', callback);
        socketHelper.peerSideEmit('event1', { value: 42 });

        expect(callback).toHaveBeenCalledWith({ value: 42 });
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call all callbacks registered to the same event', () => {
        const callback1 = jasmine.createSpy('callback1');
        const callback2 = jasmine.createSpy('callback2');

        socketHelper.on('event2', callback1);
        socketHelper.on('event2', callback2);

        socketHelper.peerSideEmit('event2', 'test');

        expect(callback1).toHaveBeenCalledWith('test');
        expect(callback2).toHaveBeenCalledWith('test');
    });

    it('should do nothing if no callbacks are registered for the event', () => {
        const testValue = 123;
        expect(() => {
            socketHelper.peerSideEmit('unregisteredEvent', testValue);
        }).not.toThrow();
    });

    it('should work with undefined params', () => {
        const callback = jasmine.createSpy('callback');
        socketHelper.on('event3', callback);

        socketHelper.peerSideEmit('event3');

        expect(callback).toHaveBeenCalledWith(undefined);
    });
});
