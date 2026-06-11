(function () {
  var root = document.documentElement;
  var KEY = 'theme';

  // Set theme before first paint (avoids a flash): saved choice, else default light.
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  root.setAttribute('data-theme', saved || 'light');

  document.addEventListener('DOMContentLoaded', function () {
    // Theme toggle.
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
      });
    }

    // Thumbnail videos: respect reduced-motion, and only load/play once scrolled
    // into view so the initial page load stays light (videos are preload="none").
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    var vids = document.querySelectorAll('video.thumb-media');
    var play = function (v) { var p = v.play(); if (p && p.catch) { p.catch(function () {}); } };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { play(e.target); }
          else { e.target.pause(); }
        });
      }, { threshold: 0.25 });
      for (var i = 0; i < vids.length; i++) { io.observe(vids[i]); }
    } else {
      for (var j = 0; j < vids.length; j++) { play(vids[j]); }
    }
  });
}());
