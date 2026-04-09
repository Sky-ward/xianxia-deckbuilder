import { MapNodeType } from '../core/constants';

/** 地图节点 — 支持分支DAG结构 */
export interface MapNode {
    id: number;
    floor: number;        // 层数（0-based，每幕0-14）
    col: number;          // 列位置（0-2，用于UI布局）
    act: number;          // 幕数（1-3）
    type: MapNodeType;
    completed: boolean;
    accessible: boolean;  // 当前是否可以进入
    /** 连接到下一层的节点ID列表 */
    connections: number[];
    /** 遭遇的敌人ID列表（战斗节点用） */
    encounterEnemyIds: string[];
    /** 事件ID（事件节点用） */
    eventId?: string;
    /** 法宝ID（宝藏节点用） */
    relicId?: string;
}

/** 地图模型 — 三幕分支DAG */
export class MapModel {
    nodes: MapNode[] = [];

    /** 当前所在节点ID（-1 = 尚未进入） */
    currentNodeId: number = -1;

    /** 已访问的节点ID路径 */
    visitedNodeIds: number[] = [];

    /** 获取当前节点 */
    get currentNode(): MapNode | null {
        if (this.currentNodeId === -1) return null;
        return this.nodes.find(n => n.id === this.currentNodeId) || null;
    }

    /** 获取当前层数（兼容旧接口） */
    get currentFloor(): number {
        return this.currentNode?.floor ?? 0;
    }

    /** 获取指定ID节点 */
    getNode(id: number): MapNode | null {
        return this.nodes.find(n => n.id === id) || null;
    }

    /** 获取当前幕的起始节点（第0层可访问的节点） */
    get startNodes(): MapNode[] {
        // 找到第一幕第0层
        return this.nodes.filter(n => n.act === 1 && n.floor === 0);
    }

    /** 进入某个节点 */
    enterNode(nodeId: number): boolean {
        const node = this.getNode(nodeId);
        if (!node || !node.accessible) return false;
        this.currentNodeId = nodeId;
        return true;
    }

    /** 完成当前节点，解锁下一批节点 */
    completeCurrentNode(): void {
        const node = this.currentNode;
        if (!node) return;
        node.completed = true;
        this.visitedNodeIds.push(node.id);
        // 解锁连接的下一层节点
        for (const nextId of node.connections) {
            const next = this.getNode(nextId);
            if (next) next.accessible = true;
        }
    }

    /** 推进到下一节点（仅在只有单一连接时使用，兼容旧接口） */
    advance(): MapNode | null {
        this.completeCurrentNode();
        const node = this.currentNode;
        if (!node || node.connections.length === 0) {
            this.currentNodeId = -1;
            return null;
        }
        // 自动选择第一个连接
        this.currentNodeId = node.connections[0];
        return this.currentNode;
    }

    /** 是否已通关（访问了当前幕的最终Boss节点） */
    get isComplete(): boolean {
        if (this.nodes.length === 0) return false;
        const maxFloor = Math.max(...this.nodes.map(n => n.floor));
        const bossNodes = this.nodes.filter(n => n.floor === maxFloor && n.type === MapNodeType.Boss);
        return bossNodes.some(n => n.completed);
    }

    /** 总节点数 */
    get totalFloors(): number {
        if (this.nodes.length === 0) return 0;
        return Math.max(...this.nodes.map(n => n.floor)) + 1;
    }

    /** 获取某层的所有节点 */
    getFloorNodes(floor: number): MapNode[] {
        return this.nodes.filter(n => n.floor === floor);
    }

    /** 获取某幕的所有节点 */
    getActNodes(act: number): MapNode[] {
        return this.nodes.filter(n => n.act === act);
    }
}
