(function(root){
 'use strict';
 const key='app-theme';
 const defaultTheme='warcraft',migrationKey='forsaken-theme-default-v1';
 const normalize=value=>value==='battlenet'||value==='grey'?'simple-dark':['default','simple-dark','light','warcraft'].includes(value)?value:defaultTheme;
 let saved=defaultTheme;
 try{
  if(localStorage.getItem(migrationKey)!=='1'){
   // The first launch with this release moves existing installs to Forsaken
   // Kingdom once. Later launches preserve whichever theme the user chooses.
   localStorage.setItem(key,defaultTheme);localStorage.setItem(migrationKey,'1');
  }else{
   const value=localStorage.getItem(key);saved=normalize(value);
   if(value==='battlenet'||value==='grey')localStorage.setItem(key,saved);
  }
 }catch{}
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
