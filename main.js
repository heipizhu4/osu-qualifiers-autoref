const bancho = require('bancho.js');
const chalk = require('chalk');
const nodesu = require('nodesu');
const fs = require('fs');
const { exec, spawn: childSpawn } = require('child_process');
const { WebhookClient } = require('discord.js');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const BanchoLobbyPlayerStates = require("./node_modules/bancho.js/lib/Multiplayer/Enums/BanchoLobbyPlayerStates");
const readline = require('readline');
let rl = readline.createInterface({
  input: process.stdin,
    output: process.stdout
});

const playerEvent = {
    join: 'join',
    leave: 'leave'
};
// Remember to fill config.json with your credentials
const optionalWords = require('./optionalWords.json');
const config = require('./config.json');
const pool = require('./pool.json');
const match = require('./match.json');
const { randomInt } = require('crypto');
const { request } = require('./node_modules/undici/index');
// const webhook = new WebhookClient({ url: config.discord.webhookLink });
const lobbydate = new Date();
const originalWrite = process.stdout.write.bind(process.stdout);
const client = new bancho.BanchoClient(config);
const api = new nodesu.Client(config.apiKey);
const PokeString = new Array(`戳坏了${config.username}，你赔得起吗？`,
    "不要再戳了呜呜....(害怕ing)",
    "嗯……不可以……啦……不要乱戳",
    "呜哇！再戳把你300和max吃掉喵！！",
    `再戳${config.username}，我要叫我主人了`,
    "再戳我让你变成女孩子喵！",
    "呃啊啊啊~戳坏了....",
    "啊呜，太舒服刚刚竟然睡着了w 有什么事喵？",
    "别戳了别戳了再戳就坏掉惹...",
    "再戳我我就把你吃掉喵！",
    "涩批，你再戳咬你喵！",
    "awa，好舒服呀(bushi)",
    `QwQ，再戳${config.username}脸都要肿了`,
    "正在定位您的真实地址...定位成功。轰炸机已经起飞喵！炸似你喵！",
    "啊呜，你有什么心事吗？",
    "放手啦，不给戳QAQ"
);
let channel, lobby;
let playersLeftToJoin = match.teams.length 
let playersSkipToSkip = 0
let mapIndex = 0; //map iterator
let runIndex = 1; //what run we're on
let auto = false; // whether to start right away or not
let timeout = false; //whether there's a timeout going to be given
let ready = false; //whether everyone is ready or not
let inPick = false; //whether the match is playing or not
let timeStarted; //time the match started
let closing = false; //whether the lobby is closing or not
let MatchBegin = false;
let MapTimeout = false;
let StatusLock = false;
let IsUI = true;
let IsRestart = false;
let RefName = new Array(config.username);
const SkipMap = new Map();
const AbortMap = new Map();
const MapMap = new Map();
const IndexMap = new Map();
let Updating = false;
let win;
let RepeatString = "";
let RepeatCounting = 0;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
if (process.argv[1]!='.') {
    IsUI = false;
}
console.log(process.argv);
if (process.argv.length > 2) {
    for (let i = 2; i < process.argv.length; i++)
        switch (process.argv[i]) {
            case '--r':
            case '-r':
            case '--R':
            case '-R':
                IsRestart = true;
                break;
            case "--NoAuto":
                auto = false;
                break;
            default:
                SendLogToRanderer(`Unknown command ${process.argv[2]}!`);
                process.exit(1);
        }
}
if (process.platform.includes('win')) {
    exec('chcp 65001');
}
//process.stdout.setEncoding('utf8');
console.log(process.platform);
function createWindow() {
    win = new BrowserWindow({
        width: 1920,
        height: 1080,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
    //mainWindow.webContents.openDevTools();
}
async function SendLogToRanderer(text) {
    console.log(text);
    if (IsUI)
    win.webContents.send('Log-msg-from-main', text);
}
async function UpdatePlayerToRanderer() {
    if (!IsUI)
        return;
    let a = 0;
    for (const w of lobby.slots) {
        let q = 1;
        let playerInfo = {
            isEnable:false,
            slot: a,
            playerName: "NULL",
            mods: Array({ enumValue: 0, shortMod: "NM", longMod: "Normal" }),
            state:-1
        };
        if (w) {
            if (w.state === BanchoLobbyPlayerStates["Not Ready"]) {
                q = 0;
            } else if (w.state === BanchoLobbyPlayerStates["No Map"]) {
                q = -1;
            }
            playerInfo = {
                isEnable: true,
                slot: a,
                playerName: w.user.ircUsername,
                mods: w.mods.map(obj => ({
                    ...obj,
                    shortMod: obj.shortMod.toUpperCase()
                })),
                state: q
            };
        }
        win.webContents.send('Player-data-from-main', playerInfo);
        a++;
    }
}
async function UpdateMapToRanderer(id) {
    if (!IsUI)
        return;
    const info = (await api.beatmaps.getByBeatmapId(id))[0];
    const beatmapInfo = {
        pictureUrl: `https://assets.ppy.sh/beatmaps/${info.beatmapset_id}/covers/cover.jpg`, // 封面图片 URL
        name: info.title, // 歌曲标题
        hp: parseFloat(info.diff_drain), // HP Drain
        length: parseInt(info.total_length), // 铺面总时长（秒）
        mapper: info.creator, // 铺面作者
        difficultyName: info.version, // 难度名称
        star: parseFloat(info.difficultyrating).toFixed(2), // 星级（与 OD 相同字段，视需求可调整）
        od: parseFloat(info.diffOverall),
        bpm: parseFloat(info.bpm) // BPM
    };
    win.webContents.send('Map-data-from-main', beatmapInfo);
}
function removeAnsiCodes(str) {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}
function getFormattedTime() {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}
function optionalOutput(Name, _playerEvent) {
    let o = optionalWords[Name];
    if (o != undefined) {
        sleep(1000)
        if (o[_playerEvent] != undefined) {
            channel.sendMessage(o[_playerEvent]);
        }
        else {
            SendLogToRanderer(`未找到名称:${Name} 所拥有的特殊事件 ${_playerEvent}`);
        }
    }
    else {
        SendLogToRanderer(`未找到名称:${Name}`);
    }
}
//RefName.has()
// populate mappool with map info
function initPool() {
    let _Index = 0;
  return Promise.all(pool.map(async (b) => {
    const info = (await api.beatmaps.getByBeatmapId(b.id))[0];
      b.name = b.code + ': ' + info.artist + ' - ' + info.title + ' [' + info.version + ']';
      MapMap.set(b.code, b.id);
      IndexMap.set(b.code, _Index);
      _Index++;
    SendLogToRanderer(`Loaded ${info.title}`);
  }));
}
function WriteRestartFile() {
    const data = {
        RoomId: lobby.id,
        MapIndex: mapIndex,
        Round: runIndex,
        Ref: RefName,
        PlayerStatus: Object.fromEntries(AbortMap)
    };
    fs.writeFileSync('RestartSettings.json', JSON.stringify(data, null, 2));
  SendLogToRanderer("重启文件已自动保存于RestartSettings.json");
}
function SkipMapReset() {
    playersSkipToSkip = 0;
    SkipMap.clear();
    for (const p of match.teams) {
        SkipMap.set(p.name, true);
    }
}
function EachMapReset() {
    SkipMapReset();
    MapTimeout = false;
}
async function _updateSettings(isForce) {
    if (!(isForce) && Updating) {
        SendLogToRanderer(`Still updating! ${isForce} ${Updating}`);
        return -1;
    }
    Updating = true;
    if (IsUI)
    win.webContents.send('Updating-status-from-main', 'updating');
    await lobby.updateSettings();
    await new Promise(resolve => setTimeout(resolve, 1500));
    Updating = false;
    if (IsUI)
    win.webContents.send('Updating-status-from-main', 'idle');
    UpdatePlayerToRanderer();
    UpdateMapToRanderer(lobby.beatmap.id);
    return 0;
}
async function CheckMod(IfOutput,isForce) {
    if (Updating && (!isForce)) {
        SendLogToRanderer(`Still updating!! ${isForce} ${Updating}`);
        return -1;
    }
    if ((await _updateSettings(isForce)) == -1) {
        return -1;
    }
        let CheckPass = true;
        for (const w of lobby.slots)
            if (w != null)
                if (w.mods && w.mods.length > 0) {
                    for (const p of w.mods) {
                        if ((p.enumValue | 1049609) != 1049609) {//mr fl fi hd nf
                            if (IfOutput)
                                channel.sendMessage(`请${w.user.username} 卸下不被允许的mod: ${p.longMod}` + (MapTimeout ? `若在30秒时间内没有卸下，将强制开始游玩且该成绩将作废。` : ``));
                            CheckPass = 0;
                        }
                        SendLogToRanderer(`${w.user.username} 使用了mod: ${p.longMod}`);
                    }
            }
        return CheckPass;
}
function RestartMap() {
    EachMapReset();
    timeout = false;
    ready = false;
    inPick = false;
    StatusLock = false;
    startLobby();
}
function TryNextMap() {
    EachMapReset();
    mapIndex++;
    timeout = false;
    ready = false;
    inPick = false;
    StatusLock = false;
    try {
        const isPoolUnExhausted = (pool.length > mapIndex);


        if (auto) {
            if (isPoolUnExhausted) {
                startLobby();
            } else if (runIndex < match.numberOfRuns) {
                runIndex++;
                mapIndex = 0; //sets the pointer to the first map of the pool and sets first to false.
                startLobby2();
            } else {
                closing = true;
                channel.sendMessage(`恭喜！你已完成资格赛的全部图池，各位可以安全离开。房间将在${match.timers.closeLobby}秒后关闭。`);
                StatusLock = true;
                lobby.startTimer(match.timers.closeLobby);
            }
        } else if (!isPoolUnExhausted) {
            mapIndex = 0;
            runIndex++;
        }
    } catch (error) {
        channel.sendMessage(`There was an error changing the map. ID ${pool[mapIndex].code} might be incorrect. Ping your ref.`);
        SendLogToRanderer(`You should take over NOW! bad ID was ${pool[mapIndex].code}.`);

    }
}
async function syncStatus() {
    _updateSettings(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    playersLeftToJoin = match.teams.length;
    for (const q of match.teams) {
        Found = false;
        for (const w of lobby.slots)
            if (w != null) {
                if (q === w.user.username) {
                    playersLeftToJoin--;
                    break;
                }
            }
    }
    if (playersLeftToJoin <= 0) {
        MatchBegin = true;
    }
}
async function timerEnded() {
    if (closing) {
        close();
    } else if ((playersLeftToJoin <= 0 || auto)) {
      
        if (!MapTimeout) {
            MapTimeout = true;
            if (await CheckMod(true,true)) {
                lobby.startMatch(match.timers.forceStart);
                return;
            }
            lobby.startTimer(30);
        }
        else if (!ready&&timeout) {
            lobby.startTimer(match.timers.timeout);
            timeout = false;
        } else {
            lobby.startMatch(match.timers.readyStart);
        }
    } else if (playersLeftToJoin > 0) {
        SendLogToRanderer("There (might) be someone left to join.\nTake over now or enable auto with >auto on");
    }
}
// Creates a new multi lobby
async function init() {
    /*did-finish-load*/
    if (IsUI) {
        console.log('正在等待渲染窗口创建及加载完毕...');
        await app.whenReady();
        createWindow();
        await new Promise((resolve, reject) => {
            win.loadFile('index.html');

            win.webContents.on('did-finish-load', () => {
                console.log('页面及其所有子资源已加载完成');
                win.show();
                win.setFullScreen(true);
                resolve();
            });

            // 错误处理
            win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                console.error('页面加载失败:', errorDescription);
                reject(new Error(errorDescription));
            });
        });
    }
    await initPool();
    SendLogToRanderer('Loaded map pool!');
    
    
    
    if (IsRestart) {
        let RestartFilePath = './RestartSettings.json';
        SendLogToRanderer("Restarting...");
        const _Restart = require(RestartFilePath);
        SendLogToRanderer(`Use ${RestartFilePath} as restart file`);
        try {
            await client.connect();
            SendLogToRanderer("Connected to Bancho!");
            SendLogToRanderer(`Room id: ${_Restart.RoomId}`);
            SendLogToRanderer(`Map index: ${_Restart.MapIndex}`);
            SendLogToRanderer(`Round: ${_Restart.Round}`);
            channel = await client.getChannel(`#mp_${_Restart.RoomId}`);//#multiplayer
            await channel.join();
            mapIndex = _Restart.MapIndex;
            runIndex = _Restart.Round;
            RefName = [..._Restart.Ref];
            for (const [key, value] of Object.entries(_Restart.PlayerStatus)) {
                AbortMap.set(key, value);
                SendLogToRanderer(`Abort机会:  ${key}: ${value}`);
            }
            if (mapIndex > 0 && runIndex==1)
            MatchBegin = true;
        }
        catch (err) {
            SendLogToRanderer(err);
            SendLogToRanderer("Failed to find lobby");
            process.exit(1);
        }
        lobby = channel.lobby;
        syncStatus();
        SendLogToRanderer(`Join the lobby ${lobby.name}`);
        channel.sendMessage(`孩子们，我回来了`);
        startLobby();
    }
    else{
        SendLogToRanderer('Attempting to connect...');

        try {
            await client.connect();
            SendLogToRanderer("Connected to Bancho!");
            const lobbyname = `${match.tournament} Qualifiers lobby: ${match.id}`
            /* lobbyname = `${match.tournament}: ${match.teams[BLUE].name} vs ${match.teams[RED].name}` */
            channel = await client.createLobby(lobbyname, match.private);
        } catch (err) {
            SendLogToRanderer(err);
            SendLogToRanderer("Failed to create lobby");
            process.exit(1);
        }

        lobby = channel.lobby;

        const password = Math.random().toString(36).substring(8);
        await lobby.setPassword(password);
        await lobby.setMap(match.waitSong, 3); //elevator music
        
        SendLogToRanderer("Lobby created!");
        SendLogToRanderer(`Name: ${lobby.name}, password: ${password}`);
        SendLogToRanderer(`Multiplayer link: https://osu.ppy.sh/mp/${lobby.id}`);
        SendLogToRanderer(`Open in your irc client with "/join #mp_${lobby.id}"`);
        fs.writeFileSync(`./lobbies/${lobby.id}.txt`, `https://osu.ppy.sh/mp/${lobby.id} | Lobby was created in ${lobbydate}\n`)
        lobby.setSettings(bancho.BanchoLobbyTeamModes.HeadToHead, bancho.BanchoLobbyWinConditions.ScoreV2);

    }
    
    
    EachMapReset();
    for (const p of match.teams) {
        SkipMap.set(p.name, true);
        AbortMap.set(p.name, true);
    }
    process.stdout.write = function (chunk, encoding, callback) {
        // 写入到控制台
        originalWrite(chunk, encoding, callback);
        const cleanChunk = removeAnsiCodes(chunk.toString());
        fs.appendFile(`./lobbies/mp${lobby.id}.log`, getFormattedTime()+cleanChunk, (err) => {
            if (err) {
                console.error('写入文件失败:', err);
            }
        });

        return true;
    };
    
    WriteRestartFile();
  createListeners();
}

// Starts the refereeing
function startLobby() {
    auto = true;
    lobby.startTimer(match.timers.betweenMaps);
    const map = setBeatmap(pool[mapIndex].code);
    if (map) {
        WriteRestartFile();
        SendLogToRanderer(`Changing map to ${map}`);
    }
}
function startLobby2() {
    auto = true;
    lobby.startTimer(match.timers.betweenRounds)
    const map = setBeatmap(pool[mapIndex].code);
    if (map) {
        WriteRestartFile();
        SendLogToRanderer(`Changing map to ${map}`);
    }
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

  channel.sendMessage("当前图：" + map.name);
  lobby.setMap(map.id,3);

  lobby.setMods(mod, false);
    UpdateMapToRanderer(map.id);
  return map.code;
}

function createListeners() {
    client.on("connect", () => {
        if (IsUI)
        win.webContents.send('Server-status-from-main', 'connected');
        console.log("客户端已连接");
        console.log("连接状态:", client.isConnected); // true
    });

    client.on("disconnect", () => {
        if (IsUI)
        win.webContents.send('Server-status-from-main', 'disconnected');
        console.log("客户端断开连接");
        console.log("连接状态:", client.isConnected); // false
    });
  lobby.on("playerJoined", (obj) => {
      SendLogToRanderer("player joined");
    const name = obj.player.user.username;
      SendLogToRanderer(`Player ${name} has joined!`)
      optionalOutput(name, playerEvent.join);
      if (!MatchBegin) {
          if (!match.teams.some(team => team.name === name)) {

          }
          else if (playersLeftToJoin-- <= 1 || auto) { //if auto is enabled the lobby will start as soon as someone joins, else it'll wait until everyone has joined
              channel.sendMessage("所有玩家已来到房间！资格赛现在开始。");
              MatchBegin = true;
              channel.sendMessage("#help");
              startLobby();
          }
          else {
              channel.sendMessage(`欢迎！还剩余${playersLeftToJoin}位选手未进入房间，资格赛将在所有人到齐后开始。`);
          }
      }
      UpdatePlayerToRanderer();
  });
    lobby.on("playerLeft", () => {
        let abortable = (Date.now() - match.timers.abortLeniency * 1000) <= timeStarted;
        lobby.updateSettings().then(async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            let Found = false;
            let LeftName = "???";
            playersLeftToJoin++;
            for (const q of match.teams) {
                Found = false;
                for (const w of lobby.slots)
                    if (w != null) {
                        if (q.name === w.user.username) {
                            Found = true;
                        }
                    }
                if (!Found) {
                    LeftName = q.name;
                    break;
                }
            }
            if (LeftName === "???") {
                channel.sendMessage(`有个选手在一瞬间溜出去又跑回来了?`);
            }
            console.log(`player ${LeftName} Left`)
            optionalOutput(LeftName, playerEvent.leave);
            if (inPick) {
                if (!abortable)
                    return;
                if (!Found) {
                    if (AbortMap.has(LeftName) || AbortMap.get(LeftName)) {
                        AbortMap.set(LeftName, false);
                        lobby.abortMatch();
                        //ready = false;
                        channel.sendMessage(`由于${LeftName}在该图较前的位置断开了连接，比赛abort。`);
                        channel.sendMessage(`${LeftName} 用掉了Ta的abort机会。`);
                    }
                }
            }
            else if (auto) lobby.setMap(match.waitSong, 3);
        });
    })
    lobby.on("allPlayersReady", async() => {
    SendLogToRanderer("everyone ready");
    ready = true;
        timeout = false;
        if (auto && !StatusLock && MatchBegin) {
            SendLogToRanderer("Check everyone's mods");
            let Res = await CheckMod(true,false);
            if (Res == 1) {
                channel.sendMessage('所有人都已准备完毕，准备开始比赛...');
                lobby.abortTimer();
                if (!MapTimeout)
                    lobby.startMatch(match.timers.readyStart);
                else
                    lobby.startMatch(match.timers.forceStart);
                Res = await CheckMod(true,false);
                if (Res == 0) {
                    channel.sendMessage('?有人耍我');
                    channel.sendMessage('请使用不被允许的mod的选手替换mod后再重新准备!');
                    lobby.abortTimer();
                    lobby.startTimer(10);
                }
                else if (Res == 1) {
                    StatusLock = true;
                }
            }
            else if (Res == 0) {

                channel.sendMessage('请使用不被允许的mod的选手替换mod后再重新准备!');
            }
            
    }});
    lobby.on("matchStarted", () => {
      timeStarted = new Date().valueOf();//log time started
      inPick = true;
    });
    lobby.on("matchAborted", () => {
        SendLogToRanderer("Match Aborted");
        EachMapReset();
      timeout = false;
      ready = false;
        inPick = false;
        RestartMap();
      //if (auto) startLobby();
    });
  lobby.on("matchFinished", (obj) => {
      SendLogToRanderer("matchFinished")
      EachMapReset();
    obj.forEach(element => {
        fs.appendFileSync(`./players/${element.player.user.username}.txt`, `${pool[mapIndex].code}: ${element.score}\n`);
        if (element.score > 990000)
            channel.sendMessage(`${element.player.user.username} 取得了 ${element.score} 的成绩,是${config.username}的一辈子呢`);
        if (element.score < 900000)
            channel.sendMessage(`${element.player.user.username} 取得了 ${element.score} 的成绩,emm还是可以通过资格赛的，对吧?`);
    });
      TryNextMap();
   });
    lobby.on("timerEnded", () => {
        //timerEnded();
  });
    channel.on("message", async (msg) => {
        // All ">" commands must be sent by host
        console.log(`${msg.user.ircUsername}: ${msg.message}`);
        if (win) {
            let _msgs = {
                playerName: msg.user.ircUsername,
                text: msg.message,
                role: "Unknown"
            }//BanchoBot
            if (msg.user.ircUsername === config.username) {
                _msgs.role = "MySelf";
            } else if (msg.user.ircUsername === "BanchoBot") {
                _msgs.role = "BanchoBot";
            }
            else if (match.teams[msg.user.ircUsername] != undefined) {
                _msgs.role = "Player";
            } else if (RefName.includes(msg.user.ircUsername)) {
                _msgs.role = "Ref";
            }
            win.webContents.send('User-msg-from-main', _msgs);
        }
        if (msg.message.startsWith(">") && RefName.includes(msg.user.ircUsername)) {
            const m = msg.message.substring(1).split(' ');
            SendLogToRanderer(`Received command "${m[0]}"`);

            switch (m[0]) {
                case 'addref':
                    if (RefName.includes(m[1])) {
                        channel.sendMessage(`${m[1]} 已经是裁判了`);
                        break;
                    }
                    channel.sendMessage(`!mp addref ${m[1]}`);
                    channel.sendMessage(`添加了裁判 ${m[1]}`);
                    RefName.push(m[1]);
                    break;
                case 'removeref':
                    if (m[1] === config.username) {
                        channel.sendMessage(`${m[1]}是房主，不可被删除！`);
                        break;
                    }
                    let NameCheck = false;
                    for (let i = RefName.length - 1; i >= 0; i--) {
                        if (RefName[i] === m[1]) {
                            RefName.splice(i, 1);
                            NameCheck = true;
                            break;
                        }
                    }
                    if (NameCheck) {
                        channel.sendMessage(`!mp removeref ${m[1]}`);
                        channel.sendMessage(`删除了裁判 ${m[1]}`);
                    }
                    else {
                        channel.sendMessage(`${m[1]} 不是裁判`);
                    }
                    break;
                case 'skip':
                    if (closing | StatusLock)
                        break;
                    TryNextMap();
                    break;
                case 'start':
                    ready = true;
                    timeout = false;
                    lobby.abortTimer();
                    lobby.startMatch(match.timers.readyStart);
                    break;
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
                        lobby.setMap(match.waitSong, 3);
                    }
                    break;
                case 'timeout':
                    timeout = true;
                    channel.sendMessage("Timeout given. An additional " + match.timers.timeout + " seconds timer will be applied.");
                    break;
                case 'abort':
                    await lobby.abortMatch();
                    channel.sendMessage("裁判abort了比赛。");
                    break;
                case 'mod':
                    await CheckMod(false, true);
                    break;
                case 'map':
                    let TMapId = MapMap.get(m[1]) || -1;
                    let TRound = m[2];
                    if (TMapId == -1) {
                        channel.sendMessage(`图池代码不存在!`);
                        break;
                    }
                    if (TRound > match.numberOfRuns || TRound < 1) {
                        channel.sendMessage(`轮次不合法!`);
                        break;
                    }
                    mapIndex = IndexMap.get(m[1]);
                    runIndex = TRound;
                    RestartMap();
                    break;
                case 'help':
                    channel.sendMessage(`使用>invite 邀请所有选手`);
                    channel.sendMessage(`使用>start 强制开始`);
                    channel.sendMessage(`使用>skip 强制跳过当前图`);
                    channel.sendMessage(`使用>close 强制关闭房间`);
                    channel.sendMessage(`使用>auto on/off 开启/关闭该bot`);
                    channel.sendMessage(`使用>abort 强制中断比赛`);
                    channel.sendMessage(`使用>timeout 多给未准备的选手一点时间`);
                    channel.sendMessage(`使用>mod 查看所有人mod(log)`);//
                    channel.sendMessage(`使用>map 图池id 轮次 来修改当前图与轮次`);
                    channel.sendMessage(`使用>addref/removeref 裁判昵称 来增加/删除可以使用>命令的裁判(不可删除房主)`);
                    break;
            }
        } else if (msg.message.startsWith("#")) {
            const m = msg.message.substring(1).split(' ');
            SendLogToRanderer(`Received command "${m[0]}"`);

            switch (m[0]) {
                case 'gsm':
                    channel.sendMessage(`干什么¿`,);
                    break;
                case 'hyw':
                    channel.sendMessage(`何意味(#\`O′)¿`,);
                    break;
                case 'poke':
                    channel.sendMessage(PokeString[Math.floor(Math.random() * PokeString.length)]);
                    break;
                case 'help':
                    channel.sendMessage(`使用#gsm 对${config.username}进行干什么`);
                    channel.sendMessage(`使用#poke 戳一戳${config.username}`);
                    channel.sendMessage(`使用#skip 申请跳过该图，仅限第二轮可用。`);
                    channel.sendMessage(`在比赛后在${match.timers.abortLeniency}秒内若有abort切内可以使用#abort 中断比赛。`);
                    channel.sendMessage(`使用#abortchance 查看所有选手的abort机会。`);
                    channel.sendMessage(`遇到过于严重的事故请使用!panic。请勿滥用。`);
                    break;
                case 'abort':
                    if (inPick) {
                        if ((Date.now() - timeStarted) > (match.timers.abortLeniency * 1000)) {
                            channel.sendMessage(`abort超时。当且仅当在图的前${match.timers.abortLeniency}秒可以使用#abort。`);
                            break;
                        }
                        if (AbortMap.has(msg.user.ircUsername) && AbortMap.get(msg.user.ircUsername)) {
                            AbortMap.set(msg.user.ircUsername, false);
                            lobby.abortMatch();
                            ready = false;
                            channel.sendMessage(`由于${msg.user.ircUsername}在该图较前的位置断开了连接，比赛abort。`);
                            channel.sendMessage(`${msg.user.ircUsername} 用掉了Ta的abort机会。`);
                        }
                        else {
                            channel.sendMessage(`${msg.user.ircUsername}没有剩余的abort机会了。`);
                        }
                    }
                    break;
                case 'abortchance':
                    for (let [_name, _chance] of AbortMap) {
                        channel.sendMessage(`${_name} 剩余 ` + (_chance ? 1 : 0) + ` 次abort机会`);
                    }
                    break;
                case 'skip':
                    {
                        if (closing | StatusLock)
                            break;
                        if (runIndex == 1) {
                            channel.sendMessage("只有第二轮支持使用#skip跳过图。");
                            break;
                        }
                        if (!SkipMap.has(msg.user.ircUsername) && !SkipMap.get(msg.user.ircUsername))
                            break;
                        SkipMap.set(msg.user.ircUsername, false);
                        playersSkipToSkip += 1;
                        channel.sendMessage("跳过投票：" + playersSkipToSkip + "/" + match.teams.length);
                        if (playersSkipToSkip >= match.teams.length) {
                            channel.sendMessage("所有玩家选择跳过该图。正在选择下一张......");
                            TryNextMap();
                        }
                    }
                    break;

            }
        } else {
            if (!msg.message.startsWith("!"))
            if (msg.user.ircUsername != "BanchoBot") {
                if (msg.message === RepeatString) {
                    RepeatCounting++;
                    if (RepeatCounting > 2) {
                        RepeatCounting = -1;
                        channel.sendMessage(msg.message);
                    }
                } else {
                    RepeatString = msg.message;
                    RepeatCounting = 1;
                }
                }
            //config.username===msg.user.ircUsername
        }
    if(auto && msg.message === "!panic"){
      auto = false;
      channel.sendMessage("已收到panic指令。裁判正在赶来的路上。")
      SendLogToRanderer("Something has gone really wrong!\n"+"Someone has executed the !panic command and "+"auto mode has been disabled");
      /*await webhook.send(`<@${config.discord.refRole}>, someone has executed the !panic command on match https://osu.ppy.sh/mp/${lobby.id}.\n`+
      "join using ` /join #mp_"+lobby.id+"` The host is " + config.username+".")*/
      if(!ready && !inPick){
        lobby.abortTimer();
      }
    }
        if (msg.user.ircUsername === "BanchoBot") {
            let Expression = /^\w+ left the game\.$/;
            if (Expression.test(msg.message)) {
                let abortable = (Date.now() - match.timers.abortLeniency * 1000) <= timeStarted;
                let LeftName = msg.message.trim().split(' ')[0];
                _updateSettings(true);
                    SendLogToRanderer(`player ${LeftName} Left`)
                    optionalOutput(LeftName, playerEvent.leave);
                    UpdatePlayerToRanderer();
                    if (inPick) {
                        if (!abortable)
                            return;
                        if (!Found) {
                            if (AbortMap.has(LeftName) && AbortMap.get(LeftName)) {
                                AbortMap.set(LeftName, false);
                                lobby.abortMatch();
                                ready = false;
                                playersLeftToJoin++;
                                MatchBegin = false;
                                channel.sendMessage(`由于${LeftName}在该图较前的位置断开了连接，比赛abort。`);
                                channel.sendMessage(`${LeftName} 用掉了Ta的abort机会。`);
                            }
                        }
                    }
                    else if (auto) lobby.setMap(match.waitSong, 3);
                }
            
          if (msg.message === "Countdown finished")
              timerEnded();
      }

  });
}

rl.on('line', (input) => {
  channel.sendMessage(input);
});
if (IsUI) {
    ipcMain.on('msg-from-renderer', (event, msg) => {
        channel.sendMessage(msg);
    });
    ipcMain.handle('Update-request-from-renderer', async() => {
        return Updating ? "updating" : "idle";
    });
    ipcMain.handle('Update-server-request-from-renderer', async() => {
        return client.isConnected() ? "connected" : "disconnected";
    });
    ipcMain.handle('Update-thread-request-from-renderer', async() => {
        return "connected";
    });
}
async function close() {
  SendLogToRanderer("Closing...");
  rl.close();
  await lobby.closeLobby();
  await client.disconnect();
    SendLogToRanderer("Closed.");
    if(IsUI)
    SendLogToRanderer("The lobby has been closed,but you can still view the chat log here.");
  //process.exit(0);
}

init()
  .then(() => {
    SendLogToRanderer("Initialization complete!");
  })
