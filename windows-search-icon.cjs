'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const runFile=promisify(execFile);
const cacheName='Thae_ReplayExplorer';
const packages=['Microsoft.Windows.Search_cw5n1h2txyewy','MicrosoftWindows.Client.CBS_cw5n1h2txyewy'];
const markerName='windows-search-icon-v1.json';

// Search keeps its own bitmap even after an installer changes the shortcut icon.
// Preserve that cache's header and size; replace only this app's pixel data.
function replaceCacheBitmap(bytes,bitmapForSize){
 if(!Buffer.isBuffer(bytes)||bytes.length<138||bytes.length>2*1024*1024||bytes.toString('ascii',0,2)!=='BM')return null;
 const header=bytes.readUInt32LE(14),offset=bytes.readUInt32LE(10),width=bytes.readInt32LE(18),height=bytes.readInt32LE(22);
 if(![108,124].includes(header)||offset<14+header||width<1||width>512||Math.abs(height)<1||Math.abs(height)>512)return null;
 if(bytes.readUInt16LE(26)!==1||bytes.readUInt16LE(28)!==32||bytes.readUInt32LE(30)!==3)return null;
 if(bytes.readUInt32LE(54)!==0x00ff0000||bytes.readUInt32LE(58)!==0x0000ff00||bytes.readUInt32LE(62)!==0x000000ff||bytes.readUInt32LE(66)!==0xff000000)return null;
 const rows=Math.abs(height),stride=width*4;
 if(offset+rows*stride!==bytes.length)return null;
 const pixels=bitmapForSize(width,rows);
 if(!Buffer.isBuffer(pixels)||pixels.length!==rows*stride)throw Error('Unexpected Windows icon bitmap size.');
 const result=Buffer.from(bytes);
 for(let y=0;y<rows;y++)pixels.copy(result,offset+y*stride,(height>0?rows-1-y:y)*stride,(height>0?rows-y:y+1)*stride);
 return result;
}

async function normalFile(file){
 try{const stat=await fs.lstat(file);return stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size<=2*1024*1024;}
 catch(error){if(error.code==='ENOENT')return false;throw error;}
}
async function containedDirectory(parent,child){
 try{const stat=await fs.lstat(child);if(!stat.isDirectory()||stat.isSymbolicLink())return false;
  const relative=path.relative(await fs.realpath(parent),await fs.realpath(child));return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);
 }catch(error){if(error.code==='ENOENT')return false;throw error;}
}
async function atomicWrite(file,bytes){
 const temporary=file+'.'+crypto.randomUUID()+'.tmp';
 try{await fs.writeFile(temporary,bytes,{flag:'wx'});await fs.rename(temporary,file);}
 finally{await fs.rm(temporary,{force:true});}
}
async function restartWindowsSearch(){
 const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 await runFile(powershell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'scripts','refresh-windows-search.ps1')],{windowsHide:true,timeout:10000,maxBuffer:8192});
}
function iconBitmap(icon){
 const {nativeImage}=require('electron');
 const image=nativeImage.createFromBuffer(icon);
 if(image.isEmpty())throw Error('The application icon could not be read.');
 return (width,height)=>image.resize({width,height,quality:'best'}).toBitmap();
}
async function refreshWindowsSearchIcon({userData,localAppData,iconPath,platform=process.platform,bitmapForIcon=iconBitmap,restartSearch=restartWindowsSearch}){
 if(platform!=='win32'||!localAppData)return {status:'unsupported',changed:0};
 const icon=await fs.readFile(iconPath),hash=crypto.createHash('sha256').update(icon).digest('hex'),marker=path.join(userData,markerName);
 try{if(JSON.parse(await fs.readFile(marker,'utf8')).hash===hash)return {status:'current',changed:0};}catch(error){if(!['ENOENT',undefined].includes(error.code))throw error;}
 const pending=[];let unsupported=0;
 let bitmap;
 for(const packageName of packages){
  const cacheRoot=path.join(localAppData,'Packages',packageName,'LocalState','AppIconCache');
  if(!await containedDirectory(localAppData,cacheRoot))continue;
  for(const entry of await fs.readdir(cacheRoot,{withFileTypes:true})){
   if(!entry.isDirectory()||!/^\d{1,4}$/.test(entry.name))continue;
   const scale=path.join(cacheRoot,entry.name);
   if(!await containedDirectory(cacheRoot,scale))continue;
   const file=path.join(scale,cacheName);
   if(!await normalFile(file))continue;
   const before=await fs.readFile(file);
   const after=replaceCacheBitmap(before,(width,height)=>{bitmap??=bitmapForIcon(icon);return bitmap(width,height);});
   if(!after){unsupported++;continue;}
   if(!before.equals(after))pending.push({file,before,after,packageName,scale:entry.name});
  }
 }
 if(pending.length){
  const backup=path.join(userData,'windows-search-icon-backup-v1');await fs.mkdir(backup,{recursive:true});
  for(const item of pending){const file=path.join(backup,item.packageName+'-'+item.scale+'.bmp');try{await fs.writeFile(file,item.before,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}}
  // Search also holds decoded icons in memory. Refresh its UI once, before the
  // atomic writes; no Explorer, Start menu, application or replay data is reset.
  await restartSearch();
  for(const item of pending){
   if(!await normalFile(item.file)||!await containedDirectory(path.dirname(path.dirname(item.file)),path.dirname(item.file)))throw Error('The Search icon cache changed during refresh.');
   await atomicWrite(item.file,item.after);
  }
 }
 // An unfamiliar future cache format is left alone and can be retried later.
 if(!unsupported)await atomicWrite(marker,JSON.stringify({hash})+'\n');
 return {status:unsupported?'unsupported-cache':'refreshed',changed:pending.length};
}
async function refreshWindowsSearchIconOnStartup(options,{refresh=refreshWindowsSearchIcon,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 // Immediately after an update, Windows may still hold a cache file or be
 // initializing Search. Retry in the background instead of requiring a restart.
 for(let attempt=0;attempt<3;attempt++){
  try{return await refresh(options);}
  catch(error){if(attempt===2)throw error;await wait(2000);}
 }
}
module.exports={replaceCacheBitmap,refreshWindowsSearchIcon,refreshWindowsSearchIconOnStartup};
