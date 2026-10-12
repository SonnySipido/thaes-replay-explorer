'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../ui/map-types.js'),catalogue=require('../ui/map-catalogue.js');
const classify=create(catalogue);
test('confirmed Blizzard melee maps are recognized independently of hosting platform',()=>{
 for(const map of catalogue.melee)assert.equal(classify({map,source:'other'}),'melee',map);
 for(const map of ['Maps/FrozenThrone/(2)EchoIsles.w3x','Echo_Isles.w3x','Turtle_Rock.w3x'])assert.equal(classify({map}),'melee',map);
});
test('W3Champions ladder maps and historical filename variants include every requested game mode',()=>{
 for(const map of catalogue.w3c)assert.equal(classify({map}),'w3c',map);
 for(const map of ['w3c_s17_240104_TwistedMeadows_v1.9.w3x','1v1_EchoIsles_v2.2_w3c_260125_1357_1051.w3x','1051_w3c_260615_2308_EchoIsles_v2.2.w3x','w3c_WellspringTemple_v1.2.w3x'])assert.equal(classify({map}),'w3c',map);
 for(const mode of ['1v1','2v2','3v3','4v4','FFA'])assert(catalogue.w3c.some(map=>map.includes(mode)),mode+' catalogue');
 assert.equal(classify({map:'(2)EchoIsles.w3x',mapInfo:{file:'(2)EchoIsles.w3x',path:'Maps/W3Champions/(2)EchoIsles.w3x'}}),'w3c');
});
test('custom games remain custom even on W3Champions and similar names do not match melee maps',()=>{
 for(const map of ['Direct Strike 6.4.21_w3c.w3x','Legion_TD_11.0_W3C_TeamOZE.w3x','SurvivalChaos4.23w3c.w3x','Unknown.w3x','TwistedMeadowsTowerDefense.w3x','EchoIsles_Custom.w3x',''])assert.equal(classify({map,source:'w3c'}),'custom',map);
});
