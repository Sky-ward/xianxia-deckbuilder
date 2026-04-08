import { CardInstance, CardEffect } from '../models/card-model';
import { PlayerModel, ICombatant } from '../models/player-model';
import { EnemyModel } from '../models/enemy-model';
import { StatusEffectType, GameEvents } from '../core/constants';
import { gameEvents } from '../core/event-bus';
import { ElementSystem } from './element-system';

/**
 * 卡牌效果执行系统 — 解析并执行卡牌的所有效果
 */
export class CardEffectSystem {

    /**
     * 执行一张卡牌的所有效果
     */
    static execute(
        card: CardInstance,
        player: PlayerModel,
        targetEnemy: EnemyModel | null,
        allEnemies: EnemyModel[],
    ): void {
        for (const effect of card.effects) {
            CardEffectSystem.executeEffect(effect, card, player, targetEnemy, allEnemies);
        }
    }

    private static executeEffect(
        effect: CardEffect,
        card: CardInstance,
        player: PlayerModel,
        targetEnemy: EnemyModel | null,
        allEnemies: EnemyModel[],
    ): void {
        switch (effect.type) {
            case 'damage':
                if (targetEnemy && targetEnemy.isAlive) {
                    const damage = CardEffectSystem.calculateDamage(effect.value, player, targetEnemy, card);
                    targetEnemy.takeDamage(damage);
                    gameEvents.emit(GameEvents.DAMAGE_DEALT, {
                        source: 'player',
                        targetId: targetEnemy.instanceId,
                        damage,
                        element: card.element,
                    });
                }
                break;

            case 'damage_all':
                for (const enemy of allEnemies) {
                    if (!enemy.isAlive) continue;
                    const damage = CardEffectSystem.calculateDamage(effect.value, player, enemy, card);
                    enemy.takeDamage(damage);
                    gameEvents.emit(GameEvents.DAMAGE_DEALT, {
                        source: 'player',
                        targetId: enemy.instanceId,
                        damage,
                        element: card.element,
                    });
                }
                break;

            case 'block':
                player.gainBlock(CardEffectSystem.calculateBlock(effect.value, player));
                break;

            case 'draw':
                // 抽牌由 BattleSystem 监听事件处理（因为需要访问 DeckModel）
                gameEvents.emit('request_draw', { count: effect.value });
                break;

            case 'gain_energy':
                player.energy = Math.min(player.energy + effect.value, player.maxEnergy + 3);
                gameEvents.emit(GameEvents.ENERGY_CHANGED, {
                    energy: player.energy,
                    maxEnergy: player.maxEnergy,
                });
                break;

            case 'apply_status':
                if (effect.statusType) {
                    const target = effect.target === 'self' ? player : targetEnemy;
                    if (target) {
                        target.applyStatus(effect.statusType, effect.value);
                    }
                }
                break;

            case 'heal':
                player.heal(effect.value);
                break;
        }
    }

    /** 计算实际伤害（含力量、虚弱、易伤、五行克制） */
    static calculateDamage(
        baseDamage: number,
        attacker: ICombatant,
        defender: ICombatant,
        card: CardInstance,
    ): number {
        let damage = baseDamage;

        // 力量加成
        damage += attacker.getStatus(StatusEffectType.Strength);

        // 虚弱减伤（攻击方）
        if (attacker.hasStatus(StatusEffectType.Weak)) {
            damage = Math.floor(damage * 0.75);
        }

        // 五行克制倍率
        const defenderElement = (defender as EnemyModel).element ?? null;
        const elementMultiplier = ElementSystem.getDamageMultiplier(card.element, defenderElement);
        damage = Math.floor(damage * elementMultiplier);

        // 易伤（防御方）
        if (defender.hasStatus(StatusEffectType.Vulnerable)) {
            damage = Math.floor(damage * 1.5);
        }

        // 流血（攻击方打出攻击牌时自身受伤，不在这里处理，由BattleSystem处理）

        return Math.max(0, damage);
    }

    /** 计算实际格挡值（含敏捷） */
    static calculateBlock(baseBlock: number, player: PlayerModel): number {
        let block = baseBlock;
        block += player.getStatus(StatusEffectType.Dexterity);
        return Math.max(0, block);
    }
}
