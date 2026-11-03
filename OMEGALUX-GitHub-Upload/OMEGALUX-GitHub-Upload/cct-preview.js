(() => {
  const walk = document.querySelector('.villa-walkthrough');
  if (!walk) return;
  const choices = [...document.querySelectorAll('[name="villa-cct"]')];
  const explore = document.querySelector('#explore-villa');
  const description = document.querySelector('.cct-description');
  const notes = {
    2700: '2700K · Extra warm — an intimate, golden atmosphere.',
    3000: '3000K · Warm white — a soft, welcoming balance.',
    4000: '4000K · Neutral white — a clearer, more neutral appearance.',
    6500: '6500K · Cool daylight — a crisp, cooler light colour.'
  };
  let revision = 0;
  const originals = [...walk.querySelectorAll('.villa-scene > img')].map(img => {
    const source = new Image();
    const ready = new Promise((resolve, reject) => {
      source.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(source, 0, 0);
        resolve({ canvas, context, pixels: context.getImageData(0, 0, canvas.width, canvas.height) });
      };
      source.onerror = reject;
    });
    source.src = img.src;
    return { img, src: img.src, alt: img.alt, ready, url: null };
  });
  const clamp = value => Math.max(0, Math.min(1, value));
  async function apply(kelvin) {
    const current = ++revision;
    explore.disabled = true;
    description.textContent = 'Preparing your selected lighting atmosphere…';
    try {
      const rendered = await Promise.all(originals.map(async original => {
        const { canvas, context, pixels } = await original.ready;
        if (kelvin === 3000) return original.src;
        const output = new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height);
        const d = output.data;
        // Weight the adjustment toward illuminated warm surfaces. Blue sky,
        // water, darker shadows and the architecture retain their original detail.
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const warmth = clamp((r - b - 3) / 60);
          const brightness = clamp((r * .2126 + g * .7152 + b * .0722 - 28) / 120);
          const weight = warmth * brightness;
          if (kelvin === 2700) {
            d[i] = r * (1 + .045 * weight);
            d[i + 1] = g * (1 - .045 * weight);
            d[i + 2] = b * (1 - .18 * weight);
          } else {
            const mix = weight * (kelvin === 4000 ? .52 : .92);
            const level = r * .88 + g * .12;
            d[i] = r + (level * (kelvin === 6500 ? .96 : 1.01) - r) * mix;
            d[i + 1] = g + (level - g) * mix;
            d[i + 2] = b + (level * (kelvin === 6500 ? 1.09 : .94) - b) * mix;
          }
        }
        context.putImageData(output, 0, 0);
        return new Promise(resolve => canvas.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : original.src), 'image/jpeg', .94));
      }));
      if (current !== revision) { rendered.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }); return; }
      originals.forEach((original, i) => {
        if (original.url) URL.revokeObjectURL(original.url);
        original.url = rendered[i].startsWith('blob:') ? rendered[i] : null;
        original.img.src = rendered[i];
        original.img.alt = original.alt.replace(/warm /g, '') + ` — illustrative ${kelvin}K lighting preview`;
      });
      walk.dataset.cct = String(kelvin);
      document.querySelector('.selected-cct').textContent = `${kelvin}K`;
      description.textContent = notes[kelvin];
      explore.disabled = false;
    } catch {
      if (current === revision) description.textContent = 'The lighting preview could not load. Please refresh and choose a CCT again.';
    }
  }
  choices.forEach(choice => choice.addEventListener('change', () => apply(Number(choice.value))));
  explore.addEventListener('click', () => {
    walk.hidden = false;
    window.dispatchEvent(new Event('resize'));
    walk.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
})();
