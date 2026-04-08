import { _decorator, Component, Label, Color } from 'cc';
import { gameEvents } from '../../core/event-bus';
import { GameEvents } from '../../core/constants';

const { ccclass, property } = _decorator;

/**
 * 灵力（Energy）显示组件
 * 显示当前灵力 / 最大灵力，如 "3 / 3"
 * 挂载到能量显示节点上
 */
@ccclass('EnergyDisplay')
export class EnergyDisplay extends Component {
    @property(Label)
    energyLabel: Label = null!;

    /** 当能量为0时显示的颜色 */
    private readonly COLOR_EMPTY = new Color(150, 150, 150, 255);
    /** 正常能量颜色 */
    private readonly COLOR_NORMAL = new Color(180, 230, 255, 255);
    /** 满能量颜色 */
    private readonly COLOR_FULL = new Color(255, 255, 100, 255);

    onLoad() {
        gameEvents.on(GameEvents.ENERGY_CHANGED, this._onEnergyChanged, this);
    }

    onDestroy() {
        gameEvents.off(GameEvents.ENERGY_CHANGED, this._onEnergyChanged, this);
    }

    /**
     * 主动设置初始能量显示
     * 在战斗开始时由 BattleSceneCtrl 调用
     */
    setEnergy(current: number, max: number) {
        this._refresh(current, max);
    }

    private _onEnergyChanged(data: { energy: number; maxEnergy: number }) {
        this._refresh(data.energy, data.maxEnergy);
    }

    private _refresh(current: number, max: number) {
        if (!this.energyLabel) return;
        this.energyLabel.string = `${current} / ${max}`;

        // 颜色随状态变化
        if (current === 0) {
            this.energyLabel.color = this.COLOR_EMPTY;
        } else if (current === max) {
            this.energyLabel.color = this.COLOR_FULL;
        } else {
            this.energyLabel.color = this.COLOR_NORMAL;
        }
    }
}
