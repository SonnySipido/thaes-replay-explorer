'use strict';
const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {scan}=require('./library.cjs');
async function digest(file){const hash=crypto.createHash('sha256');for await(const chunk of sync.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function importReplay(source,location){
 if(typeof source!=='string'||!path.isAbsolute(source)||path.extname(source).toLowerCase()!=='.w3g')throw Error('Drop a Warcraft III replay (.w3g) file.');
 const original=path.resolve(source),stat=await fs.stat(original);
 if(!stat.isFile())throw Error('The dropped replay is not a file.');
 const folder=path.resolve(location.path);
 const existing=await scan(folder,location.includeSubfolders!==false);
 let hash;
 for(const file of existing){
  if(path.resolve(file).toLowerCase()===original.toLowerCase())return {file,copied:false};
  const candidate=await fs.stat(file).catch(()=>null);if(!candidate||candidate.size!==stat.size)continue;
  hash??=await digest(original);
  if(await digest(file).catch(()=>null)===hash)return {file,copied:false};
 }
 const ext=path.extname(original),base=path.basename(original,ext);
 for(let suffix=0;;suffix++){
  const destination=path.join(folder,base+(suffix?' ('+suffix+')':'')+ext);
  try{await fs.copyFile(original,destination,sync.constants.COPYFILE_EXCL);await fs.utimes(destination,stat.atime,stat.mtime).catch(()=>{});return {file:destination,copied:true};}
  catch(error){if(error.code!=='EEXIST')throw error;}
 }
}
module.exports={importReplay};
