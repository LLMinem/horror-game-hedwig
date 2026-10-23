// Shared isolated Chrome/CDP lifecycle for technical smoke and private spatial review.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

export const twoFrames = 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

export function localURL(value) {
  const url = new URL(value);
  assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    && !url.username && !url.password, 'Use a loopback HTTP dev/preview URL without credentials.');
  return url;
}

export async function noSymlinks(filename) {
  let current = path.resolve(filename);
  while (true) {
    try { assert(!(await lstat(current)).isSymbolicLink(), `Refusing symlink: ${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

export async function privateOutput(root, requested, prefix = 'spatial-review') {
  const local = path.join(root, '.local');
  await noSymlinks(local);
  await mkdir(local, { recursive: true, mode: 0o700 });
  if (requested) {
    const output = path.resolve(root, requested);
    assert(output.startsWith(`${local}${path.sep}`), 'Output must be a new directory inside this repository’s .local/ privacy boundary.');
    await noSymlinks(output);
    await mkdir(output, { mode: 0o700 }); // Exclusive: never reuse an evidence directory.
    return output;
  }
  const parent = path.join(local, prefix);
  await noSymlinks(parent);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  return mkdtemp(path.join(parent, 'run-'));
}

export async function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  if (!await Promise.race([exited.then(() => true), delay(5000, false, { ref: false })])) {
    child.kill('SIGKILL');
    await exited;
  }
}

export async function createBrowserSession({ width = 1600, height = 1200, dpr = 2, headless = true } = {}) {
  const profile = await mkdtemp(path.join(tmpdir(), 'hedwig-chrome-'));
  const child = spawn(process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    `--user-data-dir=${profile}`, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--no-first-run', '--no-default-browser-check', ...(headless ? ['--headless=new'] : []),
    `--window-size=${width},${height + 100}`, '--new-window', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let launchError, chromeLog = '', ws, nextId = 0, closePromise;
  const pending = new Map(), logs = [], errors = [], responses = [];
  child.on('error', error => { launchError = error; });
  child.stderr.on('data', data => { chromeLog = (chromeLog + data).slice(-32000); });
  function rejectPending(error) {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear();
  }
  function send(method, params = {}) {
    if (ws?.readyState !== WebSocket.OPEN) return Promise.reject(Error('CDP connection is not open.'));
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 60000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function viewport(w, h, scale = dpr) {
    assert(Number.isInteger(w) && w > 0 && Number.isInteger(h) && h > 0 && scale > 0 && scale <= 2, 'Invalid viewport/DPR.');
    width = w; height = h; dpr = scale;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  }
  async function screenshot(filename, { fullPage = false, renderer = false } = {}) {
    assert.equal(dpr, 2, 'All screenshots require DPR2; lower-DPR sessions are measurement-only.');
    await evaluate(twoFrames);
    const state = await evaluate(`(() => {
      const renderer = window.__pilotReview?.renderer ?? window.__sandboxReview?.renderer;
      const c = renderer?.domElement, gl = renderer?.getContext();
      return { viewport:[innerWidth,innerHeight], dpr:devicePixelRatio, buffer:gl ? [gl.drawingBufferWidth,gl.drawingBufferHeight] : null,
        canvas:c ? [c.width,c.height] : null,
        document:[Math.max(innerWidth,document.documentElement.scrollWidth),Math.max(innerHeight,document.documentElement.scrollHeight)] };
    })()`);
    assert.deepEqual(state.viewport, [width, height], 'CSS viewport differs from requested dimensions.');
    assert.equal(state.dpr, dpr, 'Browser DPR differs from request.');
    if (renderer) assert.deepEqual(state.buffer, [Math.floor(width * dpr), Math.floor(height * dpr)], 'Drawing buffer differs from request.');
    const [w, h] = fullPage ? state.document : [width, height];
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
    const png = Buffer.from(result.data, 'base64');
    assert(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Capture is not PNG.');
    const dimensions = [png.readUInt32BE(16), png.readUInt32BE(20)];
    assert.deepEqual(dimensions, [Math.floor(w * dpr), Math.floor(h * dpr)], 'PNG dimensions differ from CSS × DPR.');
    await writeFile(filename, png, { mode: 0o600 });
    return { name: path.basename(filename), dimensions, ...state };
  }
  function close() {
    closePromise ??= (async () => {
      rejectPending(Error('Browser session ended.'));
      ws?.close();
      await stopChild(child);
      // Chromium descendants may retain stderr after the main process exits.
      // Release our pipe so a completed CLI cannot linger waiting for them.
      child.stderr.destroy();
      await rm(profile, { recursive: true, force: true });
      process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal);
    })();
    return closePromise;
  }
  const onSignal = () => { void close(); };
  process.once('SIGINT', onSignal); process.once('SIGTERM', onSignal);
  try {
    const deadline = Date.now() + 20000;
    let port;
    while (!port) {
      if (launchError) throw launchError;
      assert(child.exitCode === null && Date.now() < deadline, `Chrome did not expose its local debug port. ${chromeLog}`);
      try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await delay(50); }
    }
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(10000) })).json();
    const target = pages.find(page => page.type === 'page');
    assert(target, 'Chrome did not create a page.');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.on('error', rejectPending);
    ws.on('close', () => rejectPending(Error('CDP connection closed.')));
    ws.on('message', data => {
      const message = JSON.parse(data.toString());
      if (message.id) {
        const request = pending.get(message.id);
        if (!request) return;
        clearTimeout(request.timer); pending.delete(message.id);
        if (message.error) request.reject(Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
      } else if (message.method === 'Runtime.consoleAPICalled') {
        logs.push({ level: message.params.type, text: message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ') });
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      else if (message.method === 'Network.responseReceived') {
        const { url, status } = message.params.response;
        if (url.startsWith('http:')) responses.push({ url, status, requestId: message.params.requestId });
      }
    });
    await once(ws, 'open', { signal: AbortSignal.timeout(10000) });
    await send('Page.enable'); await send('Runtime.enable');
    await send('Network.enable', { maxTotalBufferSize: 256 * 1024 * 1024, maxResourceBufferSize: 128 * 1024 * 1024 });
    await viewport(width, height, dpr);
    return { send, evaluate, viewport, screenshot, close, logs, errors, responses, get chromeLog() { return chromeLog; } };
  } catch (error) { await close(); throw error; }
}

export async function navigateReady(session, url, expression = 'document.readyState === "complete"') {
  await session.send('Page.navigate', { url });
  await session.send('Page.bringToFront');
  const deadline = Date.now() + 60000;
  while (!await session.evaluate(`location.href === ${JSON.stringify(url)} && (${expression})`)) {
    assert(Date.now() < deadline, `Page did not become ready: ${url}`);
    await delay(100);
  }
  await session.evaluate(twoFrames);
}
