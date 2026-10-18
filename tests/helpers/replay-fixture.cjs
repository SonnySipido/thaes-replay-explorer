'use strict';
const zlib=require('node:zlib');
const order=id=>Buffer.concat([Buffer.from([0x10,0,0]),Buffer.from(id).reverse(),Buffer.alloc(8,255)]);
const train=order('hpea');
function encode(raw){const out=[];for(let i=0;i<raw.length;i+=7){const chunk=[...raw.subarray(i,i+7)];let mask=1;chunk.forEach((b,j)=>{if(b)mask|=1<<(j+1)});out.push(mask,...chunk.map(b=>b||1))}return Buffer.from([...out,0])}
function timeslot(increment,commands=[],id=0x1f){
 const blocks=commands.map(([pid,bytes])=>{const head=Buffer.alloc(3);head[0]=pid;head.writeUInt16LE(bytes.length,1);return Buffer.concat([head,bytes]);});
 const payload=Buffer.concat(blocks),head=Buffer.alloc(5);head[0]=id;head.writeUInt16LE(payload.length+2,1);head.writeUInt16LE(increment,3);return Buffer.concat([head,payload]);
}
function leave(playerId,result,reason=1){const b=Buffer.alloc(14);b[0]=0x17;b.writeUInt32LE(reason,1);b[5]=playerId;b.writeUInt32LE(result,6);return b;}
function fixture(actions=train,{version=23,build=6058,leaves=[],records=null,duration=1000,map='Maps/Echo_Isles.w3x',creator='FLO'}={}){
 const settings=encode(Buffer.concat([Buffer.alloc(13),Buffer.from(map+'\0'+creator+'\0'),Buffer.alloc(21)])),counts=Buffer.alloc(12);counts.writeUInt32LE(2);
 const slots=Buffer.from([0x19,25,0,2,1,100,2,0,0,0,1,1,100,2,100,2,0,1,1,2,1,100,1,0,0,0,0,2]);
 const metadata=Buffer.concat([Buffer.alloc(5),Buffer.from([1]),Buffer.from('Alice\0'),Buffer.from([0]),Buffer.from('Fixture\0\0'),settings,counts,Buffer.from([0x16,2]),Buffer.from('Bob\0'),Buffer.alloc(5),slots]);
 const content=Buffer.concat([metadata,...(records||[timeslot(1000,[[1,actions]])]),...leaves.map(args=>leave(...args))]);
 const raw=Buffer.alloc(Math.ceil(content.length/8192)*8192);content.copy(raw);
 const compressed=zlib.deflateSync(raw),block=Buffer.alloc(build>=6089?12:8);block.writeUInt16LE(compressed.length);block.writeUInt16LE(raw.length,build>=6089?4:2);
 const header=Buffer.alloc(68);header.write('Warcraft III recorded game\x1a');header.writeUInt32LE(68,28);header.writeUInt32LE(68+block.length+compressed.length,32);header.writeUInt32LE(1,36);header.writeUInt32LE(raw.length,40);header.writeUInt32LE(1,44);header.write('PX3W',48);header.writeUInt32LE(version,52);header.writeUInt16LE(build,56);header.writeUInt32LE(duration,60);
 return Buffer.concat([header,block,compressed]);
}
module.exports={fixture,train,order,timeslot,leave};
