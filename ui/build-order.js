(function(root){
 const repeatBuildings=new Set('halt oalt eate uaod hbla hlum ofor edob ugrv usap hvlt ovln eden utom htow hkee hcas ogre ostr ofrt etol etoa etoe unpl unp1 unp2 ugol'.split(' '));
 function orders(player,{hideSuspectedDuplicates=true,maxTime=300000}={}){
  const heroes=new Set([...(player.heroes||[]).map(h=>h.id),...(player.heroOrders||[]).map(h=>h.id)]),events=[],seenHeroes=new Map();
  for(const o of player.units?.order||[]){const kind=heroes.has(o.id)?'heroes':'units';events.push({...o,kind});if(kind==='heroes'){const key=o.id+':'+o.ms;seenHeroes.set(key,(seenHeroes.get(key)||0)+1);}}
  for(const o of player.heroOrders||[]){const key=o.id+':'+o.ms;if(seenHeroes.get(key)){seenHeroes.set(key,seenHeroes.get(key)-1);continue;}events.push({...o,kind:'heroes'});}
  const tiers={hkee:'T2',hcas:'T3',ostr:'T2',ofrt:'T3',etoa:'T2',etoe:'T3',unp1:'T2',unp2:'T3'},expansions=new Set(['htow','ogre','etol','unpl','ugol']);
  const firstTier2=Math.min(Infinity,...(player.buildings?.order||[]).filter(o=>tiers[o.id]==='T2').map(o=>o.ms));
  for(const o of player.upgrades?.order||[])events.push({...o,kind:'upgrades'});
  for(const o of [...(player.buildings?.order||[])].sort((a,b)=>a.ms-b.ms)){
   events.push({...o,kind:'buildings',tag:tiers[o.id]||(expansions.has(o.id)&&o.ms>=0&&o.ms<360000&&o.ms<firstTier2?'FE':'')});
  }
  const raw=events.filter(o=>typeof o.id==='string'&&Number.isFinite(o.ms)&&o.ms>=0&&o.ms<=maxTime).sort((a,b)=>a.ms-b.ms);
  if(!hideSuspectedDuplicates)return raw;
  const result=[],singletons=new Map();
  for(const order of raw){
   const singleton=order.kind==='heroes'||order.kind==='buildings'&&repeatBuildings.has(order.id);
   const id=order.kind+':'+order.id+':'+(order.source||'');
   const previous=singleton?singletons.get(id):result.at(-1);
   // A short burst is only suspected duplication: queued units may be legitimate.
   // Anchor to the first command, so a long stream never collapses into one order.
   const window=singleton?3000:250;
   const eligible=singleton||order.kind==='units'||order.kind==='upgrades';
   if(eligible&&previous&&previous.id===order.id&&previous.kind===order.kind&&previous.source===order.source&&order.ms-previous.ms<=window){
    previous.suspectedDuplicates=(previous.suspectedDuplicates||0)+1;continue;
   }
   result.push(order);if(singleton)singletons.set(id,order);
  }
  return result;
 }
 function analysis(player,options={}){
  const list=orders(player,{...options,maxTime:Infinity}),units={...player.units?.summary};
  for(const order of list){if((order.kind==='units'||order.kind==='heroes')&&order.suspectedDuplicates&&units[order.id])units[order.id]=Math.max(1,units[order.id]-order.suspectedDuplicates);}
  return {units,buildings:list.filter(o=>o.kind==='buildings'),upgrades:list.filter(o=>o.kind==='upgrades')};
 }
 const timestamp=ms=>String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0');
 function playersByTeam(players){return [...players].sort((a,b)=>(a.teamid??a.team??0)-(b.teamid??b.team??0));}
 function text(data,mapName,options={}){return ['Build order',mapName,options.hideSuspectedDuplicates===false?'Raw recorded orders':'Suspected duplicates grouped; commands do not confirm completed units.','',...playersByTeam(data.players).flatMap(p=>{const list=orders(p,options);return [p.name+' — Team '+((p.teamid??p.team??0)+1),...list.map(o=>timestamp(o.ms)+'  '+(data.names[o.id]||o.id)+(o.tag?' ['+o.tag+']':'')),...(list.length?[]:['No recorded orders in the first five minutes.']),''];})].join('\r\n');}
 const api={orders,analysis,timestamp,playersByTeam,text};if(typeof module!=='undefined')module.exports=api;else root.replayBuildOrder=api;
})(typeof window!=='undefined'?window:globalThis);
