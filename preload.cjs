const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('replays',{
 openPlayerProfile:(key,playerId)=>ipcRenderer.invoke('open-player-profile',key,playerId),
 openProfile:()=>ipcRenderer.invoke('open-w3c-profile'),
 setSubfolders:enabled=>ipcRenderer.invoke('set-subfolders',enabled),
 initial:()=>ipcRenderer.invoke('initial'),
 get:key=>ipcRenderer.invoke('replay',key),
 chooseFolder:()=>ipcRenderer.invoke('choose-folder'),
 refresh:()=>ipcRenderer.invoke('refresh'),
 openFolder:()=>ipcRenderer.invoke('open-folder'),
 mapAvailable:key=>ipcRenderer.invoke('map-available',key),
 play:(key,requireMap=false)=>ipcRenderer.invoke('play-replay',key,requireMap),
 revealMap:key=>ipcRenderer.invoke('reveal-map',key),
 reveal:key=>ipcRenderer.invoke('reveal-replay',key),
 on:(channel,callback)=>{
   if(!['library-reset','library-entry','progress'].includes(channel))return;
   const listener=(_,data)=>callback(data);ipcRenderer.on(channel,listener);
   return ()=>ipcRenderer.removeListener(channel,listener);
 }
});

