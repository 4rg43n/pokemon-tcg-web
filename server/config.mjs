import { timingSafeEqual } from 'node:crypto';

export const LIMITS = Object.freeze({
  bodyBytes: 64 * 1024,
  providerBytes: 2 * 1024 * 1024,
  questionChars: 4000,
  contextDepth: 12,
  contextNodes: 5000,
  concurrency: 4,
  bodyTimeoutMs: 10_000,
});

function integer(value, fallback, minimum, maximum, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`Invalid ${name}`);
  return parsed;
}

export function loadConfig(env = process.env) {
  const origins = (env.JUDGE_ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('Invalid JUDGE_ALLOWED_ORIGIN'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) {
      throw new Error('JUDGE_ALLOWED_ORIGIN must contain exact HTTP(S) origins, without paths or wildcards');
    }
  }
  const apiKey = (env.OPENAI_API_KEY || '').trim();
  const accessToken = (env.JUDGE_ACCESS_TOKEN || '').trim();
  if (accessToken && (accessToken.length < 32 || accessToken.length > 1024 || /\s/.test(accessToken))) {
    throw new Error('JUDGE_ACCESS_TOKEN must be 32–1024 non-whitespace characters');
  }
  if (apiKey && (apiKey.length > 1024 || /\s/.test(apiKey))) throw new Error('Invalid OPENAI_API_KEY');
  if (apiKey && apiKey === accessToken) throw new Error('JUDGE_ACCESS_TOKEN must be distinct from OPENAI_API_KEY');
  const model = env.JUDGE_MODEL || 'gpt-4.1';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(model)) throw new Error('Invalid JUDGE_MODEL');
  return Object.freeze({
    apiKey,
    accessToken,
    model,
    origins: Object.freeze([...new Set(origins)]),
    host: env.JUDGE_HOST || '127.0.0.1',
    port: integer(env.JUDGE_PORT, 8787, 0, 65535, 'JUDGE_PORT'),
    timeoutMs: integer(env.JUDGE_TIMEOUT_MS, 120_000, 1000, 180_000, 'JUDGE_TIMEOUT_MS'),
    ready: Boolean(apiKey && accessToken && origins.length),
  });
}

export function authorized(header, token) {
  if (typeof header !== 'string' || !token || header.length > 1031) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export class JudgeError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function validateRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !['question', 'context'].includes(key))
      || typeof value.question !== 'string' || !value.question.trim()
      || value.question.length > LIMITS.questionChars
      || !value.context || typeof value.context !== 'object' || Array.isArray(value.context)) {
    throw new JudgeError(400, 'invalid_request', 'Provide a nonempty question (at most 4000 characters) and a public or explicitly authorized context object.');
  }
  let nodes = 0;
  function visit(item, depth) {
    if (++nodes > LIMITS.contextNodes || depth > LIMITS.contextDepth) throw new JudgeError(400, 'invalid_request', 'Context is too complex.');
    if (typeof item === 'string' && item.length > 16_000) throw new JudgeError(400, 'invalid_request', 'Context text is too long.');
    if (item && typeof item === 'object') {
      for (const [key, child] of Object.entries(item)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new JudgeError(400, 'invalid_request', 'Context contains an unsupported key.');
        visit(child, depth + 1);
      }
    }
  }
  visit(value.context, 0);
  return { question: value.question.trim(), context: value.context };
}
