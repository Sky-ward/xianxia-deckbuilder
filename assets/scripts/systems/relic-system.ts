import { RelicInstance, RelicTrigger } from '../models/relic-model';
import { PlayerModel } from '../models/player-model';
import { BattleModel } from '../models/battle-model';
import { ElementType, StatusEffectType } from '../core/constants';
import { gameEvents } from '../core/event-bus';
import { getRelicsByRarity } from '../data/relic-data';
import { SeededRandom } from '../core/random';

/**
 * 法宝系统 — 处理法宝触发和效果应用
 */
export class RelicSystem {

    /**
     * 触发指定时机的所有法宝效果
     * @param relics   当前携带的法宝列表
     * @param trigger  触发时机
     * @param player   玩家模型（部分效果会修改玩家状态）
     * @param battle   战斗模型（可为null，非战斗时机时）
     * @param context  额外上下文（击杀、出牌等场景传入）
     */
    static trigger(
        relics: RelicInstance[],
        trigger: RelicTrigger,
        player: PlayerModel,
        battle: BattleModel | null = null,
        context: Record<string, unknown> = {},
    ): void {
        for (const relic of relics) {
            if (relic.trigger !== trigger) continue;
            RelicSystem.applyEffect(relic, player, battle, context);
        }
    }

    /**
     * 应用被动法宝效果（Run开始时调用一次）
     */
    static applyPassives(relics: RelicInstance[], player: PlayerModel): void {
        for (const relic of relics) {
            if (relic.trigger !== 'passive') continue;
            RelicSystem.applyEffect(relic, player, null, {});
        }
    }

    private static applyEffect(
        relic: RelicInstance,
        player: PlayerModel,
        battle: BattleModel | null,
        _context: Record<string, unknown>,
    ): void {
        const effect = relic.effect;

        switch (effect.type) {
            case 'max_hp_bonus':
                // 最大HP增加（被动，一次性，由RunModel在创建时应用）
                player.maxHp += effect.value;
                player.hp = Math.min(player.hp + effect.value, player.maxHp);
                break;

            case 'start_battle_energy':
                // 每回合/战斗开始给能量
                if (battle) {
                    battle.player.energy = Math.min(
                        battle.player.energy + effect.value,
                        battle.player.maxEnergy + 3, // 允许超过上限少许
                    );
                }
                break;

            case 'strength_bonus':
                // 力量加成
                if (battle) {
                    battle.player.applyStatus(StatusEffectType.Strength, effect.value);
                }
                break;

            case 'dexterity_bonus':
                // 敏捷加成
                if (battle) {
                    battle.player.applyStatus(StatusEffectType.Dexterity, effect.value);
                }
                break;

            case 'draw_bonus':
                // 摸牌加成
                if (battle) {
                    gameEvents.emit('request_draw', { count: effect.value });
                }
                break;

            case 'heal_on_kill':
                // 击杀/战斗结束/回合开始回血
                player.hp = Math.min(player.hp + effect.value, player.maxHp);
                break;

            case 'block_on_attack':
                // 出攻击牌获得格挡
                if (battle) {
                    battle.player.block += effect.value;
                }
                break;

            case 'energy_on_kill':
                if (battle) {
                    battle.player.energy += effect.value;
                }
                break;

            case 'rest_heal_bonus':
                // 休息时额外回复（由GameManager在休息时读取并应用）
                // 此处仅触发记录，实际逻辑在GameManager.restAtSite
                break;

            case 'element_damage_bonus':
                // 五行伤害加成（由CardEffectSystem在计算伤害时读取）
                // 此处不需要即时应用，数据层直接查询relic列表
                break;

            case 'gold_bonus':
                // 金币奖励（由奖励逻辑读取）
                break;
        }
    }

    /**
     * 获取五行伤害加成百分比（0.0 - 1.0），多个同类型法宝叠加
     */
    static getElementDamageBonus(relics: RelicInstance[], element: ElementType): number {
        let bonus = 0;
        for (const relic of relics) {
            if (relic.effect.type === 'element_damage_bonus' && relic.effect.element === element) {
                bonus += relic.effect.value / 100;
            }
        }
        return bonus;
    }

    /**
     * 获取休息点额外回复百分比总和
     */
    static getRestHealBonus(relics: RelicInstance[]): number {
        let bonus = 0;
        for (const relic of relics) {
            if (relic.effect.type === 'rest_heal_bonus') {
                bonus += relic.effect.value / 100;
            }
        }
        return bonus;
    }

    /**
     * 随机生成奖励法宝（精英/Boss战后）
     * @param existingIds 已有法宝的ID集合（不重复给）
     * @param rarity      法宝稀有度
     */
    static generateRelicReward(
        existingIds: Set<string>,
        rng: SeededRandom,
        rarity: 'common' | 'uncommon' | 'rare' | 'boss' = 'common',
    ): ReturnType<typeof getRelicsByRarity>[0] | null {
        const pool = getRelicsByRarity(rarity).filter(r => !existingIds.has(r.id));
        if (pool.length === 0) return null;
        return rng.pick(pool);
    }
}
