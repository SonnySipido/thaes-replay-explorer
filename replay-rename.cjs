'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
function replayName(value){
 if(typeof value!=='string')throw Error('Enter a replay filename.');
 let name=value.trim();if(!/\.w3g$/i.test(name))name+='.w3g';
 const stem=name.slice(0,-4);
 if(!stem||stem==='.'||stem==='..'||/[<>:"/\\|?*\x00-\x1f]/.test(name)||/[. ]$/.test(stem)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)||name.length>255)throw Error('Enter a valid Windows filename without folder paths.');
 if(/^TempReplay\.w3g$/i.test(name))throw Error('TempReplay.w3g is reserved for Warcraft III temporary replays.');
 return name;
}
async function renameReplay(file,value){
 const name=replayName(value),source=path.resolve(file),target=path.join(path.dirname(source),name);
 const stat=await fs.stat(source);if(!stat.isFile()||path.extname(source).toLowerCase()!=='.w3g')throw Error('Replay file is missing or unavailable.');
 if(source===target)return source;
 if(process.platform==='win32'&&source.toLowerCase()===target.toLowerCase()){await fs.rename(source,target);return target;}
 let created=false;
 try{
  try{await fs.link(source,target);created=true;}
  catch(error){
   if(!['EPERM','EOPNOTSUPP','ENOTSUP','ENOSYS','EXDEV'].includes(error.code))throw error;
   await fs.copyFile(source,target,fs.constants.COPYFILE_EXCL);created=true;await fs.utimes(target,stat.atime,stat.mtime);
  }
  await fs.unlink(source);return target;
 }catch(error){
  if(created)await fs.unlink(target).catch(()=>{});
  if(error.code==='EEXIST')throw Error('A replay with that filename already exists in this folder.');
  throw error;
 }
}
module.exports={replayName,renameReplay};
