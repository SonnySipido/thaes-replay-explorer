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
const WINNER_VERSION=4;  // guarded last-command inference, shared by fresh/cached replays
const MIN_ACTIVITY_GAP_MS=1000,MIN_ACTIVITY_DURATION_MS=60000;
const classifyMap=require('./ui/map-types.js').create(require('./ui/map-catalogue.js'));
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
function activityWinner(players,evidence,game){
 if(!evidence?.complete||evidence.durationMs<MIN_ACTIVITY_DURATION_MS||!Number.isFinite(evidence.durationMs))return -1;
 const teams=new Set(players.map(p=>p.teamid));
 if(teams.size!==2||!players.some(p=>(p.heroes||[]).some(h=>/^[HOUEN]/.test(h.id||''))))return -1;
 const map=game?.map;
 if(!map||/(?:^|[\\/ _-])(?:ffa|timer)(?=[\\/ _.-]|$)/i.test(map.path||map.file||''))return -1;
 if(classifyMap({mapInfo:map})==='custom')return -1;
 const last=new Map();
 for(const p of players){
  const ms=evidence.lastCommandMs?.[p.id];
  if(Number.isFinite(ms)&&ms>=0&&ms<=evidence.durationMs)last.set(p.teamid,Math.max(last.get(p.teamid)??-1,ms));
 }
 if(last.size!==2)return -1;
 const ranked=[...last].sort((a,b)=>b[1]-a[1]);
 return ranked[0][1]-ranked[1][1]>=MIN_ACTIVITY_GAP_MS?ranked[0][0]:-1;
}
function winnerDetails(players,leaves,fallbackWinner=-1,evidence=null,game=null){
 players=players.filter(p=>!p.obs&&!p.observer&&!['Blizzard','FLO'].includes(p.name));
 const winner=winningTeam(players,leaves);
 if(winner>=0){
  const result=new Map(leaves.map(l=>[l.playerId,l.result]));
  const explicit=players.some(p=>p.teamid===winner&&WIN.has(result.get(p.id)));
  return {winningTeamId:winner,winnerGuess:!explicit,winnerSource:explicit?'win-code':'leave-pattern'};
 }
 const unknown={winningTeamId:-1,winnerGuess:false,winnerSource:'unknown'};
 const result=new Map(leaves.map(l=>[l.playerId,l.result]));
 if(new Set(players.filter(p=>WIN.has(result.get(p.id))).map(p=>p.teamid)).size>1)return unknown;
 const known=Number.isInteger(fallbackWinner)&&fallbackWinner>=0&&players.some(p=>p.teamid===fallbackWinner);
 const active=activityWinner(players,evidence,game);
 if(active>=0){
  if(known&&active!==fallbackWinner)return unknown;
  return {winningTeamId:active,winnerGuess:true,winnerSource:'last-command'};
 }
 return known?{winningTeamId:fallbackWinner,winnerGuess:true,winnerSource:'replay-fallback'}:unknown;
}
module.exports={winningTeam,winnerDetails,activityWinner,WINNER_VERSION};
