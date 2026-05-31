/**
 * app.js — 최상위 이벤트 핸들러
 */

/* ── 레벨 ── */
function cycleLevel() {
  const idx   = CONFIG.LEVELS.indexOf(STATE.level);
  STATE.level = CONFIG.LEVELS[(idx + 1) % CONFIG.LEVELS.length];
  const badge = document.getElementById('levelBadge');
  badge.className   = 'level-badge ' + STATE.level;
  badge.textContent = CONFIG.LEVEL_EMOJI[STATE.level] + ' ' + CONFIG.LEVEL_LABELS[STATE.level];
}

/* ── 주제 ── */
function setTopic(el, topic) {
  // 세션 진행 중이면 변경 방법 선택 팝업
  if (STATE.sessionStarted) {
    _showTopicChangePopup(el, topic);
    return;
  }
  _applyTopic(el, topic);
}

function _applyTopic(el, topic) {
  document.querySelectorAll('.chip:not(.chip-custom-trigger)').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.chip:not(.chip-custom-trigger)').forEach(c => {
    if (c.textContent.trim() === el.textContent.trim()) c.classList.add('active');
  });
  STATE.topic = topic;
}

function _showTopicChangePopup(el, topic) {
  // 기존 팝업 제거
  document.getElementById('topicPopup')?.remove();

  const popup = document.createElement('div');
  popup.id = 'topicPopup';
  popup.className = 'topic-popup';
  popup.innerHTML = `
    <div class="topic-popup-inner">
      <div class="topic-popup-title">주제를 <strong>${topic}</strong>으로 바꿀까요?</div>
      <div class="topic-popup-btns">
        <button class="topic-popup-btn topic-popup-soft" onclick="_topicChangeSoft('${el.textContent.trim()}','${topic}')">
          💬 이어서 바꾸기
          <span class="topic-popup-hint">대화를 유지하면서 새 주제로 자연스럽게 전환</span>
        </button>
        <button class="topic-popup-btn topic-popup-hard" onclick="_topicChangeHard('${el.textContent.trim()}','${topic}')">
          🔄 새로 시작하기
          <span class="topic-popup-hint">현재 대화를 끝내고 새 주제로 처음부터</span>
        </button>
      </div>
      <button class="topic-popup-cancel" onclick="document.getElementById('topicPopup').remove()">취소</button>
    </div>`;

  // 팝업 위치: 클릭 외부 영역 클릭 시 닫힘
  document.body.appendChild(popup);
  setTimeout(() => popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); }), 10);
}

// A) 이어서 바꾸기 — 히스토리 유지, 다음 메시지에서 AI에게 주제 전환 알림
function _topicChangeSoft(chipText, topic) {
  document.getElementById('topicPopup')?.remove();

  // 칩 활성화 (기본 칩이 있을 때만)
  document.querySelectorAll('.chip:not(.chip-custom-trigger)').forEach(c => {
    c.classList.toggle('active', c.textContent.trim() === chipText);
  });
  STATE.topic = topic;

  // 시스템 메시지로 주제 전환 알림을 히스토리에 삽입
  STATE.history.push({
    role: 'user',
    content: `[System notice] The user wants to change the conversation topic to "${topic}". Please acknowledge this naturally and transition the conversation to the new topic with a related question. Do not mention this was a system message.`
  });

  // 알림 말풍선 렌더
  _renderTopicChangeNotice(topic);

  // 즉시 AI 응답 요청
  STATE.isLoading = true;
  showLoadingIndicator();
  callClaude(buildSystemPrompt('text'), STATE.history).then(raw => {
    const data = parseModelResponse(raw);
    hideLoadingIndicator();
    STATE.isLoading = false;
    renderAIMessage(data);
    STATE.history.push({ role:'assistant', content:raw });
    renderHints(data.hint_responses);
    if (data.reply) speakTextAndCache(data.reply);
    updateStatsDisplay();
  }).catch(err => {
    hideLoadingIndicator();
    STATE.isLoading = false;
    STATE.history.pop();
    renderErrorMessage(err.message);
  });
}

// B) 새로 시작하기 — 히스토리 초기화 후 새 주제로 대화 재시작
function _topicChangeHard(chipText, topic) {
  document.getElementById('topicPopup')?.remove();
  document.querySelectorAll('.chip:not(.chip-custom-trigger)').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.chip:not(.chip-custom-trigger)').forEach(c => {
    if (c.textContent.trim() === chipText) c.classList.add('active');
  });
  STATE.topic = topic;
  newConversation(true);  // 이미 선택했으므로 confirm 스킵
}

