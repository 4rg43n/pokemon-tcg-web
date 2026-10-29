import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { authorized, JudgeError, LIMITS, loadConfig, validateRequest } from './config.mjs';
import { createJudge } from './judge.mjs';

function send(response, status, value) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(status >= 400 ? { Connection: 'close' } : {}),
  });
  response.end(JSON.stringify(value));
}

function readBody(request, signal) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    const timer = setTimeout(() => fail(new JudgeError(408, 'request_timeout', 'Request body timed out.')), LIMITS.bodyTimeoutMs);
    function cleanup() {
      clearTimeout(timer);
      request.removeListener('data', onData);
      request.removeListener('end', onEnd);
      request.removeListener('error', fail);
      request.removeListener('aborted', onAborted);
      signal.removeEventListener('abort', onAborted);
    }
    function fail(error) { cleanup(); request.pause(); reject(error); }
    function onAborted() { fail(new JudgeError(400, 'request_aborted', 'Request was interrupted.')); }
    function onData(chunk) {
      size += chunk.length;
      if (size > LIMITS.bodyBytes) return fail(new JudgeError(413, 'payload_too_large', 'Request body exceeds 64 KiB.'));
      chunks.push(chunk);
    }
    function onEnd() {
      cleanup();
      try {
        const body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size));
        resolve(JSON.parse(body));
      } catch { reject(new JudgeError(400, 'invalid_request', 'Request body must be valid UTF-8 JSON.')); }
    }
    request.on('data', onData);
    request.once('end', onEnd);
    request.once('error', fail);
    request.once('aborted', onAborted);
    signal.addEventListener('abort', onAborted, { once: true });
    if (signal.aborted) onAborted();
  });
}

/** Testable runtime. transport is an injectable fetch-compatible provider transport. */
export function createJudgeServer({ config = loadConfig(), transport = globalThis.fetch } = {}) {
  const judge = createJudge({ config, transport });
  const controllers = new Set();
  let active = 0;
  let closing = false;
  const server = http.createServer({ maxHeaderSize: 8192 }, async (request, response) => {
    response.setHeader('Vary', 'Origin');
    const origin = request.headers.origin;
    if (origin && !config.origins.includes(origin)) {
      send(response, 403, { error: { code: 'origin_not_allowed', message: 'Origin is not allowed.' } });
      return;
    }
    if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
    if (request.method === 'GET' && request.url === '/health') {
      const ready = config.ready && !closing;
      send(response, ready ? 200 : 503, { status: ready ? 'ready' : 'unavailable', ready });
      return;
    }
    if (request.url !== '/api/judge/rulings') {
      send(response, 404, { error: { code: 'not_found', message: 'Not found.' } });
      return;
    }
    if (request.method === 'OPTIONS') {
      const headers = (request.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
      if (!origin || request.headers['access-control-request-method'] !== 'POST' || headers.some(header => !['authorization', 'content-type'].includes(header))) {
        send(response, 403, { error: { code: 'origin_not_allowed', message: 'Preflight is not allowed.' } });
        return;
      }
      response.writeHead(204, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600', 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST, OPTIONS');
      send(response, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } });
      return;
    }
    if (!config.ready || closing) {
      send(response, 503, { error: { code: 'service_unavailable', message: 'Judge service is not configured or is shutting down.' } });
      return;
    }
    if (!authorized(request.headers.authorization, config.accessToken)) {
      response.setHeader('WWW-Authenticate', 'Bearer');
      send(response, 401, { error: { code: 'unauthorized', message: 'Valid Judge access token required.' } });
      return;
    }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] || '')
        || (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity')) {
      send(response, 415, { error: { code: 'unsupported_media_type', message: 'Use uncompressed application/json with UTF-8 encoding.' } });
      return;
    }
    if (request.headers['content-length'] && Number(request.headers['content-length']) > LIMITS.bodyBytes) {
      send(response, 413, { error: { code: 'payload_too_large', message: 'Request body exceeds 64 KiB.' } });
      return;
    }
    if (active >= LIMITS.concurrency) {
      response.setHeader('Retry-After', '5');
      send(response, 429, { error: { code: 'busy', message: 'Judge service is busy. Retry later.' } });
      return;
    }
    active++;
    const controller = new AbortController();
    controllers.add(controller);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, config.timeoutMs);
    const disconnected = () => { if (!response.writableEnded) controller.abort(); };
    response.once('close', disconnected);
    try {
      const input = validateRequest(await readBody(request, controller.signal));
      const result = await judge(input, controller.signal);
      send(response, 200, result);
    } catch (error) {
      const safe = timedOut
        ? new JudgeError(504, 'provider_timeout', 'The Judge request timed out. No ruling was issued.')
        : error instanceof JudgeError ? error
          : new JudgeError(502, 'provider_unavailable', 'The Judge request could not complete. No ruling was issued.');
      send(response, safe.status, { error: { code: safe.code, message: safe.message } });
    } finally {
      clearTimeout(timer);
      response.removeListener('close', disconnected);
      // Also stop an independent panel member if its peer failed.
      controller.abort();
      controllers.delete(controller);
      active--;
    }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = LIMITS.bodyTimeoutMs;
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 100;
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  const shutdown = async () => {
    closing = true;
    for (const controller of controllers) controller.abort();
    if (!server.listening) return;
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  };
  return { server, shutdown };
}

export async function startServer(env = process.env) {
  const config = loadConfig(env);
  const runtime = createJudgeServer({ config });
  await new Promise((resolve, reject) => {
    runtime.server.once('error', reject);
    runtime.server.listen(config.port, config.host, resolve);
  });
  return { ...runtime, config };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const runtime = await startServer();
    const address = runtime.server.address();
    console.log(`Judge service listening on ${runtime.config.host}:${address.port}; ${runtime.config.ready ? 'configured (provider connectivity not yet checked)' : 'unavailable: configure OPENAI_API_KEY, JUDGE_ACCESS_TOKEN (32+ characters), and JUDGE_ALLOWED_ORIGIN'}`);
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      runtime.shutdown().catch(() => { process.exitCode = 1; });
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
  } catch {
    console.error('Judge service startup failed. Check server configuration and listen address.');
    process.exitCode = 1;
  }
}
