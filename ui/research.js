(function(root){
 // Warcraft research reuses the same raw ID for every rank. Minimum times are
 // from extracted UpgradeData: github.com/jblanchette/wc3v/blob/master/helpers/researchMeta.json.
 const definitions={
  Rhme:['Iron Forged Swords','Steel Forged Swords','Mithril Forged Swords'],
  Rhra:['Black Gunpowder','Refined Gunpowder','Imbued Gunpowder'],
  Rhar:['Iron Plating','Steel Plating','Mithril Plating'],
  Rhla:['Studded Leather Armor','Reinforced Leather Armor','Dragonhide Armor'],
  Rhac:['Improved Masonry','Advanced Masonry','Imbued Masonry'],
  Rhlh:['Improved Lumber Harvesting','Advanced Lumber Harvesting'],
  Rome:['Steel Melee Weapons','Thorium Melee Weapons','Arcanite Melee Weapons'],
  Rora:['Steel Ranged Weapons','Thorium Ranged Weapons','Arcanite Ranged Weapons'],
  Roar:['Steel Armor','Thorium Armor','Arcanite Armor'],
  Rosp:['Spiked Barricades','Improved Spiked Barricades','Advanced Spiked Barricades'],
  Rume:['Unholy Strength','Improved Unholy Strength','Advanced Unholy Strength'],
  Rura:['Creature Attack','Improved Creature Attack','Advanced Creature Attack'],
  Ruar:['Unholy Armor','Improved Unholy Armor','Advanced Unholy Armor'],
  Rucr:['Creature Carapace','Improved Creature Carapace','Advanced Creature Carapace'],
  Resm:['Strength of the Moon','Improved Strength of the Moon','Advanced Strength of the Moon'],
  Resw:['Strength of the Wild','Improved Strength of the Wild','Advanced Strength of the Wild'],
  Rema:['Moon Armor','Improved Moon Armor','Advanced Moon Armor'],
  Rerh:['Reinforced Hides','Improved Reinforced Hides','Advanced Reinforced Hides']
 };
 const casters={Rhpt:'Priest',Rhst:'Sorceress',Rowd:'Witch Doctor',Rost:'Shaman',Rowt:'Spirit Walker',Rune:'Necromancer',Ruba:'Banshee',Redt:'Druid of the Talon',Redc:'Druid of the Claw'};
 for(const [id,name] of Object.entries(casters))definitions[id]=['Adept','Master'].map(rank=>name+' '+rank+' Training');
 const times=id=>id==='Rune'?[30,45]:id==='Redc'?[25,35]:id==='Rowt'?[50,60]:casters[id]?[60,60]:[60,75,90];
 function orders(player){
  const states=new Map(),result=[];
  const events=[...(player.upgrades?.order||[]).map(o=>({...o,cancel:false})),...(player.cancellations||[]).map(o=>({...o,cancel:true}))].filter(o=>Number.isFinite(o.ms)&&o.ms>=0).sort((a,b)=>a.ms-b.ms||Number(a.cancel)-Number(b.cancel));
  for(const event of events){
   const ranks=definitions[event.id];
   if(!ranks){if(!event.cancel)result.push(event);continue;}
   const state=states.get(event.id)||{completed:0,pending:null};states.set(event.id,state);
   if(state.pending&&event.ms-state.pending.ms>=times(event.id)[state.pending.level-1]*1000){state.completed=state.pending.level;state.pending=null;}
   if(event.cancel){if(state.pending){state.pending.cancelled=true;state.pending=null;}continue;}
   const level=state.pending?.level||Math.min(ranks.length,state.completed+1);
   const order={...event,level,label:ranks[level-1],iconId:level>1?event.id+'_'+level:event.id,rankLabel:casters[event.id]?(level===1?'A':'M'):String(level),researchRepeated:!!state.pending||state.completed===ranks.length};
   result.push(order);if(!order.researchRepeated)state.pending=order;
  }
  return result;
 }
 const api={definitions,orders};if(typeof module!=='undefined')module.exports=api;else root.replayResearch=api;
})(typeof window!=='undefined'?window:globalThis);
