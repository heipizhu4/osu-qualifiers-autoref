# osu!autoref

由 [Cychloryn](https://osu.ppy.sh/users/6921736) 开发的 osu! 半自动裁判机器人。由 [M A N O L O](https://osu.ppy.sh/users/12296128) 适配为自动化资格赛机器人。由 [heipizhu](https://osu.ppy.sh/users/29319435) 和 [31415906](https://osu.ppy.sh/users/33138632) 适配为mania模式的自动化资格赛机器人。
特别感谢 [xiaobaidan](https://osu.ppy.sh/users/26795413) 进行测试！

已在 Windows 和 MacOS 系统上测试。
使用 ThePoon 开发的 bancho.js。

中文readme请见：https://github.com/heipizhu4/osu-qualifiers-autoref/blob/master/README_zh.md

## 功能特性
- 自动创建比赛房间
- 为房主和玩家提供的额外mp命令！
  - 仅房主可用的命令：
    - 使用 `>invite` 邀请所有玩家
    - 使用 `>timeout` 自动进行战术暂停
    - 使用 `>close` 自动关闭房间
  - 玩家命令：
    - 在资格赛第二轮中，如果所有玩家都希望跳过当前谱面，可以使用 `#skip` 跳过（使用该命令后会出现投票计数）
    - 使用 `#gsm` 测试延迟
    - 当出现问题需要呼叫裁判时，使用 `!panic`
- 自动记录分数
- 玩家准备就绪后自动开始比赛
- 每场比赛开始时都会播放您自定义的音乐！
- 必要时可重启机器人并重新加入房间
- 支持无限次运行！

## 配置
在运行 osu!autoref 之前，您需要填写一些配置信息。

### config.json
创建一个名为 `config.json` 的文件。您可以复制模板文件 `config.example.json`。您需要填写您的用户名、[IRC 服务器密码](https://osu.ppy.sh/p/irc)、osu! [API 密钥](https://osu.ppy.sh/p/api) 以及 [Discord Webhook 链接](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)。

### pool.json
将图池信息加载到此文件中。示例文件中的格式应该是不言自明的。它只需要谱面代码（如 NM2, HR3, DT1 等）和谱面的 ID。机器人会根据谱面代码推断 Mod，但您也可以通过 "mod" 字段（可选）明确指定 Mod。

### match.json
配置游戏设置，包括计时器、等待时播放的歌曲/谱面、房间 ID、是否希望多人游戏房间为私密、资格赛单图游玩次数、比赛缩写以及参赛玩家，并确保遵循提供的 JSON 结构。
如果需要添加更多玩家，请按如下格式操作：
```json
  "teams": [
      {"name": "玩家 1"},
      {"name": "玩家 2"},
      {"name": "玩家 3"}
  ]
```

### optionalWords.json（可选）
此文件允许您为特定玩家配置自定义的进入/离开消息。当此文件中有条目的玩家加入或离开房间时，机器人将发送个性化消息。格式如下：
```json
{
  "玩家用户名": {
    "join": "玩家加入时的自定义消息",
    "leave": "玩家离开时的自定义消息"
  }
}
```
示例：
```json
{
  "PlayerName": {
    "join": "欢迎 MWC MVP PlayerName 来到房间！",
    "leave": "PlayerName 离开了房间。"
  }
}
```
如果此文件不存在或玩家未被列出，则不会发送特殊消息。

## 运行
要求：安装 node.js ~~（我使用的是 node v10 版本）~~ 最新的 node.js 也可以工作，但我推荐使用 LTS 版本
```bash
npm install
npm start
```

当比赛中途程序死机且需要重启新版 UI时：
```bash
npm run restart
```

仅文本版本：
```bash
node main.js
```
`index.js` 现为旧版，不再维护，请使用 `npm start`（或 `npm run restart`）运行新版 UI。

## 使用方法
运行此机器人后，将自动创建一个比赛房间，密码将记录在终端中。您可以通过终端窗口向聊天室发送消息，但这有点不稳定，因此我建议同时打开一个 IRC 客户端或保持在游戏内。

### 房主侧命令
首先，您可以使用以下特殊命令邀请所有队伍的所有玩家加入比赛房间：
```bash
>invite
```
如果您想让玩家休息一下，可以轻松地执行以下命令：
```bash
>timeout
```
如果您想手动跳过一张谱面，可以使用此命令：
```bash
>skip
```
如果您想跳到某一张特定铺面，可以使用以下指令：
```bash
>map [图池代码，如rc1] [轮数，如1]
```
如果您想强制开始一张谱面，这个命令会非常有用：
```bash
>start
```
如果您需要在任何时候接管机器人的控制权，但又不想立即关闭整个程序，可以使用以下命令（附带任何参数，除了 `on`，`on` 用于重新开启自动模式）：
```bash
>auto off
>auto on
```
在比赛结束时，使用以下命令关闭房间：
```bash
>close
```
推荐使用此命令而不是 `!mp close`，因为它还会让机器人从 Bancho 断开连接并干净地退出程序。

如果您需要添加可以使用 `>` 命令的额外裁判，请使用：
```bash
>addref [用户名]
```
要移除裁判（不能移除机器人拥有者）：
```bash
>removeref [用户名]
```

如果您碰巧忘记了某个命令，可以随时使用：
```bash
>help
```
如果事情变得非常糟糕，以至于您需要重启机器人，您需要填写 `RestartSettings.json`，并在**命令行**中输入：
```bash
npm run restart
```
请注意 `MapIndex` 从 0 开始。（也就是说，如果您想从第一轮的第二个谱面开始，那么 MapIndex=1, Round=1。）

### 玩家侧命令
对于玩家，在资格赛房间的第二轮中，他们将可以使用以下命令跳过谱面：使用该命令后会出现投票计数。
```
#skip
```

如果玩家想 ping 机器人以检查其是否正常工作，可以使用以下命令。程序将会发送一条消息： `干什么¿`。
```
#gsm
```
也可以使用戳一戳，以有趣的方式实现ping：
```
#poke
```
如果事情变得非常糟糕，玩家可以使用此命令呼叫房主。
```
!panic
```

他们可以通过使用以下命令来了解如何使用玩家侧命令：
```
#help
```
