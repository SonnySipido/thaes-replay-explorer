'use strict';
const fs=require('node:fs/promises'), path=require('node:path'), crypto=require('node:crypto');
const {parseReplay,SCHEMA,names}=require('./parser.cjs');
const {readReplayStartFromFile,gameSource}=require('./replay-start.cjs');
const {hashReplay}=require('./annotations.cjs');
const SUMMARY_VERSION=5;  // 5: searchable names of recorded game entities
async function scan(folder,includeSubfolders=true,onError,onDirectory) {
  const files=[];
  async function visit(dir) {
    onDirectory?.(dir);
    let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(error){if(!onError)throw error;onError(dir,error);return;}
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
async function scanFolders(folders){
 const files=new Map(),folderErrors=[],directories=new Set();
 for(const location of folders){
  if(location.enabled===false)continue;
  const discovered=await scan(location.path,location.includeSubfolders!==false,(directory,error)=>folderErrors.push({path:location.path,directory,message:error.message}),directory=>directories.add(directory));
  for(const file of discovered){const key=path.resolve(file).toLowerCase();if(!files.has(key))files.set(key,file);}
 }
 return {files:[...files.values()].sort().reverse(),folderErrors,directories:[...directories]};
}
function chatSearch(chat){return [...new Set((chat||[]).map(c=>String(c.playerName||'')+' '+String(c.message||'')))].join('\n').toLowerCase();}
function entitySearch(data){
 const found=new Set();
 const add=id=>{const label=data?.names?.[id]||names[id];if(label)found.add(String(label).replace(/\|c[0-9a-f]{8}|\|r/gi,'').replace(/_/g,' ').trim().toLowerCase());};
 const abilities=values=>{for(const [id,rank] of Object.entries(values||{}))if(Number(rank)>0)add(id);};
 for(const player of data?.players||[]){
  for(const hero of player.heroes||[]){
   add(hero.id);abilities(hero.abilities);
   for(const retraining of hero.retrainingHistory||[])abilities(retraining.abilities);
   for(const skill of hero.abilityOrder||[])add(skill.value);
   for(const skill of hero.skillHistory||[])if(Number(skill.rank)>0)add(skill.id);
  }
  for(const order of player.heroOrders||[])add(order.id);
  for(const kind of ['units','buildings','upgrades']){
   for(const order of player[kind]?.order||[])add(order.id);
   for(const [id,count] of Object.entries(player[kind]?.summary||{}))if(Number(count)>0)add(id);
  }
  for(const group of [...(player.groups||[]),...(player.groupHistory||[])])for(const member of group.members||[])add(member.id);
 }
 return [...found].join('\n');
}
function summary(entry) {
  if(entry.summaryVersion)return entry;
  const r=entry.data;
  return {contentHash:entry.contentHash,summaryVersion:SUMMARY_VERSION,source:r?gameSource(r.creator):null,fingerprint:entry.fingerprint,mapInfo:r?.map,key:entry.key,file:entry.file,name:path.basename(entry.file),modified:entry.modified,size:entry.size,error:entry.error,
    map:r?.map.file || '',version:r?.version || '',build:r?.buildNumber,duration:r?.duration || 0,matchup:r?.matchup || '',
    players:r?.players?.map(p=>({id:p.id,name:p.name,race:p.race,raceDetected:p.raceDetected,apm:p.apm,team:p.teamid})) || [],chatCount:r?.chat?.length || 0,chatSearch:chatSearch(r?.chat),entitySearch:entitySearch(r)};
}
async function indexFolder(folder,cacheDir,onEntry=()=>{},onProgress=()=>{},known={},includeSubfolders=true,lightweight=false) {
  await fs.mkdir(cacheDir,{recursive:true});
  const summaryDir=path.join(cacheDir,'summaries');
  await fs.mkdir(summaryDir,{recursive:true});
  const {files,folderErrors,directories=[]}=Array.isArray(folder)?await scanFolders(folder):{files:await scan(folder,includeSubfolders),folderErrors:[]};
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
      if(lightweight){try{
        const row=JSON.parse(await fs.readFile(summaryFile,'utf8'));
        if(row.fingerprint===fingerprint&&!row.error&&row.summaryVersion>=1){
          if(row.summaryVersion<SUMMARY_VERSION){
            // Upgrade old summaries once, keeping full replay analyses out of library memory.
            if(row.summaryVersion<2)row.source=gameSource((await readReplayStartFromFile(file)).creator);
            if(!row.contentHash)row.contentHash=await hashReplay(file);
            const saved=JSON.parse(await fs.readFile(cacheFile,'utf8'));
            if(saved.fingerprint!==fingerprint||saved.schema!==SCHEMA||saved.data?.schema!==SCHEMA||!Array.isArray(saved.data.players))throw Error('Search cache needs rebuilding');
            if(row.summaryVersion<4){
              if(row.chatCount===0)row.chatSearch='';
              else {
                if(!Array.isArray(saved.data.chat))throw Error('Chat cache needs rebuilding');
                row.chatSearch=chatSearch(saved.data.chat);
              }
            }
            row.entitySearch=entitySearch(saved.data);
            row.summaryVersion=SUMMARY_VERSION;
            const temp=summaryFile+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(row));await fs.rename(temp,summaryFile);
          }
          cached++;onEntry(row);onProgress({total:files.length,done:i+1,parsed,cached,failed});continue;
        }
      }catch{}}
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
    if(!entry.contentHash)try{entry.contentHash=await hashReplay(file);}catch{}
    if(!entry.error){const summaryFile=path.join(summaryDir,key+'.json'),temp=summaryFile+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(summary(entry)));await fs.rename(temp,summaryFile);}
    onEntry(lightweight?summary(entry):entry);
    onProgress({total:files.length,done:i+1,parsed,cached,failed});
  }
  return {total:files.length,parsed,cached,failed,files,folderErrors,directories};
}
module.exports={indexFolder,scan,scanFolders,summary,SUMMARY_VERSION,entitySearch};

