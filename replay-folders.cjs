'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function suggestedReplayFolder(documents){
 const base=path.join(documents,'Warcraft III','BattleNet');const candidates=[];
 try{for(const entry of await fs.readdir(base,{withFileTypes:true})){if(!entry.isDirectory()||entry.isSymbolicLink())continue;const folder=path.join(base,entry.name,'Replays');try{const stat=await fs.stat(folder);if(stat.isDirectory())candidates.push({folder,modified:stat.mtimeMs});}catch{}}}catch{}
 candidates.sort((a,b)=>b.modified-a.modified);
 return candidates[0]?.folder||path.join(documents,'Warcraft III','Replays');
}
module.exports={suggestedReplayFolder};
