(() => {
  const hero = document.querySelector('.hero-carousel');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('.hero-slide')];
  const dots = [...hero.querySelectorAll('[data-hero-go]')];
  const pause = hero.querySelector('.hero-pause');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0, paused = motion.matches, interval;
  function show(index, announce = false) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === active);
      slide.setAttribute('aria-hidden', String(i !== active));
      slide.inert = i !== active;
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === active)));
    if (announce) hero.querySelector('.hero-status').textContent = `Slide ${active + 1} of 3: ${slides[active].querySelector('.hero-title').textContent}`;
  }
  function schedule() {
    clearInterval(interval);
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pause.setAttribute('aria-pressed', String(paused));
    if (!paused && !document.hidden) interval = setInterval(() => {
      if (document.querySelector('#intro:not(.hidden)') || hero.contains(document.activeElement) || hero.matches(':hover')) return;
      show(active + 1);
    }, 8500);
  }
  const navigate = index => { show(index, true); schedule(); };
  dots.forEach((dot, i) => dot.addEventListener('click', () => navigate(i)));
  hero.querySelector('[data-hero-prev]').addEventListener('click', () => navigate(active - 1));
  hero.querySelector('[data-hero-next]').addEventListener('click', () => navigate(active + 1));
  pause.addEventListener('click', () => { paused = !paused; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { paused = motion.matches; schedule(); });
  schedule();
})();
