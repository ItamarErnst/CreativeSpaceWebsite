// Artwork gallery: discovers PNGs under images/ and rotates them
(function(){
  'use strict';

  let images = [];
  let index = 0;
  // Community gallery elements
  const galleryImg = document.getElementById('gallery-image');
  const galleryTitle = document.getElementById('gallery-title');
  const btnPrev = document.getElementById('gallery-prev');
  const btnNext = document.getElementById('gallery-next');

  async function fetchDirectoryPNGs() {
    try {
      const res = await fetch('images/');
      if (res.ok) {
        const text = await res.text();
        const matches = Array.from(text.matchAll(/href=["']([^"']+\.png)["']/gi))
          .map(m => m[1])
          .filter(href => href.toLowerCase().endsWith('.png'))
          .map(href => href.startsWith('images/') ? href : `images/${href}`)
          .filter(href => !/images\/nextEvent\//i.test(href)); // exclude nextEvent assets
        return [...new Set(matches)];
      }
    } catch (_) {}
    return [];
  }

  async function probeNumberedPNGs(max = 50) {
    const found = [];
    const checks = [];
    for (let i = 1; i <= max; i++) {
      const url = `images/art${i}.png`;
      checks.push(fetch(url, { method: 'HEAD' }).then(r => { if (r.ok) found.push(url); }).catch(()=>{}));
    }
    await Promise.all(checks);
    return found;
  }

  async function discoverImages() {
    let list = await fetchDirectoryPNGs();
    if (!list.length) list = await probeNumberedPNGs();
    // Fallback: if discovery fails, use the current community gallery image
    if (!list.length && galleryImg) {
      const url = galleryImg.getAttribute('src') || galleryImg.src;
      if (url) list = [url];
    }
    images = list;
    // No hero rotation or art-title updates needed; community gallery uses this list.
  }

  // Community gallery logic using the same discovered list
  function initCommunityGallery(){
    if (!galleryImg || !btnPrev || !btnNext) return;
    if (!images.length) return; // ensure discovery happened (shares same list)

    let gi = 0;
    function setGallery(i){
      gi = ((i % images.length) + images.length) % images.length;
      galleryImg.src = images[gi];
      const name = images[gi].split('/').pop().replace(/\.[^/.]+$/, '');
      if (galleryTitle) galleryTitle.textContent = name;
    }
    setGallery(0);

    function next(){ setGallery(gi+1); }
    function prev(){ setGallery(gi-1); }
    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);

    // Swipe support
    let sx=0, sy=0;
    galleryImg.addEventListener('touchstart', e=>{
      if (e.touches && e.touches[0]) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
    }, { passive: true });
    galleryImg.addEventListener('touchend', e=>{
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx; const dy = t.clientY - sy;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx < 0) next(); else prev();
      }
    });
    // Click advances too
    galleryImg.addEventListener('click', next);
  }

  async function init(){
    await discoverImages();
    initCommunityGallery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
