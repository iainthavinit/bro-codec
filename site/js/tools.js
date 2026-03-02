// ============================================
// BRO_CODEC — Tools Page Logic
// ============================================

let mode = 'translate';
let intensity = 'standard';
let shitpostHistory = [];
let selectedMeme = null;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// === Panel builder ===
function inputOutputPanel(id, inputLabel, outputLabel, placeholder, btnLabel, btnLoadLabel, color, multiline) {
  return `
    <div class="panel">
      <div class="panel__header">${dots()}<span class="panel__title">${inputLabel}</span></div>
      <textarea id="${id}-in" placeholder="${placeholder}" rows="4"></textarea>
      <div class="input-footer"><span id="${id}-ch">0 chars</span><span>⌘+Enter</span></div>
    </div>
    <div class="btn-row">
      <button class="btn btn--primary" id="${id}-btn" style="background:linear-gradient(135deg,${color},${color}cc);color:#0a0a0f">${btnLabel}</button>
    </div>
    <div class="panel">
      <div class="panel__header">${dots()}<span class="panel__title">${outputLabel}</span>
        <button class="btn--icon hidden" id="${id}-cp" style="color:${color}">📋</button>
      </div>
      <div class="panel__body${multiline ? ' panel__body--multiline' : ''}" id="${id}-out">
        <span class="placeholder">// output appears here</span>
      </div>
    </div>`;
}

function bindIO(id, fn) {
  const input = $(`#${id}-in`);
  const btn = $(`#${id}-btn`);
  const ch = $(`#${id}-ch`);
  input.oninput = () => { ch.textContent = input.value.length + ' chars'; };
  input.onkeydown = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); fn(); } };
  btn.onclick = fn;
}

