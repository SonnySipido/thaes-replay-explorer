'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {checkForUpdate,isNewer,checksumFor,installationFormat,installerCommand}=require('../updater.cjs');
const DL='https://github.com/SonnySipido/thaes-replay-explorer/releases/download/v0.3.1/';
function fakeRelease(release){return async()=>({ok:true,json:async()=>release});}
test('versions compare by number, not as text',()=>{
 assert.equal(isNewer('0.3.0','0.2.2'),true);assert.equal(isNewer('v0.10.0','0.9.9'),true);
 assert.equal(isNewer('0.3.0','0.3.0'),false);assert.equal(isNewer('0.2.9','0.3.0'),false);assert.equal(isNewer('nonsense','0.3.0'),false);
});
test('installations select their own format regardless of release asset order',async()=>{
 const assets=['msi','exe'].map(format=>({name:`Thae-Replay-Explorer-0.3.1-Setup-x64.${format}`,browser_download_url:DL+`Thae-Replay-Explorer-0.3.1-Setup-x64.${format}`}));
 assets.push({name:'SHA256SUMS.txt',browser_download_url:DL+'SHA256SUMS.txt'});
 for(const format of ['msi','exe']){
  const update=await checkForUpdate('0.3.0',fakeRelease({tag_name:'v0.3.1',assets}),format);
  assert.equal(update.newer,true);assert.equal(update.installer.format,format);assert(update.installer.name.endsWith('.'+format));
 }
 const missing=await checkForUpdate('0.3.0',fakeRelease({tag_name:'v0.3.1',assets:assets.filter(a=>!a.name.endsWith('.msi'))}),'msi');
 assert.equal(missing.newer,false);assert.equal(missing.installer,null);
 const foreign=await checkForUpdate('0.3.0',fakeRelease({tag_name:'v0.3.1',assets:[{name:'Thae-Replay-Explorer-0.3.1-Setup-x64.msi',browser_download_url:'https://example.com/setup.msi'},assets.at(-1)]}),'msi');
 assert.equal(foreign.newer,false);
});
test('the installed marker selects MSI; legacy and portable versions retain EXE updates',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'thaes-update-format-'));
 try{
  assert.equal(installationFormat(dir),'exe');
  fs.writeFileSync(path.join(dir,'install-format.json'),'{"format":"msi"}');assert.equal(installationFormat(dir),'msi');
  fs.writeFileSync(path.join(dir,'install-format.json'),'{"format":"exe"}');assert.equal(installationFormat(dir),'exe');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('MSI updates use Windows Installer and both formats request restart after success',()=>{
 const msi=installerCommand('C:\\A folder\\installer.msi');
 assert(msi.command.endsWith('msiexec.exe'));assert.deepEqual(msi.args.slice(0,5),['/i','C:\\A folder\\installer.msi','/qn','/norestart','RELAUNCH=1']);
 const exe=installerCommand('C:\\A folder\\installer.exe');assert.equal(exe.command,'C:\\A folder\\installer.exe');assert(exe.args.includes('/RELAUNCH=1'));
 assert.throws(()=>installerCommand('setup.zip'),/Unsupported/);
});
test('checksums are read per file name',()=>{
 const sums='a'.repeat(64)+'  Thae-Replay-Explorer-0.3.1-Setup-x64.exe\r\n'+'b'.repeat(64)+'  Thae-Replay-Explorer-0.3.1-Portable-x64.zip\n';
 assert.equal(checksumFor(sums,'Thae-Replay-Explorer-0.3.1-Setup-x64.exe'),'a'.repeat(64));
 assert.equal(checksumFor(sums,'other.exe'),null);
});
test('a newer release with an installer and checksums is offered',async()=>{
 const u=await checkForUpdate('0.3.0',fakeRelease({tag_name:'v0.3.1',html_url:'https://github.com/SonnySipido/thaes-replay-explorer/releases/tag/v0.3.1',assets:[
  {name:'Thae-Replay-Explorer-0.3.1-Setup-x64.exe',browser_download_url:DL+'Thae-Replay-Explorer-0.3.1-Setup-x64.exe',size:5},
  {name:'SHA256SUMS.txt',browser_download_url:DL+'SHA256SUMS.txt',size:1}]}));
 assert.equal(u.newer,true);assert.equal(u.version,'0.3.1');assert.equal(u.installer.name,'Thae-Replay-Explorer-0.3.1-Setup-x64.exe');
});
test('the same version, or an installer hosted elsewhere, is not offered',async()=>{
 assert.equal((await checkForUpdate('0.3.1',fakeRelease({tag_name:'v0.3.1',assets:[]}))).newer,false);
 const elsewhere=await checkForUpdate('0.3.0',fakeRelease({tag_name:'v0.3.1',assets:[
  {name:'Thae-Replay-Explorer-0.3.1-Setup-x64.exe',browser_download_url:'https://example.com/Thae-Replay-Explorer-0.3.1-Setup-x64.exe'},
  {name:'SHA256SUMS.txt',browser_download_url:DL+'SHA256SUMS.txt'}]}));
 assert.equal(elsewhere.newer,false);
});
