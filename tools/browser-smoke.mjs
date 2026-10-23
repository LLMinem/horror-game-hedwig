// Local Chrome/CDP smoke. Isolated profile; ws handles full-resolution screenshot frames.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { exercisePilot } from './pilot-scenarios.mjs';
import { exerciseSpatial } from './spatial-scenarios.mjs';
import { createBrowserSession, localURL, privateOutput, twoFrames } from './browser-session.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: { width: { type: 'string', default: '1280' }, height: { type: 'string', default: '720' }, dpr: { type: 'string', default: '2' }, headless: { type: 'boolean', default: false }, 'measure-only': { type: 'boolean', default: false }, help: { type: 'boolean', default: false } },
});
if (options.help) {
  console.log(`Local Chrome smoke: npm run browser:smoke -- [options] [loopback URL]
  --width N --height N    CSS viewport (default 1280x720, minimum 800x600)
  --dpr 2                Required for screenshots; verified against saved PNGs
  --measure-only         No screenshots; permits --dpr 1 for separate measurements
  --headless             Use headless Chrome; CHROME_BIN overrides executable
  --help                 Print this help without starting Chrome
Default URL: http://127.0.0.1:4173/. The caller owns the server.
Private output: new directory below .local/. No human visual acceptance implied.`);
  process.exit(0);
}
assert(positionals.length <= 1, 'Pass at most one local URL.');
const width = Number(options.width), height = Number(options.height), dpr = Number(options.dpr);
assert(Number.isInteger(width) && width >= 800 && Number.isInteger(height) && height >= 600,
  'Viewport must be integer CSS dimensions of at least 800 × 600.');
assert(Number.isFinite(dpr) && dpr > 0 && dpr <= 2, 'DPR must be greater than zero and at most 2 (the renderer cap).');
assert(options['measure-only'] || dpr === 2, 'Screenshots require DPR2. Use --measure-only --dpr 1 for separate measurements without PNG captures.');
const capturePolicy = options['measure-only'] ? 'measurement-only; no screenshots' : 'DPR2 screenshots';
const expectedBuffer = [Math.floor(width * dpr), Math.floor(height * dpr)];
const captures = [];
const url = localURL(positionals[0] ?? 'http://127.0.0.1:4173/');
const isPilot = url.searchParams.get('mode') !== 'sandbox';
await fetch(url, { signal: AbortSignal.timeout(5000) });
const output = await privateOutput(root, undefined, 'browser-smoke');
const session = await createBrowserSession({ width, height, dpr, headless: options.headless });
const { send, evaluate, logs, errors, responses } = session;
let pilotEvidence = null;

async function screenshot(name) {
  if (options['measure-only']) return;
  captures.push(await session.screenshot(path.join(output, name), { renderer: true }));
}

try {
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
    pilotEvidence.spatial = await evaluate(`(${exerciseSpatial.toString()})()`);
    for (const view of await evaluate('__pilotReview.world.views.map(view => view.id)')) {
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
    const travel = async (sprint, grass = false) => {
      await evaluate(grass
        ? '__pilotReview.player.setView({x:27,z:-60,yaw:Math.PI/2,pitch:0})'
        : '__pilotReview.reset()');
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
    pilotEvidence.trustedGrassWalkMetres = await travel(false, true);
    pilotEvidence.trustedGrassSprintMetres = await travel(true, true);
    assert(pilotEvidence.trustedGrassWalkMetres > 2.5 && pilotEvidence.trustedGrassWalkMetres < 3.8, 'Trusted walking stopped on grass or at the former pilot edge.');
    assert(pilotEvidence.trustedGrassSprintMetres > pilotEvidence.trustedGrassWalkMetres * 1.3, 'Trusted sprinting stopped on grass.');
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
  assert.deepEqual(state.viewport, [width, height], 'CSS viewport differs from request.');
  assert.equal(state.dpr, dpr, 'DPR differs from request.');
  assert.deepEqual(state.buffer, expectedBuffer, 'Drawing buffer differs from request.');
  assert(state.input.moves.some(move => move.trusted && (move.x || move.y)), 'No trusted mouse movement observed.');
  assert(errors.length === 0 && !logs.some(row => row.level === 'error'), 'Browser errors occurred.');
  assert(!responses.some(row => row.status >= 400 && !row.url.endsWith('/favicon.ico')), 'A browser resource failed.');
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ result: 'PASS', url: url.href, requested: { width, height, dpr }, capturePolicy, headless: options.headless, captures, state, pilot: pilotEvidence, logs, errors, responses }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', output, pointerLock: true, trustedMouseMovement: true, escapeRelease: true, buffer: state.buffer }, null, 2));
} catch (error) {
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ result: 'FAIL', error: String(error), capturePolicy, pilot: pilotEvidence, logs, errors, responses, chromeLog: session.chromeLog }, null, 2));
  throw error;
} finally {
  await session.close();
  console.log(`Local evidence: ${output}. Temporary Chrome/profile closed; server remains caller-owned.`);
}
