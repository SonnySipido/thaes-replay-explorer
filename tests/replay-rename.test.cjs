'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {replayName,renameReplay}=require('../replay-rename.cjs');
test('replay names retain the extension and reject paths, reserved names and invalid Windows characters',()=>{
 assert.equal(replayName(' Practice match '),'Practice match.w3g');assert.equal(replayName('雪.w3g'),'雪.w3g');
 for(const value of ['', '../outside','sub/file','sub\\file','CON','aux.txt','name.','bad:name','TempReplay.w3g',null])assert.throws(()=>replayName(value));
});
test('rename preserves file contents and time, never overwrites a destination, and accepts an unchanged name',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'rename-replay-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
 const file=path.join(folder,'old.w3g');await fs.writeFile(file,'replay contents');await fs.utimes(file,new Date(100000),new Date(200000));
 const renamed=await renameReplay(file,'Practice 雪');assert.equal(await fs.readFile(renamed,'utf8'),'replay contents');await assert.rejects(fs.stat(file),{code:'ENOENT'});assert.equal((await fs.stat(renamed)).mtimeMs,200000);
 await fs.writeFile(file,'other replay');await assert.rejects(renameReplay(renamed,'old'),/already exists/);assert.equal(await fs.readFile(file,'utf8'),'other replay');assert.equal(await fs.readFile(renamed,'utf8'),'replay contents');
 assert.equal(await renameReplay(renamed,'Practice 雪.w3g'),renamed);
});
