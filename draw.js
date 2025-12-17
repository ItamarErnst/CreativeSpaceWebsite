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
  // Removed manual copy fallback panel for mobile: we will just open Gmail
  function clearCanvas() {
    // Explicitly clear and repaint regardless of size change
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fefee6';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  // Email composition helpers (shared between mailto and Gmail link)
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

  function openGmailCompose(bodyText) {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(EMAIL_TO)}&su=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(bodyText)}`;
    // Open Gmail compose in a new tab as requested
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
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
        setStatus(copied ? 'Drawing copied to clipboard' : '');

        // Open Gmail compose with the appropriate body
        openGmailCompose(copied ? EMAIL_BODY_TEXT : EMAIL_BODY_SCREENSHOT);
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
    });
  }

  // Removed optional Gmail link setup; we now open Gmail by default on DONE
})();
