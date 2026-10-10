const test=require('node:test'),assert=require('node:assert/strict');
const {build}=require('../ui/replay-tree.js');
const row=(file,key=file)=>({file,key});
test('keyboard order follows expanded folders then direct replays, including rows beyond the render batch',()=>{
 const {visibleReplays}=require('../ui/replay-tree.js');
 const rows=[row('C:/Replays/root.w3g'),row('C:/Replays/Z/last.w3g'),row('C:/Replays/A/first.w3g'),...Array.from({length:105},(_,i)=>row('C:/Replays/A/'+i+'.w3g'))];
 const tree=build([{path:'C:/Replays'}],rows);
 assert.deepEqual(visibleReplays(tree,new Set()),[]);
 assert.deepEqual(visibleReplays(tree,new Set(['c:/replays'])),[rows[0]]);
 const visible=visibleReplays(tree,new Set(['c:/replays','c:/replays/a','c:/replays/z']));
 assert.equal(visible.length,108);assert.equal(visible[0],rows[2]);assert.equal(visible.at(-2),rows[1]);assert.equal(visible.at(-1),rows[0]);
});
test('separate roots contain direct replays, nested folders and empty folders',()=>{
 const a=row('C:\\Replays\\one.w3g'),b=row('C:\\Replays\\Season\\Finals\\two.w3g'),c=row('D:\\Games\\three.w3g');
 const tree=build([{path:'C:\\Replays'},{path:'D:\\Games'}],[a,b,c],['C:\\Replays\\Empty']);
 assert.equal(tree.length,2);assert.deepEqual(tree[0].replays,[a]);assert.deepEqual(tree[1].replays,[c]);
 assert.deepEqual(tree[0].children.get('season').children.get('finals').replays,[b]);assert.ok(tree[0].children.has('empty'));
});
test('overlapping roots own each replay once, match case-insensitively and enforce boundaries',()=>{
 const nested=row('c:/REPLAYS/Season/a.w3g');
 const tree=build([{path:'C:/Replays/'},{path:'C:/Replays/Season'}],[nested,row('C:/ReplaysElsewhere/no.w3g')],['C:/Replays/Season']);
 assert.equal(tree[0].children.size,0);assert.deepEqual(tree[1].replays,[nested]);
});
test('disabled locations and excluded subfolders stay out; drive and UNC roots work',()=>{
 const tree=build([{path:'C:\\',includeSubfolders:false},{path:'D:/Disabled',enabled:false},{path:'\\\\server\\share'}],[row('C:/direct.w3g'),row('C:/child/hidden.w3g'),row('D:/Disabled/no.w3g'),row('\\\\server\\share\\child\\yes.w3g')],['C:/child']);
 assert.equal(tree.length,2);assert.equal(tree[0].replays.length,1);assert.equal(tree[0].children.size,0);assert.equal(tree[1].children.get('child').replays.length,1);
});
