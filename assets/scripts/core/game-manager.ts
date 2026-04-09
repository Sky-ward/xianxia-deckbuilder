import { RunModel } from '../models/run-model';
import { MapNode } from '../models/map-model';
import { CardInstance } from '../models/card-model';
import { EnemyModel } from '../models/enemy-model';
import { PlayerModel } from '../models/player-model';
import { BattleSystem } from '../systems/battle-system';
import { MapGenerator } from '../systems/map-generator';
import { RewardSystem } from '../systems/reward-system';
import { EventSystem, EventData, EventChoice } from '../systems/event-system';
import { ShopSystem, ShopData } from '../systems/shop-system';
import { UpgradeSystem } from '../systems/upgrade-system';
import { RelicSystem } from '../systems/relic-system';
import { SaveSystem } from '../systems/save-system';
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

    /** 当前事件（事件节点） */
    currentEvent: EventData | null = null;
    /** 当前商店数据 */
    currentShop: ShopData | null = null;

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

        // 生成地图（三幕分支DAG）
        const map = MapGenerator.generateBranchingMap(this.rng);

        // 创建Run
        this.currentRun = new RunModel(characterId, starterDeck, map, Balance.STARTING_HP, seed);
        this.currentPhase = GamePhase.Map;

        // 重置商店计数器
        ShopSystem.reset();

        return this.currentRun;
    }

    /**
     * 选择并进入地图节点（分支地图版本）
     * @param nodeId 要进入的节点ID（省略则进入第一个可访问节点）
     */
    selectMapNode(nodeId?: number): void {
        if (!this.currentRun || !this.rng) return;

        const map = this.currentRun.map;

        // 确定目标节点
        let targetNode = nodeId !== undefined
            ? map.getNode(nodeId)
            : map.startNodes[0] ?? null;

        if (!targetNode) return;

        // 进入节点
        if (!map.enterNode(targetNode.id)) return;

        this.enterNode();
    }

    /** 进入当前节点（已由selectMapNode或其他方法设置currentNodeId） */
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
            case MapNodeType.Shop:
                this.enterShop();
                break;
            case MapNodeType.Event:
                this.enterEvent();
                break;
            case MapNodeType.Treasure:
                this.openTreasure();
                break;
            default:
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

        if (this.currentRun) {
            SaveSystem.recordLoss(this.currentRun.characterId, this.currentRun.currentFloor);
            SaveSystem.deleteRunSave();
        }
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

    /**
     * 休息点 — 玩家选择：恢复HP 或 升级卡牌
     * UI调用 restHeal() 或 restUpgrade(cardId) 来执行选择
     */
    restAtSite(): void {
        if (!this.currentRun) return;
        // 通知UI进入休息场景，让玩家选择
        const upgradeableCards = UpgradeSystem.getUpgradeableCards(this.currentRun);
        gameEvents.emit('rest_entered', {
            healAmount: Math.floor(this.currentRun.maxHp * Balance.REST_HEAL_PERCENT),
            upgradeableCards,
        });
    }

    /** 休息点选择：回复HP */
    restHeal(): void {
        if (!this.currentRun) return;

        let healAmount = Math.floor(this.currentRun.maxHp * Balance.REST_HEAL_PERCENT);
        // 应用法宝加成
        const bonus = RelicSystem.getRestHealBonus(this.currentRun.relics);
        healAmount += Math.floor(this.currentRun.maxHp * bonus);

        this.currentRun.heal(healAmount);
        gameEvents.emit('rest_completed', { healAmount });
        this.advanceMap();
    }

    /** 休息点选择：升级卡牌 */
    restUpgrade(cardId: string): void {
        if (!this.currentRun) return;

        const upgraded = UpgradeSystem.upgradeCard(this.currentRun, cardId);
        gameEvents.emit('card_upgraded', { card: upgraded });
        this.advanceMap();
    }

    /** 进入商店 */
    private enterShop(): void {
        if (!this.currentRun || !this.rng) return;

        this.currentShop = ShopSystem.generateShop(this.currentRun, this.rng);
        gameEvents.emit('shop_entered', { shop: this.currentShop });
    }

    /** 购买商店卡牌 */
    buyShopCard(index: number): boolean {
        if (!this.currentRun || !this.currentShop) return false;
        return ShopSystem.buyCard(this.currentRun, this.currentShop, index);
    }

    /** 购买商店法宝 */
    buyShopRelic(index: number): boolean {
        if (!this.currentRun || !this.currentShop) return false;
        return ShopSystem.buyRelic(this.currentRun, this.currentShop, index);
    }

    /** 商店移除卡牌 */
    shopRemoveCard(cardId: string): boolean {
        if (!this.currentRun || !this.currentShop) return false;
        return ShopSystem.removeCard(this.currentRun, this.currentShop, cardId);
    }

    /** 离开商店 */
    leaveShop(): void {
        this.currentShop = null;
        this.advanceMap();
    }

    /** 进入事件 */
    private enterEvent(): void {
        if (!this.rng) return;

        this.currentEvent = EventSystem.getRandomEvent(this.rng);
        if (this.currentEvent) {
            gameEvents.emit('event_entered', { event: this.currentEvent });
        } else {
            this.advanceMap();
        }
    }

    /** 执行事件选项 */
    chooseEventOption(choiceId: string): void {
        if (!this.currentRun || !this.currentEvent || !this.rng) return;

        const choice = this.currentEvent.choices.find(c => c.id === choiceId);
        if (!choice) return;

        const result = EventSystem.executeChoice(choice, this.currentRun, this.rng);

        // 如果事件给了卡牌，直接加入牌组
        if (result.cardToAdd) {
            this.currentRun.addCard(result.cardToAdd);
        }

        gameEvents.emit('event_resolved', { result });
        this.currentEvent = null;

        // 如果需要移除卡牌，通知UI让玩家选择
        if (result.removeCard) {
            gameEvents.emit('remove_card_prompt', {
                cards: this.currentRun.masterDeck,
            });
        } else {
            this.advanceMap();
        }
    }

    /** 事件中移除卡牌确认 */
    confirmRemoveCard(cardId: string): void {
        if (!this.currentRun) return;
        this.currentRun.removeCard(cardId);
        this.advanceMap();
    }

    /** 打开宝藏 */
    private openTreasure(): void {
        if (!this.currentRun || !this.rng) return;

        const relic = RelicSystem.generateRelicReward(this.currentRun.relicIds, this.rng, 'common');
        if (relic) {
            this.currentRun.addRelic(relic);
            gameEvents.emit('treasure_found', { relic });
        }
        this.advanceMap();
    }

    /** 完成当前节点并返回地图（分支地图：让玩家选择下一个节点） */
    advanceMap(): void {
        if (!this.currentRun) return;

        this.currentRun.map.completeCurrentNode();

        if (this.currentRun.map.isComplete) {
            // 通关！
            SaveSystem.recordWin(this.currentRun.characterId, this.currentRun.currentFloor);
            SaveSystem.deleteRunSave();
            this.currentPhase = GamePhase.GameOver;
        } else {
            this.currentPhase = GamePhase.Map;
            // 自动存档
            this.saveGame();
        }
    }

    /** 返回标题 */
    returnToTitle(): void {
        this.currentRun = null;
        this.currentBattle = null;
        this.currentEvent = null;
        this.currentShop = null;
        this.currentPhase = GamePhase.Title;
    }

    /** 检查是否胜利通关 */
    get isVictory(): boolean {
        return this.currentRun !== null && this.currentRun.map.isComplete && this.currentRun.isAlive;
    }

    // ─── 存档 ────────────────────────────────────────────────────

    /** 保存当前Run */
    saveGame(): void {
        if (this.currentRun) {
            SaveSystem.saveRun(this.currentRun);
        }
    }

    /** 尝试加载Run存档 */
    loadGame(): boolean {
        const run = SaveSystem.loadRun();
        if (!run) return false;

        this.currentRun = run;
        this.rng = new SeededRandom(run.seed);
        this.currentPhase = GamePhase.Map;
        ShopSystem.reset();
        return true;
    }

    /** 是否有存档 */
    get hasSave(): boolean {
        return SaveSystem.hasRunSave();
    }

    /** 删除存档（通关或死亡后） */
    deleteSave(): void {
        SaveSystem.deleteRunSave();
    }
}
