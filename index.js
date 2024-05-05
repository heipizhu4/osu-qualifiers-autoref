const bancho = require('bancho.js');
const chalk = require('chalk');
const nodesu = require('nodesu');
const fs = require('fs');
const { WebhookClient } = require('discord.js');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Remember to fill config.json with your credentials
const config = require('./config.json');
const pool = require('./pool.json');
const match = require('./match.json');
const webhook = new WebhookClient({ url: config.discord.webhookLink })
const lobbydate = new Date();

const client = new bancho.BanchoClient(config);
const api = new nodesu.Client(config.apiKey);

let channel, lobby;
let playersLeftToJoin = match.teams.length 

let mapIndex = 0; //map iterator
let runIndex = 1; //what run we're on
let auto = false; // whether to start right away or not
let timeout = false; //whether there's a timeout going to be given
let ready = false; //whether everyone is ready or not
let inPick = false; //whether the match is playing or not
let timeStarted; //time the match started
let closing = false; //whether the lobby is closing or not

// populate mappool with map info
function initPool() {
  return Promise.all(pool.map(async (b) => {
    const info = (await api.beatmaps.getByBeatmapId(b.id))[0];
    b.name = b.code + ': ' + info.artist + ' - ' + info.title + ' [' + info.version + ']';
    console.log(chalk.dim(`Loaded ${info.title}`));
  }));
}

// Creates a new multi lobby
async function init() {
  await initPool();
  console.log(chalk.bold.green('Loaded map pool!'));
  console.log(chalk.cyan('Attempting to connect...'));
  
  try {
    await client.connect();
    console.log(chalk.bold.green("Connected to Bancho!"));
    const lobbyname = `${match.tournament} Qualifiers lobby: ${match.id}`
    /* lobbyname = `${match.tournament}: ${match.teams[BLUE].name} vs ${match.teams[RED].name}` */
    channel = await client.createLobby(lobbyname, match.private); 
  } catch (err) {
    console.log(err);
    console.log(chalk.bold.red("Failed to create lobby"));
    process.exit(1);
  }

  lobby = channel.lobby;

  const password = Math.random().toString(36).substring(8);
  await lobby.setPassword(password);
  await lobby.setMap(match.waitSong); //elevator music

  console.log(chalk.bold.green("Lobby created!"));
  console.log(chalk.bold.cyan(`Name: ${lobby.name}, password: ${password}`));
  console.log(chalk.bold.cyan(`Multiplayer link: https://osu.ppy.sh/mp/${lobby.id}`));
  console.log(chalk.cyan(`Open in your irc client with "/join #mp_${lobby.id}"`));
  fs.writeFileSync(`./lobbies/${lobby.id}.txt`, `https://osu.ppy.sh/mp/${lobby.id} | Lobby was created in ${lobbydate}\n`)

  lobby.setSettings(bancho.BanchoLobbyTeamModes.HeadToHead, bancho.BanchoLobbyWinConditions.ScoreV2);

  createListeners();
}

// Starts the refereeing
function startLobby() {
  auto = true;
  lobby.startTimer(match.timers.betweenMaps);
  const map = setBeatmap(pool[mapIndex].code);
  if (map) console.log(chalk.cyan(`Changing map to ${map}`));
}

