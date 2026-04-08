import { StatusEffectType, IntentType, ElementType, Balance, GameEvents } from '../core/constants';
import { gameEvents } from '../core/event-bus';
import { ICombatant } from './player-model';

/** 敌人意图 */
export interface EnemyIntent {
    type: IntentType;
    value: number;          // 伤害值或格挡值
    statusType?: StatusEffectType;
    statusStacks?: number;
    times?: number;         // 多段攻击次数
}

/** 敌人行为模式定义（JSON可序列化） */
export interface EnemyMovePattern {
    intent: IntentType;
    value: number;
    statusType?: StatusEffectType;
    statusStacks?: number;
    times?: number;
}

/** 敌人静态数据定义（从JSON加载） */
export interface EnemyData {
    id: string;
    nameZh: string;
    nameEn: string;
    maxHp: number;
    maxHpVariance: number;  // HP随机浮动范围
    element: ElementType | null;
    pattern: EnemyMovePattern[];
    patternType: 'cycle' | 'random';  // 循环或随机选择
    isBoss: boolean;
}

/** 敌人运行时实例 */
export class EnemyModel implements ICombatant {
    readonly data: EnemyData;
    readonly instanceId: number;

    hp: number;
    maxHp: number;
    block: number = 0;
    statusEffects: Map<StatusEffectType, number> = new Map();

    currentIntent: EnemyIntent;
    private moveIndex: number = 0;

    private static nextId = 0;

    constructor(data: EnemyData, actualMaxHp: number) {
        this.data = data;
        this.instanceId = EnemyModel.nextId++;
        this.maxHp = actualMaxHp;
        this.hp = actualMaxHp;
        this.currentIntent = this.buildIntent(data.pattern[0]);
    }

    get id(): string { return this.data.id; }
    get nameZh(): string { return this.data.nameZh; }
    get nameEn(): string { return this.data.nameEn; }
    get element(): ElementType | null { return this.data.element; }
    get isBoss(): boolean { return this.data.isBoss; }

    takeDamage(amount: number): number {
        if (amount <= 0) return 0;

        let remaining = amount;
        if (this.block > 0) {
            const blocked = Math.min(this.block, remaining);
            this.block -= blocked;
            remaining -= blocked;
        }

        const hpLost = Math.min(this.hp, remaining);
        this.hp -= hpLost;

        gameEvents.emit(GameEvents.HP_CHANGED, {
            target: 'enemy',
            enemyId: this.instanceId,
            hp: this.hp,
            maxHp: this.maxHp,
            damage: hpLost,
        });

        if (this.hp <= 0) {
            gameEvents.emit(GameEvents.ENEMY_DIED, { enemyId: this.instanceId });
        }

        return hpLost;
    }

    gainBlock(amount: number): void {
        if (amount <= 0) return;
        this.block += amount;
    }

    applyStatus(type: StatusEffectType, stacks: number): void {
        const current = this.statusEffects.get(type) || 0;
        this.statusEffects.set(type, current + stacks);
        gameEvents.emit(GameEvents.STATUS_APPLIED, {
            target: 'enemy',
            enemyId: this.instanceId,
            type,
            stacks: current + stacks,
        });
    }

    removeStatus(type: StatusEffectType): void {
        this.statusEffects.delete(type);
    }

    getStatus(type: StatusEffectType): number {
        return this.statusEffects.get(type) || 0;
    }

    hasStatus(type: StatusEffectType): boolean {
        return (this.statusEffects.get(type) || 0) > 0;
    }

    /** 推进到下一个意图 */
    advanceIntent(): void {
        this.moveIndex = (this.moveIndex + 1) % this.data.pattern.length;
        this.currentIntent = this.buildIntent(this.data.pattern[this.moveIndex]);
        gameEvents.emit(GameEvents.ENEMY_INTENT_CHANGED, {
            enemyId: this.instanceId,
            intent: this.currentIntent,
        });
    }

    /** 回合结束时的状态tick */
    tickStatusOnTurnEnd(): void {
        const burn = this.getStatus(StatusEffectType.Burn);
        if (burn > 0) this.takeDamage(burn);

        const poison = this.getStatus(StatusEffectType.Poison);
        if (poison > 0) {
            this.takeDamage(poison);
            if (poison <= 1) this.removeStatus(StatusEffectType.Poison);
            else this.statusEffects.set(StatusEffectType.Poison, poison - 1);
        }

        for (const type of [StatusEffectType.Vulnerable, StatusEffectType.Weak, StatusEffectType.Freeze, StatusEffectType.Brittle]) {
            const stacks = this.getStatus(type);
            if (stacks > 0) {
                if (stacks <= 1) this.removeStatus(type);
                else this.statusEffects.set(type, stacks - 1);
            }
        }
    }

    resetTurnState(): void {
        this.block = 0;
    }

    get isAlive(): boolean {
        return this.hp > 0;
    }

    private buildIntent(move: EnemyMovePattern): EnemyIntent {
        return {
            type: move.intent,
            value: move.value,
            statusType: move.statusType,
            statusStacks: move.statusStacks,
            times: move.times || 1,
        };
    }
}
