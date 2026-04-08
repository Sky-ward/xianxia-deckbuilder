import { _decorator, Component, ProgressBar, Label, Color, tween } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 可复用HP进度条组件
 * 支持平滑动画和颜色随HP变化
 * 挂载到任意带 ProgressBar 子组件的节点上
 */
@ccclass('HpBar')
export class HpBar extends Component {
    @property(ProgressBar)
    progressBar: ProgressBar = null!;

    @property(Label)
    hpLabel: Label = null!;

    /** 低HP阈值（低于此比例变红） */
    @property
    lowHpThreshold: number = 0.3;

    /** 是否使用平滑动画 */
    @property
    animate: boolean = true;

    /** 动画时长（秒） */
    @property
    animDuration: number = 0.3;

    private _currentHp: number = 0;
    private _maxHp: number = 1;

    /** 正常HP颜色（绿色） */
    private readonly COLOR_NORMAL = new Color(80, 200, 80, 255);
    /** 低HP颜色（红色） */
    private readonly COLOR_LOW    = new Color(220, 60, 60, 255);

    /**
     * 初始化HP显示
     */
    init(hp: number, maxHp: number) {
        this._currentHp = hp;
        this._maxHp     = maxHp;
        this._refreshImmediate();
    }

    /**
     * 更新HP（带动画）
     */
    setHp(hp: number, maxHp?: number) {
        this._currentHp = hp;
        if (maxHp !== undefined) this._maxHp = maxHp;

        const targetProgress = this._maxHp > 0 ? this._currentHp / this._maxHp : 0;

        if (this.animate && this.progressBar) {
            tween(this.progressBar)
                .to(this.animDuration, { progress: targetProgress })
                .start();
        } else {
            this._refreshImmediate();
        }

        this._refreshLabel();
        this._refreshColor(targetProgress);
    }

    private _refreshImmediate() {
        const progress = this._maxHp > 0 ? this._currentHp / this._maxHp : 0;
        if (this.progressBar) {
            this.progressBar.progress = progress;
        }
        this._refreshLabel();
        this._refreshColor(progress);
    }

    private _refreshLabel() {
        if (this.hpLabel) {
            this.hpLabel.string = `${this._currentHp} / ${this._maxHp}`;
        }
    }

    private _refreshColor(progress: number) {
        if (!this.progressBar) return;
        // ProgressBar 本身不支持直接修改颜色，通过 barSprite 获取
        const barSprite = this.progressBar.barSprite;
        if (barSprite) {
            barSprite.color = progress <= this.lowHpThreshold
                ? this.COLOR_LOW.clone()
                : this.COLOR_NORMAL.clone();
        }
    }
}
