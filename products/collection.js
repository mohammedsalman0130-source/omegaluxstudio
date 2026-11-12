'use strict';
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
