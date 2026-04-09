import { SeededRandom } from '../core/random';
import { RunModel } from '../models/run-model';
import { CardLoader } from '../data/card-loader';
import { RewardSystem } from './reward-system';
import { RelicSystem } from './relic-system';
import { CardRarity } from '../core/constants';
import { CardData } from '../models/card-model';

/** 事件选项条件 */
interface EventCondition {
    type: 'min_gold' | 'min_hp' | 'has_relic';
    value: number | string;
}

/** 事件效果 */
interface EventEffect {
    type: string;
    value?: number;
    rarity?: string;
    outcomes?: { weight: number; effects: EventEffect[] }[];
}

/** 事件选项 */
export interface EventChoice {
    id: string;
    textZh: string;
    textEn: string;
    effects: EventEffect[];
    condition?: EventCondition;
}

/** 事件数据 */
export interface EventData {
    id: string;
    nameZh: string;
    nameEn: string;
    descZh: string;
    descEn: string;
    choices: EventChoice[];
}

/** 事件执行结果 */
export interface EventResult {
    messages: string[];
    cardToAdd?: CardData;
    removeCard?: boolean;
}

/**
 * 事件系统 — 处理地图随机事件
 */
export class EventSystem {
    private static events: EventData[] = [];

    /** 从JSON加载事件数据 */
    static loadFromJson(json: { events: EventData[] }): void {
        EventSystem.events = json.events;
    }

    /** 随机选择一个事件 */
    static getRandomEvent(rng: SeededRandom): EventData | null {
        if (EventSystem.events.length === 0) return null;
        return rng.pick(EventSystem.events);
    }

    /** 根据ID获取事件 */
    static getEventById(id: string): EventData | undefined {
        return EventSystem.events.find(e => e.id === id);
    }

    /** 检查选项是否可用 */
    static isChoiceAvailable(choice: EventChoice, run: RunModel): boolean {
        if (!choice.condition) return true;

        switch (choice.condition.type) {
            case 'min_gold':
                return run.gold >= (choice.condition.value as number);
            case 'min_hp':
                return run.hp >= (choice.condition.value as number);
            case 'has_relic':
                return run.hasRelic(choice.condition.value as string);
            default:
                return true;
        }
    }

    /** 执行事件选项，返回结果描述 */
    static executeChoice(
        choice: EventChoice,
        run: RunModel,
        rng: SeededRandom,
    ): EventResult {
        const result: EventResult = { messages: [] };

        for (const effect of choice.effects) {
            EventSystem.applyEffect(effect, run, rng, result);
        }

        return result;
    }

    private static applyEffect(
        effect: EventEffect,
        run: RunModel,
        rng: SeededRandom,
        result: EventResult,
    ): void {
        switch (effect.type) {
            case 'heal_full':
                run.hp = run.maxHp;
                result.messages.push('恢复满HP');
                break;

            case 'heal_percent': {
                const amount = Math.floor(run.maxHp * (effect.value! / 100));
                run.heal(amount);
                result.messages.push(`恢复${amount}点HP`);
                break;
            }

            case 'lose_hp':
                run.takeDamage(effect.value!);
                result.messages.push(`失去${effect.value}点HP`);
                break;

            case 'lose_hp_percent': {
                const dmg = Math.floor(run.hp * (effect.value! / 100));
                run.takeDamage(dmg);
                result.messages.push(`失去${dmg}点HP`);
                break;
            }

            case 'gain_max_hp':
                run.maxHp += effect.value!;
                run.hp += effect.value!;
                result.messages.push(`最大HP+${effect.value}`);
                break;

            case 'lose_max_hp':
                run.maxHp = Math.max(1, run.maxHp - effect.value!);
                run.hp = Math.min(run.hp, run.maxHp);
                result.messages.push(`最大HP-${effect.value}`);
                break;

            case 'gain_gold':
                run.gold += effect.value!;
                result.messages.push(`获得${effect.value}金币`);
                break;

            case 'lose_gold':
                run.gold = Math.max(0, run.gold - effect.value!);
                result.messages.push(`失去${effect.value}金币`);
                break;

            case 'gain_card': {
                const fileData = CardLoader.getCached(run.characterId);
                if (fileData) {
                    const pool = CardLoader.getCardPool(fileData).filter(
                        c => c.rarity === (effect.rarity as CardRarity),
                    );
                    if (pool.length > 0) {
                        const card = rng.pick(pool);
                        result.cardToAdd = card;
                        result.messages.push(`获得卡牌：${card.nameZh}`);
                    }
                }
                break;
            }

            case 'remove_card':
                result.removeCard = true;
                result.messages.push('可以移除一张牌');
                break;

            case 'gain_relic': {
                const rarity = (effect.rarity || 'common') as 'common' | 'uncommon' | 'rare' | 'boss';
                const relic = RelicSystem.generateRelicReward(run.relicIds, rng, rarity);
                if (relic) {
                    run.addRelic(relic);
                    result.messages.push(`获得法宝：${relic.nameZh}`);
                }
                break;
            }

            case 'random': {
                if (!effect.outcomes || effect.outcomes.length === 0) break;
                const totalWeight = effect.outcomes.reduce((sum, o) => sum + o.weight, 0);
                let roll = rng.nextFloat() * totalWeight;
                for (const outcome of effect.outcomes) {
                    roll -= outcome.weight;
                    if (roll <= 0) {
                        for (const subEffect of outcome.effects) {
                            EventSystem.applyEffect(subEffect, run, rng, result);
                        }
                        break;
                    }
                }
                break;
            }
        }
    }
}
