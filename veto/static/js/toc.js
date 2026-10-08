// Pick the last heading that has reached the reading position, including short final sections.
export function activeSectionIndex(tops, readingY, atBottom = false) {
  if (atBottom) return tops.length - 1;
  return tops.findLastIndex((top) => top <= readingY);
}

export function initToc(nav) {
  const links = [...nav.querySelectorAll('.toc-link')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href')));
  const panel = nav.querySelector('details');
  const summary = panel.querySelector('summary');
  const compact = matchMedia('(max-width: 1279px)');
  const fit = () => { panel.open = !compact.matches; };
  fit();
  compact.addEventListener('change', fit);

  new IntersectionObserver(([entry]) => {
    nav.classList.toggle('is-visible', !entry.isIntersecting);
  }, { threshold: 0.02 }).observe(document.getElementById('hero'));

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const current = activeSectionIndex(sections.map((s) => s.getBoundingClientRect().top), Math.min(160, window.innerHeight * .25), atBottom);
    links.forEach((link, i) => {
      if (i === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);
  links.forEach((link, i) => link.addEventListener('click', () => {
    if (!compact.matches) return;
    panel.open = false;
    sections[i].setAttribute('tabindex', '-1');
    sections[i].focus({ preventScroll: true });
  }));
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !compact.matches) return;
    panel.open = false;
    summary.focus();
  });
  update();
  nav.dataset.ready = '1';
}
