import { EnemyModel } from '../models/enemy-model';
import { PlayerModel } from '../models/player-model';
import { IntentType, StatusEffectType, GameEvents } from '../core/constants';
import { gameEvents } from '../core/event-bus';

/**
 * 敌人AI系统 — 执行敌人意图
 */
export class EnemyAISystem {

    /** 执行单个敌人的回合 */
    static executeEnemyTurn(enemy: EnemyModel, player: PlayerModel): void {
        if (!enemy.isAlive) return;

        const intent = enemy.currentIntent;

        switch (intent.type) {
            case IntentType.Attack:
                EnemyAISystem.executeAttack(enemy, player, intent.value, intent.times || 1);
                break;

            case IntentType.Defend:
                enemy.gainBlock(intent.value);
                break;

            case IntentType.Buff:
                if (intent.statusType) {
                    enemy.applyStatus(intent.statusType, intent.statusStacks || intent.value);
                }
                break;

            case IntentType.Debuff:
                if (intent.statusType) {
                    player.applyStatus(intent.statusType, intent.statusStacks || intent.value);
                }
                break;

            case IntentType.AttackDebuff:
                EnemyAISystem.executeAttack(enemy, player, intent.value, intent.times || 1);
                if (intent.statusType) {
                    player.applyStatus(intent.statusType, intent.statusStacks || 1);
                }
                break;
        }

        // 推进到下一个意图
        enemy.advanceIntent();
    }

    /** 执行攻击（可能多段） */
    private static executeAttack(
        enemy: EnemyModel,
        player: PlayerModel,
        baseDamage: number,
        times: number,
    ): void {
        for (let i = 0; i < times; i++) {
            if (!player.isAlive) break;

            let damage = baseDamage;

            // 力量加成
            damage += enemy.getStatus(StatusEffectType.Strength);

            // 虚弱
            if (enemy.hasStatus(StatusEffectType.Weak)) {
                damage = Math.floor(damage * 0.75);
            }

            // 易伤（玩家）
            if (player.hasStatus(StatusEffectType.Vulnerable)) {
                damage = Math.floor(damage * 1.5);
            }

            damage = Math.max(0, damage);
            player.takeDamage(damage);

            gameEvents.emit(GameEvents.DAMAGE_DEALT, {
                source: 'enemy',
                sourceId: enemy.instanceId,
                targetId: 'player',
                damage,
            });
        }
    }

    /** 获取意图的中文描述 */
    static getIntentDescription(enemy: EnemyModel): string {
        const intent = enemy.currentIntent;
        switch (intent.type) {
            case IntentType.Attack:
                return intent.times && intent.times > 1
                    ? `攻击 ${intent.value}×${intent.times}`
                    : `攻击 ${intent.value}`;
            case IntentType.Defend:
                return `防御 ${intent.value}`;
            case IntentType.Buff:
                return '强化';
            case IntentType.Debuff:
                return '施法';
            case IntentType.AttackDebuff:
                return `攻击 ${intent.value} + 施法`;
            default:
                return '???';
        }
    }
}
