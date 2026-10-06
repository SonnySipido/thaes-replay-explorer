'use strict';
const fs=require('node:fs/promises');
const zlib=require('node:zlib');
const {promisify}=require('node:util');
const inflate=promisify(zlib.inflate);
// The start of a replay: who hosted the game and each player's Battle.net ladder MMR.
//  - host: the game settings name the program that hosted the game: "FLO" for W3Champions (its game
//    servers), "Battle.net" for Battle.net games, a player name for custom/LAN games and older replays
//  - MMR: patch 3.0 ladder replays store it as field 7 (a double) of each Reforged player record; 0 means
//    no rating for that game mode and is left out. W3Champions replays carry no MMR at all.
async function readReplayStart(buffer){
 const start=buffer.indexOf('Warcraft III recorded game');
 if(start<0)return parseStart(Buffer.alloc(0));
 const headerSize=buffer.readUInt32LE(start+28),count=buffer.readUInt32LE(start+44),build=buffer.readUInt16LE(start+56);
 const size=build>=6089?12:8;
 // the player records sit in the first block or two
 const parts=[];let offset=start+headerSize,bytes=0;
 for(let i=0;i<count&&bytes<65536;i++){
  if(offset+size>buffer.length)break;
  const compressed=buffer.readUInt16LE(offset);
  if(offset+size+compressed>buffer.length)break;
  parts.push(await inflate(buffer.subarray(offset+size,offset+size+compressed),{finishFlush:zlib.constants.Z_SYNC_FLUSH}));
  bytes+=parts.at(-1).length;offset+=size+compressed;
 }
 return parseStart(Buffer.concat(parts));
}
// only the first part of the file is needed
async function readReplayStartFromFile(file,length=131072){
 const handle=await fs.open(file,'r');
 try{const buffer=Buffer.alloc(length);const {bytesRead}=await handle.read(buffer,0,length,0);return readReplayStart(buffer.subarray(0,bytesRead));}
 finally{await handle.close();}
}
function parseStart(data){
 const out={mmr:new Map(),creator:null,gameName:null};
 let o=0;
 const zstring=()=>{const begin=o,end=data.indexOf(0,o);if(end<0)throw Error('truncated');o=end+1;return data.subarray(begin,end);};
 const record=()=>{o++;zstring();o+=1+data[o];};  // player id, name, extra data (length-prefixed)
 try{
  o=5;record();                                  // header, then the host's player record
  out.gameName=zstring().toString('utf8');zstring();
  const settings=decodeSettings(zstring());o+=12;  // encoded game settings, then counts
  let s=13;const text=()=>{const end=settings.indexOf(0,s),value=settings.subarray(s,end).toString('utf8');s=end+1;return value;};
  text();out.creator=text();                      // map path, then the hosting program / player
  while(data[o]===0x16){o++;record();o+=4;}     // the other player records
  while(data[o]===0x38||data[o]===0x39){
   const subtype=data[o+1],length=data.readUInt32LE(o+2),blob=data.subarray(o+6,o+6+length);
   if(subtype===3)for(const p of decodePlayers(blob))if(p.id!==undefined&&p.mmr>0)out.mmr.set(p.id,Math.round(p.mmr));
   o+=6+length;
  }
 }catch{}
 return out;
}
// game settings are stored with every byte that would be 0 bumped up, plus a mask byte per 7 bytes
function decodeSettings(encoded){
 const out=[];let mask=0;
 for(let i=0;i<encoded.length;i++){
  if(i%8===0)mask=encoded[i];
  else out.push(mask&(1<<(i%8))?encoded[i]:encoded[i]-1);
 }
 return Buffer.from(out);
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
// The whole replay: who saved it (the first player record) and every leave record {playerId, result,
// reason}, for replays analysed before the winner of team games was worked out.
async function readLeaves(buffer){
 const start=buffer.indexOf('Warcraft III recorded game');
 if(start<0)return {recorderId:null,leaves:[]};
 const headerSize=buffer.readUInt32LE(start+28),count=buffer.readUInt32LE(start+44),build=buffer.readUInt16LE(start+56);
 const size=build>=6089?12:8,parts=[];let offset=start+headerSize;
 for(let i=0;i<count&&offset+size<=buffer.length;i++){
  const compressed=buffer.readUInt16LE(offset);
  parts.push(await inflate(buffer.subarray(offset+size,offset+size+compressed),{finishFlush:zlib.constants.Z_SYNC_FLUSH}));
  offset+=size+compressed;
 }
 const data=Buffer.concat(parts),leaves=[];
 let o=0;
 try{
  // skip the start (as in parseStart) up to the game start record (0x19), then walk the game data
  const zstring=()=>{const end=data.indexOf(0,o);if(end<0)throw Error('truncated');o=end+1;};
  const record=()=>{o++;zstring();o+=1+data[o];};
  o=5;record();zstring();zstring();zstring();o+=12;
  while(data[o]===0x16){o++;record();o+=4;}
  while(data[o]===0x38||data[o]===0x39)o+=6+data.readUInt32LE(o+2);
  if(data[o]!==0x19)return {recorderId:data[5],leaves};
  o+=3+data.readUInt16LE(o+1);
  while(o<data.length){
   const id=data[o];
   if(id===0x1e||id===0x1f)o+=3+data.readUInt16LE(o+1);
   else if(id===0x17){leaves.push({reason:data.readUInt32LE(o+1),playerId:data[o+5],result:data.readUInt32LE(o+6)});o+=14;}
   else if(id===0x1a||id===0x1b||id===0x1c)o+=5;
   else if(id===0x20)o+=4+data.readUInt16LE(o+2);
   else if(id===0x22)o+=2+data[o+1];
   else if(id===0x23)o+=11;
   else if(id===0x2f)o+=9;
   else break;  // 0 = end of the game data (padding)
  }
 }catch{}
 return {recorderId:data[5],leaves};
}
// where a game was played: 'w3c' (W3Champions), 'bnet' (Battle.net) or null (custom, LAN, older replays)
function gameSource(creator){return creator==='FLO'?'w3c':creator==='Battle.net'?'bnet':null;}
module.exports={readReplayStart,readReplayStartFromFile,parseStart,gameSource,readLeaves};
