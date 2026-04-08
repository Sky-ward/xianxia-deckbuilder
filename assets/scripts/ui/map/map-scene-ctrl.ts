import { _decorator, Component, Node, Prefab, instantiate, ScrollView, Label, director } from 'cc';
import { MapNodeDisplay } from './map-node-display';
import { GameManager } from '../../core/game-manager';
import { MapNode } from '../../models/map-model';
import { GamePhase } from '../../core/constants';

const { ccclass, property } = _decorator;

/**
 * 地图场景根控制器
 * 显示线性地图（10个节点），玩家点击当前节点进入对应内容
 * 挂载到地图场景的 Canvas 根节点上
 */
@ccclass('MapSceneCtrl')
export class MapSceneCtrl extends Component {
    /** 地图节点预制体 */
    @property(Prefab)
    nodeItemPrefab: Prefab = null!;

    /** 节点列表容器（ScrollView 的 content 节点） */
    @property(Node)
    listContent: Node = null!;

    /** 节点间垂直间距 */
    @property
    nodeSpacing: number = 120;

    /** 玩家信息（HP、金币） */
    @property(Label)
    playerInfoLabel: Label = null!;

    private _nodeDisplays: MapNodeDisplay[] = [];

    start() {
        this._buildMapList();
        this._updatePlayerInfo();
    }

    // ---- 构建地图列表 ----

    private _buildMapList() {
        const gm = GameManager.instance;
        const run = gm.currentRun;
        if (!run) {
            console.warn('[MapSceneCtrl] 没有当前Run，请先 startNewRun()');
            return;
        }
        if (!this.nodeItemPrefab || !this.listContent) {
            console.warn('[MapSceneCtrl] 缺少 nodeItemPrefab 或 listContent');
            return;
        }

        // 清理旧节点
        this.listContent.removeAllChildren();
        this._nodeDisplays = [];

        const nodes = run.map.nodes;
        const currentFloor = run.map.currentFloor;

        // 从上到下排列（第0层在底部，boss在顶部）
        // 翻转显示顺序：索引0→底部
        for (let i = nodes.length - 1; i >= 0; i--) {
            const mapNode = nodes[i];
            const item = instantiate(this.nodeItemPrefab);
            this.listContent.addChild(item);

            // 垂直位置：底部节点y最小
            const yPos = (nodes.length - 1 - i) * this.nodeSpacing;
            item.setPosition(0, yPos, 0);

            const display = item.getComponent(MapNodeDisplay);
            if (display) {
                const isCurrent = mapNode.floor === currentFloor;
                display.bindNode(mapNode, isCurrent);
                display.onNodeClicked = (nodeId) => {
                    this._onNodeClicked(nodeId);
                };
                this._nodeDisplays.push(display);
            }
        }
    }

    private _updatePlayerInfo() {
        if (!this.playerInfoLabel) return;
        const run = GameManager.instance.currentRun;
        if (!run) return;
        this.playerInfoLabel.string = `HP: ${run.hp} / ${run.maxHp}   金币: ${run.gold}`;
    }

    // ---- 交互 ----

    private _onNodeClicked(nodeId: number) {
        const run = GameManager.instance.currentRun;
        if (!run) return;

        // 确认点击的是当前层节点
        const node = run.map.nodes.find(n => n.id === nodeId);
        if (!node || node.floor !== run.map.currentFloor) return;

        // 进入节点（GameManager 负责创建战斗/奖励等）
        GameManager.instance.enterNode();

        // 根据进入后的阶段跳转场景
        this._navigateToCurrentPhase();
    }

    private _navigateToCurrentPhase() {
        const phase = GameManager.instance.currentPhase;
        switch (phase) {
            case GamePhase.Battle:
                director.loadScene('battle');
                break;
            case GamePhase.Reward:
                director.loadScene('reward');
                break;
            case GamePhase.GameOver:
                director.loadScene('title');
                break;
            default:
                // 休息等立即结束，刷新地图
                this._buildMapList();
                this._updatePlayerInfo();
                break;
        }
    }
}
