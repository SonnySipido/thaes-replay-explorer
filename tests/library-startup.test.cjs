'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {loadLibrarySnapshot,saveLibrarySnapshot,SUMMARY_VERSION}=require('../library.cjs');

test('map capacity is optional and does not come from the number of participants',()=>{
 const {summary}=require('../library.cjs');
 const entry={key:'example',file:'match.w3g',data:{map:{file:'Example.w3x'},players:[{id:1},{id:2}]}};
 assert(!Object.hasOwn(summary(entry),'mapSlots'));
 assert.equal(summary({...entry,data:{...entry.data,startSpots:8}}).mapSlots,8);
 for(const startSpots of [0,25,0xCC])assert(!Object.hasOwn(summary({...entry,data:{...entry.data,startSpots}}),'mapSlots'));
});
test('unchanged parse failures are reused from the catalogue and retried when their file changes',async t=>{
 const {indexFolder}=require('../library.cjs');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'library-failure-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const file=path.join(dir,'damaged.w3g');await fs.writeFile(file,'bad replay');
 const cache=path.join(dir,'cache'),rows=[];await indexFolder(dir,cache,row=>rows.push(row));assert(rows[0].error);assert(rows[0].fingerprint);
 const known={[rows[0].key]:rows[0].fingerprint};let delivered=0;const unchanged=await indexFolder(dir,cache,()=>delivered++,()=>{},known);assert.equal(unchanged.cached,1);assert.equal(unchanged.failed,0);assert.equal(delivered,0);
 await fs.writeFile(file,'changed replay');const changed=await indexFolder(dir,cache,()=>delivered++,()=>{},known);assert.equal(changed.failed,1);assert.equal(delivered,1);
});
test('startup restores rows and folder branches from a single file without reading replay files',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'library-startup-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const folders=[{path:path.join(dir,'missing-replays'),enabled:true,includeSubfolders:true}],rows=[{key:'example',file:path.join(folders[0].path,'match.w3g'),summaryVersion:SUMMARY_VERSION,contentHash:'a'.repeat(64),entitySearch:'paladin',chatSearch:'gg',fingerprint:'saved'}],directories=[folders[0].path];
 await saveLibrarySnapshot(dir,folders,rows,directories);const restored=await loadLibrarySnapshot(dir,folders);assert.deepEqual(restored.rows,rows);assert.deepEqual(restored.directories,directories);
 for(const field of ['enabled','includeSubfolders'])assert.equal(await loadLibrarySnapshot(dir,[{...folders[0],[field]:false}]),null);
 assert.equal(await loadLibrarySnapshot(dir,[{...folders[0],path:dir}]),null);
});
test('missing, corrupt and outdated catalogues fall back safely to existing summaries',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'library-startup-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const file=path.join(dir,'library.json');
 assert.equal(await loadLibrarySnapshot(dir,[]),null);await fs.writeFile(file,'broken');assert.equal(await loadLibrarySnapshot(dir,[]),null);
 await saveLibrarySnapshot(dir,[],[],[]);const saved=JSON.parse(await fs.readFile(file));saved.summaryVersion--;await fs.writeFile(file,JSON.stringify(saved));assert.equal(await loadLibrarySnapshot(dir,[]),null);
});
