(() => {
  const section = document.querySelector('.partner-marquee');
  if (!section) return;
  const viewport = section.querySelector('.partner-window');
  const track = section.querySelector('.partner-track');
  const originals = [...track.children];
  originals.forEach(item => item.classList.remove('is-centered'));
  section.classList.add('is-ready');
  const toggle = section.querySelector('[data-partner-pause]');
  const caption = section.querySelector('.partner-current');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, visible = !('IntersectionObserver' in window), offset = 0, cycle = 0, last = 0, frame = 0, active = null;
  // Two identical copies make the right-to-left loop seamless at every viewport width.
  for (let copy = 0; copy < 2; copy++) originals.forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });
  const items = [...track.children];
  const mod = (n, d) => ((n % d) + d) % d;
  let centers = [];
  function paint() {
    track.style.transform = `translate3d(${-offset}px,0,0)`;
    const center = viewport.clientWidth / 2 + offset;
    let selected = 0, nearest = Infinity;
    centers.forEach((x, i) => { const distance = Math.abs(x - center); if (distance < nearest) { nearest = distance; selected = i; } });
    if (items[selected] !== active) {
      active?.classList.remove('is-centered');
      active = items[selected]; active.classList.add('is-centered');
      caption.textContent = active.dataset.partner;
    }
  }
  function measure() {
    const oldCycle = cycle;
    cycle = items[originals.length].offsetLeft - items[0].offsetLeft;
    centers = items.map(item => item.offsetLeft + item.offsetWidth / 2);
    offset = oldCycle ? mod(offset / oldCycle * cycle, cycle) : mod(cycle - viewport.clientWidth / 2 + items[0].offsetWidth / 2, cycle);
    paint();
  }
  function tick(now) {
    frame = 0;
    const elapsed = last ? Math.min(now - last, 64) : 0; last = now;
    if (!paused && visible && !document.hidden && cycle) { offset = mod(offset + elapsed * .032, cycle); paint(); }
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function sync() {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Play logo reel' : 'Pause logo reel';
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  new ResizeObserver(measure).observe(viewport);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.1 }).observe(section);
  section.querySelectorAll('[data-partner-step]').forEach(button => button.addEventListener('click', () => {
    paused = true;
    const step = items[1].offsetLeft - items[0].offsetLeft;
    offset = mod(offset + Number(button.dataset.partnerStep) * step, cycle);
    paint(); sync();
  }));
  measure(); sync();
})();
