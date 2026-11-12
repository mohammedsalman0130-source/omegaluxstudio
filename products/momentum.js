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
