import { ElementType, StatusEffectType, Balance, GameEvents } from '../core/constants';
import { gameEvents } from '../core/event-bus';

/**
 * 五行系统 — 核心差异化机制
 *
 * 相生 (Generation): 木→火→土→金→水→木
 * 相克 (Restriction): 金→木→土→水→火→金
 */

/** 相生关系：key 生 value */
const GENERATION_MAP: Record<ElementType, ElementType> = {
    [ElementType.Wood]: ElementType.Fire,
    [ElementType.Fire]: ElementType.Earth,
    [ElementType.Earth]: ElementType.Metal,
    [ElementType.Metal]: ElementType.Water,
    [ElementType.Water]: ElementType.Wood,
};

/** 相克关系：key 克 value */
const RESTRICTION_MAP: Record<ElementType, ElementType> = {
    [ElementType.Metal]: ElementType.Wood,
    [ElementType.Wood]: ElementType.Earth,
    [ElementType.Earth]: ElementType.Water,
    [ElementType.Water]: ElementType.Fire,
    [ElementType.Fire]: ElementType.Metal,
};

/** 五行对应的debuff */
const ELEMENT_DEBUFF_MAP: Record<ElementType, StatusEffectType> = {
    [ElementType.Fire]: StatusEffectType.Burn,
    [ElementType.Water]: StatusEffectType.Freeze,
    [ElementType.Metal]: StatusEffectType.Bleed,
    [ElementType.Wood]: StatusEffectType.Poison,
    [ElementType.Earth]: StatusEffectType.Brittle,
};

/** 元素连招结果 */
export interface ElementCombo {
    type: 'burst' | 'chain';
    element: ElementType;
    bonusDamage: number;
    description: string;
}

export class ElementSystem {

    /** 计算攻击元素对防御元素的伤害倍率 */
    static getDamageMultiplier(attackElement: ElementType | null, defenderElement: ElementType | null): number {
        if (!attackElement || !defenderElement) return 1.0;

        // 相克：攻击方克制防御方 → 伤害增加
        if (RESTRICTION_MAP[attackElement] === defenderElement) {
            return Balance.ELEMENT_RESTRICT_BONUS;
        }

        // 被克：防御方克制攻击方 → 伤害降低
        if (RESTRICTION_MAP[defenderElement] === attackElement) {
            return Balance.ELEMENT_RESTRICT_PENALTY;
        }

        return 1.0;
    }

    /** 获取元素对应的debuff类型 */
    static getElementDebuff(element: ElementType): StatusEffectType {
        return ELEMENT_DEBUFF_MAP[element];
    }

    /** 检查两个元素是否是相生关系 */
    static isGeneration(first: ElementType, second: ElementType): boolean {
        return GENERATION_MAP[first] === second;
    }

    /** 检查第一个元素是否克制第二个 */
    static isRestriction(attacker: ElementType, defender: ElementType): boolean {
        return RESTRICTION_MAP[attacker] === defender;
    }

    /**
     * 检查本回合打出的元素卡牌是否触发连招
     * - 相生连锁：连续打出相生关系的元素 → 伤害加成
     * - 元素爆发：同回合打出3+张相同元素卡 → 全体伤害
     */
    static checkCombo(elementsPlayed: ElementType[]): ElementCombo | null {
        if (elementsPlayed.length < 2) return null;

        // 检查元素爆发（3张同属性）
        const counts = new Map<ElementType, number>();
        for (const e of elementsPlayed) {
            counts.set(e, (counts.get(e) || 0) + 1);
        }
        for (const [element, count] of counts) {
            if (count >= 3) {
                const combo: ElementCombo = {
                    type: 'burst',
                    element,
                    bonusDamage: count * 3,
                    description: `${ElementSystem.getElementName(element)}元素爆发！`,
                };
                gameEvents.emit(GameEvents.ELEMENT_COMBO, combo);
                return combo;
            }
        }

        // 检查相生连锁（最后两张是相生关系）
        const last = elementsPlayed[elementsPlayed.length - 1];
        const prev = elementsPlayed[elementsPlayed.length - 2];
        if (ElementSystem.isGeneration(prev, last)) {
            const combo: ElementCombo = {
                type: 'chain',
                element: last,
                bonusDamage: 2,
                description: `${ElementSystem.getElementName(prev)}生${ElementSystem.getElementName(last)}！`,
            };
            gameEvents.emit(GameEvents.ELEMENT_COMBO, combo);
            return combo;
        }

        return null;
    }

    /** 获取元素中文名 */
    static getElementName(element: ElementType): string {
        const names: Record<ElementType, string> = {
            [ElementType.Metal]: '金',
            [ElementType.Wood]: '木',
            [ElementType.Water]: '水',
            [ElementType.Fire]: '火',
            [ElementType.Earth]: '土',
        };
        return names[element];
    }

    /** 获取元素颜色（用于UI） */
    static getElementColor(element: ElementType): string {
        const colors: Record<ElementType, string> = {
            [ElementType.Metal]: '#C0C0C0',
            [ElementType.Wood]: '#228B22',
            [ElementType.Water]: '#4169E1',
            [ElementType.Fire]: '#DC143C',
            [ElementType.Earth]: '#DAA520',
        };
        return colors[element];
    }
}
