const {parentPort,workerData}=require('node:worker_threads');
const {indexFolder}=require('./library.cjs');
let lastProgress=0;
let pendingEntries=[],lastEntries=0;
function flushEntries(){if(pendingEntries.length){parentPort.postMessage({type:'entries',entries:pendingEntries});pendingEntries=[];lastEntries=Date.now();}}
indexFolder(workerData.replayFolders||workerData.folder,workerData.cache,
  entry=>{pendingEntries.push(entry);if(pendingEntries.length>=100||Date.now()-lastEntries>=100)flushEntries();},
  progress=>{const now=Date.now();if(now-lastProgress>=100||progress.done===progress.total){lastProgress=now;parentPort.postMessage({type:'progress',progress});}},
  workerData.known || {},workerData.includeSubfolders !== false,true)
.then(result=>{flushEntries();parentPort.postMessage({type:'done',result});})
.catch(e=>{flushEntries();parentPort.postMessage({type:'error',error:e.message});});

