'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {summary,indexFolder,SUMMARY_VERSION,entitySearch}=require('../library.cjs'),{SCHEMA}=require('../parser.cjs');

test('search includes recorded entities and learned skills, without unrelated names or full analysis objects',()=>{
 const data={map:{file:'Example.w3x'},names:{Hpal:'Paladin',AHhb:'Holy Light',AHds:'Divine Shield',AHad:'Devotion Aura',AHre:'Resurrection',hfoo:'Footman',hrif:'Rifleman',hsor:'Sorceress',hbar:'Barracks',hkee:'Keep',Rhme:'Iron Forged Swords',Rhar:'Iron Plating',unused:'Unused Object'},players:[{
  id:0,name:'Player',heroes:[{id:'Hpal',abilities:{AHhb:3,AHre:0},abilityOrder:[{value:'AHhb'},{value:'AHds'}],retrainingHistory:[{abilities:{AHad:1}}]}],
  units:{summary:{hfoo:8,unused:0},order:[{id:'hfoo',ms:1},{id:'hfoo',ms:2}]},buildings:{order:[{id:'hbar',ms:3}]},upgrades:{summary:{Rhme:1}},
  groups:[{members:[{id:'hrif'}]}],groupHistory:[{members:[{id:'hkee'}]}],items:{summary:{unused:1}}
 }],chat:[]};
 const row=summary({file:'match.w3g',data}),terms=row.entitySearch.split('\n');
 for(const term of ['paladin','holy light','divine shield','devotion aura','footman','rifleman','barracks','keep','iron forged swords'])assert(terms.includes(term),term);
 for(const term of ['resurrection','sorceress','iron plating','unused object'])assert(!terms.includes(term),term);
 assert.equal(terms.filter(term=>term==='footman').length,1);
 assert.equal(row.players[0].heroes,undefined);assert.equal(row.names,undefined);assert.equal(row.data,undefined);
});

test('hero orders, skill history, fallback game names and custom map names are searchable',()=>{
 const text=entitySearch({names:{custom:'|cffff0000Elite_Guard|r'},players:[{heroOrders:[{id:'Hamg'}],heroes:[{id:'Obla',abilities:{},skillHistory:[{id:'AOwk',rank:1},{id:'AOww',rank:0}]}],units:{order:[{id:'custom'},{id:'xxxx'}]}}]});
 assert(text.includes('archmage'));assert(text.includes('blademaster'));assert(text.includes('wind walk'));assert(text.includes('elite guard'));
 assert(!text.includes('bladestorm'));assert(!text.includes('xxxx'));assert.equal(entitySearch(undefined),'');
});

test('cached summaries acquire entity names once without re-parsing or losing chat, favorites or notes',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'replay-entity-search-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const folder=path.join(dir,'replays'),cache=path.join(dir,'cache');await fs.mkdir(folder);await fs.mkdir(path.join(cache,'summaries'),{recursive:true});
 const file=path.join(folder,'match.w3g');await fs.writeFile(file,'cached replay fixture');
 const stat=await fs.stat(file),key=crypto.createHash('sha256').update(file.toLowerCase()).digest('hex'),fingerprint=stat.size+':'+stat.mtimeMs+':'+SCHEMA;
 const cacheFile=path.join(cache,key+'.json'),summaryFile=path.join(cache,'summaries',key+'.json');
 await fs.writeFile(cacheFile,JSON.stringify({fingerprint,schema:SCHEMA,data:{schema:SCHEMA,players:[{heroes:[{id:'Hpal',abilities:{AHhb:2}}],units:{order:[{id:'hfoo'}]},buildings:{order:[{id:'hbar'}]},upgrades:{order:[{id:'Rhme'}]}}]}}));
 await fs.writeFile(summaryFile,JSON.stringify({summaryVersion:4,key,file,fingerprint,contentHash:'a'.repeat(64),chatCount:1,chatSearch:'observer saved chat',annotation:{favorite:true,notes:'review'}}));
 let rows=[];let result=await indexFolder(folder,cache,row=>rows.push(row),()=>{},{},true,true);
 assert.equal(result.parsed,0);assert.equal(result.failed,0);assert.equal(result.cached,1);assert.equal(rows[0].summaryVersion,SUMMARY_VERSION);
 for(const term of ['paladin','holy light','footman','barracks'])assert(rows[0].entitySearch.includes(term));
 assert.equal(rows[0].chatSearch,'observer saved chat');assert.deepEqual(rows[0].annotation,{favorite:true,notes:'review'});
 const savedText=rows[0].entitySearch;await fs.unlink(cacheFile);
 rows=[];result=await indexFolder(folder,cache,row=>rows.push(row),()=>{},{},true,true);
 assert.equal(result.failed,0);assert.equal(result.parsed,0);assert.equal(rows[0].entitySearch,savedText);
 const persisted=JSON.parse(await fs.readFile(summaryFile,'utf8'));assert.equal(persisted.entitySearch,savedText);assert.equal(persisted.chatSearch,'observer saved chat');
});
