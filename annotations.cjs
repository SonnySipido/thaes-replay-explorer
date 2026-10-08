'use strict';
const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
async function hashReplay(file){const h=crypto.createHash('sha256');for await(const chunk of sync.createReadStream(file))h.update(chunk);return h.digest('hex');}
function validateRecord(hash,value){
 if(!/^[a-f0-9]{64}$/.test(hash)||!value||typeof value.favorite!=='boolean'||typeof value.notes!=='string'||value.notes.length>100000||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('Invalid annotation backup.');
 return {favorite:value.favorite,notes:value.notes,updatedAt:value.updatedAt};
}
function validateDocument(document){
 if(document?.version!==1||!document.annotations||typeof document.annotations!=='object'||Array.isArray(document.annotations))throw Error('Unsupported annotation backup.');
 const result={};for(const [hash,value] of Object.entries(document.annotations))result[hash]=validateRecord(hash,value);return result;
}
class ReplayAnnotations{
 constructor(file){this.file=file;this.data={};this.latest=new Map();this.pending=new Map();this.waiters=[];this.queue=Promise.resolve();this.timer=null;this.loadError=null;}
 async load(){try{this.data=validateDocument(JSON.parse(await fs.readFile(this.file,'utf8')));}catch(e){if(e.code!=='ENOENT')this.loadError=Error('Could not read saved annotations. The original file has been preserved. '+e.message);}return this;}
 get(hash){return this.latest.get(hash)||this.data[hash]||{favorite:false,notes:'',updatedAt:null};}
 update(hash,patch){
 if(this.loadError)return Promise.reject(this.loadError);
 if(!/^[a-f0-9]{64}$/.test(hash)||!patch||Object.keys(patch).some(k=>!['favorite','notes'].includes(k))||('favorite'in patch&&typeof patch.favorite!=='boolean')||('notes'in patch&&(typeof patch.notes!=='string'||patch.notes.length>100000)))return Promise.reject(Error('Invalid replay annotation.'));
 const value={...this.get(hash),...patch,updatedAt:new Date().toISOString()};this.latest.set(hash,value);this.pending.set(hash,value);
 clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(()=>{}),'favorite'in patch?0:400);
 return new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));
 }
 flush(){
 clearTimeout(this.timer);this.timer=null;
 if(!this.pending.size)return this.queue;
 const changes=this.pending,waiters=this.waiters;this.pending=new Map();this.waiters=[];
 this.queue=this.queue.catch(()=>{}).then(async()=>{
  const data={...this.data,...Object.fromEntries(changes)};
  await fs.mkdir(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';
  await fs.writeFile(temp,JSON.stringify({version:1,annotations:data},null,2));await fs.rename(temp,this.file);this.data=data;
  for(const waiter of waiters)waiter.resolve();
 }).catch(error=>{for(const [hash,value] of changes)if(!this.pending.has(hash))this.pending.set(hash,this.latest.get(hash)||value);for(const waiter of waiters)waiter.reject(error);throw error;});
 return this.queue;
 }
 async export(){if(this.loadError)throw this.loadError;await this.flush();return {version:1,annotations:this.data};}
 async import(document){if(this.loadError)throw this.loadError;const imported=validateDocument(document);await this.flush();let count=0;
 for(const [hash,value] of Object.entries(imported)){if(!this.data[hash]||Date.parse(value.updatedAt)>Date.parse(this.data[hash].updatedAt)){this.latest.set(hash,value);this.pending.set(hash,value);count++;}}
 await this.flush();return count;
 }
}
module.exports={ReplayAnnotations,hashReplay,validateDocument};
