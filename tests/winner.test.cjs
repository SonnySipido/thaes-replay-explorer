'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {winningTeam}=require('../winner.cjs');
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
