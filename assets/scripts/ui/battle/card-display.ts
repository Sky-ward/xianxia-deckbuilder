import { _decorator, Component, Node, Label, Sprite, Color, tween, Vec3, UITransform, EventTouch } from 'cc';
import { CardInstance } from '../../models/card-model';
import { CardType, ElementType } from '../../core/constants';

const { ccclass, property } = _decorator;

/** 元素颜色映射 */
const ELEMENT_COLORS: Record<string, Color> = {
    [ElementType.Metal]: new Color(220, 210, 180, 255),  // 金：浅金色
    [ElementType.Wood]:  new Color(100, 180,  80, 255),  // 木：草绿
    [ElementType.Water]: new Color( 80, 160, 220, 255),  // 水：水蓝
    [ElementType.Fire]:  new Color(230,  80,  60, 255),  // 火：炎红
    [ElementType.Earth]: new Color(170, 130,  80, 255),  // 土：土黄
};

const COLOR_DEFAULT = new Color(200, 200, 200, 255);
const COLOR_UNPLAYABLE = new Color(100, 100, 100, 180);
const COLOR_HOVER = new Color(255, 255, 255, 255);

/**
 * 单张卡牌显示组件
 * 挂载到卡牌节点上，显示名称/费用/描述/属性，处理触摸交互
 */
@ccclass('CardDisplay')
export class CardDisplay extends Component {
    @property(Label)
    nameLabel: Label = null!;

    @property(Label)
    costLabel: Label = null!;

    @property(Label)
    descLabel: Label = null!;

    @property(Label)
    typeLabel: Label = null!;

    @property(Label)
    elementLabel: Label = null!;

    @property(Sprite)
    cardBackground: Sprite = null!;

    /** 此卡牌对应的数据实例 */
    private cardInstance: CardInstance | null = null;

    /** 是否可以打出（灵力够） */
    private _playable: boolean = false;

    /** 卡牌在手牌中的索引 */
    private _handIndex: number = -1;

    /** 原始位置（用于悬停动画） */
    private _basePos: Vec3 = new Vec3();

    /** 悬停提升高度 */
    private readonly HOVER_LIFT = 40;

    /** 点击回调：由 HandDisplay 设置 */
    onCardClicked: ((index: number) => void) | null = null;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
        this.node.on(Node.EventType.MOUSE_ENTER, this._onMouseEnter, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this._onMouseLeave, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
        this.node.off(Node.EventType.MOUSE_ENTER, this._onMouseEnter, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this._onMouseLeave, this);
    }

    /**
     * 绑定卡牌数据并刷新显示
     * @param card 卡牌实例
     * @param handIndex 手牌索引
     * @param playable 当前是否可打出
     */
    bindCard(card: CardInstance, handIndex: number, playable: boolean) {
        this.cardInstance = card;
        this._handIndex = handIndex;
        this._playable = playable;

        // 更新文字
        if (this.nameLabel) this.nameLabel.string = card.nameZh;
        if (this.costLabel) this.costLabel.string = String(card.cost);
        if (this.descLabel) this.descLabel.string = card.getDescription('zh');
        if (this.typeLabel) this.typeLabel.string = this._typeText(card.type);
        if (this.elementLabel) {
            this.elementLabel.string = card.element ? this._elementText(card.element) : '';
        }

        // 背景颜色按属性
        if (this.cardBackground) {
            const col = card.element ? ELEMENT_COLORS[card.element] : COLOR_DEFAULT;
            this.cardBackground.color = col;
        }

        // 不可打出时变灰
        this._updatePlayableVisual(playable);
    }

    /** 设置基准位置（手牌布局后调用） */
    setBasePosition(pos: Vec3) {
        this._basePos = pos.clone();
    }

    /** 更新可打出状态（不重新绑定数据，仅改颜色） */
    setPlayable(playable: boolean) {
        this._playable = playable;
        this._updatePlayableVisual(playable);
    }

    private _updatePlayableVisual(playable: boolean) {
        if (!this.cardBackground) return;
        if (!playable) {
            const dim = this.cardBackground.color.clone();
            dim.a = 150;
            this.cardBackground.color = dim;
        } else {
            const base = this.cardInstance?.element
                ? ELEMENT_COLORS[this.cardInstance.element]
                : COLOR_DEFAULT;
            this.cardBackground.color = base.clone();
        }
    }

    private _onTouchStart(_e: EventTouch) {
        if (!this._playable) return;
        // 轻微放大，给视觉反馈
        tween(this.node)
            .to(0.08, { scale: new Vec3(1.05, 1.05, 1) })
            .start();
    }

    private _onTouchEnd(_e: EventTouch) {
        tween(this.node)
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
        if (this._playable && this.onCardClicked) {
            this.onCardClicked(this._handIndex);
        }
    }

    private _onTouchCancel(_e: EventTouch) {
        tween(this.node)
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private _onMouseEnter() {
        if (!this._playable) return;
        // 悬停向上移动
        const liftPos = this._basePos.clone();
        liftPos.y += this.HOVER_LIFT;
        tween(this.node)
            .to(0.1, { position: liftPos })
            .start();
    }

    private _onMouseLeave() {
        tween(this.node)
            .to(0.1, { position: this._basePos.clone() })
            .start();
    }

    // ---- 工具方法 ----

    private _typeText(type: CardType): string {
        const map: Record<CardType, string> = {
            [CardType.Attack]: '功法',
            [CardType.Skill]:  '法术',
            [CardType.Power]:  '符箓',
        };
        return map[type] ?? type;
    }

    private _elementText(element: ElementType): string {
        const map: Record<ElementType, string> = {
            [ElementType.Metal]: '金',
            [ElementType.Wood]:  '木',
            [ElementType.Water]: '水',
            [ElementType.Fire]:  '火',
            [ElementType.Earth]: '土',
        };
        return map[element] ?? element;
    }
}
