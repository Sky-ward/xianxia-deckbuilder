import { sys } from 'cc';
import { RunModel } from '../models/run-model';
import { CardData } from '../models/card-model';
import { MapModel, MapNode } from '../models/map-model';
import { CardLoader } from '../data/card-loader';
import { getRelicById } from '../data/relic-data';

const SAVE_KEY = 'xianxia_run_save';
const META_KEY = 'xianxia_meta_save';

/** Run存档数据结构 */
interface RunSaveData {
    version: number;
    characterId: string;
    seed: number;
    hp: number;
    maxHp: number;
    gold: number;
    masterDeckIds: string[];
    relicIds: string[];
    map: {
        nodes: MapNode[];
        currentNodeId: number;
        visitedNodeIds: number[];
    };
}

/** Meta存档（跨run持久数据） */
interface MetaSaveData {
    version: number;
    /** 已解锁角色 */
    unlockedCharacters: string[];
    /** 总通关次数 */
    totalWins: number;
    /** 总失败次数 */
    totalLosses: number;
    /** 最高到达层数 */
    highestFloor: number;
    /** 已发现的卡牌ID */
    discoveredCards: string[];
    /** 已发现的法宝ID */
    discoveredRelics: string[];
    /** 渡劫等级（Ascension） */
    ascensionLevels: Record<string, number>;
}

/**
 * 存档系统 — 管理Run存档和Meta存档
 */
export class SaveSystem {
    private static readonly SAVE_VERSION = 1;

    /** 保存当前Run */
    static saveRun(run: RunModel): void {
        const data: RunSaveData = {
            version: SaveSystem.SAVE_VERSION,
            characterId: run.characterId,
            seed: run.seed,
            hp: run.hp,
            maxHp: run.maxHp,
            gold: run.gold,
            masterDeckIds: run.masterDeck.map(c => c.id),
            relicIds: run.relics.map(r => r.id),
            map: {
                nodes: run.map.nodes,
                currentNodeId: run.map.currentNodeId,
                visitedNodeIds: run.map.visitedNodeIds,
            },
        };
        sys.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    }

    /** 加载Run存档，返回null表示无存档 */
    static loadRun(): RunModel | null {
        const json = sys.localStorage.getItem(SAVE_KEY);
        if (!json) return null;

        try {
            const data: RunSaveData = JSON.parse(json);

            // 版本检查
            if (data.version !== SaveSystem.SAVE_VERSION) {
                SaveSystem.deleteRunSave();
                return null;
            }

            // 恢复牌组
            const cardFileData = CardLoader.getCached(data.characterId);
            if (!cardFileData) return null;

            const masterDeck: CardData[] = [];
            for (const id of data.masterDeckIds) {
                const card = CardLoader.findCardById(cardFileData, id);
                if (card) masterDeck.push(card);
            }

            // 恢复地图
            const map = new MapModel();
            map.nodes = data.map.nodes;
            map.currentNodeId = data.map.currentNodeId;
            map.visitedNodeIds = data.map.visitedNodeIds;

            // 创建RunModel
            const run = new RunModel(data.characterId, [], map, data.maxHp, data.seed);
            run.masterDeck = masterDeck;
            run.hp = data.hp;
            run.gold = data.gold;

            // 恢复法宝
            for (const relicId of data.relicIds) {
                const relicData = getRelicById(relicId);
                if (relicData) run.addRelic(relicData);
            }

            return run;
        } catch {
            SaveSystem.deleteRunSave();
            return null;
        }
    }

    /** 是否存在Run存档 */
    static hasRunSave(): boolean {
        return sys.localStorage.getItem(SAVE_KEY) !== null;
    }

    /** 删除Run存档（死亡或通关后） */
    static deleteRunSave(): void {
        sys.localStorage.removeItem(SAVE_KEY);
    }

    /** 加载Meta存档 */
    static loadMeta(): MetaSaveData {
        const json = sys.localStorage.getItem(META_KEY);
        if (!json) return SaveSystem.defaultMeta();

        try {
            return JSON.parse(json) as MetaSaveData;
        } catch {
            return SaveSystem.defaultMeta();
        }
    }

    /** 保存Meta存档 */
    static saveMeta(meta: MetaSaveData): void {
        sys.localStorage.setItem(META_KEY, JSON.stringify(meta));
    }

    /** 记录通关 */
    static recordWin(characterId: string, floor: number): void {
        const meta = SaveSystem.loadMeta();
        meta.totalWins++;
        meta.highestFloor = Math.max(meta.highestFloor, floor);
        SaveSystem.saveMeta(meta);
    }

    /** 记录失败 */
    static recordLoss(characterId: string, floor: number): void {
        const meta = SaveSystem.loadMeta();
        meta.totalLosses++;
        meta.highestFloor = Math.max(meta.highestFloor, floor);
        SaveSystem.saveMeta(meta);
    }

    /** 记录发现的卡牌 */
    static discoverCard(cardId: string): void {
        const meta = SaveSystem.loadMeta();
        if (!meta.discoveredCards.includes(cardId)) {
            meta.discoveredCards.push(cardId);
            SaveSystem.saveMeta(meta);
        }
    }

    /** 记录发现的法宝 */
    static discoverRelic(relicId: string): void {
        const meta = SaveSystem.loadMeta();
        if (!meta.discoveredRelics.includes(relicId)) {
            meta.discoveredRelics.push(relicId);
            SaveSystem.saveMeta(meta);
        }
    }

    /** 获取渡劫等级 */
    static getAscensionLevel(characterId: string): number {
        const meta = SaveSystem.loadMeta();
        return meta.ascensionLevels[characterId] || 0;
    }

    /** 提升渡劫等级 */
    static incrementAscension(characterId: string): void {
        const meta = SaveSystem.loadMeta();
        const current = meta.ascensionLevels[characterId] || 0;
        if (current < 20) {
            meta.ascensionLevels[characterId] = current + 1;
            SaveSystem.saveMeta(meta);
        }
    }

    private static defaultMeta(): MetaSaveData {
        return {
            version: 1,
            unlockedCharacters: ['jian_xiu'],
            totalWins: 0,
            totalLosses: 0,
            highestFloor: 0,
            discoveredCards: [],
            discoveredRelics: [],
            ascensionLevels: {},
        };
    }
}
