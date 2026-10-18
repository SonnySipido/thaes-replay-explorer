'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {parseReplay,validateContainer,addWinnerDetails,SCHEMA}=require('../parser.cjs');
const {parseOutcomeEvidence}=require('../replay-start.cjs');
const {ReplayDetails}=require('../replay-details.cjs');
const {WINNER_VERSION}=require('../winner.cjs');
const {fixture,order,timeslot,leave}=require('./helpers/replay-fixture.cjs');
const resume=Buffer.from([2]); // Deliberately omitted by the action decoder and APM.
function activityReplay(options={}){
 const records=[timeslot(1000,[[1,order('Ofar')],[2,order('Obla')]]),timeslot(59000,[[2,resume]],0x1e),timeslot(1101,[[1,resume]]),timeslot(899,[[2,Buffer.alloc(0)]])];
 return fixture(undefined,{records,duration:62000,...options});
}

test('raw activity includes ignored commands, excludes empty blocks, and keeps leave times',async()=>{
 const input=activityReplay({leaves:[[2,13]]}),{data:raw}=await validateContainer(input,{includeData:true});
 const e=parseOutcomeEvidence(raw);
 assert.equal(e.complete,true);assert.equal(e.durationMs,62000);assert.deepEqual(e.lastCommandMs,{1:61101,2:60000});
 assert.deepEqual(e.leaves,[{playerId:2,result:13,reason:1,timeMs:62000}]);
 const data=await parseReplay(activityReplay());
 assert.equal(data.winningTeamId,0);assert.equal(data.winnerSource,'last-command');assert.equal(data.winnerGuess,true);
 assert.equal(data.players[0].actionCount,1,'the final ignored command is evidence even though it contributes no APM');
 assert.deepEqual(data.winnerEvidence.lastCommandMs,{1:61101,2:60000});
});

test('unknown records, bad time-slot framing, and partial command blocks disable activity inference',async()=>{
 const brokenCommand=timeslot(60000,[[1,resume],[2,resume]]);brokenCommand.writeUInt16LE(100,6);
 for(const record of [Buffer.from([0xfe]),Buffer.from([0x1f,1,0,0,0]),brokenCommand]){
  const input=activityReplay({records:[timeslot(1000,[[1,order('Ofar')],[2,order('Obla')]]),record]});
  const {data}=await validateContainer(input,{includeData:true});assert.equal(parseOutcomeEvidence(data).complete,false);
 }
 const input=activityReplay();await assert.rejects(addWinnerDetails({players:[]},input.subarray(0,-5)),/truncated/i);
});

test('activity guesses survive header recovery without inventing patch metadata',async()=>{
 const input=activityReplay({version:10100,build:6115});input.fill(0,0,68);
 const data=await parseReplay(input);assert.equal(data.headerRecovered,true);assert.equal(data.version,'');assert.equal(data.winningTeamId,0);assert.equal(data.winnerSource,'last-command');
});

async function cachedFixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'winner-activity-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'match.w3g');await fs.writeFile(file,activityReplay());const stat=await fs.stat(file);
 const data=await parseReplay(file),key='match',fingerprint=stat.size+':'+stat.mtimeMs+':'+SCHEMA;
 delete data.winnerEvidence;delete data.winnerGuess;delete data.winnerSource;data.winningTeamId=-1;data.winnerChecked=2;
 const entry={schema:SCHEMA,key,file,fingerprint,data};await fs.writeFile(path.join(dir,key+'.json'),JSON.stringify(entry));
 return {dir,file,row:{key,file,fingerprint},entry,details:new ReplayDetails(dir)};
}

test('opening an old cached replay upgrades and persists its inferred winner without changing other analysis',async t=>{
 const f=await cachedFixture(t),before=JSON.stringify(f.entry.data.players),opened=await f.details.get(f.row);
 assert.equal(opened.data.winningTeamId,0);assert.equal(opened.data.winnerGuess,true);assert.equal(opened.data.winnerSource,'last-command');
 assert.equal(opened.data.winnerChecked,WINNER_VERSION);assert.equal(JSON.stringify(opened.data.players),before);
 const persisted=JSON.parse(await fs.readFile(path.join(f.dir,'match.json'),'utf8'));assert.equal(persisted.data.winnerSource,'last-command');assert.equal(persisted.fingerprint,f.row.fingerprint);
 const restarted=await new ReplayDetails(f.dir).get(f.row);assert.equal(restarted.data.winnerSource,'last-command');
 assert.equal(await addWinnerDetails(restarted.data,'not-needed.w3g'),false);
});

test('a failed old-cache read is not marked upgraded and can be retried',async t=>{
 const f=await cachedFixture(t);await fs.rename(f.file,f.file+'.held');
 await assert.rejects(f.details.get(f.row),/ENOENT/);
 assert.equal(JSON.parse(await fs.readFile(path.join(f.dir,'match.json'),'utf8')).data.winnerChecked,2);
 await fs.rename(f.file+'.held',f.file);assert.equal((await f.details.get(f.row)).data.winnerSource,'last-command');
});

test('an obsolete activity guess cannot survive as its own fallback',async()=>{
 const data=await parseReplay(activityReplay());data.winnerChecked=WINNER_VERSION-1;data.winnerEvidence.lastCommandMs={1:60000,2:60000};
 assert.equal(await addWinnerDetails(data,'not-needed.w3g'),true);assert.equal(data.winningTeamId,-1);assert.equal(data.winnerGuess,false);
});
