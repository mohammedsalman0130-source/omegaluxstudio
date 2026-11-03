(()=>{
const q=s=>document.querySelector(s);
const isPrint=new URLSearchParams(location.search).get('print')==='1';
const selectedPanel=()=>!q('#sll-guide').hidden?q('#reference-panel'):q('#manual-result');
function syncLinks(){const url=new URL(location.href);url.searchParams.set('print','1');url.hash='';for(const id of ['#print','#manual-print'])q(id).href=url.pathname+url.search;if(isPrint){const back=q('#print-back');if(back){url.searchParams.delete('print');back.href=url.pathname+url.search}}}
function makeButton(label,action){const b=document.createElement('button');b.type='button';b.className='text-link';b.textContent=label;b.onclick=action;return b}
const clean=s=>s.replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/·/g,' / ').replace(/§/g,'section ').replace(/₀/g,'0').replace(/ₘ/g,'m').replace(/ρ/g,'rho').replace(/×/g,'x').replace(/²/g,'2').replace(/↗|↺/g,'').replace(/[^\x20-\x7E\n]/g,' ');
function createPDF(){
 const panel=selectedPanel();if(!panel||panel.hidden)throw new Error('Choose an area before downloading.');
 const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});for(const style of ['normal','bold']){pdf.addFileToVFS('Reference-'+style+'.ttf',window.OMEGALUXFonts[style]);pdf.addFont('Reference-'+style+'.ttf','Reference',style)}let y=18;
 const line=(text,size=10,bold=false)=>{if(bold&&y>250){pdf.addPage();y=18}pdf.setFont('Reference',bold?'bold':'normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(clean(text),174);for(const part of lines){if(y>276){pdf.addPage();y=18}pdf.text(part,18,y);y+=size*.46}y+=4};
 const title=panel.querySelector('h2').textContent;
 pdf.setProperties({title:title+' - OMEGALUX Studio',author:'OMEGALUX Studio'});
 line('OMEGALUX STUDIO / LIGHTING REFERENCE',10,true);line(title,20,true);
 const category=panel.querySelector('#category,#manual-group');if(category)line(category.textContent,9);
 function table(head,body){pdf.autoTable({head:[head.map(clean)],body:body.map(row=>row.map(clean)),startY:y,margin:{left:18,right:18,top:18,bottom:18},theme:'grid',styles:{font:'Reference',fontSize:9,cellPadding:3,textColor:0,fillColor:255,lineColor:180,lineWidth:.15,overflow:'linebreak'},headStyles:{fillColor:240,textColor:0,fontStyle:'bold'},columnStyles:{0:{cellWidth:Math.min(85,174/head.length*1.5)}},rowPageBreak:'avoid'});y=pdf.lastAutoTable.finalY+8}
 const metrics=[];panel.querySelectorAll('.metrics article,.secondary-metrics>div,.criteria-grid>div').forEach(a=>{const label=a.querySelector('span,dt');const val=a.querySelector('strong,dd');if(label&&val){const unit=a.querySelector('b');metrics.push([label.textContent,val.textContent+(unit?' '+unit.textContent:'')])}});if(metrics.length)table(['Parameter','Requirement'],metrics);
 panel.querySelectorAll('.reference-table').forEach(t=>{const head=[...t.querySelectorAll('thead th')].map(x=>x.textContent);const body=[...t.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(x=>x.textContent));table(head,body)});
 panel.querySelectorAll('.uniformity-context,.application-note,.source-box,.guide-caveat').forEach(a=>{if(a.hidden)return;const heading=a.querySelector('span');if(heading)line(heading.textContent,9,true);const paragraphs=a.querySelectorAll('p,small');if(paragraphs.length)paragraphs.forEach(p=>line(p.textContent));else line(a.textContent)});
 const count=pdf.getNumberOfPages();for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(70);pdf.text('OMEGALUX Studio | '+i+' / '+count,18,289)}
 return {pdf,filename:'OMEGALUX-'+title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')+'.pdf'};
}
function download(){const status=q('#print-status');try{const {pdf,filename}=createPDF();pdf.save(filename);if(status)status.textContent='PDF downloaded. Open it to print or save a copy.'}catch(e){if(status)status.textContent=e.message;else alert(e.message)}}
// A real link opens an unembedded, printable page. The PDF download also works
// in embedded browsers that do not expose a native print dialog.
for(const id of ['#print','#manual-print']){q(id).addEventListener('click',syncLinks);q(id).after(makeButton('Download PDF ↓',download))}
for(const event of ['change','input','click'])document.addEventListener(event,()=>queueMicrotask(syncLinks));
if(isPrint){document.body.classList.add('print-view');const bar=document.createElement('div');bar.className='print-toolbar';bar.setAttribute('aria-label','Print reference controls');const back=document.createElement('a');back.id='print-back';back.textContent='← Back to lighting guide';back.className='text-link';bar.append(back,makeButton('Print / Save as PDF',()=>{try{window.print();q('#print-status').textContent='If the print dialog does not appear, use Download PDF and print the saved file.'}catch{q('#print-status').textContent='Printing is unavailable in this browser. Use Download PDF.'}}),makeButton('Download PDF ↓',download));const status=document.createElement('p');status.id='print-status';status.role='status';status.textContent='Print the selected reference or download a PDF copy.';bar.append(status);document.body.prepend(bar);document.title=(selectedPanel()?.querySelector('h2')?.textContent||'Lighting reference')+' — Print — OMEGALUX Studio'}
syncLinks();
// Used by the reference export check and by the download controls above.
window.OMEGALUXReferencePDF=createPDF;
})();
