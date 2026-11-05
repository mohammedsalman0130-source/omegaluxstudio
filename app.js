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
document.querySelectorAll('[data-service]').forEach(a=>a.href='contact.html?service='+encodeURIComponent(a.dataset.service));
