'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {summary,indexFolder,SUMMARY_VERSION}=require('../library.cjs'),{SCHEMA}=require('../parser.cjs');
test('summary includes case-insensitive chat messages and observer names without retaining chat objects',()=>{
 const row=summary({file:'example.w3g',data:{map:{file:'map'},players:[],chat:[{playerName:'Observer',message:'Fast EXPANSION at north'},{playerName:'Observer',message:'Fast EXPANSION at north'},{playerName:'Other',message:'Grüße!'}]}});
 assert.ok(row.chatSearch.includes('fast expansion'));assert.ok(row.chatSearch.includes('observer'));assert.ok(row.chatSearch.includes('grüße'));assert.equal(row.chatSearch.split('\n').length,2);assert.equal(row.chat,undefined);
});
test('existing summaries upgrade chat from disk once and keep it on subsequent scans',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'replay-chat-search-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const folder=path.join(dir,'replays'),cache=path.join(dir,'cache');await fs.mkdir(folder);await fs.mkdir(path.join(cache,'summaries'),{recursive:true});const file=path.join(folder,'match.w3g');await fs.writeFile(file,'cached replay fixture');
 const stat=await fs.stat(file),key=crypto.createHash('sha256').update(file.toLowerCase()).digest('hex'),fingerprint=stat.size+':'+stat.mtimeMs+':'+SCHEMA;
 await fs.writeFile(path.join(cache,key+'.json'),JSON.stringify({fingerprint,schema:SCHEMA,data:{schema:SCHEMA,players:[],chat:[{playerName:'Player',message:'Attack the northern expansion'}]}}));
 await fs.writeFile(path.join(cache,'summaries',key+'.json'),JSON.stringify({summaryVersion:3,key,file,fingerprint,contentHash:'a'.repeat(64),chatCount:1}));
 let rows=[];let result=await indexFolder(folder,cache,r=>rows.push(r),()=>{},{},true,true);assert.equal(result.parsed,0);assert.equal(result.failed,0);assert.equal(rows[0].summaryVersion,SUMMARY_VERSION);assert.ok(rows[0].chatSearch.includes('northern expansion'));
 await fs.unlink(path.join(cache,key+'.json'));rows=[];result=await indexFolder(folder,cache,r=>rows.push(r),()=>{},{},true,true);assert.equal(result.failed,0);assert.equal(rows[0].chatSearch,'player attack the northern expansion');
});
