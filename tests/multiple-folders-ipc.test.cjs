'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{EventEmitter}=require('node:events'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),realRequire=createRequire(path.join(root,'main.cjs'));
async function launch(appData){
 const handlers=new Map(),picks=[],app=new EventEmitter();let ready,window;const messages=[];
 Object.assign(app,{setName(){},setAppUserModelId(){},setPath(k,v){this.paths[k]=v;},paths:{appData,documents:appData},getPath(k){return this.paths[k];},requestSingleInstanceLock(){return true;},getVersion(){return '0.4.3';},whenReady(){return {then(fn){ready=fn();return ready;}};},quit(){}});
 class Window extends EventEmitter{
  constructor(){super();window=this;this.webContents={send:(channel,data)=>messages.push({channel,data}),setWindowOpenHandler(){},on(){}};}
  isDestroyed(){return false;}getNormalBounds(){return {x:0,y:0,width:1200,height:800};}isMinimized(){return false;}isMaximized(){return false;}show(){}focus(){}restore(){}maximize(){}setAppDetails(){}removeMenu(){}async loadFile(){}
 }
 const electron={app,BrowserWindow:Window,ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},dialog:{showOpenDialog:async()=>picks.shift()||{canceled:true,filePaths:[]}},shell:{},clipboard:{},screen:{getDisplayNearestPoint:()=>({workArea:{x:0,y:0,width:1920,height:1080}}),getCursorScreenPoint:()=>({x:0,y:0}),getAllDisplays:()=>[{workArea:{x:0,y:0,width:1920,height:1080}}]}};
 const context={require:name=>name==='electron'?electron:realRequire(name),__dirname:root,process,console,setTimeout,clearTimeout,setInterval};
 vm.runInNewContext(sync.readFileSync(path.join(root,'main.cjs'),'utf8'),context,{filename:'main.cjs'});await ready;
 const invoke=(name,...args)=>handlers.get(name)(null,...args);
 async function settled(){for(let i=0;i<300;i++){const state=invoke('initial');if(!state.progress.busy)return state;await new Promise(r=>setTimeout(r,10));}throw Error('Indexer did not settle');}
 return {invoke,picks,settled,messages,close:()=>{window.emit('close');app.emit('window-all-closed');}};
}
test('folder IPC persists additions, per-folder toggles, primary migration and removal across restart',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'replay-folder-ipc-'));let run;
 t.after(async()=>{run?.close();await new Promise(r=>setTimeout(r,100));await fs.rm(temp,{recursive:true,force:true});});
 const a=path.join(temp,'a'),b=path.join(temp,'b'),sub=path.join(b,'sub'),user=path.join(temp,'Warcraft Replay Explorer');
 await fs.mkdir(a);await fs.mkdir(sub,{recursive:true});await fs.mkdir(user);
 for(const file of [path.join(a,'one.w3g'),path.join(b,'two.w3g'),path.join(sub,'three.w3g')])await fs.writeFile(file,'');
 await fs.writeFile(path.join(user,'settings.json'),JSON.stringify({folder:a,includeSubfolders:false}));
 run=await launch(temp);assert.equal((await run.settled()).rows.length,1);
 run.picks.push({filePaths:[b]});await run.invoke('add-replay-folder');assert.equal((await run.settled()).rows.length,3);
 await run.invoke('update-replay-folder',b,{includeSubfolders:false});assert.equal((await run.settled()).rows.length,2);
 const watched=path.join(b,'watched.w3g');await fs.writeFile(watched,'');
 for(let i=0;i<60;i++){if((await run.settled()).rows.length===3)break;await new Promise(r=>setTimeout(r,100));}
 assert.equal((await run.settled()).rows.length,3,'new replay in an additional folder is watched');
 await fs.unlink(watched);
 for(let i=0;i<60;i++){if((await run.settled()).rows.length===2)break;await new Promise(r=>setTimeout(r,100));}
 assert.equal((await run.settled()).rows.length,2,'deleted replay is removed by watcher');

 await run.invoke('update-replay-folder',a,{enabled:false});assert.equal((await run.settled()).rows.length,1);
 assert.throws(()=>run.invoke('update-replay-folder',b,{enabled:'yes'}),/Invalid/);
 run.close();run=null;await new Promise(r=>setTimeout(r,100));run=await launch(temp);
 let state=await run.settled();assert.equal(state.replayFolders.length,2);assert.equal(state.replayFolders[0].enabled,false);assert.equal(state.replayFolders[1].includeSubfolders,false);assert.equal(state.rows.length,1);
 run.picks.push({filePaths:[b]});await run.invoke('add-replay-folder');state=await run.settled();assert.equal(state.replayFolders.length,2);
 await run.invoke('remove-replay-folder',a);state=await run.settled();assert.equal(state.folder,b);assert.equal(state.includeSubfolders,false);
 await run.invoke('set-subfolders',true);assert.equal((await run.settled()).rows.length,2);
 await run.invoke('update-replay-folder',b,{enabled:false});assert.equal((await run.settled()).rows.length,0);
 run.invoke('update-replay-folder',b,{enabled:true});run.invoke('update-replay-folder',b,{enabled:false});assert.equal((await run.settled()).rows.length,0,'rapid changes keep the latest configuration');
 await run.invoke('remove-replay-folder',b);assert.equal((await run.settled()).replayFolders.length,0);assert.ok((await fs.stat(path.join(b,'two.w3g'))).isFile());
 assert.ok(run.messages.some(m=>m.channel==='folders-changed'));
});

test('dropped replay enters the primary library and returns the existing key on repeated drops',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'replay-drop-ipc-'));let run;
 t.after(async()=>{run?.close();await new Promise(r=>setTimeout(r,100));await fs.rm(temp,{recursive:true,force:true});});
 const primary=path.join(temp,'primary'),source=path.join(temp,'external.w3g'),user=path.join(temp,'Warcraft Replay Explorer');await fs.mkdir(primary);await fs.mkdir(user);await fs.writeFile(source,'example replay');
 await fs.writeFile(path.join(user,'settings.json'),JSON.stringify({replayFolders:[{path:primary,enabled:false,includeSubfolders:false}]}));
 run=await launch(temp);await run.settled();const first=await run.invoke('import-replays',[source]);const state=await run.settled();assert.equal(first.copied,1);assert.equal(state.replayFolders[0].enabled,true);assert.ok(state.rows.some(r=>r.key===first.key));
 const second=await run.invoke('import-replays',[source]);await run.settled();assert.equal(second.copied,0);assert.equal(first.key,second.key);assert.equal((await fs.readdir(primary)).length,1);
 await assert.rejects(run.invoke('import-replays',['bad.txt']),/replay/);
});
