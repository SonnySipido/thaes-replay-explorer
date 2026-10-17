'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const {ActionParser}=require('w3gjs');
const {parseReplay,configureCompatibleActions,PARSER_REVISION}=require('../parser.cjs');
const train=Buffer.concat([Buffer.from([0x10,0,0]),Buffer.from('aeph'),Buffer.alloc(8,255)]);
function encode(raw){const out=[];for(let i=0;i<raw.length;i+=7){const chunk=[...raw.subarray(i,i+7)];let mask=1;chunk.forEach((b,j)=>{if(b)mask|=1<<(j+1)});out.push(mask,...chunk.map(b=>b||1))}return Buffer.from([...out,0])}
function fixture(actions,{version=23,build=6058}={}){
 const settings=encode(Buffer.concat([Buffer.alloc(13),Buffer.from('Maps/Echo_Isles.w3x\0FLO\0'),Buffer.alloc(21)])),counts=Buffer.alloc(12);counts.writeUInt32LE(2);
 const slots=Buffer.from([0x19,25,0,2,1,100,2,0,0,0,1,1,100,2,100,2,0,1,1,2,1,100,1,0,0,0,0,2]);
 const time=Buffer.alloc(8);time[0]=0x1f;time.writeUInt16LE(5+actions.length,1);time.writeUInt16LE(1000,3);time[5]=1;time.writeUInt16LE(actions.length,6);
 const metadata=Buffer.concat([Buffer.alloc(5),Buffer.from([1]),Buffer.from('Alice\0'),Buffer.from([0]),Buffer.from('Fixture\0\0'),settings,counts,Buffer.from([0x16,2]),Buffer.from('Bob\0'),Buffer.alloc(5),slots]);
 const raw=Buffer.alloc(8192);Buffer.concat([metadata,time,actions]).copy(raw);const compressed=zlib.deflateSync(raw),block=Buffer.alloc(build>=6089?12:8);block.writeUInt16LE(compressed.length);block.writeUInt16LE(raw.length,build>=6089?4:2);
 const header=Buffer.alloc(68);header.write('Warcraft III recorded game\x1a');header.writeUInt32LE(68,28);header.writeUInt32LE(68+block.length+compressed.length,32);header.writeUInt32LE(1,36);header.writeUInt32LE(8192,40);header.writeUInt32LE(1,44);header.write('PX3W',48);header.writeUInt32LE(version,52);header.writeUInt16LE(build,56);header.writeUInt32LE(1000,60);
 return Buffer.concat([header,block,compressed]);
}
test('old pause and save commands keep following unit orders readable',async()=>{
 const data=await parseReplay(fixture(Buffer.concat([Buffer.from([1,6]),Buffer.from('saved.w3z\0'),train])));
 assert.equal(data.parserCompatibility,PARSER_REVISION);assert.equal(data.players[0].name,'Alice');assert.equal(data.duration,1000);assert.equal(data.players[0].units.summary.hpea,1);assert.equal(data.players[0].units.order[0].ms,1000);
});
test('Reforged command-card records do not swallow following production orders',async()=>{
 const data=await parseReplay(fixture(Buffer.concat([Buffer.from([0x7a]),Buffer.alloc(16),train]),{version:10100,build:6115}));
 assert.equal(data.parserCompatibility,PARSER_REVISION);assert.equal(data.players[0].units.summary.hpea,1);
});
test('normal successful replays retain the existing parser path',async()=>{
 const data=await parseReplay(fixture(train));assert.equal(data.parserCompatibility,undefined);assert.equal(data.players[0].units.summary.hpea,1);
});
test('compatibility retains sync commands and action boundaries in both Reforged layouts',()=>{
 const parser=new ActionParser();configureCompatibleActions({gameDataParser:{actionParser:parser}},{version:10100,build:6117});
 const sync=Buffer.concat([Buffer.from([0x77]),Buffer.from('S\0null\0'),Buffer.alloc(4)]),frame=Buffer.concat([Buffer.from([0x78]),Buffer.alloc(16),Buffer.from([0])]);
 const actions=parser.parse(Buffer.concat([sync,frame,train]),true);assert.deepEqual(actions.map(a=>a.id),[0x78,0x79,0x10]);assert.equal(actions[0].identifier,'S');assert.equal(actions[0].value,'null');
 const old=new ActionParser();configureCompatibleActions({gameDataParser:{actionParser:old}},{version:10036,build:6115});assert.deepEqual(old.parse(Buffer.concat([Buffer.from([0x78]),sync.subarray(1),train]),true).map(a=>a.id),[0x78,0x10]);
 const early=new ActionParser();configureCompatibleActions({gameDataParser:{actionParser:early}},{version:10100,build:6115,shiftActions:false});assert.deepEqual(early.parse(Buffer.concat([Buffer.from([0x78]),sync.subarray(1),train]),false).map(a=>a.id),[0x78,0x10]);
});
test('retail pause and save layouts remain intact, including adjacent actions',()=>{
 const parser=new ActionParser();configureCompatibleActions({gameDataParser:{actionParser:parser}},{version:10200,build:7000});
 const input=Buffer.concat([Buffer.from([1,6]),Buffer.from('saved.w3z\0name\0'),Buffer.from([0]),train]);assert.deepEqual(parser.parse(input,false).map(a=>a.id),[0x10]);
});
test('unknown commands, incomplete action payloads and truncated files still fail',async()=>{
 for(const action of [Buffer.from([0xfe]),Buffer.from([6,65]),Buffer.from([0x7a,1,2])])await assert.rejects(parseReplay(fixture(action)),/unsupported|out of range|Truncated/);
 const bytes=fixture(train);await assert.rejects(parseReplay(bytes.subarray(0,-8)),/truncated/i);await assert.rejects(parseReplay(Buffer.alloc(0)),/complete.*header/i);
});

test('a zeroed header can be recovered from complete blocks without inventing patch metadata or modifying the file',async()=>{
 const bytes=fixture(Buffer.concat([Buffer.from([0x7a]),Buffer.alloc(16),train]),{version:10100,build:6115});bytes.fill(0,0,68);const original=Buffer.from(bytes);
 const data=await parseReplay(bytes);assert.deepEqual(bytes,original);assert.equal(data.headerRecovered,true);assert.equal(data.version,'');assert.equal(data.buildNumber,null);assert.equal(data.duration,1000);assert.equal(data.players[0].units.summary.hpea,1);
 await assert.rejects(parseReplay(bytes.subarray(0,-10)),/incomplete|truncated/i);
 const invalid=Buffer.from(bytes);invalid[68]=0;invalid[69]=0;await assert.rejects(parseReplay(invalid),/incomplete/i);
});
