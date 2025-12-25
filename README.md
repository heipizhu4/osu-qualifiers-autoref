# osu!autoref

Semi-automated referee bot for osu! by [Cychloryn](https://osu.ppy.sh/users/6921736). Adapted to be an automated qualifiers bot by [M A N O L O](https://osu.ppy.sh/users/12296128). Adapted to be an automated qualifiers bot for mania mode by [heipizhu](https://osu.ppy.sh/users/29319435) and [31415906](https://osu.ppy.sh/users/33138632).
Special thanks to [xiaobaidan](https://osu.ppy.sh/users/26795413) for testing!

Tested on Windows and MacOS.
Uses bancho.js by ThePoon.

中文readme请见：https://github.com/heipizhu4/osu-qualifiers-autoref/blob/master/README_zh.md

## Features
- Creates match automatically
- Extra mp commands for host and players!
  - Host only command:
    - Invite all players with `>invite`
    - Auto tactical timeout with `>timeout`
    - Close the lobby automatically with `>close`
  - Player command:
    - Skip the map during round2 if all players would like to with `#skip`
    - `#gsm` for ping usage.
    - `!panic` when things went wrong and you need to ping the ref!
- Automatic scorekeeping
- Auto start matches when players are ready
- Every match starts with your own Elevator music
- Reboot the bot and rejoin the room when neccessary
- As many runs as you'd like!
 
## Configuration
Before running osu!autoref, you'll need to fill out some configuration.

### config.json
Create a file `config.json`. You can copy the template file `config.example.json`. You will need to add your username, [IRC password](https://osu.ppy.sh/p/irc),  osu! [API key](https://osu.ppy.sh/p/api), and [Discord webhook link](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)

### pool.json
Load the mappool into this file. The format should be self-explanatory from the example pool. It requires only the map code (NM2, HR3, DT1, etc) and the ID of the map. The bot will infer the mods based on the map code, but you can (optionally) explicitly provide the mod via the "mod" field.

### match.json
Configure the game settings, including timers, waiting song/map, ID, whether you want the mp to be private or not, the number of runs, the tournament acronym, and players participating, ensuring adherence to the provided JSON structure. 
In case you need to add more players do it like this:
```json
  "teams": [
      {"name": "Player 1"},
      {"name": "Player 2"},
      {"name": "Player 3"}
  ]
```

### optionalWords.json (Optional)
This file allows you to configure custom join/leave messages for specific players. When a player with an entry in this file joins or leaves the lobby, the bot will send a personalized message. The format is:
```json
{
  "playerUsername": {
    "join": "Custom message when player joins",
    "leave": "Custom message when player leaves"
  }
}
```
Example:
```json
{
  "PlayerName": {
    "join": "Welcome MWC MVP PlayerName to the lobby!",
    "leave": "PlayerName has left the lobby."
  }
}
```
If this file doesn't exist or a player isn't listed, no special message will be sent.
## Running
Requires: [node.js](https://nodejs.org/en/download) ~~(I use node v10)~~ latest node.js also works though I recommend using LTS
```bash
npm install
npm start
```

To restart the new UI just in case the program froze in the middle of a game:
```bash
npm run restart
```

For a text-only version:
```bash
node main.js
```
`index.js` is legacy and no longer maintained; use `npm start` (or `npm run restart`) for the new UI.

## Usage
Upon running this bot, a match will be created, and the password will be logged to the terminal. You can send messages to the chatroom via the terminal window, but this is kinda janky, so I'd recommenda also having an IRC client open/being in-game.

### Host side command
First, you can use this special command to invite all players from both teams to the match:
```py
>invite
```
If you want to give the players a break, you can easily do it by executing this next command:
```py
>timeout
```
If you want to skip a map maually, you can use this command:
```py
>skip
```
If you want to jump to a certain map, then use the following command:
```
>map [code, eg: rc1] [round, eg: 1]
```
If you would like to force start a map, this can be quite useful:
```
>start
```
If you need to takeover the bot at any point through, but you don't want to close the enitre thing just yet, you can use this next command, with any argument, except `on`, which will turn it back on.
```py
>auto off
>auto on
```
At the end of the match, close the lobby with:
```py
>close
```
This command is recommended over `!mp close`, because it also disconnects the bot from Bancho and cleanly exits the program.

If you need to add additional referees who can use `>` commands, use:
```py
>addref [username]
```
To remove a referee (cannot remove the bot owner):
```py
>removeref [username]
```

If you happened to forget a certain command, feel free to use this:
```py
>help
```
In case things went terribly wrong that you need to restart the bot, you need to fill out `RestartSettings.json`, and type this into the **command line**:
```bash
npm run restart
```
Please note that `MapIndex` starts with 0. (That is, if you want to start out with the second map of the first round, then MapIndex=1, Round=1.)

## Player side command
For players, on the second round of the qualifier lobby, they will be allowed to skip maps by using this command: A vote count will appear after the command.
```
#skip
```

If players want to ping the bot to check if the bot is working, they may use the next command. A message `干什么¿` would be sent.
```
#gsm
```
They may also ping the bot in a funny way by 'poking' using this command:
```
#poke
```
If things went horribly wrong, players may use this command to call the host.
```
!panic
```

They may learn how to use the player side command by using:
```
#help
```
