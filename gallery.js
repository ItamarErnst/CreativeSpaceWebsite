// Artwork gallery: discovers PNGs under images/ and rotates them
(function(){
  'use strict';

  let images = [];
  let index = 0;
  const imageElement = document.getElementById('art-image');

  function setTitleFromImage(path) {
    const fileWithExt = path.split('/').pop();
    const file = fileWithExt.replace(/\.[^/.]+$/, '');
    const titleElement = document.getElementById('art-title');
    if (titleElement) titleElement.textContent = file;
  }

  async function fetchDirectoryPNGs() {
    try {
      const res = await fetch('images/');
      if (res.ok) {
        const text = await res.text();
        const matches = Array.from(text.matchAll(/href=["']([^"']+\.png)["']/gi))
          .map(m => m[1])
          .filter(href => href.toLowerCase().endsWith('.png'))
          .map(href => href.startsWith('images/') ? href : `images/${href}`);
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
    if (!imageElement) return;
    let list = await fetchDirectoryPNGs();
    if (!list.length) list = await probeNumberedPNGs();
    if (!list.length) {
      const url = imageElement.getAttribute('src') || imageElement.src;
      if (url) list = [url];
    }
    images = list;
    if (!images.length) return;

    index = 0;
    imageElement.src = images[0];
    setTitleFromImage(images[0]);

    if (images.length > 1) {
      setInterval(() => {
        index = (index + 1) % images.length;
        imageElement.src = images[index];
        setTitleFromImage(images[index]);
      }, 4000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', discoverImages);
  } else {
    discoverImages();
  }
})();
