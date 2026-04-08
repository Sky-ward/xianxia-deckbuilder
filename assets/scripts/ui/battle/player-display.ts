import { _decorator, Component, Label, ProgressBar, Node, Color, tween, Vec3 } from 'cc';
import { gameEvents } from '../../core/event-bus';
import { GameEvents, StatusEffectType } from '../../core/constants';
import { PlayerModel } from '../../models/player-model';

const { ccclass, property } = _decorator;

/**
 * 玩家状态显示组件
 * 显示HP进度条、格挡值、灵力、状态效果
 * 挂载到场景中 PlayerPanel 节点上
 */
@ccclass('PlayerDisplay')
export class PlayerDisplay extends Component {
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

    /** 状态效果列表节点（子节点为各状态图标） */
    @property(Node)
    statusNode: Node = null!;

    /** 状态文字（简化显示：叠加在一行） */
    @property(Label)
    statusLabel: Label = null!;

    /** 受击闪烁节点（整个角色图像节点） */
    @property(Node)
    characterNode: Node = null!;

    onLoad() {
        gameEvents.on(GameEvents.HP_CHANGED,     this._onHpChanged,     this);
        gameEvents.on(GameEvents.BLOCK_GAINED,   this._onBlockGained,   this);
        gameEvents.on(GameEvents.STATUS_APPLIED, this._onStatusApplied, this);
        gameEvents.on(GameEvents.STATUS_REMOVED, this._onStatusRemoved, this);
    }

    onDestroy() {
        gameEvents.off(GameEvents.HP_CHANGED,     this._onHpChanged,     this);
        gameEvents.off(GameEvents.BLOCK_GAINED,   this._onBlockGained,   this);
        gameEvents.off(GameEvents.STATUS_APPLIED, this._onStatusApplied, this);
        gameEvents.off(GameEvents.STATUS_REMOVED, this._onStatusRemoved, this);
    }

    /**
     * 初始化显示（战斗开始时由 BattleSceneCtrl 调用）
     */
    initFromPlayer(player: PlayerModel) {
        this._refreshHp(player.hp, player.maxHp);
        this._refreshBlock(player.block);
        this._refreshStatus(player.statusEffects);
    }

    // ---- 事件处理 ----

    private _onHpChanged(data: { target: string; hp: number; maxHp: number; damage?: number }) {
        if (data.target !== 'player') return;
        this._refreshHp(data.hp, data.maxHp);
        if (data.damage && data.damage > 0) {
            this._playHitFlash();
        }
    }

    private _onBlockGained(data: { target: string; block: number }) {
        if (data.target !== 'player') return;
        this._refreshBlock(data.block);
    }

    private _onStatusApplied(data: { target: string; type: StatusEffectType; stacks: number }) {
        if (data.target !== 'player') return;
        // 重新构造并刷新状态文字（这里用简单合并方式）
        // BattleSceneCtrl 会在需要时调用 initFromPlayer 完整刷新
    }

    private _onStatusRemoved(data: { target: string; type: StatusEffectType }) {
        if (data.target !== 'player') return;
        // 同上
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
        const nameMap: Record<StatusEffectType, string> = {
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

        for (const [type, stacks] of statusEffects) {
            if (stacks > 0) {
                parts.push(`${nameMap[type] ?? type}×${stacks}`);
            }
        }

        this.statusLabel.string = parts.join('  ');
        if (this.statusNode) {
            this.statusNode.active = parts.length > 0;
        }
    }

    /** 受击红色闪烁动画 */
    private _playHitFlash() {
        if (!this.characterNode) return;
        tween(this.characterNode)
            .to(0.05, { scale: new Vec3(1.05, 0.95, 1) })
            .to(0.05, { scale: new Vec3(0.95, 1.05, 1) })
            .to(0.05, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
