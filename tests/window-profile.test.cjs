const test=require('node:test'),assert=require('node:assert/strict');
const {restoreWindowBounds}=require('../window-state.cjs');
const {playerProfileUrl}=require('../player-profile.cjs');
const primary={x:0,y:0,width:1920,height:1040},left={x:-1920,y:0,width:1920,height:1040},displays=[{workArea:primary},{workArea:left}];
test('window size and negative monitor coordinates are restored',()=>{const b=restoreWindowBounds({x:-1800,y:70,width:1200,height:750},displays,primary);assert.deepEqual([b.x,b.y,b.width,b.height],[-1800,70,1200,750]);});
test('disconnected monitor and oversized window return to visible work area',()=>{const b=restoreWindowBounds({x:-4000,y:80,width:2400,height:1600},[{workArea:primary}],primary);assert.equal(b.x,0);assert.equal(b.y,0);assert.equal(b.width,1920);assert.equal(b.height,1040);});
test('invalid saved bounds use the reduced default window size',()=>{const b=restoreWindowBounds({x:NaN,y:0,width:-5,height:3},displays,primary);assert.equal(b.width,1500);assert.equal(b.height,820);});
test('small screens keep the entire window visible',()=>{const area={x:0,y:0,width:900,height:600},b=restoreWindowBounds({x:10,y:10,width:1200,height:800},[{workArea:area}],area);assert.equal(b.width,900);assert.equal(b.height,600);assert.equal(b.minWidth,900);assert.equal(b.minHeight,600);});
test('profile URL encodes full BattleTags on the fixed W3Champions host',()=>{assert.equal(playerProfileUrl('ExamplePlayer#1234'),'https://w3champions.com/player/ExamplePlayer%231234');assert.equal(playerProfileUrl('名#1234'),'https://w3champions.com/player/%E5%90%8D%231234');assert.equal(playerProfileUrl('MissingTag'),null);assert.equal(playerProfileUrl(null),null);assert.ok(playerProfileUrl('evil/path#1234').endsWith('evil%2Fpath%231234'));});
