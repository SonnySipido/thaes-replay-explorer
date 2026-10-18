'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {winningTeam,winnerDetails}=require('../winner.cjs');
const players=[{id:1,teamid:0},{id:2,teamid:0},{id:3,teamid:1},{id:4,teamid:1}];
const duel=[{id:1,teamid:0},{id:2,teamid:1}];
const leaves=codes=>Object.entries(codes).map(([id,result])=>({playerId:Number(id),result}));
test('a team with a win code wins, even if a teammate was knocked out (loss code) before the end',()=>{
 assert.equal(winningTeam(players,leaves({1:7,2:9,3:13,4:13})),0);
});
test('when both teams show 9s, the team with the 11 won',()=>{
 assert.equal(winningTeam(players,leaves({1:11,2:9,3:9,4:13})),0);
 assert.equal(winningTeam(players,leaves({1:13,2:9,3:9,4:11})),1);
});
test('Battle.net: the side that stayed (7) beats the side that left (13)',()=>{
 assert.equal(winningTeam(duel,leaves({1:13,2:7})),1);
 assert.equal(winningTeam(duel,leaves({1:7,2:13})),0);
 assert.equal(winningTeam(players,leaves({1:7,2:7,3:13,4:7})),0);
});
test('W3Champions: a loss (7) against a player without a record is a loss',()=>{
 assert.equal(winningTeam(duel,leaves({1:7})),1);
});
test('without leave records (many W3Champions replays) there is no winner',()=>{
 assert.equal(winningTeam(players,[]),-1);
 assert.equal(winningTeam(players,leaves({1:13,2:13,3:13,4:13})),-1);
});

test('victory markers are distinguished from inferred leave patterns without changing the winning team',()=>{
 for(const marker of [9,11])assert.deepEqual(winnerDetails(duel,leaves({1:marker,2:13})),{winningTeamId:0,winnerGuess:false,winnerSource:'win-code'});
 assert.deepEqual(winnerDetails(duel,leaves({1:7,2:13})),{winningTeamId:0,winnerGuess:true,winnerSource:'leave-pattern'});
 assert.deepEqual(winnerDetails(duel,leaves({1:7})),{winningTeamId:1,winnerGuess:true,winnerSource:'leave-pattern'});
});

test('a retained parser fallback is inferred when leave markers are inconclusive',()=>{
 assert.deepEqual(winnerDetails(duel,leaves({1:13,2:13}),1),{winningTeamId:1,winnerGuess:true,winnerSource:'replay-fallback'});
 assert.deepEqual(winnerDetails(duel,[],0),{winningTeamId:0,winnerGuess:true,winnerSource:'replay-fallback'});
});

const activePlayers=duel.map(p=>({...p,heroes:[{id:p.id===1?'Ofar':'Obla'}]}));
const game={map:{file:'Echo_Isles.w3x'}};
const evidence=(lastCommandMs,durationMs=100000)=>({version:1,complete:true,lastCommandMs,durationMs});

test('last commands infer a winner only after a meaningful gap and preserve team zero',()=>{
 assert.deepEqual(winnerDetails(activePlayers,[],-1,evidence({1:100000,2:98899}),game),{winningTeamId:0,winnerGuess:true,winnerSource:'last-command'});
 assert.equal(winnerDetails(activePlayers,[],-1,evidence({1:99000,2:100000}),game).winningTeamId,1);
 for(const times of [{1:100000,2:100000},{1:100000,2:99910},{1:100000},{1:100001,2:99000}])assert.equal(winnerDetails(activePlayers,[],-1,evidence(times),game).winningTeamId,-1);
});

test('activity guesses exclude short, no-hero, custom, FFA, and incomplete replays',()=>{
 const e=evidence({1:100000,2:98000});
 assert.equal(winnerDetails(duel,[],-1,e,game).winningTeamId,-1);
 assert.equal(winnerDetails(activePlayers,[],-1,evidence({1:50000,2:48000},50000),game).winningTeamId,-1);
 for(const map of ['Direct Strike 6.4.21_w3c.w3x','Unknown.w3x','FFA_EchoIsles.w3x','Timer_EchoIsles.w3x'])assert.equal(winnerDetails(activePlayers,[],-1,e,{map:{file:map}}).winningTeamId,-1,map);
 assert.equal(winnerDetails(activePlayers,[],-1,{...e,complete:false},game).winningTeamId,-1);
 assert.equal(winnerDetails([...activePlayers,{id:3,teamid:2}],[],-1,e,game).winningTeamId,-1);
});

test('team activity uses the latest teammate and ignores observers and service hosts',()=>{
 const ps=players.map(p=>({...p,heroes:[{id:'Ofar'}]}));
 ps.push({id:9,teamid:24,obs:true},{id:10,teamid:0,name:'FLO'});
 assert.equal(winnerDetails(ps,[],-1,evidence({1:1000,2:98000,3:97000,4:90000,9:100000,10:100000}),game).winningTeamId,0);
 // A teammate with no commands is allowed; an entire opposing team without commands is not.
 assert.equal(winnerDetails(ps,[],-1,evidence({2:98000,3:97000}),game).winningTeamId,0);
 assert.equal(winnerDetails(ps,[],-1,evidence({2:98000,9:100000}),game).winningTeamId,-1);
 const withAI=[...activePlayers,{id:3,teamid:2,name:'Computer'}];
 assert.equal(winnerDetails(withAI,[],-1,evidence({1:100000,2:98000}),game).winningTeamId,-1);
});

test('explicit wins take precedence and conflicting evidence cannot be resolved by activity',()=>{
 const e=evidence({1:100000,2:98000});
 assert.equal(winnerDetails(activePlayers,leaves({2:11}),-1,e,game).winningTeamId,1);
 assert.equal(winnerDetails(activePlayers,leaves({1:9,2:9}),0,e,game).winningTeamId,-1);
 assert.equal(winnerDetails(activePlayers,leaves({1:11,2:11}),1,e,game).winningTeamId,-1);
 assert.equal(winnerDetails(activePlayers,leaves({1:13,2:13}),1,e,game).winningTeamId,-1);
 // Preserve the previously correct leave-order answer in the known 90 ms counterexample.
 assert.deepEqual(winnerDetails(activePlayers,leaves({1:13,2:13}),1,evidence({1:100000,2:99910}),game),{winningTeamId:1,winnerGuess:true,winnerSource:'replay-fallback'});
});

test('missing results and fallback teams outside the lineup stay unknown',()=>{
 for(const fallback of [undefined,-1,24,null,'0'])assert.deepEqual(winnerDetails(duel,[],fallback),{winningTeamId:-1,winnerGuess:false,winnerSource:'unknown'});
});

test('only the latest leave for a player determines whether their victory is explicit',()=>{
 const records=[...leaves({1:11}),...leaves({1:7,2:13})];
 assert.deepEqual(winnerDetails(duel,records),{winningTeamId:0,winnerGuess:true,winnerSource:'leave-pattern'});
});
