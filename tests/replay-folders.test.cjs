'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {welcomeReplayFolder}=require('../replay-folders.cjs');
const documents=()=>fs.mkdtempSync(path.join(os.tmpdir(),'replay-folders-'));
test('welcome folder is BattleNet when an account there has a Replays folder',async()=>{
 const docs=documents();fs.mkdirSync(path.join(docs,'Warcraft III','BattleNet','12345','Replays'),{recursive:true});
 assert.equal(await welcomeReplayFolder(docs),path.join(docs,'Warcraft III','BattleNet'));
});
test('welcome folder falls back to the classic Replays folder, else none',async()=>{
 const docs=documents();
 assert.equal(await welcomeReplayFolder(docs),null);
 fs.mkdirSync(path.join(docs,'Warcraft III','BattleNet','12345'),{recursive:true});  // an account without replays
 assert.equal(await welcomeReplayFolder(docs),null);
 fs.mkdirSync(path.join(docs,'Warcraft III','Replays'),{recursive:true});
 assert.equal(await welcomeReplayFolder(docs),path.join(docs,'Warcraft III','Replays'));
});
