'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {checkForUpdate,isNewer,checksumFor}=require('../updater.cjs');
const DL='https://github.com/SonnySipido/thaes-replay-explorer/releases/download/v0.3.1/';
function fakeRelease(release){return async()=>({ok:true,json:async()=>release});}
test('versions compare by number, not as text',()=>{
 assert.equal(isNewer('0.3.0','0.2.2'),true);assert.equal(isNewer('v0.10.0','0.9.9'),true);
 assert.equal(isNewer('0.3.0','0.3.0'),false);assert.equal(isNewer('0.2.9','0.3.0'),false);assert.equal(isNewer('nonsense','0.3.0'),false);
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
