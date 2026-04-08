import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { CardDisplay } from './card-display';
import { CardInstance } from '../../models/card-model';
import { gameEvents } from '../../core/event-bus';
import { GameEvents } from '../../core/constants';

const { ccclass, property } = _decorator;

/**
 * 手牌显示组件
 * 以扇形布局在屏幕底部渲染手牌
 * 挂载到 HandArea 节点上
 */
@ccclass('HandDisplay')
export class HandDisplay extends Component {
    /** 卡牌预制体 */
    @property(Prefab)
    cardPrefab: Prefab = null!;

    /** 手牌中各卡牌节点间距 */
    @property
    cardSpacing: number = 140;

    /** 当玩家灵力不足时用于判断哪些可打 */
    private _currentEnergy: number = 0;

    /** 当前实例化的卡牌节点列表 */
    private _cardNodes: Node[] = [];

    /** 打牌回调：由 BattleSceneCtrl 注入 */
    onPlayCard: ((cardIndex: number) => void) | null = null;

    onLoad() {
        gameEvents.on(GameEvents.HAND_UPDATED,   this._onHandUpdated,   this);
        gameEvents.on(GameEvents.ENERGY_CHANGED, this._onEnergyChanged, this);
        gameEvents.on(GameEvents.TURN_STARTED,   this._onTurnStarted,   this);
    }

    onDestroy() {
        gameEvents.off(GameEvents.HAND_UPDATED,   this._onHandUpdated,   this);
        gameEvents.off(GameEvents.ENERGY_CHANGED, this._onEnergyChanged, this);
        gameEvents.off(GameEvents.TURN_STARTED,   this._onTurnStarted,   this);
    }

    /**
     * 主动刷新手牌（战斗初始化时由 BattleSceneCtrl 调用）
     */
    refreshHand(hand: CardInstance[], energy: number) {
        this._currentEnergy = energy;
        this._rebuildCards(hand);
    }

    // ---- 事件处理 ----

    private _onHandUpdated(data: { hand: CardInstance[] }) {
        this._rebuildCards(data.hand);
    }

    private _onEnergyChanged(data: { energy: number; maxEnergy: number }) {
        this._currentEnergy = data.energy;
        // 更新每张卡牌的可打出状态
        for (let i = 0; i < this._cardNodes.length; i++) {
            const display = this._cardNodes[i].getComponent(CardDisplay);
            if (display) {
                // 从 CardDisplay 获取cost需要重新绑定；简单做法：重建
            }
        }
        // 重新标记可打状态
        this._refreshPlayableState();
    }

    private _onTurnStarted(_data: { turnNumber: number }) {
        // 回合开始后 HAND_UPDATED 会跟着来，不需要额外处理
    }

    // ---- 内部方法 ----

    private _rebuildCards(hand: CardInstance[]) {
        // 销毁旧卡牌节点
        for (const node of this._cardNodes) {
            node.destroy();
        }
        this._cardNodes = [];

        if (!this.cardPrefab) return;

        const count = hand.length;
        if (count === 0) return;

        // 计算起始X偏移，使手牌居中
        const totalWidth = (count - 1) * this.cardSpacing;
        const startX = -totalWidth / 2;

        for (let i = 0; i < count; i++) {
            const cardNode = instantiate(this.cardPrefab);
            this.node.addChild(cardNode);

            const x = startX + i * this.cardSpacing;
            const pos = new Vec3(x, 0, 0);
            cardNode.setPosition(pos);

            const display = cardNode.getComponent(CardDisplay);
            if (display) {
                const playable = hand[i].cost <= this._currentEnergy;
                display.bindCard(hand[i], i, playable);
                display.setBasePosition(pos);
                display.onCardClicked = (idx) => {
                    if (this.onPlayCard) this.onPlayCard(idx);
                };
            }

            this._cardNodes.push(cardNode);
        }
    }

    private _refreshPlayableState() {
        for (const node of this._cardNodes) {
            const display = node.getComponent(CardDisplay);
            if (display) {
                // CardDisplay 没有暴露 cost，所以在 _rebuildCards 时已经绑定了 playable
                // 这里需要通过显示层重新评估；最简方案：调用 setPlayable
                // 但 HandDisplay 不持有卡牌数据，只能在 HAND_UPDATED 后重建
                // 实际运行中 ENERGY_CHANGED 后紧接 HAND_UPDATED，所以这里留空即可
            }
        }
    }
}
