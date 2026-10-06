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
