import { _decorator, Component, Label, ProgressBar, Node, Color, tween, Vec3 } from 'cc';
import { gameEvents } from '../../core/event-bus';
import { GameEvents, IntentType, StatusEffectType } from '../../core/constants';
import { EnemyModel } from '../../models/enemy-model';

const { ccclass, property } = _decorator;

/** 意图图标文字映射 */
const INTENT_TEXT: Record<IntentType, string> = {
    [IntentType.Attack]:       '⚔',
    [IntentType.Defend]:       '🛡',
    [IntentType.Buff]:         '↑',
    [IntentType.Debuff]:       '↓',
    [IntentType.AttackDebuff]: '⚔↓',
    [IntentType.Unknown]:      '?',
};

/** 意图颜色 */
const INTENT_COLORS: Record<IntentType, Color> = {
    [IntentType.Attack]:       new Color(230, 80,  60,  255),
    [IntentType.Defend]:       new Color(80,  150, 230, 255),
    [IntentType.Buff]:         new Color(100, 220, 100, 255),
    [IntentType.Debuff]:       new Color(180, 80,  180, 255),
    [IntentType.AttackDebuff]: new Color(230, 120, 60,  255),
    [IntentType.Unknown]:      new Color(150, 150, 150, 255),
};

const STATUS_NAMES: Record<StatusEffectType, string> = {
    [StatusEffectType.Vulnerable]: '易伤',
    [StatusEffectType.Weak]:       '虚弱',
    [StatusEffectType.Strength]:   '力量',
    [StatusEffectType.Dexterity]:  '敏捷',
    [StatusEffectType.Burn]:       '灼烧',
    [StatusEffectType.Freeze]:     '冰封',
    [StatusEffectType.Bleed]:      '流血',
    [StatusEffectType.Poison]:     '中毒',
    [StatusEffectType.Brittle]:    '脆弱',
};

/**
 * 敌人状态显示组件
 * 显示HP进度条、意图图标、状态效果
 * 挂载到每个敌人节点上
 */
@ccclass('EnemyDisplay')
export class EnemyDisplay extends Component {
    /** HP进度条 */
    @property(ProgressBar)
    hpBar: ProgressBar = null!;

    /** HP文字，如 "45 / 80" */
    @property(Label)
    hpLabel: Label = null!;

    /** 格挡值文字 */
    @property(Label)
    blockLabel: Label = null!;

    /** 格挡节点（无格挡时隐藏） */
    @property(Node)
    blockNode: Node = null!;

    /** 意图图标文字 */
    @property(Label)
    intentLabel: Label = null!;

    /** 意图数值文字（如伤害量） */
    @property(Label)
    intentValueLabel: Label = null!;

    /** 状态效果文字 */
    @property(Label)
    statusLabel: Label = null!;

    /** 敌人名称文字 */
    @property(Label)
    nameLabel: Label = null!;

    /** 敌人图形节点（用于受击动画） */
    @property(Node)
    characterNode: Node = null!;

    /** 此组件绑定的敌人实例ID */
    private _enemyInstanceId: number = -1;

    onLoad() {
        gameEvents.on(GameEvents.HP_CHANGED,           this._onHpChanged,      this);
        gameEvents.on(GameEvents.BLOCK_GAINED,         this._onBlockGained,    this);
        gameEvents.on(GameEvents.STATUS_APPLIED,       this._onStatusApplied,  this);
        gameEvents.on(GameEvents.ENEMY_INTENT_CHANGED, this._onIntentChanged,  this);
        gameEvents.on(GameEvents.ENEMY_DIED,           this._onEnemyDied,      this);
    }

    onDestroy() {
        gameEvents.off(GameEvents.HP_CHANGED,           this._onHpChanged,      this);
        gameEvents.off(GameEvents.BLOCK_GAINED,         this._onBlockGained,    this);
        gameEvents.off(GameEvents.STATUS_APPLIED,       this._onStatusApplied,  this);
        gameEvents.off(GameEvents.ENEMY_INTENT_CHANGED, this._onIntentChanged,  this);
        gameEvents.off(GameEvents.ENEMY_DIED,           this._onEnemyDied,      this);
    }

