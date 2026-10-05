'use strict';
function restoreWindowBounds(saved,displays,fallback){
 const areas=displays.map(d=>d.workArea);
 const valid=saved&&['x','y','width','height'].every(k=>Number.isFinite(saved[k]))&&saved.width>0&&saved.height>0;
 const overlap=a=>valid?Math.max(0,Math.min(saved.x+saved.width,a.x+a.width)-Math.max(saved.x,a.x))*Math.max(0,Math.min(saved.y+saved.height,a.y+a.height)-Math.max(saved.y,a.y)):0;
 const best=areas.reduce((a,b)=>overlap(b)>overlap(a)?b:a,fallback);
 const area=valid&&overlap(best)>0?best:fallback;
 const minWidth=Math.min(1050,area.width),minHeight=Math.min(680,area.height);
 const defaultHeight=Math.min(area.height,Math.max(680,Math.min(area.height,Math.max(970,Math.round(area.height*.92)))-150));
 const width=valid?Math.min(area.width,Math.max(minWidth,Math.round(saved.width))):Math.min(1500,area.width);
 const height=valid?Math.min(area.height,Math.max(minHeight,Math.round(saved.height))):defaultHeight;
 const visible=valid&&overlap(best)>0;
 const x=visible?Math.max(area.x,Math.min(Math.round(saved.x),area.x+area.width-width)):area.x+Math.round((area.width-width)/2);
 const y=visible?Math.max(area.y,Math.min(Math.round(saved.y),area.y+area.height-height)):area.y+Math.round((area.height-height)/2);
 return {x,y,width,height,minWidth,minHeight};
}
module.exports={restoreWindowBounds};
