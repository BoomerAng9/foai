/**
 * ACHEEVY Embed Widget — Drop this on any website.
 *
 * Usage:
 *   <script src="https://deploy.foai.cloud/widget.js" data-key="YOUR_KEY"></script>
 *
 * Options (data attributes):
 *   data-key       — Access key (required)
 *   data-position  — "right" (default) or "left"
 *   data-color     — Accent color (default: #E8A020)
 *   data-greeting  — Initial greeting message
 */
(function() {
  'use strict';

  var script = document.currentScript;
  var key = script?.getAttribute('data-key') || '';
  var position = script?.getAttribute('data-position') || 'right';
  var color = script?.getAttribute('data-color') || '#E8A020';
  var greeting = script?.getAttribute('data-greeting') || "Hey! I'm ACHEEVY. How can I help?";
  var HOST = script?.src ? new URL(script.src).origin : 'https://deploy.foai.cloud';

  // State
  var open = false;
  var messages = [{ role: 'agent', content: greeting }];
  var sending = false;

  // Create styles
  var style = document.createElement('style');
  style.textContent = [
    '.acheevy-widget-btn{position:fixed;bottom:20px;' + position + ':20px;width:56px;height:56px;border-radius:50%;background:' + color + ';color:#000;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:99999;display:flex;align-items:center;justify-content:center;transition:transform .2s}',
    '.acheevy-widget-btn:hover{transform:scale(1.1)}',
    '.acheevy-widget-btn svg{width:24px;height:24px}',
    '.acheevy-widget-panel{position:fixed;bottom:88px;' + position + ':20px;width:360px;max-width:calc(100vw - 40px);height:500px;max-height:calc(100vh - 120px);background:#0A0A0F;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 40px rgba(0,0,0,0.5);z-index:99999;display:flex;flex-direction:column;font-family:Inter,-apple-system,sans-serif;opacity:0;transform:translateY(10px);transition:opacity .2s,transform .2s;pointer-events:none}',
    '.acheevy-widget-panel.open{opacity:1;transform:translateY(0);pointer-events:auto}',
    '.acheevy-widget-header{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px}',
    '.acheevy-widget-header .dot{width:8px;height:8px;border-radius:50%;background:' + color + ';animation:acheevy-pulse 2s infinite}',
    '.acheevy-widget-header span{color:#fff;font-size:13px;font-weight:600}',
    '.acheevy-widget-header small{color:rgba(255,255,255,0.4);font-size:10px;font-family:monospace}',
    '.acheevy-widget-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}',
    '.acheevy-msg{max-width:85%;padding:8px 12px;font-size:13px;line-height:1.5;word-wrap:break-word}',
    '.acheevy-msg.agent{align-self:flex-start;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.9)}',
    '.acheevy-msg.user{align-self:flex-end;background:rgba(232,160,32,0.15);border:1px solid rgba(232,160,32,0.3);color:#fff}',
    '.acheevy-widget-input{padding:8px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:6px}',
    '.acheevy-widget-input input{flex:1;background:transparent;border:1px solid rgba(255,255,255,0.1);padding:10px 12px;color:#fff;font-size:13px;outline:none}',
    '.acheevy-widget-input input::placeholder{color:rgba(255,255,255,0.25)}',
    '.acheevy-widget-input input:focus{border-color:' + color + '}',
    '.acheevy-widget-input button{background:' + color + ';color:#000;border:none;padding:0 14px;cursor:pointer;font-weight:700;font-size:12px}',
    '.acheevy-widget-input button:disabled{opacity:0.3}',
    '@keyframes acheevy-pulse{0%,100%{opacity:1}50%{opacity:0.4}}',
  ].join('\n');
  document.head.appendChild(style);

  // Create button
  var btn = document.createElement('button');
  btn.className = 'acheevy-widget-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  btn.onclick = function() {
    open = !open;
    panel.classList.toggle('open', open);
    btn.innerHTML = open
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  };
  document.body.appendChild(btn);

  // Create panel
  var panel = document.createElement('div');
  panel.className = 'acheevy-widget-panel';
  panel.innerHTML = [
    '<div class="acheevy-widget-header"><div class="dot"></div><span>ACHEEVY</span><small>The Deploy Platform</small></div>',
    '<div class="acheevy-widget-messages" id="acheevy-msgs"></div>',
    '<div class="acheevy-widget-input"><input id="acheevy-input" placeholder="Message ACHEEVY..." /><button id="acheevy-send">Send</button></div>',
  ].join('');
  document.body.appendChild(panel);

  var msgsEl = document.getElementById('acheevy-msgs');
  var inputEl = document.getElementById('acheevy-input');
  var sendBtn = document.getElementById('acheevy-send');

  function renderMessages() {
    msgsEl.innerHTML = messages.map(function(m) {
      return '<div class="acheevy-msg ' + m.role + '">' + escapeHtml(m.content) + '</div>';
    }).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function send() {
    var text = inputEl.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    inputEl.value = '';

    messages.push({ role: 'user', content: text });
    messages.push({ role: 'agent', content: '...' });
    renderMessages();

    try {
      var res = await fetch(HOST + '/api/channels/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'web-widget', content: text, key: key }),
      });
      var data = await res.json();
      messages[messages.length - 1].content = data.response || 'No response.';
    } catch (e) {
      messages[messages.length - 1].content = 'Connection error. Try again.';
    }

    sending = false;
    sendBtn.disabled = false;
    renderMessages();
    inputEl.focus();
  }

  sendBtn.onclick = send;
  inputEl.onkeydown = function(e) { if (e.key === 'Enter') send(); };

  renderMessages();
})();
