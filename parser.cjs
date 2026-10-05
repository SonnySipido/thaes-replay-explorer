'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const {promisify} = require('node:util');
const {default: Replay} = require('w3gjs');
const parserRoot = path.dirname(require.resolve('w3gjs'));
const mappings = require(path.join(parserRoot, 'mappings.js'));
const {inferHeroAbilityLevelsFromAbilityOrder: infer} = require(path.join(parserRoot, 'inferHeroAbilityLevelsFromAbilityOrder.js'));
const inflate = promisify(zlib.inflate);
const SCHEMA = 4;
const names = Object.fromEntries(Object.entries({...mappings.items,...mappings.units,...mappings.buildings,...mappings.upgrades,...mappings.heroAbilities}).map(([k,v])=>[k,v.replace(/^[a-z]_/, '')]));
for (const [ability, hero] of Object.entries(mappings.abilityToHero)) {
  const full = names[ability] || '';
  if (full.includes(':')) { names[hero] = full.split(':')[0]; names[ability] = full.split(':').slice(1).join(':').trim(); }
}
Object.assign(names,{Hamg:'Archmage',Hmkg:'Mountain King',Hpal:'Paladin',Hblm:'Blood Mage',Obla:'Blademaster',Ofar:'Far Seer',Otch:'Tauren Chieftain',Oshd:'Shadow Hunter',Edem:'Demon Hunter',Ekee:'Keeper of the Grove',Emoo:'Priestess of the Moon',Ewar:'Warden',Udea:'Death Knight',Ulic:'Lich',Udre:'Dreadlord',Ucrl:'Crypt Lord',Npbm:'Pandaren Brewmaster',Nbrn:'Dark Ranger',Nngs:'Naga Sea Witch',Nplh:'Pit Lord',Nbst:'Beastmaster',Ntin:'Goblin Tinker',Nalc:'Goblin Alchemist',Nfir:'Firelord'});
const four = bytes => bytes ? [...bytes].reverse().map(n=>String.fromCharCode(n)).join('') : '';
const net = value => value ? value.join(':') : null;
const numeric = bytes => bytes ? Buffer.from(bytes).readUInt32LE(0) : -1;
const ultimates = new Set('AEtq AEme AEsf AEsv AOww AOeq AOre AOvd AUan AUin AUdd AUls ANef ANch ANto ANdo ANst ANrg ANg1 ANg2 ANg3 ANvc ANtm AHmt AHav AHre AHpx AHcl'.split(' '));
const heroIds = new Set(Object.values(mappings.abilityToHero));
function minimumLevel(abilities) {
  let sum = 0, requirement = 1;
  for (const [id, rank] of Object.entries(abilities)) {
    sum += rank;
    requirement = Math.max(requirement, ultimates.has(id) ? 6 : rank * 2 - 1);
  }
  return Math.min(10, Math.max(sum, requirement));
}
// Validate complete compressed blocks before invoking a parser that tolerates truncation.
async function validateContainer(buffer) {
  const start = buffer.indexOf('Warcraft III recorded game');
  if (start < 0 || buffer.length < start + 68) throw new Error('Not a complete Warcraft III replay header.');
  const headerSize = buffer.readUInt32LE(start + 28);
  if (buffer.readUInt32LE(start + 36) !== 1) throw new Error('Unsupported legacy replay header.');
  const declaredSize = buffer.readUInt32LE(start + 32);
  const expectedBytes = buffer.readUInt32LE(start + 40);
  const count = buffer.readUInt32LE(start + 44);
  const build = buffer.readUInt16LE(start + 56);
  if (headerSize < 68 || declaredSize > buffer.length - start || count > 100000) throw new Error('Replay is truncated or has an invalid header.');
  let offset = start + headerSize, bytes = 0;
  for (let i=0; i<count; i++) {
    const size = build >= 6089 ? 12 : 8;
    if (offset + size > buffer.length) throw new Error('Truncated compressed block header.');
    const compressed = buffer.readUInt16LE(offset);
    const decompressed = buffer.readUInt16LE(offset + (size === 12 ? 4 : 2));
    if (!compressed || offset + size + compressed > buffer.length) throw new Error('Truncated compressed replay block.');
    const raw = await inflate(buffer.subarray(offset + size, offset + size + compressed), {finishFlush:zlib.constants.Z_SYNC_FLUSH});
    if (raw.length !== decompressed) throw new Error('Compressed replay block has an invalid length.');
    bytes += raw.length;
    offset += size + compressed;
  }
  if (bytes < expectedBytes) throw new Error('Replay is missing game data.');
}
function collectActions(replay) {
  let time = 0;
  const players = new Map(), objects = new Map();
  function player(id) {
    if (!players.has(id)) players.set(id, {groups: {}, groupHistory: [], itemUses: [], unknownOrders: [], heroOrders: [], itemTransfers: [], cancellations: [], observedHeroes: new Set(), active: null, apmBuckets: [], actionCount: 0});
    return players.get(id);
  }
  // Count the same actions as w3gjs, but bucket them against the actual game clock.
  const original = replay.handleActionBlock.bind(replay);
  replay.handleActionBlock = (action, p) => {
    const before = p._currentlyTrackedAPM;
    original(action,p);
    const delta = p._currentlyTrackedAPM - before;
    const extra = player(p.id), minute = Math.floor(replay.totalTimeTracker / 60000);
    extra.actionCount += delta;
    extra.apmBuckets[minute] = (extra.apmBuckets[minute] || 0) + delta;
  };
  replay.on('gamedatablock', block => {
    if (block.id !== 0x1e && block.id !== 0x1f) return;
    time += block.timeIncrement;
    for (const command of block.commandBlocks) {
      const p = player(command.playerId);
      for (const a of command.actions) {
        if (a.id === 0x19) {
          const tag = net(a.object), id = four(a.itemId);
          p.active = tag;
          if (!objects.has(tag)) objects.set(tag, []);
          const observations = objects.get(tag);
          if (observations.at(-1)?.id !== id) observations.push({ms: time, id});
          if (heroIds.has(id)) p.observedHeroes.add(id);
        }
        if (a.id === 0x16 || a.id === 0x18) p.active = null;
        if (a.id === 0x17) {
          const key = (a.groupNumber + 1) % 10, tags = a.units.map(net);
          p.groups[key] = tags;
          p.groupHistory.push({ms: time, key, action: 'Assign', tags});
        }
        if (a.id === 0x18) {
          const key = (a.groupNumber + 1) % 10;
          p.groupHistory.push({ms: time, key, action: 'Select', tags: [...(p.groups[key] || [])]});
        }
        if ([0x10,0x11,0x12,0x14,0x15].includes(a.id)) {
          const order = numeric(a.orderId || a.orderId1);
          const rawId = four(a.orderId || a.orderId1);
          if (heroIds.has(rawId)) p.heroOrders.push({ms:time,id:rawId});
          if (/^[A-Za-z][A-Za-z0-9]{3}$/.test(rawId) && !names[rawId]) p.unknownOrders.push({ms:time,id:rawId,action:a.id});
          if (order >= 852008 && order <= 852013) p.itemUses.push({ms:time,slot:order-852007,source:p.active,target:net(a.object),order});
        }
        if (a.id === 0x13) p.itemTransfers.push({ms:time,item:net(a.item),target:net(a.unit)});
        if (a.id === 0x1e || a.id === 0x1f) p.cancellations.push({ms:time,id:four(a.itemId),slot:a.slotNumber});
      }
    }
  });
  function resolve(tag, ms) {
    const observations = objects.get(tag) || [];
    const observation = [...observations].reverse().find(o=>o.ms<=ms) || observations[0];
    return {tag, id:observation?.id || null, identifiedLater:!!observation && observation.ms>ms};
  }
  return {players, resolve};
}
async function parseReplay(fileOrBuffer) {
  const buffer = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : await fs.readFile(fileOrBuffer);
  await validateContainer(buffer);
  const replay = new Replay(), extra = collectActions(replay), diagnostics = [];
  const oldError = console.error, oldWarn = console.warn;
  console.error = (...args) => diagnostics.push(args.map(a=>a?.message || String(a)).join(' '));
  console.warn = console.error;
  let parsed;
  try { parsed = await replay.parse(buffer); }
  finally { console.error = oldError; console.warn = oldWarn; }
  if (diagnostics.length) throw new Error('Parser reported incomplete or unsupported data: ' + diagnostics.slice(0,3).join('; '));
  const result = JSON.parse(JSON.stringify(parsed));
  for (const p of result.players) {
    const e = extra.players.get(p.id) || {groups:{},groupHistory:[],itemUses:[],unknownOrders:[],heroOrders:[],itemTransfers:[],cancellations:[],observedHeroes:new Set(),apmBuckets:[],actionCount:0};
    p.actionCount = e.actionCount;
    p.apm = Math.round(e.actionCount * 60000 / Math.max(1,replay.players[p.id]?.currentTimePlayed || result.duration));
    p.apmBuckets = Array.from({length:Math.max(Math.ceil(result.duration/60000),e.apmBuckets.length)},(_,i)=>e.apmBuckets[i] || 0);
    p.groupHistory = e.groupHistory.map(h=>({...h,members:h.tags.map(t=>extra.resolve(t,h.ms)),tags:undefined}));
    p.groups = Object.entries(p.groupHotkeys).map(([key,counts])=>({key:Number(key),...counts,members:(e.groups[key]||[]).map(t=>extra.resolve(t,result.duration))}));
    p.itemUses = e.itemUses.map(u=>({...u,source:u.source?extra.resolve(u.source,u.ms):null}));
    p.itemTransfers = e.itemTransfers;
    p.unknownOrders = e.unknownOrders;
    p.heroOrders = e.heroOrders;
    p.cancellations = e.cancellations;
    const known = new Set(p.heroes.map(h=>h.id));
    for (const id of new Set([...e.heroOrders.map(o=>o.id),...p.units.order.filter(o=>heroIds.has(o.id)).map(o=>o.id)])) {
      if (!known.has(id)) p.heroes.push({id,abilities:{},abilityOrder:[],retrainingHistory:[],level:1});
    }
    for (const h of p.heroes) {
      h.minimumLevel = Math.max(minimumLevel(h.abilities),...h.retrainingHistory.map(r=>minimumLevel(r.abilities)));
      h.level = h.minimumLevel; h.levelInferred = true;
      h.skillHistory = h.abilityOrder.map((a,i)=>{
        const abilities = infer(h.abilityOrder.slice(0,i+1)).finalHeroAbilities;
        return {ms:a.time,type:a.type,id:a.value || null,rank:abilities[a.value] || null,minimumLevel:minimumLevel(abilities)};
      });
    }
  }
  return {...result, schema:SCHEMA,parserVersion:'w3gjs 4.3.0',names};
}
module.exports = {parseReplay, validateContainer, names, four, numeric, minimumLevel, SCHEMA};





