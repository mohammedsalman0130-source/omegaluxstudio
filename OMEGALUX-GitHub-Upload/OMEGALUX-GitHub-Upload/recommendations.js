(()=>{
'use strict';
const rows=window.SLL_ROWS;
const $=s=>document.querySelector(s),industry=$('#industry'),area=$('#area'),search=$('#area-search');let current;
const value=v=>v===null?'—':String(v);
const lux=v=>v===null?'—':`${v} lux`;
const uniform=v=>v===null?'—':`≥ ${v.toFixed(2)}`;
const defaultId='sll-2022-3-31-2';
industry.add(new Option('All industries & categories','all'));
[...new Set(rows.map(r=>r.industry))].sort((a,b)=>a.localeCompare(b)).forEach(x=>industry.add(new Option(x,x)));
function filtered(){const term=search.value.trim().toLowerCase();return rows.filter(r=>(industry.value==='all'||industry.value===r.industry)&&(!term||`${r.area} ${r.industry} ${r.notes} ${r.ref} ${r.cct||''}`.toLowerCase().includes(term)))}
function renderTable(list){
 const body=$('#schedule-rows');body.replaceChildren();const frag=document.createDocumentFragment();
 list.forEach(r=>{const tr=document.createElement('tr'),cat=document.createElement('td');cat.textContent=r.industry;tr.append(cat);const cell=document.createElement('td'),button=document.createElement('button');button.type='button';button.className='area-link';button.textContent=r.area;button.onclick=()=>{area.value=r.id;show();$('#reference-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})};cell.append(button);tr.append(cell);[value(r.lux),r.uniformity===null?'—':r.uniformity.toFixed(2),value(r.ugr),value(r.ra)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});frag.append(tr)});
 body.append(frag);$('#table-count').textContent=`${list.length} / ${rows.length} TASKS`;
}
function updateOptions(selected){const list=filtered();area.replaceChildren();list.forEach(r=>area.add(new Option(r.area,r.id)));if(list.some(r=>r.id===selected))area.value=selected;area.disabled=!list.length;$('#result-count').textContent=`${list.length} task${list.length===1?'':'s'} across ${new Set(list.map(r=>r.industry)).size} categories`;$('#reference-panel').hidden=!list.length;$('#empty').hidden=!!list.length;renderTable(list);if(list.length)show()}
function designChecks(r){
 if(r.lux===null)return 'No fixed maintained illuminance is listed for this task, so a task minimum or surrounding-light level is not calculated. Establish the project-specific target using the application notes.';
 const minimum=r.uniformity===null?'No fixed task uniformity is listed.':`At an average of ${r.lux} lux, the task minimum is ${+(r.lux*r.uniformity).toFixed(2)} lux (Emin = Eavg × U₀ = ${r.lux} × ${r.uniformity.toFixed(2)}).`;
 const surrounding=r.lux>=750?500:r.lux>=500?300:r.lux>=300?200:r.lux>=200?150:r.lux;
 return `${minimum} Immediate surrounding illuminance: ${surrounding} lux (Table 3.1, p. 35). Background illuminance: at least one-third of the surrounding level, approximately ${Math.ceil(surrounding/3)} lux (§3.1.3.5). These are derived design targets at the required illuminance, not calculated site performance. Recalculate them if a modified task target is adopted.`;
}
function show(){
 current=rows.find(r=>r.id===area.value);if(!current)return;
 $('#category').textContent=current.industry;$('#area-title').textContent=current.area;$('#lux').textContent=value(current.lux);$('#uniformity').textContent=uniform(current.uniformity);$('#ugr').textContent=current.ugr===null?'—':'≤ '+current.ugr;$('#ra').textContent=current.ra===null?'—':'≥ '+current.ra;
 for(const [id,key] of [['modified-lux','modified'],['cylindrical-lux','cylindrical'],['wall-lux','wall'],['ceiling-lux','ceiling']])$('#'+id).textContent=lux(current[key]);
 $('#sll-cct').textContent=current.cct?`${current.cct} — specified in this task’s SLL application note.`:'No fixed CCT is specified for this task. General SLL colour-appearance groups: warm below 3300 K; neutral 3300–5300 K; cool above 5300 K (§3.1.7.2, p. 45). Choose to suit the activity, room materials, illuminance and occupant preference.';
 $('#sll-cct').classList.toggle('task-cct',!!current.cct);
 $('#area-note').textContent=(current.notes||'No additional task-specific note is listed. Apply the criteria to the relevant assessment plane and coordinate the lighting with the activity.')+(current.source_note?' '+current.source_note:'');
 $('#table-note-block').hidden=!current.table_note;$('#table-note').textContent=current.table_note||'';
 $('#design-checks').textContent=designChecks(current);
 $('#source-title').textContent=`SLL Code for Lighting · 2022 · §3.2 · Table ${current.table} · Ref. ${current.ref} · printed p. ${current.page} (PDF p. ${current.pdf_page})`;
 $('#source-edition').textContent='Task values: the selected schedule row. Reflectance: §3.1.2.2, p. 32. Surrounding/background criteria: §§3.1.3.4–3.1.3.6, pp. 34–36. General CCT groups: §3.1.7.2, p. 45.'+(current.table==='3.58'?' Additional railway table notes: printed p. 102.':'');
 const brief=`Please review lighting for ${current.area} (${current.industry}).\n${$('#source-title').textContent}\nRequired maintained illuminance: ${lux(current.lux)}; modified: ${lux(current.modified)}. Task U0: ${uniform(current.uniformity)}. UGR limit: ${value(current.ugr)}; minimum Ra/CRI: ${value(current.ra)}.\nCylindrical: ${lux(current.cylindrical)}; walls: ${lux(current.wall)}; ceiling: ${lux(current.ceiling)}.\nCCT: ${current.cct||'not fixed in the task schedule'}.\nGeneral surface reflectance: ceiling 0.70–0.90; walls 0.50–0.80; floor 0.20–0.60.\nApplication notes: ${current.notes||'None listed.'} ${current.source_note||''}\n${current.table_note||''}\n\nProject location / stage: `;
 $('#use-reference').href='contact.html?brief='+encodeURIComponent(brief);
 const params=new URLSearchParams(location.search);if(['sll','cibse'].includes(params.get('source')))history.replaceState(null,'','?source=sll&area='+encodeURIComponent(current.id)+(params.has('print')?'&print=1':''));
}
industry.onchange=()=>updateOptions();search.oninput=()=>updateOptions();area.onchange=show;$('#reset').onclick=()=>{industry.value='all';search.value='';updateOptions(defaultId)};
const initial=new URLSearchParams(location.search).get('area');updateOptions(rows.some(r=>r.id===initial)?initial:defaultId);
})();
