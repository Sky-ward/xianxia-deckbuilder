import { _decorator, Component, Node, Label, Button, director } from 'cc';
import { GameManager } from '../../core/game-manager';
import { CardData } from '../../models/card-model';
import { CardType, ElementType, CardRarity } from '../../core/constants';

const { ccclass, property } = _decorator;

/** 卡牌奖励选项节点需要暴露的子组件集合 */
interface CardOptionUI {
    nameLabel: Label | null;
    costLabel: Label | null;
    descLabel: Label | null;
    rarityLabel: Label | null;
}

/**
 * 奖励场景根控制器
 * 展示 3 张可选奖励卡牌，玩家点击选择其中一张，或跳过
 * 挂载到奖励场景的 Canvas 根节点上
 */
@ccclass('RewardSceneCtrl')
export class RewardSceneCtrl extends Component {
    /** 三个卡牌选项根节点（每个节点包含名称/费用/描述等子 Label） */
    @property([Node])
    cardOptionNodes: Node[] = [];

    /** 跳过奖励按钮 */
    @property(Button)
    skipButton: Button = null!;

    /** 金币奖励文字 */
    @property(Label)
    goldLabel: Label = null!;

    /** 提示文字（"选择一张加入牌组"） */
    @property(Label)
    titleLabel: Label = null!;

    private _rewardCards: CardData[] = [];

    start() {
        this._loadRewardData();
        this._buildCardOptions();
        this._setupSkipButton();
    }

    // ---- 初始化 ----

    private _loadRewardData() {
        const gm = GameManager.instance;
        this._rewardCards = [...gm.currentRewardCards];

        if (this.goldLabel) {
            this.goldLabel.string = `获得金币：${gm.currentGoldReward}`;
        }
        if (this.titleLabel) {
            this.titleLabel.string = '选择一张卡牌加入牌组';
        }
    }

    private _buildCardOptions() {
        for (let i = 0; i < this.cardOptionNodes.length; i++) {
            const optNode = this.cardOptionNodes[i];
            if (!optNode) continue;

            if (i < this._rewardCards.length) {
                optNode.active = true;
                const card = this._rewardCards[i];
                this._populateCardNode(optNode, card);

                // 绑定点击
                const btn = optNode.getComponent(Button);
                if (btn) {
                    // 移除旧监听（防止重复注册）
                    btn.node.off(Button.EventType.CLICK);
                    const idx = i; // 闭包捕获
                    btn.node.on(Button.EventType.CLICK, () => {
                        this._onCardChosen(idx);
                    }, this);
                }
            } else {
                optNode.active = false;
            }
        }
    }

    private _populateCardNode(node: Node, card: CardData) {
        const get = (name: string): Label | null => {
            const child = node.getChildByName(name);
            return child ? child.getComponent(Label) : null;
        };

        const nameLabel = get('NameLabel');
        if (nameLabel) nameLabel.string = card.nameZh;

        const costLabel = get('CostLabel');
        if (costLabel) costLabel.string = `灵力：${card.cost}`;

        const descLabel = get('DescLabel');
        if (descLabel) {
            descLabel.string = card.descZh ?? '';
        }

        const rarityLabel = get('RarityLabel');
        if (rarityLabel) {
            rarityLabel.string = this._rarityText(card.rarity);
        }

        const elementLabel = get('ElementLabel');
        if (elementLabel) {
            elementLabel.string = card.element ? this._elementText(card.element as ElementType) : '';
        }
    }

    private _setupSkipButton() {
        if (!this.skipButton) return;
        this.skipButton.node.on(Button.EventType.CLICK, this._onSkip, this);
    }

    // ---- 交互 ----

    private _onCardChosen(index: number) {
        GameManager.instance.chooseRewardCard(index);
        director.loadScene('map');
    }

    private _onSkip() {
        GameManager.instance.skipReward();
        director.loadScene('map');
    }

    // ---- 工具 ----

    private _rarityText(rarity: CardRarity): string {
        const map: Record<CardRarity, string> = {
            [CardRarity.Starter]:  '初阶',
            [CardRarity.Common]:   '普通',
            [CardRarity.Uncommon]: '精良',
            [CardRarity.Rare]:     '稀有',
        };
        return map[rarity] ?? rarity;
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
