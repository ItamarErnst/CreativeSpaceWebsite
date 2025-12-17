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
  const statusPanelId = 'draw-fallback-panel';
  function ensureFallbackPanel() {
    let panel = document.getElementById(statusPanelId);
    if (panel) return panel;
    const container = document.getElementById('draw-area') || canvas.parentElement;
    panel = document.createElement('div');
    panel.id = statusPanelId;
    panel.style.maxWidth = '520px';
    panel.style.margin = '6px auto 0';
    panel.style.padding = '8px 10px';
    panel.style.border = '2px solid rgba(255,255,255,0.5)';
    panel.style.borderRadius = '8px';
    panel.style.background = 'rgba(255,255,255,0.08)';
    panel.style.color = '#fefee6';
    panel.style.fontSize = '14px';
    panel.style.display = 'none';

    const msg = document.createElement('div');
    msg.id = statusPanelId + '-msg';
    msg.style.textAlign = 'center';
    msg.style.marginBottom = '6px';
    panel.appendChild(msg);

    const ta = document.createElement('textarea');
    ta.id = statusPanelId + '-ta';
    ta.readOnly = true;
    ta.style.width = '100%';
    ta.style.height = '80px';
    ta.style.borderRadius = '6px';
    ta.style.border = '1px solid rgba(255,255,255,0.4)';
    ta.style.background = 'rgba(255,255,255,0.12)';
    ta.style.color = '#fefee6';
    ta.style.padding = '6px';
    ta.style.fontFamily = 'monospace';
    ta.style.fontSize = '12px';
    ta.style.resize = 'vertical';
    panel.appendChild(ta);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.justifyContent = 'center';
    row.style.marginTop = '6px';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy now';
    copyBtn.style.background = '#e2c64b';
    copyBtn.style.color = '#0b3a4a';
    copyBtn.style.border = 'none';
    copyBtn.style.padding = '8px 12px';
    copyBtn.style.borderRadius = '8px';
    copyBtn.style.fontWeight = '800';
    copyBtn.style.cursor = 'pointer';
    copyBtn.addEventListener('click', async () => {
      try {
        ta.select();
        ta.setSelectionRange(0, 999999);
        const ok = document.execCommand('copy');
        setStatus(ok ? 'Drawing link copied. Paste it in Gmail.' : 'Select the text and copy it.');
      } catch (_) {
        setStatus('Select the text and copy it.');
      }
    });
    row.appendChild(copyBtn);

    panel.appendChild(row);
    container.appendChild(panel);
    return panel;
  }

  function showManualCopyPanel(dataUrl, reason) {
    const panel = ensureFallbackPanel();
    const msg = document.getElementById(statusPanelId + '-msg');
    const ta = document.getElementById(statusPanelId + '-ta');
    if (msg) {
      const insecure = (location.protocol !== 'https:' && location.hostname !== 'localhost');
      msg.textContent = reason || (insecure
        ? 'Copy is blocked on insecure connections. Use the button below.'
        : 'Copy didn\'t work on this device. Use the button below.');
    }
    if (ta) {
      ta.value = dataUrl;
    }
    panel.style.display = 'block';
  }

  function hideManualCopyPanel() {
    const panel = document.getElementById(statusPanelId);
    if (panel) panel.style.display = 'none';
  }
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

  function openGmailCompose() {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(EMAIL_TO)}&su=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY_TEXT)}`;
    // Open Gmail compose in a new tab as requested
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  }

  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      try {
        // Prefer copying the actual PNG image to clipboard
        let copied = false;
        hideManualCopyPanel();
        try {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            copied = true;
          }
        } catch (_) {
          // ignore and fallback to text
        }

        if (!copied) {
          // Fallback: copy Data URL as text
          const dataUrl = canvas.toDataURL('image/png');
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(dataUrl);
              copied = true;
            }
          } catch (err) {
            // As a last resort on mobile (notably iOS Safari), show manual copy UI
            showManualCopyPanel(dataUrl, 'Could not access clipboard on this device.');
          }
          if (!copied && /(iPad|iPhone|iPod)/i.test(navigator.userAgent)) {
            // iOS often blocks programmatic copy; show manual UI explicitly
            showManualCopyPanel(dataUrl);
          }
        }

        // Show confirmation below buttons
        setStatus(copied ? 'Drawing copied to clipboard' : 'Copy help shown below.');

        // Open Gmail compose by default
        openGmailCompose();
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
      hideManualCopyPanel();
    });
  }

  // Removed optional Gmail link setup; we now open Gmail by default on DONE
})();
