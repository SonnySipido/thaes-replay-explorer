const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('HD icon assets cover every classic object except shared Forsaken Paladin artwork',()=>{
 const root=path.resolve(__dirname,'..'),box={window:{}};for(const file of ['icons.js','icons-reforged.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'ui',file),'utf8'),box);
 const fallback=[];let total=0;for(const [kind,icons] of Object.entries(box.window.warcraftIcons)){if(kind==='races')continue;for(const id of Object.keys(icons)){const asset=box.window.warcraftReforgedIcons[kind]?.[id];if(!asset){fallback.push(id);continue;}assert.ok(fs.existsSync(path.join(root,'ui',asset)),asset);total++;}}
 assert.equal(total,682);assert.deepEqual(fallback.sort(),['AHcl','AHcr','AHpa','ANcp','Npal'].sort());
});
test('each later research rank has a separate Classic and HD icon with provenance',()=>{
 const root=path.resolve(__dirname,'..'),box={window:{}};for(const file of ['icons.js','icons-reforged.js','research-icons.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'ui',file),'utf8'),box);
 const definitions=require('../ui/research.js').definitions;
 for(const [id,ranks] of Object.entries(definitions))for(let level=2;level<=ranks.length;level++)for(const [folder,map] of [['icons',box.window.warcraftIcons],['icons-reforged',box.window.warcraftReforgedIcons]]){
  const key=id+'_'+level,asset=map.upgrades[key];assert(asset,key);assert.notEqual(asset,map.upgrades[id]);assert(fs.existsSync(path.join(root,'ui',asset)),asset);
  const provenance=JSON.parse(fs.readFileSync(path.join(root,'ui',folder,'SOURCES.json'))).files.find(file=>file.id===key);assert(provenance?.source);assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'ui',asset))).digest('hex'),provenance.sha256);
 }
});
