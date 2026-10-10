'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {replayFile}=require('../replay-share.cjs');
test('sharing resolves only an existing replay from the library',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'replay-share-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const file=path.join(folder,"Thae's 雪 $test (1).w3g");fs.writeFileSync(file,'fixture');
 const entries=new Map([['valid',{file}],['other',{file:path.join(folder,'notes.txt')}],['missing',{file:path.join(folder,'missing.w3g')}],['directory',{file:path.join(folder,'folder.w3g')}]]);
 fs.mkdirSync(entries.get('directory').file);
 assert.equal(replayFile(entries,'valid'),file);
 assert.throws(()=>replayFile(entries,file),/no longer/);
 assert.throws(()=>replayFile(entries,'other'),/Not a Warcraft/);
 assert.throws(()=>replayFile(entries,'missing'),/missing or unavailable/);
 assert.throws(()=>replayFile(entries,'directory'),/missing or unavailable/);
});
test('clipboard passes Unicode filenames as data to a hidden STA helper and propagates errors',async()=>{
 let call,fail=false;const mod={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../replay-share.cjs'),'utf8'),{module:mod,Buffer,process:{platform:'win32',env:{SystemRoot:'C:\\Windows'}},require:name=>name==='node:child_process'?{execFile:(exe,args,options,done)=>{call={exe,args,options};done(fail?Error('busy'):null);}}:require(name)});
 const file="C:\\Replays\\Thae's 雪 $(not-code).w3g";
 assert.equal(await mod.exports.copyReplayFile(file),true);
 assert.equal(Buffer.from(call.options.env.THAE_REPLAY_FILE,'base64').toString('utf8'),file);
 assert.equal(call.options.windowsHide,true);assert(call.args.includes('-STA'));assert.equal(call.options.timeout,15000);
 const script=Buffer.from(call.args.at(-1),'base64').toString('utf16le');assert(!script.includes(file));assert(script.includes('SetFileDropList'));
 fail=true;await assert.rejects(mod.exports.copyReplayFile(file),/clipboard may be busy/);
});
