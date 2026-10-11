(function(root){
 function race(p){return p.race||p.raceDetected||'R';}
 function teams(players){const result=new Map();for(const p of players||[]){const id=p.teamid??p.team??0;if(!result.has(id))result.set(id,[]);result.get(id).push(p);}return [...result.values()];}
 function teamSize(players){const t=teams(players);return t.length===2&&t[0].length===t[1].length&&t[0].length>=1&&t[0].length<=4?t[0].length+'v'+t[0].length:'other';}
 function matchup(players,left,right){if(left==='any'&&right==='any')return true;const t=teams(players);return t.some((a,i)=>t.some((b,j)=>i!==j&&(left==='any'||a.some(p=>race(p)===left))&&(right==='any'||b.some(p=>race(p)===right))));}
 // Player filters use the race actually played. Random outcomes also require
 // that Random was selected, so a chosen Human is never Random (Human).
 function playedRace(p,value){
  if(!value||value==='any')return true;
  if(value==='R')return p.race==='R';
  if(/^R[HONU]$/.test(value))return p.race==='R'&&p.raceDetected===value.slice(1);
  return ['H','O','N','U'].includes(value)&&(p.race==='R'?p.raceDetected:p.raceDetected||p.race)===value;
 }
 function textMatches(value,filter){const text=String(value||'').toLowerCase(),query=String(filter.name||'').trim().toLowerCase();return !query||(filter.exact?text===query:text.includes(query));}
 function advanced(row,filters,mapName=row.map){
  if(!filters?.enabled)return true;
  return textMatches(mapName,filters.map||{})&&(filters.players||[]).every(filter=>
   !filter.name&&(!filter.race||filter.race==='any')||(row.players||[]).some(player=>textMatches(player.name,filter)&&playedRace(player,filter.race)));
 }
 function timestamp(row){
  const name=row.name||'';
  const m=name.match(/^Replay_(\d{4})_(\d{2})_(\d{2})_(\d{2})(\d{2})/i)||name.match(/^w3c[-_](\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/i);
  if(m){const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0));if(d.getFullYear()===+m[1]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[3]&&d.getHours()===+m[4]&&d.getMinutes()===+m[5])return d.getTime();}
  return Number(row.modified)||0;
 }
 function dateLabel(row,dateOnly=false){const ms=timestamp(row);if(!ms)return 'Date unavailable';const d=new Date(ms),pad=v=>String(v).padStart(2,'0');return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+(dateOnly?'':' \u00b7 '+pad(d.getHours())+':'+pad(d.getMinutes()));}
 function duplicateGroups(items){
  const groups=new Map();
  for(const row of items){if(!/^[a-f0-9]{64}$/.test(row.contentHash||''))continue;let group=groups.get(row.contentHash);if(!group){group=[];groups.set(row.contentHash,group);}group.push(row);}
  for(const [hash,group] of groups)if(group.length<2)groups.delete(hash);
  return groups;
 }
 function uniqueReplays(items,preferredKeys=[]){
  const groups=duplicateGroups(items),hidden=new Set();
  for(const group of groups.values()){
   const keep=preferredKeys.map(key=>group.find(row=>row.key===key)).find(Boolean)||group[0];
   for(const row of group)if(row!==keep)hidden.add(row);
  }
  return items.filter(row=>!hidden.has(row));
 }
 const api={teamSize,matchup,playedRace,advanced,timestamp,dateLabel,duplicateGroups,uniqueReplays};if(typeof module!=='undefined')module.exports=api;else root.replayFilters=api;
})(typeof window!=='undefined'?window:globalThis);
