'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function suggestedReplayFolder(documents){
 const base=path.join(documents,'Warcraft III','BattleNet');const candidates=[];
 try{for(const entry of await fs.readdir(base,{withFileTypes:true})){if(!entry.isDirectory()||entry.isSymbolicLink())continue;const folder=path.join(base,entry.name,'Replays');try{const stat=await fs.stat(folder);if(stat.isDirectory())candidates.push({folder,modified:stat.mtimeMs});}catch{}}}catch{}
 candidates.sort((a,b)=>b.modified-a.modified);
 return candidates[0]?.folder||path.join(documents,'Warcraft III','Replays');
}
// the folder offered on the first start: Warcraft III's BattleNet folder when an account in it has a Replays
// folder (with subfolders included that covers every account), else the classic Replays folder; null when neither exists
async function welcomeReplayFolder(documents){
 const base=path.join(documents,'Warcraft III','BattleNet');
 try{for(const entry of await fs.readdir(base,{withFileTypes:true})){if(!entry.isDirectory()||entry.isSymbolicLink())continue;try{if((await fs.stat(path.join(base,entry.name,'Replays'))).isDirectory())return base;}catch{}}}catch{}
 const classic=path.join(documents,'Warcraft III','Replays');
 try{if((await fs.stat(classic)).isDirectory())return classic;}catch{}
 return null;
}
module.exports={suggestedReplayFolder,welcomeReplayFolder};
