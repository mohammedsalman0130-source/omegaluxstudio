import {linesFromItems,extractReport,makeRoomMatcher,assess,legend} from './engine.mjs?v=20261106';
import {buildStandards} from './standards.mjs?v=20261106';
import {pdfReport,workbookReport} from './reports.mjs?v=20261106';

const el=id=>document.getElementById('lux-'+id);
const standards=buildStandards(window), refs=new Map(standards.map(s=>[s.id,s]));
const matchRoom=makeRoomMatcher(standards);
let rows=[],warnings=[],filename='',job=0,currentTask=null,excelLoader;
const message=text=>el('progress').textContent=text;
const textNode=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
const fmt=n=>n==null?'—':String(n);
async function bookmarks(pdf){
  // Track the active outline path until the next destination, including nested sections.
  const entries=[];
  async function visit(items,parents=[]){
    for(const item of items||[]){
      const path=[...parents,item.title];
      let dest=item.dest;
      try{
        if(typeof dest==='string')dest=await pdf.getDestination(dest);
        if(Array.isArray(dest)){
          const n=Number.isInteger(dest[0])?dest[0]:await pdf.getPageIndex(dest[0]);
          entries.push({page:n+1,path});
        }
      }catch{/* An unusable bookmark cannot establish the scene. */}
      await visit(item.items,path);
    }
  }
  await visit(await pdf.getOutline());return entries.sort((a,b)=>a.page-b.page);
}
async function analyse(file){
  const token=++job,old=currentTask;currentTask=null;old?.destroy().catch(()=>{});
  rows=[];warnings=[];filename=file?.name||'';el('results').hidden=el('notes').hidden=true;el('rows').replaceChildren();
  if(!file){message('');return}
  let task;
  try{
    message('Opening report…');
    const pdfjs=await import('./vendor/pdf.mjs');
    if(token!==job)return;
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
    const data=await file.arrayBuffer();if(token!==job)return;
    task=pdfjs.getDocument({data,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/wasm/',import.meta.url).href,isEvalSupported:false});currentTask=task;
    const pdf=await task.promise,outline=await bookmarks(pdf),pages=[],scanPages=[];
    let cursor=0,path=[];
    for(let n=1;n<=pdf.numPages;n++){
      if(token!==job)return;
      message('Reading page '+n+' of '+pdf.numPages+'…');
      while(cursor<outline.length&&outline[cursor].page<=n)path=outline[cursor++].path;
      const p=await pdf.getPage(n);
      const lines=linesFromItems((await p.getTextContent()).items);
      if(!lines.length)scanPages.push(n);
      pages.push({page:n,lines,outline:path});p.cleanup();
    }
    if(token!==job)return;
    const extracted=extractReport(pages);
    rows=extracted.rows;warnings=extracted.warnings;
    if(scanPages.length)warnings.push('Pages with no readable text: '+scanPages.join(', ')+'. Use a text-based DIALux PDF to include any tables on these pages.');
    for (const r of rows) {
      const match = matchRoom.details(r.room);
      r.standardId = match.standardId;
      r.comparisonNote = match.note;
      r.comparisonMethod = match.method;
    }
    el('notes').hidden=!warnings.length;el('notes').querySelector('ul').replaceChildren(...warnings.map(w=>textNode('li',w)));
    if(!rows.length){message('No eligible working-plane rows found. Export a text-based DIALux report with Calculation objects / Light scene 1 and the Working planes table enabled.');return}
    message(filename+' · '+extracted.sources.length+' calculation-object page'+(extracted.sources.length===1?'':'s')+' included.');
    el('results').hidden=false;render();
  }catch(err){if(token===job)message(err.name==='PasswordException'?'Open an unlocked copy of this report and try again.':'The PDF could not be read. Choose a text-based DIALux PDF and try again.')}
  finally{if(task===currentTask){currentTask=null;await task.destroy()}}
}
function render(){
  const counts=new Map(),frag=document.createDocumentFragment();
  rows.forEach(r=>{
    const s=refs.get(r.standardId),status=assess(r,s),tr=document.createElement('tr');
    counts.set(status,(counts.get(status)||0)+1);
    const cell=(text='')=>{const td=textNode('td',text);tr.append(td);return td};
    cell(r.room).append(textNode('small',[r.floor,r.index,'PDF p. '+r.page].filter(Boolean).join(' · ')));
    const referenceCell = cell(s ? s.industry + ' / ' + s.area : 'No matching guide entry');
    referenceCell.append(textNode('small',s?s.edition+' · '+s.ref:'No comparable target available'));
    if (r.comparisonNote) referenceCell.append(textNode('small',r.comparisonNote));
    const compatible=s&&!s.reviewOnly&&!s.incompatible;
    cell(fmt(r.avg)+' / '+fmt(compatible?s.lux:null));cell(fmt(r.u)+' / '+fmt(compatible?s.uniformity:null));
    const badge=textNode('span',status);badge.className='lux-state '+status.toLowerCase().replace(/[^a-z]+/g,'-');cell().append(badge);frag.append(tr);
  });
  el('rows').replaceChildren(frag);el('summary').textContent=rows.length+' working planes · '+[...counts].map(([key,n])=>n+' '+key.toLowerCase()).join(' · ');
}
el('file').onchange=e=>analyse(e.target.files[0]);
el('rule').textContent=legend;
function loadExcel(){
  if(!excelLoader)excelLoader=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('./vendor/exceljs.min.js',import.meta.url).href;s.onload=resolve;s.onerror=()=>{excelLoader=null;s.remove();reject(Error('Workbook library unavailable'))};document.head.append(s)});
  return excelLoader;
}
async function logo(){
  const img=new Image();img.src=new URL('../assets/studio-logo.png',import.meta.url).href;await img.decode();
  const c=document.createElement('canvas');c.width=360;c.height=Math.round(c.width*img.naturalHeight/img.naturalWidth);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/png');
}
async function download(kind){
  const token=job;el(kind).disabled=true;
  try{
    const image=await logo();if(token!==job)return;
    const payload={filename,rows,refs,logo:image,warnings};
    if(kind==='pdf'){pdfReport(payload,window.jspdf.jsPDF,window.OMEGALUXFonts).save('OMEGALUX-Lux-Comparison.pdf');return}
    await loadExcel();if(token!==job)return;
    const bytes=await workbookReport(payload,window.ExcelJS).xlsx.writeBuffer();if(token!==job)return;
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const a=document.createElement('a');a.href=url;a.download='OMEGALUX-Lux-Comparison.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch{if(token===job)message('Download could not be created. Please retry.')}finally{el(kind).disabled=false}
}
el('pdf').onclick=()=>download('pdf');el('xlsx').onclick=()=>download('xlsx');
