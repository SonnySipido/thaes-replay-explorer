'use strict';
// The winning team from the players' leave records (w3gjs only decides 1v1 games). Each record has a
// result code: 9 and 11 are wins, 7 and 8 losses, 13 a player who left. In team games the codes are
// partly written from the point of view of whoever saved the replay, so:
//  1. one team has an 11 (the clearest win marker): that team
//  2. one team has a 9 or 11: that team (a player knocked out early can still get a loss)
//  3. no wins at all: the team(s) without a loss, if only one is left; else the other team of a
//     saver who lost
// Tested on 3,000 replays against the plain "one team won" rule: never different, and it decides
// 97% of team games (the rest are mostly W3Champions replays without any leave records).
const WIN=new Set([9,11]),LOSS=new Set([7,8]);
function winningTeam(players,leaves,recorderId){
 const team=new Map(players.map(p=>[p.id,p.teamid]));
 const teams=new Set(team.values());
 const result=new Map(leaves.filter(l=>team.has(l.playerId)).map(l=>[l.playerId,l.result]));
 const with_=test=>new Set([...result].filter(([,code])=>test(code)).map(([id])=>team.get(id)));
 const elevens=with_(code=>code===11);
 if(elevens.size===1)return [...elevens][0];
 const won=with_(code=>WIN.has(code));
 if(won.size===1)return [...won][0];
 if(won.size)return -1;
 const lost=with_(code=>LOSS.has(code)),rest=[...teams].filter(t=>!lost.has(t));
 if(lost.size&&rest.length===1)return rest[0];
 if(LOSS.has(result.get(recorderId))&&teams.size===2)return [...teams].find(t=>t!==team.get(recorderId));
 return -1;
}
module.exports={winningTeam};
