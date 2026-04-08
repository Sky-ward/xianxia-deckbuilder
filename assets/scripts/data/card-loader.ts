import { CardData } from '../models/card-model';

interface CardFileData {
    characterId: string;
    characterNameZh: string;
    characterNameEn: string;
    starterDeck: string[];
    cards: CardData[];
}

/**
 * 卡牌数据加载器
 */
export class CardLoader {
    private static cache: Map<string, CardFileData> = new Map();

    /** 从JSON对象加载卡牌数据 */
    static loadFromJson(json: any): CardFileData {
        const data = json as CardFileData;
        CardLoader.cache.set(data.characterId, data);
        return data;
    }

    /** 获取角色的初始牌组ID列表 */
    static getStarterDeckIds(data: CardFileData): string[] {
        return data.starterDeck;
    }

    /** 根据ID查找卡牌数据 */
    static findCardById(data: CardFileData, id: string): CardData | undefined {
        return data.cards.find(c => c.id === id);
    }

    /** 获取角色的初始牌组数据 */
    static getStarterDeck(data: CardFileData): CardData[] {
        return data.starterDeck.map(id => {
            const card = CardLoader.findCardById(data, id);
            if (!card) throw new Error(`Card not found: ${id}`);
            return card;
        });
    }

    /** 获取按稀有度过滤的卡池 */
    static getCardPool(data: CardFileData, excludeStarter: boolean = true): CardData[] {
        if (excludeStarter) {
            return data.cards.filter(c => c.rarity !== 'starter');
        }
        return data.cards;
    }

    /** 获取缓存 */
    static getCached(characterId: string): CardFileData | undefined {
        return CardLoader.cache.get(characterId);
    }
}
