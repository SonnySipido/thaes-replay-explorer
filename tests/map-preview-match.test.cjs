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
