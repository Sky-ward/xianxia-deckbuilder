import { CardType, CardRarity, ElementType, TargetType, StatusEffectType } from '../core/constants';

/** 卡牌效果描述（JSON可序列化） */
export interface CardEffect {
    type: 'damage' | 'block' | 'draw' | 'gain_energy' | 'apply_status' | 'heal' | 'exhaust_random' | 'damage_all';
    value: number;
    target?: TargetType;
    statusType?: StatusEffectType;
    statusDuration?: number;
}

/** 卡牌静态数据定义（从JSON加载） */
export interface CardData {
    id: string;
    nameZh: string;
    nameEn: string;
    descZh: string;
    descEn: string;
    type: CardType;
    rarity: CardRarity;
    cost: number;
    element: ElementType | null;
    target: TargetType;
    effects: CardEffect[];
    upgradeId: string | null;
}

/** 卡牌运行时实例（战斗中使用） */
export class CardInstance {
    readonly data: CardData;
    readonly instanceId: number;

    /** 临时费用修正（本回合有效） */
    costModifier: number = 0;

    private static nextId = 0;

    constructor(data: CardData) {
        this.data = data;
        this.instanceId = CardInstance.nextId++;
    }

    get id(): string { return this.data.id; }
    get nameZh(): string { return this.data.nameZh; }
    get nameEn(): string { return this.data.nameEn; }
    get type(): CardType { return this.data.type; }
    get rarity(): CardRarity { return this.data.rarity; }
    get element(): ElementType | null { return this.data.element; }
    get target(): TargetType { return this.data.target; }
    get effects(): CardEffect[] { return this.data.effects; }

    /** 实际费用（基础费用 + 修正，最低0） */
    get cost(): number {
        return Math.max(0, this.data.cost + this.costModifier);
    }

    /** 重置临时修正 */
    resetModifiers(): void {
        this.costModifier = 0;
    }

    /** 获取带数值替换的描述文本 */
    getDescription(lang: 'zh' | 'en' = 'zh'): string {
        let desc = lang === 'zh' ? this.data.descZh : this.data.descEn;
        for (const effect of this.data.effects) {
            desc = desc.replace(`{${effect.type}}`, String(effect.value));
            desc = desc.replace('{value}', String(effect.value));
        }
        return desc;
    }
}
