import { CardData } from '../models/card-model';
import { RunModel } from '../models/run-model';
import { CardLoader } from '../data/card-loader';

/**
 * 卡牌升级系统 — 休息点或事件中升级卡牌
 *
 * 升级机制：每张卡有一个 upgradeId 字段，指向升级后的卡牌ID。
 * 升级后替换原卡。升级通常增强数值或降低费用。
 */
export class UpgradeSystem {

    /** 获取牌组中可升级的卡牌列表 */
    static getUpgradeableCards(run: RunModel): CardData[] {
        return run.masterDeck.filter(card => card.upgradeId !== null);
    }

    /**
     * 升级牌组中的一张卡牌
     * @returns 升级后的卡牌数据，或null表示升级失败
     */
    static upgradeCard(run: RunModel, cardId: string): CardData | null {
        const index = run.masterDeck.findIndex(c => c.id === cardId);
        if (index === -1) return null;

        const card = run.masterDeck[index];
        if (!card.upgradeId) return null;

        const fileData = CardLoader.getCached(run.characterId);
        if (!fileData) return null;

        const upgradedCard = CardLoader.findCardById(fileData, card.upgradeId);
        if (!upgradedCard) return null;

        // 替换牌组中的卡牌
        run.masterDeck[index] = upgradedCard;
        return upgradedCard;
    }

    /** 检查某张卡是否可升级 */
    static canUpgrade(card: CardData): boolean {
        return card.upgradeId !== null;
    }
}
