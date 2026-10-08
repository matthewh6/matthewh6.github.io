// Task tiles preview on intent; the real-robot comparison keeps its visible-video playback and shared controls.
export function initMedia(doc, { still = false } = {}) {
  const videos = [...doc.querySelectorAll('video[data-src]')].filter((v) => !v.closest('.task-preview'));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.getAttribute('src')) v.src = v.dataset.src;
        if (!still && v.dataset.userPaused !== '1') v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    }
  }, { rootMargin: '300px 0px' });
  videos.forEach((v) => io.observe(v));

  doc.querySelectorAll('button[data-toggle]').forEach((b) => {
    const targets = b.dataset.toggle.split(' ').map((id) => doc.getElementById(id));
    b.addEventListener('click', () => {
      const play = targets.every((v) => v.paused);
      for (const v of targets) {
        v.dataset.userPaused = play ? '0' : '1';
        if (play) v.play().catch(() => {});
        else v.pause();
      }
      b.textContent = play ? 'Pause' : 'Play';
      b.setAttribute('aria-pressed', String(!play));
    });
  });

  doc.querySelectorAll('.task-preview').forEach((preview) => {
    const video = preview.querySelector('video');
    const button = preview.querySelector('.task-control');
    if (!video || !button) return;
    let wanted = false, hovering = false, keyboardFocus = false, version = 0;
    const show = (playing) => {
      preview.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} video: ${button.dataset.task}`);
    };
    const pause = () => {
      wanted = false;
      version += 1;
      video.pause();
      show(false);
    };
    const stop = () => {
      pause();
      if (video.readyState > 0) video.currentTime = 0;
      preview.classList.toggle('has-frame', false);
      preview.classList.toggle('is-active', false);
    };
    const start = () => {
      if (wanted) return;
      wanted = true;
      const request = ++version;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().catch(() => { if (request === version) stop(); });
    };
    video.addEventListener('playing', () => {
      if (wanted) {
        preview.classList.toggle('has-frame', true);
        show(true);
      } else video.pause();
    });
    video.addEventListener('error', stop);
    preview.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      hovering = true;
      preview.classList.toggle('is-active', true);
      if (!still) start();
    });
    preview.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      hovering = false;
      keyboardFocus = false;
      stop();
    });
    button.addEventListener('pointerdown', () => { keyboardFocus = false; });
    button.addEventListener('focus', () => {
      keyboardFocus = button.matches(':focus-visible');
      preview.classList.toggle('is-active', hovering || keyboardFocus);
      if (keyboardFocus && !still) start();
    });
    button.addEventListener('blur', () => {
      keyboardFocus = false;
      if (!hovering) stop();
    });
    button.addEventListener('click', () => wanted ? pause() : start());
    button.addEventListener('keydown', (e) => { if (e.key === 'Escape') stop(); });
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }).observe(preview);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); });
    show(false);
  });
}
