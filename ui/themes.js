(function(root){
 'use strict';
 const key='app-theme';
 const normalize=value=>value==='battlenet'?'battlenet':'default';
 let saved='default';try{saved=normalize(localStorage.getItem(key));}catch{}
 document.documentElement.dataset.theme=saved;
 root.replayThemes={
  get:()=>document.documentElement.dataset.theme,
  set(value){
   const theme=normalize(value),changed=theme!==this.get();
   document.documentElement.dataset.theme=theme;
   try{localStorage.setItem(key,theme);}catch{}
   if(changed)document.dispatchEvent(new Event('replay-theme-changed'));
  }
 };
})(window);
