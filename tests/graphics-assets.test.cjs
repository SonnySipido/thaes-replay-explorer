const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('HD icon assets cover every classic object except shared Forsaken Paladin artwork',()=>{
 const root=path.resolve(__dirname,'..'),box={window:{}};for(const file of ['icons.js','icons-reforged.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'ui',file),'utf8'),box);
 const fallback=[];let total=0;for(const [kind,icons] of Object.entries(box.window.warcraftIcons)){if(kind==='races')continue;for(const id of Object.keys(icons)){const asset=box.window.warcraftReforgedIcons[kind]?.[id];if(!asset){fallback.push(id);continue;}assert.ok(fs.existsSync(path.join(root,'ui',asset)),asset);total++;}}
 assert.equal(total,682);assert.deepEqual(fallback.sort(),['AHcl','AHcr','AHpa','ANcp','Npal'].sort());
});
