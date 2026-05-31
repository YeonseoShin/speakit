/**
 * voice.js — STT + TTS 전담 모듈
 */

let currentAudio   = null;
let isSpeaking     = false;
let isRecording    = false;
let autoSpeak      = true;
let lastSpokenText = '';
let recognition    = null;

const TTS_VOICE = 'nova';
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

/* ═══════════════════════════
   TTS
   ═══════════════════════════ */

async function speakText(text) {
  if (!text?.trim()) return;
  if (isSpeaking) stopSpeaking();

  _setSpeakingState(true);

  try {
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, voice: TTS_VOICE }),
    });

    // Content-Type 으로 성공/실패 구분
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok || !contentType.includes('audio')) {
      // JSON 오류 응답 파싱
      let msg = `TTS HTTP ${res.status}`;
      try {
        const errData = await res.json();
        msg = errData?.error?.message || msg;
      } catch { /* 파싱 실패 시 기본 메시지 사용 */ }

      _setSpeakingState(false);
      _showTtsError(res.status, msg);
      return;
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => { _setSpeakingState(false); URL.revokeObjectURL(url); };
    currentAudio.onerror = () => { _setSpeakingState(false); URL.revokeObjectURL(url); };
    currentAudio.play();

  } catch (err) {
    console.error('[TTS]', err);
    _setSpeakingState(false);
    _showTtsError(0, err.message);
  }
}

async function speakTextAndCache(text) {
  lastSpokenText = text;
  if (autoSpeak) await speakText(text);
}

async function replayLast() {
  if (!lastSpokenText) return;
  await speakText(lastSpokenText);
}

function stopSpeaking() {
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
  _setSpeakingState(false);
}

function toggleAutoSpeak() {
  autoSpeak = !autoSpeak;
  const btn = document.getElementById('autoSpeakBtn');
  if (!btn) return;
  btn.dataset.active = autoSpeak ? 'true' : 'false';
  btn.title = autoSpeak ? '자동 음성 재생 켜짐 (클릭해서 끄기)' : '자동 음성 재생 꺼짐 (클릭해서 켜기)';
}

/* ─ TTS 오류 토스트 ─ */
function _showTtsError(status, msg) {
  // 기존 토스트 제거
  document.getElementById('ttsToast')?.remove();

  let guide = '음성 재생에 실패했어요.';
  if (status === 401) guide = 'API 키를 확인해 주세요. (.env → OPENAI_API_KEY)';
  else if (status === 402 || status === 429) guide = 'OpenAI 크레딧이 부족해요. platform.openai.com/usage 에서 확인해 보세요.';
  else if (status === 0) guide = '서버 연결을 확인해 주세요. (npm start)';

  const toast = document.createElement('div');
  toast.id = 'ttsToast';
  toast.className = 'tts-toast';
  toast.innerHTML = `
    <div class="tts-toast-body">
      <span class="tts-toast-icon">🔇</span>
      <div>
        <div class="tts-toast-title">음성 재생 오류 (${status || 'Network'})</div>
        <div class="tts-toast-msg">${guide}</div>
        <div class="tts-toast-detail">${msg}</div>
      </div>
      <button class="tts-toast-close" onclick="this.closest('#ttsToast').remove()">✕</button>
    </div>
    <div class="tts-toast-hint">💡 헤더의 🔊 버튼으로 자동 재생을 끄면 텍스트 대화는 계속할 수 있어요.</div>`;
  document.body.appendChild(toast);

  // 8초 후 자동 제거
  setTimeout(() => toast.remove(), 8000);
}

/* ═══════════════════════════
   STT
   ═══════════════════════════ */

function toggleRecording() {
  if (!SpeechRecognitionAPI) {
    alert('이 브라우저는 음성 인식을 지원하지 않아요.\nChrome 또는 Edge를 사용해 주세요.');
    return;
  }
  isRecording ? _stopRecording() : _startRecording();
}

function _startRecording() {
  recognition = new SpeechRecognitionAPI();
  recognition.lang           = 'en-US';
  recognition.interimResults = true;
  recognition.continuous     = false;

  recognition.onstart = () => {
    isRecording = true;
    _setMicState('recording');
    _setVoiceStatus('듣고 있어요... 영어로 말해보세요', 'listening');
  };

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    const input = document.getElementById('msgInput');
    if (input) { input.value = transcript; autoResize(input); document.getElementById('sendBtn').disabled = false; }
    _setVoiceTranscript(transcript);
  };

  recognition.onend = () => {
    isRecording = false;
    _setMicState('idle');
    _setVoiceStatus('', '');
    const text = (document.getElementById('msgInput')?.value || document.getElementById('voiceTranscript')?.textContent || '').trim();
    if (text && STATE.sessionStarted && !STATE.isLoading) setTimeout(() => sendMessage(), 300);
  };

  recognition.onerror = (e) => {
    isRecording = false;
    _setMicState('idle');
    if (e.error === 'no-speech') _setVoiceStatus('말소리를 인식하지 못했어요. 다시 시도해 보세요.', 'hint');
    else if (e.error !== 'aborted') { console.error('[STT]', e.error); _setVoiceStatus('음성 인식 오류: ' + e.error, 'error'); }
  };

  recognition.start();
}

function _stopRecording() { recognition?.stop(); }

/* ─ 내부 DOM 헬퍼 ─ */
function _setSpeakingState(speaking) {
  isSpeaking = speaking;
  const banner = document.getElementById('speakingBanner');
  if (banner) banner.style.display = speaking ? 'flex' : 'none';
  const avatar = document.getElementById('voiceAiAvatar');
  if (avatar) avatar.dataset.speaking = speaking ? 'true' : 'false';
  if (speaking) _setVoiceStatus('AI가 말하고 있어요...', 'speaking');
  else if (!isRecording) _setVoiceStatus('마이크 버튼을 눌러 말해보세요', 'hint');
}

function _setMicState(state) {
  [document.getElementById('micBtn'), document.getElementById('voiceMicBtn')].forEach(btn => {
    if (btn) { btn.dataset.state = state; }
  });
}

function _setVoiceStatus(text, type) {
  const el = document.getElementById('voiceStatus');
  if (el) { el.textContent = text; el.dataset.type = type || ''; }
}

function _setVoiceTranscript(text) {
  const el = document.getElementById('voiceTranscript');
  if (el) el.textContent = text;
}
