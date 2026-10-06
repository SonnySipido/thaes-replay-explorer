'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell,screen}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const {Worker}=require('node:worker_threads');
const {summary}=require('./library.cjs');
const {ReplayDetails}=require('./replay-details.cjs');
const {resolveMapFile}=require('./map-files.cjs');
app.setName("Thae's Replay Explorer");
app.setAppUserModelId('Thae.ReplayExplorer');
app.setPath('userData',path.join(app.getPath('appData'),'Warcraft Replay Explorer'));
const {restoreWindowBounds}=require('./window-state.cjs');
const {playerProfileUrl}=require('./player-profile.cjs');
const {readLadderMmr}=require('./ladder-mmr.cjs');
const fsSync=require('node:fs');
const crypto=require('node:crypto');
let windowState,windowSaveTimer;
// "--select <replay.w3g>" (e.g. from another app) opens that replay; a second launch hands it to
// the window that is already open instead of starting another one
function selectArgument(argv){const i=argv.indexOf('--select');return i>=0&&argv[i+1]?argv[i+1]:null;}
// (the request travels as additional data: the command line the first window receives can be reordered)
const primaryInstance=app.requestSingleInstanceLock({select:selectArgument(process.argv)});
if(!primaryInstance)app.quit();
let pendingSelect=null,windowReady=false;
function replayKey(file){return crypto.createHash('sha256').update(path.resolve(file).toLowerCase()).digest('hex');}
function requestSelect(file){
 if(file&&path.extname(file).toLowerCase()==='.w3g')pendingSelect=replayKey(file);
 if(!windowReady||!win||win.isDestroyed())return;
 if(win.isMinimized())win.restore();
 win.show();win.focus();
 if(pendingSelect){send('select-replay',pendingSelect);pendingSelect=null;}
}
app.on('second-instance',(_,argv,_cwd,data)=>requestSelect(data?.select||selectArgument(argv)));
function saveSettings(){
 const temporary=configFile+'.tmp';
 fsSync.writeFileSync(temporary,JSON.stringify({folder,includeSubfolders,window:windowState}));
 fsSync.renameSync(temporary,configFile);
}
function rememberWindow(){
 if(!win||win.isDestroyed())return;
 windowState={...win.getNormalBounds(),maximized:win.isMinimized()?windowState?.maximized===true:win.isMaximized()};
}
function scheduleWindowSave(){
 rememberWindow();clearTimeout(windowSaveTimer);
 windowSaveTimer=setTimeout(()=>{try{saveSettings();}catch(error){console.error('Could not save window settings:',error.message);}},250);windowSaveTimer.unref();
}
const DEFAULT_FOLDER='';
let win,worker,folder=DEFAULT_FOLDER,includeSubfolders=true,entries=new Map(),progress={done:0,total:0},busy=false,configFile,cache,details,suggestedFolder;
function send(channel,data){if(win && !win.isDestroyed())win.webContents.send(channel,data);}
async function index(reset=false) {
  if(!folder)return;
  if(busy && !reset)return;
  if(worker){const previous=worker;worker=null;await previous.terminate();}
  if(reset){entries.clear();details?.clear();}
  busy=true;
  send('library-reset',{folder,includeSubfolders,rows:[...entries.values()].map(summary)});
  const known=Object.fromEntries([...entries].filter(([,e])=>!e.error).map(([k,e])=>[k,e.fingerprint]));
  const active=new Worker(path.join(__dirname,'worker.cjs'),{workerData:{folder,cache,known,includeSubfolders}});
  worker=active;
  active.on('message',msg=>{
    if(worker!==active)return;
    if(msg.type==='entry'){details?.invalidate(msg.entry.key);entries.set(msg.entry.key,msg.entry);send('library-entry',summary(msg.entry));}
    if(msg.type==='progress'){progress={...msg.progress,busy:true};send('progress',progress);}
    if(msg.type==='error'){busy=false;progress={...progress,busy:false,error:msg.error};send('progress',progress);}
    if(msg.type==='done'){
      const present=new Set(msg.result.files);
      for(const [key,entry] of entries)if(!present.has(entry.file)){entries.delete(key);details?.invalidate(key);}
      busy=false;progress={...msg.result,files:undefined,busy:false};
      send('library-reset',{folder,includeSubfolders,rows:[...entries.values()].map(summary)});
      send('progress',progress);
    }
  });
  active.on('error',e=>{if(worker===active){busy=false;send('progress',{busy:false,error:e.message});}});
  active.on('exit',code=>{if(worker===active && busy){busy=false;send('progress',{busy:false,error:'Indexer exited unexpectedly ('+code+'). Refresh to retry.'});}});
}
async function localMap(entry){
 if(!entry?.mapInfo)throw Error('Map information is unavailable.');
    const roots=[path.join(app.getPath('documents'),'Warcraft III')];
    const prefix=entry.file.match(/^(.*[\\/])(?:BattleNet|Replays)[\\/]/i);if(prefix)roots.push(prefix[1]);
    roots.push(path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Warcraft III','_retail_'));
 return resolveMapFile(entry.mapInfo,[...new Set(roots)]);
}
async function chooseReplayFolder(){
 const pick=await dialog.showOpenDialog(win,{title:folder?'Choose a replay folder':'Choose a replay folder — suggested Warcraft III replay location',defaultPath:folder||suggestedFolder,properties:['openDirectory']});
 if(pick.canceled||!pick.filePaths[0])return;
 folder=pick.filePaths[0];saveSettings();
 await index(true);
}
function registerIPC(){
  ipcMain.handle('open-player-profile',async(_,key,playerId)=>{
    const row=entries.get(key);if(!row)throw new Error('Replay is no longer in the library.');
    const replay=await details.get(row);
    const player=replay.data?.players.find(p=>String(p.id)===String(playerId));
    if(!player)throw new Error('Player is not in this replay.');
    const url=playerProfileUrl(player.name);
    if(!url){await dialog.showMessageBox(win,{type:'info',title:'Player profile unavailable',message:'This replay does not include a full BattleTag for this player.',detail:'A player name and its numeric tag are needed to identify the correct W3Champions profile.',buttons:['OK']});return;}
    await shell.openExternal(url);
  });
  ipcMain.handle('map-available',async(_,key)=>{try{await localMap(entries.get(key));return true;}catch{return false;}});
  ipcMain.handle('open-w3c-profile',()=>shell.openExternal('https://w3champions.com/player/Thaedalius%231362')); 
  ipcMain.handle('initial',()=>{const select=pendingSelect;pendingSelect=null;return {folder,includeSubfolders,rows:[...entries.values()].map(summary),progress:{...progress,busy},select};});
  ipcMain.handle('replay',async(_,key)=>{
    const e=entries.get(key);if(!e)throw new Error('Replay is no longer in the library.');
    const entry=await details.get(e);
    // replays analysed before MMR was read: read it from the file now (a few milliseconds)
    if(entry.data?.players?.some(p=>p.mmr===undefined)){
      let mmr=new Map();try{mmr=await readLadderMmr(await fs.readFile(entry.file));}catch{}
      for(const p of entry.data.players)p.mmr=mmr.get(p.id)??null;
    }
    return entry;
  });
  ipcMain.handle('choose-folder',chooseReplayFolder);
  ipcMain.handle('set-subfolders',async(_,enabled)=>{
    if(typeof enabled!=='boolean')throw new Error('Invalid subfolder preference.');
    includeSubfolders=enabled;saveSettings();await index(true);return includeSubfolders;
  });
  ipcMain.handle('refresh',()=>index(false));
  ipcMain.handle('open-folder',async()=>{
    if(!folder)return chooseReplayFolder();
    const error=await shell.openPath(path.resolve(folder));
    if(error)throw new Error(error);
  });
  ipcMain.handle('play-replay',async(_,key,requireMap=false)=>{
    const entry=entries.get(key);if(!entry)throw new Error('Replay is no longer in the library.');
    if(path.extname(entry.file).toLowerCase()!=='.w3g')throw new Error('Not a Warcraft replay.');
    if(requireMap)await localMap(entry);
    await fs.access(entry.file);
    const error=await shell.openPath(path.resolve(entry.file));if(error)throw new Error(error);
  });
  ipcMain.handle('reveal-map',async(_,key)=>{
    const entry=entries.get(key);if(!entry?.mapInfo)throw new Error('Map information is unavailable.');
    try{shell.showItemInFolder(await localMap(entry));}
    catch(error){
      if(error.code!=='MAP_NOT_FOUND')throw error;
      await dialog.showMessageBox(win,{type:'info',title:'Map not found',message:'The map file was not found on your computer.',detail:(error.mapFile||entry.mapInfo.file||'')+'\n\nThe replay is available, but its map file could not be located in your Warcraft III map folders.',buttons:['OK']});
    }
  });
  ipcMain.handle('reveal-replay',async(_,key)=>{
    const entry=entries.get(key);if(!entry)throw new Error('Replay is no longer in the library.');
    await fs.access(entry.file);shell.showItemInFolder(path.resolve(entry.file));
  });
  ipcMain.handle('export',async(_,key)=>{
    const row=entries.get(key);if(!row)return;const entry=await details.get(row);if(!entry.data)return;
    const pick=await dialog.showSaveDialog(win,{title:'Export replay analysis',defaultPath:path.basename(entry.file,'.w3g')+'.json',filters:[{name:'JSON',extensions:['json']}]});
    if(!pick.canceled)await fs.writeFile(pick.filePath,JSON.stringify(entry.data,null,2));
  });
}
app.whenReady().then(async()=>{
  if(!primaryInstance)return;
  requestSelect(selectArgument(process.argv));
  const user=app.getPath('userData');
  await fs.mkdir(user,{recursive:true});
  configFile=path.join(user,'settings.json');cache=path.join(user,'cache-v1');details=new ReplayDetails(cache);
  try{const saved=JSON.parse(await fs.readFile(configFile,'utf8'));folder=saved.folder||folder;includeSubfolders=saved.includeSubfolders!==false;windowState=saved.window;}catch{}
  if(folder){try{if(!(await fs.stat(folder)).isDirectory())folder='';}catch{folder='';}}
  suggestedFolder=await require('./replay-folders.cjs').suggestedReplayFolder(app.getPath('documents'));
  registerIPC();
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const restored=restoreWindowBounds(windowState,screen.getAllDisplays(),area);
  win=new BrowserWindow({...restored,show:false,backgroundColor:'#0b111a',title:"Thae's Replay Explorer",icon:path.join(__dirname,'ui','artwork','rexxar.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  if(process.platform==='win32')win.setAppDetails({appId:'Thae.ReplayExplorer',appIconPath:path.join(__dirname,'ui','artwork','rexxar.ico'),appIconIndex:0,relaunchCommand:'"'+process.execPath+'"',relaunchDisplayName:"Thae's Replay Explorer"});
  win.removeMenu();
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.on('close',()=>{clearTimeout(windowSaveTimer);rememberWindow();try{saveSettings();}catch(error){console.error('Could not save window settings:',error.message);}});
  await win.loadFile(path.join(__dirname,'ui','index.html'));
  if(windowState?.maximized)win.maximize();
  win.show();
  windowReady=true;
  if(pendingSelect)requestSelect(null);  // asked for while the page was loading
  for(const event of ['resize','move','maximize','unmaximize','restore'])win.on(event,scheduleWindowSave);
  rememberWindow();
  if(folder)await index(true);else await chooseReplayFolder();
  setInterval(()=>{if(!busy)index(false);},30000).unref();
});
app.on('window-all-closed',()=>{worker?.terminate();app.quit();});


