import { CardData } from './card-model';
import { MapModel } from './map-model';
import { RelicInstance, RelicData } from './relic-model';

/**
 * 单次Run的完整状态 — 贯穿整个roguelike流程
 */
export class RunModel {
    /** 当前牌组（整个run期间累积） */
    masterDeck: CardData[] = [];

    /** 持有的法宝 */
    relics: RelicInstance[] = [];

    /** 地图 */
    map: MapModel;

    /** 玩家当前HP */
    hp: number;
    maxHp: number;

    /** 金币 */
    gold: number = 50;

    /** 随机种子 */
    seed: number;

    /** 角色ID */
    characterId: string;

    /** 当前层数 */
    get currentFloor(): number {
        return this.map.currentFloor;
    }

    constructor(
        characterId: string,
        starterDeck: CardData[],
        map: MapModel,
        maxHp: number,
        seed: number,
    ) {
        this.characterId = characterId;
        this.masterDeck = [...starterDeck];
        this.map = map;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.seed = seed;
    }

    /** 添加法宝 */
    addRelic(data: RelicData): RelicInstance {
        const instance = new RelicInstance(data);
        this.relics.push(instance);
        return instance;
    }

    /** 是否已持有某法宝 */
    hasRelic(relicId: string): boolean {
        return this.relics.some(r => r.id === relicId);
    }

    /** 获取已持有法宝ID集合 */
    get relicIds(): Set<string> {
        return new Set(this.relics.map(r => r.id));
    }

    /** 添加卡牌到牌组 */
    addCard(card: CardData): void {
        this.masterDeck.push(card);
    }

    /** 移除卡牌（商店或事件） */
    removeCard(cardId: string): boolean {
        const index = this.masterDeck.findIndex(c => c.id === cardId);
        if (index === -1) return false;
        this.masterDeck.splice(index, 1);
        return true;
    }

    /** 治疗 */
    heal(amount: number): void {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }

    /** 受伤（跨战斗的永久伤害） */
    takeDamage(amount: number): void {
        this.hp = Math.max(0, this.hp - amount);
    }

    get isAlive(): boolean {
        return this.hp > 0;
    }
}
