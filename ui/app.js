'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=ms=>{const s=Math.floor((ms||0)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const clean=value=>String(value||'').replace(/\|c[0-9a-f]{8}|\|r/gi,'').replace(/\.w3[xm]$/i,'').replace(/_/g,' ');
const races={H:'Human',O:'Orc',N:'Night Elf',U:'Undead',R:'Random'};
let droppedReplayKey=null;
let rows=new Map(),selected=null,entry=null,playerId=null,tab='Heroes',renderTimer,request=0;
let pendingReplayRestore=localStorage.getItem('selected-replay'),restoredReplayReveal=null;
let requestedReplay=null;
// Patch filter: the patches ticked in its menu (none = every patch), remembered between launches
let patchFilter=new Set();
try{patchFilter=new Set(JSON.parse(localStorage.getItem('library-patches')||'[]'));}catch{}
function restoreSelectedReplay(){
 if(!pendingReplayRestore||selected||!rows.has(pendingReplayRestore))return;
 const key=pendingReplayRestore;pendingReplayRestore=null;restoredReplayReveal=key;
 selectReplay(key,true);renderList();
 // a replay asked for from outside that the search text hides: clear the search so it shows in the list
 if(requestedReplay===key&&droppedReplayKey!==key){
  requestedReplay=null;
  if($('search').value&&!$('replay-list').querySelector('.replay-row.active')){
   $('search').value='';localStorage.setItem('library-search','');
   renderList();restoredReplayReveal=key;renderList();  // (a new search starts at page 1: then jump to the replay's page)
  }
 }
}
// a replay asked for from outside (--select, e.g. from another app): select it now, or as soon as the
// library has it
function openRequestedReplay(key){
 if(!key)return;
 pendingReplayRestore=key;requestedReplay=key;selected=null;
 restoreSelectedReplay();
}
let dragDepth=0,importingReplay=false;
const hasDraggedFiles=event=>Array.from(event.dataTransfer?.types||[]).includes('Files');
const clearReplayDrop=()=>{dragDepth=0;document.body.classList.remove('replay-drop-active');};
document.addEventListener('dragenter',event=>{if(!hasDraggedFiles(event))return;event.preventDefault();dragDepth++;document.body.classList.add('replay-drop-active');});
document.addEventListener('dragover',event=>{if(!hasDraggedFiles(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy';});
document.addEventListener('dragleave',event=>{if(!hasDraggedFiles(event))return;if(--dragDepth<=0)clearReplayDrop();});
window.addEventListener('blur',clearReplayDrop);
document.addEventListener('drop',async event=>{
 if(!hasDraggedFiles(event))return;event.preventDefault();clearReplayDrop();
 const files=Array.from(event.dataTransfer.files);
 if(!files.length)return;
 if(files.some(file=>!/\.w3g$/i.test(file.name))){showError(new Error('Drop Warcraft III replay (.w3g) files.'));return;}
 if(importingReplay){showError(new Error('Please wait for the current replay import to finish.'));return;}
 importingReplay=true;$('status').textContent='Adding replay to the primary folder…';
 const selectionAtDrop=request;
 try{
  const result=await window.replays.importReplays(files);
  if(result?.alreadyInLibrary){$('status').textContent='Replay is already in your library.';}
  else if(result&&request===selectionAtDrop){renderList();droppedReplayKey=result.key;openRequestedReplay(result.key);}
 }catch(error){showError(error);}finally{importingReplay=false;}
});
const annotationPending=new Map(),annotationJobs=new Set();
const annotationFor=row=>annotationPending.get(row?.contentHash||row?.key)||row?.annotation||{favorite:false,notes:''};
const FAVORITE_STAR_ICON='<svg class="favorite-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.78 5.63 6.22.91-4.5 4.38 1.06 6.2L12 17.19l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91L12 3z"/></svg>';
function updateAnnotationRows(hash,value){for(const row of rows.values())if(row.contentHash===hash)row.annotation=value;}
function refreshFavoriteButtons(){
 $('replay-notes')?.classList.toggle('has-notes',Boolean(annotationFor(rows.get(selected)).notes.trim()));
 for(const button of document.querySelectorAll('[data-favorite-key]')){const value=annotationFor(rows.get(button.dataset.favoriteKey)).favorite;if(!button.querySelector('.favorite-star'))button.innerHTML=FAVORITE_STAR_ICON;button.classList.toggle('is-favorite',value);button.setAttribute('aria-pressed',String(value));button.setAttribute('aria-label',value?'Remove favorite':'Add favorite');button.title=value?'Remove favorite':'Add favorite';}
}
async function saveReplayAnnotation(key,patch){
 const row=rows.get(key);if(!row)return;const id=row.contentHash||key;
 const optimistic={...annotationFor(row),...patch};annotationPending.set(id,optimistic);refreshFavoriteButtons();scheduleList();
 if(selected===key&&$('notes-status'))$('notes-status').textContent='Saving…';
 const job=window.replays.saveAnnotation(key,patch);annotationJobs.add(job);
 try{
  const result=await job;row.contentHash=result.hash;updateAnnotationRows(result.hash,result.annotation);
  if(annotationPending.get(id)===optimistic){annotationPending.delete(id);if(selected===key&&$('notes-status'))$('notes-status').textContent='Saved';}
 }catch(error){if(selected===key&&$('notes-status'))$('notes-status').textContent='Not saved — '+error.message;showError(error);throw error;}
 finally{annotationJobs.delete(job);refreshFavoriteButtons();scheduleList();}
}
window.flushReplayNotes=async()=>{
 const pending=[...annotationPending.entries()];
 await Promise.allSettled([...annotationJobs]);
 // Retry failed saves rather than letting the app close with unsaved edits.
 for(const [id,value] of pending){if(!annotationPending.has(id))continue;const row=[...rows.values()].find(r=>(r.contentHash||r.key)===id);if(!row)throw new Error("A replay with unsaved notes is no longer in the library. Re-enable its folder before closing.");const latest=annotationPending.get(id);await saveReplayAnnotation(row.key,{favorite:latest.favorite,notes:latest.notes});}
};
function bindReplayAnnotations(){
 const key=selected,row=rows.get(key),value=annotationFor(row);
 $('match-favorite').dataset.favoriteKey=key;$('match-favorite').onclick=()=>saveReplayAnnotation(key,{favorite:!annotationFor(rows.get(key)).favorite}).catch(()=>{});
 $('notes-status').textContent=annotationPending.has(row?.contentHash||key)?'Saving…':'';$('replay-notes-text').value=value.notes;$('replay-notes').open=localStorage.getItem('notes-open')==='true';
 $('replay-notes').ontoggle=event=>{const notes=event.currentTarget;if(!notes.isConnected)return;localStorage.setItem('notes-open',String(notes.open));};
 $('replay-notes-text').oninput=event=>saveReplayAnnotation(key,{notes:event.target.value}).catch(()=>{});
 refreshFavoriteButtons();
}
window.replays.on('annotation-changed',({hash,annotation})=>{updateAnnotationRows(hash,annotation);refreshFavoriteButtons();scheduleList();});
window.replays.on('annotation-error',error=>{showError(error);if($('notes-status'))$('notes-status').textContent=error.message;});
const annotationFilterEnabled=id=>$(id).getAttribute('aria-pressed')==='true';
for(const id of ['only-notes','only-favorites']){
 const button=$(id);
 const apply=enabled=>{button.setAttribute('aria-pressed',String(enabled));button.title=(id==='only-notes'?'Only replays with notes':'Only favorites')+(enabled?' — on':' — off');if(id==='only-favorites'&&!button.querySelector('.favorite-star'))button.innerHTML=FAVORITE_STAR_ICON;};
 apply(localStorage.getItem(id)==='true');
 button.onclick=()=>{const enabled=!annotationFilterEnabled(id);apply(enabled);localStorage.setItem(id,String(enabled));if(id==='only-notes'&&enabled){localStorage.setItem('notes-open','true');const notes=$('replay-notes');if(notes)notes.open=true;}renderList();};
}
for(const action of ['export','import'])$('annotations-'+action).onclick=async()=>{
 const button=$('annotations-'+action);button.disabled=true;
 try{await window.flushReplayNotes();const result=await window.replays[action==='export'?'exportAnnotations':'importAnnotations']();if(result!==null&&result!==false){$('annotation-backup-status').textContent=action==='export'?'Annotations exported.':result+' annotations imported.';if(action==='import'&&$('replay-notes-text')&&selected)$('replay-notes-text').value=annotationFor(rows.get(selected)).notes;refreshFavoriteButtons();}}
 catch(error){$('annotation-backup-status').textContent=error.message;}finally{button.disabled=false;}
};
$('compact-replays').checked=localStorage.getItem('compact-replays')==='true';
$('hide-empty-folders').checked=localStorage.getItem('hide-empty-folders')==='true';
function updateClassicViewOptions(){
 const enabled=$('compact-replays').checked;
 $('hide-empty-folders').disabled=!enabled;
 $('hide-empty-folders-row').classList.toggle('is-disabled',!enabled);
 $('hide-empty-folders-row').title=enabled?'Hide folders with no replay results in this view.':'Enable Classic explorer view to use this option.';
}
updateClassicViewOptions();
$('compact-replays').onchange=()=>{restoredReplayReveal=selected;localStorage.setItem('compact-replays',String($('compact-replays').checked));updateClassicViewOptions();renderList();};
$('hide-empty-folders').onchange=()=>{localStorage.setItem('hide-empty-folders',String($('hide-empty-folders').checked));renderList();};
$('race-colored-names').checked=localStorage.getItem('race-colored-names')!=='false';
function applyRaceNameColors(){document.body.classList.toggle('plain-replay-names',!$('race-colored-names').checked);}
applyRaceNameColors();
$('race-colored-names').onchange=()=>{localStorage.setItem('race-colored-names',String($('race-colored-names').checked));applyRaceNameColors();};
$('hide-duplicates').checked=localStorage.getItem('hide-duplicates')!=='false';
$('hide-duplicates').onchange=()=>{localStorage.setItem('hide-duplicates',String($('hide-duplicates').checked));renderList();};
$('hide-build-duplicates').checked=buildOrderOptions().hideSuspectedDuplicates;
$('hide-build-duplicates').onchange=event=>{localStorage.setItem('hide-build-duplicates',String(event.target.checked));if(entry?.data&&['Build Order','Heroes','Buildings'].includes(tab))renderPanel();};
const emptyAnalysisMarkup=$('detail').innerHTML;
let chartObservers=[];
function deselectReplay(){
 ++request;selected=null;entry=null;playerId=null;pendingReplayRestore=null;restoredReplayReveal=null;
 localStorage.removeItem('selected-replay');
 chartObservers.forEach(observer=>observer.disconnect());chartObservers=[];
 $('detail').innerHTML=emptyAnalysisMarkup;
 document.querySelectorAll('.replay-row.active').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(!$('patch-menu').hidden)closePatchMenu();else if(!$('settings').hidden)closeSettings();else deselectReplay();}});
// Settings panel (gear in the header): icon style and updates
function openSettings(){$('settings').hidden=false;$('settings-backdrop').hidden=false;$('settings-close').focus();}
function closeSettings(){$('settings').hidden=true;$('settings-backdrop').hidden=true;$('settings-open').focus();}
$('settings-open').onclick=openSettings;$('settings-close').onclick=closeSettings;$('settings-backdrop').onclick=closeSettings;
let listPage=0,listQuery='',filteredReplayList=[];const listPageSize=100;
document.addEventListener('keydown',async event=>{
 if(!['ArrowUp','ArrowDown'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 if(event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]')||!$('settings').hidden||!$('ask-backdrop').hidden||!$('patch-menu').hidden)return;
 const classic=$('compact-replays').checked;
 const list=classic?replayTree.visibleReplays(replayTree.build(configuredReplayFolders,filteredReplayList,replayDirectories),expandedReplayFolders):filteredReplayList;
 if(!list.length)return;
 event.preventDefault();
 const current=list.findIndex(row=>row.key===selected),direction=event.key==='ArrowDown'?1:-1;
 const index=current<0?(classic?(direction>0?0:list.length-1):Math.min(listPage*listPageSize+(direction>0?0:listPageSize-1),list.length-1)):Math.max(0,Math.min(list.length-1,current+direction));
 await selectReplay(list[index].key,false,true);
});
const tabs=['Heroes','Buildings','Items','APM','Control groups','Chat','Build Order'];
const savedAnalysisTab=localStorage.getItem('analysis-tab')||localStorage.getItem('replay-tab:'+pendingReplayRestore);
if(tabs.includes(savedAnalysisTab))tab=savedAnalysisTab;
const name=id=>entry?.data?.names[id] || id || 'Unknown';

function mapBaseName(file){return String(file||'').split(/[\\/]/).pop();}
function cleanMapTitle(value){
 return clean(value).replace(/^\(\d+\)\s*/,'').replace(/^(?:(?:\d+|wal)[ _-]+)?(?:w3c|w3champions|w3arena)[ _-]+/i,'').replace(/^(?:(?:s\d+(?:\.\d+)?|\d{4,8}|ptr\d+)[ _-]+)+/i,'').replace(/^a[ _-]starter[ _-]map[ _-]*/i,'').replace(/[ _-]+(?:S\d+(?:\.\d+)?|LV|v\d+(?:\.\d+)*[a-z]?)(?=[ _-]|$)/gi,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim();
}
const mapTitles=new Map(Object.entries(window.warcraftMapNames||{}).map(([file,title])=>[file.toLowerCase(),title]));
const resolveMapPreview=window.mapPreviewMatch.create(window.warcraftMaps||{},window.warcraftMapNames||{});
function mapDisplayName(file){
 const base=mapBaseName(file),stored=mapTitles.get(base.toLowerCase());
 return cleanMapTitle(stored||base).replace(/\b[a-z]/g,c=>c.toUpperCase());
}
function mapImage(file){return resolveMapPreview(file);}

function selectedRace(p){return p.race||p.raceDetected||'R';}
function raceColorClass(p){return 'race-color-'+selectedRace(p);}
let showWinner=localStorage.getItem('show-winner')==='true';
let reforgedIcons=localStorage.getItem('reforged-icons')==='true';
function iconSource(id,kind){return (reforgedIcons?window.warcraftReforgedIcons?.[kind]?.[id]:null)||window.warcraftIcons?.[kind]?.[id];}
const replayColorClasses={"#0042ff":0,"#ff0303":1,"#1ce6b9":2,"#540081":3,"#fffc00":4,"#fe8a0e":5,"#20c000":6,"#e55bb0":7,"#959697":8,"#7ebff1":9,"#106246":10,"#4a2a04":11,"#9b0000":12,"#0000c3":13,"#00eaff":14,"#be00fe":15,"#ebcd87":16,"#f8a48b":17,"#bfff80":18,"#dcb9eb":19,"#282828":20,"#ebf0ff":21,"#00781e":22,"#a46f33":23};
function playerColorClass(index){
 if(index<0)return '';
 const players=entry?.data?.players||[];
 const recorded=players.length>2?replayColorClasses[String(players[index]?.color||'').toLowerCase()]:undefined;
 return 'player-color-'+(recorded??(index%24));
}
function raceIcon(code){
 const key=window.warcraftIcons.races[code]?code:'R';
 return '<img class="race-icon" src="'+esc(window.warcraftIcons.races[key])+'" alt="'+esc(races[key])+'" title="'+esc(races[key])+'" width="24" height="24">';
}
function playerRaceIcon(p,analysis=false){
 if(analysis&&p.race==='R'&&p.raceDetected){
  const label='Random: '+(races[p.raceDetected]||p.raceDetected);
  return '<span class="random-race-icon" role="img" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+raceIcon(p.raceDetected)+'<span aria-hidden="true" class="random-mark">?</span></span>';
 }
 return raceIcon(selectedRace(p));
}
function matchupIcons(players,fallback='',analysis=false){
 const teams=new Map();
 for(const p of players||[]){const team=teamNumber(p);if(!teams.has(team))teams.set(team,[]);teams.get(team).push(p);}
 const groups=teams.size?[...teams.entries()].sort((a,b)=>a[0]-b[0]).map(([,players])=>players):fallback.split('v').filter(Boolean).map(team=>[...team].map(race=>({race})));
 return '<span class="matchup-icons">'+groups.map(group=>'<span class="race-team">'+group.map(p=>playerRaceIcon(p,analysis)).join('')+'</span>').join('<span class="versus">VS</span>')+'</span>';
}
const replayMetadata=new WeakMap();
function metadata(row){let value=replayMetadata.get(row);if(!value){value={date:replayFilters.timestamp(row),map:mapDisplayName(row.map)};replayMetadata.set(row,value);}return value;}
function replayDate(row){return metadata(row).date;}
function replaySearchText(row){const value=metadata(row);return value.search??(value.search=[row.name,row.map,value.map,row.matchup,row.chatSearch,...row.players.map(p=>p.name)].join(' ').toLowerCase());}
// where a game was played: the W3Champions or Battle.net icon, named on hover
function sourceIcon(source,className){
 if(source==='w3c')return '<img class="'+className+'" src="artwork/w3champions.png" alt="W3Champions" title="Played on W3Champions">';
 if(source==='bnet')return '<img class="'+className+'" src="artwork/battlenet.png" alt="Battle.net" title="Played on Battle.net">';
 return '';
}

function teamNumber(p){return Number(p.teamid??p.team??0);}
function teamColumns(container,players){
 const teams=new Map();
 for(const id of [...new Set(players.map(teamNumber))].sort((a,b)=>a-b)){
  const column=document.createElement('div');column.className='team-column';column.dataset.team=id;
  column.setAttribute('aria-label','Team '+(id+1));container.append(column);teams.set(id,column);
 }
 return teams;
}
function mapPreview(file,className=''){
 const label=mapDisplayName(file)||'Map';const src=mapImage(file);
 return '<img class="map-preview '+className+'" src="'+esc(src||'maps/unavailable.svg')+'" alt="'+esc(src?label+' minimap':'Map preview unavailable')+'" title="'+esc(src?label:'Map preview unavailable for '+label)+'" width="56" height="56">';
}

// (a line may wrap after each backslash rather than inside a folder name)
function folderLabel(value){$('folder-setting').innerHTML=value?esc(value).replace(/\\/g,'\\<wbr>'):'None chosen yet';}
function status(p){
  if(p.directories){replayDirectories=p.directories;scheduleList();}
  if(p.busy===false&&p.folderErrors){const error=$('folder-settings-error');error.textContent=p.folderErrors.map(e=>e.path+': '+e.message).join('\n');error.hidden=!p.folderErrors.length;}
  if(p.busy===false&&selected&&!rows.has(selected))deselectReplay();
  if(p.error){$('status').textContent=p.error;return;}
  $('status').textContent=p.busy
    ? 'Indexing '+(p.done||0)+' / '+(p.total||0)+' · '+(p.cached||0)+' cached'
    : (p.total||0)+' replays indexed';  // all of them; the count beside "Replays" is after the filters
}
let listPointerHeld=false,lastListInteraction=0;
$('replay-list').addEventListener('pointerdown',()=>{listPointerHeld=true;lastListInteraction=performance.now();});
window.addEventListener('pointerup',()=>{listPointerHeld=false;lastListInteraction=performance.now();});
window.addEventListener('pointercancel',()=>{listPointerHeld=false;});window.addEventListener('blur',()=>{listPointerHeld=false;});
function scheduleList(delay=250){if(renderTimer)return;renderTimer=setTimeout(()=>{renderTimer=null;if(listPointerHeld||performance.now()-lastListInteraction<150){scheduleList(150);return;}renderList();},delay);}
const detailedReplayCards=new Map();
function reconcileReplayCards(container,cards){
 let cursor=container.firstChild;
 for(const card of cards){if(card===cursor){cursor=cursor.nextSibling;}else container.insertBefore(card,cursor);}
 while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
}
function replayPlayerNames(players){
 const teams=new Map();
 for(const player of players){const team=teamNumber(player);if(!teams.has(team))teams.set(team,[]);teams.get(team).push(player);}
 return [...teams.entries()].sort((a,b)=>a[0]-b[0]).map(([,team])=>'<span class="row-player-team">'+team.map(p=>'<span class="row-player '+raceColorClass(p)+'">'+esc(p.name.split('#')[0])+'</span>').join(' ')+'</span>').join('<span class="versus"> VS </span>');
}
function renderList(){
 if(listPointerHeld){scheduleList(150);return;}
 clearTimeout(renderTimer);renderTimer=null;
 const term=$('search').value.toLowerCase(),filter=$('filter').value;
 const source=$('source').value;
 const query=JSON.stringify([term,filter,annotationFilterEnabled('only-notes'),annotationFilterEnabled('only-favorites'),$('hide-duplicates').checked,$('sort').value,$('team-size').value,$('matchup-left').value,$('matchup-right').value,source,[...patchFilter].sort()]);if(query!==listQuery){listQuery=query;listPage=0;restoredReplayReveal=null;droppedReplayKey=null;}
 const favorites=annotationFilterEnabled('only-favorites'),notes=annotationFilterEnabled('only-notes');
 let list=[...rows.values()].filter(r=>r.key===droppedReplayKey||(!favorites&&!notes||favorites&&annotationFor(r).favorite||notes&&annotationFor(r).notes.trim().length>0)&&(filter==='all'||filter==='errors'&&r.error||filter==='matches'&&!r.error&&r.duration>=120000)&&
 ($('team-size').value==='any'||replayFilters.teamSize(r.players)===$('team-size').value)&&(source==='any'||(r.source||'other')===source)&&(!patchFilter.size||patchFilter.has(r.version))&&replayFilters.matchup(r.players,$('matchup-left').value,$('matchup-right').value)&&
 (!term||replaySearchText(r).includes(term)||annotationFor(r).notes.toLowerCase().includes(term)));
 const sort=$('sort').value,newestFirst=(a,b)=>replayDate(b)-replayDate(a)||b.name.localeCompare(a.name);
 list.sort(sort==='oldest'?(a,b)=>replayDate(a)-replayDate(b)||a.name.localeCompare(b.name):
  sort==='map'?(a,b)=>mapDisplayName(a.map).localeCompare(mapDisplayName(b.map)):
  sort==='longest'?(a,b)=>(b.duration||0)-(a.duration||0)||newestFirst(a,b):
  sort==='shortest'?(a,b)=>(a.duration||0)-(b.duration||0)||newestFirst(a,b):newestFirst);
 const copies=replayFilters.duplicateGroups(rows.values());
 const duplicateCount=[...copies.values()].reduce((total,group)=>total+group.length-1,0);
 $('duplicate-summary').textContent=duplicateCount+' duplicate '+(duplicateCount===1?'file':'files')+' across '+copies.size+' '+(copies.size===1?'replay':'replays')+'. Identical files appear once when hidden. No files are deleted.';
 if($('hide-duplicates').checked)list=replayFilters.uniqueReplays(list,[droppedReplayKey,selected,pendingReplayRestore]);
 filteredReplayList=list;
 if(restoredReplayReveal===selected){const index=list.findIndex(r=>r.key===selected);if(index>=0)listPage=Math.floor(index/listPageSize);}
 $('count').textContent=list.length;
 const pages=Math.max(1,Math.ceil(list.length/listPageSize));listPage=Math.min(listPage,pages-1);
 $('library-paging').hidden=$('compact-replays').checked||pages===1;$('library-page').textContent=(listPage+1)+' / '+pages+' · Replays '+(list.length?listPage*listPageSize+1:0)+'–'+Math.min((listPage+1)*listPageSize,list.length);
 $('library-prev').disabled=listPage===0;$('library-next').disabled=listPage===pages-1;
 const fragment=document.createDocumentFragment();
 // the clock of the match header's game length, before each replay's duration
 const CLOCK_ICON='<svg class="duration-clock" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';
 function replayCard(r){
   const classic=$('compact-replays').checked,signature=annotationFor(r).notes+'|'+(copies.get(r.contentHash)?.length||0),cached=detailedReplayCards.get(r.key);
   if(!classic&&cached?.row===r&&cached.signature===signature){const button=cached.card.querySelector('.replay-row');button.classList.toggle('active',r.key===selected);button.setAttribute('aria-pressed',String(r.key===selected));return cached.card;}
   const button=document.createElement('button');button.className='replay-row'+(r.players.length>4?' team-match':'')+(r.players.length>4?' large-match':'')+(r.key===selected?' active':'');button.dataset.key=r.key;
   button.setAttribute('aria-pressed',String(r.key===selected));
   button.draggable=true;
   if(classic)button.oncontextmenu=event=>{event.preventDefault();openReplayRename(r.key);};
   button.ondragstart=event=>{
    event.preventDefault();clearReplayDrop();listPointerHeld=false;
    window.replays.dragReplayFile(r.key).catch(showError);
   };
   const stamp=replayFilters.dateLabel(r);
   button.innerHTML=mapPreview(r.map,'row-map')+'<span class="row-copy"><span class="row-top"><span class="row-title"><strong>'+esc(r.error?'Unable to parse':mapDisplayName(r.map)||'Untitled match')+'</strong>'+sourceIcon(r.source,'row-source')+(annotationFor(r).notes?'<span class="replay-note-indicator" title="'+esc(annotationFor(r).notes.slice(0,500))+'" aria-label="Has notes">▤</span>':'')+'</span><span class="length">'+(r.error?'!':CLOCK_ICON+time(r.duration))+'</span></span>'+
   '<span class="row-players">'+(r.players.length?replayPlayerNames(r.players):esc(r.name))+'</span>'+
   '<span class="row-meta"><span>'+esc(stamp)+'</span>'+matchupIcons(r.players,r.matchup)+'</span></span>';
   button.onclick=()=>selectReplay(r.key);button.ondblclick=()=>window.replays.play(r.key).catch(showError);button.title='Drag to share replay · Double-click to watch in Warcraft III';const group=copies.get(r.contentHash);if(group)button.title+='\n'+group.length+' identical copies:\n'+group.slice(0,10).map(copy=>copy.file).join('\n')+(group.length>10?'\n…':'');
   const card=document.createElement('div');card.className='replay-card';const star=document.createElement('button');star.className='favorite-toggle';star.dataset.favoriteKey=r.key;star.onclick=event=>{event.stopPropagation();saveReplayAnnotation(r.key,{favorite:!annotationFor(r).favorite}).catch(()=>{});};star.ondblclick=event=>event.stopPropagation();
   if($('compact-replays').checked){
    card.classList.add('compact-replay-card');button.classList.add('compact-replay-row');
    button.innerHTML='<img class="filename-icon compact-replay-icon" src="artwork/replay.png" alt="" aria-hidden="true" width="16" height="16" draggable="false"><span class="compact-replay-name">'+esc(r.name)+'</span>'+(annotationFor(r).notes.trim()?'<span class="replay-note-indicator" title="'+esc(annotationFor(r).notes.slice(0,500))+'" aria-label="Has notes">▤</span>':'');
    button.title=r.name+'\nRight-click or press F2 to rename\n'+button.title;card.append(button,star);return card;
   }
   const actions=document.createElement('span');actions.className='replay-card-actions';const duration=button.querySelector('.length');const spacer=duration.cloneNode(true);spacer.classList.add('duration-spacer');spacer.setAttribute('aria-hidden','true');duration.replaceWith(spacer);const note=button.querySelector('.replay-note-indicator');if(note){card.classList.add('has-note');note.onclick=()=>selectReplay(r.key);actions.append(note);}actions.append(star,duration);card.append(button,actions);detailedReplayCards.set(r.key,{row:r,signature,card});return card;
 }
 const classic=$('compact-replays').checked,pageRows=list.slice(listPage*listPageSize,(listPage+1)*listPageSize);
 if(classic)renderClassicTree(fragment,list,replayCard);
 if(!list.length&&!$('compact-replays').checked){const p=document.createElement('p');p.className='empty-note';p.textContent='No replays match this view.';fragment.append(p);}
 if(!classic&&list.length)reconcileReplayCards($('replay-list'),pageRows.map(replayCard));else $('replay-list').replaceChildren(fragment);
 const visibleKeys=new Set(classic?[]:pageRows.map(r=>r.key));for(const key of detailedReplayCards.keys())if(!visibleKeys.has(key))detailedReplayCards.delete(key);
 refreshFavoriteButtons();
 if(restoredReplayReveal===selected)$('replay-list').querySelector('.replay-row.active')?.scrollIntoView({block:'nearest'});
}
// Native disclosures provide keyboard-accessible, lazily rendered folder navigation.
const expandedReplayFolders=new Set();
try{for(const path of JSON.parse(localStorage.getItem('classic-expanded-folders')||'[]'))expandedReplayFolders.add(path);}catch{}
function renderClassicTree(container,list,makeCard){
 const tree=replayTree.build(configuredReplayFolders,list,replayDirectories);
 const hideEmpty=$('hide-empty-folders').checked;
 const reveal=restoredReplayReveal===selected?rows.get(selected):null;
 const revealPath=reveal?replayTree.key(reveal.file):'';
 function appendFolder(parent,node,isRoot=false){
  if(hideEmpty&&node.count===0)return;
  const id=replayTree.key(node.path),empty=node.count===0,details=document.createElement('details'),summary=document.createElement('summary');
  details.className='classic-folder';summary.className='classic-folder-heading';summary.title=node.path+'\nRight-click to open in File Explorer';
  if(empty){
   const reason='Cannot expand: no replays in this folder or its subfolders match the current view.';
   summary.setAttribute('aria-disabled','true');summary.setAttribute('aria-description',reason);
   summary.title=node.path+'\n'+reason+'\nRight-click to open in File Explorer';
   summary.onclick=event=>event.preventDefault();
   summary.onkeydown=event=>{if(event.key==='Enter'||event.key===' ')event.preventDefault();};
  }
  summary.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();window.replays.openReplayFolder(node.path).catch(showError);};
  const label=document.createElement('span');label.textContent=isRoot?node.path.replace(/\//g,'\\'):node.name;summary.append(label);details.append(summary);parent.append(details);
  if(revealPath.startsWith(id+'/')||($('search').value.trim()||annotationFilterEnabled('only-favorites')||annotationFilterEnabled('only-notes'))&&node.count)expandedReplayFolders.add(id);
  let loaded=false;
  function load(){
   if(empty||loaded)return;loaded=true;if(!node.children.size&&!node.replays.length)return;
   const contents=document.createElement('div');contents.className='classic-folder-contents';details.append(contents);
   for(const child of replayTree.sortedChildren(node))appendFolder(contents,child);
   let shown=0;const more=document.createElement('button');more.className='classic-show-more';
   function batch(){const end=Math.min(node.replays.length,shown+100);for(;shown<end;shown++)contents.insertBefore(makeCard(node.replays[shown]),more);more.hidden=shown>=node.replays.length;more.textContent='Show more replays ('+(node.replays.length-shown)+' remaining)';refreshFavoriteButtons();}
   contents.append(more);batch();more.onclick=batch;
   if(reveal){const index=node.replays.findIndex(r=>r.key===reveal.key);while(shown<=index)batch();}
  }
  details.open=!empty&&expandedReplayFolders.has(id);if(details.open)load();
  details.ontoggle=()=>{if(!details.isConnected)return;if(empty){details.open=false;return;}if(details.open){expandedReplayFolders.add(id);load();}else expandedReplayFolders.delete(id);localStorage.setItem('classic-expanded-folders',JSON.stringify([...expandedReplayFolders]));};
 }
 for(const node of tree)appendFolder(container,node,true);
}
async function selectReplay(key,restoring=false,keyboard=false){
 const token=++request,start=performance.now();
 if(!restoring&&selected&&selected!==key&&(annotationPending.size||annotationJobs.size)){try{await window.flushReplayNotes();}catch{return;}}
 pendingReplayRestore=null;if(!restoring)restoredReplayReveal=null;
 if(token!==request)return;selected=key;
 localStorage.setItem('selected-replay',key);
 document.querySelectorAll('.replay-row.active').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
 let selectedButton=[...document.querySelectorAll('.replay-row')].find(b=>b.dataset.key===key);
 if(keyboard&&!selectedButton){restoredReplayReveal=key;renderList();restoredReplayReveal=null;selectedButton=$('replay-list').querySelector('.replay-row.active');}
 if(selectedButton){selectedButton.classList.add('active');selectedButton.setAttribute('aria-pressed','true');}
 if(selectedButton&&(keyboard||document.activeElement?.classList.contains('replay-row'))){selectedButton.focus({preventScroll:true});selectedButton.scrollIntoView({block:'nearest'});}
 try{
  const next=await window.replays.get(key);if(token!==request)return;
  entry=next;playerId=next.data?.players[0]?.id;
  if(next.error){$('detail').innerHTML='<div class="empty"><h2 class="error-title">This replay could not be read.</h2><p>'+esc(next.file)+'</p><div class="warning">'+esc(next.error)+'</div><p>Other matches remain available. Refresh to retry this file.</p></div>';return;}
  showMatch(performance.now()-start);
 }catch(e){if(token!==request)return;$('detail').innerHTML='<div class="warning">'+esc(e.message)+'</div>';}
}
function showMatch(elapsed){
 $('detail').replaceChildren($('match-template').content.cloneNode(true));
 const watch=$('watch-replay'),watchKey=selected;
 async function checkMap(){
  let available=false;try{available=await window.replays.mapAvailable(watchKey);}catch{}
  if(!watch.isConnected||selected!==watchKey)return;
  watch.disabled=!available;watch.title=available?'Watch this replay in Warcraft III':'The map file was not found on your computer.';
 }
 watch.onclick=async()=>{watch.disabled=true;try{await window.replays.play(watchKey,true);}catch(e){showError(e);}finally{await checkMap();}};
 checkMap();
 const r=entry.data;
 $('map').onclick=()=>window.replays.revealMap(selected).catch(showError);
 $('map').textContent=mapDisplayName(r.map.file)||r.gamename||'Untitled match';
 $('map-preview').innerHTML=mapPreview(r.map.file);
 $('version').textContent='PATCH '+r.version+' · BUILD '+r.buildNumber;
 // where the game was played (W3Champions games are hosted by FLO, Battle.net games by Battle.net)
 const source=r.source??(r.creator==='FLO'?'w3c':r.creator==='Battle.net'?'bnet':null);
 if(source)$('version').insertAdjacentHTML('beforeend',sourceIcon(source,'source-badge'));
 // when it was played, as in the replay list
 const row=rows.get(selected);
 if(row)$('version').insertAdjacentHTML('beforeend','<span class="match-date">'+esc(replayFilters.dateLabel(row))+'</span>');
 $('filename-text').textContent=entry.file.split(/[\\/]/).pop();
 $('duration').textContent=time(r.duration);$('matchup').innerHTML=matchupIcons(r.players,r.matchup,true);
 $('filename').onclick=()=>window.replays.reveal(selected).catch(showError);
 const shareKey=selected,copyReplay=$('copy-replay-file'),shareStatus=$('replay-share-status');
 $('rename-replay').onclick=()=>openReplayRename(shareKey);
 $('filename').ondragstart=event=>{
  event.preventDefault();clearReplayDrop();
  window.replays.dragReplayFile(shareKey).catch(error=>{if(selected===shareKey)shareStatus.textContent=error.message;showError(error);});
 };
 copyReplay.onclick=async()=>{
  copyReplay.disabled=true;shareStatus.textContent='Copying replay…';
  try{await window.replays.copyReplayFile(shareKey);shareStatus.textContent='Replay copied — paste into Discord with Ctrl+V.';}
  catch(error){shareStatus.textContent=error.message;showError(error);}
  finally{copyReplay.disabled=false;}
 };

 $('show-winner').checked=showWinner;
 $('show-winner').onchange=()=>{showWinner=$('show-winner').checked;localStorage.setItem('show-winner',String(showWinner));renderPlayers();};
 bindReplayAnnotations();renderPlayers();renderTabs();renderPanel();
}
function teamLabel(player){return entry.data.players.length>2?'<span class="team">Team '+(teamNumber(player)+1)+'</span>':'';}
// same rule as player-profile.cjs: a W3Champions profile needs a full BattleTag
function hasProfile(name){return /^[^#\s\x00-\x1f]+#[0-9]+$/.test(String(name||'').trim());}
// Battle.net ladder MMR, stored in Battle.net ladder replays (W3Champions replays have none)
// (number and label styled like the APM beside it)
function mmrBadge(p){return p.mmr>0?'<span class="mmr" title="BNet MMR"><img src="artwork/battlenet.png" alt="BNet MMR" width="16" height="16"><span class="apm">'+esc(p.mmr)+'</span><span class="mmr-label">MMR</span></span>':'';}
function renderPlayers(){
 const reveal=$('show-winner')?.checked;
 const winner=entry.data.winningTeamId;
 const known=Number.isInteger(winner)&&winner>=0&&entry.data.players.some(p=>teamNumber(p)===winner);
 $('winner-status').textContent='';
 $('players').innerHTML=entry.data.players.map((p,i)=>{
  const badge=reveal&&known&&teamNumber(p)===winner?'<span class="winner-badge">WINNER</span>':'';
  // only full BattleTags (Name#1234) have a W3Champions profile; older names are plain text
  const name=hasProfile(p.name)?'<button class="player-name player-profile" title="Open '+esc(p.name)+' on W3Champions">'+esc(p.name)+badge+'</button>':'<span class="player-name">'+esc(p.name)+badge+'</span>';
  return '<div class="player '+playerColorClass(i)+(badge?' match-winner':'')+'">'+playerRaceIcon(p,true)+'<div class="player-identity">'+name+teamLabel(p)+'</div><div class="stats">'+mmrBadge(p)+'<span class="apm">'+p.apm+'</span><span>APM</span></div></div>';
 }).join('');
 const cards=[...$('players').children];$('players').replaceChildren();
 const teams=teamColumns($('players'),entry.data.players);
 const replayKey=selected;
 cards.forEach((card,i)=>{const player=entry.data.players[i],link=card.querySelector('.player-profile');if(link)link.onclick=()=>window.replays.openPlayerProfile(replayKey,player.id).catch(showError);teams.get(teamNumber(player)).append(card);});
}
function renderTabs(){
 $('tabs').innerHTML=tabs.map(t=>'<button class="'+(t===tab?'active':'')+'" aria-current="'+(t===tab?'page':'false')+'">'+esc(t==='Heroes'?'Heroes & units':t==='Buildings'?'Buildings & upgrades':t)+'</button>').join('');
 [...$('tabs').children].forEach((b,i)=>b.onclick=()=>{tab=tabs[i];localStorage.setItem('analysis-tab',tab);renderTabs();renderPanel();});
}
function title(text,note){return '<h2 class="section-title">'+esc(text)+'</h2>'+(note?'<p class="section-note">'+esc(note)+'</p>':'');}
function table(headers,body){return '<table class="data-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>';}
function pagedTable(target,headers,items,render,pageSize=100){
 let page=0;
 function draw(){
   const pages=Math.max(1,Math.ceil(items.length/pageSize));
   target.innerHTML=table(headers,items.slice(page*pageSize,(page+1)*pageSize).map(render).join(''))+
    (items.length?'':'<p class="empty-note">No recorded events.</p>')+
    (pages>1?'<div class="pagination"><button data-prev>Previous</button><span>'+items.length+' events · page '+(page+1)+' / '+pages+'</span><button data-next>Next</button></div>':'');
   if(pages>1){target.querySelector('[data-prev]').onclick=()=>{page=Math.max(0,page-1);draw();};target.querySelector('[data-next]').onclick=()=>{page=Math.min(pages-1,page+1);draw();};}
 }
 draw();
}
function renderPanel(){
 chartObservers.forEach(observer=>observer.disconnect());chartObservers=[];
 const panel=$('panel');
 panel.classList.toggle('chat-panel',tab==='Chat');
 if(tab==='Chat'){chat();return;}
 if(!entry.data.players.length){panel.innerHTML='<p class="empty-note">No active players recorded.</p>';return;}
 panel.replaceChildren();
 const comparison=document.createElement('div');comparison.className='player-comparison';
 panel.append(comparison);
 const teams=teamColumns(comparison,entry.data.players);
 const maxTeamSize=Math.max(...[...teams.keys()].map(id=>entry.data.players.filter(p=>teamNumber(p)===id).length));
 const slots=new Map([...teams.keys()].map((id,index)=>[id,{column:index%2+1,row:Math.floor(index/2)*maxTeamSize+1}]));
 for(const p of entry.data.players){
  const column=document.createElement('section');column.className='comparison-player';column.dataset.playerId=p.id;
  const slot=slots.get(teamNumber(p));column.style.gridColumn=slot.column;column.style.gridRow=slot.row++;
  if(entry.data.players.length>2){
   const heading=document.createElement('header');heading.className='comparison-heading';
   heading.innerHTML='<span class="player-race-team">'+playerRaceIcon(p,true)+'</span><h2 class="'+playerColorClass(entry.data.players.indexOf(p))+'">'+esc(p.name)+'</h2>'+teamLabel(p);
   column.append(heading);
  }
  const content=document.createElement('div');content.className='comparison-content';column.append(content);teams.get(teamNumber(p)).append(column);
  if(tab==='Heroes')heroes(p,content);
  else if(tab==='Buildings')buildingsAndUpgrades(p,content);
  else if(tab==='Items')items(p,content);
  else if(tab==='APM')apm(p,content);
  else if(tab==='Control groups')groups(p,content);
  else if(tab==='Build Order')buildOrder(p,content);

 }
}
function gameIcon(id,kind,className){
 const label=name(id),src=iconSource(id,kind);
 return src
  ? '<img data-icon-id="'+esc(id)+'" data-icon-kind="'+esc(kind)+'" class="game-icon '+className+'" src="'+esc(src)+'" alt="'+esc(label)+'" title="'+esc(label)+'" width="64" height="64">'
  : '<span class="game-icon missing-icon '+className+'" role="img" aria-label="'+esc(label)+'" title="'+esc(label)+'">?</span>';
}
function objectIcon(id,preferred){
 const icons=window.warcraftIcons||{};
 const kind=[preferred,'heroes','units','buildings','upgrades','items','abilities'].find(k=>icons[k]?.[id]);
 return gameIcon(id,kind,'object-portrait');
}

// Keep ultimate IDs aligned with the replay parser, including alternate Tinker forms.
const ultimateAbilities=new Set('AEtq AEme AEsf AEsv AOww AOeq AOre AOvd AUan AUin AUdd AUls ANef ANch ANto ANdo ANst ANrg ANg1 ANg2 ANg3 ANvc ANtm AHmt AHav AHre AHpx AHcl'.split(' '));
// Standard Warcraft command-card columns, shared by the learn menu and learned spells.
// Verified against extracted default Buttonpos/Researchbuttonpos data:
// https://github.com/clemenscodes/warcraft-hotkey-editor/blob/main/crates/warcraft-keybinds/fixtures/resolved_default_customkeys.txt
const heroAbilitySlots=new Map([
 'AHbz AHtb AHhb AHfs AEmb AEer AEst AEfk AOwk AOcl AOsh AOhw AUdc AUcs AUfn AUim ANbf ANsi ANfl ANrf ANsg ANsy ANs1 ANs2 ANs3 ANso ANhs',
 'AHwe AHtc AHds AHbn AEim AEfn AHfa AEbl AOmi AOfs AOws AOhx AUdp AUsl AUfa AUfu AUts ANdh ANba ANfa ANht ANsq ANcs ANc1 ANc2 ANc3 ANlm ANcr',
 'AHab AHbh AHad AHdr AEev AEah AEar AEsh AOcr AOsf AOae AOsw AUau AUav AUdr AUcb ANdb ANdr ANms ANca ANsw ANeg ANic ANia ANab'
].flatMap((ids,slot)=>ids.split(' ').map(id=>[id,slot])));
function orderedHeroAbilities(hero){
 const slot=id=>ultimateAbilities.has(id)?3:heroAbilitySlots.get(id)??2.5;
 return Object.entries(hero.abilities||{}).sort(([a],[b])=>slot(a)-slot(b));
}
function heroAbilityMarkup(id,level){
 const maximum=ultimateAbilities.has(id)?1:3,rank=Math.max(0,Math.min(maximum,Math.trunc(Number(level)||0)));
 const label=name(id)+', level '+rank+' of '+maximum+(maximum===1?' (ultimate)':'');
 const bars=Array.from({length:maximum},(_,i)=>'<span class="ability-rank-bar'+(i<rank?' filled':'')+'"></span>').join('');
 return '<div class="ability" role="img" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+gameIcon(id,'abilities','ability-portrait')+'<span class="ability-rank-bars" aria-hidden="true">'+bars+'</span></div>';
}
function heroExperienceMarkup(hero){
 const level=Math.max(1,Math.min(10,Math.trunc(Number(hero.minimumLevel??hero.level)||1)));
 const label='Inferred level '+level+'. Exact experience progress is unavailable; the purple fill is decorative.';
 return '<span class="hero-experience-bar" role="img" aria-label="'+esc(label)+'" title="'+esc(label)+'"><span class="hero-experience-fill" aria-hidden="true"></span><span class="hero-experience-label" aria-hidden="true">Level '+level+'</span></span>';
}
function heroes(p,root){
 root.classList.add('army-panel');
 const $=id=>id==='panel'?root:root.querySelector('[data-view="'+id+'"]');
 const knownHeroes=p.heroes.filter(h=>iconSource(h.id,'heroes'));
 const firstUnitTimes=new Map();
 for(const {id,ms} of p.units?.order||[]){if(Number.isFinite(ms)&&ms>=0&&ms<(firstUnitTimes.get(id)??Infinity))firstUnitTimes.set(id,ms);}
 const units=Object.entries(replayBuildOrder.analysis(p,buildOrderOptions()).units).sort(([a],[b])=>(firstUnitTimes.get(a)??Infinity)-(firstUnitTimes.get(b)??Infinity)||0);
 $('panel').innerHTML=
 '<div class="army-overview"><div class="army-heroes"><h3 class="mini-heading">HEROES</h3><div class="hero-grid">'+
 knownHeroes.map(h=>'<article class="hero-card" aria-label="'+esc(name(h.id))+'"><div class="hero-head">'+gameIcon(h.id,'heroes','hero-portrait')+
 '<span class="hero-identity"><span class="hero-name" title="'+esc(name(h.id))+'">'+esc(name(h.id))+'</span>'+heroExperienceMarkup(h)+'</span></div><div class="ability-icons">'+
 (orderedHeroAbilities(h).map(([id,level])=>heroAbilityMarkup(id,level)).join('')||
 '')+
 '</div></article>').join('')+'</div>'+(!p.heroes.length?'<p class="empty-note">No heroes identified.</p>':'')+
 '</div><div class="army-units"><h3 class="mini-heading">UNITS PRODUCED</h3><div class="unit-roster">'+
 units.map(([id,count])=>'<div class="unit-tile" aria-label="'+esc(name(id))+' '+count+' training orders">'+objectIcon(id,'units')+'<span class="unit-count">'+count+'</span></div>').join('')+
 '</div></div></div>';
}
function buildingsAndUpgrades(p,root){
 const tiers={hkee:'T2',hcas:'T3',ostr:'T2',ofrt:'T3',etoa:'T2',etoe:'T3',unp1:'T2',unp2:'T3'};
 const $=id=>id==='panel'?root:root.querySelector('[data-view="'+id+'"]');
 const analysis=replayBuildOrder.analysis(p,buildOrderOptions()),buildings=analysis.buildings;
 const fastExpandBuildings=new Set(['htow','ogre','etol','unpl','ugol']);
 const firstTier2=buildings.find(order=>tiers[order.id]==='T2')?.ms??Infinity;
 const isFastExpand=order=>fastExpandBuildings.has(order.id)&&order.ms>=0&&order.ms<360000&&order.ms<firstTier2;
 $('panel').innerHTML=
 '<div class="economy-overview"><section class="building-summary"><h3 class="mini-heading">BUILDINGS</h3>'+
 table(['Building','Started'],buildings.map(order=>'<tr><td><span class="building-identity">'+objectIcon(order.id,'buildings')+'<span class="building-name" title="'+esc(name(order.id))+'">'+esc(name(order.id))+'</span>'+(tiers[order.id]?'<span class="building-tier" aria-label="Tier '+tiers[order.id].slice(1)+'">'+tiers[order.id]+'</span>':'')+(isFastExpand(order)?'<span class="building-tier building-fast-expand" title="Fast expand" aria-label="Fast expand">FE</span>':'')+'</span></td><td class="time">'+time(order.ms)+'</td></tr>').join(''))+
 (!buildings.length?'<p class="empty-note">No construction recorded.</p>':'')+
 '</section><section class="upgrade-starts"><h3 class="mini-heading">UPGRADES</h3><div data-view="research-starts"></div></section></div>';
 pagedTable($('research-starts'),['Upgrade','Started'],analysis.upgrades,o=>'<tr><td>'+objectIcon(o.id,'upgrades')+'</td><td class="time">'+time(o.ms)+'</td></tr>');
}
function items(p,root){
 const $=id=>id==='panel'?root:root.querySelector('[data-view="'+id+'"]');
 const times=new Map();for(const order of p.items.order){if(!times.has(order.id))times.set(order.id,[]);times.get(order.id).push(order.ms);}
 $('panel').innerHTML=
 '<div class="box purchased-items"><h3 class="mini-heading">Purchased</h3>'+table(['Item','Orders','Purchased at'],Object.entries(p.items.summary).map(([id,count])=>'<tr><td>'+objectIcon(id)+'</td><td class="number">'+count+'</td><td><div class="purchase-times">'+(times.get(id)||[]).map(ms=>'<span class="time">'+time(ms)+'</span>').join('')+'</div></td></tr>').join(''))+'</div>';
}
function apm(p,root){
 const $=id=>id==='panel'?root:root.querySelector('[data-view="'+id+'"]');
 const duration=entry.data.duration,peak=Math.max(0,...p.apmBuckets);
 $('panel').innerHTML=
 '<div class="box"><h3 class="mini-heading">APM</h3><canvas data-view="apm-chart" width="1100" height="235" aria-label="Actions per minute chart"></canvas><div class="chart-caption"><span>0:00</span><span>'+time(duration)+'</span></div></div>'+
 '<div class="box" data-view="action-breakdown"></div>';
 const canvas=$('apm-chart');canvas.style.width='100%';canvas.style.height='235px';
 function drawChart(){
 const ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=235,dpr=window.devicePixelRatio||1;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 const max=Math.max(1,...entry.data.players.flatMap(player=>player.apmBuckets));
 ctx.font=(12+2*96/72)+'px '+getComputedStyle(canvas).fontFamily;const pad=Math.max(35,Math.ceil(ctx.measureText(String(max)).width)+10);
 for(let i=0;i<=4;i++){const y=h-25-i*(h-50)/4;ctx.strokeStyle='#2b3b4e';ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w,y);ctx.stroke();ctx.fillStyle='#93a5b9';ctx.fillText(String(Math.round(max*i/4)),0,y+4);}
 const count=Math.max(1,...entry.data.players.map(player=>player.apmBuckets.length));
 const plotWidth=w-pad-12,step=plotWidth/Math.max(1,count-1);
 ctx.strokeStyle=entry.data.players.indexOf(p)%2?'#e3bc70':'#79cfc0';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
 p.apmBuckets.forEach((v,i)=>{const x=pad+i*step,y=h-25-v/max*(h-50);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();
 ctx.fillStyle=ctx.strokeStyle;p.apmBuckets.forEach((v,i)=>{ctx.beginPath();ctx.arc(pad+i*step,h-25-v/max*(h-50),3,0,Math.PI*2);ctx.fill();});
 canvas.onmousemove=e=>{const index=Math.round((e.offsetX/canvas.clientWidth*w-pad)/step);canvas.title=index>=0&&index<p.apmBuckets.length?'Minute '+(index+1)+': '+p.apmBuckets[index]+' actions':'';};
 }
 drawChart();document.fonts.ready.then(()=>{if(canvas.isConnected)drawChart();});const observer=new ResizeObserver(drawChart);observer.observe(canvas);chartObservers.push(observer);
 const labels={assigngroup:'Assign control group',rightclick:'Right click',basic:'Basic orders',buildtrain:'Build / train / learn',ability:'Abilities and other orders',item:'Item transfer',select:'Selection',removeunit:'Remove from queue',subgroup:'Subgroup',selecthotkey:'Select control group',esc:'Escape'};
 $('action-breakdown').innerHTML='<h3 class="mini-heading">PARSER ACTION CATEGORIES</h3>'+table(['Category','Count'],Object.entries(p.actions).filter(([k,v])=>typeof v==='number').map(([k,v])=>'<tr><td>'+esc(labels[k]||k)+'</td><td class="number">'+v.toLocaleString()+'</td></tr>').join(''));
}
function members(list){
 const ids=[...new Set(list.filter(m=>m.id&&['units','heroes','buildings'].some(kind=>window.warcraftIcons[kind]?.[m.id])).map(m=>m.id))];
 return '<div class="member-icons">'+ids.map(id=>'<span class="member-icon">'+objectIcon(id)+'</span>').join('')+'</div>';
}
function groups(p,root){
 // Include every recorded assignment, not just the final membership snapshot.
 const history=new Map();
 for(const entry of p.groupHistory||[]){
  if(entry.action!=='Assign')continue;
  if(!history.has(entry.key))history.set(entry.key,[]);
  history.get(entry.key).push(...(entry.members||[]));
 }
 const $=id=>id==='panel'?root:root.querySelector('[data-view="'+id+'"]');
 $('panel').innerHTML=
 '<div class="box">'+table(['Group','Assigned','Selected',''],p.groups.filter(g=>g.assigned||g.used).sort((a,b)=>(a.key||10)-(b.key||10)).map(g=>'<tr><td><span class="keycap">'+g.key+'</span></td><td class="number">'+g.assigned+'</td><td class="number">'+g.used+'</td><td>'+members([...(history.get(g.key)||[]),...(g.members||[])])+'</td></tr>').join(''))+'</div>';
}
// Battle.net replays since Reforged record the saving player's own messages twice, a few ms apart:
// the same text from the same player in the same channel within a second is one of those copies
const DUPLICATE_CHAT_MS=1000;
function withoutDuplicateChat(messages){
 const last=new Map();
 return messages.filter(c=>{const key=c.playerId+'|'+c.mode+'|'+c.message,before=last.get(key);last.set(key,c.timeMS);return before===undefined||c.timeMS-before>=DUPLICATE_CHAT_MS;});
}
const actionButtonIcons={
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 export:'<path d="M12 16V3m-4 4 4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
 text:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'
};
function actionButtonMarkup(icon,label){
 return '<svg class="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+actionButtonIcons[icon]+'</svg><span class="button-label">'+esc(label)+'</span>';
}
function chat(){
 const fontSizes=[10,12,14,16,18,20,24];
 const savedSize=Number(localStorage.getItem('chat-font-size'));
 const fontSize=fontSizes.includes(savedSize)?savedSize:12;
 const spacingOptions=[0,1,2,3,4,6,8];
 const savedSpacing=localStorage.getItem('chat-spacing');
 const spacing=savedSpacing!==null&&spacingOptions.includes(Number(savedSpacing))?Number(savedSpacing):1;
 $('panel').innerHTML=
 '<div class="toolbar"><input id="chat-search" placeholder="Search chat…" aria-label="Search chat"><select id="chat-font-size" aria-label="Chat font size" title="Chat font size"><option value="10">Font: 10 px</option><option value="12">Font: 12 px</option><option value="14">Font: 14 px</option><option value="16">Font: 16 px</option><option value="18">Font: 18 px</option><option value="20">Font: 20 px</option><option value="24">Font: 24 px</option></select><select id="chat-spacing" aria-label="Chat vertical spacing" title="Padding above and below each message"><option value="0">Spacing: 0 px</option><option value="1">Spacing: 1 px</option><option value="2">Spacing: 2 px</option><option value="3">Spacing: 3 px</option><option value="4">Spacing: 4 px</option><option value="6">Spacing: 6 px</option><option value="8">Spacing: 8 px</option></select><select id="chat-player" aria-label="Filter chat by player"><option value="all">All players</option>'+[...new Set(entry.data.chat.map(c=>c.playerName))].map(n=>'<option>'+esc(n)+'</option>').join('')+'</select><label class="switch-toggle" title="Battle.net replays record the saving player\'s own messages twice"><input id="chat-hide-duplicates" type="checkbox" role="switch"><span class="switch-track" aria-hidden="true"></span><span>Hide duplicates</span></label><button id="chat-copy" class="action-icon-button" title="Copy the chat shown below to the clipboard">'+actionButtonMarkup('copy','Copy chat')+'</button><button id="chat-export" class="action-icon-button" title="Save the chat shown below as a text file">'+actionButtonMarkup('export','Export chat')+'</button></div><div id="chat-log" class="box"></div>';
 let shown=[];
 // the messages shown below as plain text: the match on the first line, then one message per line
 const chatText=()=>{
  const row=rows.get(selected);
  const head=[$('map').textContent,row?replayFilters.dateLabel(row):'',entry.file.split(/[\\/]/).pop()].filter(Boolean).join(' · ');
  return [head,'',...shown.map(c=>time(c.timeMS).padStart(5,'0')+'  ['+(c.mode==='Obervers'?'Observers':c.mode)+'] '+c.playerName+': '+c.message)].join('\r\n')+'\r\n';
 };
 // the button says what happened for a moment, then returns to its label
 const flash=(button,text)=>{const target=button.querySelector('.button-label'),label=button.dataset.label||(button.dataset.label=target.textContent);target.textContent=text;clearTimeout(button.flashTimer);button.flashTimer=setTimeout(()=>{target.textContent=label;},2000);};
 $('chat-copy').onclick=async()=>{try{await window.replays.copyText(chatText());flash($('chat-copy'),'Copied');}catch(e){showError(e);}};
 $('chat-export').onclick=async()=>{try{if(await window.replays.exportChat(selected,chatText()))flash($('chat-export'),'Saved');}catch(e){showError(e);}};
 $('chat-hide-duplicates').checked=localStorage.getItem('chat-hide-duplicates')!=='0';
 $('chat-hide-duplicates').onchange=()=>{localStorage.setItem('chat-hide-duplicates',$('chat-hide-duplicates').checked?'1':'0');draw();};
 function draw(){
  const q=$('chat-search').value.toLowerCase(),who=$('chat-player').value;
  const messages=shown=($('chat-hide-duplicates').checked?withoutDuplicateChat(entry.data.chat):entry.data.chat).filter(c=>(who==='all'||who===c.playerName)&&(c.message+' '+c.playerName).toLowerCase().includes(q));
  $('chat-log').innerHTML=messages.map(c=>'<div class="chat-row"><span class="time">'+time(c.timeMS).padStart(5,'0')+'</span><span class="muted">'+esc(c.mode==='Obervers'?'Observers':c.mode)+'</span><span class="speaker '+playerColorClass(entry.data.players.findIndex(p=>p.id===c.playerId||p.name===c.playerName))+'">'+esc(c.playerName)+'</span><span class="message">'+esc(c.message)+'</span></div>').join('')||(entry.data.chat.length?'<p class="empty-note">No chat messages match this view.</p>':'');
 }
 $('chat-font-size').value=String(fontSize);
 const applyFontSize=()=>{$('chat-log').style.setProperty('--chat-font-size',$('chat-font-size').value+'px');};
 $('chat-font-size').onchange=()=>{localStorage.setItem('chat-font-size',$('chat-font-size').value);applyFontSize();};
 applyFontSize();
 $('chat-spacing').value=String(spacing);
 const applySpacing=()=>{$('chat-log').style.setProperty('--chat-spacing',$('chat-spacing').value+'px');};
 $('chat-spacing').onchange=()=>{localStorage.setItem('chat-spacing',$('chat-spacing').value);applySpacing();};
 applySpacing();
 $('chat-search').oninput=draw;$('chat-player').onchange=draw;draw();
}
function showError(e){$('status').textContent=e.message||String(e);}
$('w3c-profile').onclick=e=>{e.preventDefault();window.replays.openProfile().catch(showError);};
for(const id of ['app-website-title','app-website-icon'])$(id).onclick=e=>{e.preventDefault();window.replays.openWebsite().catch(showError);};
$('folder-setting').onclick=()=>window.replays.openFolder().catch(showError);  // opens it in File Explorer (or asks for one)
$('reforged-icons').checked=reforgedIcons;
$('reforged-icons').onchange=()=>{
 reforgedIcons=$('reforged-icons').checked;
 localStorage.setItem('reforged-icons',String(reforgedIcons));
 document.querySelectorAll('img[data-icon-id]').forEach(img=>{img.src=iconSource(img.dataset.iconId,img.dataset.iconKind);});
};
let configuredReplayFolders=[],replayDirectories=[];
function renderReplayFolders(){
 const list=$('replay-folders-list');
 list.innerHTML=configuredReplayFolders.map((location,index)=>'<div class="replay-folder-card'+(location.enabled?'':' folder-disabled')+'"><div class="replay-folder-title"><button type="button" class="folder-path replay-folder-path" data-open-folder="'+index+'" title="Open this folder in File Explorer">'+esc(location.path)+'</button>'+(index===0?'<span class="primary-folder-label">Primary</span>':'')+'</div><div class="replay-folder-actions"><label class="switch-toggle"><input type="checkbox" role="switch" data-folder="'+index+'" data-setting="enabled" aria-label="Enable '+esc(location.path)+'" '+(location.enabled?'checked':'')+'><span class="switch-track" aria-hidden="true"></span><span>Enabled</span></label><label class="switch-toggle"><input type="checkbox" role="switch" data-folder="'+index+'" data-setting="includeSubfolders" aria-label="Include subfolders in '+esc(location.path)+'" '+(location.includeSubfolders?'checked':'')+'><span class="switch-track" aria-hidden="true"></span><span>Subfolders</span></label><button type="button" data-remove-folder="'+index+'" aria-label="Remove '+esc(location.path)+' from the library">Remove</button></div></div>').join('')||'<p class="settings-note">No replay folders. Add a folder to start indexing.</p>';
}
function applyFolderSettings(data){
 if(data.directories)replayDirectories=data.directories;
 configuredReplayFolders=data.replayFolders|| (data.folder?[{path:data.folder,enabled:true,includeSubfolders:data.includeSubfolders!==false}]:[]);
 folderLabel(data.folder);$('include-subfolders').checked=data.includeSubfolders!==false;$('include-subfolders').disabled=!configuredReplayFolders.length;
 renderReplayFolders();scheduleList();
}
async function changeReplayFolders(action){
 const error=$('folder-settings-error');error.hidden=true;
 $('add-replay-folder').disabled=true;
 $('replay-folders-list').querySelectorAll('input,button').forEach(control=>control.disabled=true);
 try{await action();}catch(e){error.textContent=e.message||String(e);error.hidden=false;}
 finally{$('add-replay-folder').disabled=false;renderReplayFolders();}
}
$('add-replay-folder').onclick=()=>changeReplayFolders(()=>window.replays.addReplayFolder());
$('replay-folders-list').onchange=event=>{
 const control=event.target,location=configuredReplayFolders[Number(control.dataset.folder)];
 if(!location||!['enabled','includeSubfolders'].includes(control.dataset.setting))return;
 changeReplayFolders(()=>window.replays.updateReplayFolder(location.path,{[control.dataset.setting]:control.checked}));
};
$('replay-folders-list').onclick=event=>{
 const open=event.target.closest('[data-open-folder]');
 if(open){const location=configuredReplayFolders[Number(open.dataset.openFolder)];if(location)window.replays.openReplayFolder(location.path).catch(showError);return;}
 const button=event.target.closest('[data-remove-folder]');if(!button)return;
 const location=configuredReplayFolders[Number(button.dataset.removeFolder)];
 if(location)changeReplayFolders(()=>window.replays.removeReplayFolder(location.path));
};
window.replays.on('folders-changed',applyFolderSettings);
$('include-subfolders').onchange=async()=>{const control=$('include-subfolders'),enabled=control.checked;control.disabled=true;try{await window.replays.setSubfolders(enabled);}catch(e){control.checked=!enabled;showError(e);}finally{control.disabled=false;}};
$('choose').onclick=()=>window.replays.chooseFolder().catch(showError);

$('library-prev').onclick=()=>{restoredReplayReveal=null;listPage=Math.max(0,listPage-1);renderList();$('replay-list').scrollTop=0;};
$('library-next').onclick=()=>{restoredReplayReveal=null;listPage++;renderList();$('replay-list').scrollTop=0;};
// Restore controls before the first library render; save immediately on edits.
// Patch menu: one tick box per patch found in the library (newest first, with its builds and replay count)
function comparePatch(a,b){const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d;}return 0;}
function libraryPatches(){
 const found=new Map();
 for(const r of rows.values()){
  if(r.error||!r.version)continue;
  const p=found.get(r.version)||{version:r.version,replays:0,builds:new Set()};
  p.replays++;if(r.build)p.builds.add(r.build);found.set(r.version,p);
 }
 return [...found.values()].sort((a,b)=>comparePatch(b.version,a.version));
}
function patchLabel(){
 const ticked=[...patchFilter].sort((a,b)=>comparePatch(b,a));
 $('patch-button').textContent=!ticked.length?'All patches':ticked.length<=2?ticked.join(', '):ticked.length+' patches';
}
function renderPatchMenu(){
 const patches=libraryPatches();
 $('patch-menu').innerHTML=patches.length?'<button type="button" class="patch-all">All patches</button>'+patches.map(p=>{
  const builds=[...p.builds].sort((a,b)=>a-b);
  const label=builds.length>1?'builds '+builds[0]+'–'+builds.at(-1):builds.length?'build '+builds[0]:'';
  return '<label class="patch-option"><input type="checkbox" value="'+esc(p.version)+'"'+(patchFilter.has(p.version)?' checked':'')+'><span>'+esc(p.version)+'</span><small>'+label+' · '+p.replays.toLocaleString()+'</small></label>';
 }).join(''):'<p class="empty-note">No replays indexed yet.</p>';
}
function closePatchMenu(){$('patch-menu').hidden=true;$('patch-button').setAttribute('aria-expanded','false');}
function savePatches(){try{localStorage.setItem('library-patches',JSON.stringify([...patchFilter]));}catch{}patchLabel();renderList();}
$('patch-button').onclick=event=>{
 event.stopPropagation();
 if(!$('patch-menu').hidden){closePatchMenu();return;}
 renderPatchMenu();$('patch-menu').hidden=false;$('patch-button').setAttribute('aria-expanded','true');
};
$('patch-menu').onclick=event=>{
 event.stopPropagation();
 if(event.target.closest('.patch-all')){patchFilter.clear();renderPatchMenu();savePatches();}
};
$('patch-menu').onchange=event=>{const box=event.target;if(box.checked)patchFilter.add(box.value);else patchFilter.delete(box.value);savePatches();};
document.addEventListener('click',()=>{if(!$('patch-menu').hidden)closePatchMenu();});
patchLabel();
// Native customizable selects preserve keyboard navigation and saved filter values.
for(const id of ['matchup-left','matchup-right','source']){
 const select=$(id);
 const button=document.createElement('button');button.type='button';
 button.append(document.createElement('selectedcontent'));
 for(const option of select.options){
  const label=option.textContent;
  option.innerHTML=(id==='source'?(sourceIcon(option.value,'race-icon')||(option.value==='any'?'<svg class="race-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M4.5 7.5h15M4.5 16.5h15"/></svg>':'<span class="race-filter-placeholder" aria-hidden="true"></span>')):(option.value==='any'?'<img class="race-icon" src="artwork/any-race.png" alt="" aria-hidden="true" width="24" height="24">':raceIcon(option.value)))+'<span class="race-filter-label">'+esc(label)+'</span>';
  const icon=option.querySelector('img');if(icon){icon.alt='';icon.removeAttribute('title');icon.setAttribute('aria-hidden','true');}
 }
 // Insert after decorating options so the initial selected value includes its icon.
 select.prepend(button);
}
for(const id of ['filter','sort','team-size','matchup-left','matchup-right','source']){
 const control=$(id),key=id==='team-size'?'team-size':'library-'+id;
 const saved=localStorage.getItem(key);
 if([...control.options].some(option=>option.value===saved))control.value=saved;
 control.onchange=()=>{
  localStorage.setItem(key,control.value);
  renderList();
 };
}
const savedSearch=localStorage.getItem('library-search');
if(savedSearch!==null)$('search').value=savedSearch;
$('search').oninput=()=>{
 localStorage.setItem('library-search',$('search').value);
 scheduleList();
};
window.replays.on('replay-renamed',({oldKey,row})=>{
 rows.delete(oldKey);rows.set(row.key,row);detailedReplayCards.delete(oldKey);
 if(droppedReplayKey===oldKey)droppedReplayKey=row.key;
 if(pendingReplayRestore===oldKey)pendingReplayRestore=row.key;
 if(selected===oldKey){++request;selected=row.key;localStorage.setItem('selected-replay',row.key);if(entry){entry={...entry,key:row.key,file:row.file};if(entry.data)showMatch(0);}}
 restoredReplayReveal=selected;renderList();restoredReplayReveal=null;
});
window.replays.on('library-reset',data=>{rows=new Map(data.rows.map(r=>[r.key,r]));applyFolderSettings(data);renderList();restoreSelectedReplay();});
window.replays.on('library-entry',row=>{rows.set(row.key,row);scheduleList();restoreSelectedReplay();});
window.replays.on('library-entries',batch=>{for(const row of batch)rows.set(row.key,row);scheduleList(750);restoreSelectedReplay();});
window.replays.on('progress',data=>{status(data);if(data.busy===false&&restoredReplayReveal){renderList();restoredReplayReveal=null;}});
window.replays.on('select-replay',openRequestedReplay);
// Check for updates: asks GitHub when pressed (and at startup when that is switched on); a newer version
// turns it into "Update to x.y.z", which downloads, checks and installs it (the app closes and starts again by itself)
let update=null,updateReset=null;
const updateButton=$('update-check');
function updateLabel(text,title){clearTimeout(updateReset);updateButton.textContent=text;if(title)updateButton.title=title;}
// after "Up to date" / a failed check, back to the plain button
function resetUpdateLabelSoon(ms){updateReset=setTimeout(()=>updateLabel('Check for updates','Look for a newer version on GitHub'),ms);}
function showLastChecked(){
 let at=null;try{at=Number(localStorage.getItem('update-last-checked'))||null;}catch{}
 $('update-last').textContent='Last checked: '+(at?replayFilters.dateLabel({modified:at},true):'never');
}
showLastChecked();
async function installUpdate(){
 updateButton.disabled=true;updateLabel('Downloading…');
 try{await window.replays.installUpdate();updateLabel('Installing…','The app closes and starts again with version '+update.version);}
 catch(e){updateLabel('Update failed · try again',e.message);updateButton.disabled=false;}
}
// the newest version on GitHub, or null when the check failed
async function checkForUpdate(){
 updateButton.disabled=true;updateLabel('Checking…');
 try{
  update=await window.replays.checkUpdate();
  try{localStorage.setItem('update-last-checked',String(Date.now()));}catch{}
  showLastChecked();
  if(update.newer){updateLabel('Update to '+update.version,'Download and install version '+update.version+' (you have '+update.current+')');updateButton.classList.add('update-ready');$('update-notes').hidden=false;}
  else{updateLabel('Up to date','Version '+update.current+' is the newest');resetUpdateLabelSoon(4000);}
  return update;
 }catch(e){updateLabel('Check failed',e.message);resetUpdateLabelSoon(6000);return null;}
 finally{updateButton.disabled=false;}
}
updateButton.onclick=()=>update?.newer?installUpdate():checkForUpdate();
// Check on startup: asked once on the first start (the switch in Settings changes it later); when it is on,
// each start looks for a newer version and asks whether to install it now
const startupSwitch=$('update-on-startup');
function startupChoice(){try{return localStorage.getItem('update-on-startup');}catch{return null;}}
function saveStartupChoice(on){startupSwitch.checked=on;try{localStorage.setItem('update-on-startup',on?'1':'0');}catch{}}
startupSwitch.checked=startupChoice()==='1';
startupSwitch.onchange=()=>saveStartupChoice(startupSwitch.checked);
// a question in the app's own style (optionally showing a folder): true for the first answer, false for
// the second one, null when closed with Escape
function ask({message,detail,folder,buttons:[yes,no]}){
 return new Promise(resolve=>{
  $('ask-title').textContent=message;$('ask-text').textContent=detail;$('ask-yes').textContent=yes;$('ask-no').textContent=no;
  $('ask-folder').textContent=folder||'';$('ask-folder').hidden=!folder;
  $('ask-backdrop').hidden=false;$('ask-yes').focus();
  // Escape answers the question here instead of reaching the page's own Escape handling
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();done(null);}};
  const done=answer=>{$('ask-backdrop').hidden=true;document.removeEventListener('keydown',onKey,true);resolve(answer);};
  document.addEventListener('keydown',onKey,true);
  $('ask-yes').onclick=()=>done(true);$('ask-no').onclick=()=>done(false);
 });
}
async function startupUpdateCheck(){
 try{
  if(startupChoice()===null)saveStartupChoice(!!await ask({message:'Check for updates when the app starts?',detail:"Thae's Replay Explorer can check for updates on startup. You can change this later in Settings and also update the application from Settings.",buttons:['Check on startup','No']}));
  if(startupChoice()!=='1')return;
  const found=await checkForUpdate();
  if(found?.newer&&await ask({message:'Version '+found.version+' is available',detail:'You have version '+found.current+'. Install it now? The app closes and starts again by itself.',buttons:['Update now','Later']}))installUpdate();
 }catch(e){console.warn('Startup update check:',e);}
}
// first start without a replay folder: offer the one found on this PC (or the folder picker), in the app's style
async function welcomeFolderQuestion(found){
 try{
  if(found){
   const answer=await ask({message:'Choose your replay folder',detail:"Thae's Replay Explorer found your Warcraft III replays here:",folder:found,buttons:['Use this folder','Choose another folder…']});
   if(answer===true)await window.replays.useWelcomeFolder();
   else if(answer===false)await window.replays.chooseFolder();
  }else if(await ask({message:'Choose your replay folder',detail:'Pick the folder where Warcraft III saves your replays. You can change it later in Settings.',buttons:['Choose folder','Later']}))await window.replays.chooseFolder();
 }catch(e){showError(e);}
}
// the startup questions one at a time: the replay folder first (first start only), then updates
async function startupQuestions(data){
 if(!data.folder)await welcomeFolderQuestion(data.welcomeFolder);
 await startupUpdateCheck();
}
window.replays.on('update-progress',p=>updateLabel(p.percent>=0?'Downloading '+p.percent+'%':'Downloading…'));
$('update-notes').onclick=()=>window.replays.openUpdateNotes().catch(showError);
window.replays.initial().then(data=>{$('app-version').textContent=data.appVersion?'v'+data.appVersion:'';rows=new Map(data.rows.map(r=>[r.key,r]));applyFolderSettings(data);if(data.select)pendingReplayRestore=requestedReplay=data.select;renderList();restoreSelectedReplay();status(data.progress);if(data.progress.busy===false)restoredReplayReveal=null;setTimeout(()=>startupQuestions(data),data.folder?1500:300);}).catch(showError);




function buildOrderOptions(){return {hideSuspectedDuplicates:localStorage.getItem('hide-build-duplicates')!=='false'};}
function buildOrder(player,root){
 const orders=replayBuildOrder.orders(player,buildOrderOptions());
 root.innerHTML='<div class="build-order-toolbar"><button class="action-icon-button" data-build-export="text">'+actionButtonMarkup('text','Save to text')+'</button><button class="action-icon-button" data-build-export="image">'+actionButtonMarkup('image','Export to image')+'</button></div><div class="build-order-list">'+(orders.map(o=>'<div class="build-order-row"><span class="time">'+replayBuildOrder.timestamp(o.ms)+'</span>'+objectIcon(o.id,o.kind)+'<span class="build-order-name" title="'+esc(name(o.id))+'">'+esc(name(o.id))+'</span>'+(o.tag?'<span class="building-tier '+(o.tag==='FE'?'building-fast-expand':'')+'" title="'+(o.tag==='FE'?'Fast expand':'Tier '+o.tag.slice(1))+'">'+o.tag+'</span>':'')+'</div>').join('')||'<p class="empty-note">No recorded orders in the first five minutes.</p>')+'</div>';
 bindBuildOrderExports(root,player);
 root.querySelectorAll('.build-order-name').forEach((label,index)=>{const order=orders[index];if(order.suspectedDuplicates){label.title+=' — Suspected repeated clicks; may include valid queued units. Turn off the filter to see each command.';}});
}
function bindBuildOrderExports(toolbar,player){
 const key=selected,data={...entry.data,players:[player]},map=mapDisplayName(data.map.file),filename=map+' - '+player.name+' - Build order';
 for(const format of ['text','image'])toolbar.querySelector('[data-build-export="'+format+'"]').onclick=async event=>{
  const button=event.currentTarget,target=button.querySelector('.button-label');button.disabled=true;const label=target.textContent;
  try{const options=buildOrderOptions(),contents=format==='text'?replayBuildOrder.text(data,map,options):await buildOrderImage(data,map,options);if(await window.replays.exportBuildOrder(key,format==='text'?'txt':'png',contents,filename))target.textContent='Saved';}
  catch(error){showError(error);}finally{button.disabled=false;setTimeout(()=>{target.textContent=label;},1800);}
 };
}
async function buildOrderImage(data,map,options=buildOrderOptions()){
 await document.fonts.ready;
 const uiFont=getComputedStyle(document.body).fontFamily,headingFont=getComputedStyle(document.documentElement).getPropertyValue('--font-heading').trim();
 const teams=new Map();for(const p of replayBuildOrder.playersByTeam(data.players)){const id=p.teamid??p.team??0;if(!teams.has(id))teams.set(id,[]);teams.get(id).push(p);}
 const groups=[...teams.values()],columns=Math.min(2,Math.max(1,groups.length)),columnWidth=570,margin=26,rowHeight=26,blocks=[];let y=100;
 for(let pair=0;pair<groups.length;pair+=2){
  const left=groups[pair],right=groups[pair+1]||[];
  for(let i=0;i<Math.max(left.length,right.length);i++){
   let height=0;
   for(const [column,p] of [left[i],right[i]].entries()){if(!p)continue;const orders=replayBuildOrder.orders(p,options);blocks.push({p,orders,x:margin+column*columnWidth,y});height=Math.max(height,48+Math.max(1,orders.length)*rowHeight);}
   y+=height+22;
  }
 }
 const canvas=document.createElement('canvas');canvas.width=margin*2+columnWidth*columns;canvas.height=Math.max(180,y+20);
 if(canvas.height>30000)throw Error('This build order is too long for one image. Use Save to text.');
 const ctx=canvas.getContext('2d');ctx.fillStyle='#0b111a';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e3bc70';ctx.font='600 24px '+headingFont;ctx.fillText('Build order',margin,36);ctx.fillStyle='#e6edf5';ctx.font='16px '+uiFont;ctx.fillText(map,margin,66);
 ctx.fillStyle='#95a5b9';ctx.font='12px '+uiFont;ctx.fillText(options.hideSuspectedDuplicates?'Suspected duplicates grouped; commands do not confirm completed units.':'Raw recorded orders',margin,86);
 const images=new Map();await Promise.all([...new Map(blocks.flatMap(b=>b.orders.map(o=>[o.kind+':'+o.id,o]))).values()].map(async o=>{const src=iconSource(o.id,o.kind)||iconSource(o.id,'heroes')||iconSource(o.id,'units');if(!src)return;const img=new Image();img.src=src;try{await img.decode();images.set(o.kind+':'+o.id,img);}catch{}}));
 const fit=(text,width)=>{let value=String(text);if(ctx.measureText(value).width<=width)return value;while(value.length&&ctx.measureText(value+'…').width>width)value=value.slice(0,-1);return value+'…';};
 for(const b of blocks){
  ctx.fillStyle='#e3bc70';ctx.font='bold 17px '+uiFont;ctx.fillText(fit(b.p.name+' · Team '+((b.p.teamid??b.p.team??0)+1),columnWidth-28),b.x,b.y+20);ctx.font='14px '+uiFont;
  if(!b.orders.length){ctx.fillStyle='#95a5b9';ctx.fillText('No recorded orders in the first five minutes.',b.x,b.y+49);}
  b.orders.forEach((o,i)=>{const top=b.y+34+i*rowHeight;ctx.fillStyle=i%2?'#121c29':'#0f1823';ctx.fillRect(b.x,top,columnWidth-22,rowHeight);ctx.fillStyle='#95a5b9';ctx.fillText(replayBuildOrder.timestamp(o.ms),b.x+7,top+18);const img=images.get(o.kind+':'+o.id);if(img)ctx.drawImage(img,b.x+59,top+2,22,22);const textX=b.x+91,label=fit((data.names[o.id]||o.id),columnWidth-(textX-b.x)-29-(o.tag?37:0));ctx.fillStyle='#e6edf5';ctx.fillText(label,textX,top+18);if(o.tag){const tagX=textX+ctx.measureText(label).width+8;ctx.fillStyle=o.tag==='FE'?'#173d2a':'#3e3420';ctx.fillRect(tagX,top+4,29,18);ctx.fillStyle=o.tag==='FE'?'#90d7a6':'#e3bc70';ctx.font='bold 11px '+uiFont;ctx.fillText(o.tag,tagX+7,top+17);ctx.font='14px '+uiFont;}});
 }
 return canvas.toDataURL('image/png');
}

let renamingReplayKey=null,renameSaving=false,renameFocus=null;
function openReplayRename(key){
 const row=rows.get(key);if(!row||$('rename-dialog').open)return;
 renamingReplayKey=key;renameFocus=document.activeElement;
 $('rename-name').value=row.file.split(/[\\/]/).pop().replace(/\.w3g$/i,'');
 $('rename-error').hidden=true;$('rename-save').disabled=false;
 $('rename-dialog').showModal();$('rename-name').focus();$('rename-name').select();
}
$('rename-cancel').onclick=()=>{if(!renameSaving)$('rename-dialog').close();};
$('rename-dialog').addEventListener('cancel',event=>{if(renameSaving)event.preventDefault();});
$('rename-dialog').addEventListener('close',()=>{renamingReplayKey=null;if(renameFocus?.isConnected)renameFocus.focus();else $('replay-list').querySelector('.replay-row.active')?.focus();});
$('rename-form').onsubmit=async event=>{
 event.preventDefault();if(renameSaving)return;renameSaving=true;$('rename-save').disabled=true;$('rename-error').hidden=true;
 try{await window.flushReplayNotes();await window.replays.renameReplay(renamingReplayKey,$('rename-name').value);$('rename-dialog').close();}
 catch(error){$('rename-error').textContent=error.message;$('rename-error').hidden=false;}
 finally{renameSaving=false;$('rename-save').disabled=false;}
};
document.addEventListener('keydown',event=>{
 if($('rename-dialog').open){event.stopImmediatePropagation();if(event.key==='Escape'){event.preventDefault();if(!renameSaving)$('rename-dialog').close();}return;}
 if(event.key!=='F2'||event.target.closest('input,textarea,select')||!$('settings').hidden||!$('ask-backdrop').hidden)return;
 const row=event.target.closest('.replay-row'),key=row?.dataset.key||selected;
 if(key){event.preventDefault();openReplayRename(key);}
},true);
