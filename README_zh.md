# osu!autoref

由 [Cychloryn](https://osu.ppy.sh/users/6921736) 开发的 osu! 半自动裁判机器人。由 [M A N O L O](https://osu.ppy.sh/users/12296128) 适配为自动化资格赛机器人。由 [heipizhu](https://osu.ppy.sh/users/29319435) 和 [31415906](https://osu.ppy.sh/users/33138632) 适配为mania模式的自动化资格赛机器人。

已在 Windows 系统上测试。
使用 ThePoon 开发的 bancho.js。


## 功能特性
- 自动创建比赛房间
- 为房主和玩家提供的额外mp命令！
  - 仅房主可用的命令：
    - 使用 `>invite` 邀请所有玩家
    - 使用 `>timeout` 自动进行战术暂停
    - 使用 `>close` 自动关闭房间
  - 玩家命令：
    - 在第二轮中，如果所有玩家都希望跳过当前谱面，可以使用 `#skip` 跳过
    - 使用 `#gsm` 测试延迟
    - 当出现问题需要呼叫裁判时，使用 `!panic`
- 自动记录分数
- 玩家准备就绪后自动开始比赛
- 每场比赛开始时都会播放您自定义的音乐！
- 支持无限次运行！

## 配置
在运行 osu!autoref 之前，您需要填写一些配置信息。

### config.json
创建一个名为 `config.json` 的文件。您可以复制模板文件 `config.example.json`。您需要填写您的用户名、[IRC 服务器密码](https://osu.ppy.sh/p/irc)、osu! [API 密钥](https://osu.ppy.sh/p/api) 以及 [Discord Webhook 链接](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)。

### pool.json
将图池信息加载到此文件中。示例文件中的格式应该是不言自明的。它只需要谱面代码（如 NM2, HR3, DT1 等）和谱面的 ID。机器人会根据谱面代码推断 Mod，但您也可以通过 "mod" 字段明确指定 Mod。

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

## 运行
要求：安装 node.js ~~（我使用的是 node v10 版本）~~ 最新的 node.js 也可以工作，但我推荐使用 LTS 版本
```bash
npm install
npm start 或 node index
```

## 使用方法
运行此机器人后，将自动创建一个比赛房间，密码将记录在终端中。您可以通过终端窗口向聊天室发送消息，但这有点不稳定，因此我建议同时打开一个 IRC 客户端或保持在游戏内。

首先，您可以使用以下特殊命令邀请所有队伍的所有玩家加入比赛房间：
```bash
>invite
```
如果您想让玩家休息一下，可以执行以下命令：
```bash
>timeout
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

对于玩家，在资格赛房间的第二轮中，他们将可以使用以下命令跳过谱面：使用该命令后会出现投票计数。
```
#skip
```
如果他们想 ping 机器人以检查其是否正常工作，则会发送消息 `干什么¿`。
```
#gsm
```
如果事故过于严重，玩家可以使用此命令呼叫房主。
```
!panic
```
