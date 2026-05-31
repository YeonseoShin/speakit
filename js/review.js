/**
 * review.js — 복습 탭 전담 모듈
 */

function renderReviewTab() {
  renderSessionSummary();
  renderReviewCorrections();
  renderFlashcards();
}

/* ── 세션 요약 ── */
function renderSessionSummary() {
  const { stats, corrections } = STATE;
  const avgFluency = stats.lastScore ?? 0;
  const typeCounts = {};
  corrections.forEach(c => { const t = c.type||'Grammar'; typeCounts[t]=(typeCounts[t]||0)+1; });
  const topType = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('rv-turns').textContent   = stats.turns;
  document.getElementById('rv-words').textContent   = stats.words;
  document.getElementById('rv-fluency').textContent = avgFluency ? `${avgFluency}/100` : '—';
  document.getElementById('rv-top-err').textContent = topType ? `${topType[0]} (${topType[1]}회)` : '—';

  const gauge = document.getElementById('rv-fluency-bar');
  if (gauge) {
    gauge.style.width = (avgFluency||0)+'%';
    gauge.className = 'rv-gauge-fill '+(avgFluency>=80?'gauge-good':avgFluency>=60?'gauge-mid':'gauge-low');
  }

  const typeList = document.getElementById('rv-type-list');
  if (typeList) {
    if (!Object.keys(typeCounts).length) {
      typeList.innerHTML = '<div class="rv-empty">교정 기록이 없어요 🎉</div>';
    } else {
      typeList.innerHTML = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([type, count]) => `
        <div class="rv-type-row">
          <span class="rv-type-label">${escHtml(type)}</span>
          <div class="rv-type-bar-wrap"><div class="rv-type-bar" style="width:${Math.round((count/corrections.length)*100)}%"></div></div>
          <span class="rv-type-count">${count}회</span>
        </div>`).join('');
    }
  }
}

/* ── 교정 전체 목록 ── */
function renderReviewCorrections() {
  const list = document.getElementById('rv-corrections-list');
  if (!list) return;
  if (!STATE.corrections.length) {
    list.innerHTML = '<div class="rv-empty">아직 교정 내용이 없어요.<br>대화를 시작해 보세요!</div>';
    return;
  }
  list.innerHTML = [...STATE.corrections].reverse().map((c, i) => `
    <div class="rv-corr-item">
      <div class="rv-corr-num">${STATE.corrections.length - i}</div>
      <div class="rv-corr-body">
        <div class="rv-corr-type-badge rv-badge-${(c.type||'grammar').toLowerCase()}">${escHtml(c.type||'Grammar')}</div>
        <div class="rv-corr-orig">❌ ${escHtml(c.original)}</div>
        <div class="rv-corr-fixed">✅ ${escHtml(c.corrected)}</div>
        <div class="rv-corr-note">${escHtml(c.explanation||'')}</div>
      </div>
    </div>`).join('');
}

/* ── 플래시카드 ── */
let flashcardIndex = 0;
let flashcardFlipped = false;

function renderFlashcards() {
  const card     = document.getElementById('rv-flashcard');
  const controls = document.getElementById('rv-card-controls');
  const empty    = document.getElementById('rv-vocab-empty');

  if (!STATE.vocab.length) {
    if (card)    card.style.display    = 'none';
    if (controls) controls.style.display = 'none';
    if (empty)   empty.style.display   = '';
    return;
  }
  if (empty)    empty.style.display    = 'none';
  if (card)     card.style.display     = '';
  if (controls) controls.style.display = 'flex';

  flashcardIndex = 0; flashcardFlipped = false;
  renderCard(); updateCardNav();
}

function renderCard() {
  if (!STATE.vocab.length) return;
  const v = STATE.vocab[flashcardIndex];
  const card = document.getElementById('rv-flashcard');
  if (!card) return;
  flashcardFlipped = false;
  card.classList.remove('flipped');
  document.getElementById('fc-front-word').textContent    = v.word;
  document.getElementById('fc-back-word').textContent     = v.word;
  document.getElementById('fc-back-meaning').textContent  = v.meaning;
  document.getElementById('fc-back-meaning-ko').textContent = v.meaning_korean || '';
  document.getElementById('rv-card-counter').textContent  = `${flashcardIndex+1} / ${STATE.vocab.length}`;
}

function flipCard() {
  const card = document.getElementById('rv-flashcard');
  if (!card) return;
  flashcardFlipped = !flashcardFlipped;
  card.classList.toggle('flipped', flashcardFlipped);
}

function prevCard() {
  if (flashcardIndex > 0) { flashcardIndex--; renderCard(); updateCardNav(); }
}

function nextCard() {
  if (flashcardIndex < STATE.vocab.length-1) { flashcardIndex++; renderCard(); updateCardNav(); }
}

function updateCardNav() {
  const prev = document.getElementById('fc-prev');
  const next = document.getElementById('fc-next');
  if (prev) prev.disabled = flashcardIndex === 0;
  if (next) next.disabled = flashcardIndex === STATE.vocab.length-1;
}

function shuffleCards() {
  for (let i = STATE.vocab.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [STATE.vocab[i], STATE.vocab[j]] = [STATE.vocab[j], STATE.vocab[i]];
  }
  flashcardIndex = 0; renderCard(); updateCardNav();
}
