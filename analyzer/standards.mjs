// Read-only view of the website's canonical standards; no copied recommendation database.
import {number} from './engine.mjs?v=20261106';
export const editions={sll:'SLL Code for Lighting 2022',lg4:'SLL Lighting Guide 4: Sports Lighting, October 2006',adm:'Abu Dhabi Lighting Manual, Version 2.0, September 2020'};
export function buildStandards({SLL_ROWS=[],LG4_AREAS=[],ADM_AREAS=[]}){
 const rows=SLL_ROWS.map(s=>({...s,family:'sll',edition:editions.sll,sourceReference:`${editions.sll}, section 3.2, Table ${s.table}, Ref ${s.ref}, printed p${s.page} (PDF p${s.pdf_page})`}));
 for(const area of LG4_AREAS)for(const [ti,t] of area.structuredTables.entries())for(const [ri,r] of t.rows.entries()){
  if(!/illuminance.*(?:Eav|Evav).*\(lux\)/i.test(r[0]))continue;
  const vertical=/Vertical/i.test(r[0]),prefix=r[0].split(/(?:Horizontal|Vertical) illuminance/i)[0];
  const ulabel=prefix+(vertical?'Vertical uniformity · Evmin/Evav':'Uniformity · Emin/Eav');
  const u=t.rows.find(x=>x[0]===ulabel);
  for(let ci=1;ci<t.columns.length;ci++){
   const lux=number(r[ci]),uniformity=number(u?.[ci]);
   rows.push({id:`${area.id}:t${ti}:r${ri}:c${ci}`,family:'lg4',edition:editions.lg4,industry:'Sports / '+area.name,area:`${area.name} / ${t.columns[ci]} / ${r[0]}`,lux,uniformity,modified:null,orientation:vertical?'vertical':'horizontal',rawLux:r[ci],rawUniformity:u?.[ci]??'Not Available',ref:`§${area.section} · ${t.columns[ci]}`,sourceReference:`${editions.lg4}, §${area.section} (section starts printed p${area.page}), ${t.columns[ci]}, ${r[0]}`,notes:area.notes.join(' '),table_note:area.installation,reviewOnly:lux==null&&r[ci]&&!/^[-–—]$/.test(r[ci])?'Conditional source value: '+r[ci]+'; confirm the original section.':null});
  }
 }
 for(const a of ADM_AREAS){const lux=a.unit==='lux'?number(a.value):null;
  rows.push({id:a.id,family:'adm',edition:editions.adm,industry:'ADM / '+a.group,area:a.name,lux,uniformity:number(a.uniformity.replace(/^≥\s*/,'')),modified:null,rawLux:a.value+' '+a.unit,rawUniformity:a.uniformity,ref:a.id,sourceReference:`${editions.adm}${a.page?', source p'+a.page:', source scope note'} · ${a.name}`,notes:a.notes,table_note:a.installation,incompatible:a.unit==='cd/m²'?'Luminance requirement (cd/m²): cannot compare with illuminance (lux).':null,reviewOnly:a.unit!=='cd/m²'&&lux==null?'Range or project-dependent requirement: '+a.value+' '+a.unit+'. Resolve against the source; no automatic threshold is assumed.':null});
 }return rows;
}
export function standardReference(s){return s?.sourceReference||(s?`${editions.sll}, section 3.2, Table ${s.table}, Ref ${s.ref}, printed p${s.page} (PDF p${s.pdf_page})`:'Not Available')}
