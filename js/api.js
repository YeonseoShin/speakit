/**
 * api.js — 백엔드 프록시(/api/chat) 통신 담당
 */

async function callClaude(systemPrompt, messages) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system:     systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI 응답이 비어있어요. 모델 또는 API 키를 확인해 주세요.');
  return text;
}

function parseModelResponse(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { reply: text, corrections: [], new_vocab: [], fluency_score: null, hint_responses: [] };
  }
}

/**
 * 레벨, 주제, 입력 모드가 반영된 시스템 프롬프트를 반환합니다.
 * @param {'voice'|'text'} inputMode - 음성 입력이면 'voice', 타이핑이면 'text'
 */
function buildSystemPrompt(inputMode = 'text') {
  return CONFIG.SYSTEM_PROMPT
    .replace('{LEVEL}',      STATE.level)
    .replace('{TOPIC}',      STATE.topic)
    .replace('{INPUT_MODE}', inputMode);
}
