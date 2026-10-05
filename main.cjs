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
 folder=pick.filePaths[0];await fs.writeFile(configFile,JSON.stringify({folder,includeSubfolders}));
 await index(true);
}
function registerIPC(){
  ipcMain.handle('map-available',async(_,key)=>{try{await localMap(entries.get(key));return true;}catch{return false;}});
  ipcMain.handle('open-w3c-profile',()=>shell.openExternal('https://w3champions.com/player/Thaedalius%231362')); 
  ipcMain.handle('initial',()=>({folder,includeSubfolders,rows:[...entries.values()].map(summary),progress:{...progress,busy}}));
  ipcMain.handle('replay',(_,key)=>{const e=entries.get(key);if(!e)throw new Error('Replay is no longer in the library.');return details.get(e);});
  ipcMain.handle('choose-folder',chooseReplayFolder);
  ipcMain.handle('set-subfolders',async(_,enabled)=>{
    if(typeof enabled!=='boolean')throw new Error('Invalid subfolder preference.');
    await fs.writeFile(configFile,JSON.stringify({folder,includeSubfolders:enabled}));
    includeSubfolders=enabled;await index(true);return includeSubfolders;
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
  const user=app.getPath('userData');
  await fs.mkdir(user,{recursive:true});
  configFile=path.join(user,'settings.json');cache=path.join(user,'cache-v1');details=new ReplayDetails(cache);
  try{const saved=JSON.parse(await fs.readFile(configFile,'utf8'));folder=saved.folder||folder;includeSubfolders=saved.includeSubfolders!==false;}catch{}
  if(folder){try{if(!(await fs.stat(folder)).isDirectory())folder='';}catch{folder='';}}
  suggestedFolder=await require('./replay-folders.cjs').suggestedReplayFolder(app.getPath('documents'));
  registerIPC();
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const height=Math.min(area.height,Math.max(680,Math.min(area.height,Math.max(970,Math.round(area.height*.92)))-150)),width=Math.min(1500,area.width);
  win=new BrowserWindow({width,height,x:area.x+Math.round((area.width-width)/2),y:area.y+Math.round((area.height-height)/2),minWidth:Math.min(1050,width),minHeight:Math.min(680,height),backgroundColor:'#0b111a',title:"Thae's Replay Explorer",icon:path.join(__dirname,'ui','artwork','rexxar.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  if(process.platform==='win32')win.setAppDetails({appId:'Thae.ReplayExplorer',appIconPath:path.join(__dirname,'ui','artwork','rexxar.ico'),appIconIndex:0,relaunchCommand:'"'+process.execPath+'"',relaunchDisplayName:"Thae's Replay Explorer"});
  win.removeMenu();
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  await win.loadFile(path.join(__dirname,'ui','index.html'));
  if(folder)await index(true);else await chooseReplayFolder();
  setInterval(()=>{if(!busy)index(false);},30000).unref();
});
app.on('window-all-closed',()=>{worker?.terminate();app.quit();});


