'use strict';
const fs=require('node:fs/promises'),path=require('node:path');

async function saveReplayExport({entries,key,format,contents,filename,label,dialog,window,documents}){
 if(!entries.has(key))throw Error('Replay is no longer in the library.');
 if(!['txt','png'].includes(format)||typeof contents!=='string'||contents.length>48*1024*1024)throw Error('Invalid '+label.toLowerCase()+' export.');
 let output=contents;
 if(format==='png'){
  if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(contents))throw Error('Invalid image export.');
  output=Buffer.from(contents.split(',')[1],'base64');
  if(output.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG image.');
 }
 const basename=(typeof filename==='string'?filename:label).replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180).replace(/[. ]+$/,'')||label;
 const pick=await dialog.showSaveDialog(window,{title:format==='png'?'Export '+label.toLowerCase()+' image':'Save '+label.toLowerCase(),defaultPath:path.join(documents,basename+'.'+format),filters:[{name:format==='png'?'PNG image':'Text',extensions:[format]}]});
 if(pick.canceled)return false;
 await fs.writeFile(pick.filePath,output);return true;
}
module.exports={saveReplayExport};
