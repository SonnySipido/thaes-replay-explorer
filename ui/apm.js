(function(root){
 'use strict';
 function series(data){return (data.players||[]).map((player,index)=>({player,index,values:Array.from(player.apmBuckets||[],value=>Number.isFinite(value)&&value>=0?value:0)})).sort((a,b)=>(a.player.teamid??a.player.team??0)-(b.player.teamid??b.player.team??0));}
 function domain(data,rows){
  let maximum=1,count=1;
  for(const row of rows){count=Math.max(count,row.values.length);for(const value of row.values)maximum=Math.max(maximum,value);}
  return {maximum,count,duration:Number.isFinite(data.duration)&&data.duration>0?data.duration:count*60000};
 }
 function valueAt(values,index){
  if(!Number.isFinite(index)||index<0||index>values.length-1)return null;
  const start=Math.floor(index),end=Math.min(values.length-1,start+1),fraction=index-start;
  return values[start]+(values[end]-values[start])*fraction;
 }
 function hover(rows,visible,scale,plot,x,y){
  if(x<plot.left-12||x>plot.right+12||y<plot.top-12||y>plot.bottom+12)return null;
  const index=Math.max(0,Math.min(scale.count-1,(x-plot.left)/plot.step));let closest=null;
  for(const row of rows){
   if(!visible.has(row.index)||!row.values.length)continue;
   const single=row.values.length===1;if(single&&Math.abs(x-plot.left)>12)continue;
   const value=valueAt(row.values,single?0:index);if(value===null)continue;
   const lineY=plot.bottom-value/scale.maximum*(plot.bottom-plot.top),distance=Math.abs(y-lineY);
   if(distance<=12&&(!closest||distance<=closest.distance))closest={row,value,index:single?0:index,x:single?plot.left:plot.left+index*plot.step,y:lineY,distance,ms:!single&&scale.count>1?index/(scale.count-1)*scale.duration:0};
  }
  return closest;
 }
 function mount(host,data,{state={},playerLabel,timestamp}){
  const rows=series(data),scale=domain(data,rows);
  if(!(state.visible instanceof Set))state.visible=new Set(rows.map(row=>row.index));
  const node=(tag,className,text)=>{const value=document.createElement(tag);value.className=className;if(text!==undefined)value.textContent=text;return value;};
  const box=node('div','box apm-chart-box'),heading=node('h3','mini-heading','APM'),choices=node('fieldset','apm-player-choices');choices.append(node('legend','sr-only','Player APM lines'));
  for(const row of rows){
   const label=node('label','apm-player-choice'),input=node('input',''),swatch=node('span','apm-line-swatch'),identity=node('span','apm-player-identity');
   input.type='checkbox';input.checked=state.visible.has(row.index);input.dataset.apmPlayer=String(row.index);swatch.setAttribute('aria-hidden','true');identity.innerHTML=playerLabel(row.player,row.index);
   label.append(input,swatch,identity);choices.append(label);row.identity=identity;row.swatch=swatch;
   input.onchange=()=>{if(input.checked)state.visible.add(row.index);else state.visible.delete(row.index);draw();};
  }
  const canvas=node('canvas','apm-chart');canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Actions per minute for all players');
  const plotHost=node('div','apm-plot'),tooltip=node('div','apm-chart-tooltip'),tooltipName=node('strong',''),tooltipValue=node('span',''),point=node('span','apm-hover-point'),guide=node('span','apm-hover-guide');
  tooltip.setAttribute('role','tooltip');tooltip.append(tooltipName,tooltipValue);tooltip.hidden=point.hidden=guide.hidden=true;point.setAttribute('aria-hidden','true');guide.setAttribute('aria-hidden','true');
  plotHost.append(canvas,guide,point,tooltip);box.append(heading,choices,plotHost);host.replaceChildren(box);
  let disconnected=false,plot;
  function hideHover(){tooltip.hidden=point.hidden=guide.hidden=true;}
  function draw(){
   if(disconnected||!canvas.isConnected||!canvas.clientWidth)return;
   const ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=canvas.clientHeight,dpr=window.devicePixelRatio||1;
   canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
   const css=getComputedStyle(document.documentElement),color=key=>css.getPropertyValue(key).trim();
   const font=getComputedStyle(canvas);ctx.font=font.fontSize+' '+font.fontFamily;
   const left=Math.max(40,Math.ceil(ctx.measureText(String(Math.ceil(scale.maximum))).width)+12),right=w-22,top=15,bottom=h-32,width=Math.max(1,right-left),height=Math.max(1,bottom-top);
   plot={left,right,top,bottom,step:width/Math.max(1,scale.count-1)};hideHover();
   ctx.lineWidth=1;ctx.strokeStyle=color('--chart-grid');ctx.fillStyle=color('--chart-label');
   for(let i=0;i<=4;i++){
    const y=bottom-i*height/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.textAlign='right';ctx.fillText(String(Math.round(scale.maximum*i/4)),left-9,y+4);
    const x=left+i*width/4;ctx.textAlign='center';ctx.fillText(timestamp(scale.duration*i/4),x,h-10);
   }
   let visible=0;
   for(const row of rows){
    const lineColor=getComputedStyle(row.identity.querySelector('.apm-player-name')).color;row.swatch.style.backgroundColor=lineColor;row.lineColor=lineColor;
    if(!state.visible.has(row.index)||!row.values.length)continue;visible++;
    ctx.strokeStyle=lineColor;ctx.fillStyle=lineColor;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
    row.values.forEach((value,index)=>{const x=left+index*plot.step,y=bottom-value/scale.maximum*height;if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();
    row.values.forEach((value,index)=>{ctx.beginPath();ctx.arc(left+index*plot.step,bottom-value/scale.maximum*height,2.5,0,Math.PI*2);ctx.fill();});
   }
   if(!visible){ctx.fillStyle=color('--chart-label');ctx.textAlign='center';ctx.fillText(state.visible.size?'No APM data recorded.':'Select a player to show their APM line.',left+width/2,top+height/2);}
   canvas.title='';canvas.setAttribute('aria-label','Actions per minute: '+rows.filter(row=>state.visible.has(row.index)).map(row=>row.player.name).join(', '));
  }
  canvas.onmousemove=event=>{
   if(!plot)return;const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,hit=hover(rows,state.visible,scale,plot,x,y);
   if(!hit){hideHover();return;}
   tooltipName.textContent=hit.row.player.name;tooltipName.style.color=hit.row.lineColor;
   const estimated=Math.abs(hit.index-Math.round(hit.index))>.001;
   tooltipValue.textContent=timestamp(hit.ms)+' · '+(estimated?'~':'')+Math.round(hit.value)+' APM';tooltip.hidden=point.hidden=guide.hidden=false;
   point.style.left=hit.x+'px';point.style.top=hit.y+'px';point.style.color=hit.row.lineColor;guide.style.left=hit.x+'px';guide.style.top=plot.top+'px';guide.style.height=(plot.bottom-plot.top)+'px';guide.style.color=hit.row.lineColor;
   const tipWidth=tooltip.offsetWidth,tipHeight=tooltip.offsetHeight;
   let left=x+14;if(left+tipWidth>canvas.clientWidth-4)left=x-tipWidth-14;
   let top=y-tipHeight-12;if(rect.top+top<8)top=y+12;
   tooltip.style.left=Math.max(4,Math.min(canvas.clientWidth-tipWidth-4,left))+'px';
   const minimum=Math.max(4,8-rect.top),maximum=Math.min(canvas.clientHeight-tipHeight-4,window.innerHeight-rect.top-tipHeight-8);
   tooltip.style.top=Math.max(minimum,Math.min(maximum,top))+'px';
  };
  canvas.onmouseleave=hideHover;
  const observer=new ResizeObserver(draw);observer.observe(canvas);document.addEventListener('replay-theme-changed',draw);document.addEventListener('replay-text-size-changed',draw);draw();document.fonts.ready.then(draw);
  return {disconnect(){disconnected=true;observer.disconnect();document.removeEventListener('replay-theme-changed',draw);document.removeEventListener('replay-text-size-changed',draw);}};
 }
 const api={series,domain,valueAt,hover,mount};if(typeof module!=='undefined')module.exports=api;else root.replayAPM=api;
})(typeof window!=='undefined'?window:globalThis);
