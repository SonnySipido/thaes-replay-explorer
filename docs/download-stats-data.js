(function(root){
 'use strict';
 const formats=['msi','exe','zip'];
 function summarize(releases){
  const rows=[];
  for(const release of releases){
   if(!release||release.draft||typeof release.tag_name!=='string'||!Array.isArray(release.assets))continue;
   const counts={msi:null,exe:null,zip:null};
   for(const asset of release.assets){
    if(!asset||typeof asset.name!=='string'||!/^Thae-Replay-Explorer-/i.test(asset.name))continue;
    const setup=asset.name.match(/-Setup-x64\.(msi|exe)$/i),format=setup?setup[1].toLowerCase():/-Portable-x64\.zip$/i.test(asset.name)?'zip':null;
    if(!format)continue;
    const count=Number.isSafeInteger(asset.download_count)&&asset.download_count>=0?asset.download_count:0;
    counts[format]=(counts[format]||0)+count;
   }
   if(formats.every(format=>counts[format]===null))continue;
   const total=formats.reduce((sum,format)=>sum+(counts[format]||0),0);
   rows.push({version:release.tag_name.replace(/^v/,''),tag:release.tag_name,published:release.published_at||'',...counts,total});
  }
  rows.sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0));
  const totals={msi:0,exe:0,zip:0,total:0};for(const row of rows)for(const format of [...formats,'total'])totals[format]+=row[format]||0;
  return {rows,totals};
 }
 const api={summarize};if(typeof module==='object'&&module.exports)module.exports=api;else root.downloadStatsData=api;
})(typeof window==='object'?window:globalThis);
