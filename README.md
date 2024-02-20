# osu!autoref

Semi-automated referee bot for osu! by [Cychloryn](https://osu.ppy.sh/users/6921736). Adapted to be an automated qualifiers bot by [M A N O L O](https://osu.ppy.sh/users/12296128).

Tested on Windows.
Uses bancho.js by ThePoon.

I might work on a better readme later...

## Features
- Creates match automatically
- Extra mp commands
  - Invite all players with `>invite`
  - Auto tactical timeout with `>timeout`
  - Close the lobby automatically with `>close`
- Automatic scorekeeping
- Auto start matches when players are ready
- Every match starts with your own Elevator music
- As many runs as you'd like!
 
## Configuration
Before running osu!autoref, you'll need to fill out some configuration.

### config.json
Create a file `config.json`. You can copy the template file `config.example.json`. You will need to add your username, [IRC password](https://osu.ppy.sh/p/irc), and osu! [API key](https://osu.ppy.sh/p/api).

### pool.json
Configure the game settings, including timers, waiting song duration, ID, privacy status, number of runs, tournament name, and teams participating, ensuring adherence to the provided JSON structure. In case you need to add more players do it like this:
```json
  "teams": [
      {"name": "Player 1"},
      {"name": "Player 2"},
      {"name": "Player 3"}
  ]
```
### match.json
Contains the users for your match. This file also contains match metadata like the name of the tournament.

## Running
Requires: node.js ~~(I use node v10)~~ latest node also work though I recommend using LTS
```py
npm install
npm start OR node index
```

## Usage
Upon running this bot, a match will be created, and the password will be logged to the terminal. You can send messages to the chatroom via the terminal window, but this is kinda janky, so I'd recommenda also having an IRC client open/being in-game.

First, you can use this special command to invite all players from both teams to the match:
```py
>invite
```
If you want to give the players a break, you can easily do it by executing this next command:
```py
>timeout
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
