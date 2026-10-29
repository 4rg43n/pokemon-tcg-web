import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, LIMITS } from './config.mjs';
import { createJudge, parseResearch } from './judge.mjs';
import { createJudgeServer } from './server.mjs';

const config = loadConfig({ OPENAI_API_KEY: 'server-provider-credential', JUDGE_ACCESS_TOKEN: 'bounded-transport-access-secret-32-characters', JUDGE_ALLOWED_ORIGIN: 'https://table.example' });
const caseData = { question: 'Is this move legal?', context: { publicBoard: {} } };
const headers = { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' };

async function listen(t, transport) {
  const runtime = createJudgeServer({ config, transport });
  await new Promise(resolve => runtime.server.listen(0, '127.0.0.1', resolve));
  t.after(() => runtime.shutdown());
  return { ...runtime, url: `http://127.0.0.1:${runtime.server.address().port}/api/judge/rulings` };
}

test('chunked requests cannot bypass body limit by omitting Content-Length', async t => {
  let calls = 0;
  const { url } = await listen(t, async () => { calls++; throw new Error('must not be reached'); });
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(LIMITS.bodyBytes));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  const response = await fetch(url, { method: 'POST', headers, body, duplex: 'half' });
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test('provider response limit applies to streaming responses without a length header', async () => {
  let canceled = false;
  const transport = async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(LIMITS.providerBytes + 1)); },
    cancel() { canceled = true; },
  }), { status: 200 });
  await assert.rejects(createJudge({ config, transport })(caseData, new AbortController().signal), error => error.code === 'provider_invalid_response');
  assert.equal(canceled, true);
});

test('function calls and invalid citation annotation spans cannot become research evidence', () => {
  assert.throws(() => parseResearch({ status: 'completed', output: [{ type: 'function_call', name: 'fetch', arguments: '{"url":"http://localhost"}' }] }), error => error.code === 'provider_invalid_response');
  assert.throws(() => parseResearch({ status: 'completed', output: [
    { type: 'web_search_call', status: 'completed', action: { type: 'search' } },
    { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Short evidence.', annotations: [{ type: 'url_citation', url: 'https://www.pokemon.com/rules', title: 'Rules', start_index: 0, end_index: 9999 }] }] },
  ] }), error => error.code === 'provider_invalid_response');
});

test('active provider concurrency is bounded and shutdown aborts all pending requests', async t => {
  let started = 0;
  let aborted = 0;
  let allStarted;
  const ready = new Promise(resolve => { allStarted = resolve; });
  const transport = (_url, { signal }) => new Promise((_resolve, reject) => {
    started++;
    if (started === LIMITS.concurrency) allStarted();
    signal.addEventListener('abort', () => { aborted++; reject(signal.reason); }, { once: true });
  });
  const { url, shutdown } = await listen(t, transport);
  const pending = Array.from({ length: LIMITS.concurrency }, () => fetch(url, { method: 'POST', headers, body: JSON.stringify(caseData) }).then(response => response.status).catch(() => 'disconnected'));
  await ready;
  const overflow = await fetch(url, { method: 'POST', headers, body: JSON.stringify(caseData) });
  assert.equal(overflow.status, 429);
  assert.equal(started, LIMITS.concurrency);
  await shutdown();
  await Promise.all(pending);
  assert.equal(aborted, LIMITS.concurrency);
});
