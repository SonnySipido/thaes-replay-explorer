const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {importReplay}=require('../replay-import.cjs');
test('drop import copies, preserves originals, reuses identical files and avoids overwrites',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'replay-drop-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const primary=path.join(root,'main'),external=path.join(root,'external');await fs.mkdir(primary);await fs.mkdir(external);
 const source=path.join(external,'game.w3g'),location={path:primary,includeSubfolders:true};await fs.writeFile(source,'replay one');
 let result=await importReplay(source,location);assert.equal(result.copied,true);assert.equal(await fs.readFile(source,'utf8'),'replay one');assert.equal(await fs.readFile(result.file,'utf8'),'replay one');
 const original=result.file;result=await importReplay(source,location);assert.equal(result.copied,false);assert.equal(result.file,original);
 assert.equal((await importReplay(original,location)).copied,false);
 await fs.writeFile(source,'replay two');result=await importReplay(source,location);assert.equal(result.copied,true);assert.equal(path.basename(result.file),'game (1).w3g');assert.equal(await fs.readFile(original,'utf8'),'replay one');
 const renamed=path.join(external,'renamed.w3g');await fs.writeFile(renamed,'replay two');assert.equal((await importReplay(renamed,location)).file,result.file);
 await assert.rejects(importReplay(path.join(external,'game.txt'),location),/\.w3g/);
 await assert.rejects(importReplay('relative.w3g',location),/\.w3g/);
});
test('drop import respects whether existing copies in subfolders are included',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'replay-drop-sub-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const sub=path.join(root,'sub');await fs.mkdir(sub);const file=path.join(sub,'nested.w3g');await fs.writeFile(file,'nested replay');
 assert.deepEqual(await importReplay(file,{path:root,includeSubfolders:true}),{file,copied:false});
 const copied=await importReplay(file,{path:root,includeSubfolders:false});assert.equal(copied.copied,true);assert.equal(copied.file,path.join(root,'nested.w3g'));
});
