(function(root){
 'use strict';
 let nextId=0;
 const raceOptions=[['any','Any race'],['H','Human'],['N','Night Elf'],['O','Orc'],['U','Undead'],['R','Random'],['RH','Random (Human)'],['RN','Random (Night Elf)'],['RO','Random (Orc)'],['RU','Random (Undead)']];
 function create({button,panel,playerList,mapField,mapTypeFields,addButton,clearButton,getRows,mapName,mapType,mapSlots,loadMapSlots,raceIcon,onChange}){
  let enabled=false;panel.inert=true;
  const playerFilters=[],combos=[];
  const namesCache=new Map(),compareNames=new Intl.Collator(undefined,{sensitivity:'base',numeric:true}).compare;
  const map={name:'',exact:false};
  const defaultMapTypes={melee:true,w3c:false,custom:false},mapTypes={...defaultMapTypes};
  const typeFields=[...mapTypeFields.querySelectorAll('input[data-map-type]')];
  try{const saved=JSON.parse(localStorage.getItem('advanced-map-types'));for(const key of Object.keys(mapTypes))if(typeof saved?.[key]==='boolean')mapTypes[key]=saved[key];}catch{}
  function syncMapTypes(){for(const field of typeFields)field.checked=mapTypes[field.dataset.mapType];}
  function saveMapTypes(){try{localStorage.setItem('advanced-map-types',JSON.stringify(mapTypes));}catch{}}
  function resetMapTypes(){Object.assign(mapTypes,defaultMapTypes);syncMapTypes();saveMapTypes();}
  syncMapTypes();
  function hasChanges(){return Boolean(map.name||playerFilters.some(({filter})=>filter.name||filter.race!=='any')||Object.keys(mapTypes).some(key=>mapTypes[key]!==defaultMapTypes[key]));}
  function canAddPlayer(){const filter=playerFilters.at(-1)?.filter;return Boolean(filter?.exact&&filter.name.trim());}
  function updateAddButton(){addButton.disabled=!canAddPlayer();addButton.title=addButton.disabled?'Select a player in the last row first':'Add another player';}
  function changed(typing=false,filtersChanged=true){updateAddButton();for(const item of playerFilters)item.combo.updateClearSelection();clearButton.disabled=!hasChanges();if(filtersChanged)onChange(typing);}
  for(const field of typeFields)field.onchange=()=>{mapTypes[field.dataset.mapType]=field.checked;saveMapTypes();mapCombo.refresh();changed(false,false);};
  function choices(kind){
   if(namesCache.has(kind))return namesCache.get(kind);
   const names=new Map(),mapKinds=new Map(),mapRows=new Map();
   for(const row of getRows())for(const name of kind==='player'?(row.players||[]).map(p=>p.name):[mapName(row)]){
    if(name&&!names.has(name.toLowerCase()))names.set(name.toLowerCase(),name);
    if(kind==='map'&&name){const key=name.toLowerCase();if(!mapKinds.has(key))mapKinds.set(key,new Set());mapKinds.get(key).add(mapType(row));}
    if(kind==='map'&&name){const key=name.toLowerCase(),identity=row.mapInfo?.checksumSha1||row.mapInfo?.checksum||row.map;if(!mapRows.has(key))mapRows.set(key,new Map());const examples=mapRows.get(key);if(!examples.has(identity)||Number.isInteger(mapSlots(row)))examples.set(identity,row);}
   }
   const result=[...names.values()].sort(compareNames).map(name=>{const value={name,normalized:name.toLowerCase()};if(kind==='map'){value.mapTypes=[...mapKinds.get(value.normalized)];value.rows=[...mapRows.get(value.normalized).values()];}return value;});
   namesCache.set(kind,result);return result;
  }
  function combo(host,filter,kind,label,removeButton=null){
   const id='advanced-choice-'+(++nextId),wrapper=document.createElement('div');wrapper.className='filter-combobox';
   const input=document.createElement('input');input.type='text';input.id=id;input.autocomplete='off';input.spellcheck=false;input.placeholder=kind==='player'?'Search players…':'Search maps…';
   if(kind==='player')input.title='Type at least 3 characters to search players';
   input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',id+'-options');input.setAttribute('aria-label',label);
   const toggle=document.createElement('button');toggle.type='button';toggle.className='filter-combobox-toggle';toggle.textContent='▾';toggle.setAttribute('aria-label','Show '+(kind==='player'?'players':'maps'));toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',id+'-options');
   const menu=document.createElement('div');menu.id=id+'-options';menu.className='filter-combobox-options'+(kind==='map'?' map-choice-options':'');menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label);menu.hidden=true;
   const clearSelection=removeButton||(kind==='map'?document.createElement('button'):null);
   if(clearSelection){clearSelection.type='button';clearSelection.classList.add('filter-combobox-clear');clearSelection.textContent='×';clearSelection.title=kind==='map'?'Clear map':'Remove player filter';clearSelection.setAttribute('aria-label',kind==='map'?'Clear map filter':'Remove player filter');clearSelection.hidden=true;}
   wrapper.append(input,toggle);if(clearSelection)wrapper.append(clearSelection);wrapper.append(menu);host.append(wrapper);
   let visible=[],visibleChoices=[],active=-1,slotChoices=null;
   function updateClearSelection(){if(clearSelection){clearSelection.hidden=!(filter.name||(kind==='player'&&(filter.race!=='any'||playerFilters.length>1)));wrapper.classList.toggle('has-value',!clearSelection.hidden);}}
   function updateSlotLabels(){
    if(kind!=='map')return;
    menu.querySelectorAll('[role="option"]').forEach((option,index)=>{
     const choice=visibleChoices[index];if(!choice)return;
     const maximum=choice.rows.reduce((maximum,row)=>{const count=mapSlots(row);return Number.isInteger(count)&&count>=1&&count<=24?Math.max(maximum,count):maximum;},0);
     const text=maximum?String(maximum):'';
     option.querySelector('.map-choice-slots').textContent=text;option.setAttribute('aria-label',choice.name+(text?', maximum '+text+' '+(maximum===1?'player':'players'):''));
    });
   }
   function loadSlotLabels(){
    const available=choices('map');if(slotChoices===available)return;slotChoices=available;
    Promise.resolve(loadMapSlots(available.flatMap(choice=>choice.rows))).then(()=>{if(namesCache.get('map')===available)updateSlotLabels();}).catch(()=>{});
   }
   function close(){menu.hidden=true;active=-1;input.removeAttribute('aria-activedescendant');input.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');}
   function highlight(){
    menu.querySelectorAll('[role="option"]').forEach((option,index)=>{option.setAttribute('aria-selected',String(index===active));if(index===active){input.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}});
   }
   function select(value){filter.name=value;filter.exact=Boolean(value);input.value=value;updateClearSelection();close();input.focus();changed();}
   function render(){
    menu.replaceChildren();active=-1;input.removeAttribute('aria-activedescendant');
    const restrictMaps=Object.values(mapTypes).some(Boolean),query=input.value.trim().toLowerCase(),matches=choices(kind).filter(value=>value.normalized.includes(query)&&(kind!=='map'||!restrictMaps||value.mapTypes.some(type=>mapTypes[type])));
    visibleChoices=[null,...(kind==='map'?matches:matches.slice(0,60))];visible=visibleChoices.map(choice=>choice?.name||'');
    visible.forEach((value,index)=>{const option=document.createElement('div');option.id=id+'-option-'+index;option.dataset.value=value;option.setAttribute('role','option');option.setAttribute('aria-selected','false');
     if(kind==='map'){const text=document.createElement('span');text.className='map-choice-name';text.textContent=value||'Any map';const slots=document.createElement('span');slots.className='map-choice-slots';slots.setAttribute('aria-hidden','true');option.append(text,slots);option.title=value||'Any map';}else option.textContent=value||'Any player';
     option.onmousedown=event=>event.preventDefault();option.onclick=()=>select(value);menu.append(option);});
    updateSlotLabels();
    if(!matches.length||kind==='player'&&matches.length>60){const note=document.createElement('p');note.className='filter-combobox-note';note.textContent=!matches.length?'No matching '+(kind==='player'?'players':'maps')+'.':(matches.length-60)+' more — type to narrow the list.';menu.append(note);}
   }
   function open(){
    for(const other of combos)other.close();
    if(kind==='player'&&input.value.trim().length<3){menu.replaceChildren();visible=[];return;}
    render();
    if(kind==='map')loadSlotLabels();
    const rect=input.getBoundingClientRect(),below=window.innerHeight-rect.bottom-12;
    menu.style.left=rect.left+'px';menu.style.width=rect.width+'px';menu.style.maxHeight=Math.max(80,below<100?rect.top-15:below-3)+'px';
    menu.style.top=below<100?'auto':rect.bottom+3+'px';menu.style.bottom=below<100?window.innerHeight-rect.top+3+'px':'auto';
    menu.hidden=false;input.setAttribute('aria-expanded','true');toggle.setAttribute('aria-expanded','true');
   }
   input.onfocus=open;
   input.oninput=()=>{filter.name=input.value.trim();filter.exact=false;updateClearSelection();if(kind==='player'&&filter.name.length<3){close();menu.replaceChildren();visible=[];}else if(menu.hidden)open();else render();changed(true);};
   input.onkeydown=event=>{
    if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();event.stopPropagation();if(menu.hidden)open();if(menu.hidden)return;active=Math.max(0,Math.min(visible.length-1,active+(event.key==='ArrowDown'?1:-1)));highlight();}
    else if(event.key==='Enter'&&!menu.hidden){event.preventDefault();event.stopPropagation();if(active>=0)select(visible[active]);else close();}
    else if(event.key==='Tab')close();
   };
   toggle.onmousedown=event=>event.preventDefault();toggle.onclick=()=>{if(menu.hidden){input.focus();if(menu.hidden)open();}else close();};
   if(clearSelection){clearSelection.onmousedown=event=>event.preventDefault();if(kind==='map')clearSelection.onclick=()=>{input.value='';filter.name='';filter.exact=false;updateClearSelection();input.focus();close();changed();};}
   wrapper.addEventListener('focusout',event=>{if(!wrapper.contains(event.relatedTarget))close();});
   const controller={close,wrapper,updateClearSelection,refresh(){if(!menu.hidden)render();},reset(){input.value='';filter.name='';filter.exact=false;updateClearSelection();close();}};combos.push(controller);return controller;
  }
  const mapCombo=combo(mapField,map,'map','Map');
  mapField.querySelector('input').setAttribute('aria-labelledby','advanced-map-label');
  document.getElementById('advanced-map-label').htmlFor=mapField.querySelector('input').id;
  function addPlayer(focus=false){
   const filter={name:'',race:'any',exact:false},row=document.createElement('div');row.className='advanced-player-filter';
   const player=document.createElement('div');player.className='advanced-player-name';row.append(player);
   const remove=document.createElement('button');remove.className='advanced-player-remove';
   const playerCombo=combo(player,filter,'player','Player '+(playerFilters.length+1),remove);
   const select=document.createElement('select');select.className='advanced-player-race';select.setAttribute('aria-label','Race played by player '+(playerFilters.length+1));
   for(const [value,label] of raceOptions){
    const option=document.createElement('option');option.value=value;
    option.innerHTML=raceIcon(value)+'<span class="race-filter-label"></span>';option.querySelector('.race-filter-label').textContent=label;
    option.querySelectorAll('img').forEach(icon=>{icon.alt='';icon.removeAttribute('title');icon.setAttribute('aria-hidden','true');});
    const icon=option.querySelector('.random-race-icon');if(icon){icon.removeAttribute('role');icon.removeAttribute('aria-label');icon.removeAttribute('title');icon.setAttribute('aria-hidden','true');}
    select.append(option);
   }
   const selectButton=document.createElement('button');selectButton.type='button';selectButton.append(document.createElement('selectedcontent'));select.prepend(selectButton);
   select.onchange=()=>{filter.race=select.value;changed();};
   const item={filter,row,combo:playerCombo};playerFilters.push(item);
   remove.onclick=()=>{row.remove();playerFilters.splice(playerFilters.indexOf(item),1);combos.splice(combos.indexOf(playerCombo),1);if(!playerFilters.length)addPlayer();changed();if(addButton.disabled)playerFilters.at(-1).row.querySelector('input').focus();else addButton.focus();};
   const raceField=document.createElement('div');raceField.className='advanced-player-as-race';
   const as=document.createElement('span');as.className='advanced-player-as';as.textContent='as';raceField.append(as,select);
   row.append(raceField);playerList.append(row);updateAddButton();for(const item of playerFilters)item.combo.updateClearSelection();if(focus)player.querySelector('input').focus();
  }
  addPlayer();
  addButton.onclick=()=>{if(!canAddPlayer())return;addPlayer(true);changed();};
  clearButton.onclick=()=>{
   if(!hasChanges())return;
   for(const item of playerFilters){item.row.remove();combos.splice(combos.indexOf(item.combo),1);}playerFilters.length=0;addPlayer();mapCombo.reset();
   resetMapTypes();panel.dispatchEvent(new Event('advanced-filters-clear'));changed();
  };
  button.onclick=()=>{
   enabled=!enabled;panel.inert=!enabled;panel.hidden=!enabled;button.setAttribute('aria-expanded',String(enabled));button.setAttribute('aria-pressed',String(enabled));
   for(const controller of combos)controller.close();panel.dispatchEvent(new Event('advanced-filters-toggle'));changed();
  };
  document.addEventListener('click',event=>{for(const controller of combos)if(!controller.wrapper.contains(event.target))controller.close();});
  panel.addEventListener('scroll',()=>{for(const controller of combos)controller.close();});
  window.addEventListener('resize',()=>{for(const controller of combos)controller.close();});
  clearButton.disabled=!hasChanges();
  return {get:()=>({enabled,map:{...map},players:playerFilters.map(item=>({...item.filter}))}),invalidateChoices:()=>namesCache.clear()};
 }
 root.replayAdvancedFilters={create};
})(window);
