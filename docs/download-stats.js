'use strict';
(()=>{
 const refresh=document.getElementById('stats-refresh'),status=document.getElementById('stats-status'),body=document.getElementById('stats-rows'),cacheKey='download-stats-v1',number=new Intl.NumberFormat();
 let snapshot=null;
 function show(releases,time){
  const {rows,totals}=downloadStatsData.summarize(releases);
  for(const format of ['total','msi','exe','zip'])document.getElementById('stats-'+format).textContent=number.format(totals[format]);
  body.replaceChildren();
  for(const row of rows){
   const tr=document.createElement('tr'),heading=document.createElement('th'),link=document.createElement('a');heading.scope='row';link.textContent=row.version;link.href='https://github.com/SonnySipido/thaes-replay-explorer/releases/tag/'+encodeURIComponent(row.tag);link.target='_blank';link.rel='noopener noreferrer';heading.append(link);tr.append(heading);
   for(const format of ['msi','exe','zip','total']){const cell=document.createElement('td');cell.textContent=row[format]===null?'—':number.format(row[format]);tr.append(cell);}body.append(tr);
  }
  document.getElementById('stats-table').hidden=!rows.length;document.getElementById('stats-empty').hidden=!!rows.length;
  status.textContent='Updated '+new Date(time).toLocaleString();
 }
 try{const saved=JSON.parse(localStorage.getItem(cacheKey));if(saved&&Array.isArray(saved.releases)&&Number.isFinite(saved.time)){snapshot=saved;show(saved.releases,saved.time);}}catch{}
 async function load(){
  refresh.disabled=true;status.textContent=snapshot?'Refreshing counts…':'Loading download counts…';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const releases=[];let page=1;
   while(true){
    const response=await fetch('https://api.github.com/repos/SonnySipido/thaes-replay-explorer/releases?per_page=100&page='+page,{headers:{Accept:'application/vnd.github+json'},signal:controller.signal});
    if(!response.ok){const error=new Error('unavailable');error.limited=response.status===429||(response.status===403&&response.headers.get('x-ratelimit-remaining')==='0');throw error;}
    const items=await response.json();if(!Array.isArray(items))throw new Error('invalid');releases.push(...items);
    if(!/rel="next"/.test(response.headers.get('link')||''))break;
    if(++page>20)throw new Error('incomplete');
   }
   const compact=releases.map(release=>({tag_name:release.tag_name,published_at:release.published_at,draft:release.draft,assets:Array.isArray(release.assets)?release.assets.map(asset=>({name:asset.name,download_count:asset.download_count})):[]}));
   snapshot={releases:compact,time:Date.now()};show(compact,snapshot.time);try{localStorage.setItem(cacheKey,JSON.stringify(snapshot));}catch{}
  }catch(error){
   if(snapshot)show(snapshot.releases,snapshot.time);
   status.textContent=(error.limited?'GitHub’s request limit was reached. Try Refresh later.':'Could not refresh download counts. Check your connection and try again.')+(snapshot?' Showing saved counts from '+new Date(snapshot.time).toLocaleString()+'.':'');
  }finally{clearTimeout(timeout);refresh.disabled=false;}
 }
 refresh.addEventListener('click',load);load();
})();
