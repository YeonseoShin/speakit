import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

/* ══════════════════════════════════════
   /api/chat — OpenAI Chat Completions
   ══════════════════════════════════════ */
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: '.env 파일에 OPENAI_API_KEY가 설정되지 않았어요.' }
    });
  }

  const { model, max_tokens, system, messages } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:           model || 'gpt-4o-mini',
        max_tokens:      max_tokens || 1000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          ...messages,
        ],
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (err) {
    console.error('[Chat] 프록시 오류:', err);
    res.status(500).json({ error: { message: `서버 오류: ${err.message}` } });
  }
});

/* ══════════════════════════════════════
   /api/tts — OpenAI TTS (음성 합성)
   ══════════════════════════════════════ */
app.post('/api/tts', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: '.env 파일에 OPENAI_API_KEY가 설정되지 않았어요.' }
    });
  }

  const { text, voice = 'nova' } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ error: { message: '텍스트가 비어있어요.' } });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice,                // nova | alloy | echo | fable | onyx | shimmer
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error || { message: 'TTS 오류' } });
    }

    // mp3 바이너리를 그대로 클라이언트에 스트리밍
    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('[TTS] 프록시 오류:', err);
    res.status(500).json({ error: { message: `TTS 서버 오류: ${err.message}` } });
  }
});

/* ══════════════════════════════════════
   서버 시작
   ══════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`✅  Speakit 실행 중 → http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  경고: OPENAI_API_KEY가 설정되지 않았어요. .env 파일을 확인해 주세요.');
  }
});
