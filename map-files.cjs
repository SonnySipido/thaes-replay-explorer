'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function resolveMapFile(map,roots){
 const relative=String(map?.path||'').replace(/[\\/]+/g,path.sep);
 if(!/\.w3[xm]$/i.test(relative)||path.isAbsolute(relative)||relative.split(path.sep).includes('..'))throw Error('This replay has no valid local map path.');
 const basename=path.basename(relative).toLowerCase();
 async function candidate(root,file){try{const actual=await fs.realpath(file),base=await fs.realpath(root);const rel=path.relative(base,actual);if(rel.startsWith('..')||path.isAbsolute(rel))return null;return (await fs.stat(actual)).isFile()?actual:null;}catch{return null;}}
 for(const root of roots){const found=await candidate(root,path.join(root,relative));if(found)return found;}
 // Older downloads can move directories; only accept the exact filename.
 for(const root of roots){const stack=[path.join(root,'Maps')];while(stack.length){const dir=stack.pop();let files;try{files=await fs.readdir(dir,{withFileTypes:true});}catch{continue;}for(const file of files){if(file.isSymbolicLink())continue;const full=path.join(dir,file.name);if(file.isDirectory())stack.push(full);else if(file.isFile()&&file.name.toLowerCase()===basename){const found=await candidate(root,full);if(found)return found;}}}}
 throw Object.assign(new Error('The map file was not found on your computer.'),{code:'MAP_NOT_FOUND',mapFile:path.basename(relative)});
}
module.exports={resolveMapFile};
