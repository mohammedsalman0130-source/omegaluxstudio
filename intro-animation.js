(()=>{
'use strict';
const timeline={omegaStart:.65,omegaEnd:4.15,arcStart:4.65,arcEnd:6.65,flareStart:6.42,omegaWord:7.05,luxWord:8.05,studioWord:8.95,end:11.4};
let frame=0;
const clamp=v=>Math.min(1,Math.max(0,v));
const ease=v=>v*v*(3-2*v);
const progress=(time,start,end)=>ease(clamp((time-start)/(end-start)));
function stateAt(t){const arc=progress(t,timeline.arcStart,timeline.arcEnd);return {omega:progress(t,timeline.omegaStart,timeline.omegaEnd),arc,flare:progress(t,timeline.flareStart,7.05),omegaWord:progress(t,timeline.omegaWord,7.85),luxWord:progress(t,timeline.luxWord,8.75),studioWord:progress(t,timeline.studioWord,9.8)}}
function arcPoint(t){const u=1-t;return {x:u*u*u*500+3*u*u*t*626+3*u*t*t*1055+t*t*t*1163,y:u*u*u*366+3*u*u*t*510+3*u*t*t*374+t*t*t*153}}
function render(stage,t){const s=stateAt(t);for(const name of ['omega','arc']){const trace=stage.querySelector(`[data-${name}-trace]`);trace.setAttribute('stroke-dashoffset',Number(trace.dataset.length)*(1-s[name]))}const p=arcPoint(s.arc),light=stage.querySelector('[data-travelling-light]');light.setAttribute('transform',`translate(${p.x} ${p.y})`);light.setAttribute('opacity',s.arc>0&&s.arc<1?Math.min(1,s.arc*12,(1-s.arc)*12):0);const flare=stage.querySelector('[data-flare]');flare.setAttribute('opacity',s.flare);const scale=1+.1*Math.sin(Math.PI*s.flare);flare.setAttribute('transform',`translate(1163 153) scale(${scale})`);for(const [name,width] of [['omega',1103],['lux',595],['studio',1698]]){const value=s[name+'Word'];stage.querySelector(`[data-word="${name}"]`).setAttribute('opacity',value);stage.querySelector(`[data-letter-mask="${name}"]`).setAttribute('width',width*value)}stage.dataset.phase=t<timeline.omegaStart?'black':t<timeline.omegaEnd?'omega':t<timeline.arcStart?'omega-complete':t<timeline.arcEnd?'arc':t<timeline.omegaWord?'light':t<timeline.end?'wordmark':'complete';return s}
function stop(){cancelAnimationFrame(frame);frame=0}
async function play(stage,done){stop();render(stage,0);const runToken={};play.token=runToken;await Promise.all(['/assets/intro-wordmark.png','/assets/intro-copper-texture.jpg'].map(async src=>{const im=new Image();im.src=src;try{await im.decode()}catch{}}));if(play.token!==runToken)return;const started=performance.now();function tick(now){const t=(now-started)/1000;render(stage,t);if(t>=timeline.end){frame=0;done();return}frame=requestAnimationFrame(tick)}frame=requestAnimationFrame(tick)}
const cancel=()=>{play.token=null;stop()};
window.OmegaIntro={play,stop:cancel,stateAt,render,timeline};
})();
