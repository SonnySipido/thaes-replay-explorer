const {parentPort,workerData}=require('node:worker_threads');
const {indexFolder}=require('./library.cjs');
let lastProgress=0;
indexFolder(workerData.folder,workerData.cache,
  entry=>parentPort.postMessage({type:'entry',entry}),
  progress=>{const now=Date.now();if(now-lastProgress>=100||progress.done===progress.total){lastProgress=now;parentPort.postMessage({type:'progress',progress});}},
  workerData.known || {},workerData.includeSubfolders !== false,true)
.then(result=>parentPort.postMessage({type:'done',result}))
.catch(e=>parentPort.postMessage({type:'error',error:e.message}));

