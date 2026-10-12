(function(root){
 'use strict';
 // Read the entire chart before awaiting images, including events outside the
 // scroll viewport. A replay or theme change during export cannot alter it.
 function snapshot(chart,{title='Timeline',subtitle=''}={}){
  const style=getComputedStyle(chart),body=getComputedStyle(document.body);
  const colors=Object.fromEntries(['bg','panel','line','text','muted','gold'].map(key=>[key,style.getPropertyValue('--'+key).trim()]));
  const labelWidth=240,width=parseFloat(chart.style.width)-parseFloat(chart.style.getPropertyValue('--timeline-label-width'));
  const sprites=node=>{
   if(!node)return [];
   const box=node.getBoundingClientRect();
   return [node,...node.querySelectorAll('img,.research-rank,.random-mark,.missing-icon')].filter(child=>child.matches('img,.research-rank,.random-mark,.missing-icon')).map(child=>{
    const rect=child.getBoundingClientRect(),css=getComputedStyle(child);
    return {src:child.tagName==='IMG'?child.src:null,text:child.tagName==='IMG'?'':child.textContent,x:rect.x-box.x,y:rect.y-box.y,width:rect.width,height:rect.height,color:css.color,background:css.backgroundColor,border:css.borderColor,borderWidth:parseFloat(css.borderWidth)||0,radius:parseFloat(css.borderRadius)||0,font:css.font};
   });
  };
  const ticks=[...chart.querySelectorAll('.timeline-tick')].map(node=>({x:parseFloat(node.style.left),text:node.textContent}));
  let height=36;
  const lanes=[],separators=[];
  for(const track of chart.querySelectorAll('.timeline-track')){
   const labels=[...track.querySelectorAll('.timeline-lane-label')];
   [...track.querySelectorAll('.timeline-lane')].forEach((lane,index)=>{
    const label=labels[index],name=label.querySelector('.timeline-name'),race=label.querySelector('.random-race-icon,.race-icon');
    const markers=[...lane.querySelectorAll('.timeline-event')].map(node=>({x:parseFloat(node.style.left),y:parseFloat(node.style.top),size:node.getBoundingClientRect().width,sprites:sprites(node),priority:node.classList.contains('timeline-important')?5:node.classList.contains('timeline-production')?3:node.classList.contains('timeline-worker')?0:1}));
    lanes.push({y:height,height:lane.getBoundingClientRect().height,label:label.querySelector('.timeline-lane-title').textContent,name:name?.textContent,color:name?getComputedStyle(name).color:colors.text,race:sprites(race),markers:markers.sort((a,b)=>a.priority-b.priority)});
    height+=lane.getBoundingClientRect().height;
   });
   const thickness=parseFloat(getComputedStyle(track).borderBottomWidth)||0;
   if(thickness)separators.push({y:height,thickness});height+=thickness;
  }
  return {title,subtitle,colors,font:body.fontFamily,heading:style.getPropertyValue('--font-heading').trim()||body.fontFamily,labelWidth,width,height,lanes,ticks,separators};
 }
 async function render(chart,options){
  const saved=snapshot(chart,options),margin=20,header=saved.subtitle?82:62;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(saved.labelWidth+saved.width+2*margin);canvas.height=Math.ceil(header+saved.height+margin);
  if(!saved.lanes.length)throw Error('Select a player and an event type to export.');
  if(canvas.width>16384||canvas.height>16384||canvas.width*canvas.height>64*1024*1024)throw Error('This timeline is too large for one image. Choose Fit match or fewer player tracks.');
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Could not create the timeline image.');
  const sources=new Set(saved.lanes.flatMap(lane=>[...lane.race,...lane.markers.flatMap(marker=>marker.sprites)]).map(sprite=>sprite.src).filter(Boolean));
  const images=new Map();
  await Promise.all([document.fonts.ready,...[...sources].map(async src=>{const image=new Image();image.src=src;try{await image.decode();images.set(src,image);}catch{}})]);
  const {colors,font,heading,labelWidth,width,height}=saved;
  function text(value,x,y,maxWidth,color,size=12,weight='normal'){
   ctx.font=weight+' '+size+'px '+font;ctx.fillStyle=color;
   let fitted=String(value);if(ctx.measureText(fitted).width>maxWidth){while(fitted.length&&ctx.measureText(fitted+'…').width>maxWidth)fitted=fitted.slice(0,-1);fitted+='…';}
   ctx.fillText(fitted,x,y);
  }
  function rounded(x,y,w,h,radius){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(radius,w/2,h/2));}
  function paint(sprites,x,y){
   for(const sprite of sprites){
    const left=x+sprite.x,top=y+sprite.y;
    ctx.save();rounded(left,top,sprite.width,sprite.height,sprite.radius);ctx.clip();
    ctx.fillStyle=sprite.background;ctx.fillRect(left,top,sprite.width,sprite.height);
    const image=images.get(sprite.src);
    if(image)ctx.drawImage(image,left,top,sprite.width,sprite.height);
    else if(sprite.text||sprite.src){ctx.font=sprite.font;ctx.fillStyle=sprite.color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sprite.text||'?',left+sprite.width/2,top+sprite.height/2);}
    ctx.restore();
    if(sprite.borderWidth){ctx.strokeStyle=sprite.border;ctx.lineWidth=sprite.borderWidth;rounded(left,top,sprite.width,sprite.height,sprite.radius);ctx.stroke();}
   }
  }
  ctx.fillStyle=colors.bg;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=colors.gold;ctx.font='600 23px '+heading;ctx.fillText(saved.title,margin,34,canvas.width-2*margin);
  if(saved.subtitle)text(saved.subtitle,margin,58,canvas.width-2*margin,colors.muted,13);
  ctx.translate(margin,header);
  ctx.fillStyle=colors.panel;ctx.fillRect(0,0,labelWidth+width,36);ctx.fillRect(0,0,labelWidth,height);
  text('Player',12,23,labelWidth-24,colors.text,13,'600');
  for(const tick of saved.ticks){ctx.font='11px '+font;ctx.fillStyle=colors.muted;ctx.textAlign='center';ctx.fillText(tick.text,labelWidth+tick.x,23);}
  ctx.textAlign='left';
  for(const lane of saved.lanes){
   ctx.fillStyle=colors.line;ctx.fillRect(0,lane.y,labelWidth+width,1);
   for(const tick of saved.ticks)ctx.fillRect(labelWidth+tick.x,lane.y,1,lane.height);
   if(lane.name){
    paint(lane.race,12,lane.y+(lane.height-40)/2);
    text(lane.name,42,lane.y+lane.height/2-3,labelWidth-54,lane.color,13,'600');
    text(lane.label,12,lane.y+lane.height/2+18,labelWidth-24,colors.muted,11);
   }else text(lane.label,12,lane.y+lane.height/2+4,labelWidth-24,colors.muted,11);
   for(const marker of lane.markers){
    const x=labelWidth+marker.x,y=lane.y+marker.y;
    ctx.fillStyle=colors.panel;rounded(x,y,marker.size,marker.size,4);ctx.fill();paint(marker.sprites,x,y);
   }
  }
  ctx.strokeStyle=colors.line;ctx.lineWidth=1;ctx.strokeRect(.5,.5,labelWidth+width-1,height-1);ctx.fillStyle=colors.line;ctx.fillRect(labelWidth,0,1,height);
  for(const separator of saved.separators)ctx.fillRect(0,separator.y,labelWidth+width,separator.thickness);
  return canvas.toDataURL('image/png');
 }
 root.replayTimelineImage={snapshot,render};
})(window);
