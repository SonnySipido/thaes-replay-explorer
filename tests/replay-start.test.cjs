'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseStart,gameSource}=require('../replay-start.cjs');
// protobuf pieces: key byte, then a varint / length-prefixed bytes / 8-byte double
const varint=(field,v)=>Buffer.from([field<<3,v]);
const text=(field,s)=>Buffer.concat([Buffer.from([field<<3|2,Buffer.byteLength(s)]),Buffer.from(s)]);
const double=(field,v)=>{const b=Buffer.alloc(9);b[0]=field<<3|1;b.writeDoubleLE(v,1);return b;};
const nested=(field,msg)=>Buffer.concat([Buffer.from([field<<3|2,msg.length]),msg]);
function block(subtype,blob){const head=Buffer.alloc(6);head[0]=0x38;head[1]=subtype;head.writeUInt32LE(blob.length,2);return Buffer.concat([head,blob]);}
// game settings encoding: a mask byte per 7 bytes; bytes whose mask bit is clear are stored plus one
function encodeSettings(raw){
 const out=[];
 for(let i=0;i<raw.length;i+=7){
  const chunk=[...raw.subarray(i,i+7)];let mask=1;
  chunk.forEach((b,j)=>{if(b!==0)mask|=1<<(j+1);});
  out.push(mask,...chunk.map(b=>b===0?1:b));
 }
 return Buffer.concat([Buffer.from(out),Buffer.from([0])]);
}
// replay start: header, host record, game name, private string, settings, counts, other players, metadata
function replayStart(gameName,creator,...blocks){
 const settings=encodeSettings(Buffer.concat([Buffer.alloc(13,7),Buffer.from('Maps/Example.w3x\0'+creator+'\0')]));
 return Buffer.concat([Buffer.alloc(4),Buffer.from([0,1]),Buffer.from('Host#1\0'),Buffer.from([0]),Buffer.from(gameName+'\0\0'),settings,Buffer.alloc(12),
  Buffer.from([0x16,2]),Buffer.from('Other#2\0'),Buffer.from([0]),Buffer.alloc(4),...blocks,Buffer.from([0x19])]);
}
test('patch 3.0 ladder replays: Battle.net host and every rated player in the block',()=>{
 const players=Buffer.concat([
  nested(1,Buffer.concat([varint(1,1),text(2,'Host#1'),double(7,5610)])),
  nested(1,Buffer.concat([varint(1,2),text(2,'Other#2'),double(7,0)])),
 ]);
 const start=parseStart(replayStart('BNet','Battle.net',block(3,players)));
 assert.equal(start.gameName,'BNet');assert.equal(gameSource(start.creator),'bnet');
 assert.deepEqual([...start.mmr],[[1,5610]]);
});
test('W3Champions replays: hosted by FLO, one record per block and no MMR',()=>{
 const start=parseStart(replayStart('w3c-20-AbCdEfGhIj','FLO',block(3,Buffer.concat([varint(1,1),text(2,'Host#1'),text(4,'p042')])),block(3,Buffer.concat([varint(1,2),text(2,'Other#2')]))));
 assert.equal(gameSource(start.creator),'w3c');assert.equal(start.mmr.size,0);
});
test('custom and older games have no source; damaged data gives nothing instead of an error',()=>{
 assert.equal(gameSource(parseStart(replayStart('my game','Host#1')).creator),null);
 const broken=parseStart(Buffer.from([1,2,3]));assert.equal(broken.creator,null);assert.equal(broken.mmr.size,0);
});
