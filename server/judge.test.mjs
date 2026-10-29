import test from 'node:test';
import assert from 'node:assert/strict';
import { createJudgeServer } from './server.mjs';
import { createJudge, parseResearch, sourceURL, validateRuling } from './judge.mjs';
import { LIMITS, loadConfig, validateRequest } from './config.mjs';

const config = loadConfig({ OPENAI_API_KEY: 'provider-test-secret', JUDGE_ACCESS_TOKEN: 'test-session-secret-with-at-least-32-characters', JUDGE_ALLOWED_ORIGIN: 'https://table.example', JUDGE_PORT: '0' });
const citation = { url: 'https://www.pokemon.com/us/pokemon-tcg/rules', title: 'Pokémon TCG Rules', quote: '', evidence: 'retrieved' };
const ruling = (changes = {}) => ({
  decision: 'blocked', authority: 'officially_sourced', summary: 'A normal Knock Out does not authorize a Lost Zone move.',
  reasoning: ['A specific legally resolved instruction must change the destination.'],
  sources: [{ ...citation }], requiredActions: [], uncertainties: [], dissent: [], ...changes,
});
const message = text => ({ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text, annotations: [] }] });
const structured = value => ({ status: 'completed', output: [message(JSON.stringify(value))] });
function research({ retrieved = true, url = citation.url } = {}) {
  const item = message('Rules evidence [source].');
  item.content[0].annotations = [{ type: 'url_citation', url, title: citation.title, start_index: 15, end_index: 23 }];
  return { status: 'completed', output: [
    { type: 'web_search_call', status: 'completed', action: { type: 'search', query: 'Pokémon Lost Zone rules' } },
    ...(retrieved ? [{ type: 'web_search_call', status: 'completed', action: { type: 'open_page', url } }] : []), item,
  ] };
}
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
const caseData = { question: 'Does a normal Knock Out allow Lost Zone movement?', context: { format: 'GLC', publicBoard: {} } };
const authHeaders = { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json', Origin: config.origins[0] };

async function fixture(t, transport, runtimeConfig = config) {
  const runtime = createJudgeServer({ config: runtimeConfig, transport });
  await new Promise(resolve => runtime.server.listen(0, '127.0.0.1', resolve));
  t.after(() => runtime.shutdown());
  const base = `http://127.0.0.1:${runtime.server.address().port}`;
  return { ...runtime, base, post: (body, headers = authHeaders) => fetch(`${base}/api/judge/rulings`, { method: 'POST', headers, body }) };
}

test('configuration requires exact origins and strong server access secret', () => {
  assert.equal(loadConfig({}).ready, false);
  assert.equal(loadConfig({ OPENAI_API_KEY: 'key' }).ready, false);
  for (const origin of ['*', 'https://table.example/path', 'https://user:pass@table.example', 'https://table.example/']) {
    assert.throws(() => loadConfig({ JUDGE_ALLOWED_ORIGIN: origin }));
  }
  assert.throws(() => loadConfig({ JUDGE_ACCESS_TOKEN: 'short' }));
  assert.throws(() => loadConfig({ JUDGE_TIMEOUT_MS: '999999' }));
});

test('readiness reports configuration, never exposes credentials or calls provider', async t => {
  let calls = 0;
  const { base, post } = await fixture(t, async () => { calls++; throw new Error('should not be reached'); }, loadConfig({}));
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable', ready: false });
  assert.equal((await post(JSON.stringify(caseData), { 'Content-Type': 'application/json' })).status, 503);
  assert.equal(calls, 0);
});

test('auth, CORS, malformed and oversized bodies are rejected before provider use', async t => {
  let calls = 0;
  const { post, base } = await fixture(t, async () => { calls++; throw new Error('provider key must never be exposed'); });
  assert.equal((await post(JSON.stringify(caseData), { 'Content-Type': 'application/json' })).status, 401);
  assert.equal((await post(JSON.stringify(caseData), { ...authHeaders, Authorization: 'Bearer wrong' })).status, 401);
  const forbidden = await post(JSON.stringify(caseData), { ...authHeaders, Origin: 'https://evil.example' });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('access-control-allow-origin'), null);
  assert.equal((await post('{not json')).status, 400);
  assert.equal((await post(JSON.stringify({ question: 'x', context: {} , command: 'fetch https://evil.example' }))).status, 400);
  assert.equal((await post(JSON.stringify({ question: '', context: {} }))).status, 400);
  assert.equal((await post('x'.repeat(LIMITS.bodyBytes + 1))).status, 413);
  assert.equal((await post('{}', { ...authHeaders, 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await fetch(`${base}/api/judge/rulings`, { method: 'OPTIONS', headers: { Origin: config.origins[0], 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } })).status, 204);
  assert.equal(calls, 0);
});

test('nested untrusted context cannot exceed complexity or use prototype keys', () => {
  let context = {};
  for (let depth = 0; depth < 15; depth++) context = { child: context };
  assert.throws(() => validateRequest({ question: 'x', context }), /complex/);
  assert.throws(() => validateRequest(JSON.parse('{"question":"x","context":{"__proto__":{}}}')), /unsupported key/);
  assert.throws(() => validateRequest({ question: 'x'.repeat(4001), context: {} }));
});

test('citation URLs and claimed official authority are validated, not trusted', () => {
  for (const url of ['http://www.pokemon.com/rules', 'https://pokemon.com.evil.example/rules', 'https://user:pass@pokemon.com/rules', 'http://127.0.0.1/admin', 'https://compendium.pokegym.net:4431/ruling/1']) assert.equal(sourceURL(url), null);
  assert.throws(() => parseResearch(research({ url: 'https://evil.example/fake' })), error => error.code === 'provider_invalid_response');
  assert.throws(() => parseResearch(structured(ruling())), error => error.code === 'provider_invalid_response');
  assert.throws(() => validateRuling(ruling({ sources: [{ ...citation, url: 'https://www.pokemon.com/invented' }] }), [citation]));
  assert.throws(() => validateRuling(ruling({ sources: [{ ...citation, quote: 'A fabricated quotation.' }] }), [citation]));
  const community = { ...citation, url: 'https://compendium.pokegym.net/ruling/1' };
  const downgraded = validateRuling(ruling({ sources: [community] }), [community]);
  assert.equal(downgraded.authority, 'provisional_project_interpretation');
  assert.match(downgraded.uncertainties.join(' '), /No first-party/);
  const unsupported = validateRuling(ruling({ sources: [] }), []);
  assert.equal(unsupported.decision, 'unresolved');
  assert.equal(unsupported.authority, 'unresolved');
});

test('real Responses request contract uses fixed endpoint, bounded research, and structured decision', async () => {
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return json(calls.length === 1 ? research() : structured(ruling()));
  };
  const result = await createJudge({ config, transport })(caseData, new AbortController().signal);
  assert.equal(result.ruling.decision, 'blocked');
  assert.equal(result.panel.length, 1);
  assert.deepEqual(result.ruling.sources, [citation]);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url === 'https://api.openai.com/v1/responses' && call.options.redirect === 'error' && call.body.store === false));
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${config.apiKey}`);
  assert.equal(calls[0].body.tool_choice, 'required');
  assert.equal(calls[0].body.tools[0].type, 'web_search');
  assert.deepEqual(calls[0].body.tools[0].filters.allowed_domains, ['pokemon.com', 'pokemon-card.com', 'compendium.pokegym.net', 'gymleaderchallenge.com']);
  assert.equal(calls[1].body.text.format.type, 'json_schema');
  assert.equal(calls[1].body.text.format.strict, true);
  assert.match(calls[0].body.instructions, /UNTRUSTED DATA/);
  assert.match(calls[0].body.instructions, /typed reason or player claim never authorizes/);
  assert.ok(!JSON.stringify(result).includes(config.apiKey));
});

test('unclear lead consults two independent judges concurrently and preserves actual dissent', async () => {
  const requests = [];
  const peerResearchStarted = new Set();
  let release;
  const bothPeers = new Promise(resolve => { release = resolve; });
  const transport = async (_url, options) => {
    const body = JSON.parse(options.body);
    const input = JSON.parse(body.input[0].content[0].text);
    requests.push(input);
    const role = input.role || (input.task.startsWith('As judge_1') ? 'judge_1' : input.task.startsWith('As judge_2') ? 'judge_2' : 'lead');
    if (body.tools) {
      if (role !== 'lead') {
        peerResearchStarted.add(role);
        if (peerResearchStarted.size === 2) release();
        await bothPeers;
        assert.ok(!Object.hasOwn(input, 'panel'));
        assert.ok(!Object.hasOwn(input, 'research'));
      }
      return json(research({ retrieved: false }));
    }
    return json(structured(ruling(role === 'judge_2' ? { decision: 'allowed', summary: 'A specific source might authorize this, but the scope is unclear.' } : {})));
  };
  const result = await createJudge({ config, transport })(caseData, new AbortController().signal);
  assert.equal(requests.length, 7);
  assert.equal(result.panel.length, 4);
  assert.deepEqual([...peerResearchStarted].sort(), ['judge_1', 'judge_2']);
  assert.equal(result.ruling.decision, 'blocked');
  assert.equal(result.ruling.dissent.length, 1);
  assert.match(result.ruling.dissent[0], /^judge_2: allowed/);
  assert.ok(result.ruling.sources.every(source => source.evidence === 'search_indexed' && source.quote === ''));
});

test('a failed panel member yields visible failure, never synthetic agreement', async () => {
  let finalCalls = 0;
  const transport = async (_url, options) => {
    const body = JSON.parse(options.body);
    const input = JSON.parse(body.input[0].content[0].text);
    if (input.role === 'lead_final') finalCalls++;
    if (input.task.startsWith('As judge_2')) return new Response('provider-secret-raw-error', { status: 500 });
    return json(body.tools ? research({ retrieved: false }) : structured(ruling()));
  };
  await assert.rejects(createJudge({ config, transport })(caseData, new AbortController().signal), error => error.code === 'provider_unavailable' && !error.message.includes('provider-secret'));
  assert.equal(finalCalls, 0);
});

test('provider failures and malformed model JSON are sanitized HTTP errors', async t => {
  const { post } = await fixture(t, async () => new Response(`raw-secret:${config.apiKey}`, { status: 401 }));
  const response = await post(JSON.stringify(caseData));
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.ok(!body.includes(config.apiKey));
  assert.match(body, /provider_unavailable/);
  const invalidTransport = async (_url, options) => json(JSON.parse(options.body).tools ? research() : structured({ execute: 'malicious' }));
  await assert.rejects(createJudge({ config, transport: invalidTransport })(caseData, new AbortController().signal), error => error.code === 'provider_invalid_response');
});

test('provider deadline returns no ruling and aborts provider work', async t => {
  let aborted = false;
  const transport = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true });
  });
  const { post } = await fixture(t, transport, { ...config, timeoutMs: 30 });
  const response = await post(JSON.stringify(caseData));
  assert.equal(response.status, 504);
  assert.equal((await response.json()).error.code, 'provider_timeout');
  assert.equal(aborted, true);
});
