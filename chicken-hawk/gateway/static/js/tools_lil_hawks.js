// Lil_Hawk roster — calls /hawks (existing endpoint).
const listEl = document.getElementById('lh-list');

const HAWK_DESCRIPTIONS = {
  Lil_TRAE_Hawk: 'Heavy coding, repo-wide refactors',
  Lil_Coding_Hawk: 'Plan-first feature work',
  Lil_Agent_Hawk: 'OS/browser/CLI workflows',
  Lil_Flow_Hawk: 'SaaS/CRM/payment automation',
  Lil_Sand_Hawk: 'Safe containerized code execution',
  Lil_Memory_Hawk: 'Long-term RAG memory',
  Lil_Graph_Hawk: 'Stateful conditional workflows',
  Lil_Back_Hawk: 'Backend scaffolding, auth, APIs',
  Lil_Viz_Hawk: 'Monitoring dashboards',
  Lil_Blend_Hawk: '3D modeling, rendering',
  Lil_Deep_Hawk: 'SuperAgent, Squad mode',
};

async function load() {
  try {
    const res = await TC.fetch('/hawks');
    if (!res.ok) {
      listEl.innerHTML = `<div class="msg error">HTTP ${res.status}</div>`;
      return;
    }
    const data = await res.json();
    const hawks = data.hawks || [];
    if (!hawks.length) { listEl.innerHTML = '<div class="tc-empty">no hawks configured</div>'; return; }
    listEl.innerHTML = `
      <table class="tc-table">
        <thead><tr><th>Name</th><th>Specialty</th><th>Status</th></tr></thead>
        <tbody>
          ${hawks.map(h => `
            <tr>
              <td><span class="tc-code">${h}</span></td>
              <td>${HAWK_DESCRIPTIONS[h] || '—'}</td>
              <td>${TC.pill('ok', 'configured')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="desc" style="margin-top:14px">Spawn / inspect / retire write actions land in Wave 2.</p>`;
  } catch (err) {
    listEl.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
}
load();
