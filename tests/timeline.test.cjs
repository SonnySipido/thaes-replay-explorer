'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),timeline=require('../ui/timeline.js');

test('saved categories retain partial selections and all-disabled choices, with safe first-use and corrupt-setting defaults',()=>{
 assert.deepEqual([...timeline.savedTypes('["army","items"]')],['army','items']);assert.deepEqual([...timeline.savedTypes('[]')],[]);
 for(const invalid of [null,undefined,'bad JSON','{}','["unknown"]'])assert.deepEqual([...timeline.savedTypes(invalid)],['army','buildings','upgrades','items']);
});

test('timeline includes every player and full-match unit, hero, building, research and item orders',()=>{
 const data={duration:900000,players:[
  {id:2,name:'Orc',teamid:1,heroes:[{id:'Obla'}],units:{order:[{id:'Obla',ms:50000},{id:'ogru',ms:600000}]},heroOrders:[{id:'Obla',ms:50000}],buildings:{order:[{id:'ostr',ms:450000}]},upgrades:{order:[{id:'Roar',ms:620000}]},items:{order:[{id:'phea',ms:650000}]}},
  {id:1,name:'Human',teamid:0,units:{order:[{id:'hfoo',ms:600000}]}},
  {id:3,name:'No orders',teamid:1}
 ]};
 const before=JSON.stringify(data),rows=timeline.tracks(data);
 assert.deepEqual(rows.map(row=>row.player.name),['Human','Orc','No orders']);
 assert.deepEqual(rows.map(row=>row.index),[1,0,2]);
 assert.deepEqual(rows[1].events.map(event=>event.kind),['heroes','buildings','units','upgrades','items']);
 assert.deepEqual(rows[1].events.map(event=>event.ms),[50000,450000,600000,620000,650000]);
 assert.equal(rows[1].events[1].tag,'T2');assert.equal(rows[2].events.length,0);
 assert.equal(timeline.duration(data,rows),900000);assert.equal(JSON.stringify(data),before);
});

test('timeline honors suspected duplicate filtering, preserves purchases, and retains research levels',()=>{
 const data={players:[{units:{order:[{id:'hfoo',ms:1000},{id:'hfoo',ms:1100}]},items:{order:[{id:'phea',ms:2000},{id:'phea',ms:2000}]},upgrades:{order:[{id:'Rhar',ms:100000},{id:'Rhar',ms:200000}]}}]};
 const filtered=timeline.tracks(data)[0].events,raw=timeline.tracks(data,{hideSuspectedDuplicates:false})[0].events;
 assert.equal(filtered.filter(event=>event.kind==='units').length,1);
 assert.equal(raw.filter(event=>event.kind==='units').length,2);
 assert.equal(filtered.filter(event=>event.kind==='items').length,2);
 assert.deepEqual(filtered.filter(event=>event.kind==='upgrades').map(event=>event.rankLabel),['1','2']);
});

test('player lanes split orders into four categories and merging respects disabled types',()=>{
 const events=[{id:'worker',kind:'units',ms:1000},{id:'hero',kind:'heroes',ms:2000},{id:'hall',kind:'buildings',ms:3000},{id:'research',kind:'upgrades',ms:4000},{id:'potion',kind:'items',ms:5000}];
 const split=timeline.lanes(events);
 assert.deepEqual(split.map(lane=>lane.label),['Heroes & units','Buildings','Upgrades','Purchases']);
 assert.deepEqual(split.map(lane=>lane.events.map(event=>event.id)),[['worker','hero'],['hall'],['research'],['potion']]);
 assert.deepEqual(timeline.lanes(events,{merged:true})[0].events,events);
 const types=new Set(['army','items']);
 assert.deepEqual(timeline.lanes(events,{types}).map(lane=>lane.key),['army','items']);
 assert.deepEqual(timeline.lanes(events,{types,merged:true})[0].events.map(event=>event.id),['worker','hero','potion']);
 assert.deepEqual(timeline.lanes(events,{types:new Set()}),[]);
 assert.deepEqual(timeline.lanes(events,{types:new Set(),merged:true}),[]);
 assert.equal(timeline.lanes([]).length,4);
});

