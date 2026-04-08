import { _decorator, Component, Node, Label, Color, Button, Sprite } from 'cc';
import { MapNode } from '../../models/map-model';
import { MapNodeType } from '../../core/constants';

const { ccclass, property } = _decorator;

/** 节点类型对应的中文名和颜色 */
const NODE_INFO: Record<MapNodeType, { label: string; color: Color }> = {
    [MapNodeType.NormalBattle]: { label: '战',   color: new Color(200,  80,  80, 255) },
    [MapNodeType.EliteBattle]:  { label: '精英', color: new Color(200,  60, 150, 255) },
    [MapNodeType.Boss]:         { label: '首领', color: new Color(150,  30, 200, 255) },
    [MapNodeType.Rest]:         { label: '息',   color: new Color( 80, 180,  80, 255) },
    [MapNodeType.Event]:        { label: '遇',   color: new Color( 80, 160, 220, 255) },
    [MapNodeType.Shop]:         { label: '坊',   color: new Color(220, 180,  60, 255) },
    [MapNodeType.Treasure]:     { label: '藏',   color: new Color(220, 200,  60, 255) },
};

/**
 * 地图节点显示组件
 * 挂载到每个地图节点按钮上
 */
@ccclass('MapNodeDisplay')
export class MapNodeDisplay extends Component {
    /** 节点类型图标文字 */
    @property(Label)
    typeLabel: Label = null!;

    /** 层数文字 */
    @property(Label)
    floorLabel: Label = null!;

    /** 背景 Sprite（用于染色） */
    @property(Sprite)
    bgSprite: Sprite = null!;

    /** 已完成时覆盖的标记节点 */
    @property(Node)
    completedMark: Node = null!;

    /** 当前节点标记（发光边框等） */
    @property(Node)
    currentMark: Node = null!;

    /** 点击回调：由 MapSceneCtrl 注入 */
    onNodeClicked: ((nodeId: number) => void) | null = null;

    private _nodeId: number = -1;

    onLoad() {
        this.node.on(Button.EventType.CLICK, this._onClick, this);
    }

    onDestroy() {
        this.node.off(Button.EventType.CLICK, this._onClick, this);
    }

    /**
     * 绑定地图节点数据
     * @param node 地图节点
     * @param isCurrent 是否为当前可选节点
     */
    bindNode(node: MapNode, isCurrent: boolean) {
        this._nodeId = node.id;

        const info = NODE_INFO[node.type] ?? { label: '?', color: new Color(150, 150, 150, 255) };

        if (this.typeLabel) {
            this.typeLabel.string = info.label;
        }
        if (this.floorLabel) {
            this.floorLabel.string = `第${node.floor + 1}层`;
        }
        if (this.bgSprite) {
            this.bgSprite.color = info.color;
        }
        if (this.completedMark) {
            this.completedMark.active = node.completed;
        }
        if (this.currentMark) {
            this.currentMark.active = isCurrent;
        }

        // 已完成或非当前节点禁用按钮
        const btn = this.node.getComponent(Button);
        if (btn) {
            btn.interactable = isCurrent && !node.completed;
        }
    }

    private _onClick() {
        if (this.onNodeClicked) {
            this.onNodeClicked(this._nodeId);
        }
    }
}
