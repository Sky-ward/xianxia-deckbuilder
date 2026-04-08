type EventCallback = (...args: any[]) => void;

/** 内部监听器条目，同时保存原始回调和绑定后的回调 */
interface ListenerEntry {
    callback: EventCallback;  // 原始回调（用作 off 的查找键）
    target: any;              // this 上下文（用作 off 的查找键）
    bound: EventCallback;     // 实际调用的函数（已绑定 target）
}

/**
 * 类型化事件总线 — 解耦 Model 和 View 的通信骨架
 * 支持 Cocos Creator 风格的 on(event, cb, this) / off(event, cb, this) API
 */
export class EventBus {
    private listeners: Map<string, ListenerEntry[]> = new Map();

    /**
     * 注册监听器
     * @param event 事件名
     * @param callback 回调函数
     * @param target 回调的 this 上下文（可选）
     */
    on(event: string, callback: EventCallback, target?: any): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        const bound = target ? callback.bind(target) : callback;
        this.listeners.get(event)!.push({ callback, target, bound });
    }

    /**
     * 移除监听器（必须和 on 时传入相同的 callback 和 target）
     * @param event 事件名
     * @param callback 回调函数
     * @param target 回调的 this 上下文（可选）
     */
    off(event: string, callback: EventCallback, target?: any): void {
        const entries = this.listeners.get(event);
        if (!entries) return;
        const idx = entries.findIndex(e => e.callback === callback && e.target === target);
        if (idx !== -1) {
            entries.splice(idx, 1);
        }
    }

    /**
     * 触发事件
     * @param event 事件名
     * @param args 传递给所有监听器的参数
     */
    emit(event: string, ...args: any[]): void {
        const entries = this.listeners.get(event);
        if (!entries || entries.length === 0) return;
        // slice() 防止回调内部修改 listeners 数组导致遗漏或越界
        for (const entry of entries.slice()) {
            entry.bound(...args);
        }
    }

    /**
     * 注册一次性监听器（触发一次后自动移除）
     * @param event 事件名
     * @param callback 回调函数
     * @param target 回调的 this 上下文（可选）
     */
    once(event: string, callback: EventCallback, target?: any): void {
        const wrapper: EventCallback = (...args: any[]) => {
            callback.apply(target, args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * 清除监听器
     * @param event 不传则清除所有事件的所有监听器
     */
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
