import { RelicData } from '../models/relic-model';
import { ElementType } from '../core/constants';

/**
 * 法宝静态数据表
 * 仙侠主题：剑修、丹修、符修共用的被动法宝
 */
export const ALL_RELICS: RelicData[] = [
    // ─── Starter 法宝 ───────────────────────────────────────────────
    {
        id: 'burning_blood',
        nameZh: '血魄',
        nameEn: 'Burning Blood',
        descZh: '每场战斗结束后回复6点生命',
        descEn: 'At the end of each battle, heal 6 HP.',
        rarity: 'starter',
        trigger: 'on_battle_start',
        effect: { type: 'heal_on_kill', value: 6 },
    },

    // ─── Common 法宝 ─────────────────────────────────────────────────
    {
        id: 'jade_ring',
        nameZh: '翡翠戒',
        nameEn: 'Jade Ring',
        descZh: '每回合开始时额外获得1点灵力',
        descEn: 'At the start of each turn, gain 1 extra energy.',
        rarity: 'common',
        trigger: 'on_turn_start',
        effect: { type: 'start_battle_energy', value: 1 },
    },
    {
        id: 'iron_plate',
        nameZh: '玄铁护板',
        nameEn: 'Iron Plate',
        descZh: '最大HP增加10',
        descEn: 'Increase max HP by 10.',
        rarity: 'common',
        trigger: 'passive',
        effect: { type: 'max_hp_bonus', value: 10 },
    },
    {
        id: 'ancient_tea',
        nameZh: '古茗',
        nameEn: 'Ancient Tea',
        descZh: '每场战斗开始时多摸1张牌',
        descEn: 'Draw 1 extra card at the start of each combat.',
        rarity: 'common',
        trigger: 'on_battle_start',
        effect: { type: 'draw_bonus', value: 1 },
    },
    {
        id: 'spirit_stone',
        nameZh: '灵石',
        nameEn: 'Spirit Stone',
        descZh: '击杀敌人后回复2点生命',
        descEn: 'Heal 2 HP when you kill an enemy.',
        rarity: 'common',
        trigger: 'on_kill',
        effect: { type: 'heal_on_kill', value: 2 },
    },
    {
        id: 'golden_idol',
        nameZh: '金像',
        nameEn: 'Golden Idol',
        descZh: '休息时额外恢复10%最大HP',
        descEn: 'Heal an additional 10% max HP at Rest Sites.',
        rarity: 'common',
        trigger: 'on_rest',
        effect: { type: 'rest_heal_bonus', value: 10 },
    },

    // ─── Uncommon 法宝 ───────────────────────────────────────────────
    {
        id: 'sword_heart',
        nameZh: '剑心',
        nameEn: 'Sword Heart',
        descZh: '每场战斗开始时力量+2',
        descEn: 'Gain 2 Strength at the start of each combat.',
        rarity: 'uncommon',
        trigger: 'on_battle_start',
        effect: { type: 'strength_bonus', value: 2 },
    },
    {
        id: 'tortoise_shell',
        nameZh: '玄武壳',
        nameEn: 'Tortoise Shell',
        descZh: '每场战斗开始时获得4点格挡',
        descEn: 'Gain 4 Block at the start of each combat.',
        rarity: 'uncommon',
        trigger: 'on_battle_start',
        effect: { type: 'dexterity_bonus', value: 4 },
    },
    {
        id: 'fire_pearl',
        nameZh: '火灵珠',
        nameEn: 'Fire Pearl',
        descZh: '火属性伤害+20%',
        descEn: 'Fire element damage +20%.',
        rarity: 'uncommon',
        trigger: 'passive',
        effect: { type: 'element_damage_bonus', value: 20, element: ElementType.Fire },
    },
    {
        id: 'metal_essence',
        nameZh: '金精',
        nameEn: 'Metal Essence',
        descZh: '金属性伤害+20%',
        descEn: 'Metal element damage +20%.',
        rarity: 'uncommon',
        trigger: 'passive',
        effect: { type: 'element_damage_bonus', value: 20, element: ElementType.Metal },
    },
    {
        id: 'water_lotus',
        nameZh: '水月莲',
        nameEn: 'Water Lotus',
        descZh: '水属性伤害+20%',
        descEn: 'Water element damage +20%.',
        rarity: 'uncommon',
        trigger: 'passive',
        effect: { type: 'element_damage_bonus', value: 20, element: ElementType.Water },
    },
    {
        id: 'wood_spirit',
        nameZh: '木灵精',
        nameEn: 'Wood Spirit',
        descZh: '木属性伤害+20%',
        descEn: 'Wood element damage +20%.',
        rarity: 'uncommon',
        trigger: 'passive',
        effect: { type: 'element_damage_bonus', value: 20, element: ElementType.Wood },
    },
    {
        id: 'earth_core',
        nameZh: '地煞核',
        nameEn: 'Earth Core',
        descZh: '土属性伤害+20%',
        descEn: 'Earth element damage +20%.',
        rarity: 'uncommon',
        trigger: 'passive',
        effect: { type: 'element_damage_bonus', value: 20, element: ElementType.Earth },
    },
    {
        id: 'blood_vial',
        nameZh: '血瓶',
        nameEn: 'Blood Vial',
        descZh: '每回合开始时回复2点生命',
        descEn: 'Heal 2 HP at the start of each turn.',
        rarity: 'uncommon',
        trigger: 'on_turn_start',
        effect: { type: 'heal_on_kill', value: 2 },
    },
    {
        id: 'utility_belt',
        nameZh: '乾坤袋',
        nameEn: 'Utility Belt',
        descZh: '最大HP增加20',
        descEn: 'Increase max HP by 20.',
        rarity: 'uncommon',
        trigger: 'passive',
        effect: { type: 'max_hp_bonus', value: 20 },
    },

    // ─── Rare 法宝 ────────────────────────────────────────────────────
    {
        id: 'philosophical_stone',
        nameZh: '炼道石',
        nameEn: 'Philosopher Stone',
        descZh: '每场战斗开始时力量+4，但敌人攻击+1',
        descEn: 'Gain 4 Strength at combat start (enemies also deal +1 damage).',
        rarity: 'rare',
        trigger: 'on_battle_start',
        effect: { type: 'strength_bonus', value: 4 },
    },
    {
        id: 'dead_branch',
        nameZh: '枯木逢春',
        nameEn: 'Dead Branch',
        descZh: '每次消耗牌时，从牌库中随机添加一张牌到手牌',
        descEn: 'Whenever you Exhaust a card, add a random card to your hand.',
        rarity: 'rare',
        trigger: 'on_card_played',
        effect: { type: 'draw_bonus', value: 1 },
    },
    {
        id: 'sozu',
        nameZh: '道法自然',
        nameEn: 'Sozu',
        descZh: '每回合开始时额外获得2点灵力',
        descEn: 'At the start of each turn, gain 2 extra energy.',
        rarity: 'rare',
        trigger: 'on_turn_start',
        effect: { type: 'start_battle_energy', value: 2 },
    },
    {
        id: 'champion_belt',
        nameZh: '霸王带',
        nameEn: 'Champion Belt',
        descZh: '出攻击牌时给目标施加1层虚弱',
        descEn: 'When you play an Attack, apply 1 Weak to the target.',
        rarity: 'rare',
        trigger: 'on_attack_played',
        effect: { type: 'strength_bonus', value: 1 },
    },

    // ─── Boss 法宝 ────────────────────────────────────────────────────
    {
        id: 'runic_dome',
        nameZh: '符文穹',
        nameEn: 'Runic Dome',
        descZh: '看不到敌人意图，但每回合开始时额外获得1点灵力',
        descEn: "You can't see enemy intent, but gain 1 extra energy each turn.",
        rarity: 'boss',
        trigger: 'on_turn_start',
        effect: { type: 'start_battle_energy', value: 1 },
    },
    {
        id: 'cursed_key',
        nameZh: '诅咒之钥',
        nameEn: 'Cursed Key',
        descZh: '打开宝箱时额外获得一张诅咒牌，但金库奖励翻倍',
        descEn: 'Gain an extra Curse when opening chests, but Treasure rewards are doubled.',
        rarity: 'boss',
        trigger: 'passive',
        effect: { type: 'gold_bonus', value: 50 },
    },
    {
        id: 'black_star',
        nameZh: '黑星石',
        nameEn: 'Black Star',
        descZh: '精英战斗奖励提升：总是包含法宝',
        descEn: 'Elite fights always drop a relic as a reward.',
        rarity: 'boss',
        trigger: 'passive',
        effect: { type: 'gold_bonus', value: 0 },
    },
];

/** 按稀有度获取法宝 */
export function getRelicsByRarity(rarity: RelicData['rarity']): RelicData[] {
    return ALL_RELICS.filter(r => r.rarity === rarity);
}

/** 按ID获取法宝 */
export function getRelicById(id: string): RelicData | undefined {
    return ALL_RELICS.find(r => r.id === id);
}
