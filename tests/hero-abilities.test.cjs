'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {entitySearch}=require('../library.cjs');
const source=fs.readFileSync(require.resolve('../ui/app.js'),'utf8'),context={name:id=>id,esc:String,gameIcon:id=>'<img data-icon-id="'+id+'">'};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('// Keep ultimate IDs'),source.indexOf('function heroExperienceMarkup(')),context);
const abilities=hero=>JSON.parse(JSON.stringify(context.orderedHeroAbilities(hero)));

test('hero cards include unlearned abilities in game order without changing parsed data or search',()=>{
 const hero={id:'Hamg',abilities:{AHab:2,AHwe:2}},before=JSON.stringify(hero);
 assert.deepEqual(abilities(hero),[['AHbz',0],['AHwe',2],['AHab',2],['AHmt',0]]);
 assert.equal(JSON.stringify(hero),before);
 const search=entitySearch({players:[{heroes:[hero]}]});assert(search.includes('water elemental'));assert(!search.includes('blizzard'));assert(!search.includes('mass teleport'));
 const empty=context.heroAbilityMarkup('AHbz',0),ultimate=context.heroAbilityMarkup('AHmt',0),learned=context.heroAbilityMarkup('AHwe',2);
 assert.match(empty,/class="ability unlearned"/);assert.match(empty,/not learned/);assert.equal((empty.match(/class="ability-rank-bar"/g)||[]).length,3);assert(!empty.includes(' filled'));
 assert.equal((ultimate.match(/class="ability-rank-bar"/g)||[]).length,1);assert(!ultimate.includes(' filled'));
 assert(!learned.includes('unlearned'));assert.equal((learned.match(/ability-rank-bar filled/g)||[]).length,2);
});

test('all supported heroes have four visible abilities with available icon art and an ultimate last',()=>{
 const icons={window:{}};vm.createContext(icons);vm.runInContext(fs.readFileSync(require.resolve('../ui/icons.js'),'utf8'),icons);
 const heroes=vm.runInContext('[...heroAbilityDefaults.keys()]',context);assert.equal(heroes.length,25);
 for(const id of heroes){const rows=abilities({id});assert.equal(rows.length,4,id);assert(rows.every(([,rank])=>rank===0),id);assert(vm.runInContext('ultimateAbilities',context).has(rows[3][0]),id);for(const [ability] of rows)assert(icons.window.warcraftIcons.abilities[ability],id+' '+ability);}
 assert.deepEqual(abilities({id:'Npal',abilities:{AHcl:1}}),[['ANcp',0],['AHcr',0],['AHpa',0],['AHcl',1]]);
});

test('alternate spell IDs share one slot and combine learned ranks without duplicating abilities',()=>{
 assert.deepEqual(abilities({id:'Ulic',abilities:{AUfu:2}}),[['AUfn',0],['AUfu',2],['AUdr',0],['AUdd',0]]);
 assert.deepEqual(abilities({id:'Ntin',abilities:{ANsy:1,ANs1:1,ANs2:1,ANcs:1,ANc1:1,ANeg:2,ANg2:1}}),[['ANs2',3],['ANc1',2],['ANeg',2],['ANg2',1]]);
 assert.deepEqual(abilities({id:'Nfir',abilities:{ANia:2}}),[['ANso',0],['ANlm',0],['ANia',2],['ANvc',0]]);
});
