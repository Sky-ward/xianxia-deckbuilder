import { MapNodeType } from '../core/constants';

/** 地图节点 */
export interface MapNode {
    id: number;
    floor: number;
    type: MapNodeType;
    completed: boolean;
    /** 遭遇的敌人ID列表（战斗节点用） */
    encounterEnemyIds: string[];
}

/** 地图模型 */
export class MapModel {
    nodes: MapNode[] = [];
    currentFloor: number = 0;

    /** 获取当前节点 */
    get currentNode(): MapNode | null {
        return this.nodes.find(n => n.floor === this.currentFloor) || null;
    }

    /** 获取下一个节点 */
    get nextNode(): MapNode | null {
        return this.nodes.find(n => n.floor === this.currentFloor + 1) || null;
    }

    /** 推进到下一层 */
    advance(): MapNode | null {
        const current = this.currentNode;
        if (current) {
            current.completed = true;
        }
        this.currentFloor++;
        return this.currentNode;
    }

    /** 是否到达终点 */
    get isComplete(): boolean {
        return this.currentFloor >= this.nodes.length;
    }

    /** 获取总层数 */
    get totalFloors(): number {
        return this.nodes.length;
    }
}
