/** 五行属性 */
export enum ElementType {
    Metal = 'metal',   // 金
    Wood = 'wood',     // 木
    Water = 'water',   // 水
    Fire = 'fire',     // 火
    Earth = 'earth',   // 土
}

/** 卡牌类型 */
export enum CardType {
    Attack = 'attack',   // 功法 (攻击)
    Skill = 'skill',     // 法术 (技能)
    Power = 'power',     // 符箓 (持续效果)
}

/** 卡牌稀有度 */
export enum CardRarity {
    Starter = 'starter',
    Common = 'common',
    Uncommon = 'uncommon',
    Rare = 'rare',
}

/** 目标类型 */
export enum TargetType {
    SingleEnemy = 'single_enemy',
    AllEnemies = 'all_enemies',
    Self = 'self',
    None = 'none',
}

/** 敌人意图类型 */
export enum IntentType {
    Attack = 'attack',
    Defend = 'defend',
    Buff = 'buff',
    Debuff = 'debuff',
    AttackDebuff = 'attack_debuff',
    Unknown = 'unknown',
}

/** 状态效果类型 */
export enum StatusEffectType {
    // 通用
    Vulnerable = 'vulnerable',   // 易伤 (受到伤害+50%)
    Weak = 'weak',               // 虚弱 (造成伤害-25%)
    Strength = 'strength',       // 力量 (增加攻击伤害)
    Dexterity = 'dexterity',     // 敏捷 (增加格挡值)

    // 五行相关
    Burn = 'burn',       // 灼烧 (火) — 回合结束受伤害
    Freeze = 'freeze',   // 冰封 (水) — 下回合少抽1牌
    Bleed = 'bleed',     // 流血 (金) — 打出攻击牌时受伤害
    Poison = 'poison',   // 中毒 (木) — 回合结束受伤害并递减
    Brittle = 'brittle', // 脆弱 (土) — 格挡效果减半
}

/** 地图节点类型 */
export enum MapNodeType {
    NormalBattle = 'normal_battle',
    EliteBattle = 'elite_battle',
    Boss = 'boss',
    Rest = 'rest',
    Event = 'event',
    Shop = 'shop',
    Treasure = 'treasure',
}

/** 游戏阶段 */
export enum GamePhase {
    Title = 'title',
    Map = 'map',
    Battle = 'battle',
    Reward = 'reward',
    GameOver = 'game_over',
}

/** 战斗阶段 */
export enum BattlePhase {
    PlayerTurnStart = 'player_turn_start',
    PlayerAction = 'player_action',
    PlayerTurnEnd = 'player_turn_end',
    EnemyTurnStart = 'enemy_turn_start',
    EnemyAction = 'enemy_action',
    EnemyTurnEnd = 'enemy_turn_end',
    Victory = 'victory',
    Defeat = 'defeat',
}

/** 事件名称常量 */
export const GameEvents = {
    // 战斗事件
    BATTLE_STARTED: 'battle_started',
    BATTLE_WON: 'battle_won',
    BATTLE_LOST: 'battle_lost',
    TURN_STARTED: 'turn_started',
    TURN_ENDED: 'turn_ended',
    ENEMY_TURN_STARTED: 'enemy_turn_started',
    ENEMY_TURN_ENDED: 'enemy_turn_ended',

    // 卡牌事件
    CARD_PLAYED: 'card_played',
    CARD_DRAWN: 'card_drawn',
    HAND_UPDATED: 'hand_updated',
    DECK_SHUFFLED: 'deck_shuffled',
    CARD_EXHAUSTED: 'card_exhausted',

    // 战斗单位事件
    DAMAGE_DEALT: 'damage_dealt',
    BLOCK_GAINED: 'block_gained',
    HP_CHANGED: 'hp_changed',
    ENERGY_CHANGED: 'energy_changed',
    STATUS_APPLIED: 'status_applied',
    STATUS_REMOVED: 'status_removed',
    ENEMY_DIED: 'enemy_died',
    ENEMY_INTENT_CHANGED: 'enemy_intent_changed',

    // 五行事件
    ELEMENT_COMBO: 'element_combo',

    // 地图事件
    MAP_NODE_SELECTED: 'map_node_selected',
    MAP_NODE_COMPLETED: 'map_node_completed',

    // 奖励事件
    CARD_REWARD_CHOSEN: 'card_reward_chosen',
    CARD_REWARD_SKIPPED: 'card_reward_skipped',
} as const;

/** 游戏平衡常量 */
export const Balance = {
    HAND_SIZE: 5,              // 每回合抽牌数
    MAX_HAND_SIZE: 10,         // 手牌上限
    STARTING_ENERGY: 3,        // 初始灵力
    STARTING_HP: 80,           // 初始HP
    ELEMENT_RESTRICT_BONUS: 1.5,    // 五行相克伤害倍率
    ELEMENT_RESTRICT_PENALTY: 0.75, // 五行被克伤害倍率
    ELEMENT_GENERATE_BONUS: 1.25,   // 五行相生连招加成
    VULNERABLE_MULTIPLIER: 1.5,     // 易伤伤害倍率
    WEAK_MULTIPLIER: 0.75,          // 虚弱伤害倍率
    BRITTLE_BLOCK_MULTIPLIER: 0.5,  // 脆弱格挡倍率
    REST_HEAL_PERCENT: 0.3,         // 休息恢复比例
    CARD_REWARD_COUNT: 3,           // 奖励卡牌数量
} as const;
