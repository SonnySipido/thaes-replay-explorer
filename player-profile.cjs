'use strict';
function playerProfileUrl(name){
 if(typeof name!=='string')return null;
 const tag=name.trim();
 if(!/^[^#\s\x00-\x1f]+#[0-9]+$/.test(tag))return null;
 return 'https://w3champions.com/player/'+encodeURIComponent(tag);
}
module.exports={playerProfileUrl};
