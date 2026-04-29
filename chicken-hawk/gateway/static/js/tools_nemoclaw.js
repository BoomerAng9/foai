// Policy Gate panel — verdict tester + risk-event feed.
const checkBtn = document.getElementById('ng-check');
const clearBtn = document.getElementById('ng-clear');
const actionEl = document.getElementById('ng-action');
const tagsEl = document.getElementById('ng-tags');
const resultEl = document.getElementById('ng-result');
const eventsEl = document.getElementById('ng-events');

function renderVerdict(data) {
  const verdict = data.verdict || 'unknown';
  const tone = verdict === 'allow' ? 'ok' : verdict === 'escalate' ? 'warn' : 'err';
  return `
    <div class="tc-card" style="margin:0">
      <div>${TC.pill(tone, verdict.toUpperCase())}</div>
      <div style="margin-top:10px"><strong>Basis:</strong> ${data.basis || '—'}</div>
      <div style="margin-top:6px"><strong>Reason:</strong> ${data.reason || '—'}</div>
      ${data.matched_tags?.length ? `<div style="margin-top:6px"><strong>Matched tags:</strong> ${data.matched_tags.map(t => `<span class="tc-code">${t}</span>`).join(' ')}</div>` : ''}
    </div>
  `;
}

checkBtn.addEventListener('click', async () => {
  const action_type = actionEl.value.trim();
  if (!action_type) { actionEl.focus(); return; }
  const risk_tags = tagsEl.value.split(',').map(s => s.trim()).filter(Boolean);
  resultEl.innerHTML = '<div class="tc-empty">checking…</div>';
  try {
    const res = await TC.fetch('/check', {
      method: 'POST',
      body: JSON.stringify({ action_type, risk_tags }),
    });
    if (!res.ok) {
      resultEl.innerHTML = `<div class="msg error">HTTP ${res.status} — ${await res.text()}</div>`;
      return;
    }
    resultEl.innerHTML = renderVerdict(await res.json());
  } catch (err) {
    resultEl.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
});

clearBtn.addEventListener('click', () => {
  actionEl.value = ''; tagsEl.value = ''; resultEl.innerHTML = '';
  actionEl.focus();
});

async function loadEvents() {
  try {
    const res = await TC.fetch('/risk-events?limit=20');
    if (!res.ok) {
      eventsEl.innerHTML = `<div class="msg error">HTTP ${res.status}</div>`;
      return;
    }
    const data = await res.json();
    const events = data.events || data || [];
    if (!events.length) {
      eventsEl.innerHTML = '<div class="tc-empty">no risk events recorded</div>';
      return;
    }
    eventsEl.innerHTML = `
      <table class="tc-table">
        <thead><tr><th>When</th><th>Severity</th><th>Category</th><th>Description</th></tr></thead>
        <tbody>
          ${events.map(e => `
            <tr>
              <td>${TC.fmtDate(e.recorded_at)}</td>
              <td>${TC.pill(e.severity === 'high' ? 'error' : e.severity === 'medium' ? 'warn' : 'muted', e.severity || '?')}</td>
              <td><span class="tc-code">${e.category || '?'}</span></td>
              <td>${e.description || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    eventsEl.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
}

loadEvents();
actionEl.focus();
