import { MapModel, MapNode } from '../models/map-model';
import { MapNodeType } from '../core/constants';
import { SeededRandom } from '../core/random';
import { EnemyLoader } from '../data/enemy-loader';

/**
 * 地图生成器 — Phase 2: STS风格三幕分支DAG地图
 *
 * 结构:
 *   - 3幕，每幕15层（含Boss层）
 *   - 每层1-3列，节点之间有分支连接
 *   - 节点类型分布符合STS规律:
 *     普通战 ~45%，精英战 ~10%，休息 ~12%，商店 ~8%，事件 ~22%，宝藏 ~3%
 */
export class MapGenerator {

    /** 每幕层数（包含Boss层，Boss在最后一层） */
    private static readonly FLOORS_PER_ACT = 15;

    /** 每层最大列数 */
    private static readonly MAX_COLS = 3;

    /**
     * 生成三幕分支地图
     */
    static generateBranchingMap(rng: SeededRandom): MapModel {
        const map = new MapModel();
        let nextId = 0;

        for (let act = 1; act <= 3; act++) {
            nextId = MapGenerator.generateAct(map, act, nextId, rng);
        }

        // 第一幕第0层节点设为可访问
        const firstFloorNodes = map.nodes.filter(n => n.act === 1 && n.floor === 0);
        for (const node of firstFloorNodes) {
            node.accessible = true;
        }

        return map;
    }

    /**
     * 生成单幕地图节点并追加到map，返回下一个可用ID
     */
    private static generateAct(
        map: MapModel,
        act: number,
        startId: number,
        rng: SeededRandom,
    ): number {
        const floors = MapGenerator.FLOORS_PER_ACT;
        let nextId = startId;

        // 存储每层节点：floorNodes[floor] = [MapNode, ...]
        const floorNodes: MapNode[][] = [];

        for (let floor = 0; floor < floors; floor++) {
            const isBossFloor = floor === floors - 1;
            const isFirstFloor = floor === 0;

            // 决定本层列数
            let colCount: number;
            if (isBossFloor || isFirstFloor) {
                colCount = 1; // Boss层和第一层只有一条路
            } else {
                // 中间层随机1-3列，后期层减少分支以免太散
                const maxCols = floor < 10 ? MapGenerator.MAX_COLS : 2;
                colCount = rng.nextInt(1, maxCols);
            }

            const nodes: MapNode[] = [];
            for (let col = 0; col < colCount; col++) {
                const type = isBossFloor
                    ? MapNodeType.Boss
                    : MapGenerator.rollNodeType(floor, act, rng);

                const node: MapNode = {
                    id: nextId++,
                    floor,
                    col,
                    act,
                    type,
                    completed: false,
                    accessible: false,
                    connections: [],
                    encounterEnemyIds: [],
                };

                // 填充遭遇数据
                MapGenerator.fillEncounterData(node, rng);
                nodes.push(node);
            }

            floorNodes.push(nodes);
            map.nodes.push(...nodes);
        }

        // 建立连接关系
        MapGenerator.buildConnections(floorNodes, rng);

        return nextId;
    }

    /**
     * 为各层节点建立连接（每个节点连向下一层1-2个节点）
     */
    private static buildConnections(floorNodes: MapNode[][], rng: SeededRandom): void {
        for (let floor = 0; floor < floorNodes.length - 1; floor++) {
            const currentFloor = floorNodes[floor];
            const nextFloor = floorNodes[floor + 1];

            if (nextFloor.length === 0) continue;

            // 确保每个当前节点至少有一个连接
            for (const node of currentFloor) {
                if (nextFloor.length === 1) {
                    // 下层只有一个节点，直接连
                    node.connections.push(nextFloor[0].id);
                } else {
                    // 连接1-2个下层节点
                    const count = rng.nextInt(1, 2);
                    const shuffled = rng.shuffle([...nextFloor]);
                    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
                        if (!node.connections.includes(shuffled[i].id)) {
                            node.connections.push(shuffled[i].id);
                        }
                    }
                }
            }

            // 确保下层每个节点至少被一个上层节点连接
            for (const nextNode of nextFloor) {
                const isConnected = currentFloor.some(n => n.connections.includes(nextNode.id));
                if (!isConnected) {
                    // 找距离最近（col差最小）的上层节点连过来
                    const sorted = [...currentFloor].sort(
                        (a, b) => Math.abs(a.col - nextNode.col) - Math.abs(b.col - nextNode.col),
                    );
                    sorted[0].connections.push(nextNode.id);
                }
            }
        }
    }

    /**
     * 按层数和幕数决定节点类型
     * 前两层不出商店/精英，后期精英/商店更常见
     */
    private static rollNodeType(floor: number, act: number, rng: SeededRandom): MapNodeType {
        const isBossAct2Eligible = act >= 2; // 第2幕起精英更多
        const isLate = floor >= 8;            // 后半段

        // 前2层只有普通战和事件
        if (floor < 2) {
            return rng.nextFloat() < 0.7 ? MapNodeType.NormalBattle : MapNodeType.Event;
        }

        // 权重表
        const weights: [MapNodeType, number][] = [
            [MapNodeType.NormalBattle, 45],
            [MapNodeType.Event, 22],
            [MapNodeType.Rest, 12],
            [MapNodeType.Shop, floor >= 3 ? 8 : 0],   // 第3层后才有商店
            [MapNodeType.EliteBattle, (isBossAct2Eligible || isLate) ? 12 : 6],
            [MapNodeType.Treasure, 3],
        ];

        const total = weights.reduce((s, [, w]) => s + w, 0);
        let roll = rng.nextFloat() * total;

        for (const [type, weight] of weights) {
            roll -= weight;
            if (roll <= 0) return type;
        }

        return MapNodeType.NormalBattle;
    }

    /**
     * 填充战斗节点的敌人遭遇数据
     */
    private static fillEncounterData(node: MapNode, rng: SeededRandom): void {
        if (node.type === MapNodeType.NormalBattle) {
            const encounters = EnemyLoader.getNormalEncounters();
            if (encounters.length > 0) {
                node.encounterEnemyIds = rng.pick(encounters).enemies;
            }
        } else if (node.type === MapNodeType.EliteBattle) {
            const encounters = EnemyLoader.getEliteEncounters();
            if (encounters.length > 0) {
                node.encounterEnemyIds = rng.pick(encounters).enemies;
            }
        } else if (node.type === MapNodeType.Boss) {
            const encounters = EnemyLoader.getBossEncounters();
            if (encounters.length > 0) {
                node.encounterEnemyIds = rng.pick(encounters).enemies;
            }
        }
    }

    /**
     * 向后兼容: 生成Phase 1线性10层地图（单幕）
     * 保留供旧代码参考，新代码请用 generateBranchingMap
     */
    static generateLinearMap(rng: SeededRandom): MapModel {
        return MapGenerator.generateBranchingMap(rng);
    }
}
