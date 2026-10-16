// Local Chrome/CDP smoke, using Node's built-in WebSocket. No user profile or app edits.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { exercisePilot } from './pilot-scenarios.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = new URL(process.argv[2] ?? 'http://127.0.0.1:4173/');
const isPilot = url.searchParams.get('mode') !== 'sandbox';
assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname),
  'Use a local HTTP dev/preview URL. This smoke does not visit remote sites.');
await fetch(url, { signal: AbortSignal.timeout(5000) });
const chrome = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const local = path.join(root, '.local');
await mkdir(local, { recursive: true, mode: 0o700 });
assert(!(await lstat(local)).isSymbolicLink(), '.local must not be a symlink.');
const output = await mkdtemp(path.join(local, 'browser-smoke-'));
const profile = await mkdtemp(path.join(tmpdir(), 'hedwig-chrome-'));
const child = spawn(chrome, [
  `--user-data-dir=${profile}`, '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
  '--window-size=1280,800', '--new-window', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let launchError;
child.on('error', error => { launchError = error; });
let chromeLog = '';
child.stderr.on('data', data => { chromeLog = (chromeLog + data).slice(-32000); });
let ws;
let nextId = 0;
const pending = new Map();
const logs = [], errors = [], responses = [];
const deadline = Date.now() + 20000;
let pilotEvidence = null;

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 60000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(output, name), Buffer.from(result.data, 'base64'));
}
const twoFrames = 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

try {
  let port;
  while (!port) {
    if (launchError) throw launchError;
    assert(child.exitCode === null && Date.now() < deadline, 'Chrome did not expose its local debug port.');
    try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await delay(50); }
  }
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = pages.find(page => page.type === 'page');
  assert(target, 'Chrome did not create a page.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await once(ws, 'open', { signal: AbortSignal.timeout(10000) });
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(message.id);
      if (message.error) request.reject(Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ');
      logs.push({ level: message.params.type, text });
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Network.responseReceived') {
      const { url, status } = message.params.response;
      if (url.startsWith('http:')) responses.push({ url, status });
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__hedwigSmoke = { pointer: [], moves: [], keys: [] };
    document.addEventListener('pointerlockchange', () => __hedwigSmoke.pointer.push(!!document.pointerLockElement));
    document.addEventListener('mousemove', e => { if (document.pointerLockElement) __hedwigSmoke.moves.push({x:e.movementX,y:e.movementY,trusted:e.isTrusted}); });
    window.addEventListener('keydown', e => __hedwigSmoke.keys.push({key:e.key,trusted:e.isTrusted}));
  ` });
  await send('Page.navigate', { url: url.href });
  await send('Page.bringToFront');
  const loadDeadline = Date.now() + 20000;
  while (await evaluate('document.querySelector("#pilot-review")?.dataset.state') !== 'ready') {
    assert(Date.now() < loadDeadline && errors.length === 0, 'Scene did not finish loading. See report.json.');
    await delay(100);
  }
  if (isPilot) {
    pilotEvidence = await evaluate(`(${exercisePilot.toString()})()`);
    for (const view of ['approach', 'gable', 'entrance', 'tower', 'gate', 'overhead']) {
      await evaluate(`__pilotReview.setView(${JSON.stringify(view)})`);
      await evaluate(twoFrames);
      await screenshot(`pilot-neutral-${view}.png`);
    }
    await evaluate('__pilotReview.setView("approach"); __pilotReview.setLighting("dusk")');
    await evaluate(twoFrames);
    await screenshot('pilot-dusk-approach.png');
    await evaluate('__pilotReview.setLighting("neutral"); __pilotReview.reset()');
  }
  await screenshot('initial.png');
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: 500, y: 350, ...(type === 'mouseMoved' ? {} : { button: 'left', clickCount: 1 }) });
  }
  await evaluate(twoFrames);
  assert(await evaluate('document.pointerLockElement === document.querySelector("canvas")'), 'Pointer Lock failed.');
  if (isPilot) {
    const travel = async sprint => {
      await evaluate('__pilotReview.reset()');
      const before = await evaluate('__pilotReview.snapshot().position');
      if (sprint) await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
      await delay(1000);
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
      if (sprint) await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
      const after = await evaluate('__pilotReview.snapshot().position');
      return Math.hypot(after[0] - before[0], after[2] - before[2]);
    };
    pilotEvidence.trustedWalkMetres = await travel(false);
    pilotEvidence.trustedSprintMetres = await travel(true);
    assert(pilotEvidence.trustedWalkMetres > 2.5 && pilotEvidence.trustedWalkMetres < 3.8, 'Trusted WASD did not walk at the configured speed.');
    assert(pilotEvidence.trustedSprintMetres > pilotEvidence.trustedWalkMetres * 1.3, 'Shift did not increase actual walking distance.');
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 520, y: 360 });
  await evaluate(twoFrames);
  await screenshot('mouse-look.png');
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  }
  await evaluate(twoFrames);
  assert(await evaluate('document.pointerLockElement === null'), 'Escape did not release Pointer Lock.');
  if (isPilot) {
    const stopped = await evaluate('__pilotReview.snapshot().position');
    await delay(200);
    assert.deepEqual(await evaluate('__pilotReview.snapshot().position'), stopped, 'Player continued moving after Escape.');
  }
  const state = await evaluate(`(() => {
    const canvas = document.querySelector('canvas'), gl = canvas.getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {viewport:[innerWidth,innerHeight],buffer:[canvas.width,canvas.height],dpr:devicePixelRatio,
      gpu:ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,ua:navigator.userAgent,
      visibility:document.visibilityState,focused:document.hasFocus(),input:__hedwigSmoke};
  })()`);
  assert.deepEqual(state.buffer, [1280, 720]);
  assert(state.input.moves.some(move => move.trusted && (move.x || move.y)), 'No trusted mouse movement observed.');
  assert(errors.length === 0 && !logs.some(row => row.level === 'error'), 'Browser errors occurred.');
  assert(!responses.some(row => row.status >= 400 && !row.url.endsWith('/favicon.ico')), 'A browser resource failed.');
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ result: 'PASS', url: url.href, state, pilot: pilotEvidence, logs, errors, responses }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', output, pointerLock: true, trustedMouseMovement: true, escapeRelease: true, buffer: state.buffer }, null, 2));
} catch (error) {
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ result: 'FAIL', error: String(error), pilot: pilotEvidence, logs, errors, responses, chromeLog }, null, 2));
  throw error;
} finally {
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(Error('Chrome smoke ended.')); }
  ws?.close();
  if (child.pid && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    if (!await Promise.race([exited.then(() => true), delay(5000, false, { ref: false })])) {
      child.kill('SIGKILL');
      await exited;
    }
  }
  await rm(profile, { recursive: true, force: true });
  console.log(`Local evidence: ${output}. Temporary Chrome/profile closed; server remains caller-owned.`);
}
