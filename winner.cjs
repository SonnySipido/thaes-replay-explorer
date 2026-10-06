'use strict';
// The winning team from the players' leave records (w3gjs only decides 1v1 games). Each record has a
// result code: 9 and 11 are wins, 13 a player who left, 7 and 8 depend on the game: in W3Champions
// replays a 7 is a loss, in Battle.net replays a 7 next to an opponent who left (13) is the side that
// stayed and won. So:
//  1. one team has an 11 (the clearest win marker): that team
//  2. one team has a 9 or 11: that team (a player knocked out early can still get a loss)
//  3. no wins at all: a team still complete at the end (everyone 7/8) beats teams with players who left
//  4. otherwise the team without losses, if only one is left
// Checked against the true results of 6,582 Battle.net 1v1s and 1,542 team games (MMR change at the
// players' next game) and 113 W3Champions 1v1s: right in 96% / 86% / 76% of games, wrong in 3% / 13% /
// 1% (the rest undecided, mostly replays without leave records).
const WIN=new Set([9,11]),LOSS=new Set([7,8]);
const WINNER_VERSION=2;  // results cached by older versions are worked out again
function winningTeam(players,leaves){
 const team=new Map(players.map(p=>[p.id,p.teamid]));
 const teams=new Set(team.values());
 const result=new Map(leaves.filter(l=>team.has(l.playerId)).map(l=>[l.playerId,l.result]));
 const code=p=>result.get(p.id);
 const teamsWith=test=>new Set(players.filter(p=>test(code(p))).map(p=>p.teamid));
 const elevens=teamsWith(c=>c===11);
 if(elevens.size===1)return [...elevens][0];
 const won=teamsWith(c=>WIN.has(c));
 if(won.size===1)return [...won][0];
 if(won.size)return -1;
 const stayed=[...teams].filter(t=>players.filter(p=>p.teamid===t).every(p=>LOSS.has(code(p))));
 const left=teamsWith(c=>c===13);
 if(stayed.length===1&&[...teams].every(t=>t===stayed[0]||left.has(t)))return stayed[0];
 const lost=teamsWith(c=>LOSS.has(c)),rest=[...teams].filter(t=>!lost.has(t));
 if(lost.size&&rest.length===1)return rest[0];
 return -1;
}
module.exports={winningTeam,WINNER_VERSION};