test('heroes, expansions after tier two, and both town-hall tech tiers have resting priority',()=>{
 for(const event of [{kind:'heroes',id:'Hamg'},{kind:'buildings',id:'htow',ms:600000},{kind:'buildings',id:'ogre'},{kind:'buildings',id:'etol'},{kind:'buildings',id:'unpl'},{kind:'buildings',id:'ugol'},{kind:'buildings',id:'hkee',tag:'T2'},{kind:'buildings',id:'hcas',tag:'T3'}])assert.equal(timeline.important(event),true,event.id);
 for(const event of [{kind:'units',id:'hfoo'},{kind:'buildings',id:'hbar'},{kind:'upgrades',id:'Rhar'},{kind:'items',id:'phea'}])assert.equal(timeline.important(event),false,event.id);
});

test('crowded events overlap in one compact row while preserving their exact times',()=>{
 const events=[{id:'last',ms:120000},{id:'a',ms:0},{id:'b',ms:0},{id:'c',ms:100},{id:'d',ms:1000},{id:'e',ms:60000}];
 for(const width of [240,700,2000]){
  const placed=timeline.layout(events,120000,width);
  assert.equal(placed.events.length,events.length);
  for(const marker of placed.events){
   assert.equal(marker.x,timeline.position(marker.event.ms,120000,width));
   assert(marker.x-18.2>=0);assert(marker.x+18.2<=width);assert.equal(marker.lane,0);
  }
  assert.equal(placed.events.find(marker=>marker.event.id==='a').x,placed.events.find(marker=>marker.event.id==='b').x);
  assert(placed.events.find(marker=>marker.event.id==='c').x-placed.events.find(marker=>marker.event.id==='a').x<36.4);
  assert.equal(placed.height,56);
 }
 assert.equal(events[0].id,'last');
});

test('shared time domain includes late orders and stays valid for missing duration and empty players',()=>{
 const data={duration:60000,players:[{units:{order:[{id:'hfoo',ms:120000},{id:'bad',ms:-1},{id:'bad',ms:NaN}]}},{items:{order:[{id:'bad',ms:Infinity}]}}]};
 const rows=timeline.tracks(data);assert.equal(rows[0].events.length,1);assert.equal(rows[1].events.length,0);
 assert.equal(timeline.duration(data,rows),120000);
 assert.equal(timeline.duration({},timeline.tracks({})),1000);
 assert.deepEqual(timeline.tracks({}),[]);
});

test('separate purchase icons spread symmetrically only when they overlap by more than half',()=>{
 const simultaneous=[{id:'phea',ms:60000},{id:'phea',ms:60000}],center=timeline.position(60000,120000,700);
 const spread=timeline.layout(simultaneous,120000,700,{spreadPurchases:true});
 assert(Math.abs((spread.events[0].x+spread.events[1].x)/2-center)<1e-8);
 assert(spread.events[0].x<center);assert(spread.events[1].x>center);
 assert(spread.events[1].x-spread.events[0].x>=18.2-1e-8);
 assert.deepEqual(timeline.layout(simultaneous,120000,700).events.map(marker=>marker.x),[center,center]);
 const sparse=[{id:'phea',ms:10000},{id:'pman',ms:60000},{id:'phea',ms:100000}];
 for(const marker of timeline.layout(sparse,120000,700,{spreadPurchases:true}).events)assert(Math.abs(marker.x-timeline.position(marker.event.ms,120000,700))<1e-8);
 assert.deepEqual(simultaneous.map(event=>event.ms),[60000,60000]);
});

test('purchase spacing stays inside the track at either end and accommodates dense narrow tracks',()=>{
 for(const ms of [0,60000,120000])for(const count of [2,6,100]){
  const events=Array.from({length:count},(_,index)=>({id:'item'+index,ms}));
  const placed=timeline.layout(events,120000,240,{spreadPurchases:true});assert.equal(placed.events.length,count);
  for(const marker of placed.events){assert(marker.x-18.2>=0);assert(marker.x+18.2<=240);assert(9.8+marker.lane*44.4+36.4<=placed.height+1e-8);}
  const lanes=new Set(placed.events.map(marker=>marker.lane));
  for(const lane of lanes){const markers=placed.events.filter(marker=>marker.lane===lane);for(let i=1;i<markers.length;i++)assert(markers[i].x-markers[i-1].x>=18.2-1e-8);}
 }
 assert.equal(timeline.layout([],120000,240,{spreadPurchases:true}).height,56);
});

test('axis ticks include the start and end, with readable spacing across zoom and long games',()=>{
 for(const end of [1000,59000,960000,7200000,86400000])for(const width of [240,800,4000]){
  const marks=timeline.ticks(end,width);assert.equal(marks[0],0);assert.equal(marks.at(-1),end);
  assert(marks.length<60);
  for(let i=1;i<marks.length;i++){assert(marks[i]>marks[i-1]);assert(marks[i]<=end);}
 }
});