function _renderTopicChangeNotice(topic) {
  const msgs = document.getElementById('messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'topic-change-notice';
  div.innerHTML = `<span>🔀 주제가 <strong>${topic}</strong>으로 바뀌었어요</span>`;
  msgs.appendChild(div);
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
}

/* ── 주제 직접 입력 ── */
function toggleCustomTopic() {
  const wrap = document.getElementById('customTopicInput');
  if (!wrap) return;
  wrap.classList.toggle('open');
  if (wrap.classList.contains('open')) {
    wrap.querySelector('input')?.focus();
  }
}

function confirmCustomTopic() {
  const input = document.getElementById('customTopicText');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  // 입력창 닫기 + 칩 표시 업데이트
  input.value = '';
  document.getElementById('customTopicInput')?.classList.remove('open');
  document.querySelectorAll('.chip:not(.chip-custom-trigger)').forEach(c => c.classList.remove('active'));
  const customLabel = document.getElementById('customTopicLabel');
  if (customLabel) { customLabel.textContent = `✏️ ${val}`; customLabel.classList.add('active'); }

  // 세션 중이면 주제 변경 팝업 — 아니면 바로 적용
  if (STATE.sessionStarted) {
    // 커스텀 주제는 팝업을 직접 만들어서 표시
    _showCustomTopicChangePopup(val);
  } else {
    STATE.topic = val;
  }
}

function _showCustomTopicChangePopup(topic) {
  document.getElementById('topicPopup')?.remove();
  const popup = document.createElement('div');
  popup.id = 'topicPopup';
  popup.className = 'topic-popup';
  popup.innerHTML = `
    <div class="topic-popup-inner">
      <div class="topic-popup-title">주제를 <strong>${topic}</strong>으로 바꿀까요?</div>
      <div class="topic-popup-btns">
        <button class="topic-popup-btn topic-popup-soft" onclick="_customTopicChangeSoft('${topic}')">
          💬 이어서 바꾸기
          <span class="topic-popup-hint">대화를 유지하면서 새 주제로 자연스럽게 전환</span>
        </button>
        <button class="topic-popup-btn topic-popup-hard" onclick="_customTopicChangeHard('${topic}')">
          🔄 새로 시작하기
          <span class="topic-popup-hint">현재 대화를 끝내고 새 주제로 처음부터</span>
        </button>
      </div>
      <button class="topic-popup-cancel" onclick="document.getElementById('topicPopup').remove()">취소</button>
    </div>`;
  document.body.appendChild(popup);
  setTimeout(() => popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); }), 10);
}

function _customTopicChangeSoft(topic) {
  document.getElementById('topicPopup')?.remove();
  // 가짜 칩 요소 생성해서 기존 함수 재사용
  const fakeEl = { textContent: topic };
  STATE.topic = topic;
  _topicChangeSoft(topic, topic);
}

function _customTopicChangeHard(topic) {
  document.getElementById('topicPopup')?.remove();
  STATE.topic = topic;
  newConversation(true);
}

function handleCustomTopicKey(e) {
  if (e.key === 'Enter') confirmCustomTopic();
  if (e.key === 'Escape') document.getElementById('customTopicInput')?.classList.remove('open');
}

/* ── 채팅 / 음성 모드 전환 ── */
function setMode(mode) {
  document.documentElement.dataset.chatMode = mode;
  const chatPanel  = document.getElementById('chatPanel');
  const voicePanel = document.getElementById('voicePanel');

  const reviewPanel = document.getElementById('reviewPanel');
  if (reviewPanel?.classList.contains('active')) return;

  chatPanel.style.display  = mode === 'chat'  ? '' : 'none';
  voicePanel.style.display = mode === 'voice' ? '' : 'none';

  if (mode === 'voice') {
    const vw = document.getElementById('voiceWelcome');
    if (vw) vw.style.display = STATE.sessionStarted ? 'none' : '';
    // 세션 없으면 웰컴 상태 (헤더/사이드바 숨김)
    if (!STATE.sessionStarted) {
      document.body.setAttribute('data-welcome', 'true');
      setTimeout(() => { if (typeof initWelcome3D === 'function') initWelcome3D(); }, 80);
    }
  } else if (mode === 'chat') {
    // 채팅 모드로 전환 시 세션 없어도 헤더/사이드바 표시
    if (!STATE.sessionStarted) document.body.removeAttribute('data-welcome');
  }
}

