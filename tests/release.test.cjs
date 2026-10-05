'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {resolveMapFile}=require('../map-files.cjs');
const {ReplayDetails}=require('../replay-details.cjs');
const filters=require('../ui/replay-filters.js');
test('matchup matches opposing teams and respects selected random race',()=>{
 const p=[{team:0,race:'R',raceDetected:'H'},{team:0,race:'O'},{team:1,race:'N'},{team:1,race:'U'}];
 assert.equal(filters.teamSize(p),'2v2');assert.equal(filters.matchup(p,'R','N'),true);assert.equal(filters.matchup(p,'N','R'),true);assert.equal(filters.matchup(p,'H','N'),false);assert.equal(filters.matchup(p,'R','O'),false);
});
test('W3Champions filenames become dates',()=>{
 const date=new Date(filters.timestamp({name:'w3c-20260915134230.w3g'}));assert.equal(date.getFullYear(),2026);assert.equal(date.getMonth(),8);assert.equal(date.getHours(),13);assert.equal(date.getMinutes(),42);
});
test('map lookup handles relocated files, missing maps and traversal',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'replay-map-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'Maps/Download'),{recursive:true});const expected=path.join(dir,'Maps/Download/Example.w3x');await fs.writeFile(expected,'fixture');
 assert.equal(await resolveMapFile({path:'Maps/Old/Example.w3x'},[dir]),await fs.realpath(expected));
 await assert.rejects(resolveMapFile({path:'Maps/Missing.w3x'},[dir]),{code:'MAP_NOT_FOUND'});
 await assert.rejects(resolveMapFile({path:'../Example.w3x'},[dir]),/valid local map path/);
});
test('replay details evict old records and reject stale fingerprints',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'replay-cache-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 for(let i=0;i<5;i++)await fs.writeFile(path.join(dir,i+'.json'),JSON.stringify({fingerprint:'v1',data:{id:i}}));
 const details=new ReplayDetails(dir,{maxEntries:2});
 for(let i=0;i<5;i++){assert.equal((await details.get({key:String(i),fingerprint:'v1'})).data.id,i);assert.ok(details.entries.size<=2)}
 await assert.rejects(details.get({key:'0',fingerprint:'v2'}),/cache changed/);
});
