import { CardData } from '../models/card-model';
import { RelicData } from '../models/relic-model';
import { RunModel } from '../models/run-model';
import { CardRarity } from '../core/constants';
import { SeededRandom } from '../core/random';
import { CardLoader } from '../data/card-loader';
import { RelicSystem } from './relic-system';

/** 商店卡牌商品 */
export interface ShopCardItem {
    card: CardData;
    price: number;
    sold: boolean;
}

/** 商店法宝商品 */
export interface ShopRelicItem {
    relic: RelicData;
    price: number;
    sold: boolean;
}

/** 商店数据 */
export interface ShopData {
    cards: ShopCardItem[];
    relics: ShopRelicItem[];
    removeCardPrice: number;
}

/** 卡牌价格表 */
const CARD_PRICES: Record<string, [number, number]> = {
    common:   [45, 55],
    uncommon: [68, 82],
    rare:     [135, 165],
};

/** 法宝价格表 */
const RELIC_PRICES: Record<string, [number, number]> = {
    common:   [140, 160],
    uncommon: [230, 270],
    rare:     [280, 320],
};

/** 移除卡牌基础价格 */
const BASE_REMOVE_PRICE = 75;
/** 每次移除后价格增量 */
const REMOVE_PRICE_INCREMENT = 25;

/**
 * 商店系统 — 生成商店内容和处理购买
 */
export class ShopSystem {

    /** 记录本run中已移除卡牌次数（影响移除价格） */
    private static removeCount = 0;

    /** 重置（新run开始时调用） */
    static reset(): void {
        ShopSystem.removeCount = 0;
    }

    /** 生成商店数据 */
    static generateShop(run: RunModel, rng: SeededRandom): ShopData {
        const cards = ShopSystem.generateCards(run.characterId, rng);
        const relics = ShopSystem.generateRelics(run.relicIds, rng);
        const removeCardPrice = BASE_REMOVE_PRICE + ShopSystem.removeCount * REMOVE_PRICE_INCREMENT;

        return { cards, relics, removeCardPrice };
    }

    /** 生成商店卡牌（5张：2普通、2稀有、1高稀有） */
    private static generateCards(characterId: string, rng: SeededRandom): ShopCardItem[] {
        const fileData = CardLoader.getCached(characterId);
        if (!fileData) return [];

        const pool = CardLoader.getCardPool(fileData);
        const items: ShopCardItem[] = [];
        const usedIds = new Set<string>();

        const slots: CardRarity[] = [
            CardRarity.Common, CardRarity.Common,
            CardRarity.Uncommon, CardRarity.Uncommon,
            CardRarity.Rare,
        ];

        for (const rarity of slots) {
            const candidates = pool.filter(c => c.rarity === rarity && !usedIds.has(c.id));
            if (candidates.length === 0) continue;

            const card = rng.pick(candidates);
            usedIds.add(card.id);

            const priceRange = CARD_PRICES[rarity] || CARD_PRICES['common'];
            const price = rng.nextInt(priceRange[0], priceRange[1]);

            items.push({ card, price, sold: false });
        }

        return items;
    }

    /** 生成商店法宝（2件：1普通、1稀有） */
    private static generateRelics(existingIds: Set<string>, rng: SeededRandom): ShopRelicItem[] {
        const items: ShopRelicItem[] = [];

        const rarities: Array<'common' | 'uncommon' | 'rare'> = ['common', 'uncommon'];
        for (const rarity of rarities) {
            const relic = RelicSystem.generateRelicReward(existingIds, rng, rarity);
            if (!relic) continue;

            const priceRange = RELIC_PRICES[rarity] || RELIC_PRICES['common'];
            const price = rng.nextInt(priceRange[0], priceRange[1]);

            items.push({ relic, price, sold: false });
            existingIds.add(relic.id);
        }

        return items;
    }

    /** 购买卡牌 */
    static buyCard(run: RunModel, shop: ShopData, index: number): boolean {
        const item = shop.cards[index];
        if (!item || item.sold || run.gold < item.price) return false;

        run.gold -= item.price;
        run.addCard(item.card);
        item.sold = true;
        return true;
    }

    /** 购买法宝 */
    static buyRelic(run: RunModel, shop: ShopData, index: number): boolean {
        const item = shop.relics[index];
        if (!item || item.sold || run.gold < item.price) return false;

        run.gold -= item.price;
        run.addRelic(item.relic);
        item.sold = true;
        return true;
    }

    /** 付费移除卡牌 */
    static removeCard(run: RunModel, shop: ShopData, cardId: string): boolean {
        if (run.gold < shop.removeCardPrice) return false;

        const removed = run.removeCard(cardId);
        if (!removed) return false;

        run.gold -= shop.removeCardPrice;
        ShopSystem.removeCount++;
        shop.removeCardPrice = BASE_REMOVE_PRICE + ShopSystem.removeCount * REMOVE_PRICE_INCREMENT;
        return true;
    }
}
