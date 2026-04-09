import { ElementType } from '../core/constants';

/** 法宝触发时机 */
export type RelicTrigger =
    | 'passive'           // 被动效果（开始战斗时一次性生效）
    | 'on_battle_start'   // 每场战斗开始
    | 'on_turn_start'     // 每回合开始
    | 'on_turn_end'       // 每回合结束
    | 'on_card_played'    // 每次出牌
    | 'on_attack_played'  // 出攻击牌
    | 'on_skill_played'   // 出技能牌
    | 'on_damage_taken'   // 受到伤害
    | 'on_kill'           // 击杀敌人
    | 'on_block_gained'   // 获得格挡
    | 'on_rest';          // 在休息地点

/** 法宝效果类型 */
export type RelicEffectType =
    | 'max_hp_bonus'          // 增加最大HP
    | 'start_battle_energy'   // 战斗开始额外获得灵力
    | 'strength_bonus'        // 增加力量（等效永久伤害加成）
    | 'dexterity_bonus'       // 增加敏捷（等效永久格挡加成）
    | 'draw_bonus'            // 每回合多摸牌
    | 'gold_bonus'            // 获得金币
    | 'heal_on_kill'          // 击杀回血
    | 'block_on_attack'       // 出攻击牌获得格挡
    | 'energy_on_kill'        // 击杀获得灵力
    | 'rest_heal_bonus'       // 休息时多回复HP百分比
    | 'element_damage_bonus'; // 特定五行伤害加成

/** 法宝效果描述 */
export interface RelicEffect {
    type: RelicEffectType;
    value: number;
    /** 仅element_damage_bonus使用 */
    element?: ElementType;
}

/** 法宝静态数据 */
export interface RelicData {
    id: string;
    nameZh: string;
    nameEn: string;
    descZh: string;
    descEn: string;
    rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'boss';
    trigger: RelicTrigger;
    effect: RelicEffect;
}

/** 法宝运行时实例 */
export class RelicInstance {
    readonly data: RelicData;

    /** 计数器（某些法宝需要追踪触发次数） */
    counter: number = 0;

    constructor(data: RelicData) {
        this.data = data;
    }

    get id(): string { return this.data.id; }
    get nameZh(): string { return this.data.nameZh; }
    get trigger(): RelicTrigger { return this.data.trigger; }
    get effect(): RelicEffect { return this.data.effect; }
}
