import { _decorator, Component, Node, director } from 'cc';
import { PlayerDisplay } from './player-display';
import { EnemyDisplay } from './enemy-display';
import { HandDisplay } from './hand-display';
import { EnergyDisplay } from './energy-display';
import { EndTurnButton } from './end-turn-button';
import { GameManager } from '../../core/game-manager';
import { gameEvents } from '../../core/event-bus';
import { GameEvents, GamePhase } from '../../core/constants';

const { ccclass, property } = _decorator;

/**
 * 战斗场景根控制器
 * 挂载到战斗场景的 Canvas/BattleScene 根节点上
 * 负责初始化战斗、连接各子组件与游戏系统
 */
@ccclass('BattleSceneCtrl')
export class BattleSceneCtrl extends Component {
    /** 玩家状态显示 */
    @property(PlayerDisplay)
    playerDisplay: PlayerDisplay = null!;

    /** 敌人显示节点列表（最多支持3个敌人） */
    @property([EnemyDisplay])
    enemyDisplays: EnemyDisplay[] = [];

    /** 手牌显示区域 */
    @property(HandDisplay)
    handDisplay: HandDisplay = null!;

    /** 灵力显示 */
    @property(EnergyDisplay)
    energyDisplay: EnergyDisplay = null!;

    /** 结束回合按钮 */
    @property(EndTurnButton)
    endTurnButton: EndTurnButton = null!;

    /** 胜利提示节点（无战斗时隐藏） */
    @property(Node)
    victoryPanel: Node = null!;

    /** 失败提示节点 */
    @property(Node)
    defeatPanel: Node = null!;

    onLoad() {
        // 监听战斗结束事件
        gameEvents.on(GameEvents.BATTLE_WON,  this._onBattleWon,  this);
        gameEvents.on(GameEvents.BATTLE_LOST, this._onBattleLost, this);

        // 隐藏结束面板
        if (this.victoryPanel) this.victoryPanel.active = false;
        if (this.defeatPanel)  this.defeatPanel.active  = false;
    }

    start() {
        this._initBattle();
    }

    onDestroy() {
        gameEvents.off(GameEvents.BATTLE_WON,  this._onBattleWon,  this);
        gameEvents.off(GameEvents.BATTLE_LOST, this._onBattleLost, this);
    }

    // ---- 初始化 ----

    private _initBattle() {
        const gm = GameManager.instance;
        const battle = gm.currentBattle;

        if (!battle) {
            console.warn('[BattleSceneCtrl] 没有当前战斗实例，请先通过 GameManager.enterNode() 开始战斗');
            return;
        }

        const bm = battle.battleModel;

        // 初始化玩家显示
        if (this.playerDisplay) {
            this.playerDisplay.initFromPlayer(bm.player);
        }

        // 初始化敌人显示（按顺序绑定）
        const enemies = bm.enemies;
        for (let i = 0; i < this.enemyDisplays.length; i++) {
            if (i < enemies.length) {
                this.enemyDisplays[i].node.active = true;
                this.enemyDisplays[i].initFromEnemy(enemies[i]);
            } else {
                // 隐藏多余的敌人槽位
                this.enemyDisplays[i].node.active = false;
            }
        }

        // 初始化灵力显示
        if (this.energyDisplay) {
            this.energyDisplay.setEnergy(bm.player.energy, bm.player.maxEnergy);
        }

        // 初始化手牌显示
        if (this.handDisplay) {
            this.handDisplay.onPlayCard = (cardIndex) => {
                this._onCardPlayed(cardIndex);
            };
            // 战斗开始前手牌为空，startBattle() 会触发 HAND_UPDATED
        }

        // 结束回合按钮
        if (this.endTurnButton) {
            this.endTurnButton.onEndTurn = () => {
                this._onEndTurn();
            };
        }

        // 开始战斗（触发抽牌等事件）
        battle.startBattle();
    }

    // ---- 交互处理 ----

    /** 玩家打出一张手牌 */
    private _onCardPlayed(cardIndex: number) {
        const battle = GameManager.instance.currentBattle;
        if (!battle) return;

        // Phase 1：默认目标为第0号存活敌人
        const success = battle.playCard(cardIndex, 0);
        if (!success) {
            console.log('[BattleSceneCtrl] 打牌失败（灵力不足或阶段不对）');
        }
    }

    /** 玩家点击结束回合 */
    private _onEndTurn() {
        const battle = GameManager.instance.currentBattle;
        if (!battle) return;
        battle.endPlayerTurn();
    }

    // ---- 战斗结束 ----

    private _onBattleWon() {
        if (this.victoryPanel) this.victoryPanel.active = true;

        // 通知 GameManager 处理奖励逻辑
        GameManager.instance.onBattleWon();

        // 延迟 1.5 秒跳转到奖励场景
        this.scheduleOnce(() => {
            director.loadScene('reward');
        }, 1.5);
    }

    private _onBattleLost() {
        if (this.defeatPanel) this.defeatPanel.active = true;

        GameManager.instance.onBattleLost();

        // 延迟 2 秒跳转到标题场景
        this.scheduleOnce(() => {
            director.loadScene('title');
        }, 2.0);
    }
}
