'use strict';
// "Check for updates": the newest release of this app on GitHub, and installing it. Nothing is
// contacted until the button is pressed. The installer is only taken from this repository's release
// downloads and must match the release's SHA256SUMS.txt before it runs.
const crypto=require('node:crypto'),fs=require('node:fs'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const REPO='SonnySipido/thaes-replay-explorer';
const LATEST='https://api.github.com/repos/'+REPO+'/releases/latest';
const DOWNLOADS='https://github.com/'+REPO+'/releases/download/';
const RELEASES='https://github.com/'+REPO+'/releases/';
const HEADERS={'User-Agent':"Thae's Replay Explorer"};

function parseVersion(value){const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value||'').trim());return m?m.slice(1).map(Number):null;}
function isNewer(latest,current){
 const a=parseVersion(latest),b=parseVersion(current);if(!a||!b)return false;
 for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];
 return false;
}
// "<sha256>  <file name>" lines, as written by the release build
function checksumFor(sums,name){
 for(const line of String(sums).split(/\r?\n/)){const m=/^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line.trim());if(m&&m[2].trim()===name)return m[1].toLowerCase();}
 return null;
}
function installationFormat(appDir=__dirname){
 try{return JSON.parse(fs.readFileSync(path.join(appDir,'install-format.json'),'utf8')).format==='msi'?'msi':'exe';}
 catch{return 'exe';} // existing EXE and portable versions have no marker
}
async function checkForUpdate(current,fetchImpl=fetch,format=installationFormat()){
 if(!['exe','msi'].includes(format))throw Error('Unknown installation format.');
 const res=await fetchImpl(LATEST,{headers:{...HEADERS,Accept:'application/vnd.github+json'}});
 if(!res.ok)throw Error('GitHub could not be reached ('+res.status+').');
 const release=await res.json();
 const version=String(release.tag_name||'').replace(/^v/,'');
 const asset=test=>(release.assets||[]).find(a=>test.test(a.name)&&String(a.browser_download_url).startsWith(DOWNLOADS));
 const installer=asset(format==='msi'?/Setup-x64\.msi$/:/Setup-x64\.exe$/),sums=asset(/^SHA256SUMS\.txt$/);
 const notes=String(release.html_url||'').startsWith(RELEASES)?release.html_url:RELEASES;
 return {current,version,newer:isNewer(version,current)&&!!installer&&!!sums,notes,
  installer:installer?{name:installer.name,url:installer.browser_download_url,size:installer.size,format}:null,sums:sums?.browser_download_url||null};
}
async function downloadUpdate(update,onProgress=()=>{},fetchImpl=fetch){
 const sums=await fetchImpl(update.sums,{headers:HEADERS});
 if(!sums.ok)throw Error('The checksum file could not be downloaded ('+sums.status+').');
 const expected=checksumFor(await sums.text(),update.installer.name);
 if(!expected)throw Error('The release has no checksum for its installer.');
 const res=await fetchImpl(update.installer.url,{headers:HEADERS});
 if(!res.ok)throw Error('The installer could not be downloaded ('+res.status+').');
 const dir=path.join(os.tmpdir(),'ThaesReplayExplorer-update');await fsp.mkdir(dir,{recursive:true});
 const file=path.join(dir,path.basename(update.installer.name));
 const total=Number(res.headers.get('content-length'))||update.installer.size||0,hash=crypto.createHash('sha256'),out=fs.createWriteStream(file);
 let received=0;
 try{
  for await(const chunk of res.body){
   hash.update(chunk);received+=chunk.length;onProgress(received,total);
   if(!out.write(chunk))await new Promise(resolve=>out.once('drain',resolve));
  }
 }finally{await new Promise(resolve=>out.end(resolve));}
 if(hash.digest('hex')!==expected){await fsp.rm(file,{force:true});throw Error('The download did not match its checksum, so nothing was installed.');}
 return file;
}
// Both installers relaunch only after a successful install. Keep MSI ownership intact:
// an MSI installation must never be updated by Inno's EXE installer.
function installerCommand(file){
 if(/\.msi$/i.test(file))return {command:path.join(process.env.SystemRoot||'C:\\Windows','System32','msiexec.exe'),args:['/i',file,'/qn','/norestart','RELAUNCH=1','/L*v',file+'.log']};
 if(/\.exe$/i.test(file))return {command:file,args:['/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/CLOSEAPPLICATIONS','/RELAUNCH=1']};
 throw Error('Unsupported installer format.');
}
function runInstaller(file){
 const {command,args}=installerCommand(file);
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true});
  child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
 });
}
module.exports={checkForUpdate,downloadUpdate,runInstaller,installationFormat,installerCommand,isNewer,checksumFor,RELEASES};