// Sets current beatmap
function setBeatmap(mapCode) {
  // Find the map with the given code
  const map = pool.find((map) => map.code.toLowerCase() === mapCode.toLowerCase());

  // If no map was found, return
  if (!map) {
    return;
  }

  // Find correct mods based on map code
  let mapType = map.code.slice(0, 2);
  let mod = 'Freemod';
  if (map.mod) {
    mod = map.mod; // if mod explicitly provided (not normal)
  } else if (['HD', 'HR', 'DT'].includes(mapType)) {
    mod = mapType + " NF";
  } else if (mapType === 'NM') {
    mod = 'NF';
  }

  // Set the map and mods in the lobby
  channel.sendMessage("Selecting " + map.name);
  lobby.setMap(map.id);
  lobby.setMods(mod, false);

  return map.code;
}
function createListeners() {
  lobby.on("playerJoined", (obj) => {
    console.log("player joined")
    const name = obj.player.user.username;
    console.log(chalk.yellow(`Player ${name} has joined!`))
    fs.appendFileSync(`./lobbies/${lobby.id}.txt`,`${name} (${Date()})\n`)
    if(playersLeftToJoin-- <= 1 || auto){ //if auto is enabled the lobby will start as soon as someone joins, else it'll wait until everyone has joined
      channel.sendMessage("All of the players are here. Starting now.");
      startLobby();
    }
    else{
      channel.sendMessage(playersLeftToJoin<2 ? `Welcome. One more left to start.` : `Welcome. There are ${playersLeftToJoin} players left to join in order to start.`);
    }
  });
  lobby.on("playerLeft",()=> {
    console.log("playerLeft")
    playersLeftToJoin++;
    fs.appendFileSync(`./lobbies/${lobby.id}.txt`,`Someone left at (${Date()}).\n`);
    const isWithinAbortLeniencyPeriod = (Date.now() - match.timers.abortLeniency * 1000) < timeStarted;
    if (inPick && isWithinAbortLeniencyPeriod) {
      lobby.abortMatch();
      ready = false;
      channel.sendMessage("Match aborted due to early disconnect.");
    }
    else if (auto) lobby.setMap(match.waitSong);
    auto = false;
    ready = false;
  })
  lobby.on("allPlayersReady", () => {
    console.log(chalk.magenta("everyone ready"));
    ready = true;
    timeout = false;
    if(auto){
      lobby.abortTimer();
      lobby.startMatch(match.timers.readyStart);
    }});
    lobby.on("matchStarted", () => {
      timeStarted = new Date().valueOf();//log time started
      fs.appendFileSync(`./lobbies/${lobby.id}.txt`,`${pool[mapIndex].code} started at (${Date()}).\n`);
      inPick = true;
    });
    lobby.on("matchAborted", () => {
      console.log(chalk.yellow.bold("Match Aborted"));
      fs.appendFileSync(`./lobbies/${lobby.id}.txt`,`Match aborted at (${Date()}), `+(ready ? "by the ref." : "due to an early disconnect.")+`\n`);
      timeout = false;
      ready = false;
      inPick = false;
      if (auto) startLobby();
    });
  lobby.on("matchFinished", (obj) => {
    console.log("matchFinished")
    obj.forEach(element => {
      fs.appendFileSync(`./players/${element.player.user.username}.txt`,`${pool[mapIndex].code}: ${element.score}\n`);
    });
    mapIndex++;
    timeout = false;
    ready = false;
    inPick = false;
    try {
      const isPoolUnExhausted = (pool.length > mapIndex);

      if (auto) {
        if (isPoolUnExhausted) {
          startLobby();
        } else if (runIndex < match.numberOfRuns) {
          runIndex++;
          mapIndex = 0; //sets the pointer to the first map of the pool and sets first to false.
          startLobby();
        } else {
          closing = true;
          channel.sendMessage(`The lobby has finished. It'll close in ${match.timers.closeLobby} seconds.`);
          lobby.startTimer(match.timers.closeLobby);
        }
      } else if (!isPoolUnExhausted) {
        mapIndex = 0;
        runIndex++;
      }
    } catch (error) {
      channel.sendMessage(`There was an error changing the map. ID ${pool[mapIndex].code} might be incorrect. Ping your ref.`);
      console.log(chalk.bold.red(`You should take over NOW! bad ID was ${pool[mapIndex].code}.`));
    }
   });
  lobby.on("timerEnded", () => {
    if (closing) {
      close();
    } else if (!ready && (playersLeftToJoin <= 0 || auto)) {
      if (timeout) {
        lobby.startTimer(match.timers.timeout);
        timeout = false;
      } else {
        lobby.startMatch(match.timers.forceStart);
      }
    } else if (playersLeftToJoin > 0) {
      console.log(chalk.bold.red("There (might) be someone left to join.\nTake over now or enable auto with >auto on"));
    }
  });
  channel.on("message", async (msg) => {
    // All ">" commands must be sent by host
    console.log(chalk.dim(`${msg.user.ircUsername}: ${msg.message}`));
    if (msg.message.startsWith(">") && msg.user.ircUsername === config.username) {
      const m = msg.message.substring(1).split(' ');
      console.log(chalk.yellow(`Received command "${m[0]}"`));

      switch (m[0]) {
        case 'close':
          await close();
          break;
        case 'invite':
          for (const p of match.teams) {
            // intentionally fire these synchronously
            await lobby.invitePlayer(p.name);
          }
          break;
        case 'auto':
          auto = (m[1] === 'on');
          if (auto) {
            channel.sendMessage("Auto referee is " + "ON " + ". Starting now.");
            startLobby();
          } else {
            channel.sendMessage("Auto referee is " + "OFF");
            lobby.setMap(match.waitSong);
          }
          break;
        case 'timeout':
          timeout = true;
          channel.sendMessage("Timeout given. An additional " + match.timers.timeout + " seconds timer will be applied.");
          break;
        case 'abort':
          await lobby.abortMatch();
          channel.sendMessage("Match aborted manually.")
          break;
      }
    }
    if(auto && msg.message === "!panic"){
      auto = false;
      channel.sendMessage("Panic command received. A ref will be checking in shortly.")
      console.log(chalk.red.bold("Something has gone really wrong!\n")+"Someone has executed the !panic command and "+chalk.yellow("auto mode has been disabled"));
      await webhook.send(`<@${config.discord.refRole}>, someone has executed the !panic command on match https://osu.ppy.sh/mp/${lobby.id}.\n`+
      "join using ` /join #mp_"+lobby.id+"` The host is " + config.username+".")
      if(!ready && !inPick){
        lobby.abortTimer();
      }
    }


  });
}

rl.on('line', (input) => {
  channel.sendMessage(input);
});

async function close() {
  console.log(chalk.cyan("Closing..."));
  rl.close();
  await lobby.closeLobby();
  await client.disconnect();
  console.log(chalk.cyan("Closed."));
  process.exit(0);
}

init()
  .then(() => {
    console.log(chalk.bold.green("Initialization complete!"));
  })
