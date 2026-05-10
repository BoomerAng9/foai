// Customer chat — calls /api/public/chat (anonymous, persona-prepended).
const messagesEl = document.getElementById('ch-messages');
const formEl = document.getElementById('ch-form');
const inputEl = document.getElementById('ch-input');
const sendBtn = document.getElementById('ch-send');

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  if (role === 'user' || role === 'ch') {
    const r = document.createElement('div');
    r.className = 'role';
    r.textContent = role === 'user' ? 'You' : 'Chicken Hawk';
    el.appendChild(r);
  }
  const body = document.createElement('div');
  body.textContent = text;
  el.appendChild(body);
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  return el;
}

addMessage('system', "Hi. I'm Chicken Hawk. What do you need?");

async function send(message) {
  const userEl = addMessage('user', message);
  const pendingEl = addMessage('ch', '…');
  sendBtn.disabled = true;
  inputEl.disabled = true;
  try {
    const res = await fetch('/api/public/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (res.status === 429) {
      pendingEl.classList.replace('ch', 'error');
      pendingEl.querySelector('.role').remove();
      pendingEl.lastChild.textContent = "Slow down a moment — try again in a minute.";
      return;
    }
    if (!res.ok) {
      const detail = await res.text();
      pendingEl.classList.replace('ch', 'error');
      pendingEl.querySelector('.role').remove();
      pendingEl.lastChild.textContent = `Something went wrong (${res.status}). ${detail.slice(0, 200)}`;
      return;
    }
    const data = await res.json();
    pendingEl.lastChild.textContent = data.reply;
  } catch (err) {
    pendingEl.classList.replace('ch', 'error');
    pendingEl.querySelector('.role').remove();
    pendingEl.lastChild.textContent = `Connection error: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
  }
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = inputEl.value.trim();
  if (!msg) return;
  inputEl.value = '';
  send(msg);
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

inputEl.focus();
