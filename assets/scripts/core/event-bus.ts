type EventCallback = (...args: any[]) => void;

/**
 * 类型化事件总线 — 解耦 Model 和 View 的通信骨架
 */
export class EventBus {
    private listeners: Map<string, EventCallback[]> = new Map();

    on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback): void {
        const callbacks = this.listeners.get(event);
        if (!callbacks) return;
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event: string, ...args: any[]): void {
        const callbacks = this.listeners.get(event);
        if (!callbacks) return;
        for (const cb of callbacks) {
            cb(...args);
        }
    }

    once(event: string, callback: EventCallback): void {
        const wrapper = (...args: any[]) => {
            callback(...args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    clear(event?: string): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

/** 全局事件总线单例 */
export const gameEvents = new EventBus();
