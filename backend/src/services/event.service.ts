import EventEmitter from 'events';

class EventService extends EventEmitter {
    constructor() {
        super();
    }

    /**
     * Emit a domain event
     */
    emit(event: string, ...args: any[]): boolean {
        console.log(`[EventService] Emitting event: ${event}`, args[0]?.serverName ? `for ${args[0].serverName}` : '');
        return super.emit(event, ...args);
    }
}

export default new EventService();
