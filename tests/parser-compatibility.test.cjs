'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ActionParser}=require('w3gjs');
const {parseReplay,configureCompatibleActions,PARSER_REVISION}=require('../parser.cjs');
const {fixture,train}=require('./helpers/replay-fixture.cjs');
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

test('parsed replay results preserve the evidence needed to label explicit, inferred and unknown winners',async()=>{
 const scenarios=[
  {leaves:[[1,11],[2,13]],team:0,guess:false,source:'win-code'},
  {leaves:[[1,7],[2,13]],team:0,guess:true,source:'leave-pattern'},
  {leaves:[[1,13],[2,13]],team:1,guess:true,source:'replay-fallback'},
  {leaves:[],team:-1,guess:false,source:'unknown'},
 ];
 for(const s of scenarios){
  const data=JSON.parse(JSON.stringify(await parseReplay(fixture(train,{leaves:s.leaves}))));
  assert.equal(data.winningTeamId,s.team);assert.equal(data.winnerGuess,s.guess);assert.equal(data.winnerSource,s.source);
 }
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
