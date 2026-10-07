const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('replays',{
 openPlayerProfile:(key,playerId)=>ipcRenderer.invoke('open-player-profile',key,playerId),
 openProfile:()=>ipcRenderer.invoke('open-w3c-profile'),
 setSubfolders:enabled=>ipcRenderer.invoke('set-subfolders',enabled),
 initial:()=>ipcRenderer.invoke('initial'),
 get:key=>ipcRenderer.invoke('replay',key),
 chooseFolder:()=>ipcRenderer.invoke('choose-folder'),
 useWelcomeFolder:()=>ipcRenderer.invoke('use-welcome-folder'),
 refresh:()=>ipcRenderer.invoke('refresh'),
 openFolder:()=>ipcRenderer.invoke('open-folder'),
 mapAvailable:key=>ipcRenderer.invoke('map-available',key),
 play:(key,requireMap=false)=>ipcRenderer.invoke('play-replay',key,requireMap),
 revealMap:key=>ipcRenderer.invoke('reveal-map',key),
 reveal:key=>ipcRenderer.invoke('reveal-replay',key),
 checkUpdate:()=>ipcRenderer.invoke('update-check'),
 installUpdate:()=>ipcRenderer.invoke('update-install'),
 openUpdateNotes:()=>ipcRenderer.invoke('update-notes'), copyText:text=>ipcRenderer.invoke('copy-text',text),
 exportChat:(key,text)=>ipcRenderer.invoke('export-chat',key,text),
 on:(channel,callback)=>{
   if(!['library-reset','library-entry','progress','select-replay','update-progress'].includes(channel))return;
   const listener=(_,data)=>callback(data);ipcRenderer.on(channel,listener);
   return ()=>ipcRenderer.removeListener(channel,listener);
 }
});

