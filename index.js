const bancho = require('bancho.js');
const chalk = require('chalk');
const nodesu = require('nodesu');
const fs = require('fs');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Remember to fill config.json with your credentials
const config = require('./config.json');
const pool = require('./pool.json');
const match = require('./match.json');
const lobbydate = new Date();

const client = new bancho.BanchoClient(config);
const api = new nodesu.Client(config.apiKey);

let channel, lobby;
let i = 0; //map iterator
let numPlayers = match.teams.length

let auto = false; // whether to start right away or not
let timeout = false;
let ready = false;
let inPick = false;
let run = 1;
let timeStarted;

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
    lobbyname = `${match.tournament} ES Tryouts: ${match.id}`
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
function startLobby(){
  auto = true;
  lobby.startTimer(match.timers.betweenMaps);
  const map = setBeatmap(pool[i].code);
  if (map) console.log(chalk.cyan(`Changing map to ${map}`));
  setTimeout(() => {
    if(timeout && !ready){
      lobby.startTimer(match.timers.timeout);
      setTimeout(() => {
        if(!ready && numPlayers<=0){
          lobby.startMatch(match.timers.forceStart);
          timeout = false;
        }
        timeout = false;
      }, ((1000 * match.timers.timeout) + 3000));
      
    }
    else if(!ready && (numPlayers<=0 || auto)){
      lobby.startMatch(match.timers.forceStart);
    }
    else if(numPlayers>0){
      console.log(chalk.bold.red("There (might) be someone left to join.\nTake over now or enable auto with >auto on"));
    }
  }, ((1000 * match.timers.betweenMaps) + 3000));     
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
    if(numPlayers-- <= 1 || auto){ //if auto is enabled the lobby will start as soon as someone joins, else it'll wait until everyone has joined
      channel.sendMessage("All of the players are here. Starting now.");
      startLobby();
    }
    else{
      channel.sendMessage(numPlayers<2 ? `Welcome. One more left to start.` : `Welcome. There are ${numPlayers} players left to join in order to start.`);
    };
  });
  lobby.on("playerLeft",()=> {
    console.log("playerLeft")
    numPlayers++;
    fs.appendFileSync(`./lobbies/${lobby.id}.txt`,`Someone left at (${Date()}).\n`);
    if (inPick && (new Date().valueOf()-match.timers.abortLeniency*1000)<timeStarted){
      lobby.abortMatch();
      ready = false;
      channel.sendMessage("Match aborted due to early disconnect.");
    }
    else if (auto) lobby.setMap(match.waitSong);
    auto = false;
    ready = false;
  })
  lobby.on("allPlayersReady", (obj) => {
    console.log(chalk.magenta("everyone ready"));
    ready = true;
    timeout = false;
    if(auto){
      lobby.abortTimer();
      lobby.startMatch(match.timers.readyStart);
    }});
    lobby.on("matchStarted", () => {
      timeStarted = new Date().valueOf();//log time started
      fs.appendFileSync(`./lobbies/${lobby.id}.txt`,`${pool[i].code} started at (${Date()}).\n`);
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
      fs.appendFileSync(`./players/${element.player.user.username}.txt`,`${pool[i].code}: ${element.score}\n`);
    });
    i++;
    timeout = false;
    ready = false;
    inPick = false;
      try {
        if (auto){
          if (pool.length>i) {
            startLobby();
          } else if(run++ < match.numberOfRuns){
            i = 0; //sets the pointer to the first map of the pool and sets first to false.
            startLobby();
            }
          else {
          channel.sendMessage(`The lobby has finished. It'll close in ${match.timers.closeLobby} seconds.`)
          lobby.startTimer(match.timers.closeLobby);
          setTimeout(close,((1000 * match.timers.closeLobby) + 3000));
  }} else if(!(pool.length>i)){
          i = 0;
          run++;
      }} catch (error){
      channel.sendMessage(`There was an error changing the map. ID ${pool[i].code} might be incorrect. Ping your ref.`);
      console.log(chalk.bold.red(`You should take over NOW! bad ID was ${pool[i].code}.`));
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
          auto ? channel.sendMessage("Auto referee is " + (auto ? "ON" : "OFF")+ ". Starting now.") + startLobby() : channel.sendMessage("Auto referee is " + (auto ? "ON" : "OFF")) + lobby.setMap(match.waitSong);
          break;
        case 'timeout':
          timeout = true;
          break;
        case 'abort':
          await lobby.abortMatch();
          channel.sendMessage("Match aborted manually.")
          break;
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
