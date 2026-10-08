'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),build=require('../ui/build-order.js');
test('build orders combine units, heroes and buildings chronologically within five minutes',()=>{
 const player={heroes:[{id:'Obla'}],units:{order:[{id:'ogru',ms:110000},{id:'opeo',ms:0},{id:'Obla',ms:50000},{id:'ogru',ms:300001}]},heroOrders:[{id:'Obla',ms:50000},{id:'Nbst',ms:290000}],buildings:{order:[{id:'oalt',ms:10000},{id:'obar',ms:300000}]},upgrades:{order:[{id:'upgrade',ms:10}]},cancellations:[{id:'opeo',ms:20}]};
 const rows=build.orders(player);assert.deepEqual(rows.map(r=>r.ms),[0,10000,50000,110000,290000,300000]);assert.equal(rows.filter(r=>r.id==='Obla').length,1);assert.equal(rows.find(r=>r.id==='Nbst').kind,'heroes');assert.equal(rows.find(r=>r.id==='ogru').kind,'units');
});
test('build orders suppress rapid singleton building clicks but retain repeated production and training',()=>{
 const p={units:{order:[{id:'opeo',ms:0},{id:'opeo',ms:0}]},buildings:{order:[{id:'oalt',ms:1000},{id:'oalt',ms:2000},{id:'oalt',ms:5000},{id:'obar',ms:6000},{id:'obar',ms:6500}]}};
 assert.equal(build.orders(p).length,6);assert.equal(build.orders(p).filter(r=>r.id==='oalt').length,2);
});
test('exports contain every player in team order, padded timestamps, and readable object names',()=>{
 const data={names:{opeo:'Peon'},players:[{name:'Right',teamid:1,units:{order:[{id:'opeo',ms:65000}]}},{name:'Left',teamid:0,units:{order:[{id:'opeo',ms:42000}]}}]};const text=build.text(data,'Echo Isles');assert.ok(text.includes('00:42  Peon'));assert.ok(text.includes('01:05  Peon'));assert.ok(text.indexOf('Left')<text.indexOf('Right'));assert.ok(text.includes('Echo Isles'));assert.equal(build.orders({}).length,0);
});

test('rapid repeated hero clicks collapse while later hero orders remain',()=>{
 const rows=build.orders({heroOrders:[{id:'Hamg',ms:69026},{id:'Hamg',ms:69066},{id:'Hamg',ms:150000}]});assert.deepEqual(rows.map(r=>r.ms),[69026,150000]);
});
