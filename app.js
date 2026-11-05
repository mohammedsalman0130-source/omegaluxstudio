const BUSINESS_EMAIL = 'info@omegaluxstudio.com';
const DESIGN_EMAIL = 'design@omegaluxstudio.com';
const $=s=>document.querySelector(s);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const menu=$('.menu-toggle');
if(menu) menu.onclick=()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);$('#main-nav').classList.toggle('open',open)};
if($('#year')) $('#year').textContent=new Date().getFullYear();
const intro=$('#intro'); let timer,returnFocus; const INTRO_KEY='omegalux-intro-cinematic-v4-copper';
function endIntro(){if(!intro)return;window.OmegaIntro?.stop();intro.classList.add('hidden');intro.setAttribute('aria-hidden','true');intro.inert=true;document.body.style.overflow='';for(const el of document.querySelectorAll('main,header,footer'))el.inert=false;clearTimeout(timer);if(returnFocus&&returnFocus!==document.body)returnFocus.focus({preventScroll:true});sessionStorage.setItem(INTRO_KEY,'1')}
function startIntro(){if(!intro)return;if(reduceMotion.matches){endIntro();return}clearTimeout(timer);returnFocus=document.activeElement;intro.classList.remove('hidden');intro.removeAttribute('aria-hidden');intro.inert=false;document.body.style.overflow='hidden';for(const el of document.querySelectorAll('main,header,footer'))el.inert=true;const stage=intro.querySelector('.intro-stage');window.OmegaIntro.play(stage,endIntro);$('#skip').focus({preventScroll:true})}
if(intro){$('#skip').onclick=endIntro;if($('#replay'))$('#replay').onclick=startIntro;document.addEventListener('keydown',e=>{if(e.key==='Escape')endIntro()});if(!location.hash&&!sessionStorage.getItem(INTRO_KEY))startIntro();else endIntro()}
const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');reveal.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>reveal.observe(el));
// Each process step controls the adjacent drawing as it passes the centre of the viewport.
const phaseNames={design:['BRIEF','CONCEPT','VALIDATE','DETAIL','APPROVE','HANDOVER'],supply:['SOURCE','APPROVE','ORDER','CHECK','DELIVER','HANDOVER']};
let scrollPending=false;
function syncJourneys(){document.querySelectorAll('.journey').forEach(j=>{const steps=[...j.querySelectorAll('.journey-step')];let nearest=0,dist=Infinity;steps.forEach((step,i)=>{const r=step.getBoundingClientRect();const d=Math.abs(r.top+r.height/2-innerHeight*.55);if(d<dist){dist=d;nearest=i}});j.dataset.active=nearest;steps.forEach((s,i)=>s.classList.toggle('active',i===nearest));j.querySelector('.phase-count').textContent=`0${nearest+1} / 06`;j.querySelector('.phase-label').textContent=phaseNames[j.id][nearest];j.querySelector('.journey-progress i').style.width=`${(nearest+1)/6*100}%`});scrollPending=false}
if($('.journey')){addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(syncJourneys)}},{passive:true});addEventListener('resize',syncJourneys);syncJourneys()}
const form=$('#enquiry');
if(form){const dialog=$('#notice'),draft=$('#draft');$('#close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});form.addEventListener('change',()=>{form.elements.phone.required=form.elements.preference.value==='Callback'});
function compose(body){if(BUSINESS_EMAIL){location.href='mailto:'+(form.elements.service.value==='Lighting design'?DESIGN_EMAIL:BUSINESS_EMAIL)+'?subject='+encodeURIComponent('Project enquiry — OMEGALUX Studio')+'&body='+encodeURIComponent(body);$('#form-status').textContent='Thank you. Your email app will open with your enquiry. Send it there to complete your request.'}else{draft.value=body;$('#copy').textContent='Copy enquiry ↗';dialog.showModal()}}
form.onsubmit=e=>{e.preventDefault();const d=new FormData(form);compose(`Project enquiry\n\nName: ${d.get('name')}\nCompany: ${d.get('company')}\nEmail: ${d.get('email')}\nPhone: ${d.get('phone')||'Not provided'}\nRole: ${d.get('role')}\nService: ${d.get('service')}\nPreferred contact: ${d.get('preference')}\n\nProject details:\n${d.get('message')}`)};
$('#email').onclick=()=>compose('Hello OMEGALUX Studio,\n\nI would like to discuss lighting support for my project.\n\nProject:\nRequired services:\nContact details:');$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(draft.value);$('#copy').textContent='Copied ✓'}catch{draft.select();$('#copy').textContent='Select and copy the text above'}};
if(BUSINESS_EMAIL){form.querySelector('button[type=submit]').innerHTML='Send enquiry by email <span>↗</span>';$('#form-status').textContent='Opens your email app. Your details are shared only when you send.'}
const params=new URLSearchParams(location.search);if(params.get('brief')){form.elements.message.value=params.get('brief');$('#service').value='Lighting design'}if(['Lighting design','Lighting supply','Design & supply'].includes(params.get('service')))$('#service').value=params.get('service');}
document.querySelectorAll('[data-service]').forEach(a=>a.href='contact.html?service='+encodeURIComponent(a.dataset.service));

