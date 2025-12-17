// Simple drawing pad with mouse/touch support
(function () {
  const canvas = document.getElementById('draw-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Keep an internal logical size separate from CSS size for crisp lines
  function resizeCanvasToDisplaySize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Some mobile browsers may report zero height briefly while aspect-ratio settles
    const measuredWidth = rect.width || canvas.clientWidth || 300;
    const measuredHeight = rect.height || measuredWidth; // square by CSS
    const displaySize = Math.min(measuredWidth, measuredHeight);
    const target = Math.max(200, Math.min(420, Math.floor(displaySize)));
    const nextWidth = Math.round(target * dpr);
    const nextHeight = Math.round(target * dpr);

    // If the backing store size changed, update it
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    // Always reset transform before applying DPR scale to avoid compounding
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Repaint background in CSS pixel units
    ctx.fillStyle = '#fefee6';
    ctx.fillRect(0, 0, nextWidth / dpr, nextHeight / dpr);
  }

  // Initial setup
  resizeCanvasToDisplaySize();
  window.addEventListener('resize', resizeCanvasToDisplaySize);

  // Drawing state
  let drawing = false;
  let last = null;
  const strokeStyle = '#0b3a4a';
  const lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Status element
  const statusEl = document.getElementById('draw-status');
  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
  }

  function getPoint(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    return { x, y };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    last = getPoint(e);
    // Remove status when starting to draw again
    setStatus('');
    // Also remove the optional alternate mail button when drawing resumes
    try { removeOtherMailButton(); } catch (_) {}
  }

  function move(e) {
    if (!drawing) return;
    const p = getPoint(e);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  }

  function end() {
    drawing = false;
    last = null;
  }

  // Mouse
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  // Touch
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end, { passive: false });

  // DONE button behavior
  const doneBtn = document.getElementById('draw-done');
  // We will open Gmail compose in a new tab by default, with an optional
  // fallback button to open the system default mail client via mailto.
  function clearCanvas() {
    // Explicitly clear and repaint regardless of size change
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fefee6';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  // Email composition helpers
  const EMAIL_TO = 'bliblablu.art@gmail.com';
  const EMAIL_SUBJECT = 'New drawing from BliBlaBlu website';
  const EMAIL_BODY_TEXT = [
    'A visitor drew something for you on BliBlaBlu.',
    '',
    'The image has been copied to your clipboard.',
    'Please paste it into this email (Ctrl/Cmd + V) and send.',
    '',
    'Please include a title for your creation and your name so we can credit you in our gallery.',
    '',
    'Thank you!'
  ].join('\n');

  // Alternate body for devices where copying fails: ask for a screenshot instead
  const EMAIL_BODY_SCREENSHOT = [
    'A visitor drew something for you on BliBlaBlu.',
    '',
    'On this device the drawing could not be copied automatically.',
    'Please take a screenshot of your drawing and attach it to this email, then send it.',
    '',
    'Please include a title for your creation and your name so we can credit you in our gallery.',
    '',
    'Thank you!'
  ].join('\n');

  function openShortMailto(bodyText) {
    const href = `mailto:${encodeURIComponent(EMAIL_TO)}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(bodyText)}`;
    // Use a temporary anchor to trigger the default mail client reliably
    const a = document.createElement('a');
    a.href = href;
    a.style.display = 'none';
    // Try opening in a new tab/window if browser allows; many will hand off to app
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    // Cleanup
    setTimeout(() => {
      if (a && a.parentNode) a.parentNode.removeChild(a);
    }, 0);
  }

  function openGmailCompose(bodyText) {
    const params = new URLSearchParams({
      view: 'cm',
      to: EMAIL_TO,
      su: EMAIL_SUBJECT,
      body: bodyText
    });
    const gmailUrl = `https://mail.google.com/mail/?${params.toString()}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  }

  // Container where we may inject the "Open Other mail instead" button
  const drawArea = document.getElementById('draw-area');
  let otherMailBtn = null;

  function ensureOtherMailButton() {
    if (otherMailBtn) return otherMailBtn;
    otherMailBtn = document.createElement('button');
    otherMailBtn.type = 'button';
    otherMailBtn.textContent = 'Open Other mail instead';
    otherMailBtn.className = 'draw-clear'; // reuse secondary button style
    otherMailBtn.style.marginTop = '8px';
    otherMailBtn.addEventListener('click', () => {
      openShortMailto(EMAIL_BODY_TEXT);
    });
    // Place it under the status line if possible
    const status = document.getElementById('draw-status');
    if (status && status.parentNode) {
      status.parentNode.insertBefore(otherMailBtn, status.nextSibling);
    } else if (drawArea) {
      drawArea.appendChild(otherMailBtn);
    }
    return otherMailBtn;
  }

  function removeOtherMailButton() {
    if (otherMailBtn && otherMailBtn.parentNode) {
      otherMailBtn.parentNode.removeChild(otherMailBtn);
    }
    otherMailBtn = null;
  }

  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      try {
        // Try copying the actual PNG image to clipboard (best case)
        let copied = false;
        try {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            copied = true;
          }
        } catch (_) {
          // ignore; we will fall back to opening Gmail with screenshot instructions
        }

        // Update status only when copy truly succeeded
        if (copied) {
          setStatus('Drawing copied to clipboard');
        } else {
          setStatus('');
        }

        // Decide behavior based on device: on mobile, prompt to screenshot and open default mail app
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
        if (isMobile) {
          // Show a temporary mobile-only hint
          setStatus('ScreenShot to complete');
          // Give the user a short moment to take a screenshot before opening mail
          setTimeout(() => {
            openShortMailto(EMAIL_BODY_SCREENSHOT);
          }, 1200);
        } else {
          // Desktop: open Gmail compose in a new tab by default
          openGmailCompose(copied ? EMAIL_BODY_TEXT : EMAIL_BODY_SCREENSHOT);
          // After opening Gmail, show an optional button to use the default mail app instead
          ensureOtherMailButton();
        }
      } catch (err) {
        console.error('Failed to prepare the drawing', err);
        alert('Sorry, could not prepare the drawing to send.');
      }
    });
  }

  // Clear button behavior
  const clearBtn = document.getElementById('draw-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearCanvas();
      // Remove status when clearing
      setStatus('');
      removeOtherMailButton();
    });
  }

  // By default we open Gmail compose in a new tab on DONE; an optional
  // "Open Other mail instead" button lets users use their default mail app via mailto.
})();
