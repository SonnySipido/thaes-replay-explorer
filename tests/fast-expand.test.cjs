const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../ui/app.js'),'utf8');
const fn=source.slice(source.indexOf('function buildingsAndUpgrades('),source.indexOf('function items('));
function render(order){
 const ctx={name:id=>id,esc:String,objectIcon:id=>'<i>'+id+'</i>',time:String,table:(headers,body)=>body,pagedTable:()=>{}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 const root={innerHTML:'',querySelector:()=>({})};
 ctx.buildingsAndUpgrades({buildings:{order},upgrades:{order:[]}},root);
 return root.innerHTML;
}
const count=html=>(html.match(/>FE<\/span>/g)||[]).length;
test('FE tags each race expansion before six minutes and before its first T2',()=>{
 for(const [id,t2] of [['htow','hkee'],['ogre','ostr'],['etol','etoa'],['unpl','unp1'],['ugol','unp1']]){
  const html=render([{id:t2,ms:280000},{id,ms:120000}]);
  assert.equal(count(html),1,id);assert.ok(html.includes('building-fast-expand'));assert.ok(html.includes('>T2</span>'));
 }
});
test('FE excludes six minute boundary, simultaneous T2, later construction and other buildings',()=>{
 for(const order of [
  [{id:'htow',ms:360000}], [{id:'htow',ms:360001}],
  [{id:'hkee',ms:120000},{id:'htow',ms:120000}],
  [{id:'hkee',ms:120000},{id:'htow',ms:150000},{id:'hkee',ms:200000}],
  [{id:'uzig',ms:100000}], [{id:'ugrv',ms:100000}]
 ])assert.equal(count(render(order)),0);
});
test('FE supports no T2, repeated expansions and independent player timelines',()=>{
 assert.equal(count(render([{id:'htow',ms:359999}])),1);
 const orders=[{id:'ogre',ms:180000},{id:'ogre',ms:60000}];
 assert.equal(count(render(orders)),2);assert.equal(orders[0].ms,180000);
 assert.equal(count(render([{id:'ostr',ms:50000},{id:'ogre',ms:60000}])),0);
 assert.equal(count(render([{id:'ogre',ms:60000}])),1);
 assert.equal(count(render([])),0);
});

test('FE includes the sixth minute only before T2 begins',()=>{
 assert.equal(count(render([{id:'htow',ms:330000},{id:'hkee',ms:350000}])),1);
 assert.equal(count(render([{id:'htow',ms:330000},{id:'hkee',ms:320000}])),0);
});
