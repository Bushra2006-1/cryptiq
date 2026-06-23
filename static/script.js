/* ============================================================
   CRYPTIQ — Frontend interactions
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initParticleField();
  initScrollReveal();
  initNavScroll();
  initHeroEnclave();
  initModeButtons();
  initDropzone('stampDropzone', 'stampFile', 'stampFileName');
  initDropzone('verifyDropzone', 'verifyFile', 'verifyFileName');
  initStampForm();
  initVerifyForm();
  initModal();
  initAuth();
  loadRecentCertificates();
});

/* ---------- Particle field background ---------- */
function initParticleField() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COUNT = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 16000));

  function makeParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.5 + 0.15,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  for (let i = 0; i < COUNT; i++) particles.push(makeParticle());

  function tick() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const flicker = (Math.sin(p.pulse) + 1) / 2;
      const alpha = p.alpha * (0.5 + flicker * 0.5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(125, 200, 255, ${alpha})`;
      ctx.shadowColor = 'rgba(61,169,255,0.8)';
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------- Scroll reveal ---------- */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => observer.observe(el));
}

/* ---------- Navbar scroll state ---------- */
function initNavScroll() {
  const nav = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.style.boxShadow = '0 8px 30px -10px rgba(0,0,0,0.6)';
    } else {
      nav.style.boxShadow = 'none';
    }
  });
}

/* ---------- Hero enclave caption cycling ---------- */
function initHeroEnclave() {
  const caption = document.getElementById('enclaveCaption');
  if (!caption) return;
  const phases = [
    'Hashing file with SHA-256…',
    'Sealing fingerprint inside TEE enclave…',
    'Signing with hardware-bound key…',
    'Issuing permanent origin certificate…',
  ];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % phases.length;
    caption.style.opacity = 0;
    setTimeout(() => {
      caption.textContent = phases[i];
      caption.style.opacity = 1;
    }, 250);
  }, 900);
  caption.style.transition = 'opacity 0.25s';
}

/* ---------- Mode buttons scroll to relevant panel ---------- */
function initModeButtons() {
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const mode = btn.getAttribute('data-mode');
      setTimeout(() => {
        const panel = document.getElementById(mode === 'stamp' ? 'panel-stamp' : 'panel-verify');
        if (panel) {
          panel.style.transition = 'box-shadow 0.4s';
          panel.style.boxShadow = '0 0 0 2px rgba(61,169,255,0.6), 0 20px 60px -20px rgba(61,169,255,0.5)';
          setTimeout(() => (panel.style.boxShadow = ''), 1400);
        }
      }, 500);
    });
  });
}

/* ---------- Dropzone behavior ---------- */
function initDropzone(zoneId, inputId, nameId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const nameLabel = document.getElementById(nameId);
  if (!zone || !input) return;

  // `zone` is a <label> wrapping the hidden <input type="file">, so the
  // browser already opens the file picker natively on click via the
  // implicit label association. Do NOT also call input.click() here —
  // it fires a second, competing file-picker request that cancels the
  // first dialog in real browsers, leaving input.files empty.

  ['dragenter', 'dragover'].forEach((evt) => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
    });
  });
  zone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      nameLabel.textContent = file.name;
    }
  });
  input.addEventListener('change', () => {
    if (input.files[0]) nameLabel.textContent = input.files[0].name;
  });
}

/* ---------- Helpers ---------- */
function setLoading(button, loading) {
  const label = button.querySelector('.btn-label');
  const spinner = button.querySelector('.btn-spinner');
  button.disabled = loading;
  if (spinner) spinner.hidden = !loading;
  if (label) label.style.opacity = loading ? 0.5 : 1;
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function truncateHash(hash, len = 18) {
  if (!hash) return '';
  return `${hash.slice(0, len)}…${hash.slice(-8)}`;
}

/* ---------- Stamp form ---------- */
function initStampForm() {
  const form = document.getElementById('stampForm');
  const resultZone = document.getElementById('stampResult');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('stampSubmit');
    const fileInput = document.getElementById('stampFile');

    if (!fileInput.files[0]) {
      showToast('Please select a file to stamp.');
      return;
    }

    const formData = new FormData();
    formData.append('creator', document.getElementById('stampCreator').value);
    formData.append('origin', document.querySelector('input[name="origin"]:checked').value);
    formData.append('file', fileInput.files[0]);

    setLoading(submitBtn, true);
    resultZone.innerHTML = '';

    try {
      const res = await fetch('/stamp', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        resultZone.innerHTML = renderError(data.error || 'Failed to generate certificate.');
        return;
      }

      renderStampResult(resultZone, data.certificate);
      showToast('Certificate generated and sealed.');
      loadRecentCertificates();
    } catch (err) {
      resultZone.innerHTML = renderError('Network error — could not reach CRYPTIQ engine.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

/* ---------- Recent certificates ---------- */
async function loadRecentCertificates() {
  const list = document.getElementById('recentList');
  if (!list) return;

  try {
    const res = await fetch('/recent?limit=5');
    const data = await res.json();

    if (!res.ok || data.error || !Array.isArray(data.certificates)) {
      list.innerHTML = '<div class="recent-empty">Could not load recent certificates.</div>';
      return;
    }

    if (data.certificates.length === 0) {
      list.innerHTML = '<div class="recent-empty">No certificates yet — stamp a file to see it here.</div>';
      return;
    }

    list.innerHTML = data.certificates.map(renderRecentItem).join('');

    list.querySelectorAll('.recent-item').forEach((item) => {
      item.addEventListener('click', () => {
        const cert = JSON.parse(item.getAttribute('data-cert'));
        window.cryptiqShowCert(cert);
      });
    });

    list.querySelectorAll('.recent-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.closest('.recent-item').querySelector('.recent-delete-confirm').hidden = false;
      });
    });

    list.querySelectorAll('.recent-delete-no').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.closest('.recent-delete-confirm').hidden = true;
      });
    });

    list.querySelectorAll('.recent-delete-yes').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.recent-item');
        const stampId = item.getAttribute('data-stamp-id');
        try {
          const res = await fetch(`/certificate/${stampId}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok || data.error) {
            showToast(data.error || 'Failed to delete certificate.');
            return;
          }
          item.remove();
          showToast('Certificate deleted.');
          if (!list.querySelector('.recent-item')) {
            list.innerHTML = '<div class="recent-empty">No certificates yet — stamp a file to see it here.</div>';
          }
        } catch (err) {
          showToast('Network error — could not delete certificate.');
        }
      });
    });
  } catch (err) {
    list.innerHTML = '<div class="recent-empty">Could not load recent certificates.</div>';
  }
}

