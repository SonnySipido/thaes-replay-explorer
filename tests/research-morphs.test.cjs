'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {collectActions,minimumLevel,addUnitMorphs}=require('../parser.cjs'),build=require('../ui/build-order.js'),research=require('../ui/research.js'),{entitySearch}=require('../library.cjs');
const four=id=>Buffer.from(id).reverse(),number=id=>{const bytes=Buffer.alloc(4);bytes.writeUInt32LE(id);return bytes;};
const select=(id,object)=>({id:0x19,itemId:four(id),object});
function actionFixture(){const replay=new EventEmitter(),extra=collectActions(replay);let time=0;return {extra,block:(ms,actions,playerId=0)=>{replay.emit('gamedatablock',{id:0x1e,timeIncrement:ms-time,commandBlocks:[{playerId,actions}]});time=ms;}};}

test('Destroyer morphs count unique selected Statues, not repeated clicks or research alone',()=>{
 const {extra,block}=actionFixture(),a=[1,1],b=[2,1],hero=[3,1];
 block(1000,[select('uobs',a),{id:0x16,selectMode:1,units:[a,b,hero]},select('Udea',hero),select('uobs',b),select('uobs',a)]);
 block(2000,[{id:0x10,orderId:number(852531)}]);
 block(2100,[{id:0x10,orderId:number(852531)}]);
 block(2200,[{id:0x10,orderId:number(852531)}]);
 block(4000,[select('ubsp',a),select('ubsp',b)]);
 const morphs=extra.morphOrders(0);assert.equal(morphs.length,2);assert.deepEqual(morphs.map(o=>o.source),['1:1','2:1']);assert(morphs.every(o=>o.confirmed));
 const p={units:{summary:{uobs:2},order:[{id:'uobs',ms:0}]},morphOrders:morphs};
 assert.equal(build.analysis(p).units.ubsp,2);assert.equal(build.analysis(p).units.uobs,2);assert.equal(build.orders(p).filter(o=>o.id==='ubsp').length,2);
 assert.equal(build.analysis(p,{hideSuspectedDuplicates:false}).units.ubsp,2);assert(entitySearch({players:[p]}).includes('destroyer'));
 const empty=actionFixture();empty.block(0,[{id:0x10,orderId:four('Rusp')}]);assert.equal(empty.extra.morphOrders(0).length,0);
});
test('Destroyers identified later or through a hotkey remain separate from other players and non-Statue units',()=>{
 const {extra,block}=actionFixture(),a=[10,1],b=[11,1];
 block(0,[{id:0x17,groupNumber:0,units:[a]}]);block(1000,[{id:0x18,groupNumber:0},{id:0x10,orderId:number(852531)}]);block(2000,[select('ubsp',a)]);
 block(2500,[select('ogru',b),{id:0x10,orderId:number(852531)}]);block(3000,[select('ubsp',[20,1])],1);
 assert.deepEqual(extra.morphOrders(0).map(o=>[o.source,o.ms]),[['10:1',1000]]);assert.equal(extra.morphOrders(1).length,1);
});
test('armor and attack levels survive repeat clicks, full-match cutoffs and raw-mode toggles',()=>{
 const p={upgrades:{order:[{id:'Rhar',ms:100000},{id:'Rhar',ms:100100},{id:'Rhar',ms:140000},{id:'Rhar',ms:170000},{id:'Rhar',ms:260000},{id:'Rhar',ms:370000},{id:'Rhme',ms:0},{id:'Rhme',ms:65000}]}};
 assert.deepEqual(build.analysis(p).upgrades.filter(o=>o.id==='Rhar').map(o=>o.label),['Iron Plating','Steel Plating','Mithril Plating']);
 assert.deepEqual(build.analysis(p,{hideSuspectedDuplicates:false}).upgrades.filter(o=>o.id==='Rhar').map(o=>o.level),[1,2,3]);
 assert.deepEqual(build.orders(p).filter(o=>o.id==='Rhme').map(o=>o.level),[1,2]);assert.equal(build.orders(p).filter(o=>o.id==='Rhar').length,3);
 const text=build.text({names:{Rhar:'Plating'},players:[{...p,name:'Player'}]},'Map');assert.match(text,/Steel Plating/);assert.match(text,/Mithril Plating/);
});
test('all caster families distinguish Adept and Master; cancelled research restarts at the same rank',()=>{
 for(const id of ['Rhpt','Rhst','Rowd','Rost','Rowt','Rune','Ruba','Redt','Redc']){
  const p={upgrades:{order:[{id,ms:0},{id,ms:100},{id,ms:20000},{id,ms:100000},{id,ms:250000}]},cancellations:[{id,ms:10000}]};
  const rows=build.analysis(p).upgrades;assert.deepEqual(rows.map(o=>o.level),[1,2],id);assert.deepEqual(rows.map(o=>o.ms),[20000,100000]);assert.match(rows[0].label,/Adept Training$/);assert.match(rows[1].label,/Master Training$/);assert(!rows.some(o=>o.cancelled));
  assert(entitySearch({players:[p]}).includes(rows[1].label.toLowerCase()));
 }
 assert.equal(research.orders({upgrades:{order:[{id:'custom',ms:0}]}})[0].level,undefined);
});

test('research keeps the first uncancelled start across restarts, players and time cutoffs',()=>{
 const p={upgrades:{order:[{id:'Rhme',ms:0},{id:'Rhme',ms:100},{id:'Rhme',ms:20000},{id:'Rhme',ms:21000},{id:'Rhme',ms:310000},{id:'Rhme',ms:310100},{id:'Rhme',ms:390000}]},cancellations:[{id:'Rhme',ms:10000},{id:'Rhme',ms:30000}]};
 const before=JSON.stringify(p);
 for(const hideSuspectedDuplicates of [true,false]){
  assert.deepEqual(build.analysis(p,{hideSuspectedDuplicates}).upgrades.map(o=>[o.level,o.ms]),[[1,310000],[2,390000]]);
  assert.equal(build.orders(p,{hideSuspectedDuplicates}).length,0);
 }
 assert.equal(JSON.stringify(p),before);
 assert.deepEqual(build.analysis({upgrades:{order:[{id:'Rhme',ms:5000}]}}).upgrades.map(o=>[o.level,o.ms]),[[1,5000]]);
 assert.equal(build.analysis({upgrades:{order:[{id:'Rhme',ms:0},{id:'Rhme',ms:100}]},cancellations:[{id:'Rhme',ms:1000}]}).upgrades.length,0);
 const custom={upgrades:{order:[{id:'custom',ms:0},{id:'custom',ms:100}]},cancellations:[{id:'custom',ms:200}]};
 assert.equal(build.analysis(custom,{hideSuspectedDuplicates:false}).upgrades.length,2);
 const text=build.text({players:[{...p,name:'Player'}]},'Map',{maxTime:Infinity,hideSuspectedDuplicates:false});
 assert.equal((text.match(/Iron Forged Swords/g)||[]).length,1);assert.match(text,/05:10  Iron Forged Swords/);
});
test('skill requirements give a minimum level, without adding retrained or unspent skill points',()=>{
 assert.equal(minimumLevel({AHhb:3}),5);assert.equal(minimumLevel({AHhb:1,AHre:1}),6);assert.equal(minimumLevel({AHhb:3,AHds:3,AHad:3,AHre:1}),10);
});
test('cached analyses without Statues upgrade without needing the replay, and run only once',async()=>{
 const data={players:[{units:{summary:{hfoo:2}}}]};assert.equal(await addUnitMorphs(data,'missing.w3g'),true);assert.equal(await addUnitMorphs(data,'missing.w3g'),false);
});
