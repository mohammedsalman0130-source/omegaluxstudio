'use strict';
function applyStudioNavigation(){
  const header=document.querySelector('header.mast');
  if(!header)return;
  header.className='mast site-mast';
  header.innerHTML='<a class="brand original-brand" href="/" aria-label="OMEGALUX Studio home"><img src="/assets/studio-logo.png" alt="OMEGALUX Studio"></a><button class="site-menu-toggle" type="button" aria-expanded="false" aria-controls="site-main-nav">Menu <span aria-hidden="true">☰</span></button><nav id="site-main-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/expertise.html">About Us</a><a href="/approach.html">Our approach</a><a class="nav-current" href="/products/">Products</a><a href="/recommendations.html">Lighting guide</a><a href="/blog.html">Blog</a><a class="nav-cta" href="/contact.html">Let’s talk <span aria-hidden="true">↗</span></a></nav>';
  const toggle=header.querySelector('.site-menu-toggle');
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));header.classList.toggle('nav-open',open)});
}
applyStudioNavigation();
const element = id => document.getElementById(id);
const payload = element('page-data');
const data = payload ? JSON.parse(payload.textContent) : null;
if (document.body.dataset.page === 'category') {
  const grid = element('cards');
  const cards = Array.from(grid.children);
  const search = element('search');
  const lamp = element('lamp-filter');
  const sort = element('sort');
  const refresh = () => {
    const query = search.value.trim().toLowerCase();
    const matches = data.map((item, index) => ({item, card:cards[index]}))
      .filter(({item}) => [item.name,item.ref,...item.codes].join(' ').toLowerCase().includes(query) && (!lamp.value || item.lamps.includes(lamp.value)));
    if (sort.value) matches.sort((a,b) => a.item.name.localeCompare(b.item.name) * (sort.value === 'az' ? 1 : -1));
    for (const {item,card} of matches) {
      const exact=item.codes.find(code=>code.toLowerCase()===query);
      card.href='product-'+item.key+'.html'+(exact?'?model='+encodeURIComponent(exact):'');
    }
    grid.replaceChildren(...matches.map(match=>match.card));
    element('results').textContent = matches.length + (matches.length === 1 ? ' design' : ' designs');
    element('empty').hidden = matches.length !== 0;
  };
  search.addEventListener('input', refresh);
  lamp.addEventListener('change', refresh);
  sort.addEventListener('change', refresh);
  element('clear').addEventListener('click', () => { search.value=''; lamp.value=''; sort.value=''; refresh(); search.focus(); });
  if (location.hash === '#search') search.focus();
}
if (document.body.dataset.page === 'product') {
  const coverImages = document.querySelectorAll('.picture-pair .photo-open img');
  coverImages.forEach((image, index) => { data.images[index].src = image.getAttribute('src'); });
  const outline = data.outline || element('drawing').getAttribute('src');
  const selector=element('variant');
  const current=()=> data.variants[Number(selector?.value || 0)];
  function updateVariant() {
    const v=current();
    for (const [id,value] of Object.entries({ref:v.code,dimcode:v.code,lamp:v.lamp,material:v.materials,size:v.dimensions,dimension:v.dimensions})) element(id).textContent=value;
    const original = data.sketch && Number(selector?.value || 0) === data.sketch.variant;
    element('drawing').src = original ? data.sketch.path : outline;
    element('draw-caption').textContent = original ? data.sketch.caption : 'Illustrative outline · not to scale';
    element('size-study').hidden=!v.sizeStudy;
    if (v.sizeStudy) element('measure-image').src=v.sizeStudy;
    element('copy-status').textContent='';
  }
  if (selector) {
    const url=new URL(location.href);
    const requested=data.variants.findIndex(v=>v.code===url.searchParams.get('model'));
    if (requested>=0) { selector.value=String(requested);updateVariant(); }
    selector.addEventListener('change',()=>{
      updateVariant();
      const next=new URL(location.href);
      next.searchParams.set('model',current().code);
      history.replaceState(null,'',next);
    });
  }

  // Product downloads: create a data-backed PDF for the active product/model.
  function ensureDatasheetLibrary() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!window.__omegaluxPdfLibrary) {
      window.__omegaluxPdfLibrary = new Promise((resolve,reject) => {
        const script=document.createElement('script');
        script.src='/vendor/jspdf.umd.min.js';
        script.onload=()=>window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('PDF library did not initialize'));
        script.onerror=()=>reject(new Error('PDF library could not be loaded'));
        document.head.appendChild(script);
      });
    }
    return window.__omegaluxPdfLibrary;
  }
  function readImageForPdf(image,mime='image/jpeg') {
    return new Promise(resolve => {
      if (!image) return resolve(null);
      const draw=()=>{
        try {
          if (!image.naturalWidth || !image.naturalHeight) return resolve(null);
          const canvas=document.createElement('canvas');
          canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
          const ctx=canvas.getContext('2d');
          if (mime==='image/jpeg') { ctx.fillStyle='#f6f3ed'; ctx.fillRect(0,0,canvas.width,canvas.height); }
          ctx.drawImage(image,0,0);
          resolve({data:canvas.toDataURL(mime,mime==='image/jpeg'?0.88:undefined),format:mime==='image/png'?'PNG':'JPEG',width:canvas.width,height:canvas.height});
        } catch { resolve(null); }
      };
      if (image.complete) draw();
      else { image.addEventListener('load',draw,{once:true}); image.addEventListener('error',()=>resolve(null),{once:true}); }
    });
  }
  function placePdfImage(pdf,item,x,y,w,h) {
    if (!item) return false;
    const scale=Math.min(w/item.width,h/item.height);
    const drawW=item.width*scale, drawH=item.height*scale;
    pdf.addImage(item.data,item.format,x+(w-drawW)/2,y+(h-drawH)/2,drawW,drawH);
    return true;
  }
  function addDatasheetDownload() {
    if (document.querySelector('.product-downloads')) return;
    const quote=document.querySelector('.product-info > .solid');
    if (!quote) return;
    const details=document.createElement('details');
    details.className='product-downloads';
    const summary=document.createElement('summary');
    summary.innerHTML='<span>Downloads</span><span class="download-chevron" aria-hidden="true">⌄</span>';
    const link=document.createElement('a');
    link.className='product-download-link';
    link.href='#technical-specification';
    link.setAttribute('aria-label','Download technical specification PDF');
    link.innerHTML='<span>Technical specification</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19v2h16v-2"/></svg>';
    link.addEventListener('click',async event=>{
      event.preventDefault();
      if (link.dataset.busy==='true') return;
      link.dataset.busy='true';
      const label=link.querySelector('span');
      const original=label.textContent;
      label.textContent='Preparing PDF…';
      link.setAttribute('aria-busy','true');
      try {
        const JsPDF=await ensureDatasheetLibrary();
        const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4'});
        const pageW=210, margin=14, ink=[37,43,39], green=[40,70,65], gold=[177,154,114], muted=[111,113,106], paper=[251,250,247], line=[216,210,199];
        const categoryNames={table:'Table lamps',pendant:'Pendant lights',chandelier:'Chandeliers',floor:'Floor lamps',wall:'Wall lights'};
        const variant=current()||{};
        const category=categoryNames[data.category]||'Decorative lighting';
        pdf.setProperties({title:data.name+' | OMEGALUX Technical Specification',subject:'Product technical specification',author:'OMEGALUX Studio'});
        pdf.setFillColor(...green); pdf.rect(0,0,pageW,34,'F');
        const logo=await readImageForPdf(document.querySelector('header.mast .brand img'),'image/png');
        placePdfImage(pdf,logo,13,4,47,26);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(246,243,237);
        pdf.text('PRODUCT TECHNICAL SHEET',pageW-margin,14,{align:'right'});
        pdf.setFontSize(6.5); pdf.text(category.toUpperCase(),pageW-margin,20,{align:'right'});
        pdf.setDrawColor(...gold); pdf.setLineWidth(.25); pdf.line(margin,32,pageW-margin,32);

        pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.setTextColor(...gold);
        pdf.text((category+' / NATURAL STONE').toUpperCase(),margin,45);
        const cover=await readImageForPdf(document.querySelector('.picture-pair figure:first-child img'),'image/jpeg');
        placePdfImage(pdf,cover,113,43,83,82);
        pdf.setDrawColor(...line); pdf.rect(113,43,83,82);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(5.7); pdf.setTextColor(...muted);
        pdf.text('STUDIO VISUALISATION',196,128,{align:'right'});

        let titleSize=27;
        pdf.setFont('times','normal'); pdf.setTextColor(...ink);
        let titleLines=pdf.splitTextToSize(data.name,91);
        while(titleLines.length>2 && titleSize>18){titleSize-=1;pdf.setFontSize(titleSize);titleLines=pdf.splitTextToSize(data.name,91);}
        pdf.setFontSize(titleSize); pdf.text(titleLines,margin,59,{lineHeightFactor:1.02});
        let descY=59+(titleLines.length*titleSize*0.38)+7;
        pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.setTextColor(73,83,76);
        const descriptionLines=pdf.splitTextToSize(data.description||'',92);
        pdf.text(descriptionLines.slice(0,5),margin,descY,{lineHeightFactor:1.35});
        pdf.setDrawColor(...gold); pdf.setLineWidth(.5); pdf.line(margin,descY+Math.min(descriptionLines.length,5)*4.2+4,margin+13,descY+Math.min(descriptionLines.length,5)*4.2+4);

        pdf.setDrawColor(...ink); pdf.setLineWidth(.35); pdf.line(margin,137,pageW-margin,137);
        pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5); pdf.setTextColor(...green);
        pdf.text('TECHNICAL SPECIFICATION',margin,145);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(6.2); pdf.setTextColor(...muted);
        pdf.text('PUBLISHED PRODUCT INFORMATION',pageW-margin,145,{align:'right'});
        const specs=[
          ['MODEL REFERENCE',variant.code||data.ref||'To be confirmed'],
          ['PRODUCT FAMILY','Alabaster Collection'],
          ['MATERIALS',variant.materials||'To be confirmed'],
          ['OVERALL DIMENSIONS',variant.dimensions||'To be confirmed'],
          ['LIGHT SOURCE',variant.lamp||'To be confirmed'],
          ['MAKE / ORIGIN','PRC']
        ];
        const gap=4, colW=(pageW-2*margin-2*gap)/3, tileH=22, firstY=151;
        specs.forEach((item,index)=>{
          const row=Math.floor(index/3),col=index%3,x=margin+col*(colW+gap),y=firstY+row*(tileH+4);
          pdf.setFillColor(...paper); pdf.roundedRect(x,y,colW,tileH,1.5,1.5,'F');
          pdf.setFont('helvetica','bold'); pdf.setFontSize(5.8); pdf.setTextColor(...gold);
          pdf.text(item[0],x+3,y+6);
          pdf.setFont('helvetica','normal'); pdf.setFontSize(7.4); pdf.setTextColor(...ink);
          const valueLines=pdf.splitTextToSize(String(item[1]),colW-6).slice(0,2);
          pdf.text(valueLines,x+3,y+14,{lineHeightFactor:1.15});
        });

        pdf.setDrawColor(...line); pdf.setLineWidth(.3); pdf.line(margin,205,pageW-margin,205);
        pdf.setFont('helvetica','bold'); pdf.setFontSize(7.2); pdf.setTextColor(...green);
        pdf.text('APPLICATION',margin,214); pdf.text('DIMENSIONS & SKETCH',112,214);
        const application=await readImageForPdf(document.querySelector('.picture-pair figure:nth-child(2) img'),'image/jpeg');
        placePdfImage(pdf,application,margin,220,82,55);
        if (application) {pdf.setDrawColor(...line);pdf.rect(margin,220,82,55);}
        const study=element('size-study') && !element('size-study').hidden ? element('measure-image') : element('drawing');
        const drawing=await readImageForPdf(study,'image/png') || await readImageForPdf(element('drawing'),'image/png');
        placePdfImage(pdf,drawing,112,220,84,55);
        if (drawing) {pdf.setDrawColor(...line);pdf.rect(112,220,84,55);}
        pdf.setFont('helvetica','normal'); pdf.setFontSize(6.2); pdf.setTextColor(...muted);
        pdf.text('APPLICATION VISUALISATION',margin,279);
        pdf.text(String(variant.dimensions||''),112,279);
        pdf.setDrawColor(...line); pdf.line(margin,287,pageW-margin,287);
        pdf.setFontSize(6.5); pdf.text('OMEGALUX STUDIO  ·  UAE',margin,292);
        pdf.text('www.omegaluxstudio.com',pageW-margin,292,{align:'right'});
        const slug=data.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||data.key;
        pdf.save('omegalux-'+slug+'.pdf');
      } catch(error) {
        console.error('OMEGALUX datasheet generation failed',error);
        window.alert('The technical specification PDF could not be generated. Please try again.');
      } finally {
        label.textContent=original;
        link.removeAttribute('aria-busy');
        delete link.dataset.busy;
      }
    });
    details.append(summary,link);
    quote.insertAdjacentElement('afterend',details);
  }
  addDatasheetDownload();

  element('copy').addEventListener('click', async () => {
    const v=current();
    const text=[data.name,v.code,v.dimensions,v.lamp,v.materials].join(' · ');
    try {await navigator.clipboard.writeText(text);element('copy-status').textContent='Copied '+v.code;}
    catch {element('copy-status').textContent=text; const range=document.createRange();range.selectNodeContents(element('copy-status'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
  });
  const modal=element('lightbox');let active=0;
  function showSlide(index){active=(index+data.images.length)%data.images.length;const photo=data.images[active];element('lb-image').src=photo.src;element('lb-image').alt=data.name+' · '+photo.label;element('lb-count').textContent=(active+1)+' / '+data.images.length+' · '+photo.label;}
  document.querySelectorAll('[data-slide]').forEach(button=>button.addEventListener('click',()=>{showSlide(Number(button.dataset.slide));modal.showModal();}));
  for(const [id,step] of [['prev',-1],['next',1]]) {element(id).hidden=data.images.length<2;element(id).addEventListener('click',()=>showSlide(active+step));}
  element('close').addEventListener('click',()=>modal.close());
  modal.addEventListener('click',e=>{if(e.target===modal){const box=modal.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom) modal.close();}});
  modal.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')showSlide(active-1);if(e.key==='ArrowRight')showSlide(active+1);});
}
