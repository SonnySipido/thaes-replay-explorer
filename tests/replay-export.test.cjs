'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {saveReplayExport}=require('../replay-export.cjs');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';

test('timeline saves PNG bytes and build order retains its image and text exports',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'replay-export-'));try{
  for(const [label,format,contents] of [['Timeline','png',png],['Build order','png',png],['Build order','txt','0:20 Footman\n']]){
   const filePath=path.join(directory,label+'.'+format);let options;
   const saved=await saveReplayExport({entries:new Map([['replay',{}]]),key:'replay',format,contents,filename:'Map: name / '+label+'.. ',label,documents:directory,window:{},dialog:{showSaveDialog:async(_,pick)=>{options=pick;return {filePath,canceled:false};}}});
   assert.equal(saved,true);assert.equal(options.title,format==='png'?'Export '+label.toLowerCase()+' image':'Save build order');
   assert.equal(path.dirname(options.defaultPath),directory);assert.equal(path.basename(options.defaultPath),'Map name '+label+'.'+format);
   assert.deepEqual(await fs.readFile(filePath),format==='png'?Buffer.from(contents.split(',')[1],'base64'):Buffer.from(contents));
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('canceling export writes nothing',async()=>{
 assert.equal(await saveReplayExport({entries:new Map([['key',{}]]),key:'key',format:'png',contents:png,label:'Timeline',documents:os.tmpdir(),dialog:{showSaveDialog:async()=>({canceled:true,filePath:'must-not-be-created.png'})}}),false);
});
test('invalid exports are rejected before opening a save dialog',async()=>{
 let dialogs=0;const defaults={entries:new Map([['key',{}]]),key:'key',format:'png',contents:png,label:'Timeline',documents:os.tmpdir(),dialog:{showSaveDialog:async()=>{dialogs++;return {canceled:true};}}};
 for(const change of [{key:'missing'},{format:'exe'},{contents:42},{contents:'data:image/png;base64,dGV4dA=='},{contents:'data:image/jpeg;base64,iVBORw0KGgo='}])await assert.rejects(saveReplayExport({...defaults,...change}));
 assert.equal(dialogs,0);
});
