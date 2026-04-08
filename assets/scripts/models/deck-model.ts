import { CardInstance } from './card-model';
import { GameEvents, Balance, StatusEffectType } from '../core/constants';
import { gameEvents } from '../core/event-bus';
import { SeededRandom } from '../core/random';

/**
 * 牌组模型 — 管理抽牌堆/手牌/弃牌堆/消耗堆的流转
 */
export class DeckModel {
    drawPile: CardInstance[] = [];
    hand: CardInstance[] = [];
    discardPile: CardInstance[] = [];
    exhaustPile: CardInstance[] = [];

    private rng: SeededRandom;

    constructor(rng: SeededRandom) {
        this.rng = rng;
    }

    /** 初始化牌组（run开始时调用） */
    initializeFromCards(cards: CardInstance[]): void {
        this.drawPile = [...cards];
        this.hand = [];
        this.discardPile = [];
        this.exhaustPile = [];
        this.shuffleDrawPile();
    }

    /** 洗牌 */
    shuffleDrawPile(): void {
        this.rng.shuffle(this.drawPile);
        gameEvents.emit(GameEvents.DECK_SHUFFLED);
    }

    /** 抽牌，返回抽到的牌 */
    drawCards(count: number): CardInstance[] {
        const drawn: CardInstance[] = [];

        for (let i = 0; i < count; i++) {
            if (this.hand.length >= Balance.MAX_HAND_SIZE) break;

            // 抽牌堆空了，把弃牌堆洗回去
            if (this.drawPile.length === 0) {
                if (this.discardPile.length === 0) break; // 无牌可抽
                this.drawPile = [...this.discardPile];
                this.discardPile = [];
                this.shuffleDrawPile();
            }

            const card = this.drawPile.pop()!;
            this.hand.push(card);
            drawn.push(card);
            gameEvents.emit(GameEvents.CARD_DRAWN, { card });
        }

        if (drawn.length > 0) {
            gameEvents.emit(GameEvents.HAND_UPDATED, { hand: this.hand });
        }

        return drawn;
    }

    /** 打出一张牌（从手牌移到弃牌堆） */
    playCard(card: CardInstance): boolean {
        const index = this.hand.indexOf(card);
        if (index === -1) return false;

        this.hand.splice(index, 1);
        this.discardPile.push(card);
        gameEvents.emit(GameEvents.CARD_PLAYED, { card });
        gameEvents.emit(GameEvents.HAND_UPDATED, { hand: this.hand });
        return true;
    }

    /** 消耗一张牌（从手牌移到消耗堆，不可回收） */
    exhaustCard(card: CardInstance): boolean {
        const index = this.hand.indexOf(card);
        if (index === -1) return false;

        this.hand.splice(index, 1);
        this.exhaustPile.push(card);
        gameEvents.emit(GameEvents.CARD_EXHAUSTED, { card });
        gameEvents.emit(GameEvents.HAND_UPDATED, { hand: this.hand });
        return true;
    }

    /** 弃掉全部手牌（回合结束时调用） */
    discardHand(): void {
        while (this.hand.length > 0) {
            const card = this.hand.pop()!;
            card.resetModifiers();
            this.discardPile.push(card);
        }
        gameEvents.emit(GameEvents.HAND_UPDATED, { hand: this.hand });
    }

    /** 添加一张牌到抽牌堆（奖励获得时） */
    addToDrawPile(card: CardInstance): void {
        this.drawPile.push(card);
    }

    /** 添加一张牌到弃牌堆 */
    addToDiscardPile(card: CardInstance): void {
        this.discardPile.push(card);
    }

    /** 添加一张牌到手牌 */
    addToHand(card: CardInstance): void {
        if (this.hand.length < Balance.MAX_HAND_SIZE) {
            this.hand.push(card);
            gameEvents.emit(GameEvents.HAND_UPDATED, { hand: this.hand });
        }
    }

    get drawPileCount(): number { return this.drawPile.length; }
    get discardPileCount(): number { return this.discardPile.length; }
    get exhaustPileCount(): number { return this.exhaustPile.length; }
    get handCount(): number { return this.hand.length; }
}
