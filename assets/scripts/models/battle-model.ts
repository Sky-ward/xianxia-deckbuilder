import { PlayerModel } from './player-model';
import { EnemyModel } from './enemy-model';
import { DeckModel } from './deck-model';
import { CardInstance } from './card-model';
import { BattlePhase, ElementType } from '../core/constants';

/**
 * 战斗状态容器 — 持有一场战斗的全部状态
 */
export class BattleModel {
    player: PlayerModel;
    enemies: EnemyModel[];
    deck: DeckModel;

    phase: BattlePhase = BattlePhase.PlayerTurnStart;
    turnNumber: number = 0;

    /** 本回合打出的元素（用于五行连招判定） */
    elementsPlayedThisTurn: ElementType[] = [];

    /** 本回合打出的卡牌数量 */
    cardsPlayedThisTurn: number = 0;

    constructor(player: PlayerModel, enemies: EnemyModel[], deck: DeckModel) {
        this.player = player;
        this.enemies = enemies;
        this.deck = deck;
    }

    /** 获取存活的敌人 */
    get aliveEnemies(): EnemyModel[] {
        return this.enemies.filter(e => e.isAlive);
    }

    /** 所有敌人都死了？ */
    get allEnemiesDead(): boolean {
        return this.enemies.every(e => !e.isAlive);
    }

    /** 玩家死了？ */
    get playerDead(): boolean {
        return !this.player.isAlive;
    }

    /** 战斗是否结束 */
    get isBattleOver(): boolean {
        return this.allEnemiesDead || this.playerDead;
    }

    /** 重置回合状态 */
    resetTurnState(): void {
        this.elementsPlayedThisTurn = [];
        this.cardsPlayedThisTurn = 0;
    }

    /** 记录打出的元素 */
    recordElementPlayed(element: ElementType | null): void {
        if (element) {
            this.elementsPlayedThisTurn.push(element);
        }
        this.cardsPlayedThisTurn++;
    }
}
