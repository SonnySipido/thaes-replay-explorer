'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {replaceCacheBitmap,refreshWindowsSearchIcon,refreshWindowsSearchIconOnStartup}=require('../windows-search-icon.cjs');
function bmp(width=2,height=2){
 const bytes=Buffer.alloc(138+width*Math.abs(height)*4);bytes.write('BM');bytes.writeUInt32LE(bytes.length,2);bytes.writeUInt32LE(138,10);bytes.writeUInt32LE(124,14);bytes.writeInt32LE(width,18);bytes.writeInt32LE(height,22);bytes.writeUInt16LE(1,26);bytes.writeUInt16LE(32,28);bytes.writeUInt32LE(3,30);bytes.writeUInt32LE(0x00ff0000,54);bytes.writeUInt32LE(0x0000ff00,58);bytes.writeUInt32LE(0x000000ff,62);bytes.writeUInt32LE(0xff000000,66);return bytes;
}
const pixels=(width,height)=>Buffer.alloc(width*height*4,27);
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'thaes-search-icon-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const userData=path.join(root,'user'),localAppData=path.join(root,'local'),iconPath=path.join(root,'icon.png');await fs.mkdir(userData);await fs.mkdir(localAppData);await fs.writeFile(iconPath,'first-logo');
 const cache=path.join(localAppData,'Packages','Microsoft.Windows.Search_cw5n1h2txyewy','LocalState','AppIconCache');
 const file=scale=>path.join(cache,scale,'Thae_ReplayExplorer');
 async function add(scale,bytes=bmp()){await fs.mkdir(path.dirname(file(scale)),{recursive:true});await fs.writeFile(file(scale),bytes);}
 return {root,cache,file,add,options:{userData,localAppData,iconPath,platform:'win32',bitmapForIcon:()=>pixels}};
}
test('cache pixels keep the header and use the correct top-down or bottom-up rows',()=>{
 const values=Buffer.from([1,2,3,255,4,5,6,255,7,8,9,255,10,11,12,255]);
 for(const height of [2,-2]){
  const original=bmp(2,height),converted=replaceCacheBitmap(original,()=>values);
  assert.deepEqual(converted.subarray(0,138),original.subarray(0,138));
  assert.deepEqual(converted.subarray(138),height>0?Buffer.concat([values.subarray(8),values.subarray(0,8)]):values);
  assert.equal(original.subarray(138).every(byte=>byte===0),true);
 }
});
test('unsupported, truncated and oversized cache formats are left untouched',()=>{
 for(const corrupt of [Buffer.from('no bitmap'),bmp().subarray(0,140),Object.assign(Buffer.from(bmp()),{0:0})])assert.equal(replaceCacheBitmap(corrupt,pixels),null);
 for(const [offset,value,size] of [[18,513,4],[28,24,2],[30,1,4],[54,0,4],[10,1,4]]){const bad=bmp();size===2?bad.writeUInt16LE(value,offset):bad.writeUInt32LE(value,offset);assert.equal(replaceCacheBitmap(bad,pixels),null);}
 assert.throws(()=>replaceCacheBitmap(bmp(),()=>Buffer.alloc(4)),/bitmap size/);
});
test('refresh replaces only this app at each cached scale and preserves backups',async t=>{
 const f=await fixture(t);await f.add('100');await f.add('200',bmp(4,4));const other=path.join(f.cache,'100','OtherApp');await fs.writeFile(other,'keep');let restarts=0;
 const options={...f.options,restartSearch:async()=>{restarts++;assert.deepEqual(await fs.readFile(f.file('100')),bmp());}};
 assert.deepEqual(await refreshWindowsSearchIcon(options),{status:'refreshed',changed:2});assert.equal(restarts,1);assert.equal(await fs.readFile(other,'utf8'),'keep');
 assert.deepEqual(await fs.readFile(f.file('100')),replaceCacheBitmap(bmp(),pixels));
 const backups=await fs.readdir(path.join(f.options.userData,'windows-search-icon-backup-v1'));assert.equal(backups.length,2);
 assert.deepEqual(await refreshWindowsSearchIcon(options),{status:'current',changed:0});assert.equal(restarts,1);
});
test('a changed logo refreshes again without losing the original backup',async t=>{
 const f=await fixture(t);await f.add('100');let restarts=0;const options={...f.options,restartSearch:async()=>{restarts++;}};await refreshWindowsSearchIcon(options);
 await fs.writeFile(f.options.iconPath,'new-logo');options.bitmapForIcon=()=>((w,h)=>Buffer.alloc(w*h*4,41));assert.equal((await refreshWindowsSearchIcon(options)).changed,1);assert.equal(restarts,2);
 const backup=path.join(f.options.userData,'windows-search-icon-backup-v1',(await fs.readdir(path.join(f.options.userData,'windows-search-icon-backup-v1')))[0]);assert.deepEqual(await fs.readFile(backup),bmp());
});
test('a fresh installation does not create Search caches or restart Search',async t=>{
 const f=await fixture(t);let restarts=0;assert.equal((await refreshWindowsSearchIcon({...f.options,restartSearch:async()=>{restarts++;}})).changed,0);assert.equal(restarts,0);await assert.rejects(fs.stat(f.cache),{code:'ENOENT'});
});
test('unsupported cache files are skipped without marking the repair complete',async t=>{
 const f=await fixture(t);await f.add('100',Buffer.from('unfamiliar future cache'));const result=await refreshWindowsSearchIcon({...f.options,restartSearch:async()=>assert.fail('Search should not restart')});assert.deepEqual(result,{status:'unsupported-cache',changed:0});await assert.rejects(fs.stat(path.join(f.options.userData,'windows-search-icon-v1.json')),{code:'ENOENT'});
});
test('a failed Search refresh is retried later without modifying cache files',async t=>{
 const f=await fixture(t);await f.add('100');await assert.rejects(refreshWindowsSearchIcon({...f.options,restartSearch:async()=>{throw Error('Search unavailable');}}),/Search unavailable/);assert.deepEqual(await fs.readFile(f.file('100')),bmp());await assert.rejects(fs.stat(path.join(f.options.userData,'windows-search-icon-v1.json')),{code:'ENOENT'});
 assert.equal((await refreshWindowsSearchIcon({...f.options,restartSearch:async()=>{}})).changed,1);
});
test('hard-linked cache entries cannot change files outside the cache',async t=>{
 const f=await fixture(t);await f.add('100');await fs.rm(f.file('100'));const outside=path.join(f.root,'outside.bmp');await fs.writeFile(outside,bmp());await fs.link(outside,f.file('100'));
 assert.equal((await refreshWindowsSearchIcon({...f.options,restartSearch:async()=>assert.fail('Search should not restart')})).changed,0);assert.deepEqual(await fs.readFile(outside),bmp());
});
test('non-Windows runs do not inspect or modify cache directories',async()=>{
 assert.deepEqual(await refreshWindowsSearchIcon({platform:'linux'}),{status:'unsupported',changed:0});
});
test('startup retries transient failures without requiring another app launch',async t=>{
 const f=await fixture(t);await f.add('100');let calls=0,delays=0;
 const options={...f.options,restartSearch:async()=>{if(++calls<3)throw Error('Windows Search is initializing');}};
 assert.equal((await refreshWindowsSearchIconOnStartup(options,{wait:async ms=>{assert.equal(ms,2000);delays++;}})).changed,1);
 assert.equal(calls,3);assert.equal(delays,2);assert.equal((await refreshWindowsSearchIconOnStartup(options)).status,'current');assert.equal(calls,3);
});
test('persistent startup failures are bounded and preserve the original icon',async t=>{
 const f=await fixture(t);await f.add('100');let calls=0;
 await assert.rejects(refreshWindowsSearchIconOnStartup({...f.options,restartSearch:async()=>{calls++;throw Error('Search unavailable');}},{wait:async()=>{}}),/Search unavailable/);
 assert.equal(calls,3);assert.deepEqual(await fs.readFile(f.file('100')),bmp());await assert.rejects(fs.stat(path.join(f.options.userData,'windows-search-icon-v1.json')),{code:'ENOENT'});
});
