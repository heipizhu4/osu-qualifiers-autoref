# osu!autoref

Semi-automated referee bot for osu! by [Cychloryn](https://osu.ppy.sh/users/6921736). Adapted to be an automated qualifiers bot by [M A N O L O]([https://osu.ppy.sh/users/12296128]).

Tested on Linux and Windows.
Uses bancho.js by ThePoon.

## Features
- Creates match automatically
- Extra mp commands
  - Invite all players with `>invite`
- Automatic scorekeeping
- Auto start matches when players are ready
- Every match starts with Elevator music
 
## Configuration
Before running osu!autoref, you'll need to fill out some configuration.

### config.json
Create a file `config.json`. You can copy the template file `config.example.json`. You will need to add your username, [IRC password](https://osu.ppy.sh/p/irc), and osu! [API key](https://osu.ppy.sh/p/api).

### pool.json
Load the mappool into this file. The format should be self-explanatory from the example pool. It requires only the map code (NM2, HR3, DT1, etc) and the ID of the map. The bot will infer the mods based on the map code, but you can (optionally) explicitly provide the mod via the "mod" field.

### match.json
Contains the users for your match. The first team will be blue, and the second will be red. This file also contains match metadata like the name of the tournament, and the "best-of" for the match (deprecated, not used).

## Running
Requires: node.js (I use node v10)
```
npm install
npm start
```

## Usage
Upon running this bot, a match will be created, and the password will be logged to the terminal. You can send messages to the chatroom via the terminal window, but this is kinda janky, so I'd recommenda also having an IRC client open/being in-game.

First, you can use this special command to invite all players from both teams to the match:
```
>invite
```
At the end of the match, close the lobby with:
```
>close
```
This command is recommended over `!mp close`, because it also disconnects the bot from Bancho and cleanly exits the program.
