import { CardData } from '../models/card-model';
import { CardRarity, Balance } from '../core/constants';
import { SeededRandom } from '../core/random';
import { CardLoader } from '../data/card-loader';

/**
 * 奖励系统 — 战斗胜利后生成卡牌奖励
 */
export class RewardSystem {

    /** 生成卡牌奖励选项 */
    static generateCardRewards(
        characterId: string,
        rng: SeededRandom,
        count: number = Balance.CARD_REWARD_COUNT,
    ): CardData[] {
        const fileData = CardLoader.getCached(characterId);
        if (!fileData) return [];

        const pool = CardLoader.getCardPool(fileData, true);
        if (pool.length === 0) return [];

        const rewards: CardData[] = [];
        const usedIds = new Set<string>();

        for (let i = 0; i < count; i++) {
            // 按稀有度权重抽取
            const rarity = RewardSystem.rollRarity(rng);
            const candidates = pool.filter(c => c.rarity === rarity && !usedIds.has(c.id));

            if (candidates.length > 0) {
                const card = rng.pick(candidates);
                rewards.push(card);
                usedIds.add(card.id);
            } else {
                // fallback: 从全部未选卡池随机
                const fallback = pool.filter(c => !usedIds.has(c.id));
                if (fallback.length > 0) {
                    const card = rng.pick(fallback);
                    rewards.push(card);
                    usedIds.add(card.id);
                }
            }
        }

        return rewards;
    }

    /** 按权重随机稀有度 */
    private static rollRarity(rng: SeededRandom): CardRarity {
        const roll = rng.nextFloat();
        if (roll < 0.60) return CardRarity.Common;       // 60%
        if (roll < 0.90) return CardRarity.Uncommon;      // 30%
        return CardRarity.Rare;                            // 10%
    }

    /** 计算战斗金币奖励 */
    static calculateGoldReward(rng: SeededRandom, isElite: boolean, isBoss: boolean): number {
        if (isBoss) return rng.nextInt(80, 120);
        if (isElite) return rng.nextInt(40, 60);
        return rng.nextInt(15, 25);
    }
}
