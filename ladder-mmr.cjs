'use strict';
const zlib=require('node:zlib');
const {promisify}=require('node:util');
const inflate=promisify(zlib.inflate);
// Battle.net ladder MMR per player id, from the Reforged player records at the start of a replay.
// Patch 3.0 ladder replays store it as field 7 (a double) of each player record; 0 means no rating for
// that game mode and is left out. W3Champions replays (hosted by FLO) carry no MMR at all.
async function readLadderMmr(buffer){
 const start=buffer.indexOf('Warcraft III recorded game');
 if(start<0)return new Map();
 const headerSize=buffer.readUInt32LE(start+28),count=buffer.readUInt32LE(start+44),build=buffer.readUInt16LE(start+56);
 const size=build>=6089?12:8;
 // the player records sit in the first block or two
 const parts=[];let offset=start+headerSize,bytes=0;
 for(let i=0;i<count&&bytes<65536;i++){
  const compressed=buffer.readUInt16LE(offset);
  parts.push(await inflate(buffer.subarray(offset+size,offset+size+compressed),{finishFlush:zlib.constants.Z_SYNC_FLUSH}));
  bytes+=parts.at(-1).length;offset+=size+compressed;
 }
 return playerMmr(Buffer.concat(parts));
}
function playerMmr(data){
 const mmr=new Map();
 let o=0;
 const zstring=()=>{const end=data.indexOf(0,o);if(end<0)throw Error('truncated');o=end+1;};
 const record=()=>{o++;zstring();o+=1+data[o];};  // player id, name, extra data (length-prefixed)
 try{
  o=5;record();                                  // header, then the host's player record
  zstring();zstring();zstring();o+=12;          // game name, private string, game settings, counts
  while(data[o]===0x16){o++;record();o+=4;}     // the other player records
  while(data[o]===0x38||data[o]===0x39){
   const subtype=data[o+1],length=data.readUInt32LE(o+2),blob=data.subarray(o+6,o+6+length);
   if(subtype===3)for(const p of decodePlayers(blob))if(p.id!==undefined&&p.mmr>0)mmr.set(p.id,Math.round(p.mmr));
   o+=6+length;
  }
 }catch{}
 return mmr;
}
// A player record: 1 player id, 2 battle tag, 4 portrait, 6 race, 7 MMR (double), ... Patch 3.0
// replays put all players in one block, each as a field 1 sub-record; older ones write one per block.
function decodePlayers(blob){
 const p={},players=[];let i=0;
 const varint=()=>{let v=0,s=0,c;do{c=blob[i++];v+=(c&0x7f)*2**s;s+=7;}while(c&0x80&&i<blob.length);return v;};
 while(i<blob.length){
  const key=varint(),field=Math.floor(key/8),wire=key&7;
  if(wire===0){const v=varint();if(field===1)p.id=v;}
  else if(wire===1){if(field===7)p.mmr=blob.readDoubleLE(i);i+=8;}
  else if(wire===2){const n=varint();if(field===1)players.push(...decodePlayers(blob.subarray(i,i+n)));i+=n;}
  else if(wire===5)i+=4;
  else break;
 }
 return players.length?players:[p];
}
module.exports={readLadderMmr,playerMmr};
