'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),apm=require('../ui/apm.js');
test('shared APM series keep original player identities and colors when ordered by team',()=>{
 const data={duration:180000,players:[{name:'Orc',teamid:1,apmBuckets:[300,400,250]},{name:'Human',teamid:0,apmBuckets:[100,220]}]},before=JSON.stringify(data),rows=apm.series(data);
 assert.deepEqual(rows.map(row=>[row.player.name,row.index]),[['Human',1],['Orc',0]]);assert.deepEqual(apm.domain(data,rows),{maximum:400,count:3,duration:180000});assert.equal(JSON.stringify(data),before);
});
test('missing and invalid APM buckets have a finite shared scale without inventing actions',()=>{
 const rows=apm.series({players:[{apmBuckets:[NaN,-2,Infinity,0,120]},{apmBuckets:[80]},{name:'No actions'}]});assert.deepEqual(rows[0].values,[0,0,0,0,120]);assert.deepEqual(rows[2].values,[]);
 assert.deepEqual(apm.domain({},rows),{maximum:120,count:5,duration:300000});assert.deepEqual(apm.domain({duration:NaN},[]),{maximum:1,count:1,duration:60000});
});
test('hover follows the visible line nearest the pointer and reads exact samples or interpolated positions',()=>{
 const rows=apm.series({players:[{name:'Blue',apmBuckets:[100,300,200]},{name:'Red',apmBuckets:[300,100,200]}]}),scale={maximum:400,count:3,duration:120000},plot={left:40,right:240,top:10,bottom:210,step:100};
 const exact=apm.hover(rows,new Set([0,1]),scale,plot,40,160);assert.equal(exact.row.player.name,'Blue');assert.equal(exact.value,100);assert.equal(exact.ms,0);
 const between=apm.hover(rows,new Set([0,1]),scale,plot,65,135);assert.equal(between.row.player.name,'Blue');assert.equal(between.value,150);assert.equal(between.ms,15000);
 assert.equal(apm.hover(rows,new Set([1]),scale,plot,40,160),null);assert.equal(apm.hover(rows,new Set(),scale,plot,40,160),null);assert.equal(apm.hover(rows,new Set([0,1]),scale,plot,140,10),null);
 assert.equal(apm.valueAt([100],1),null);assert.equal(apm.valueAt([],0),null);assert.equal(apm.valueAt([100,300],.5),200);
});
