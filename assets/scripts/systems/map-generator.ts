import { MapModel, MapNode } from '../models/map-model';
import { MapNodeType } from '../core/constants';
import { SeededRandom } from '../core/random';
import { EnemyLoader } from '../data/enemy-loader';

/**
 * 地图生成器 — Phase 1: 固定10层线性地图
 */
export class MapGenerator {

    /** 生成Phase 1的线性10层地图 */
    static generateLinearMap(rng: SeededRandom): MapModel {
        const map = new MapModel();

        // 固定结构: 战-战-战-休-战-战-精-休-战-Boss
        const structure: MapNodeType[] = [
            MapNodeType.NormalBattle,  // 1
            MapNodeType.NormalBattle,  // 2
            MapNodeType.NormalBattle,  // 3
            MapNodeType.Rest,          // 4
            MapNodeType.NormalBattle,  // 5
            MapNodeType.NormalBattle,  // 6
            MapNodeType.EliteBattle,   // 7
            MapNodeType.Rest,          // 8
            MapNodeType.NormalBattle,  // 9
            MapNodeType.Boss,          // 10
        ];

        const normalEncounters = EnemyLoader.getNormalEncounters();
        const eliteEncounters = EnemyLoader.getEliteEncounters();
        const bossEncounters = EnemyLoader.getBossEncounters();

        for (let i = 0; i < structure.length; i++) {
            const type = structure[i];
            let encounterEnemyIds: string[] = [];

            if (type === MapNodeType.NormalBattle && normalEncounters.length > 0) {
                const encounter = rng.pick(normalEncounters);
                encounterEnemyIds = encounter.enemies;
            } else if (type === MapNodeType.EliteBattle && eliteEncounters.length > 0) {
                const encounter = rng.pick(eliteEncounters);
                encounterEnemyIds = encounter.enemies;
            } else if (type === MapNodeType.Boss && bossEncounters.length > 0) {
                const encounter = rng.pick(bossEncounters);
                encounterEnemyIds = encounter.enemies;
            }

            const node: MapNode = {
                id: i,
                floor: i,
                type,
                completed: false,
                encounterEnemyIds,
            };
            map.nodes.push(node);
        }

        return map;
    }
}
