'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {playerMmr}=require('../ladder-mmr.cjs');
// protobuf pieces: key byte, then a varint / length-prefixed bytes / 8-byte double
const varint=(field,v)=>Buffer.from([field<<3,v]);
const text=(field,s)=>Buffer.concat([Buffer.from([field<<3|2,Buffer.byteLength(s)]),Buffer.from(s)]);
const double=(field,v)=>{const b=Buffer.alloc(9);b[0]=field<<3|1;b.writeDoubleLE(v,1);return b;};
const nested=(field,msg)=>Buffer.concat([Buffer.from([field<<3|2,msg.length]),msg]);
function block(subtype,blob){const head=Buffer.alloc(6);head[0]=0x38;head[1]=subtype;head.writeUInt32LE(blob.length,2);return Buffer.concat([head,blob]);}
// replay start: header, host record, game name, private string, settings, counts, other players, metadata
function replayStart(...blocks){
 return Buffer.concat([Buffer.alloc(4),Buffer.from([0,1]),Buffer.from('Host#1\0'),Buffer.from([0]),Buffer.from('BNet\0\0settings\0'),Buffer.alloc(12),
  Buffer.from([0x16,2]),Buffer.from('Other#2\0'),Buffer.from([0]),Buffer.alloc(4),...blocks,Buffer.from([0x19])]);
}
test('patch 3.0 ladder replays: every player record of the block, unrated players left out',()=>{
 const players=Buffer.concat([
  nested(1,Buffer.concat([varint(1,1),text(2,'Host#1'),double(7,5610)])),
  nested(1,Buffer.concat([varint(1,2),text(2,'Other#2'),double(7,0)])),
 ]);
 assert.deepEqual([...playerMmr(replayStart(block(3,players)))],[[1,5610]]);
});
test('W3Champions replays (one record per block, no rating) have no MMR',()=>{
 const data=replayStart(block(3,Buffer.concat([varint(1,1),text(2,'Host#1'),text(4,'p042')])),block(3,Buffer.concat([varint(1,2),text(2,'Other#2')])));
 assert.equal(playerMmr(data).size,0);
});
test('damaged data gives no MMR instead of an error',()=>{assert.equal(playerMmr(Buffer.from([1,2,3])).size,0);});
