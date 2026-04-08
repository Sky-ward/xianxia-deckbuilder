import { _decorator, Component, Button, Label, director, resources, JsonAsset } from 'cc';
import { GameManager } from '../../core/game-manager';
import { CardLoader } from '../../data/card-loader';
import { EnemyLoader } from '../../data/enemy-loader';

const { ccclass, property } = _decorator;

/**
 * 标题场景根控制器
 * 显示开始按钮，负责加载数据并进入地图场景
 * 挂载到标题场景的 Canvas 根节点上
 */
@ccclass('TitleSceneCtrl')
export class TitleSceneCtrl extends Component {
    /** 开始游戏按钮 */
    @property(Button)
    startButton: Button = null!;

    /** 游戏副标题文字 */
    @property(Label)
    subtitleLabel: Label = null!;

    /** 加载中提示文字 */
    @property(Label)
    loadingLabel: Label = null!;

    onLoad() {
        if (this.subtitleLabel) {
            this.subtitleLabel.string = '仙侠传：炼心之道';
        }
        if (this.loadingLabel) {
            this.loadingLabel.node.active = false;
        }
        if (this.startButton) {
            this.startButton.node.on(Button.EventType.CLICK, this._onStartClicked, this);
        }
    }

    onDestroy() {
        if (this.startButton) {
            this.startButton.node.off(Button.EventType.CLICK, this._onStartClicked, this);
        }
    }

    private _onStartClicked() {
        if (this.startButton) {
            this.startButton.interactable = false;
        }
        if (this.loadingLabel) {
            this.loadingLabel.node.active = true;
            this.loadingLabel.string = '正在加载数据...';
        }

        // 使用 Cocos Creator 的 resources.load 加载 JSON 数据
        this._loadAllData(() => {
            GameManager.instance.startNewRun('jian_xiu');
            director.loadScene('map');
        });
    }

    /**
     * 通过 resources.load 加载卡牌和敌人 JSON 文件
     * 文件须放在 assets/resources/data/ 目录下
     */
    private _loadAllData(onComplete: () => void) {
        const paths = [
            'data/cards/jian-xiu-cards',
            'data/enemies/enemies',
            'data/enemies/encounters',
        ];

        let remaining = paths.length;

        const checkDone = () => {
            remaining--;
            if (remaining <= 0) onComplete();
        };

        // 加载剑修卡牌
        resources.load('data/cards/jian-xiu-cards', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[TitleSceneCtrl] 加载卡牌数据失败:', err);
            } else if (asset) {
                CardLoader.loadFromJson(asset.json);
            }
            checkDone();
        });

        // 加载敌人基础数据
        resources.load('data/enemies/enemies', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[TitleSceneCtrl] 加载敌人数据失败:', err);
            } else if (asset) {
                EnemyLoader.loadEnemiesFromJson(asset.json);
            }
            checkDone();
        });

        // 加载遭遇配置
        resources.load('data/enemies/encounters', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[TitleSceneCtrl] 加载遭遇配置失败:', err);
            } else if (asset) {
                EnemyLoader.loadEncountersFromJson(asset.json);
            }
            checkDone();
        });
    }
}
