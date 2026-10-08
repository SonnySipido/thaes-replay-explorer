const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {create}=require('../ui/map-preview-match.js');
test('older standard and W3Arena names match bundled map previews without matching unrelated maps',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/maps.js'),'utf8'),context);
 const maps=context.window.warcraftMaps,lookup=create(maps,context.window.warcraftMapNames);
 for(const file of ['(4)TwistedMeadows.w3x','(2)SecretValley.w3x','(8)BlastedLands.w3m','(2)EchoIsles.w3x','(8)Deadlock_LV.w3x','w3arena__twistedmeadows__v3.w3x','w3arena__echoisles__v3.w3x','(2)autumnleaves_v2-0 s3.w3x']){
  const image=lookup(file);assert.ok(image,file);assert.ok(fs.existsSync(path.join(__dirname,'../ui',image)));
 }
 for(const [file,image] of Object.entries(maps))assert.equal(lookup(file),image,'Exact match '+file);
 for(const file of ['UnknownMap.w3x','TwistedMeadowsTowerDefense.w3x','EchoIslesCustom.w3x',''])assert.equal(lookup(file),undefined);
 assert.equal(lookup('Maps\\FrozenThrone\\(4)TwistedMeadows.w3x'),lookup('(4)TwistedMeadows.w3x'));
});

test('Direct Strike fallback uses the newest bundled version and keeps exact previews',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/maps.js'),'utf8'),context);
 const maps=context.window.warcraftMaps,lookup=create(maps,context.window.warcraftMapNames);
 const latest=maps['Direct Strike 6.4.21_w3c.w3x'];
 for(const file of ['Direct_Strike_6.3.8a_W3C.w3x','Direct_Strike_Reforged_V2.0.3.w3x','Direct Strike Reforged V2.0.3.w3x','Direct_Strike_Reforged_Epic_7.6.1.w3x'])assert.equal(lookup(file),latest,file);
 assert.equal(lookup('Direct_Strike_6.1.4a.w3x'),maps['Direct_Strike_6.1.4a.w3x']);
 assert.equal(lookup('DirectStriker.w3x'),undefined);
});

test('Nomad Isles 1.2 uses its own preview and current/W3Arena variants remain available',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/maps.js'),'utf8'),context);
 const maps=context.window.warcraftMaps,lookup=create(maps,context.window.warcraftMapNames);
 for(const file of ['(3)NomadIsles1.2.w3x','Maps\\Download\\(3)NomadIsles1.2.w3x','NomadIsles1.2.w3x'])assert.equal(lookup(file),'maps/nomad-isles-1-2.png');
 assert.equal(context.window.warcraftMapNames['(3)NomadIsles1.2.w3x'],'Nomad Isles');
 assert.ok(fs.existsSync(path.join(__dirname,'../ui',lookup('(3)NomadIsles1.2.w3x'))));
 assert.equal(lookup('w3arena__nomadisles__v3.w3x'),maps['(3)NomadIsles.w3x']);
 assert.equal(lookup('NomadIslesTowerDefense.w3x'),undefined);
});

test('Centaur Grove, Furbolg Mountain, Swamped Temple and both Moonglade editions have previews',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/maps.js'),'utf8'),context);
 const lookup=create(context.window.warcraftMaps,context.window.warcraftMapNames);
 for(const file of ['(4)CentaurGrove.w3x','(4)FurbolgMountain.w3x','(2)SwampedTemple.w3x','(6)Moonglade.w3x','(6)Moonglade.w3m']){
  assert.ok(lookup(file),file);assert.ok(fs.existsSync(path.join(__dirname,'../ui',lookup(file))));
 }
 assert.notEqual(lookup('(6)Moonglade.w3x'),lookup('(6)Moonglade.w3m'));
});
