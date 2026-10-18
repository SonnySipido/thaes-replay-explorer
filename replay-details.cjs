'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {addUnitMorphs,addWinnerDetails,SCHEMA}=require('./parser.cjs');
class ReplayDetails {
 constructor(directory,{maxBytes=48*1024*1024,maxEntries=3}={}){this.directory=directory;this.maxBytes=maxBytes;this.maxEntries=maxEntries;this.entries=new Map();this.bytes=0;this.pending=Promise.resolve();this.generation=0;}
 clear(){this.entries.clear();this.bytes=0;this.generation++;}
 invalidate(key){const old=this.entries.get(key);if(old){this.bytes-=old.bytes;this.entries.delete(key);}}
 get(row){
  const generation=this.generation;
  const load=async()=>{
   if(generation!==this.generation)throw Error('Replay library changed. Select the replay again.');
   if(row.error)return {key:row.key,file:row.file,error:row.error};
   const existing=this.entries.get(row.key);
   if(existing?.fingerprint===row.fingerprint){this.entries.delete(row.key);this.entries.set(row.key,existing);return existing.entry;}
   this.invalidate(row.key);
   const text=await fs.readFile(path.join(this.directory,row.key+'.json'),'utf8');
   if(generation!==this.generation)throw Error('Replay library changed. Select the replay again.');
   const entry=JSON.parse(text);if(entry.fingerprint!==row.fingerprint||!entry.data)throw Error('Replay cache changed. Please select the replay again after indexing finishes.');
   let upgraded=false;
   if(entry.data.schema===SCHEMA&&entry.file){
    upgraded=await addUnitMorphs(entry.data,entry.file);
    upgraded=await addWinnerDetails(entry.data,entry.file)||upgraded;
    if(upgraded){
     if(generation!==this.generation)throw Error('Replay library changed. Select the replay again.');
     const stat=await fs.stat(entry.file);if(stat.size+':'+stat.mtimeMs+':'+SCHEMA!==row.fingerprint)throw Error('Replay changed. Please select it again after indexing finishes.');
     const file=path.join(this.directory,row.key+'.json'),temp=file+'.'+process.pid+'.detail.tmp';
     await fs.writeFile(temp,JSON.stringify(entry));
     const after=await fs.stat(entry.file);if(generation!==this.generation||after.size+':'+after.mtimeMs+':'+SCHEMA!==row.fingerprint){await fs.unlink(temp);throw Error('Replay changed. Please select it again after indexing finishes.');}
     await fs.rename(temp,file);
    }
   }
   // Parsed objects cost substantially more than their serialized JSON.
   const bytes=Buffer.byteLength(upgraded?JSON.stringify(entry):text)*4;
   if(bytes<=this.maxBytes){while(this.entries.size&&(this.entries.size>=this.maxEntries||this.bytes+bytes>this.maxBytes))this.invalidate(this.entries.keys().next().value);this.entries.set(row.key,{entry,bytes,fingerprint:row.fingerprint});this.bytes+=bytes;}
   return entry;
  };
  const result=this.pending.then(load);this.pending=result.then(()=>{},()=>{});return result;
 }
}
module.exports={ReplayDetails};
