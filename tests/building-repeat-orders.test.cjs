const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../ui/app.js'),'utf8');
const fn=source.slice(source.indexOf('function buildingsAndUpgrades('),source.indexOf('function items('));
function render(order){
 const ctx={objectIcon:id=>'<i>'+id+'</i>',time:String,table:(headers,body)=>body,pagedTable:()=>{}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 const root={innerHTML:'',querySelector:()=>({})};
 ctx.buildingsAndUpgrades({buildings:{order},upgrades:{order:[]}},root);
 return [...root.innerHTML.matchAll(/<tr>(.*?)<\/tr>/g)].map(m=>m[1]);
}
test('Rapid singleton building clicks collapse to the earliest timestamp',()=>{
 for(const id of ['halt','oalt','eate','uaod','hbla','hlum','ofor','edob','ugrv','usap','hvlt','ovln','eden','utom','htow','ogre','etol','unpl','ugol','ostr']){
  const rows=render([{id,ms:12000},{id,ms:10000},{id,ms:13000}]);
  assert.equal(rows.length,1,id);assert.ok(rows[0].includes('>10000</td>'),id);
 }
});
test('Supply, production, defense and unknown buildings retain rapid repeat orders',()=>{
 for(const id of ['otrb','orbr','hhou','emow','uzig','obea','obar','osld','otto','hbar','harm','hars','hgra','eaom','eaoe','eaow','edos','usep','utod','uslh','ubon','owtw','hwtw','etrp','uzg1','custom']){
  assert.equal(render([{id,ms:10000},{id,ms:11000}]).length,2,id);
 }
});
test('Window is bounded by first retained order and later builds remain visible',()=>{
 const orders=[{id:'oalt',ms:14500},{id:'oalt',ms:10000},{id:'ofor',ms:11000},{id:'oalt',ms:12000},{id:'ofor',ms:12000},{id:'oalt',ms:50000}];
 const before=JSON.stringify(orders),rows=render(orders);
 assert.equal(rows.length,4);assert.ok(rows[0].includes('>10000</td>'));assert.ok(rows[1].includes('ofor'));assert.ok(rows[2].includes('>14500</td>'));assert.ok(rows[3].includes('>50000</td>'));
 assert.equal(JSON.stringify(orders),before);
 assert.equal(render([{id:'ofor',ms:0},{id:'ofor',ms:3001}]).length,2);
 assert.equal(render([]).length,0);
});
test('Repeat filtering is independent for each player and preserves FE and tier badges',()=>{
 const orders=[{id:'ogre',ms:100000},{id:'ogre',ms:101000},{id:'ostr',ms:200000},{id:'ostr',ms:201000}];
 for(let i=0;i<2;i++){
  const rows=render(orders);assert.equal(rows.length,2);assert.ok(rows[0].includes('>FE</span>'));assert.ok(rows[1].includes('>T2</span>'));
 }
});
