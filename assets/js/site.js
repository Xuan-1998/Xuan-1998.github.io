(() => {
  const burger = document.querySelector('[data-burger]');
  if (burger) {
    const panels = document.querySelectorAll('[data-collapse]');
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      burger.classList.toggle('is-active', open);
      panels.forEach((p) => p.classList.toggle('is-active', open));
    });
  }

  document.querySelectorAll('[data-abs]').forEach((btn) => {
    const box = document.getElementById(btn.getAttribute('aria-controls'));
    if (!box) return;
    btn.addEventListener('click', () => {
      const open = box.hidden;
      box.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // Autoplaying teaser videos stay on their poster frame for readers who ask for less motion.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('video[autoplay]').forEach((v) => {
      v.removeAttribute('autoplay');
      v.pause();
      v.controls = true;
    });
  }
})();
