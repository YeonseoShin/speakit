/**
 * ui.js — 순수 DOM 렌더링 헬퍼
 */

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function scrollBottom() {
  const msgs = document.getElementById('messages');
  if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
}

/* ── 사용자 메시지 ── */
function renderUserMessage(text) {
  const msgs = document.getElementById('messages');
  if (msgs) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `
      <div class="msg-avatar user-avatar">나</div>
      <div class="msg-body"><div class="msg-bubble user-bubble">${escHtml(text)}</div></div>`;
    msgs.appendChild(div);
    scrollBottom();
  }
  const sub = document.getElementById('voiceUserSub');
  if (sub) { sub.textContent = text; sub.dataset.visible = 'true'; }
}

/* ── AI 메시지 ── */
function renderAIMessage(data) {
  const reply = data.reply ?? '';

  /* 채팅 모드 말풍선 */
  const msgs = document.getElementById('messages');
  if (msgs) {
    const div = document.createElement('div');
    div.className = 'msg';

    /* 교정 박스 */
    let corrHtml = '';
    if (data.corrections?.length) {
      corrHtml = `<div class="correction"><div class="correction-header">✏️ 교정 포인트</div>`;
      data.corrections.forEach(c => {
        const typeClass = c.type === 'Context' ? 'corr-context' : '';
        corrHtml += `
          <div class="correction-row">
            <span class="corr-label orig">✗</span>
            <span class="corr-text corr-orig">${escHtml(c.original)}</span>
            <span class="corr-label fixed">✓</span>
            <span class="corr-text corr-fixed ${typeClass}">${escHtml(c.corrected)}</span>
          </div>
          <div class="corr-note">
            <span class="corr-type-badge corr-type-${(c.type||'grammar').toLowerCase()}">${escHtml(c.type||'Grammar')}</span>
            ${escHtml(c.explanation)}
          </div>`;
      });
      corrHtml += `</div>`;
    }

    /* 유창성 점수 */
    let scoreHtml = '';
    if (data.fluency_score != null) {
      const cls = data.fluency_score >= 80 ? 'score-good' : data.fluency_score >= 60 ? 'score-mid' : 'score-low';
      scoreHtml = `<div class="fluency-tag ${cls}">유창성 ${data.fluency_score}/100</div>`;
    }

    /* 재생 버튼 */
    const safeReply = reply.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const replayBtn = `<button class="msg-replay-btn" onclick="speakText('${safeReply}')" title="다시 듣기" aria-label="다시 듣기">🔊</button>`;

    div.innerHTML = `
      <div class="msg-avatar ai-avatar">🤖</div>
      <div class="msg-body">
        <div class="msg-bubble ai-bubble">${escHtml(reply)} ${replayBtn}</div>
        ${corrHtml}
        ${scoreHtml}
      </div>`;
    msgs.appendChild(div);
    scrollBottom();
  }

  /* 음성 모드 자막 */
  const aiSub = document.getElementById('voiceAiSub');
  if (aiSub) { aiSub.textContent = reply; aiSub.dataset.visible = 'true'; }
}

