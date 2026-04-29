// Audit chain panel — task lookup + integrity check.
const taskEl = document.getElementById('au-task');
const lookupBtn = document.getElementById('au-lookup');
const clearBtn = document.getElementById('au-clear');
const resultEl = document.getElementById('au-result');
const integrityBtn = document.getElementById('au-integrity');
const integrityResultEl = document.getElementById('au-integrity-result');

function renderReceipts(data) {
  const receipts = data.receipts || [];
  if (!receipts.length) {
    return `<div class="tc-empty">no receipts for <span class="tc-code">${data.task_id}</span></div>`;
  }
  return `
    <div style="margin-bottom:10px"><strong>${receipts.length}</strong> receipt(s) for <span class="tc-code">${data.task_id}</span></div>
    <table class="tc-table">
      <thead><tr><th>Receipt</th><th>Action</th><th>Verdict</th><th>When</th><th>Elapsed</th></tr></thead>
      <tbody>
        ${receipts.map(r => `
          <tr>
            <td><span class="tc-code">${r.receipt_id || '—'}</span></td>
            <td>${r.action || '—'}</td>
            <td>${TC.pill(r.verdict === 'allow' ? 'ok' : r.verdict === 'escalate' ? 'warn' : 'err', r.verdict || '?')}</td>
            <td>${TC.fmtDate(r.decided_at)}</td>
            <td>${(r.elapsed_ms || 0).toFixed(1)} ms</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

lookupBtn.addEventListener('click', async () => {
  const task = taskEl.value.trim();
  if (!task) { taskEl.focus(); return; }
  resultEl.innerHTML = '<div class="tc-empty">looking up…</div>';
  try {
    const res = await TC.fetch(`/audit/${encodeURIComponent(task)}`);
    if (!res.ok) {
      resultEl.innerHTML = `<div class="msg error">HTTP ${res.status}</div>`;
      return;
    }
    resultEl.innerHTML = renderReceipts(await res.json());
  } catch (err) {
    resultEl.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
});

clearBtn.addEventListener('click', () => {
  taskEl.value = ''; resultEl.innerHTML = ''; taskEl.focus();
});

integrityBtn.addEventListener('click', async () => {
  integrityResultEl.innerHTML = '<div class="tc-empty">checking…</div>';
  try {
    const res = await TC.fetch('/audit/integrity-check');
    if (!res.ok) {
      integrityResultEl.innerHTML = `<div class="msg error">HTTP ${res.status} — endpoint may not be wired yet (Wave 1 in-memory ledger).</div>`;
      return;
    }
    const data = await res.json();
    integrityResultEl.innerHTML = `
      <div>${TC.pill(data.ok ? 'ok' : 'error', data.ok ? 'OK' : 'BROKEN')}</div>
      <div style="margin-top:8px"><strong>Chain length:</strong> ${data.chain_length ?? '—'}</div>
      ${data.broken_at ? `<div><strong>Broken at:</strong> <span class="tc-code">${data.broken_at}</span></div>` : ''}`;
  } catch (err) {
    integrityResultEl.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
});

taskEl.focus();
