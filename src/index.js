import 'dotenv/config';
import express from 'express';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir, unlink, stat } from 'fs/promises';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pump = promisify(pipeline);
const TMP_DIR = path.join(__dirname, '..', 'tmp');

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Deduz extensão do áudio
function guessExt(resp, url) {
  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('audio/ogg') || ct.includes('application/ogg')) return '.ogg';
  if (ct.includes('audio/opus')) return '.ogg';
  if (ct.includes('audio/mpeg') || ct.includes('audio/mp3')) return '.mp3';
  if (ct.includes('audio/mp4')) return '.mp4';
  if (ct.includes('audio/x-m4a') || ct.includes('audio/m4a')) return '.m4a';
  if (ct.includes('audio/wav') || ct.includes('audio/x-wav')) return '.wav';
  if (ct.includes('audio/webm')) return '.webm';
  if (ct.includes('audio/flac')) return '.flac';

  // tenta pela URL
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\.(flac|m4a|mp3|mp4|mpeg|mpga|oga|ogg|wav|webm)$/i);
    if (m) return `.${m[1].toLowerCase()}`;
  } catch {}

  // fallback seguro (muitos áudios de WhatsApp são ogg/opus)
  return '.ogg';
}

/**
 * POST /transcribe
 * Body: { "url": "https://..." }
 */
app.post('/transcribe', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Informe "url" (string) no body.' });
    }

    await mkdir(TMP_DIR, { recursive: true });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 120s

    const resp = await fetch(url, { redirect: 'follow', signal: controller.signal });
    if (!resp.ok || !resp.body) {
      clearTimeout(timeout);
      return res.status(400).json({ error: `Falha ao baixar áudio (${resp.status})` });
    }

    // (debug opcional)
    console.log('Content-Type:', resp.headers.get('content-type') || '(vazio)');

    // limite por tamanho se houver Content-Length
    const contentLength = Number(resp.headers.get('content-length') || 0);
    const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
    if (contentLength && contentLength > MAX_BYTES) {
      clearTimeout(timeout);
      return res.status(413).json({ error: 'Arquivo maior do que o permitido.' });
    }

    // usa extensão correta
    const ext = guessExt(resp, url);
    const tmpName = `audio_${crypto.randomUUID()}${ext}`;
    const filePath = path.join(TMP_DIR, tmpName);

    await pump(resp.body, createWriteStream(filePath));
    clearTimeout(timeout);

    const st = await stat(filePath);
    if (st.size === 0) {
      await unlink(filePath).catch(() => {});
      return res.status(400).json({ error: 'Download vazio.' });
    }

    // Transcrição
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1'
      // ex.: response_format: 'verbose_json', language: 'pt', temperature: 0
    });

    await unlink(filePath).catch(() => {});
    return res.json({ text: transcription?.text ?? '' });
  } catch (err) {
    return res.status(500).json({
      error: err?.name === 'AbortError' ? 'Timeout no download.' : (err?.message || 'Erro interno')
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API local ouvindo em http://localhost:${port}`));
