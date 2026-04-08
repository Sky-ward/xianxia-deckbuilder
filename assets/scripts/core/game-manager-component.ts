import { _decorator, Component, director } from 'cc';
import { GameManager } from './game-manager';

const { ccclass } = _decorator;

/**
 * GameManager 的 Cocos Component 包装器
 *
 * 用法：
 *   1. 在标题场景中创建一个空节点，命名为 "GameManager"
 *   2. 将此脚本挂载到该节点上
 *   3. Cocos 会在 onLoad 时调用 director.addPersistRootNode，
 *      使该节点在所有场景切换中持久存在
 *
 * 这样 GameManager.instance 全局单例便与场景生命周期解耦，
 * 战斗数据、Run 状态等会在 title → map → battle → reward 流程中安全保留。
 */
@ccclass('GameManagerComponent')
export class GameManagerComponent extends Component {
    onLoad() {
        // 设为持久根节点：场景切换时不销毁
        director.addPersistRootNode(this.node);

        // 预热单例，确保 GameManager.instance 已初始化
        const _gm = GameManager.instance;

        console.log('[GameManagerComponent] GameManager 已就绪，持久节点已注册');
    }
}
