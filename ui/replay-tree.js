(function(root){
 'use strict';
 const normalize=value=>String(value||'').replace(/\\/g,'/').replace(/\/+$/,'');
 const key=value=>normalize(value).toLowerCase();
 function build(locations,rows,directories=[]){
  const roots=locations.filter(location=>location.enabled!==false).map(location=>({path:normalize(location.path),name:normalize(location.path).split('/').pop()||location.path,recursive:location.includeSubfolders!==false,children:new Map(),replays:[]}));
  // Assign overlaps to the most specific configured root, keeping each file visible once.
  const owners=[...roots].sort((a,b)=>b.path.length-a.path.length);
  function owner(path,isFile){const p=key(path);return owners.find(r=>{const base=key(r.path);return p===base||p.startsWith(base+'/')&&(r.recursive||isFile&&!p.slice(base.length+1).includes('/'));});}
  function folder(r,path){let node=r;const relative=normalize(path).slice(r.path.length).replace(/^\//,'');for(const part of relative.split('/').filter(Boolean)){const id=part.toLowerCase();if(!node.children.has(id))node.children.set(id,{path:node.path+'/'+part,name:part,children:new Map(),replays:[]});node=node.children.get(id);}return node;}
  for(const path of directories){const r=owner(path,false);if(r)folder(r,path);}
  for(const row of rows){const r=owner(row.file,true);if(r)folder(r,normalize(row.file).slice(0,normalize(row.file).lastIndexOf('/'))).replays.push(row);}
  function count(node){node.count=node.replays.length+[...node.children.values()].reduce((sum,child)=>sum+count(child),0);return node.count;}
  roots.forEach(count);return roots;
 }
 const sortedChildren=node=>[...node.children.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));
 function visibleReplays(roots,expanded){
  const result=[];
  function visit(node){if(!expanded.has(key(node.path)))return;for(const child of sortedChildren(node))visit(child);result.push(...node.replays);}
  roots.forEach(visit);return result;
 }
 const api={build,key,sortedChildren,visibleReplays};if(typeof module==='object'&&module.exports)module.exports=api;else root.replayTree=api;
})(typeof window==='undefined'?globalThis:window);