    /**
     * 初始化（战斗开始时由 BattleSceneCtrl 调用）
     */
    initFromEnemy(enemy: EnemyModel) {
        this._enemyInstanceId = enemy.instanceId;

        if (this.nameLabel) {
            this.nameLabel.string = enemy.nameZh;
        }

        this._refreshHp(enemy.hp, enemy.maxHp);
        this._refreshBlock(enemy.block);
        this._refreshStatus(enemy.statusEffects);
        this._refreshIntent(enemy.currentIntent.type, enemy.currentIntent.value);
    }

    // ---- 事件处理 ----

    private _onHpChanged(data: { target: string; enemyId?: number; hp: number; maxHp: number; damage?: number }) {
        if (data.target !== 'enemy' || data.enemyId !== this._enemyInstanceId) return;
        this._refreshHp(data.hp, data.maxHp);
        if (data.damage && data.damage > 0) {
            this._playHitFlash();
        }
    }

    private _onBlockGained(data: { target: string; enemyId?: number; block: number }) {
        if (data.target !== 'enemy' || data.enemyId !== this._enemyInstanceId) return;
        this._refreshBlock(data.block);
    }

    private _onStatusApplied(data: { target: string; enemyId?: number; type: StatusEffectType; stacks: number }) {
        if (data.target !== 'enemy' || data.enemyId !== this._enemyInstanceId) return;
        // 简化：重新收集状态，BattleSceneCtrl 可整体刷新
        // 这里直接显示最新叠加量
        if (this.statusLabel) {
            const current = this.statusLabel.string;
            const name = STATUS_NAMES[data.type] ?? data.type;
            // 检查是否已有该状态文字，有则更新，无则追加
            if (current.includes(name)) {
                // 简单方案：触发整体刷新依赖 BattleSceneCtrl
            } else {
                this.statusLabel.string = current
                    ? `${current}  ${name}×${data.stacks}`
                    : `${name}×${data.stacks}`;
            }
        }
    }

    private _onIntentChanged(data: { enemyId: number; intent: { type: IntentType; value: number } }) {
        if (data.enemyId !== this._enemyInstanceId) return;
        this._refreshIntent(data.intent.type, data.intent.value);
    }

    private _onEnemyDied(data: { enemyId: number }) {
        if (data.enemyId !== this._enemyInstanceId) return;
        // 死亡动画：缩小后隐藏
        tween(this.node)
            .to(0.3, { scale: new Vec3(0, 0, 1) })
            .call(() => { this.node.active = false; })
            .start();
    }

    // ---- 刷新方法 ----

    private _refreshHp(hp: number, maxHp: number) {
        if (this.hpBar) {
            this.hpBar.progress = maxHp > 0 ? hp / maxHp : 0;
        }
        if (this.hpLabel) {
            this.hpLabel.string = `${hp} / ${maxHp}`;
        }
    }

    private _refreshBlock(block: number) {
        if (this.blockNode) {
            this.blockNode.active = block > 0;
        }
        if (this.blockLabel) {
            this.blockLabel.string = String(block);
        }
    }

    _refreshStatus(statusEffects: Map<StatusEffectType, number>) {
        if (!this.statusLabel) return;
        const parts: string[] = [];
        for (const [type, stacks] of statusEffects) {
            if (stacks > 0) {
                parts.push(`${STATUS_NAMES[type] ?? type}×${stacks}`);
            }
        }
        this.statusLabel.string = parts.join('  ');
    }

    private _refreshIntent(type: IntentType, value: number) {
        if (this.intentLabel) {
            this.intentLabel.string = INTENT_TEXT[type] ?? '?';
            this.intentLabel.color = INTENT_COLORS[type] ?? new Color(200, 200, 200, 255);
        }
        if (this.intentValueLabel) {
            // 只对攻击意图显示数值
            if (type === IntentType.Attack || type === IntentType.AttackDebuff) {
                this.intentValueLabel.string = String(value);
                this.intentValueLabel.node.active = true;
            } else {
                this.intentValueLabel.node.active = false;
            }
        }
    }

    /** 受击闪烁 */
    private _playHitFlash() {
        if (!this.characterNode) return;
        tween(this.characterNode)
            .to(0.05, { scale: new Vec3(1.08, 0.92, 1) })
            .to(0.05, { scale: new Vec3(0.92, 1.08, 1) })
            .to(0.05, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
