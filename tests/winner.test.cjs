'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {winningTeam}=require('../winner.cjs');
const players=[{id:1,teamid:0},{id:2,teamid:0},{id:3,teamid:1},{id:4,teamid:1}];
const leaves=codes=>Object.entries(codes).map(([id,result])=>({playerId:Number(id),result}));
test('a team with a win code wins, even if a teammate was knocked out (loss code) before the end',()=>{
 assert.equal(winningTeam(players,leaves({1:7,2:9,3:13,4:13}),1),0);
});
test('when both teams show 9s, the team with the 11 won',()=>{
 assert.equal(winningTeam(players,leaves({1:11,2:9,3:9,4:13}),1),0);
 assert.equal(winningTeam(players,leaves({1:13,2:9,3:9,4:11}),1),1);
});
test('no win codes: the team without losses, else the other team of a saver who lost',()=>{
 assert.equal(winningTeam(players,leaves({1:7,2:7,3:13,4:13}),1),1);
 assert.equal(winningTeam(players,leaves({1:7,2:7,3:7,4:13}),2),1);
});
test('without leave records (many W3Champions replays) there is no winner',()=>{
 assert.equal(winningTeam(players,[],1),-1);
 assert.equal(winningTeam(players,leaves({1:13,2:13,3:13,4:13}),1),-1);
});
