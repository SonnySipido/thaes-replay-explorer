'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../ui/themes.js'),'utf8');
function load(saved,{blocked=false,migrated=false}={}){
 const values=new Map(saved===undefined?[]:[['app-theme',saved]]);if(migrated)values.set('forsaken-theme-default-v1','1');
 const events=[],document={documentElement:{dataset:{}},dispatchEvent:event=>events.push(event.type)};
 const context={window:{},document,Event,localStorage:{getItem:key=>{if(blocked)throw Error('Storage unavailable');return values.get(key);},setItem:(key,value)=>{if(blocked)throw Error('Storage unavailable');values.set(key,value);}}};
 vm.runInNewContext(source,context);return {themes:context.window.replayThemes,document,values,events};
}
test('new installs and every older theme choice move to Forsaken Kingdom before UI initialization',()=>{
 for(const saved of [undefined,'unknown','default','simple-dark','light','warcraft','grey','battlenet']){const state=load(saved);assert.equal(state.themes.get(),'warcraft');assert.equal(state.values.get('app-theme'),'warcraft');assert.equal(state.values.get('forsaken-theme-default-v1'),'1');assert.deepEqual(state.events,[]);}
});
test('after the one-time migration, later launches preserve a chosen theme',()=>{
 for(const saved of ['default','simple-dark','light','warcraft']){const first=load('light');first.themes.set(saved);const restarted=load(first.values.get('app-theme'),{migrated:first.values.get('forsaken-theme-default-v1')==='1'});assert.equal(restarted.themes.get(),saved);assert.deepEqual(restarted.events,[]);}
 for(const saved of [undefined,'unknown'])assert.equal(load(saved,{migrated:true}).themes.get(),'warcraft');
});
test('switching saves the choice and notifies canvas views only when the theme changes',()=>{
 const state=load();for(const theme of ['simple-dark','light','warcraft','default']){state.themes.set(theme);assert.equal(state.themes.get(),theme);assert.equal(load(state.values.get('app-theme'),{migrated:true}).themes.get(),theme);state.themes.set(theme);}assert.deepEqual(state.events,['replay-theme-changed','replay-theme-changed','replay-theme-changed','replay-theme-changed']);
});
test('unavailable browser storage does not stop startup or live theme switching',()=>{
 const state=load('simple-dark',{blocked:true});assert.equal(state.themes.get(),'warcraft');assert.doesNotThrow(()=>state.themes.set('light'));assert.equal(state.document.documentElement.dataset.theme,'light');assert.deepEqual(state.events,['replay-theme-changed']);
});
test('previous Battle.net and Grey choices migrate to Simple (Dark) without changing the appearance',()=>{
 for(const previous of ['battlenet','grey']){const state=load(previous,{migrated:true});assert.equal(state.themes.get(),'simple-dark');assert.equal(state.values.get('app-theme'),'simple-dark');assert.deepEqual(state.events,[]);}
});
