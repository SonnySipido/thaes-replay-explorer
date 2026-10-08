'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),target=path.resolve(process.argv[2]||'');
if(!process.argv[2]||fs.existsSync(target))throw Error('Specify a new, empty staging directory.');
const runtime=path.join(root,'node_modules/electron/dist');
fs.mkdirSync(target,{recursive:true});
for(const item of fs.readdirSync(runtime)){if(['electron.exe','resources','LICENSE'].includes(item))continue;fs.cpSync(path.join(runtime,item),path.join(target,item),{recursive:true})}
fs.copyFileSync(path.join(runtime,'electron.exe'),path.join(target,"Thae's Replay Explorer.exe"));
fs.copyFileSync(path.join(runtime,'LICENSE'),path.join(target,'LICENSE.electron.txt'));
const app=path.join(target,'resources/app');fs.mkdirSync(app,{recursive:true});
for(const name of ['main.cjs','preload.cjs','parser.cjs','library.cjs','worker.cjs','map-files.cjs','replay-details.cjs','replay-folders.cjs','replay-import.cjs','window-state.cjs','player-profile.cjs','replay-start.cjs','winner.cjs','updater.cjs'])fs.copyFileSync(path.join(root,name),path.join(app,name));
fs.cpSync(path.join(root,'ui'),path.join(app,'ui'),{recursive:true,filter:p=>!path.basename(p).startsWith('forsaken-kingdom')});
const sources=path.join(app,'ui/artwork/SOURCES.json');const provenance=JSON.parse(fs.readFileSync(sources));provenance.files=provenance.files.filter(f=>!f.file.startsWith('forsaken-kingdom'));fs.writeFileSync(sources,JSON.stringify(provenance,null,2)+'\n');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const copied=new Set();
function dependency(name){if(copied.has(name))return;copied.add(name);const src=path.join(root,'node_modules',name);fs.cpSync(src,path.join(app,'node_modules',name),{recursive:true});for(const child of Object.keys(JSON.parse(fs.readFileSync(path.join(src,'package.json'))).dependencies||{}))dependency(child)}
for(const name of Object.keys(pkg.dependencies))dependency(name);
delete pkg.devDependencies;delete pkg.scripts;fs.writeFileSync(path.join(app,'package.json'),JSON.stringify(pkg,null,2)+'\n');
for(const name of ['README.md','LICENSE','NOTICE','THIRD_PARTY_NOTICES.md','CHANGELOG.md','licenses'])fs.cpSync(path.join(root,name),path.join(target,name),{recursive:true});
console.log('Staged runtime and '+copied.size+' production dependencies.');
