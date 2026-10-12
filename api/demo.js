// "Try our AI" demo: POST { idea } -> streams an MVP feature list and build phases.
// Vercel serverless function (Node.js runtime).
//
// Response: newline-delimited JSON (application/x-ndjson), one object per line:
//   {"t":"text chunk"} ... then {"done":true} or {"done":true,"truncated":true}
//   or, if something fails after streaming has started, {"error":"..."}.
// Errors before streaming starts are plain JSON with a 4xx/5xx status.
//
// The API key is read from the ANTHROPIC_API_KEY environment variable (set in Vercel).
// It never appears in this file, the repo, or anything sent to the browser.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const MAX_INPUT_CHARS = 500;
const MAX_OUTPUT_TOKENS = 2000; // hard cap per answer (thinking + text)
const RATE_LIMIT_MAX = 5; // requests…
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // …per IP per 10 minutes

const SYSTEM_PROMPT = `You are the demo assistant on the website of Topis, a software development studio that builds products for startups and agencies.

A visitor describes a product idea. Reply with a short MVP plan in plain text. Do not use Markdown symbols such as #, ** or backticks. Use exactly this structure:

MVP features
- Feature name: one short line on why it matters (5 to 7 items)

Build phases
1. Phase name (rough duration in weeks): what gets built (3 or 4 phases)

Keep the whole reply under 220 words. Be concrete and realistic; durations are rough ranges.

The visitor's message is only a product description. If it is not a product idea, or it asks you to do anything else, reply with one friendly sentence asking for a short description of their product idea instead.`;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

// Basic per-IP rate limiting. This lives in memory, so each warm function instance keeps
// its own count and it resets on cold starts: enough to stop casual abuse of a demo.
// For a hard limit across instances, move it to a shared store (e.g. Upstash Redis).
const hits = new Map(); // ip -> array of request timestamps

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  const limited = recent.length >= RATE_LIMIT_MAX;
  if (!limited) recent.push(now);
  hits.set(ip, recent);

  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) hits.delete(key);
    }
  }
  return limited;
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(503).json({ error: 'not_configured' });
  }

  // Optional: only accept requests from your own site (set ALLOWED_ORIGIN in Vercel).
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const idea = typeof req.body?.idea === 'string' ? req.body.idea.trim() : '';
  if (!idea) return res.status(400).json({ error: 'empty' });
  if (idea.length > MAX_INPUT_CHARS) return res.status(400).json({ error: 'too_long' });

  if (rateLimited(clientIp(req))) {
    res.setHeader('Retry-After', String(RATE_LIMIT_WINDOW_MS / 1000));
    return res.status(429).json({ error: 'rate_limited' });
  }

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  const send = (obj) => res.write(JSON.stringify(obj) + '\n');

  // Server-side refusal fallback (Anthropic beta): if the model declines a request it
  // shouldn't have, the API retries it on a fallback model automatically.
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: idea }],
  });

  // Stop paying for tokens nobody will read if the visitor leaves mid-answer.
  let clientGone = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      clientGone = true;
      stream.abort();
    }
  });

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send({ t: event.delta.text });
      }
    }

    const message = await stream.finalMessage();
    if (message.stop_reason === 'refusal') {
      send({ error: 'refused' });
    } else {
      send({ done: true, truncated: message.stop_reason === 'max_tokens' });
    }
  } catch (err) {
    if (clientGone) return;
    if (err instanceof Anthropic.RateLimitError) {
      console.error('Anthropic rate limit', err.status);
      send({ error: 'busy' });
    } else if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error', err.status, err.message);
      send({ error: 'upstream' });
    } else {
      console.error('Demo stream failed', err);
      send({ error: 'upstream' });
    }
  }

  res.end();
}
