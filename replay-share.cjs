'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');

function replayFile(entries,key){
 const entry=entries.get(key);
 if(!entry)throw Error('Replay is no longer in the library.');
 const file=path.resolve(entry.file);
 if(path.extname(file).toLowerCase()!=='.w3g')throw Error('Not a Warcraft replay.');
 try{if(!fs.statSync(file).isFile())throw Error();}catch{throw Error('Replay file is missing or unavailable.');}
 return file;
}

// Windows FileDrop, not plain text. Keep the filename out of executable code.
// SetFileDropList persists the clipboard after this short-lived STA helper exits.
const script=`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
$replayPath=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:THAE_REPLAY_FILE))
$files=New-Object System.Collections.Specialized.StringCollection
[void]$files.Add($replayPath)
[System.Windows.Forms.Clipboard]::SetFileDropList($files)
`;
function copyReplayFile(file){
 if(process.platform!=='win32')return Promise.reject(Error('Copying replay files is currently supported on Windows.'));
 return new Promise((resolve,reject)=>{
  const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  execFile(powershell,['-NoProfile','-NonInteractive','-STA','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{
   windowsHide:true,timeout:15000,maxBuffer:65536,
   env:{...process.env,THAE_REPLAY_FILE:Buffer.from(file,'utf8').toString('base64')}
  },error=>error?reject(Error('Could not copy the replay file. The clipboard may be busy; please try again.')):resolve(true));
 });
}
module.exports={replayFile,copyReplayFile};