;
// Keep the document as the scroll surface so sticky sections and scroll-linked
// lighting effects follow the actual viewport throughout the glide.
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const decayMs = 225;
  const wheelTravel = 1.65;
  let frame = 0;
  let destination = 0;
  let position = 0;
  let lastViewportY = 0;
  let lastFrameTime = 0;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function maxScroll() {
    return Math.max(0, document.scrollingElement.scrollHeight - innerHeight);
  }

  function glide(now) {
    if (reducedMotion.matches || Math.abs(scrollY - lastViewportY) > 1) {
      stop();
      return;
    }
    destination = Math.min(destination, maxScroll());
    const remaining = destination - position;
    const elapsed = Math.max(0, now - lastFrameTime);
    const finish = Math.abs(remaining) < 0.05;
    position = finish ? destination : destination - remaining * Math.exp(-elapsed / decayMs);
    scrollTo({top: position, behavior: 'instant'});
    lastViewportY = scrollY;
    lastFrameTime = now;
    frame = finish ? 0 : requestAnimationFrame(glide);
  }

  function insideScrollControl(path) {
    return path.some(el => {
      if (!(el instanceof Element) || el === document.body || el === document.documentElement) return false;
      if (el.matches('input, textarea, select, dialog, iframe, [contenteditable]:not([contenteditable="false"])')) return true;
      return el.scrollHeight > el.clientHeight + 1 && /^(auto|scroll|overlay)$/.test(getComputedStyle(el).overflowY);
    });
  }

  addEventListener('wheel', event => {
    const mode = event.deltaMode;
    const delta = event.deltaY;
    const now = performance.now();
    // Precision mice and trackpads can both produce tiny fractional deltas.
    // A diagonal gesture belongs to the page when its vertical component dominates.
    if (!delta || reducedMotion.matches || event.defaultPrevented || !event.cancelable ||
        event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(delta) ||
        document.body.style.overflow === 'hidden' || insideScrollControl(event.composedPath())) {
      stop();
      return;
    }

    const pixels = delta * (mode === 1 ? 16 : mode === 2 ? innerHeight : 1);
    const current = scrollY;
    const continuing = frame && Math.abs(current - lastViewportY) <= 1 &&
      Math.sign(destination - current) === Math.sign(pixels);
    const base = continuing ? destination : current;
    // Limit queued travel during a fast spin. Reversing starts from the viewport.
    const limit = Math.max(innerHeight, 320);
    const travel = Math.max(-limit, Math.min(limit, base - current + pixels * wheelTravel));
    destination = Math.max(0, Math.min(maxScroll(), current + travel));
    if (destination === current) {
      stop();
      return;
    }
    event.preventDefault();
    if (!continuing) {
      position = current;
      lastViewportY = current;
      lastFrameTime = now;
    }
    if (!frame) frame = requestAnimationFrame(glide);
  }, {passive: false});

  for (const event of ['pointerdown', 'touchstart', 'keydown', 'resize', 'pagehide', 'hashchange', 'blur']) {
    addEventListener(event, stop, {passive: true});
  }
  reducedMotion.addEventListener('change', stop);
})();
