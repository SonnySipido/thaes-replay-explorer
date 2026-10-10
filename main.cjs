'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell,screen,clipboard}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const {Worker}=require('node:worker_threads');
const {summary}=require('./library.cjs');
const {ReplayAnnotations,hashReplay}=require('./annotations.cjs');
let annotations;
const annotatedSummary=entry=>{const row=summary(entry);return {...row,annotation:annotations?.get(row.contentHash)||{favorite:false,notes:''}};};
const {importReplay}=require('./replay-import.cjs');
const {replayFile,copyReplayFile}=require('./replay-share.cjs');
const {renameReplay}=require('./replay-rename.cjs');
let importQueue=Promise.resolve();
const {normalizeReplayFolders,folderKey}=require('./replay-folders.cjs');
const {ReplayDetails}=require('./replay-details.cjs');
const {resolveMapFile}=require('./map-files.cjs');
app.setName("Thae's Replay Explorer");
app.setAppUserModelId('Thae.ReplayExplorer');
app.setPath('userData',path.join(app.getPath('appData'),'Warcraft Replay Explorer'));
const {restoreWindowBounds}=require('./window-state.cjs');
const {playerProfileUrl}=require('./player-profile.cjs');
const {readReplayStartFromFile,gameSource,readLeaves}=require('./replay-start.cjs');
const {winningTeam,WINNER_VERSION}=require('./winner.cjs');
const updater=require('./updater.cjs');
let availableUpdate=null;  // the last "Check for updates" answer
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
 fsSync.writeFileSync(temporary,JSON.stringify({folder,includeSubfolders,replayFolders,window:windowState}));
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
let replayFolders=[],replayDirectories=[],indexGeneration=0;
const DEFAULT_FOLDER='';
let win,worker,folder=DEFAULT_FOLDER,includeSubfolders=true,entries=new Map(),progress={done:0,total:0},busy=false,configFile,cache,details,suggestedFolder,welcomeFolder;
function syncPrimaryFolder(){folder=replayFolders[0]?.path||'';includeSubfolders=replayFolders[0]?.includeSubfolders!==false;}
function foldersChanged(){
 syncPrimaryFolder();saveSettings();watchFolder();send('folders-changed',{folder,includeSubfolders,replayFolders});
 index(true).catch(error=>send('progress',{busy:false,error:error.message}));
}
function send(channel,data){if(win && !win.isDestroyed())win.webContents.send(channel,data);}
// reset: index from scratch (start, new folder). Otherwise only new, changed and deleted replays are
// passed to the page: sending the whole library (tens of thousands of rows) on every check froze it.
// background: a check nobody asked for, shown only when it finds something.
async function index(reset=false,background=false) {
  if(busy && !reset)return;
  const generation=++indexGeneration;busy=true;
  if(worker){const previous=worker;worker=null;await previous.terminate();}
  if(generation!==indexGeneration)return;
  if(reset){replayDirectories=[];entries.clear();details?.clear();}
  busy=true;
  if(reset)send('library-reset',{folder,includeSubfolders,replayFolders,directories:replayDirectories,rows:[]});
  let found=false;
  const known=Object.fromEntries([...entries].filter(([,e])=>!e.error).map(([k,e])=>[k,e.fingerprint]));
  const active=new Worker(path.join(__dirname,'worker.cjs'),{workerData:{replayFolders,cache,known}});
  worker=active;
  active.on('message',msg=>{
    if(worker!==active)return;
    if(msg.type==='entry'){found=true;details?.invalidate(msg.entry.key);entries.set(msg.entry.key,msg.entry);send('library-entry',annotatedSummary(msg.entry));}
    if(msg.type==='entries'){found=true;for(const entry of msg.entries){details?.invalidate(entry.key);entries.set(entry.key,entry);}send('library-entries',msg.entries.map(annotatedSummary));}
    if(msg.type==='progress'){progress={...msg.progress,busy:true};if(!background||found)send('progress',progress);}
    if(msg.type==='error'){busy=false;progress={...progress,busy:false,error:msg.error};send('progress',progress);}
    if(msg.type==='done'){
      replayDirectories=msg.result.directories||[];
      const present=new Set(msg.result.files);let removed=false;
      for(const [key,entry] of entries)if(!present.has(entry.file)){entries.delete(key);details?.invalidate(key);removed=true;}
      busy=false;progress={...msg.result,files:undefined,busy:false};
      if(reset||removed)send('library-reset',{folder,includeSubfolders,replayFolders,directories:replayDirectories,rows:[...entries.values()].map(annotatedSummary)});
      send('progress',progress);
    }
  });
  active.on('error',e=>{if(worker===active){busy=false;send('progress',{busy:false,error:e.message});}});
  active.on('exit',code=>{if(worker===active && busy){busy=false;send('progress',{busy:false,error:'Indexer exited unexpectedly ('+code+'). Refresh to retry.'});}});
}
// New and changed replays: watch the folder rather than checking every file every 30 seconds. A slow
// background check still runs in case a change is missed (network drives, sleep).
let watchers=[],watchTimer=null;
function watchFolder(){
 for(const watcher of watchers)watcher.close();watchers=[];clearTimeout(watchTimer);
 const check=()=>{if(busy){watchTimer=setTimeout(check,3000);watchTimer.unref();return;}index(false,true);};
 for(const location of replayFolders.filter(row=>row.enabled)){
  try{
   const watcher=fsSync.watch(location.path,{recursive:location.includeSubfolders},(_,name)=>{
    if(name&&(!/\.w3g$/i.test(name)||/(^|[\\/])TempReplay\.w3g$/i.test(name)))return;
    clearTimeout(watchTimer);watchTimer=setTimeout(check,3000);watchTimer.unref();
   });
   watchers.push(watcher);watcher.on('error',()=>{watcher.close();watchers=watchers.filter(w=>w!==watcher);});
  }catch{}
 }
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
 replayFolders=normalizeReplayFolders({replayFolders:[{path:pick.filePaths[0],enabled:true,includeSubfolders},...replayFolders.slice(1)]});
 foldersChanged();
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
  ipcMain.handle('open-website',()=>shell.openExternal('https://thaesreplayexplorer.com'));
  ipcMain.handle('initial',()=>{const select=pendingSelect;pendingSelect=null;return {folder,includeSubfolders,replayFolders,directories:replayDirectories,rows:[...entries.values()].map(annotatedSummary),progress:{...progress,busy},select,appVersion:app.getVersion(),welcomeFolder:folder?null:welcomeFolder};});
  // first start: use the replay folder the welcome question offered
  ipcMain.handle('use-welcome-folder',()=>{
    if(folder||!welcomeFolder)return;
    replayFolders=[{path:welcomeFolder,enabled:true,includeSubfolders:true}];foldersChanged();
  });
  ipcMain.handle('replay',async(_,key)=>{
    const e=entries.get(key);if(!e)throw new Error('Replay is no longer in the library.');
    const entry=await details.get(e);
    // replays analysed before MMR and the game's source were read: fill them in now (a few milliseconds)
    if(entry.data&&entry.data.source===undefined)entry.data.source=gameSource(entry.data.creator);
    if(entry.data?.players?.some(p=>p.mmr===undefined)){
      let mmr=new Map();try{({mmr}=await readReplayStartFromFile(entry.file));}catch{}
      for(const p of entry.data.players)p.mmr=mmr.get(p.id)??null;
    }
    // ...and the winner of games w3gjs could not decide (team games)
    if(entry.data&&entry.data.winnerChecked!==WINNER_VERSION){
      try{const {leaves}=await readLeaves(await fs.readFile(entry.file));const winner=winningTeam(entry.data.players,leaves);if(winner>=0)entry.data.winningTeamId=winner;}catch{}
      entry.data.winnerChecked=WINNER_VERSION;
    }
    return entry;
  });
  ipcMain.handle('import-replays',(_,files)=>{
    const task=async()=>{
      if(!Array.isArray(files)||!files.length||files.some(file=>typeof file!=='string'||!path.isAbsolute(file)||path.extname(file).toLowerCase()!=='.w3g'))throw Error('Drop Warcraft III replay (.w3g) files.');
      // Dropping our own library files back into the app is not an import.
      // Avoid copying from a secondary root, reindexing or selecting later.
      const knownFiles=new Set([...entries.values()].map(entry=>path.resolve(entry.file).toLowerCase()));
      if(files.every(file=>knownFiles.has(path.resolve(file).toLowerCase())))return {alreadyInLibrary:true};
      if(!replayFolders.length)await chooseReplayFolder();
      if(!replayFolders.length)return null;
      const location=replayFolders[0],wasEnabled=location.enabled,results=[];
      for(const file of files)results.push(await importReplay(file,location));
      if(!location.enabled){location.enabled=true;syncPrimaryFolder();saveSettings();watchFolder();send('folders-changed',{folder,includeSubfolders,replayFolders});}
      const key=replayKey(results.at(-1).file),copied=results.filter(r=>r.copied).length;
      if(copied||!wasEnabled||!entries.has(key))await index(true);
      return {key,copied};
    };
    const job=importQueue.then(task);importQueue=job.catch(()=>{});return job;
  });
  ipcMain.handle('annotation-update',async(_,key,patch)=>{
    const row=entries.get(key);if(!row)throw Error('Replay is no longer in the library.');
    row.contentHash ||= await hashReplay(row.file);
    await annotations.update(row.contentHash,patch);
    const result={hash:row.contentHash,annotation:annotations.get(row.contentHash)};send('annotation-changed',result);return result;
  });
  ipcMain.handle('annotations-export',async()=>{
    const pick=await dialog.showSaveDialog(win,{title:'Export favorites and notes',defaultPath:'Replay Explorer annotations.json',filters:[{name:'Annotations',extensions:['json']}]});if(pick.canceled)return false;
    await fs.writeFile(pick.filePath,JSON.stringify(await annotations.export(),null,2));return true;
  });
  ipcMain.handle('annotations-import',async()=>{
    const pick=await dialog.showOpenDialog(win,{title:'Import favorites and notes',properties:['openFile'],filters:[{name:'Annotations',extensions:['json']}]});if(pick.canceled||!pick.filePaths[0])return null;
    const file=pick.filePaths[0];if((await fs.stat(file)).size>16*1024*1024)throw Error('Annotation backup is too large.');
    const count=await annotations.import(JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,'')));
    send('library-reset',{folder,includeSubfolders,replayFolders,directories:replayDirectories,rows:[...entries.values()].map(annotatedSummary)});return count;
  });
  ipcMain.handle('choose-folder',chooseReplayFolder);
  ipcMain.handle('add-replay-folder',async()=>{
    const pick=await dialog.showOpenDialog(win,{title:'Add replay folder',defaultPath:folder||suggestedFolder,properties:['openDirectory']});
    if(pick.canceled||!pick.filePaths[0])return replayFolders;
    const full=path.resolve(pick.filePaths[0]),existing=replayFolders.find(row=>folderKey(row.path)===folderKey(full));
    if(existing)existing.enabled=true;
    else replayFolders.push({path:full,enabled:true,includeSubfolders:true});
    foldersChanged();return replayFolders;
  });
  ipcMain.handle('update-replay-folder',(_,folderPath,changes)=>{
    if(typeof folderPath!=='string'||!changes||typeof changes!=='object'||Object.keys(changes).some(key=>!['enabled','includeSubfolders'].includes(key))||Object.values(changes).some(value=>typeof value!=='boolean'))throw Error('Invalid folder preference.');
    const location=replayFolders.find(row=>folderKey(row.path)===folderKey(folderPath));if(!location)throw Error('Replay folder is no longer configured.');
    Object.assign(location,changes);foldersChanged();return replayFolders;
  });
  ipcMain.handle('remove-replay-folder',(_,folderPath)=>{
    if(typeof folderPath!=='string')throw Error('Invalid replay folder.');
    replayFolders=replayFolders.filter(row=>folderKey(row.path)!==folderKey(folderPath));foldersChanged();return replayFolders;
  });
  // updates: when the button is pressed, or at startup when that is switched on in Settings
  ipcMain.handle('update-check',async()=>{
    availableUpdate=await updater.checkForUpdate(app.getVersion());
    return {current:availableUpdate.current,version:availableUpdate.version,newer:availableUpdate.newer};
  });
  ipcMain.handle('update-install',async()=>{
    if(!availableUpdate?.newer)throw Error('Check for updates first.');
    let shown=-1;
    const file=await updater.downloadUpdate(availableUpdate,(received,total)=>{
      const percent=total?Math.floor(100*received/total):-1;
      if(percent!==shown){shown=percent;send('update-progress',{percent});}
    });
    updater.runInstaller(file);
    setTimeout(()=>app.quit(),300);  // the installer replaces the files once the app has closed
  });
  ipcMain.handle('update-notes',()=>shell.openExternal(availableUpdate?.notes||updater.RELEASES));
  ipcMain.handle('set-subfolders',async(_,enabled)=>{
    if(typeof enabled!=='boolean')throw new Error('Invalid subfolder preference.');
    if(!replayFolders[0])return includeSubfolders;
    replayFolders[0].includeSubfolders=enabled;foldersChanged();return enabled;
  });
  ipcMain.handle('refresh',()=>index(false));
  ipcMain.handle('open-folder',async()=>{
    if(!folder)return chooseReplayFolder();
    const error=await shell.openPath(path.resolve(folder));
    if(error)throw new Error(error);
  });
  ipcMain.handle('open-replay-folder',async(_,requested)=>{
    if(typeof requested!=='string'||!path.isAbsolute(requested))throw new Error('Invalid replay folder.');
    const target=path.resolve(requested);
    const allowed=replayFolders.some(location=>{
      const relative=path.relative(location.path,target);
      return relative===''||(location.enabled!==false&&location.includeSubfolders!==false&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
    });
    if(!allowed)throw new Error('Folder is no longer in the replay library.');
    if(!(await fs.stat(target)).isDirectory())throw new Error('Replay folder no longer exists.');
    const error=await shell.openPath(target);if(error)throw new Error(error);
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
  ipcMain.handle('copy-replay-file',(_,key)=>copyReplayFile(replayFile(entries,key)));
  let renameQueue=Promise.resolve();
  ipcMain.handle('rename-replay',(_,key,name)=>{
    const task=async()=>{
      const old=entries.get(key);if(!old)throw Error('Replay is no longer in the library.');
      ++indexGeneration;const previous=worker;worker=null;busy=true;if(previous)await previous.terminate();
      try{
        const file=await renameReplay(replayFile(entries,key),name),newKey=replayKey(file),next={...old,key:newKey,file,name:path.basename(file)};
        // Carry the parsed cache across the path change, so the open match remains usable.
        if(newKey!==key){
          try{const saved=JSON.parse(await fs.readFile(path.join(cache,key+'.json'),'utf8'));saved.key=newKey;saved.file=file;await fs.writeFile(path.join(cache,newKey+'.json'),JSON.stringify(saved));}catch{}
        }
        entries.delete(key);entries.set(newKey,next);details.invalidate(key);details.invalidate(newKey);
        const row=annotatedSummary(next);send('replay-renamed',{oldKey:key,row});return row;
      }finally{busy=false;index(false,true).catch(error=>send('progress',{busy:false,error:error.message}));}
    };
    const job=renameQueue.then(task);renameQueue=job.catch(()=>{});return job;
  });
  ipcMain.handle('drag-replay-file',(event,key)=>{
    event.sender.startDrag({file:replayFile(entries,key),icon:path.join(__dirname,'ui','artwork','replay.png')});
  });
  ipcMain.handle('export',async(_,key)=>{
    const row=entries.get(key);if(!row)return;const entry=await details.get(row);if(!entry.data)return;
    const pick=await dialog.showSaveDialog(win,{title:'Export replay analysis',defaultPath:path.basename(entry.file,'.w3g')+'.json',filters:[{name:'JSON',extensions:['json']}]});
    if(!pick.canceled)await fs.writeFile(pick.filePath,JSON.stringify(entry.data,null,2));
  });
  ipcMain.handle('copy-text',(_,text)=>{clipboard.writeText(String(text));});
  // the chat as shown in the Chat tab, saved as a text file named after the replay
  ipcMain.handle('export-build-order',async(_,key,format,contents,filename)=>{
    const row=entries.get(key);if(!row)throw Error('Replay is no longer in the library.');
    if(!['txt','png'].includes(format)||typeof contents!=='string'||contents.length>48*1024*1024)throw Error('Invalid build order export.');
    let output=contents;
    if(format==='png'){
      if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(contents))throw Error('Invalid image export.');
      output=Buffer.from(contents.split(',')[1],'base64');
      if(output.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG image.');
    }
    const basename=(typeof filename==='string'?filename:'Build order').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180).replace(/[. ]+$/,'')||'Build order';
    const pick=await dialog.showSaveDialog(win,{title:format==='png'?'Export build order image':'Save build order',defaultPath:path.join(app.getPath('documents'),basename+'.'+format),filters:[{name:format==='png'?'PNG image':'Text',extensions:[format]}]});
    if(pick.canceled)return false;await fs.writeFile(pick.filePath,output);return true;
  });
  ipcMain.handle('export-chat',async(_,key,text)=>{
    const row=entries.get(key);if(!row)throw new Error('Replay is no longer in the library.');
    const pick=await dialog.showSaveDialog(win,{title:'Export chat',defaultPath:path.join(app.getPath('documents'),path.basename(row.file,path.extname(row.file))+' chat.txt'),filters:[{name:'Text',extensions:['txt']}]});
    if(pick.canceled)return false;
    await fs.writeFile(pick.filePath,String(text),'utf8');return true;
  });
}
app.whenReady().then(async()=>{
  if(!primaryInstance)return;
  requestSelect(selectArgument(process.argv));
  const user=app.getPath('userData');
  await fs.mkdir(user,{recursive:true});
  annotations=await new ReplayAnnotations(path.join(user,'annotations.json')).load();
  configFile=path.join(user,'settings.json');cache=path.join(user,'cache-v1');details=new ReplayDetails(cache);
  try{const saved=JSON.parse(await fs.readFile(configFile,'utf8'));replayFolders=normalizeReplayFolders(saved);syncPrimaryFolder();windowState=saved.window;}catch{}
  const folderDiscovery=require('./replay-folders.cjs');
  suggestedFolder=await folderDiscovery.suggestedReplayFolder(app.getPath('documents'));
  if(!replayFolders.length)welcomeFolder=await folderDiscovery.welcomeReplayFolder(app.getPath('documents'));
  registerIPC();
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const restored=restoreWindowBounds(windowState,screen.getAllDisplays(),area);
  win=new BrowserWindow({...restored,show:false,backgroundColor:'#0b111a',title:"Thae's Replay Explorer",icon:path.join(__dirname,'ui','artwork','rexxar.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  if(process.platform==='win32')win.setAppDetails({appId:'Thae.ReplayExplorer',appIconPath:path.join(__dirname,'ui','artwork','rexxar.ico'),appIconIndex:0,relaunchCommand:'"'+process.execPath+'"',relaunchDisplayName:"Thae's Replay Explorer"});
  win.removeMenu();
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  let closeReady=false;
  win.on('close',event=>{
    clearTimeout(windowSaveTimer);rememberWindow();try{saveSettings();}catch(error){console.error('Could not save window settings:',error.message);}
    if(closeReady||!event)return;
    event.preventDefault();
    win.webContents.executeJavaScript('window.flushReplayNotes ? window.flushReplayNotes() : Promise.resolve()').then(()=>annotations.flush()).then(()=>{closeReady=true;win.close();}).catch(error=>{send('annotation-error',{message:'Notes could not be saved: '+error.message});});
  });
  await win.loadFile(path.join(__dirname,'ui','index.html'));
  if(windowState?.maximized)win.maximize();
  win.show();
  windowReady=true;
  if(pendingSelect)requestSelect(null);  // asked for while the page was loading
  for(const event of ['resize','move','maximize','unmaximize','restore'])win.on(event,scheduleWindowSave);
  rememberWindow();
  // without a folder the page asks for one (the welcome question) before the update question
  if(folder){watchFolder();await index(true);}
  setInterval(()=>{if(!busy)index(false,true);},300000).unref();
});
app.on('window-all-closed',()=>{clearTimeout(watchTimer);for(const watcher of watchers)watcher.close();worker?.terminate();app.quit();});


