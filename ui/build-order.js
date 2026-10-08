(function(root){
 const repeatBuildings=new Set('halt oalt eate uaod hbla hlum ofor edob ugrv usap hvlt ovln eden utom htow hkee hcas ogre ostr ofrt etol etoa etoe unpl unp1 unp2 ugol'.split(' '));
 function orders(player){
  const heroes=new Set([...(player.heroes||[]).map(h=>h.id),...(player.heroOrders||[]).map(h=>h.id)]),events=[],seenHeroes=new Map();
  for(const o of player.units?.order||[]){const kind=heroes.has(o.id)?'heroes':'units';events.push({...o,kind});if(kind==='heroes'){const key=o.id+':'+o.ms;seenHeroes.set(key,(seenHeroes.get(key)||0)+1);}}
  for(const o of player.heroOrders||[]){const key=o.id+':'+o.ms;if(seenHeroes.get(key)){seenHeroes.set(key,seenHeroes.get(key)-1);continue;}events.push({...o,kind:'heroes'});}
  const tiers={hkee:'T2',hcas:'T3',ostr:'T2',ofrt:'T3',etoa:'T2',etoe:'T3',unp1:'T2',unp2:'T3'},expansions=new Set(['htow','ogre','etol','unpl','ugol']);
  const firstTier2=Math.min(Infinity,...(player.buildings?.order||[]).filter(o=>tiers[o.id]==='T2').map(o=>o.ms));
  for(const o of player.upgrades?.order||[])events.push({...o,kind:'upgrades'});
  const retained=new Map();
  for(const o of [...(player.buildings?.order||[])].sort((a,b)=>a.ms-b.ms)){
   if(repeatBuildings.has(o.id)){const last=retained.get(o.id);if(last!==undefined&&o.ms-last<=3000)continue;retained.set(o.id,o.ms);}
   events.push({...o,kind:'buildings',tag:tiers[o.id]||(expansions.has(o.id)&&o.ms>=0&&o.ms<360000&&o.ms<firstTier2?'FE':'')});
  }
  const lastHero=new Map();
  return events.filter(o=>typeof o.id==='string'&&Number.isFinite(o.ms)&&o.ms>=0&&o.ms<=300000).sort((a,b)=>a.ms-b.ms).filter(o=>{if(o.kind!=='heroes')return true;const last=lastHero.get(o.id);if(last!==undefined&&o.ms-last<=3000)return false;lastHero.set(o.id,o.ms);return true;});
 }
 const timestamp=ms=>String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0');
 function playersByTeam(players){return [...players].sort((a,b)=>(a.teamid??a.team??0)-(b.teamid??b.team??0));}
 function text(data,mapName){return ['Build order',mapName,'',...playersByTeam(data.players).flatMap(p=>[p.name+' — Team '+((p.teamid??p.team??0)+1),...orders(p).map(o=>timestamp(o.ms)+'  '+(data.names[o.id]||o.id)+(o.tag?' ['+o.tag+']':'')),...(orders(p).length?[]:['No recorded orders in the first five minutes.']),''])].join('\r\n');}
 const api={orders,timestamp,playersByTeam,text};if(typeof module!=='undefined')module.exports=api;else root.replayBuildOrder=api;
})(typeof window!=='undefined'?window:globalThis);
