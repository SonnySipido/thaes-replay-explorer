'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {ReplayAnnotations,hashReplay}=require('../annotations.cjs');
const hash='a'.repeat(64);
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'replay-notes-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return {dir,file:path.join(dir,'annotations.json')};}
test('overlapping saves preserve favorite and latest note, including immediate close flush',async t=>{
 const {file}=await fixture(t),store=await new ReplayAnnotations(file).load();
 const first=store.update(hash,{favorite:true});const writing=store.flush();
 const second=store.update(hash,{notes:'First draft'}),third=store.update(hash,{notes:'Final draft'});
 await store.flush();await Promise.all([first,second,third,writing]);
 const restarted=await new ReplayAnnotations(file).load();assert.equal(restarted.get(hash).favorite,true);assert.equal(restarted.get(hash).notes,'Final draft');
});
test('content identity survives rename and identical copies',async t=>{
 const {dir,file}=await fixture(t),one=path.join(dir,'one.w3g'),copy=path.join(dir,'copy.w3g'),moved=path.join(dir,'renamed.w3g');await fs.writeFile(one,'replay content');await fs.copyFile(one,copy);
 const id=await hashReplay(one),store=await new ReplayAnnotations(file).load();const saving=store.update(id,{notes:'Expansion at 04:12',favorite:true});await store.flush();await saving;await fs.rename(one,moved);
 assert.equal(await hashReplay(copy),id);assert.equal(await hashReplay(moved),id);assert.equal((await new ReplayAnnotations(file).load()).get(await hashReplay(moved)).notes,'Expansion at 04:12');
});
test('backup import merges newer records and rejects invalid backups without partial changes',async t=>{
 const {file}=await fixture(t),store=await new ReplayAnnotations(file).load();const saving=store.update(hash,{notes:'Keep this'});await store.flush();await saving;
 assert.equal(await store.import({version:1,annotations:{[hash]:{favorite:true,notes:'Old',updatedAt:'2000-01-01'}}}),0);
 const newer={favorite:true,notes:'Imported',updatedAt:'2099-01-01'};assert.equal(await store.import({version:1,annotations:{[hash]:newer}}),1);
 const backup=await store.export();assert.deepEqual(backup.annotations[hash],newer);
 await assert.rejects(store.import({version:1,annotations:{['b'.repeat(64)]:newer,invalid:newer}}),/Invalid/);assert.deepEqual(await store.export(),backup);
});
test('corrupted annotation file is preserved and never overwritten',async t=>{
 const {file}=await fixture(t);await fs.writeFile(file,'broken');const store=await new ReplayAnnotations(file).load();await assert.rejects(store.update(hash,{favorite:true}),/preserved/);await assert.rejects(store.export(),/preserved/);assert.equal(await fs.readFile(file,'utf8'),'broken');
});
test('failed writes retain edits for a successful retry',async t=>{
 const {dir}=await fixture(t),parent=path.join(dir,'blocked');await fs.writeFile(parent,'block directory');const store=await new ReplayAnnotations(path.join(parent,'annotations.json')).load();store.loadError=null;
 const saving=store.update(hash,{notes:'Do not lose this',favorite:true});const rejected=assert.rejects(saving);await assert.rejects(store.flush());await rejected;assert.equal(store.get(hash).notes,'Do not lose this');await fs.unlink(parent);await store.flush();assert.equal((await new ReplayAnnotations(store.file).load()).get(hash).favorite,true);
});

test('old lightweight summaries acquire content identity without requiring a full parse',async t=>{
 const {dir}=await fixture(t),folder=path.join(dir,'replays'),cache=path.join(dir,'cache');await fs.mkdir(folder);await fs.mkdir(path.join(cache,'summaries'),{recursive:true});
 const replay=path.join(folder,'old.w3g');await fs.writeFile(replay,'summary migration fixture');const stat=await fs.stat(replay),{SCHEMA}=require('../parser.cjs'),crypto=require('node:crypto');
 const key=crypto.createHash('sha256').update(replay.toLowerCase()).digest('hex'),fingerprint=stat.size+':'+stat.mtimeMs+':'+SCHEMA;
 await fs.writeFile(path.join(cache,'summaries',key+'.json'),JSON.stringify({summaryVersion:2,key,file:replay,fingerprint,source:'w3c',chatCount:0}));
 await fs.writeFile(path.join(cache,key+'.json'),JSON.stringify({schema:SCHEMA,fingerprint,data:{schema:SCHEMA,players:[],chat:[]}}));
 const rows=[];const result=await require('../library.cjs').indexFolder(folder,cache,row=>rows.push(row),()=>{},{},true,true);
 assert.equal(result.parsed,0);assert.equal(result.failed,0);assert.equal(rows[0].contentHash,await hashReplay(replay));assert.equal(rows[0].source,'w3c');
});
