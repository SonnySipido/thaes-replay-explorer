(function(root){
 'use strict';
 const key='app-text-size',choices=Object.freeze([80,90,100,110,120,130]);
 const normalize=value=>choices.includes(Number(value))?Number(value):100;
 let percentage=100;
 try{percentage=normalize(localStorage.getItem(key));}catch{}
 function apply(){document.documentElement.style.fontSize=(16*percentage/100)+'px';}
 apply(); // restore before styles load, avoiding a flash of the default size
 root.replayTextSize={
  choices,get:()=>percentage,
  set(value){
   const next=normalize(value),changed=next!==percentage;percentage=next;apply();
   try{localStorage.setItem(key,String(percentage));}catch{}
   if(changed)document.dispatchEvent(new Event('replay-text-size-changed'));
  }
 };
})(window);
