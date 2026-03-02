// ============================================
// BRO_CODEC — Shared Utilities
// ============================================

const WORKER_URL = 'https://bro-codec-api.bro-codec.workers.dev';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function cp(text, btn) {
  navigator.clipboard.writeText(text).catch(() => {
    const a = document.createElement('textarea');
    a.value = text;
    a.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(a);
    a.focus(); a.select();
    document.execCommand('copy');
    document.body.removeChild(a);
  });
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = orig, 1500);
  }
}

function dots() {
  return '<span class="dots"><span class="dot-red"></span> <span class="dot-yellow"></span> <span class="dot-green"></span></span>';
}

async function ai(system, message) {
  const resp = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system, message,
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    }),
  });
  if (!resp.ok) throw new Error('API error: ' + resp.status);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceBadge(source) {
  const s = (source || 'other').toLowerCase();
  const labels = { x: '𝕏', discord: 'DISCORD', youtube: 'YT', reddit: 'REDDIT', personal: 'IRL', other: 'OTHER' };
  return `<span class="source-badge source-badge--${s}">${labels[s] || s.toUpperCase()}</span>`;
}

function broScoreDisplay(score) {
  const s = score || 7;
  const cls = s <= 4 ? 'low' : s <= 7 ? 'mid' : 'high';
  return `<span class="bro-score bro-score--${cls}">${'⚡'.repeat(Math.min(s, 10))} ${s}/10</span>`;
}
