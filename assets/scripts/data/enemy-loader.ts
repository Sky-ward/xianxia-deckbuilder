import { EnemyData } from '../models/enemy-model';

interface EnemyFileData {
    enemies: EnemyData[];
}

interface EncounterData {
    enemies: string[];
}

interface EncounterFileData {
    normalEncounters: EncounterData[];
    eliteEncounters: EncounterData[];
    bossEncounters: EncounterData[];
}

/**
 * 敌人数据加载器
 */
export class EnemyLoader {
    private static enemyCache: Map<string, EnemyData> = new Map();
    private static encounterCache: EncounterFileData | null = null;

    /** 从JSON加载敌人数据 */
    static loadEnemiesFromJson(json: any): void {
        const data = json as EnemyFileData;
        for (const enemy of data.enemies) {
            EnemyLoader.enemyCache.set(enemy.id, enemy);
        }
    }

    /** 从JSON加载遭遇配置 */
    static loadEncountersFromJson(json: any): void {
        EnemyLoader.encounterCache = json as EncounterFileData;
    }

    /** 根据ID获取敌人数据 */
    static getEnemyData(id: string): EnemyData | undefined {
        return EnemyLoader.enemyCache.get(id);
    }

    /** 获取遭遇数据 */
    static getEncounters(): EncounterFileData | null {
        return EnemyLoader.encounterCache;
    }

    /** 获取普通战斗遭遇列表 */
    static getNormalEncounters(): EncounterData[] {
        return EnemyLoader.encounterCache?.normalEncounters || [];
    }

    /** 获取精英战斗遭遇列表 */
    static getEliteEncounters(): EncounterData[] {
        return EnemyLoader.encounterCache?.eliteEncounters || [];
    }

    /** 获取Boss遭遇列表 */
    static getBossEncounters(): EncounterData[] {
        return EnemyLoader.encounterCache?.bossEncounters || [];
    }
}
