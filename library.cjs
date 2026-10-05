'use strict';
const fs=require('node:fs/promises'), path=require('node:path'), crypto=require('node:crypto');
const {parseReplay,SCHEMA}=require('./parser.cjs');
async function scan(folder,includeSubfolders=true) {
  const files=[];
  async function visit(dir) {
    const entries=await fs.readdir(dir,{withFileTypes:true});
    for(const entry of entries) {
      if(entry.isSymbolicLink()) continue;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory() && includeSubfolders) await visit(full);
      else if(entry.isFile() && /\.w3g$/i.test(entry.name)) files.push(full);
    }
  }
  await visit(folder);
  return files.sort().reverse();
}
function summary(entry) {
  if(entry.summaryVersion===1)return entry;
  const r=entry.data;
  return {summaryVersion:1,fingerprint:entry.fingerprint,mapInfo:r?.map,key:entry.key,file:entry.file,name:path.basename(entry.file),modified:entry.modified,size:entry.size,error:entry.error,
    map:r?.map.file || '',version:r?.version || '',build:r?.buildNumber,duration:r?.duration || 0,matchup:r?.matchup || '',
    players:r?.players.map(p=>({id:p.id,name:p.name,race:p.race,raceDetected:p.raceDetected,apm:p.apm,team:p.teamid})) || [],chatCount:r?.chat.length || 0};
}
async function indexFolder(folder,cacheDir,onEntry=()=>{},onProgress=()=>{},known={},includeSubfolders=true,lightweight=false) {
  await fs.mkdir(cacheDir,{recursive:true});
  const summaryDir=path.join(cacheDir,'summaries');
  await fs.mkdir(summaryDir,{recursive:true});
  const files=await scan(folder,includeSubfolders);
  let parsed=0,cached=0,failed=0;
  onProgress({total:files.length,done:0,parsed,cached,failed});
  for(let i=0;i<files.length;i++) {
    const file=files[i],key=crypto.createHash('sha256').update(file.toLowerCase()).digest('hex');
    let entry;
    try {
      const stat=await fs.stat(file),fingerprint=stat.size+':'+stat.mtimeMs+':'+SCHEMA;
      if(known[key]===fingerprint) { cached++; onProgress({total:files.length,done:i+1,parsed,cached,failed}); continue; }
      const cacheFile=path.join(cacheDir,key+'.json');
      const summaryFile=path.join(summaryDir,key+'.json');
      if(lightweight){try{const row=JSON.parse(await fs.readFile(summaryFile,'utf8'));if(row.summaryVersion===1&&row.fingerprint===fingerprint&&!row.error){cached++;onEntry(row);onProgress({total:files.length,done:i+1,parsed,cached,failed});continue;}}catch{}} 
      try { const saved=JSON.parse(await fs.readFile(cacheFile,'utf8'));if(saved.fingerprint===fingerprint && saved.schema===SCHEMA && saved.data?.schema===SCHEMA) entry=saved; } catch {}
      if(entry) cached++;
      else {
        entry={schema:SCHEMA,key,file,fingerprint,modified:stat.mtimeMs,size:stat.size};
        entry.data=await parseReplay(file);
        const after=await fs.stat(file);
        if(after.size!==stat.size || after.mtimeMs!==stat.mtimeMs) throw new Error('Replay changed while being read. Refresh after the game has finished.');
        const temp=cacheFile+'.'+process.pid+'.tmp';
        await fs.writeFile(temp,JSON.stringify(entry));
        await fs.rename(temp,cacheFile);
        parsed++;
      }
    } catch(error) { failed++;entry={schema:SCHEMA,key,file,error:error.message};try{const stat=await fs.stat(file);entry.modified=stat.mtimeMs;entry.size=stat.size;}catch{} }
    if(!entry.error){const summaryFile=path.join(summaryDir,key+'.json'),temp=summaryFile+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(summary(entry)));await fs.rename(temp,summaryFile);}
    onEntry(lightweight?summary(entry):entry);
    onProgress({total:files.length,done:i+1,parsed,cached,failed});
  }
  return {total:files.length,parsed,cached,failed,files};
}
module.exports={indexFolder,scan,summary};

