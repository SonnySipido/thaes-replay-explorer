const {parentPort,workerData}=require('node:worker_threads');
const {indexFolder,saveLibrarySnapshot}=require('./library.cjs');
const rows=new Map((workerData.rows||[]).map(row=>[row.key,row]));
let lastProgress=0;
let pendingEntries=[],lastEntries=0;
function flushEntries(){if(pendingEntries.length){parentPort.postMessage({type:'entries',entries:pendingEntries});pendingEntries=[];lastEntries=Date.now();}}
indexFolder(workerData.replayFolders||workerData.folder,workerData.cache,
  entry=>{rows.set(entry.key,entry);pendingEntries.push(entry);if(pendingEntries.length>=100||Date.now()-lastEntries>=100)flushEntries();},
  progress=>{const now=Date.now();if(now-lastProgress>=100||progress.done===progress.total){lastProgress=now;parentPort.postMessage({type:'progress',progress});}},
  workerData.known || {},workerData.includeSubfolders !== false,true)
.then(async result=>{flushEntries();const present=new Set(result.files);for(const [key,row] of rows)if(!present.has(row.file))rows.delete(key);await saveLibrarySnapshot(workerData.cache,workerData.replayFolders||[{path:workerData.folder}], [...rows.values()],result.directories||[]);parentPort.postMessage({type:'done',result});})
.catch(e=>{flushEntries();parentPort.postMessage({type:'error',error:e.message});});

