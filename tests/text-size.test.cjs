'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../ui/text-size.js'),'utf8');
function load(saved,{blocked=false}={}){
 const values=new Map(saved===undefined?[]:[['app-text-size',saved]]),events=[],document={documentElement:{style:{}},dispatchEvent:event=>events.push(event.type)};
 const context={window:{},document,Event,localStorage:{getItem:key=>{if(blocked)throw Error('Storage unavailable');return values.get(key);},setItem:(key,value)=>{if(blocked)throw Error('Storage unavailable');values.set(key,value);}}};
 vm.runInNewContext(source,context);return {api:context.window.replayTextSize,document,values,events};
}
test('fresh or invalid preferences preserve the current font sizes',()=>{
 for(const saved of [undefined,'','unknown','0','150','-20','110oops']){const state=load(saved);assert.equal(state.api.get(),100);assert.equal(state.document.documentElement.style.fontSize,'16px');assert.deepEqual(state.events,[]);}
});
test('text size choices are applied, persisted and restored without cumulative scaling',()=>{
 const state=load();for(const percentage of state.api.choices){state.api.set(percentage);state.api.set(percentage);const restart=load(state.values.get('app-text-size'));assert.equal(restart.api.get(),percentage);assert.equal(restart.document.documentElement.style.fontSize,(16*percentage/100)+'px');assert.deepEqual(restart.events,[]);}
 assert.equal(state.events.length,6);state.api.set(100);assert.equal(state.document.documentElement.style.fontSize,'16px');
});
test('unavailable storage keeps default sizing and allows live changes',()=>{
 const state=load('130',{blocked:true});assert.equal(state.api.get(),100);assert.doesNotThrow(()=>state.api.set(120));assert.equal(state.document.documentElement.style.fontSize,'19.2px');assert.deepEqual(state.events,['replay-text-size-changed']);
});
