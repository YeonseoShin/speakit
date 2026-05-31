/**
 * chat.js — 대화 핵심 로직
 * 음성(voice) / 타이핑(text) 입력 모드를 구분해서 시스템 프롬프트에 전달합니다.
 */

/* ── 새 대화 시작 ── */
function newConversation(skipConfirm = false) {
  if (STATE.sessionStarted && !skipConfirm && !confirm('현재 대화를 종료하고 새 대화를 시작할까요?\n학습 기록(교정 노트, 어휘)은 유지돼요.')) return;

  STATE.history        = [];
  STATE.sessionStarted = false;
  STATE.isLoading      = false;
  STATE.sessionId++;

  const msgs = document.getElementById('messages');
  if (msgs) msgs.innerHTML = '';

  const aiSub   = document.getElementById('voiceAiSub');
  const userSub = document.getElementById('voiceUserSub');
  const trans   = document.getElementById('voiceTranscript');
  if (aiSub)   { aiSub.textContent = '새 대화를 시작해 보세요!'; aiSub.dataset.visible = 'false'; }
  if (userSub) userSub.dataset.visible = 'false';
  if (trans)   trans.textContent = '';

  document.getElementById('hintRow') && (document.getElementById('hintRow').innerHTML = '');
  const input = document.getElementById('msgInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }
  document.getElementById('sendBtn')?.setAttribute('disabled', '');

  const welcome = document.createElement('div');
  welcome.className = 'welcome-card'; welcome.id = 'welcomeCard';
  welcome.innerHTML = `
    <span class="welcome-icon">🎙️</span>
    <h2>새 대화를 시작해요!</h2>
    <p>주제를 바꾸거나 그대로 계속할 수 있어요.<br>준비되면 아래 버튼을 눌러보세요.</p>
    <p class="welcome-voice-hint">🗨️ 채팅 모드 또는 🎙️ 음성 모드로 시작할 수 있어요!</p>
    <button class="start-btn" onclick="startConversation()">대화 시작하기 →</button>`;
  if (msgs) msgs.appendChild(welcome);

  stopSpeaking();
  // 새 대화는 웰컴 화면 없이 바로 주제 선택 팝업 표시
  _showNewSessionTopicPicker();
}

/* ── 웰컴 → 대화 화면 전환 애니메이션 ── */
function _animateWelcomeToApp(callback) {
  const vwEl   = document.getElementById('voiceWelcome');
  const header = document.querySelector('.header');
  const sidebar = document.getElementById('sidebar');
  const panel  = document.getElementById('voicePanel') || document.getElementById('chatPanel');

  // 1. 웰컴 페이드아웃
  if (vwEl) {
    vwEl.classList.add('fading');
    setTimeout(() => {
      vwEl.style.display = 'none';
      vwEl.classList.remove('fading');
      if (typeof destroyWelcome3D === 'function') destroyWelcome3D();
    }, 480);
  }

  // 2. 웰컴 상태 해제 → 헤더/사이드바 등장
  setTimeout(() => {
    document.body.removeAttribute('data-welcome');

    // 슬라이드인 애니메이션 클래스 부착
    if (header)  { header.classList.add('anim-in');  setTimeout(() => header.classList.remove('anim-in'),  500); }
    if (sidebar) { sidebar.classList.add('anim-in'); setTimeout(() => sidebar.classList.remove('anim-in'), 600); }
    if (panel)   { panel.classList.add('anim-in');   setTimeout(() => panel.classList.remove('anim-in'),   600); }

    if (callback) callback();
  }, 260);
}

/* ── 대화 시작 (첫 AI 인사) ── */
async function startConversation() {
  STATE.sessionStarted = true;
  document.getElementById('welcomeCard')?.remove();

  // 채팅 모드일 때는 채팅 웰컴 카드만 제거, 음성 모드 웰컴은 애니메이션으로 처리
  const mode = document.documentElement.dataset.chatMode || 'voice';

  // 전환 애니메이션 실행 후 실제 대화 시작
  _animateWelcomeToApp(() => {
    if (mode === 'chat') document.getElementById('msgInput')?.focus();
  });

  if (mode === 'chat') document.getElementById('msgInput')?.focus();

  const initMsg = `Start our conversation! Greet me warmly and ask me an interesting opening question about ${STATE.topic}. This is the very first message — no corrections needed. Return valid JSON with empty corrections array.`;

  STATE.isLoading = true;
  showLoadingIndicator();

  try {
    // 첫 인사는 항상 text 모드 (사용자 입력 없음)
    const raw  = await callClaude(buildSystemPrompt('text'), [{ role:'user', content:initMsg }]);
    const data = parseModelResponse(raw);

    hideLoadingIndicator();
    STATE.isLoading = false;
    renderAIMessage(data);
    renderHints(data.hint_responses);
    STATE.history.push({ role:'user',      content:initMsg });
    STATE.history.push({ role:'assistant', content:raw });
    if (data.reply) speakTextAndCache(data.reply);

  } catch (err) {
    hideLoadingIndicator();
    STATE.isLoading = false;
    renderErrorMessage(err.message);
  }
}

/* ── 메시지 전송 ── */
async function sendMessage() {
  const chatInput = document.getElementById('msgInput');
  const voiceEl   = document.getElementById('voiceTranscript');
  const text      = (chatInput?.value || voiceEl?.textContent || '').trim();
  if (!text || STATE.isLoading) return;
  if (isSpeaking) stopSpeaking();
  if (!STATE.sessionStarted) { await startConversation(); return; }

  // ★ 입력 모드 판별: 음성 인식 결과가 있으면 voice, 아니면 text
  const inputMode = (voiceEl?.textContent?.trim()) ? 'voice' : 'text';

  if (chatInput) { chatInput.value = ''; chatInput.style.height = 'auto'; }
  if (voiceEl)   voiceEl.textContent = '';
  document.getElementById('sendBtn')?.setAttribute('disabled', '');
  if (document.getElementById('hintRow')) document.getElementById('hintRow').innerHTML = '';

  renderUserMessage(text);
  STATE.stats.words += text.split(/\s+/).length;
  STATE.stats.turns++;
  updateStatsDisplay();

  STATE.history.push({ role:'user', content:text });
  STATE.isLoading = true;
  showLoadingIndicator();

  try {
    // ★ inputMode를 buildSystemPrompt에 전달
    const raw  = await callClaude(buildSystemPrompt(inputMode), STATE.history);
    const data = parseModelResponse(raw);

    hideLoadingIndicator();
    STATE.isLoading = false;
    renderAIMessage(data);

    STATE.history.push({ role:'assistant', content:raw });
    if (STATE.history.length > CONFIG.MAX_HISTORY_MESSAGES)
      STATE.history = STATE.history.slice(-CONFIG.MAX_HISTORY_MESSAGES);

    if (data.corrections?.length) {
      STATE.stats.corrections += data.corrections.length;
      data.corrections.forEach(c => { STATE.corrections.push(c); addCorrectionToLog(c); });
    }
    if (data.new_vocab?.length) {
      data.new_vocab.forEach(v => { STATE.vocab.push(v); addVocabToList(v); });
    }
    if (data.fluency_score != null) STATE.stats.lastScore = data.fluency_score;

    updateStatsDisplay();
    renderHints(data.hint_responses);
    if (data.reply) speakTextAndCache(data.reply);

  } catch (err) {
    hideLoadingIndicator();
    STATE.isLoading = false;
    STATE.history.pop();
    renderErrorMessage(err.message);
  }
}

/* ── 새 대화용 주제·레벨 선택 인라인 팝업 ── */
function _showNewSessionTopicPicker() {
  document.getElementById('newSessionPicker')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'newSessionPicker';
  overlay.className = 'ns-overlay';
  overlay.innerHTML = `
    <div class="ns-card">
      <h3 class="ns-title">새 대화 시작</h3>
      <p class="ns-desc">주제와 레벨을 확인하고 시작해요.</p>

      <div class="ns-section-label">주제</div>
      <div class="ns-topic-grid">
        ${[
          ['☀️','일상생활','Daily Life'],
          ['🎬','영화·드라마','Movies & TV'],
          ['✈️','여행','Travel'],
          ['🍜','음식','Food'],
          ['💻','기술·IT','Technology'],
          ['🎸','취미','Hobbies']
        ].map(([e,n,t]) => `
          <button class="ns-topic-btn ${STATE.topic===t?'active':''}"
                  onclick="document.querySelectorAll('.ns-topic-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');STATE.topic='${t}'">
            <span>${e}</span><span>${n}</span>
          </button>`).join('')}
      </div>

      <div class="ns-section-label" style="margin-top:14px">레벨</div>
      <div class="ns-level-row">
        ${[['🟢','초급','beginner'],['🟡','중급','intermediate'],['🔴','고급','advanced']].map(([e,n,l]) => `
          <button class="ns-level-btn ${STATE.level===l?'active':''}"
                  onclick="document.querySelectorAll('.ns-level-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');STATE.level='${l}';document.getElementById('levelBadge').className='level-badge ${l}';document.getElementById('levelBadge').textContent='${e} ${n}'">
            ${e} ${n}
          </button>`).join('')}
      </div>

      <div class="ns-btns">
        <button class="ns-cancel" onclick="document.getElementById('newSessionPicker').remove()">취소</button>
        <button class="ns-confirm" onclick="document.getElementById('newSessionPicker').remove();startConversation()">대화 시작하기 →</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); }), 10);
}
