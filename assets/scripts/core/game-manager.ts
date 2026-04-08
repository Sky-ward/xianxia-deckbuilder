import { RunModel } from '../models/run-model';
import { MapNode } from '../models/map-model';
import { CardInstance } from '../models/card-model';
import { EnemyModel } from '../models/enemy-model';
import { PlayerModel } from '../models/player-model';
import { BattleSystem } from '../systems/battle-system';
import { MapGenerator } from '../systems/map-generator';
import { RewardSystem } from '../systems/reward-system';
import { CardLoader } from '../data/card-loader';
import { EnemyLoader } from '../data/enemy-loader';
import { SeededRandom } from './random';
import { GamePhase, MapNodeType, Balance, GameEvents } from './constants';
import { gameEvents } from './event-bus';

/**
 * 游戏管理器 — 单例，管理run生命周期和场景切换
 * 在Cocos Creator中会挂载为持久节点的Component
 */
export class GameManager {
    private static _instance: GameManager | null = null;

    currentPhase: GamePhase = GamePhase.Title;
    currentRun: RunModel | null = null;
    currentBattle: BattleSystem | null = null;
    currentRewardCards: import('../models/card-model').CardData[] = [];
    currentGoldReward: number = 0;

    private rng: SeededRandom | null = null;

    static get instance(): GameManager {
        if (!GameManager._instance) {
            GameManager._instance = new GameManager();
        }
        return GameManager._instance;
    }

    /** 开始新的Run */
    startNewRun(characterId: string = 'jian_xiu'): RunModel {
        const seed = Date.now();
        this.rng = new SeededRandom(seed);

        // 加载角色卡牌数据
        const cardFileData = CardLoader.getCached(characterId);
        if (!cardFileData) {
            throw new Error(`Character data not loaded: ${characterId}`);
        }

        // 获取初始牌组
        const starterDeck = CardLoader.getStarterDeck(cardFileData);

        // 生成地图
        const map = MapGenerator.generateLinearMap(this.rng);

        // 创建Run
        this.currentRun = new RunModel(characterId, starterDeck, map, Balance.STARTING_HP, seed);
        this.currentPhase = GamePhase.Map;

        return this.currentRun;
    }

    /** 进入地图节点 */
    enterNode(): void {
        if (!this.currentRun || !this.rng) return;

        const node = this.currentRun.map.currentNode;
        if (!node) return;

        switch (node.type) {
            case MapNodeType.NormalBattle:
            case MapNodeType.EliteBattle:
            case MapNodeType.Boss:
                this.startBattle(node);
                break;
            case MapNodeType.Rest:
                this.restAtSite();
                break;
            default:
                // Phase 1 只有战斗和休息
                this.advanceMap();
                break;
        }
    }

    /** 开始战斗 */
    private startBattle(node: MapNode): void {
        if (!this.currentRun || !this.rng) return;

        // 创建玩家模型（使用run的HP）
        const player = new PlayerModel(this.currentRun.maxHp);
        player.hp = this.currentRun.hp;

        // 创建敌人实例
        const enemies: EnemyModel[] = [];
        for (const enemyId of node.encounterEnemyIds) {
            const data = EnemyLoader.getEnemyData(enemyId);
            if (data) {
                const actualHp = data.maxHp + this.rng.nextInt(-data.maxHpVariance, data.maxHpVariance);
                enemies.push(new EnemyModel(data, actualHp));
            }
        }

        if (enemies.length === 0) {
            // 没有敌人数据，跳过
            this.advanceMap();
            return;
        }

        // 创建卡牌实例
        const cards = this.currentRun.masterDeck.map(d => new CardInstance(d));

        // 创建战斗系统
        this.currentBattle = new BattleSystem(player, enemies, cards, this.rng);
        this.currentPhase = GamePhase.Battle;
    }

    /** 战斗胜利 */
    onBattleWon(): void {
        if (!this.currentRun || !this.currentBattle || !this.rng) return;

        // 同步HP回run
        this.currentRun.hp = this.currentBattle.battleModel.player.hp;

        // 生成奖励
        const node = this.currentRun.map.currentNode;
        const isElite = node?.type === MapNodeType.EliteBattle;
        const isBoss = node?.type === MapNodeType.Boss;

        this.currentRewardCards = RewardSystem.generateCardRewards(
            this.currentRun.characterId, this.rng,
        );
        this.currentGoldReward = RewardSystem.calculateGoldReward(this.rng, isElite, isBoss);
        this.currentRun.gold += this.currentGoldReward;

        this.currentBattle = null;
        this.currentPhase = GamePhase.Reward;
    }

    /** 战斗失败 */
    onBattleLost(): void {
        this.currentBattle = null;
        this.currentPhase = GamePhase.GameOver;
    }

    /** 选择奖励卡牌 */
    chooseRewardCard(index: number): void {
        if (!this.currentRun) return;

        if (index >= 0 && index < this.currentRewardCards.length) {
            this.currentRun.addCard(this.currentRewardCards[index]);
            gameEvents.emit(GameEvents.CARD_REWARD_CHOSEN, {
                card: this.currentRewardCards[index],
            });
        }

        this.currentRewardCards = [];
        this.advanceMap();
    }

    /** 跳过奖励 */
    skipReward(): void {
        this.currentRewardCards = [];
        gameEvents.emit(GameEvents.CARD_REWARD_SKIPPED);
        this.advanceMap();
    }

    /** 休息点 */
    restAtSite(): void {
        if (!this.currentRun) return;

        const healAmount = Math.floor(this.currentRun.maxHp * Balance.REST_HEAL_PERCENT);
        this.currentRun.heal(healAmount);
        this.advanceMap();
    }

    /** 推进地图 */
    advanceMap(): void {
        if (!this.currentRun) return;

        this.currentRun.map.advance();

        if (this.currentRun.map.isComplete) {
            // 通关！
            this.currentPhase = GamePhase.GameOver;
        } else {
            this.currentPhase = GamePhase.Map;
        }
    }

    /** 返回标题 */
    returnToTitle(): void {
        this.currentRun = null;
        this.currentBattle = null;
        this.currentPhase = GamePhase.Title;
    }

    /** 检查是否胜利通关 */
    get isVictory(): boolean {
        return this.currentRun !== null && this.currentRun.map.isComplete && this.currentRun.isAlive;
    }
}