/* ── 탭 전환 (대화 / 복습) ── */
function switchTab(tab) {
  const isReview = tab === 'review';
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', isReview ? i === 1 : i === 0);
    btn.setAttribute('aria-selected', String(isReview ? i === 1 : i === 0));
  });

  const chatPanel   = document.getElementById('chatPanel');
  const voicePanel  = document.getElementById('voicePanel');
  const reviewPanel = document.getElementById('reviewPanel');
  const sidebar     = document.getElementById('sidebar');
  const modeSwitch  = document.getElementById('modeSwitch');

  if (isReview) {
    chatPanel.style.display  = 'none';
    voicePanel.style.display = 'none';
    reviewPanel.classList.add('active');
    sidebar.style.display    = 'none';
    if (modeSwitch) modeSwitch.style.visibility = 'hidden';
    renderReviewTab();
  } else {
    const mode = document.documentElement.dataset.chatMode || 'voice';
    chatPanel.style.display  = mode === 'chat'  ? '' : 'none';
    voicePanel.style.display = mode === 'voice' ? '' : 'none';
    reviewPanel.classList.remove('active');
    sidebar.style.display    = '';
    if (modeSwitch) modeSwitch.style.visibility = '';
  }
}

/* ── 다크모드 ── */
function toggleTheme() {
  const html   = document.documentElement;
  const btn    = document.getElementById('themeToggle');
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  btn.textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('speakit-theme', isDark ? 'light' : 'dark');
}

/* ── 초기화 ── */
document.addEventListener('DOMContentLoaded', () => {
  // 테마 복원
  const savedTheme = localStorage.getItem('speakit-theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }

  // 기본 모드: 음성
  const chatPanel  = document.getElementById('chatPanel');
  const voicePanel = document.getElementById('voicePanel');
  chatPanel.style.display  = 'none';
  voicePanel.style.display = '';

  // 음성 모드 버튼 활성화 상태 반영
  document.getElementById('modeChatBtn') ?.classList.remove('active');
  document.getElementById('modeVoiceBtn')?.classList.add('active');

  // 웰컴 상태: 헤더/사이드바 숨김
  document.body.setAttribute('data-welcome', 'true');

  // 채팅 입력창 이벤트
  document.getElementById('msgInput').addEventListener('input', function () {
    document.getElementById('sendBtn').disabled = this.value.trim() === '' || STATE.isLoading;
  });

  // 3D 웰컴 배경 초기화 (음성 모드 기본값이므로 바로 실행)
  setTimeout(() => initWelcome3D(), 100);
});

/* ════════════════════════════════
   웰컴 온보딩 스텝 전환
   ════════════════════════════════ */

function _wcStep(showId) {
  ['welcomeStep1','welcomeStep2','welcomeStep3'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.id === showId) { el.style.display = ''; el.style.animation = 'cardAppear 0.4s cubic-bezier(0.22,1,0.36,1) both'; }
    else el.style.display = 'none';
  });
}

function showLandingStep() { _wcStep('welcomeStep1'); }
function showTopicStep()   { _wcStep('welcomeStep2'); }
function showLevelStep()   { _wcStep('welcomeStep3'); }

function selectWcTopic(el, topic) {
  document.querySelectorAll('.wc-topic-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  STATE.topic = topic;
  // 커스텀 입력 초기화
  const ci = document.getElementById('wcCustomTopic');
  if (ci) ci.value = '';
}

function selectWcTopicCustom(val) {
  document.querySelectorAll('.wc-topic-btn').forEach(b => b.classList.remove('active'));
  STATE.topic = val;
}

function selectWcLevel(el, level) {
  document.querySelectorAll('.wc-level-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  STATE.level = level;
  // 헤더 레벨 배지도 동기화 (나중에 보일 때 반영)
  const badge = document.getElementById('levelBadge');
  if (badge) {
    badge.className   = 'level-badge ' + level;
    badge.textContent = CONFIG.LEVEL_EMOJI[level] + ' ' + CONFIG.LEVEL_LABELS[level];
  }
}
