(function(root){
 'use strict';
 const build=typeof module!=='undefined'?require('./build-order.js'):root.replayBuildOrder;
 const ICON_SIZE=28*1.3,TRACK_HEIGHT=56,PADDING=24;
 const laneTypes=[{key:'army',label:'Heroes & units',kinds:['heroes','units']},{key:'buildings',label:'Buildings',kinds:['buildings']},{key:'upgrades',label:'Upgrades',kinds:['upgrades']},{key:'items',label:'Purchases',kinds:['items']}];
 const expansionBuildings=new Set(['htow','ogre','etol','unpl','ugol']);
 const workers=new Set(['hpea','opeo','ewsp','uaco']);
 const productionBuildings=new Set(['halt','hbar','harm','hars','hgra','oalt','obar','obea','osld','otto','eate','eaom','eaoe','eaow','edos','uaod','usep','utod','uslh','ubon']);
 function savedTypes(value){
  try{const saved=JSON.parse(value);if(Array.isArray(saved)&&saved.every(key=>laneTypes.some(type=>type.key===key)))return new Set(saved);}catch{}
  return new Set(laneTypes.map(type=>type.key));
 }
 function important(event){return event.kind==='heroes'||event.kind==='buildings'&&(expansionBuildings.has(event.id)||['FE','T2','T3'].includes(event.tag));}
 function lanes(events,{merged=false,types=new Set(laneTypes.map(type=>type.key))}={}){
  const selected=laneTypes.filter(type=>types.has(type.key));
  if(!merged)return selected.map(type=>({key:type.key,label:type.label,events:events.filter(event=>type.kinds.includes(event.kind))}));
  if(!selected.length)return [];
  const kinds=new Set(selected.flatMap(type=>type.kinds));
  return [{key:'all',label:'All orders',events:events.filter(event=>kinds.has(event.kind))}];
 }
 function tracks(data,options={}){
  return (data.players||[]).map((player,index)=>({player,index,events:[
   ...build.orders(player,{...options,maxTime:Infinity}),
   ...(player.items?.order||[]).filter(o=>typeof o.id==='string'&&Number.isFinite(o.ms)&&o.ms>=0).map(o=>({...o,kind:'items'}))
  ].sort((a,b)=>a.ms-b.ms)})).sort((a,b)=>(a.player.teamid??a.player.team??0)-(b.player.teamid??b.player.team??0));
 }
 function duration(data,rows){
  let end=Number.isFinite(data.duration)&&data.duration>0?data.duration:0;
  for(const row of rows)for(const event of row.events)end=Math.max(end,event.ms);
  return Math.max(1000,end);
 }
 function position(ms,end,width){return PADDING+ms/end*Math.max(1,width-2*PADDING);}
 function layout(events,end,width,{spreadPurchases=false}={}){
  const sorted=[...events].sort((a,b)=>a.ms-b.ms);
  if(!spreadPurchases)return {events:sorted.map(event=>({event,x:position(event.ms,end,width),lane:0})),height:TRACK_HEIGHT};
  const spacing=ICON_SIZE/2,capacity=Math.max(1,Math.floor(Math.max(0,width-2*PADDING)/spacing)+1);
  const rowCount=Math.max(1,Math.ceil(sorted.length/capacity)),placed=[],rows=Array.from({length:rowCount},()=>[]);
  sorted.forEach((event,index)=>rows[index%rowCount].push({event,index}));
  for(let lane=0;lane<rowCount;lane++){
   const items=rows[lane],blocks=[];
   // Fit the closest positions with at least half an icon between centers.
   // Averaging connected collisions moves an interior group equally left/right.
   for(let i=0;i<items.length;i++){
    blocks.push({start:i,end:i,sum:position(items[i].event.ms,end,width)-i*spacing,count:1});
    while(blocks.length>1){
     const right=blocks.at(-1),left=blocks.at(-2);if(left.sum/left.count<=right.sum/right.count)break;
     blocks.splice(-2,2,{start:left.start,end:right.end,sum:left.sum+right.sum,count:left.count+right.count});
    }
   }
   const upper=width-PADDING-Math.max(0,items.length-1)*spacing;
   for(const block of blocks){
    const center=Math.max(PADDING,Math.min(upper,block.sum/block.count));
    for(let i=block.start;i<=block.end;i++)placed[items[i].index]={event:items[i].event,x:center+i*spacing,lane};
   }
  }
  return {events:placed,height:TRACK_HEIGHT+(rowCount-1)*(ICON_SIZE+8)};
 }
 function ticks(end,width){
  const target=end*90/Math.max(1,width-2*PADDING);
  const steps=[1000,5000,10000,15000,30000,60000,120000,300000,600000,1800000,3600000];
  const step=steps.find(value=>value>=target)||Math.ceil(target/3600000)*3600000;
  const values=[0];
  for(let ms=step;ms<end;ms+=step)values.push(ms);
  if(values.length>1&&position(end,end,width)-position(values.at(-1),end,width)<60)values.pop();
  values.push(end);return values;
 }
 function mount(host,data,{state={},icon,playerLabel,exportImage,exportMarkup,imageTitle,imageSubtitle,onError,...options}){
  const rows=tracks(data,options),end=duration(data,rows);
  if(!(state.visible instanceof Set))state.visible=new Set(rows.map(row=>row.index));
  if(!(state.types instanceof Set)){
   let saved;try{saved=localStorage.getItem('timeline-event-types');}catch{}
   state.types=savedTypes(saved);
  }
  if(typeof state.merged!=='boolean'){
   try{state.merged=localStorage.getItem('timeline-merge-tracks')==='true';}catch{state.merged=false;}
  }
  if(!['fit','1','2','4'].includes(state.zoom)){
   let saved;try{saved=localStorage.getItem('timeline-zoom');}catch{}
   state.zoom=['fit','1','2','4'].includes(saved)?saved:'fit';
  }
  const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const shell=element('div','match-timeline');shell.style.setProperty('--timeline-icon-size',ICON_SIZE+'px');
  const toolbar=element('div','timeline-toolbar');
  const exportButton=element('button','action-icon-button timeline-export');exportButton.type='button';exportButton.dataset.timelineExport='';exportButton.title='Save the full timeline with the selected players and event types as a PNG image';exportButton.innerHTML=exportMarkup||'<span class="button-label">Export to image</span>';
  let exporting=false,timelineTransition=null;
  exportButton.onclick=async()=>{
   if(exporting||exportButton.disabled)return;
   exporting=true;exportButton.disabled=true;
   const label=exportButton.querySelector('.button-label');
   try{if(timelineTransition)await timelineTransition.updateCallbackDone;if(disconnected)return;const contents=await root.replayTimelineImage.render(chart,{title:imageTitle,subtitle:imageSubtitle});if(await exportImage(contents))label.textContent='Saved';}
   catch(error){if(onError)onError(error);else throw error;}
   finally{exporting=false;draw();setTimeout(()=>{label.textContent='Export to image';},1800);}
  };
  const choices=element('fieldset','timeline-player-choices');choices.append(element('legend','sr-only','Player tracks'));
  for(const row of rows){
   const label=element('label','timeline-player-choice'),input=element('input');input.type='checkbox';input.checked=state.visible.has(row.index);input.dataset.timelinePlayer=String(row.index);
   const name=element('span','timeline-player-identity');name.innerHTML=playerLabel(row.player,row.index);
   label.append(input,name);choices.append(label);
   input.onchange=()=>{if(input.checked)state.visible.add(row.index);else state.visible.delete(row.index);redraw();};
  }
  const typeChoices=element('fieldset','timeline-type-choices');typeChoices.append(element('legend','sr-only','Event types'));
  for(const type of laneTypes){
   const label=element('label','timeline-type-choice'),input=element('input');input.type='checkbox';input.checked=state.types.has(type.key);input.dataset.timelineType=type.key;
   label.append(input,element('span','',type.label));typeChoices.append(label);
   input.onchange=()=>{if(input.checked)state.types.add(type.key);else state.types.delete(type.key);try{localStorage.setItem('timeline-event-types',JSON.stringify([...state.types]));}catch{}redraw();};
  }
  const mergeLabel=element('label','switch-toggle timeline-merge'),merge=element('input');merge.type='checkbox';merge.setAttribute('role','switch');merge.checked=state.merged;merge.dataset.timelineMerge='';
  const mergeTrack=element('span','switch-track');mergeTrack.setAttribute('aria-hidden','true');mergeLabel.append(merge,mergeTrack,element('span','','Merge tracks'));
  merge.onchange=()=>{state.merged=merge.checked;try{localStorage.setItem('timeline-merge-tracks',String(state.merged));}catch{}redraw();};
  const zoomLabel=element('label','timeline-zoom','Zoom '),zoom=element('select');zoom.setAttribute('aria-label','Timeline zoom');
  for(const [value,text] of [['fit','Fit match'],['1','1×'],['2','2×'],['4','4×']]){const option=element('option','',text);option.value=value;zoom.append(option);}zoom.value=state.zoom;
  zoom.onchange=()=>{state.zoom=zoom.value;try{localStorage.setItem('timeline-zoom',state.zoom);}catch{}redraw(true);};
  zoomLabel.append(zoom);toolbar.append(choices);if(exportImage)toolbar.append(exportButton);
  const optionsBar=element('div','timeline-options');optionsBar.append(typeChoices,mergeLabel,zoomLabel);
  const viewport=element('div','timeline-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Player timelines; scroll horizontally when zoomed');
  viewport.addEventListener('wheel',event=>{
   if(event.ctrlKey||!event.deltaY||Math.abs(event.deltaX)>Math.abs(event.deltaY)||viewport.scrollWidth<=viewport.clientWidth)return;
   event.preventDefault();
   const scale=event.deltaMode===1?24:event.deltaMode===2?viewport.clientWidth:1;
   viewport.scrollLeft+=event.deltaY*scale;
  },{passive:false});
  const chart=element('div','timeline-chart');viewport.append(chart);
  const empty=element('p','empty-note','Select a player to show their track.');empty.hidden=true;
  shell.append(toolbar,optionsBar,viewport,empty);host.replaceChildren(shell);
  let frame=null,lastWidth=0,disconnected=false;
  function redraw(resetScroll=false){
   const update=()=>{if(disconnected)return;draw();if(resetScroll)viewport.scrollLeft=0;};
   timelineTransition=root.replayTransitions.run('timeline',update,onError);
  }
  const kinds={units:'Training order',heroes:'Hero order',buildings:'Construction order',upgrades:'Research order',items:'Purchase order'};
  function addGrid(container,marks,width){for(const ms of marks){const line=element('span','timeline-gridline');line.style.left=position(ms,end,width)+'px';line.setAttribute('aria-hidden','true');container.append(line);}}
  function draw(){
   if(disconnected)return;
   const active=rows.filter(row=>state.visible.has(row.index));
   const hasTypes=laneTypes.some(type=>state.types.has(type.key)),showTracks=active.length>0&&hasTypes;
   exportButton.disabled=exporting||!showTracks;
   empty.textContent=active.length?'Select an event type to show its track.':'Select a player to show their tracks.';
   empty.hidden=showTracks;viewport.hidden=!showTracks;
   if(!showTracks){chart.replaceChildren();return;}
   const labelWidth=140,available=Math.max(240,viewport.clientWidth-labelWidth);
   const width=state.zoom==='fit'?available:Math.max(available,end/60000*160*Number(state.zoom)+2*PADDING);
   chart.style.width=(labelWidth+width)+'px';chart.style.setProperty('--timeline-label-width',labelWidth+'px');
   chart.replaceChildren();const marks=ticks(end,width);
   const heading=element('div','timeline-axis-row'),headingLabel=element('div','timeline-track-label','Player'),axis=element('div','timeline-axis');
   for(const ms of marks){const tick=element('span','timeline-tick',build.timestamp(ms));tick.style.left=position(ms,end,width)+'px';axis.append(tick);}
   heading.append(headingLabel,axis);chart.append(heading);
   for(const row of active){
    const track=element('section','timeline-track');track.dataset.timelineTrack=String(row.index);track.setAttribute('aria-label',row.player.name+' timeline');
    const label=element('div','timeline-track-label'),playerLanes=element('div','timeline-player-lanes');
    for(const [groupIndex,group] of lanes(row.events,{merged:state.merged,types:state.types}).entries()){
     const laneLabel=element('div','timeline-lane-label');
     if(groupIndex===0){const identity=element('div','timeline-player-identity');identity.innerHTML=playerLabel(row.player,row.index);identity.title=row.player.name;laneLabel.append(identity);}
     laneLabel.append(element('span','timeline-lane-title',group.label));label.append(laneLabel);
     const lane=element('div','timeline-lane'),placed=layout(group.events,end,width,{spreadPurchases:!state.merged&&group.key==='items'});lane.dataset.timelineLane=group.key;lane.setAttribute('aria-label',row.player.name+' · '+group.label);lane.style.height=placed.height+'px';laneLabel.style.height=placed.height+'px';addGrid(lane,marks,width);
     for(const {event,x,lane:laneIndex} of placed.events){
     const name=build.orderName(event,data.names),text=build.timestamp(event.ms)+' · '+name+' · '+kinds[event.kind]+(event.tag?' · '+event.tag:'');
     const marker=element('button','timeline-event'+(important(event)?' timeline-important':'')+(!state.merged&&event.kind==='units'&&workers.has(event.id)?' timeline-worker':'')+(!state.merged&&event.kind==='buildings'&&productionBuildings.has(event.id)?' timeline-production':''));marker.type='button';marker.dataset.time=String(event.ms);marker.dataset.kind=event.kind;marker.title=text;marker.setAttribute('aria-label',text);marker.style.left=(x-ICON_SIZE/2)+'px';marker.style.top=((TRACK_HEIGHT-ICON_SIZE)/2+laneIndex*(ICON_SIZE+8))+'px';marker.innerHTML=icon(event);
     marker.querySelectorAll('[title]').forEach(child=>child.removeAttribute('title'));lane.append(marker);
     }
     playerLanes.append(lane);
    }
    track.append(label,playerLanes);chart.append(track);
   }
  }
  const observer=new ResizeObserver(()=>{const width=viewport.clientWidth;if(width===lastWidth)return;lastWidth=width;if(frame!==null)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=null;draw();});});
  observer.observe(viewport);draw();
  return {disconnect(){disconnected=true;timelineTransition?.skipTransition();observer.disconnect();if(frame!==null)cancelAnimationFrame(frame);}};
 }
 const api={tracks,duration,layout,ticks,position,lanes,important,savedTypes,mount};if(typeof module!=='undefined')module.exports=api;else root.replayTimeline=api;
})(typeof window!=='undefined'?window:globalThis);
