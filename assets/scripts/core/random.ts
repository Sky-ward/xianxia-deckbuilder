/**
 * 种子随机数生成器 (Mulberry32)
 * 保证相同种子产生相同序列，用于可复现的roguelike run
 */
export class SeededRandom {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    /** 返回 [0, 1) 的浮点数 */
    next(): number {
        this.state |= 0;
        this.state = this.state + 0x6d2b79f5 | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** 返回 [min, max] 的整数 */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /** 返回 [0, 1) 之间的浮点数，等同于 next() */
    nextFloat(): number {
        return this.next();
    }

    /** Fisher-Yates 洗牌，原地打乱数组 */
    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /** 从数组中随机选一个元素 */
    pick<T>(array: T[]): T {
        return array[this.nextInt(0, array.length - 1)];
    }

    /** 按权重随机选择，weights[i] 对应 items[i] 的权重 */
    weightedPick<T>(items: T[], weights: number[]): T {
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let roll = this.nextFloat() * totalWeight;
        for (let i = 0; i < items.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return items[i];
        }
        return items[items.length - 1];
    }

    /** 获取当前状态（用于存档） */
    getState(): number {
        return this.state;
    }

    /** 恢复状态（用于读档） */
    setState(state: number): void {
        this.state = state;
    }
}
