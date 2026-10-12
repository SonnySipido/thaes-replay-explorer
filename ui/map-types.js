(function(root){
 'use strict';
 const preview=typeof module!=='undefined'&&module.exports?require('./map-preview-match.js'):root.mapPreviewMatch;
 const basename=value=>String(value||'').replace(/\\/g,'/').split('/').pop();
 function family(value){
  return preview.normalize(basename(value).replace(/@\d+(?=\.w3[xm]$)/i,'').replace(/^(?:(?:[1-4]v[1-4]|ffa)[ _-]+)+/i,'').replace(/[ _-]+(?:w3c|w3champions)(?=\.w3[xm]$)/i,'').replace(/[ _-]+\d+(?:\.\d+)+[a-z]?(?=\.w3[xm]$)/i,''));
 }
 function create(catalogue={}){
  const melee=new Set((catalogue.melee||[]).map(family)),w3c=new Set((catalogue.w3c||[]).map(family));
  return row=>{
   const file=row?.mapInfo?.file||row?.map||'',mapPath=row?.mapInfo?.path||file,key=family(file);
   if(!key)return 'custom';
   const markedW3c=/(?:^|[\\/ _-])(?:w3c|w3champions)(?:[\\/ _-]|$)|^(?:[1-4]v[1-4]|ffa)[ _-]/i.test(String(mapPath));
   // A W3Champions host or filename marker alone never turns a custom game
   // such as Direct Strike or Legion TD into a ladder map.
   if(markedW3c&&w3c.has(key))return 'w3c';
   if(melee.has(key))return 'melee';
   return w3c.has(key)?'w3c':'custom';
  };
 }
 const api={create,family};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.replayMapTypes=api;
})(typeof window!=='undefined'?window:globalThis);
