import { StatusEffectType, Balance, GameEvents } from '../core/constants';
import { gameEvents } from '../core/event-bus';

/** 战斗单位接口 */
export interface ICombatant {
    hp: number;
    maxHp: number;
    block: number;
    statusEffects: Map<StatusEffectType, number>;
    takeDamage(amount: number): number;
    gainBlock(amount: number): void;
    applyStatus(type: StatusEffectType, stacks: number): void;
    removeStatus(type: StatusEffectType): void;
    getStatus(type: StatusEffectType): number;
    hasStatus(type: StatusEffectType): boolean;
}

/** 玩家模型 */
export class PlayerModel implements ICombatant {
    hp: number;
    maxHp: number;
    block: number = 0;
    energy: number;
    maxEnergy: number;
    statusEffects: Map<StatusEffectType, number> = new Map();

    constructor(maxHp: number = Balance.STARTING_HP, maxEnergy: number = Balance.STARTING_ENERGY) {
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.maxEnergy = maxEnergy;
        this.energy = maxEnergy;
    }

    /** 受到伤害，先扣格挡再扣HP，返回实际HP损失 */
    takeDamage(amount: number): number {
        if (amount <= 0) return 0;

        let remaining = amount;

        // 先扣格挡
        if (this.block > 0) {
            const blocked = Math.min(this.block, remaining);
            this.block -= blocked;
            remaining -= blocked;
        }

        // 再扣HP
        const hpLost = Math.min(this.hp, remaining);
        this.hp -= hpLost;

        gameEvents.emit(GameEvents.HP_CHANGED, { target: 'player', hp: this.hp, maxHp: this.maxHp, damage: hpLost });
        return hpLost;
    }

    /** 获得格挡 */
    gainBlock(amount: number): void {
        if (amount <= 0) return;
        const actual = this.hasStatus(StatusEffectType.Brittle)
            ? Math.floor(amount * Balance.BRITTLE_BLOCK_MULTIPLIER)
            : amount;
        this.block += actual;
        gameEvents.emit(GameEvents.BLOCK_GAINED, { target: 'player', block: this.block, gained: actual });
    }

    /** 消耗灵力 */
    spendEnergy(amount: number): boolean {
        if (this.energy < amount) return false;
        this.energy -= amount;
        gameEvents.emit(GameEvents.ENERGY_CHANGED, { energy: this.energy, maxEnergy: this.maxEnergy });
        return true;
    }

    /** 回复灵力 */
    refillEnergy(): void {
        this.energy = this.maxEnergy;
        gameEvents.emit(GameEvents.ENERGY_CHANGED, { energy: this.energy, maxEnergy: this.maxEnergy });
    }

    /** 回复HP */
    heal(amount: number): void {
        const actual = Math.min(amount, this.maxHp - this.hp);
        this.hp += actual;
        gameEvents.emit(GameEvents.HP_CHANGED, { target: 'player', hp: this.hp, maxHp: this.maxHp, healed: actual });
    }

    applyStatus(type: StatusEffectType, stacks: number): void {
        const current = this.statusEffects.get(type) || 0;
        this.statusEffects.set(type, current + stacks);
        gameEvents.emit(GameEvents.STATUS_APPLIED, { target: 'player', type, stacks: current + stacks });
    }

    removeStatus(type: StatusEffectType): void {
        this.statusEffects.delete(type);
        gameEvents.emit(GameEvents.STATUS_REMOVED, { target: 'player', type });
    }

    getStatus(type: StatusEffectType): number {
        return this.statusEffects.get(type) || 0;
    }

    hasStatus(type: StatusEffectType): boolean {
        return (this.statusEffects.get(type) || 0) > 0;
    }

    /** 回合开始时的状态tick */
    tickStatusOnTurnStart(): void {
        // 冰封：本回合存在即可，在抽牌时检查
    }

    /** 回合结束时的状态tick */
    tickStatusOnTurnEnd(): void {
        // 灼烧：回合结束受伤害
        const burn = this.getStatus(StatusEffectType.Burn);
        if (burn > 0) {
            this.takeDamage(burn);
        }

        // 中毒：回合结束受伤害，然后层数-1
        const poison = this.getStatus(StatusEffectType.Poison);
        if (poison > 0) {
            this.takeDamage(poison);
            if (poison <= 1) {
                this.removeStatus(StatusEffectType.Poison);
            } else {
                this.statusEffects.set(StatusEffectType.Poison, poison - 1);
            }
        }

        // 易伤/虚弱/冰封/脆弱：持续回合数-1
        for (const type of [StatusEffectType.Vulnerable, StatusEffectType.Weak, StatusEffectType.Freeze, StatusEffectType.Brittle]) {
            const stacks = this.getStatus(type);
            if (stacks > 0) {
                if (stacks <= 1) {
                    this.removeStatus(type);
                } else {
                    this.statusEffects.set(type, stacks - 1);
                }
            }
        }
    }

    /** 重置回合状态（格挡清零） */
    resetTurnState(): void {
        this.block = 0;
    }

    get isAlive(): boolean {
        return this.hp > 0;
    }
}
