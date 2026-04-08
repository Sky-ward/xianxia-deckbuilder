import { _decorator, Component, Button, Label, Color } from 'cc';
import { gameEvents } from '../../core/event-bus';
import { GameEvents, BattlePhase } from '../../core/constants';

const { ccclass, property } = _decorator;

const COLOR_ACTIVE   = new Color(80,  180,  80,  255);  // 可用：绿色
const COLOR_DISABLED = new Color(120, 120, 120, 200);   // 禁用：灰色
const COLOR_ENEMY    = new Color(200, 80,   80,  255);   // 敌人回合：红色

/**
 * 结束回合按钮组件
 * 监听战斗阶段，在敌人回合自动禁用
 * 挂载到 EndTurnButton 节点上
 */
@ccclass('EndTurnButton')
export class EndTurnButton extends Component {
    @property(Button)
    button: Button = null!;

    @property(Label)
    label: Label = null!;

    /** 结束回合回调：由 BattleSceneCtrl 注入 */
    onEndTurn: (() => void) | null = null;

    onLoad() {
        // 绑定按钮点击
        if (this.button) {
            this.button.node.on(Button.EventType.CLICK, this._onClick, this);
        }

        gameEvents.on(GameEvents.TURN_STARTED,      this._onPlayerTurnStart, this);
        gameEvents.on(GameEvents.ENEMY_TURN_STARTED, this._onEnemyTurnStart,  this);
        gameEvents.on(GameEvents.ENEMY_TURN_ENDED,   this._onEnemyTurnEnd,    this);
        gameEvents.on(GameEvents.BATTLE_WON,         this._onBattleOver,      this);
        gameEvents.on(GameEvents.BATTLE_LOST,        this._onBattleOver,      this);
    }

    onDestroy() {
        if (this.button) {
            this.button.node.off(Button.EventType.CLICK, this._onClick, this);
        }

        gameEvents.off(GameEvents.TURN_STARTED,      this._onPlayerTurnStart, this);
        gameEvents.off(GameEvents.ENEMY_TURN_STARTED, this._onEnemyTurnStart,  this);
        gameEvents.off(GameEvents.ENEMY_TURN_ENDED,   this._onEnemyTurnEnd,    this);
        gameEvents.off(GameEvents.BATTLE_WON,         this._onBattleOver,      this);
        gameEvents.off(GameEvents.BATTLE_LOST,        this._onBattleOver,      this);
    }

    private _onClick() {
        if (this.onEndTurn) this.onEndTurn();
    }

    private _onPlayerTurnStart(_data: { turnNumber: number }) {
        this._setEnabled(true, '结束回合');
    }

    private _onEnemyTurnStart() {
        this._setEnabled(false, '敌人行动');
        if (this.button) {
            this.button.normalColor = COLOR_ENEMY;
        }
    }

    private _onEnemyTurnEnd() {
        // 玩家回合即将开始，提前恢复视觉
        this._setEnabled(false, '结束回合');
    }

    private _onBattleOver() {
        this._setEnabled(false, '战斗结束');
    }

    private _setEnabled(enabled: boolean, text: string) {
        if (this.button) {
            this.button.interactable = enabled;
            this.button.normalColor = enabled ? COLOR_ACTIVE : COLOR_DISABLED;
        }
        if (this.label) {
            this.label.string = text;
        }
    }
}
