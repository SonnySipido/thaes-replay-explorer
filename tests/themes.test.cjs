'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../ui/themes.js'),'utf8');
function load(saved,{blocked=false}={}){
 const values=new Map(saved===undefined?[]:[['app-theme',saved]]),events=[],document={documentElement:{dataset:{}},dispatchEvent:event=>events.push(event.type)};
 const context={window:{},document,Event,localStorage:{getItem:key=>{if(blocked)throw Error('Storage unavailable');return values.get(key);},setItem:(key,value)=>{if(blocked)throw Error('Storage unavailable');values.set(key,value);}}};
 vm.runInNewContext(source,context);return {themes:context.window.replayThemes,document,values,events};
}
test('theme is restored before UI initialization; missing or invalid preferences use the original design',()=>{
 for(const saved of [undefined,'unknown','default','battlenet']){const state=load(saved);assert.equal(state.document.documentElement.dataset.theme,saved==='battlenet'?'battlenet':'default');assert.equal(state.values.get('app-theme'),saved);assert.deepEqual(state.events,[]);}
});
test('switching saves the choice and notifies canvas views only when the theme changes',()=>{
 const state=load();state.themes.set('battlenet');assert.equal(state.themes.get(),'battlenet');assert.equal(load(state.values.get('app-theme')).themes.get(),'battlenet');state.themes.set('battlenet');assert.deepEqual(state.events,['replay-theme-changed']);state.themes.set('default');assert.equal(state.values.get('app-theme'),'default');assert.equal(state.themes.get(),'default');assert.equal(state.events.length,2);
});
test('unavailable browser storage does not stop startup or live theme switching',()=>{
 const state=load('battlenet',{blocked:true});assert.equal(state.themes.get(),'default');assert.doesNotThrow(()=>state.themes.set('battlenet'));assert.equal(state.document.documentElement.dataset.theme,'battlenet');assert.deepEqual(state.events,['replay-theme-changed']);
});
