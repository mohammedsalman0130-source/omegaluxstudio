import {assess,legend} from './engine.mjs';
const title='Lux comparison';
const scope='DIALux working-plane average illuminance and uniformity are compared with the website standards matched by room use.';
const columns=['Storey','Working plane','Index','PDF page','Applicable reference task','Average lx achieved','Average lx required','U0 achieved','U0 required','Minimum lx','Maximum lx','Status'];
const shades={'Passed':'D6EADC','Slightly passed':'F8E8BE','Fail':'F1D8D4','Not assessed':'E3E5E7'};
const taskText=s=>s?[s.area,s.sourceReference].join('\n'):'No matching guide entry';
const values=(r,s)=>[r.floor||'—',r.room,r.index||'—',r.page,taskText(s),r.avg,s?.lux,r.u,s?.uniformity,r.min,r.max,assess(r,s)];
const conditional=s=>s?.incompatible||s?.reviewOnly;
function line(r,refs){
  const s=refs.get(r.standardId),row=values(r,s);
  if(conditional(s)){row[4]+='\n'+conditional(s);row[6]=null;row[8]=null}
  return row;
}
export function pdfReport({filename,rows,refs,logo,warnings=[]},jsPDF,fonts){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  let font='helvetica';
  if(fonts){
    font='Reference';
    for(const style of ['normal','bold']){doc.addFileToVFS(style+'.ttf',fonts[style]);doc.addFont(style+'.ttf',font,style)}
  }
  doc.setProperties({title,author:'OMEGALUX Studio'});
  const display=r=>line(r,refs).map(v=>v??'—');
  doc.autoTable({head:[columns],body:rows.map(display),margin:{top:42,right:10,bottom:16,left:10},startY:42,
    styles:{font,fontSize:7,cellPadding:1.8,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:'#28473A'},alternateRowStyles:{fillColor:'#F3F4EE'},rowPageBreak:'avoid',
    columnStyles:{0:{cellWidth:24},1:{cellWidth:37},2:{cellWidth:12},3:{cellWidth:12},4:{cellWidth:65},11:{cellWidth:23}},
    didParseCell({section,column,cell}){if(section==='body'&&column.index===11){cell.styles.fillColor='#'+shades[cell.raw];cell.styles.textColor='#23362C';cell.styles.fontStyle='bold'}}
  });
  if(warnings.length)doc.autoTable({startY:doc.lastAutoTable.finalY+6,head:[['Extraction notes']],body:warnings.map(w=>[w]),margin:{top:42,left:10,right:10,bottom:16},styles:{font,fontSize:8},headStyles:{fillColor:'#28473A'}});
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);doc.addImage(logo,'PNG',10,6,37,20);doc.setTextColor('#244437');
    doc.setFont(font,'bold');doc.setFontSize(17);doc.text(title,53,13);
    doc.setFont(font,'normal');doc.setFontSize(8);doc.text(scope,53,19);
    doc.text(doc.splitTextToSize('Source: '+filename,225).slice(0,2),53,24);
    doc.setFontSize(7.5);doc.text(legend,10,37,{maxWidth:275});
    doc.text('OMEGALUX Studio  /  Lighting Guide',10,203);doc.text(i+' / '+pages,287,203,{align:'right'});
  }
  return doc;
}
export function workbookReport({filename,rows,refs,logo,warnings=[]},ExcelJS){
  const wb=new ExcelJS.Workbook();wb.creator='OMEGALUX Studio';wb.title=title;
  const ws=wb.addWorksheet(title,{views:[{state:'frozen',ySplit:5}],pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
  ws.columns=[26,32,12,12,65,18,18,16,16,16,16,20].map(width=>({width}));
  const image=wb.addImage({base64:logo,extension:'png'});
  ws.addImage(image,{tl:{col:0,row:0},br:{nativeCol:0,nativeColOff:1209675,nativeRow:2,nativeRowOff:152400},editAs:'oneCell'});
  [title,scope,'Source: '+filename,legend].forEach((v,i)=>{
    ws.mergeCells(i+1,2,i+1,12);const cell=ws.getCell(i+1,2);cell.value=v;cell.font={bold:i===0,size:i===0?20:11,color:{argb:'FF28473A'}};cell.alignment={vertical:'middle',wrapText:true};ws.getRow(i+1).height=i===0?32:25;
  });
  const head=ws.addRow(columns);head.height=34;
  head.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF28473A'}};c.alignment={vertical:'middle',wrapText:true}});
  for(const r of rows){
    const v=line(r,refs),row=ws.addRow(v.map(x=>x??null)),n=row.number;
    row.height=Math.max(60,Math.ceil(v[4].length/53)*17+24,Math.ceil(r.room.length/26)*16+12);
    row.alignment={vertical:'middle',wrapText:true};
    row.getCell(12).value={formula:`IF(OR(COUNT(F${n}:I${n})<4,F${n}<0,H${n}<0,H${n}>1,AND(ISNUMBER(J${n}),J${n}>F${n}),AND(ISNUMBER(K${n}),K${n}<F${n})),"Not assessed",IF(OR(F${n}<G${n},H${n}<I${n}),"Fail",IF(OR(F${n}<=G${n}*1.05+1E-9,H${n}<=I${n}*1.05+1E-9),"Slightly passed","Passed")))`,result:v[11]};
  }
  const last=ws.rowCount;
  ws.autoFilter='A5:L'+last;
  if(last>5)ws.addConditionalFormatting({ref:'L6:L'+last,rules:Object.entries(shades).map(([status,color],i)=>({type:'expression',priority:i+1,formulae:['L6="'+status+'"'],style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FF'+color}}}}))});
  ws.pageSetup.printTitlesRow='1:5';wb.calcProperties.fullCalcOnLoad=true;
  if(warnings.length){const notes=wb.addWorksheet('Extraction notes');notes.getColumn(1).width=110;warnings.forEach(w=>notes.addRow([w]))}
  return wb;
}
