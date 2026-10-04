# 常用命令

只列玩家真正用得上的命令。输入时按 **Tab** 可以自动补全，
打错了多半是权限或版本问题，看屏幕红字提示。

::: tip 记不住？
游戏里输入 `/` 后按 Tab 翻一遍最直接。
整合包原版功能的完整命令表见
[官方命令文档](https://doc.ideafox.top/docs/Midnight/zeronight/zeronight-commands)。

## 账号（进服第一件事）

| 命令 | 作用 |
| --- | --- |
| `/register <密码> <确认密码>` | 注册账号（首次进服必做） |
| `/login <密码>` | 登录（每次进服都要） |
| `/changepassword <旧密码> <新密码>` | 修改密码 |
| `/logout` | 注销当前登录状态 |

## 家与传送

| 命令 | 作用 |
| --- | --- |
| `/sethome` | 把脚下设为家 |
| `/home` | 回家 |
| `/delhome` | 删除当前所在的家 |
| `/homelist` | 查看自己的家（图形界面） |
| `/spawn` | 回出生点 |
| `/back` | 回到上一个位置（死亡后可回尸体处） |
| `/rtp` | 随机传送到野外，找地方安家用 |
| `/warp` / `/warplist` | 服务器公共传送点，打开列表选一个 |
| `/ptp request <玩家>` | 请求传送到某个玩家（对方同意后生效） |
| `/afk` | 挂机标记，避免被判定为离开 |

## 经济

| 命令 | 作用 |
| --- | --- |
| `/bal` | 看自己的余额 |
| `/baltop` | 财富排行榜 |
| `/pay <玩家> <金额>` | 转账给玩家 |
| `/paytoggle` | 开关是否接受别人转账 |

## 玩法功能

| 命令 | 作用 |
| --- | --- |
| `/bp` | 战令面板，做任务领奖励 |
| `/signin` | 每日签到 |
| `/plt shop` | 称号商城，买/换称号 |
| `/plt open` | 打开称号仓库，切换已拥有的称号 |
| `/sf` | Slimefun 科技魔法，打开指南 |
| `/spm` | 玩家市场，摆摊卖东西、淘货 |
| `/sashop` | 系统商店（收购/出售 GUI） |
| `/friend`（`/f`） | 好友系统 |
| `/sit` `/lay` `/crawl` | 坐下 / 躺下 / 趴下，对准方块用 |
| `/kits` | 礼包与物资领取界面 |
| `/skin <皮肤名>` | 换皮肤；`/skins` 打开皮肤选择菜单 |
| `/msg <玩家> <内容>` | 私聊 |

## 红包（聊天栏互动）

| 命令 | 作用 |
| --- | --- |
| `/fhb` | 发一个红包 |
| `/qhb` | 抢聊天栏里的红包 |
| `/hb` | 红包主界面 |

## 垃圾桶

| 命令 | 作用 |
| --- | --- |
| `/wtc` | 打开垃圾桶，扔错东西能捞回来 |
| `/bin` | 公共垃圾桶 |

## 领地（Dominion）

| 命令 | 作用 |
| --- | --- |
| `/dom menu` | 领地主菜单（推荐从这里点） |
| `/dom create <名称>` | 用选定点创建领地 |
| `/dom auto_create <名称>` | 在脚下快速圈一块领地 |
| `/dom list` | 查看自己的领地 |
| `/dom tp <领地名称>` | 传送到自己的领地 |
| `/dom expand <格数> <方向>` | 扩大领地（方向如 north/east/south/west/up/down） |
| `/dom resize <扩展\|收缩> <格数> <方向>` | 精确调整领地大小 |
| `/dom member_add <领地名称> <玩家>` | 把朋友加进领地一起建造 |
| `/dom set_tp <领地名称>` | 设置领地传送点 |
| `/dom help` | 领地命令帮助 |

领地玩法细节（选点、权限标志、群组）看
[领地插件教程](https://doc.ideafox.top/docs/Midnight/midori-dream/dom-help) 与
[命令速查](https://doc.ideafox.top/docs/Midnight/Other-Docs/dominion-help)。

## 基岩版专属菜单（Geyser）

这些菜单主要给基岩版玩家，Java 玩家用不到：

| 命令 | 作用 |
| --- | --- |
| `/geyser advancements` | 查看 Java 版进度 |
| `/geyser statistics` | 查看统计信息 |
| `/geyser settings` | 设置菜单 |
| `/geyser offhand` | 把手上物品放到副手 |

::: warning 别乱用管理命令
WorldEdit（`//` 开头）、封禁类命令都是给管理员的，
普通玩家输入只会收到「没有权限」。
:::
