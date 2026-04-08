import { BattleModel } from '../models/battle-model';
import { PlayerModel } from '../models/player-model';
import { EnemyModel } from '../models/enemy-model';
import { DeckModel } from '../models/deck-model';
import { CardInstance } from '../models/card-model';
import { BattlePhase, Balance, GameEvents, StatusEffectType, ElementType } from '../core/constants';
import { gameEvents } from '../core/event-bus';
import { CardEffectSystem } from './card-effect-system';
import { EnemyAISystem } from './enemy-ai-system';
import { ElementSystem } from './element-system';
import { SeededRandom } from '../core/random';

/**
 * 战斗系统 — 回合引擎，Phase 1 最核心的文件
 */
export class BattleSystem {
    private battle: BattleModel;
    private rng: SeededRandom;

    // 保存绑定后的引用，确保 on/off 传入的是同一个函数对象
    private _onRequestDrawBound: (data: { count: number }) => void;

    constructor(player: PlayerModel, enemies: EnemyModel[], cards: CardInstance[], rng: SeededRandom) {
        this.rng = rng;
        const deck = new DeckModel(rng);
        deck.initializeFromCards(cards);
        this.battle = new BattleModel(player, enemies, deck);

        // 监听卡牌效果的抽牌请求
        this._onRequestDrawBound = this.onRequestDraw.bind(this);
        gameEvents.on('request_draw', this._onRequestDrawBound);
    }

    get battleModel(): BattleModel {
        return this.battle;
    }

    /** 开始战斗 */
    startBattle(): void {
        gameEvents.emit(GameEvents.BATTLE_STARTED, {
            enemies: this.battle.enemies,
        });
        this.startPlayerTurn();
    }

    /** 开始玩家回合 */
    startPlayerTurn(): void {
        this.battle.turnNumber++;
        this.battle.phase = BattlePhase.PlayerTurnStart;
        this.battle.resetTurnState();

        // 重置格挡
        this.battle.player.resetTurnState();

        // 回复灵力
        this.battle.player.refillEnergy();

        // 状态tick
        this.battle.player.tickStatusOnTurnStart();

        // 抽牌（冰封时少抽1张）
        let drawCount = Balance.HAND_SIZE;
        if (this.battle.player.hasStatus(StatusEffectType.Freeze)) {
            drawCount = Math.max(1, drawCount - 1);
        }
        this.battle.deck.drawCards(drawCount);

        this.battle.phase = BattlePhase.PlayerAction;
        gameEvents.emit(GameEvents.TURN_STARTED, { turnNumber: this.battle.turnNumber });
    }

    /** 玩家打出一张牌 */
    playCard(cardIndex: number, targetEnemyIndex: number = 0): boolean {
        if (this.battle.phase !== BattlePhase.PlayerAction) return false;

        const card = this.battle.deck.hand[cardIndex];
        if (!card) return false;

        // 检查灵力
        if (!this.battle.player.spendEnergy(card.cost)) return false;

        // 确定目标
        const targetEnemy = this.battle.aliveEnemies[targetEnemyIndex] || null;

        // 从手牌移除（先移除再执行效果，避免某些效果检查手牌时出问题）
        this.battle.deck.playCard(card);

        // 记录元素
        this.battle.recordElementPlayed(card.element);

        // 执行卡牌效果
        CardEffectSystem.execute(card, this.battle.player, targetEnemy, this.battle.aliveEnemies);

        // 流血：打出攻击牌时自身受伤
        if (card.type === 'attack' && this.battle.player.hasStatus(StatusEffectType.Bleed)) {
            const bleedDamage = this.battle.player.getStatus(StatusEffectType.Bleed);
            this.battle.player.takeDamage(bleedDamage);
        }

        // 检查五行连招
        ElementSystem.checkCombo(this.battle.elementsPlayedThisTurn);

        // 检查战斗结束
        if (this.battle.isBattleOver) {
            this.endBattle();
            return true;
        }

        return true;
    }

    /** 结束玩家回合 */
    endPlayerTurn(): void {
        if (this.battle.phase !== BattlePhase.PlayerAction) return;

        this.battle.phase = BattlePhase.PlayerTurnEnd;

        // 弃掉剩余手牌
        this.battle.deck.discardHand();

        // 玩家回合结束状态tick
        this.battle.player.tickStatusOnTurnEnd();

        if (this.battle.playerDead) {
            this.endBattle();
            return;
        }

        gameEvents.emit(GameEvents.TURN_ENDED, { turnNumber: this.battle.turnNumber });

        // 执行敌人回合
        this.executeEnemyTurn();
    }

    /** 执行敌人回合 */
    private executeEnemyTurn(): void {
        this.battle.phase = BattlePhase.EnemyTurnStart;
        gameEvents.emit(GameEvents.ENEMY_TURN_STARTED);

        // 重置所有敌人格挡
        for (const enemy of this.battle.aliveEnemies) {
            enemy.resetTurnState();
        }

        this.battle.phase = BattlePhase.EnemyAction;

        // 每个敌人执行意图
        for (const enemy of this.battle.aliveEnemies) {
            EnemyAISystem.executeEnemyTurn(enemy, this.battle.player);

            if (this.battle.playerDead) {
                this.endBattle();
                return;
            }
        }

        // 敌人回合结束，状态tick
        this.battle.phase = BattlePhase.EnemyTurnEnd;
        for (const enemy of this.battle.aliveEnemies) {
            enemy.tickStatusOnTurnEnd();
        }

        gameEvents.emit(GameEvents.ENEMY_TURN_ENDED);

        // 检查是否有敌人因DOT死亡
        if (this.battle.allEnemiesDead) {
            this.endBattle();
            return;
        }

        // 开始下一个玩家回合
        this.startPlayerTurn();
    }

    /** 结束战斗 */
    private endBattle(): void {
        if (this.battle.allEnemiesDead) {
            this.battle.phase = BattlePhase.Victory;
            gameEvents.emit(GameEvents.BATTLE_WON);
        } else {
            this.battle.phase = BattlePhase.Defeat;
            gameEvents.emit(GameEvents.BATTLE_LOST);
        }

        // 清理事件监听
        gameEvents.off('request_draw', this._onRequestDrawBound);
    }

    /** 响应卡牌效果的抽牌请求 */
    private onRequestDraw(data: { count: number }): void {
        this.battle.deck.drawCards(data.count);
    }

    /** 获取当前可打出的手牌索引 */
    getPlayableCardIndices(): number[] {
        const indices: number[] = [];
        for (let i = 0; i < this.battle.deck.hand.length; i++) {
            if (this.battle.deck.hand[i].cost <= this.battle.player.energy) {
                indices.push(i);
            }
        }
        return indices;
    }

    /** 销毁 */
    destroy(): void {
        gameEvents.off('request_draw', this._onRequestDrawBound);
    }
}
