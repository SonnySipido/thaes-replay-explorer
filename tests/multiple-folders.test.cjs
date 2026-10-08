'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {scanFolders,indexFolder}=require('../library.cjs');
const {normalizeReplayFolders}=require('../replay-folders.cjs');
test('legacy folder settings migrate and explicit empty or disabled locations persist',()=>{
 const folder=path.resolve('example-replays');
 assert.deepEqual(normalizeReplayFolders({folder,includeSubfolders:false}),[{path:folder,enabled:true,includeSubfolders:false}]);
 assert.deepEqual(normalizeReplayFolders({folder,replayFolders:[]}),[]);
 const locations=[{path:folder,enabled:false,includeSubfolders:false}];
 assert.deepEqual(normalizeReplayFolders(JSON.parse(JSON.stringify({replayFolders:locations}))),locations);
 assert.equal(normalizeReplayFolders({replayFolders:[...locations,{path:folder.toUpperCase()},{path:'relative'},null]}).length,1);
});
test('multiple locations deduplicate overlap, respect independent flags and isolate missing directories',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'replay-folders-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const a=path.join(root,'a'),nested=path.join(a,'nested'),b=path.join(root,'b');await fs.mkdir(nested,{recursive:true});await fs.mkdir(b);
 for(const file of [path.join(a,'one.w3g'),path.join(nested,'two.W3G'),path.join(b,'three.w3g'),path.join(b,'ignore.txt')])await fs.writeFile(file,'');
 const loc=(p,sub=true,enabled=true)=>({path:p,includeSubfolders:sub,enabled});
 let result=await scanFolders([loc(a),loc(nested),loc(b),loc(path.join(root,'missing'))]);
 assert.equal(result.files.length,3);assert.equal(result.folderErrors.length,1);
 result=await scanFolders([loc(a,false),loc(b,false)]);assert.equal(result.files.length,2);assert.ok(!result.files.includes(path.join(nested,'two.W3G')));
 result=await scanFolders([loc(a,false),loc(nested),loc(b,true,false)]);assert.equal(result.files.length,2);
 result=await scanFolders([loc(a,true,false),loc(b,true,false)]);assert.equal(result.files.length,0);
 const indexed=[];const summary=await indexFolder([loc(a),loc(nested),loc(b)],path.join(root,'cache'),entry=>indexed.push(entry),()=>{}, {},true,true);
 assert.equal(summary.total,3);assert.equal(indexed.length,3);assert.equal(new Set(indexed.map(e=>e.key)).size,3);
 assert.equal((await fs.stat(path.join(a,'one.w3g'))).isFile(),true);
});
