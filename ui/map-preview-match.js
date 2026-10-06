'use strict';
(function(root){
 function normalize(value){
  return String(value||'').split(/[\\/]/).pop()
   .replace(/\|c[0-9a-f]{8}|\|r/gi,'').replace(/\.w3[xm]$/i,'')
   .replace(/^\(\d+\)\s*/,'').replace(/^\d+(?=[a-z])/i,'')
   .replace(/^(?:(?:\d+v\d+|\d+|wal|rcg)[ _-]+)?(?:w3c|w3champions|w3arena)[ _-]+/i,'')
   .replace(/^(?:(?:s\d+(?:\.\d+)?|\d{4,8}|ptr\d+)[ _-]+)+/i,'')
   .replace(/[ _-]+w3c[ _-]+\d.*$/i,'')
   .replace(/(?:[ _-]+s\d+(?:\.\d+)?|[ _-]*v\d+(?:[.-]\d+)*[a-z]?|[ _-]+lv)(?=[ _-]|$)/gi,'')
   .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[^a-z0-9]/g,'');
 }
 function create(images,names){
  const exact=new Map(),aliases=new Map();
  // Prefer simple original filenames over timestamped tournament versions.
  const entries=Object.entries(images).sort((a,b)=>a[0].length-b[0].length||a[0].localeCompare(b[0]));
  for(const [file,image] of entries){
   exact.set(file.toLowerCase(),image);
   for(const value of [file,names[file]]){
    const key=normalize(value);
    if(key&&!aliases.has(key))aliases.set(key,image);
   }
  }
  return file=>exact.get(String(file||'').split(/[\\/]/).pop().toLowerCase())||aliases.get(normalize(file));
 }
 const api={normalize,create};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.mapPreviewMatch=api;
})(typeof window==='object'?window:globalThis);
