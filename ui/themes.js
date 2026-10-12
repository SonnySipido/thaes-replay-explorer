(function(root){
 'use strict';
 const key='app-theme';
 const normalize=value=>value==='battlenet'||value==='grey'?'simple-dark':['simple-dark','light','warcraft'].includes(value)?value:'default';
 let saved='default';try{const value=localStorage.getItem(key);saved=normalize(value);if(value==='battlenet'||value==='grey')localStorage.setItem(key,saved);}catch{}
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
