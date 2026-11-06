import {roomAliases} from './room-aliases.mjs';
// Keep the PDF's coordinates: extraction order alone cannot distinguish U0 from g2.
const tidy = text => String(text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const normalized = text => tidy(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function number(text) {
  const value = tidy(text).replace(/\s*(lx|lux)$/i, '').replace(/\s/g, '');
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) return null;
  return Number(value.replace(',', '.'));
}
export function linesFromItems(items) {
  const cells = items.filter(i => i.str.trim()).map(i => ({
    text: tidy(i.str), x: i.transform[4], y: -i.transform[5], width: i.width
  })).sort((a,b) => a.y-b.y || a.x-b.x);
  const lines = [];
  for (const cell of cells) {
    let line = lines.at(-1);
    if (!line || cell.y-line.y > 3) {
      line = {y:cell.y, cells:[]};
      lines.push(line);
    }
    line.cells.push(cell);
  }
  for (const line of lines) {
    line.cells.sort((a,b) => a.x-b.x);
    line.text = line.cells.map(c => c.text).join(' ');
  }
  return lines;
}
const sceneNumbers = text => [...text.matchAll(/\blight(?:ing)?\s+scene\s*[:#-]?\s*(\d+)\b/gi)].map(m => Number(m[1]));
const objects = /^(?:.*[>/·|]\s*)?Calculation objects(?:\s*\((?:continued|continuation)\))?(?:\s*[/·|>(–-]\s*Light(?:ing)? scene\s*1\s*\)?)?$/i;
const planes = /^working planes?(?:\s*\(continued\))?$/i;
export function inspectPage(lines, outline=[]) {
  const tableAt = lines.findIndex(l => /^Properties\b/i.test(l.text));
  const rowAt = lines.findIndex(l => /^working\s*plane\s*\(/i.test(l.text));
  const firstData = Math.min(...[tableAt,rowAt,lines.length].filter(i=>i>=0));
  const heading = lines.slice(0,firstData).map(l => l.text);
  const title = heading.some(l => objects.test(l));
  const printedScenes = sceneNumbers(heading.join(' '));
  const scenes = printedScenes.length ? printedScenes : sceneNumbers(outline.join(' '));
  const floorLine = [...heading,...outline].find(l=>/\b(?:floor|storey|story|level|basement|ground floor)\b/i.test(l) && !objects.test(l));
  const path = (floorLine || '').replace(/\s*[(/·>|-]?\s*Light(?:ing)? scene.*$/i,'').replace(/^(?:Storey|Floor|Level)\s*:\s*/i,'').trim();
  const segments=path.split(/\s*[·>|]\s*/);
  const floorEnd=segments.findLastIndex(s=>/\b(?:storey|story|floor|level|basement)\b/i.test(s));
  const floor=floorEnd>=0?segments.slice(0,floorEnd+1).join(' · '):path;
  return {title, scenes, floor, tableAt, rowAt, heading, hasPlanes:heading.some(l=>planes.test(l)), outlineObjects:outline.slice(-2).some(l=>objects.test(l)) && !heading.some(l=>/^(?:summary|overview|list of luminaires|results overview|isolines|false colours)$/i.test(l))};
}
function metricColumns(line) {
  // Join subscript glyphs with their base letter while retaining column boundaries.
  const groups=[];
  for(const cell of line.cells){
    const last=groups.at(-1);
    if(last && cell.x-last.end<5){last.text+=cell.text;last.end=Math.max(last.end,cell.x+cell.width)}
    else groups.push({text:cell.text,x:cell.x,end:cell.x+cell.width});
  }
  const headers={};
  for(const group of groups){
    const t=tidy(group.text).replace(/\s|\[lx\]|\(lx\)/gi,'').toLowerCase();
    const name=/^(ē|e̅|e|eav|eavg|em|average)$/.test(t)?'avg':/^emin$/.test(t)?'min':/^emax$/.test(t)?'max':/^(?:u[0o](?:\(g1\))?|\(g1\)|g1)$/.test(t)?'u':/^g2$/.test(t)?'g2':/^index$/.test(t)?'index':null;
    if(name)headers[name]=group.x;
  }
  return headers;
}
function readTable(lines, page, info, inheritedHeaders) {
  const rows=[], warnings=[];
  let headers=inheritedHeaders, active=null, tableOpen=info.hasPlanes||info.outlineObjects||info.continued;
  function finish(){
    if(!active)return;
    const label=active.label.join(' ').replace(/^working\s*plane\s*/i,'').replace(/^\((.*)\)$/,'$1').trim();
    rows.push({page,floor:info.floor,room:label || 'Unnamed working plane',index:active.index,...active.values});
    active=null;
  }
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(planes.test(line.text)){finish();tableOpen=true;continue}
    if(/^(?:calculation (?:surfaces|grids|points)|(?:visual )?task areas|surrounding areas|wall zones|result overview|perpendicular illuminance grids)\b/i.test(line.text)){finish();headers=null;tableOpen=false;continue}
    if(/^Properties\b/i.test(line.text)){
      finish();
      // Subscripts can be emitted on a second, slightly lower baseline.
      const near=lines.slice(i,i+3).filter(l=>l.y-line.y<=7);
      const head=metricColumns({cells:near.flatMap(l=>l.cells).sort((a,b)=>a.x-b.x)});
      headers=head.avg!=null && (head.min!=null||head.max!=null||head.u!=null)?head:null;
      if(!headers && tableOpen)warnings.push('Page '+page+': unrecognised working-plane columns.');
      continue;
    }
    if(!headers||!tableOpen)continue;
    const fields=Object.entries(headers).sort((a,b)=>a[1]-b[1]);
    const before=fields[0][1]-(fields[1][1]-fields[0][1])*.50;
    const left=line.cells.filter(c=>c.x<before).map(c=>c.text).join(' ');
    if(/^working\s*plane\b/i.test(left)){
      finish(); active={label:[left],index:'',values:{avg:null,min:null,max:null,u:null},readLabel:true};
    }else if(active && left){
      if(/^(?:Perpendicular|Horizontal|Vertical|Height|Wall zone|Adaptive)\b/i.test(left))active.readLabel=false;
      if(active.readLabel)active.label.push(left);
    }
    if(!active)continue;
    const buckets={};
    for(const c of line.cells.filter(c=>c.x>=before)){
      // DIALux left-aligns these headings and values. Use their start coordinates.
      const key=fields.reduce((best,f)=>Math.abs(c.x-f[1])<Math.abs(c.x-best[1])?f:best)[0];
      (buckets[key]??=[]).push(c.text);
    }
    if(buckets.index){const id=buckets.index.join('').match(/^WP\s*\d+[A-Za-z]?$/i);if(id)active.index=id[0]}
    for(const key of ['avg','min','max','u']){
      if(!buckets[key]||active.values[key]!=null)continue;
      const raw=buckets[key].join('');
      if(key!=='u' && !/(?:lx|lux)$/i.test(raw) && !/\b(?:lx|lux)\b/i.test(lines[info.tableAt]?.text||''))continue;
      active.values[key]=number(raw);
    }
  }
  finish();
  if(!rows.length)warnings.push('Page '+page+': no readable working-plane rows.');
  return {rows,warnings,headers:tableOpen?headers:null};
}
export function extractReport(pages) {
  const rows=[],warnings=[],sources=[];
  const multi=pages.some(p=>sceneNumbers([...p.outline||[],...p.lines.map(l=>l.text)].join(' ')).some(n=>n!==1));
  let previous=null;
  const implicit=[];
  const metadata=pages.map(p=>inspectPage(p.lines,p.outline));
  for(const [i,p] of pages.entries()){
    const info=metadata[i];
    const labelled=info.title||info.outlineObjects;
    const adjacent=previous?.page===p.page-1;
    const sameFloor=!info.floor||!previous?.floor||normalized(info.floor)===normalized(previous.floor);
    const sameOutline=JSON.stringify(p.outline||[])===previous?.outline;
    // A page without its own title may repeat report furniture or the storey breadcrumb.
    // A new section heading ends the carry even when the PDF bookmark has not changed.
    const knownHeading=info.heading.every(h=>previous?.heading.includes(h)||planes.test(h)||
      /^(?:continued|page\s+\d+(?:\s+of\s+\d+)?|\d+)$/i.test(h)||
      /^(?:.*[·>|]\s*)?(?:storey|floor|level)\b/i.test(h));
    const carry=adjacent&&sameFloor&&(labelled||(knownHeading&&sameOutline));
    const hasTable=info.tableAt>=0, hasRows=info.rowAt>=0;
    if(!labelled&&!carry||!hasTable&&!hasRows){previous=null;continue}
    if(carry){info.floor ||= previous.floor;if(!info.scenes.length)info.scenes=previous.scenes}
    // Some exports print the storey / scene breadcrumb only on the overflow page.
    const next=metadata[i+1];
    if(!info.scenes.length && info.title && hasTable && next?.title && next.tableAt<0 &&
        next.rowAt>=0 && pages[i+1].page===p.page+1 &&
        (!info.floor||!next.floor||normalized(info.floor)===normalized(next.floor))){
      info.scenes=next.scenes;
      info.floor ||= next.floor;
    }
    if(info.scenes.some(n=>n!==1)){previous=null;continue}
    if(!info.scenes.length && multi){warnings.push('Page '+p.page+': scene could not be identified in this multi-scene report. Excluded.');previous=null;continue}
    if(!info.hasPlanes&&!hasRows){previous=null;continue}
    const inherited=carry?previous.headers:null;
    // On a continuation the first WP row precedes any later table's headings.
    // Use the last working-plane header, never the columns of the following table.
    if(hasRows && (info.tableAt<0||info.rowAt<info.tableAt) && !inherited){
      warnings.push('Page '+p.page+': working-plane rows precede an identifiable column header.');
    }
    info.continued=hasRows||carry;
    const result=readTable(p.lines,p.page,info,inherited);
    warnings.push(...result.warnings);
    if(!info.scenes.length)implicit.push(p.page);
    rows.push(...result.rows);
    if(result.rows.length)sources.push(p.page);
    previous=result.headers?{page:p.page,scenes:info.scenes,floor:info.floor,headers:result.headers,
      outline:JSON.stringify(p.outline||[]),heading:info.heading}:null;
  }
  if(implicit.length)warnings.push('No explicit scene label on calculation pages '+implicit.join(', ')+'. Treated as the default scene because the report identifies no alternate scene.');
  return {rows,warnings,sources};
}
// Specific activities precede parent spaces: a lobby serving toilets is circulation.
const usageRules=[
  [/\b(?:lift|elevator) lobb(?:y|ies)\b/,'3.6.4'],
  [/\b(?:corridors?|lobb(?:y|ies)|circulation|passageways?|vestibules?)\b/,'3.6.1'],
  [/\bpatients?\b.*\b(?:bath|toilet)|\b(?:bathrooms?|toilets?)\b.*\bpatients?\b/,'3.44.6'],
  [/\bmirror(?:s)?\b/,'3.7.5'],
  [/\b(?:toilets?|w ?c|washrooms?|restrooms?|ablution|bathrooms?|locker rooms?|showers?|changing rooms?)\b/,'3.7.4'],
  [/\b(?:stairs?|staircases?|stairwells?|escalators?)\b/,'3.6.2'],
  [/\b(?:lifts?|elevators?)\b/,'3.6.3'],
  [/\b(?:server|telecom(?:munications)?|etisalat|data cent(?:er|re)|mdf|idf|trm|transformers?|substations?|plant\s?rooms?|switchgear|l v|lv|h v|hv|m v|mv|smdb|mdb|ups|pumps?|mechanical|electrical|mep|ahu|chillers?|generators?)\b/,'3.8.1'],
  [/\b(?:cctv|surveillance|security control|monitoring station)\b/,'3.8.3'],
  [/\b(?:pantry|pantries|larder|food store)\b/,'3.9.3'],
  [/\b(?:break rooms?|staff lounge|canteens?)\b/,'3.7.1'],
  [/\b(?:storages?|stores?|store ?rooms?|stock ?rooms?)\b/,'3.9.1'],
  [/\b(?:conference|meeting|board)\s*rooms?\b/,'3.31.5'],
  [/\b(?:archive|archives|archiving)\b/,'3.31.7'],
  [/\b(?:reception|receptionist)\b/,'3.31.6'],
  [/\b(?:office|offices|workstations?)\b/,'3.31.2'],
  [/\b(?:school|teaching)\b.*\bkitchens?\b/,'3.41.28'],
  [/\bkitchens?\b/,'3.34.2'],
  [/\b(?:classrooms?|teaching rooms?)\b/,'3.41.1'],
  [/\b(?:auditorium|lecture halls?)\b/,'3.41.2'],
  [/\b(?:janitor|cleaner|housekeeping)\b/,'3.7.8'],
  [/\b(?:first aid|sick bay)\b/,'3.7.6']
];
const genericWords=new Set('a an and at by for of on the in to with or only general room rooms area areas floor level zone building storey section class lighting working plane'.split(' '));
function keywords(name){
  return new Set(normalized(name).split(' ').filter(w=>w.length>1&&!genericWords.has(w)&&!/^\d+$/.test(w))
    .map(w=>w.endsWith('ies')?w.slice(0,-3)+'y':w.length>3&&w.endsWith('s')?w.slice(0,-1):w));
}
// Ignore drawing identifiers while keeping complete words and compound abbreviations.
function roomName(value) {
  return normalized(tidy(value)
    .replace(/\b(?:[a-z]\.){2,}[a-z]?\.?/gi, word => word.replaceAll('.', ''))
    .replace(/([a-z])(?=\d)|(?<=\d)([a-z])/gi, '$1$2 '))
    .replace(/\bworking planes?\b/g, ' ')
    .replace(/\b(?:\d+[a-z]?|gf|ff|bf|b\d+|l\d+|wp\d+|ground floor|first floor)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
export function makeRoomMatcher(standards) {
  const refs = new Map(), exact = new Map(), results = new Map();
  // The automatic DIALux comparison uses the SLL Code; other manuals remain searchable in the guide.
  const candidates = standards.filter(s => s.family === 'sll').map(standard => {
    if (!refs.has(standard.ref)) refs.set(standard.ref, standard);
    const name = roomName(standard.area);
    if (!exact.has(name)) exact.set(name, []);
    exact.get(name).push(standard);
    return {standard, words:keywords(standard.area), context:keywords(standard.industry)};
  });
  const names = roomAliases.flatMap(entry => {
    const expanded = [entry.name, ...entry.name.split(' / ')];
    return [...entry.aliases, ...expanded].map(label => ({
      entry, label:roomName(label), expanded:expanded.includes(label)
    }));
  }).filter(item => item.label && (!item.expanded || !genericWords.has(item.label)))
    .sort((a, b) => b.label.length - a.label.length || Number(a.expanded) - Number(b.expanded));
  const resolved = (standard, note = '', method = 'usage') => ({
    standardId:standard?.id || '', note, method
  });
  function fromAlias(item) {
    const standard = refs.get(item.entry.ref);
    if (!standard) return null;
    const basis = item.entry.analogous
      ? 'Analogous SLL task benchmark. Status applies to the selected task; applicability to this space is assumed.'
      : 'SLL task selected from the supplied room-name crosswalk.';
    return resolved(standard, item.entry.name + '. ' + basis, 'abbreviation');
  }
  function select(room) {
    const name = roomName(room);
    const direct = exact.get(name) || [];
    if (direct.length === 1) return resolved(direct[0], '', 'exact');
    const exactAlias = names.find(item => item.label === name);
    if (exactAlias) {
      const match = fromAlias(exactAlias);
      if (match) return match;
    }
    // A lobby serving toilets is circulation, and a patient's bathroom has its own task.
    const contextual = usageRules.slice(0, 4).find(([re]) => re.test(name));
    if (contextual && refs.has(contextual[1])) return resolved(refs.get(contextual[1]));
    const padded = ' ' + name + ' ';
    const alias = names.find(item => padded.includes(' ' + item.label + ' '));
    if (alias) {
      const match = fromAlias(alias);
      if (match) return match;
    }
    const rule = usageRules.find(([re]) => re.test(name));
    if (rule && refs.has(rule[1])) return resolved(refs.get(rule[1]));
    const terms = keywords(name);
    let best = null, score = 0, tied = false;
    for (const {standard, words, context} of candidates) {
      const shared = [...terms].filter(t => words.has(t)).length;
      if (!shared || !Number.isFinite(standard.lux) || !Number.isFinite(standard.uniformity)) continue;
      const coverage = shared / terms.size, precision = shared / words.size;
      if (coverage < .5 || shared === 1 && (coverage < 1 || precision < .4)) continue;
      const points = 2 * coverage + precision + .25 * [...terms].filter(t => context.has(t)).length;
      if (points > score) { best = standard; score = points; tied = false; }
      else if (points === score && (standard.lux !== best.lux || standard.uniformity !== best.uniformity)) tied = true;
    }
    if (!tied && best) return resolved(best, 'Automatically matched to a similar SLL task by room name.', 'similar');
    // Preserve every extracted working plane. An unknown use gets a disclosed numerical
    // benchmark, never an invented room-specific SLL requirement.
    return resolved(refs.get('3.6.1'),
      'Provisional circulation benchmark: room use could not be identified. The comparison is against SLL corridors/circulation only; project-specific compliance is undetermined.',
      'provisional');
  }
  function details(room) {
    const key = roomName(room);
    if (!results.has(key)) results.set(key, select(room));
    return results.get(key);
  }
  const match = room => details(room).standardId;
  match.details = details;
  return match;
}
export const legend='Slightly passed means both minimums are met and either value is within 5% of its target, including equality. This margin is an OMEGALUX reporting convention.';
export function assess(row, standard){
  if(!standard)return 'Not assessed';
  if(standard.incompatible||standard.reviewOnly||(!Number.isFinite(standard.lux))||!Number.isFinite(standard.uniformity))return 'Not assessed';
  if(row.avg==null||row.u==null||row.u<0||row.u>1||row.avg<0||row.min!=null&&row.min>row.avg||row.max!=null&&row.max<row.avg)return 'Not assessed';
  const status = row.avg<standard.lux||row.u<standard.uniformity ? 'Fail'
    : row.avg<=standard.lux*1.05+1e-9||row.u<=standard.uniformity*1.05+1e-9 ? 'Slightly passed' : 'Passed';
  return row.comparisonMethod === 'provisional' ? status + ' (provisional)' : status;
}
