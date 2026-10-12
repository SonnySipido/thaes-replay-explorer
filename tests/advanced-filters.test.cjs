'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {advanced,playedRace}=require('../ui/replay-filters.js');
const row={map:'Echo Isles',players:[{name:'Alice#1234',race:'R',raceDetected:'H',team:0},{name:'Bob#4321',race:'O',raceDetected:'O',team:1}]};
const filters=(players=[],map={})=>({enabled:true,players,map});

test('advanced filters start inert and disabling ignores every stored criterion',()=>{
 assert(advanced(row));assert(advanced(row,{enabled:false,players:[{name:'Missing',race:'RU'}],map:{name:'Missing'}}));
 assert(advanced(row,filters([{name:'',race:'any'}])));assert(advanced({error:'Parse error'},filters()));
});
test('name and race must match the same player and all player rows must match',()=>{
 assert(advanced(row,filters([{name:'alice',race:'RH'},{name:'Bob#4321',exact:true,race:'O'}])));
 assert(!advanced(row,filters([{name:'Alice',race:'O'}])));
 assert(!advanced(row,filters([{name:'Alice',race:'RH'},{name:'Bob',race:'U'}])));
 assert(!advanced(row,filters([{name:'Alice#12',exact:true,race:'any'}])));
 assert(advanced(row,filters([{name:'ALICE#1234',exact:true,race:'H'}])));
});
test('each Random outcome is distinct from chosen races, other outcomes and unknown outcomes',()=>{
 for(const race of ['H','N','O','U']){
  const random={race:'R',raceDetected:race};
  assert(playedRace(random,'R'));assert(playedRace(random,race));assert(playedRace(random,'R'+race));
  assert(!playedRace({race,raceDetected:race},'R'+race));
  for(const other of ['H','N','O','U'].filter(value=>value!==race))assert(!playedRace(random,'R'+other));
  assert(advanced({players:[random]},filters([{race:'R'+race}])));
 }
 assert(playedRace({race:'R'},'R'));assert(!playedRace({race:'R'},'RH'));
 assert(!playedRace({},'R'));assert(!playedRace({},'RH'));assert(!playedRace({race:'H'},'bad'));
 assert(playedRace({raceDetected:'N'},'N'));
});
test('player and map filters intersect and selected names use exact matching',()=>{
 const options=filters([{name:'Alice',race:'RH'}],{name:'Echo Isles',exact:true});
 assert(advanced(row,options));assert(!advanced({...row,map:'Turtle Rock'},options));
 assert(!advanced({...row,players:[{name:'Alice',race:'O'}]},options));
 assert(!advanced({...row,map:'Echo Isles 2'},options));
 assert(advanced(row,filters([{name:'bob',race:'O'}],{name:'isles'})));
 assert(advanced({...row,map:'Maps/Download/Echo_Isles.w3x'},options,'Echo Isles'));
 assert(!advanced({players:[]},filters([{name:'Alice',race:'H'}])));
});

test('map-choice categories do not restrict replay results or change player/race/map matching',()=>{
 const options={...filters([{name:'Alice',race:'RH'}],{name:'Echo Isles',exact:true}),mapTypes:{melee:true,w3c:true,custom:false}};
 assert(advanced(row,options));
 options.mapTypes={melee:false,w3c:false,custom:true};assert(advanced(row,options));
 assert(!advanced({...row,map:'Turtle Rock'},options,'Turtle Rock'));
 options.mapTypes={melee:false,w3c:false,custom:false};assert(advanced(row,options));
 assert(advanced(row,{...options,enabled:false}));
});