function renderRecentItem(cert) {
  const isAI = cert.origin === 'AI Generated';
  const badgeIcon = isAI
    ? '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="4" y="7" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 7V4h6v3M9 12h.01M15 12h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  return `
    <button type="button" class="recent-item" data-cert='${JSON.stringify(cert).replace(/'/g, "&#39;")}' data-stamp-id="${cert.stamp_id}">
      <span class="recent-item-badge ${isAI ? 'ai' : ''}">${badgeIcon}</span>
      <span class="recent-item-body">
        <span class="recent-item-top">
          <span class="recent-item-creator">${escapeHtml(cert.creator)}</span>
          <span class="recent-item-origin ${isAI ? 'ai' : 'human'}">${cert.origin}</span>
        </span>
        <span class="recent-item-meta">
          <span class="recent-item-file">${escapeHtml(cert.file_name)} · ${cert.stamp_id}</span>
          <span class="recent-item-time">${formatTimestamp(cert.timestamp)}</span>
        </span>
      </span>
      <span class="recent-delete-btn" role="button" tabindex="0" title="Delete certificate">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 7h16M9 7V4h6v3M7 7l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span class="recent-delete-confirm" hidden>
        <span class="recent-delete-confirm-text">Delete this certificate permanently?</span>
        <span class="recent-delete-actions">
          <span class="recent-delete-yes" role="button" tabindex="0">Yes</span>
          <span class="recent-delete-no" role="button" tabindex="0">No</span>
        </span>
      </span>
    </button>
  `;
}

function signatureBadgeHtml(cert) {
  return cert.identity_verified
    ? '<div class="signature-badge signed">🔒 Cryptographically Signed</div>'
    : '<div class="signature-badge unsigned">⚠️ Unverified Identity</div>';
}

function renderStampResult(container, cert) {
  container.innerHTML = `
    <div class="result-card verified">
      <div class="result-status verified">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5.5-3.8 8.7-8 10-4.2-1.3-8-4.5-8-10V6l8-4z" stroke="currentColor" stroke-width="1.8"/><path d="M9 12l2 2 4-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        CERTIFICATE ISSUED
      </div>
      ${signatureBadgeHtml(cert)}
      <div class="result-row"><span class="label">Stamp ID</span><span class="value">${cert.stamp_id}</span></div>
      <div class="result-row"><span class="label">Creator</span><span class="value">${escapeHtml(cert.creator)}</span></div>
      <div class="result-row"><span class="label">Origin</span><span class="value">${cert.origin}</span></div>
      <div class="result-row"><span class="label">File</span><span class="value">${escapeHtml(cert.file_name)}</span></div>
      <div class="result-row"><span class="label">SHA-256</span><span class="value">${truncateHash(cert.file_hash)}</span></div>
      <div class="result-row"><span class="label">TEE Enclave</span><span class="value">${cert.tee_enclave_id}</span></div>
      <div class="result-row"><span class="label">Issued</span><span class="value">${formatTimestamp(cert.timestamp)}</span></div>
      <div class="result-actions">
        <button class="mini-btn" onclick='window.cryptiqShowCert(${JSON.stringify(cert)})'>VIEW CERTIFICATE</button>
        <button class="mini-btn" onclick='window.cryptiqDownloadCert(${JSON.stringify(cert)})'>DOWNLOAD JSON</button>
      </div>
    </div>
  `;
}

function renderError(message) {
  return `
    <div class="result-card error">
      <div class="result-status none">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        ERROR
      </div>
      <p style="font-size:13px;color:var(--muted);">${escapeHtml(message)}</p>
    </div>
  `;
}

/* ---------- Verify form ---------- */
function initVerifyForm() {
  const form = document.getElementById('verifyForm');
  const resultZone = document.getElementById('verifyResult');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('verifySubmit');
    const fileInput = document.getElementById('verifyFile');

    if (!fileInput.files[0]) {
      showToast('Please select a file to verify.');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    setLoading(submitBtn, true);
    resultZone.innerHTML = '';

    try {
      const res = await fetch('/verify', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        resultZone.innerHTML = renderError(data.error || 'Verification failed.');
        return;
      }

      renderVerifyResult(resultZone, data);
    } catch (err) {
      resultZone.innerHTML = renderError('Network error — could not reach CRYPTIQ engine.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function renderVerifyResult(container, data) {
  const { status, certificate, computed_hash } = data;

  if (status === 'VERIFIED') {
    container.innerHTML = `
      <div class="result-card verified">
        <div class="result-status verified">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5.5-3.8 8.7-8 10-4.2-1.3-8-4.5-8-10V6l8-4z" stroke="currentColor" stroke-width="1.8"/><path d="M9 12l2 2 4-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          VERIFIED — ORIGIN CONFIRMED
        </div>
        <div class="result-row"><span class="label">Creator</span><span class="value">${escapeHtml(certificate.creator)}</span></div>
        <div class="result-row"><span class="label">Origin</span><span class="value">${certificate.origin}</span></div>
        <div class="result-row"><span class="label">Stamped</span><span class="value">${formatTimestamp(certificate.timestamp)}</span></div>
        <div class="result-row"><span class="label">SHA-256</span><span class="value">${truncateHash(computed_hash)}</span></div>
      </div>
    `;
  } else if (status === 'TAMPERED') {
    container.innerHTML = `
      <div class="result-card tampered">
        <div class="result-status tampered">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3z" stroke="currentColor" stroke-width="1.8"/><path d="M12 9v5M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          TAMPERED — HASH MISMATCH
        </div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:10px;">
          A certificate exists for this file name, but the content hash does not match the original.
          This file has been modified since it was stamped.
        </p>
        <div class="result-row"><span class="label">Computed SHA-256</span><span class="value">${truncateHash(computed_hash)}</span></div>
        <div class="result-row"><span class="label">Original Creator</span><span class="value">${escapeHtml(certificate.creator)}</span></div>
        <div class="result-row"><span class="label">Original Stamp</span><span class="value">${formatTimestamp(certificate.timestamp)}</span></div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="result-card none">
        <div class="result-status none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          NO STAMP FOUND
        </div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:10px;">
          This file has no CRYPTIQ certificate on record. Its origin cannot be verified.
        </p>
        <div class="result-row"><span class="label">Computed SHA-256</span><span class="value">${truncateHash(computed_hash)}</span></div>
      </div>
    `;
  }
}

/* ---------- Certificate modal ---------- */
function initModal() {
  const overlay = document.getElementById('certModalOverlay');
  const modal = document.getElementById('certModal');

  window.cryptiqShowCert = (cert) => {
    modal.innerHTML = `
      <button class="cert-close" id="certCloseBtn">&times;</button>
      <div class="cert-seal">
        <svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 2l8 4v6c0 5.5-3.8 8.7-8 10-4.2-1.3-8-4.5-8-10V6l8-4z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 12l2 2 4-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="cert-title">ORIGIN CERTIFICATE</div>
      <div class="cert-subtitle">CRYPTIQ v${cert.cryptiq_version} · TAMPER-PROOF</div>

      <div style="text-align:center;">${signatureBadgeHtml(cert)}</div>

      <div class="cert-field"><span class="k">Stamp ID</span><span class="v">${cert.stamp_id}</span></div>
      <div class="cert-field"><span class="k">Creator</span><span class="v">${escapeHtml(cert.creator)}</span></div>
      <div class="cert-field"><span class="k">Origin</span><span class="v ${cert.origin === 'AI Generated' ? 'tag-ai' : 'tag-human'}">${cert.origin}</span></div>
      <div class="cert-field"><span class="k">File Name</span><span class="v">${escapeHtml(cert.file_name)}</span></div>
      <div class="cert-field"><span class="k">SHA-256</span><span class="v">${cert.file_hash}</span></div>
      <div class="cert-field"><span class="k">Timestamp</span><span class="v">${formatTimestamp(cert.timestamp)}</span></div>
      <div class="cert-field"><span class="k">TEE Enclave ID</span><span class="v">${cert.tee_enclave_id}</span></div>
      <div class="cert-field"><span class="k">TEE Signature</span><span class="v">${truncateHash(cert.tee_signature, 24)}</span></div>
      <div class="cert-field"><span class="k">TEE Platform</span><span class="v">${cert.tee_platform || 'CRYPTIQ-SIM-ENCLAVE/v1'}</span></div>

      <div class="cert-actions">
        <button class="btn btn-outline btn-block" id="certDownloadBtn">DOWNLOAD JSON</button>
      </div>
    `;
    overlay.classList.add('active');

    document.getElementById('certCloseBtn').addEventListener('click', () => overlay.classList.remove('active'));
    document.getElementById('certDownloadBtn').addEventListener('click', () => window.cryptiqDownloadCert(cert));
  };

  window.cryptiqDownloadCert = (cert) => {
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cryptiq_certificate_${cert.stamp_id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  });
}

/* ---------- Account system (STAMP IT only) ---------- */
function initAuth() {
  const authLink = document.getElementById('authLink');
  const authBar = document.querySelector('.auth-bar');
  const authOverlay = document.getElementById('authModalOverlay');
  const authCloseBtn = document.getElementById('authCloseBtn');
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const creatorInput = document.getElementById('stampCreator');
  const verifiedBadge = document.getElementById('verifiedBadge');
  const authUserInfo = document.getElementById('authUserInfo');
  const authUserEmail = document.getElementById('authUserEmail');
  const logoutLink = document.getElementById('logoutLink');

  if (!authLink || !authOverlay) return;

  function applyLoggedInState(fullName, email) {
    creatorInput.value = fullName;
    creatorInput.readOnly = true;
    verifiedBadge.hidden = false;
    authUserEmail.textContent = email;
    authUserInfo.hidden = false;
    authBar.hidden = true;
  }

  function applyLoggedOutState() {
    creatorInput.readOnly = false;
    creatorInput.value = '';
    verifiedBadge.hidden = true;
    authUserInfo.hidden = true;
    authBar.hidden = false;
  }

  authLink.addEventListener('click', (e) => {
    e.preventDefault();
    tabs.forEach((t) => t.classList.remove('active'));
    document.querySelector('.auth-tab[data-tab="login"]').classList.add('active');
    loginForm.hidden = false;
    registerForm.hidden = true;
    authOverlay.classList.add('active');
  });
  authCloseBtn.addEventListener('click', () => authOverlay.classList.remove('active'));
  authOverlay.addEventListener('click', (e) => {
    if (e.target === authOverlay) authOverlay.classList.remove('active');
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.getAttribute('data-tab') === 'login';
      loginForm.hidden = !isLogin;
      registerForm.hidden = isLogin;
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('loginEmail').value,
          password: document.getElementById('loginPassword').value,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        errorEl.textContent = data.error || 'Login failed.';
        return;
      }
      applyLoggedInState(data.full_name, data.email);
      authOverlay.classList.remove('active');
      loginForm.reset();
      showToast('Logged in.');
    } catch (err) {
      errorEl.textContent = 'Network error — could not reach CRYPTIQ engine.';
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';
    try {
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: document.getElementById('registerFullName').value,
          email: document.getElementById('registerEmail').value,
          password: document.getElementById('registerPassword').value,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        errorEl.textContent = data.error || 'Registration failed.';
        return;
      }
      applyLoggedInState(data.full_name, data.email);
      authOverlay.classList.remove('active');
      registerForm.reset();
      showToast('Account created — logged in.');
    } catch (err) {
      errorEl.textContent = 'Network error — could not reach CRYPTIQ engine.';
    }
  });

  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/logout', { method: 'POST' });
    } finally {
      applyLoggedOutState();
      showToast('Logged out.');
    }
  });

  fetch('/me')
    .then((res) => res.json())
    .then((data) => {
      if (data.logged_in) applyLoggedInState(data.full_name, data.email);
    })
    .catch(() => {});
}

/* ---------- Utility ---------- */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