/* ── 에러 메시지 ── */
function renderErrorMessage(errMsg) {
  const msgs = document.getElementById('messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'msg';
  const isApiKey  = errMsg?.includes('401') || errMsg?.includes('API key');
  const isNetwork = errMsg?.includes('Failed to fetch');
  let hint = '잠시 후 다시 시도해 주세요.';
  if (isApiKey)  hint = '<code>.env</code> 파일의 <code>OPENAI_API_KEY</code>를 확인해 주세요.';
  if (isNetwork) hint = '서버가 실행 중인지 확인해 주세요. (<code>npm start</code>)';
  div.innerHTML = `
    <div class="msg-avatar ai-avatar" style="background:var(--error-light);color:var(--error);border-color:var(--error)">!</div>
    <div class="msg-body">
      <div class="msg-bubble error-bubble">
        <strong>오류가 발생했어요</strong><br>
        <span style="font-size:12px;opacity:.8">${escHtml(errMsg ?? '')}</span><br><br>
        ${hint}
        <button class="retry-btn" onclick="this.closest('.msg').remove()">닫기</button>
      </div>
    </div>`;
  msgs.appendChild(div);
  scrollBottom();
}

/* ── 로딩 인디케이터 ── */
function showLoadingIndicator() {
  const msgs = document.getElementById('messages');
  if (msgs) {
    const div = document.createElement('div');
    div.className = 'msg'; div.id = 'loadingMsg';
    div.innerHTML = `
      <div class="msg-avatar ai-avatar">🤖</div>
      <div class="msg-body">
        <div class="msg-bubble ai-bubble">
          <div class="loading-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        </div>
      </div>`;
    msgs.appendChild(div);
    scrollBottom();
  }
  const status = document.getElementById('voiceStatus');
  if (status) { status.textContent = 'AI가 생각하고 있어요...'; status.dataset.type = 'thinking'; }
  const aiSub = document.getElementById('voiceAiSub');
  if (aiSub)  { aiSub.textContent = '...'; aiSub.dataset.visible = 'true'; }
  // 아바타 생각 중 상태
  const avatar = document.getElementById('voiceAiAvatar');
  if (avatar) avatar.dataset.thinking = 'true';
}

function hideLoadingIndicator() {
  document.getElementById('loadingMsg')?.remove();
  const avatar = document.getElementById('voiceAiAvatar');
  if (avatar) avatar.dataset.thinking = 'false';
}

/* ── 힌트 버튼 ── */
function renderHints(hints = []) {
  const row = document.getElementById('hintRow');
  if (!row) return;
  row.innerHTML = '';
  hints.slice(0, 3).forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'hint-btn';
    btn.textContent = '💬 ' + h;
    btn.addEventListener('click', () => {
      const input = document.getElementById('msgInput');
      if (input) { input.value = h; autoResize(input); document.getElementById('sendBtn').disabled = false; input.focus(); }
    });
    row.appendChild(btn);
  });
}

/* ── 사이드바 교정 로그 ── */
function addCorrectionToLog(c) {
  const log = document.getElementById('errorLog');
  if (!log) return;
  if (log.querySelector('.empty-state')) log.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'error-item' + (c.type === 'Context' ? ' error-item-context' : '');
  div.innerHTML = `
    <div class="error-type">${escHtml(c.type ?? 'Grammar')}</div>
    <div class="error-original">${escHtml(c.original)}</div>
    <div class="error-corrected">→ ${escHtml(c.corrected)}</div>
    <span class="error-tag">${escHtml(c.explanation ?? '')}</span>`;
  log.insertBefore(div, log.firstChild);
}

/* ── 사이드바 어휘 목록 (한국어 뜻 포함) ── */
function addVocabToList(v) {
  const list = document.getElementById('vocabList');
  if (!list) return;
  if (list.querySelector('.empty-state')) list.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'vocab-item';
  div.innerHTML = `
    <div>
      <div class="vocab-word">${escHtml(v.word)}</div>
      <div class="vocab-meaning">${escHtml(v.meaning)}</div>
      ${v.meaning_korean ? `<div class="vocab-meaning-ko">${escHtml(v.meaning_korean)}</div>` : ''}
    </div>
    <div class="vocab-badge">신규</div>`;
  list.insertBefore(div, list.firstChild);
}

/* ── 통계 ── */
function updateStatsDisplay() {
  const { stats, vocab } = STATE;
  document.getElementById('statWords').textContent       = stats.words;
  document.getElementById('statCorrections').textContent = stats.corrections;
  document.getElementById('statTurns').textContent       = stats.turns;
  document.getElementById('statScore').textContent       = stats.lastScore ?? '—';
  const gp = Math.round(Math.min(100, Math.max(0, 100-(stats.corrections/Math.max(1,stats.turns))*50)));
  const vp = Math.round(Math.min(100, vocab.length * 20));
  const fp = Math.round(stats.lastScore ?? 0);
  document.getElementById('prog-grammar').textContent = gp+'%';
  document.getElementById('prog-vocab').textContent   = vp+'%';
  document.getElementById('prog-fluency').textContent = fp+'%';
  document.getElementById('bar-grammar').style.width  = gp+'%';
  document.getElementById('bar-vocab').style.width    = vp+'%';
  document.getElementById('bar-fluency').style.width  = fp+'%';
}

/* ── textarea 자동 높이 ── */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  document.getElementById('sendBtn').disabled = el.value.trim() === '' || STATE.isLoading;
}

/* ── 키 핸들러 ── */
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!STATE.isLoading && document.getElementById('msgInput').value.trim()) sendMessage();
  }
}
