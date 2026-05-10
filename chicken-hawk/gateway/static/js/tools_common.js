// Tool Chest — shared helpers.

const TC = {
  async fetch(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('unauthorized');
    }
    return res;
  },
  pill(status, label) {
    const cls = { ok: 'ok', live: 'ok', error: 'err', warn: 'warn', muted: 'muted' }[status] || 'muted';
    return `<span class="tc-pill ${cls}">${label}</span>`;
  },
  fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  },
  setActive() {
    const path = window.location.pathname;
    document.querySelectorAll('.tc-nav a').forEach((a) => {
      if (a.getAttribute('href') === path) a.classList.add('active');
      else if (a.classList.contains('active') && a.getAttribute('href') !== path) a.classList.remove('active');
    });
  },
  async loadHealth() {
    const target = document.getElementById('tc-health');
    if (!target) return;
    try {
      const res = await this.fetch('/internal/health');
      if (!res.ok) {
        target.innerHTML = this.pill('error', `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      target.innerHTML = this.pill(data.status === 'ok' ? 'ok' : 'warn', data.status);
    } catch {
      target.innerHTML = this.pill('error', 'offline');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  TC.setActive();
  TC.loadHealth();
});

window.TC = TC;
