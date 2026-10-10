const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('replays',{
 openPlayerProfile:(key,playerId)=>ipcRenderer.invoke('open-player-profile',key,playerId),
 openProfile:()=>ipcRenderer.invoke('open-w3c-profile'),
 setSubfolders:enabled=>ipcRenderer.invoke('set-subfolders',enabled),
 initial:()=>ipcRenderer.invoke('initial'),
 saveAnnotation:(key,patch)=>ipcRenderer.invoke('annotation-update',key,patch),
 exportAnnotations:()=>ipcRenderer.invoke('annotations-export'),
 importAnnotations:()=>ipcRenderer.invoke('annotations-import'),
 importReplays:files=>ipcRenderer.invoke('import-replays',files.map(file=>webUtils.getPathForFile(file))),
 get:key=>ipcRenderer.invoke('replay',key),
 chooseFolder:()=>ipcRenderer.invoke('choose-folder'),
 addReplayFolder:()=>ipcRenderer.invoke('add-replay-folder'),
 updateReplayFolder:(path,changes)=>ipcRenderer.invoke('update-replay-folder',path,changes),
 removeReplayFolder:path=>ipcRenderer.invoke('remove-replay-folder',path),
 useWelcomeFolder:()=>ipcRenderer.invoke('use-welcome-folder'),
 refresh:()=>ipcRenderer.invoke('refresh'),
 openFolder:()=>ipcRenderer.invoke('open-folder'),
 openReplayFolder:folder=>ipcRenderer.invoke('open-replay-folder',folder),
 mapAvailable:key=>ipcRenderer.invoke('map-available',key),
 play:(key,requireMap=false)=>ipcRenderer.invoke('play-replay',key,requireMap),
 revealMap:key=>ipcRenderer.invoke('reveal-map',key),
 reveal:key=>ipcRenderer.invoke('reveal-replay',key),
 copyReplayFile:key=>ipcRenderer.invoke('copy-replay-file',key),
 renameReplay:(key,name)=>ipcRenderer.invoke('rename-replay',key,name),
 dragReplayFile:key=>ipcRenderer.invoke('drag-replay-file',key),
 checkUpdate:()=>ipcRenderer.invoke('update-check'),
 installUpdate:()=>ipcRenderer.invoke('update-install'),
 openUpdateNotes:()=>ipcRenderer.invoke('update-notes'), copyText:text=>ipcRenderer.invoke('copy-text',text),
 exportBuildOrder:(key,format,contents,filename)=>ipcRenderer.invoke('export-build-order',key,format,contents,filename),
 exportChat:(key,text)=>ipcRenderer.invoke('export-chat',key,text),
 on:(channel,callback)=>{
   if(!['replay-renamed','annotation-changed','annotation-error','folders-changed','library-reset','library-entry','library-entries','progress','select-replay','update-progress'].includes(channel))return;
   const listener=(_,data)=>callback(data);ipcRenderer.on(channel,listener);
   return ()=>ipcRenderer.removeListener(channel,listener);
 }
});