async function runAI(id, prompt, message) {
  const btn = $(`#${id}-btn`);
  const out = $(`#${id}-out`);
  const cpBtn = $(`#${id}-cp`);
  const color = MODE_COLORS[id] || MODE_COLORS[mode];
  const origLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ ...';
  out.innerHTML = '<span class="loading" style="color:#666">thinking...</span>';
  if (cpBtn) cpBtn.classList.add('hidden');
  try {
    const result = await ai(prompt, message);
    out.innerHTML = `<span style="color:${color};white-space:pre-wrap">${esc(result)}</span>`;
    if (cpBtn) {
      cpBtn.classList.remove('hidden');
      cpBtn.onclick = () => cp(result, cpBtn);
    }
    return result;
  } catch (e) {
    out.innerHTML = `<span class="text-red">ERROR: ${esc(e.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.textContent = origLabel;
  }
}

// === Mode renderers ===
function renderContent() {
  const c = $('#content');
  const color = MODE_COLORS[mode];

  if (mode === 'translate') {
    c.innerHTML = `
      <div class="energy-row">
        <span class="energy-label">ENERGY:</span>
        <button class="energy-btn${intensity === 'subtle' ? ' active' : ''}" data-l="subtle">🤏 subtle</button>
        <button class="energy-btn${intensity === 'standard' ? ' active' : ''}" data-l="standard">🔥 standard</button>
        <button class="energy-btn${intensity === 'maximum' ? ' active' : ''}" data-l="maximum">🚀 maximum</button>
      </div>` +
      inputOutputPanel('translate', 'INPUT :: human_mode', 'OUTPUT :: bro_mode', 'Type what you actually want to say...', '⚡ TRANSLATE ⚡', '⏳ TRANSLATING...', color, false);
    $$('.energy-btn').forEach(b => {
      b.onclick = () => { intensity = b.dataset.l; $$('.energy-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); };
    });
    bindIO('translate', doTranslate);
  }
  else if (mode === 'respond') {
    c.innerHTML = inputOutputPanel('respond', 'INPUT :: paste_bro_message', 'OUTPUT :: your_response', 'Paste what the bro said...', '💬 GENERATE RESPONSE', '⏳ GENERATING...', color, false);
    bindIO('respond', doRespond);
  }
  else if (mode === 'shitpost') {
    c.innerHTML = `
      <div class="text-center" style="padding:12px 0 16px">
        <p style="font-size:11px;color:#888;margin-bottom:12px">Curated from the wild. Real bro energy.</p>
        <button class="btn btn--purple" id="shitpost-btn" style="padding:14px 40px;font-size:14px;box-shadow:0 0 20px rgba(204,68,255,0.2)">💀 SHITPOST 💀</button>
      </div>
      <div class="panel">
        <div class="panel__header">${dots()}<span class="panel__title">OUTPUT :: pure_bro_energy</span>
          <button class="btn--icon hidden" id="shitpost-cp" style="color:${color}">📋</button>
        </div>
        <div class="panel__body text-center" id="shitpost-out"><span class="placeholder">// shitpost materializes here 💀</span></div>
      </div>
      <div class="text-center mt-1">
        <button class="btn--ghost hidden" id="shitpost-src" style="font-size:9px;padding:4px 8px">🔗 source</button>
      </div>`;
    $('#shitpost-btn').onclick = doShitpost;
  }
  else if (mode === 'meme') { renderMemePanel(); }
  else if (mode === 'decode') {
    c.innerHTML = inputOutputPanel('decode', 'INPUT :: paste_bro_speak', 'OUTPUT :: plain_english', 'Paste confusing bro speak here...', '🔓 DECODE', '⏳ DECODING...', color, true);
    bindIO('decode', doDecode);
  }
  else if (mode === 'vibe') {
    c.innerHTML = inputOutputPanel('vibe', 'INPUT :: your_draft_post', 'OUTPUT :: vibe_analysis', "Paste what you're about to post...", '🔮 VIBE CHECK', '⏳ ANALYZING...', color, true);
    bindIO('vibe', doVibe);
  }
  else if (mode === 'glossary') {
    c.innerHTML = inputOutputPanel('glossary', 'INPUT :: what_does_this_mean', 'OUTPUT :: bro_dictionary', 'Type a term (e.g. "ratio", "mewing") or "what should I know"...', '📖 LOOK UP', '⏳ LOOKING UP...', color, true);
    bindIO('glossary', doGlossary);
  }
  else if (mode === 'comeback') {
    c.innerHTML = inputOutputPanel('comeback', 'INPUT :: what_they_said', 'OUTPUT :: your_arsenal', 'Paste what someone said to you...', '⚔️ GENERATE COMEBACKS', '⏳ LOADING WEAPONS...', color, true);
    bindIO('comeback', doComeback);
  }
}

// === Meme panel ===
function renderMemePanel() {
  const c = $('#content');
  if (selectedMeme) {
    c.innerHTML = `
      <div class="panel" style="margin-bottom:12px">
        <div class="panel__header">${dots()}<span class="panel__title">${selectedMeme.n.toUpperCase()}</span>
          <button class="btn--ghost btn--small" id="mc-cl">✕</button>
        </div>
        <div style="padding:14px;display:flex;flex-direction:column;align-items:center;gap:12px">
          <div style="background:rgba(0,212,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center;width:100%">
            <span style="font-size:36px">${selectedMeme.e}</span>
            <p style="color:var(--cyan);font-size:15px;font-weight:700;margin:6px 0 2px">${selectedMeme.n}</p>
            <p style="color:#666;font-size:10px;margin:0">${selectedMeme.b} text boxes &bull; <a href="https://imgflip.com/memegenerator/${selectedMeme.id}" target="_blank">preview ↗</a></p>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn--cyan" id="mc-gen" style="padding:8px 20px;font-size:11px">🧠 BRO CAPTION</button>
            <button class="btn--ghost btn--small" id="mc-re">🔄</button>
          </div>
          <div id="mc-err" class="text-red hidden" style="font-size:11px"></div>
          <div id="mc-caps" class="hidden"></div>
        </div>
      </div>`;
    $('#mc-cl').onclick = () => { selectedMeme = null; renderMemePanel(); };
    $('#mc-gen').onclick = doMemeCaption;
    $('#mc-re').onclick = doMemeCaption;
  } else {
    c.innerHTML = `
      <input type="text" id="ms" placeholder="🔍 Search templates... (Drake, Brain, Pikachu...)" style="padding:8px 12px;min-height:auto;margin-bottom:12px">
      <div class="meme-grid" id="mg"></div>`;
    renderMemeGrid('');
    $('#ms').oninput = e => renderMemeGrid(e.target.value);
  }
}

function renderMemeGrid(search) {
  const g = $('#mg');
  const filtered = search ? MEME_TEMPLATES.filter(m => m.n.toLowerCase().includes(search.toLowerCase())) : MEME_TEMPLATES;
  g.innerHTML = filtered.map(m =>
    `<div class="meme-card" data-id="${m.id}">
      <span class="emoji">${m.e}</span>
      <div><p class="name">${m.n}</p><p class="boxes">${m.b} boxes</p></div>
    </div>`
  ).join('');
  g.querySelectorAll('.meme-card').forEach(c => {
    c.onclick = () => { selectedMeme = MEME_TEMPLATES.find(m => m.id === c.dataset.id); renderMemePanel(); };
  });
}

// === Action handlers ===
function doTranslate() {
  const v = $('#translate-in').value.trim();
  if (!v) return;
  runAI('translate', PROMPTS.translate + (INTENSITY_MODS[intensity] || ''), v);
}

function doRespond() {
  const v = $('#respond-in').value.trim();
  if (!v) return;
  runAI('respond', PROMPTS.respond, `Someone posted:\n\n"${v}"\n\nGenerate the perfect bro response.`);
}

async function doShitpost() {
  const btn = $('#shitpost-btn');
  const out = $('#shitpost-out');
  const cpBtn = $('#shitpost-cp');
  const srcBtn = $('#shitpost-src');
  btn.disabled = true;
  btn.textContent = '⏳ CHANNELING...';
  out.innerHTML = '<span class="loading" style="color:#666">scanning bro frequencies...</span>';
  cpBtn.classList.add('hidden');
  if (srcBtn) srcBtn.classList.add('hidden');

  try {
    const resp = await fetch(WORKER_URL + '/bank');
    if (resp.ok) {
      const d = await resp.json();
      if (d.tweet) {
        const r = d.tweet;
        out.innerHTML = `<span style="color:var(--purple);white-space:pre-wrap;font-size:14px;line-height:1.7">${esc(r)}</span>`;
        shitpostHistory.unshift(r);
        if (shitpostHistory.length > 10) shitpostHistory.pop();
        cpBtn.classList.remove('hidden');
        cpBtn.onclick = () => cp(r, cpBtn);
        if (d.source && d.source !== 'original') {
          srcBtn.classList.remove('hidden');
          srcBtn.onclick = () => window.open(d.source, '_blank');
        }
        return;
      }
    }
    throw new Error('bank empty');
  } catch {
    try {
      const seed = Math.random().toString(36).slice(2, 8);
      const r = await ai(PROMPTS.shitpost, 'Seed: ' + seed + '. Avoid: ' + (shitpostHistory.slice(0, 3).map(h => h.slice(0, 30)).join('|') || 'none'));
      out.innerHTML = `<span style="color:var(--purple);white-space:pre-wrap;font-size:14px;line-height:1.7">${esc(r)}</span>`;
      shitpostHistory.unshift(r);
      if (shitpostHistory.length > 10) shitpostHistory.pop();
      cpBtn.classList.remove('hidden');
      cpBtn.onclick = () => cp(r, cpBtn);
    } catch (e) {
      out.innerHTML = `<span class="text-red">ERROR: ${esc(e.message)}</span>`;
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '💀 SHITPOST 💀';
  }
}

function doDecode() {
  const v = $('#decode-in').value.trim();
  if (!v) return;
  runAI('decode', PROMPTS.decode, v);
}

function doVibe() {
  const v = $('#vibe-in').value.trim();
  if (!v) return;
  runAI('vibe', PROMPTS.vibeCheck, `About to post in a tech/gaming/crypto Discord:\n\n"${v}"\n\nDo a vibe check.`);
}

function doGlossary() {
  const v = $('#glossary-in').value.trim();
  if (!v) return;
  runAI('glossary', PROMPTS.glossary, v);
}

function doComeback() {
  const v = $('#comeback-in').value.trim();
  if (!v) return;
  runAI('comeback', PROMPTS.comeback, `Someone said this to me:\n\n"${v}"\n\nGenerate 3 calibrated comebacks.`);
}

async function doMemeCaption() {
  if (!selectedMeme) return;
  const btn = $('#mc-gen');
  const err = $('#mc-err');
  const caps = $('#mc-caps');
  btn.disabled = true;
  btn.textContent = '⏳...';
  err.classList.add('hidden');
  caps.classList.add('hidden');
  try {
    const raw = await ai(PROMPTS.memeCaption, `Template: "${selectedMeme.n}". ${selectedMeme.b} text boxes.`);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    caps.classList.remove('hidden');
    caps.innerHTML = `
      <div style="width:100%;background:rgba(0,212,255,0.03);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:10px;color:var(--cyan);letter-spacing:2px">CAPTIONS</span>
          <button class="btn--icon" id="mc-cpa" style="color:var(--cyan)">📋</button>
        </div>
        ${parsed.texts.map((t, i) => `<div style="margin-bottom:4px"><span style="font-size:9px;color:#666">BOX ${i + 1}:</span><p style="font-size:13px;color:var(--cyan);margin:1px 0;font-weight:600">${esc(t)}</p></div>`).join('')}
        <p style="font-size:10px;color:#555;margin-top:8px;margin-bottom:0">👉 <a href="https://imgflip.com/memegenerator/${selectedMeme.id}" target="_blank" style="color:var(--cyan)">Open in imgflip</a> → paste → generate</p>
      </div>`;
    $('#mc-cpa').onclick = () => cp(parsed.texts.join('\n'), $('#mc-cpa'));
  } catch (e) {
    err.textContent = 'Error: ' + e.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = '🧠 BRO CAPTION';
  }
}

// === Tab switching ===
$$('.tab').forEach(t => {
  t.onclick = () => {
    mode = t.dataset.mode;
    const color = MODE_COLORS[mode];
    $$('.tab').forEach(x => { x.classList.remove('active'); x.style.color = 'var(--dim)'; });
    t.classList.add('active');
    t.style.color = color;
    renderContent();
  };
});

// Init
renderContent();
