'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../ui/themes.js'),'utf8');
function load(saved,{blocked=false}={}){
 const values=new Map(saved===undefined?[]:[['app-theme',saved]]),events=[],document={documentElement:{dataset:{}},dispatchEvent:event=>events.push(event.type)};
 const context={window:{},document,Event,localStorage:{getItem:key=>{if(blocked)throw Error('Storage unavailable');return values.get(key);},setItem:(key,value)=>{if(blocked)throw Error('Storage unavailable');values.set(key,value);}}};
 vm.runInNewContext(source,context);return {themes:context.window.replayThemes,document,values,events};
}
test('theme is restored before UI initialization; missing or invalid preferences use the original design',()=>{
 for(const saved of [undefined,'unknown','default','simple-dark','light','warcraft']){const state=load(saved);assert.equal(state.document.documentElement.dataset.theme,['simple-dark','light','warcraft'].includes(saved)?saved:'default');assert.equal(state.values.get('app-theme'),saved);assert.deepEqual(state.events,[]);}
});
test('switching saves the choice and notifies canvas views only when the theme changes',()=>{
 const state=load();for(const theme of ['simple-dark','light','warcraft','default']){state.themes.set(theme);assert.equal(state.themes.get(),theme);assert.equal(load(state.values.get('app-theme')).themes.get(),theme);state.themes.set(theme);}assert.deepEqual(state.events,['replay-theme-changed','replay-theme-changed','replay-theme-changed','replay-theme-changed']);
});
test('unavailable browser storage does not stop startup or live theme switching',()=>{
 const state=load('simple-dark',{blocked:true});assert.equal(state.themes.get(),'default');assert.doesNotThrow(()=>state.themes.set('light'));assert.equal(state.document.documentElement.dataset.theme,'light');assert.deepEqual(state.events,['replay-theme-changed']);
});
test('previous Battle.net and Grey choices migrate to Simple (Dark) without changing the appearance',()=>{
 for(const previous of ['battlenet','grey']){const state=load(previous);assert.equal(state.themes.get(),'simple-dark');assert.equal(state.values.get('app-theme'),'simple-dark');assert.deepEqual(state.events,[]);}
});
