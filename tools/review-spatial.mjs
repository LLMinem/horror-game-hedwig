#!/usr/bin/env node
// On-demand evidence, never automatic visual acceptance. Private inputs never enter Vite.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile, copyFile, chmod, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';
import { createBrowserSession, localURL, privateOutput, noSymlinks, navigateReady, twoFrames, stopChild } from './browser-session.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const help = `Private spatial comparison (no visual acceptance implied)

node tools/review-spatial.mjs --preset whole-site|photos|atlas|all [options]
  --url URL             Existing loopback HTTP Vite/preview server; never stopped
  --source-dir PATH     Authored revision containing inputs.json and walk.json
  --stations PATH       Private schemaVersion:1 photo station manifest (subsets allowed)
  --output PATH         New directory inside this repository's .local/; must not exist
  --require-complete    Exit nonzero for incomplete geometry, retaining full evidence
  --help                Print this help without starting servers or reading private data

Defaults: preset all; source_dir/stations from .local/spatial-review/config.json.
Without --url an owned ephemeral loopback Vite server is started and stopped.
Chrome is isolated/headless; CHROME_BIN overrides its executable. All captures DPR2.
Photos use CSS width1600 and original oriented aspect; overview1600x1200; Atlas1800x1200.
Audit Python: SPATIAL_PYTHON or .local/blueprint-venv/bin/python.
Outputs are private evidence only. Provisional camera poses remain explicitly labelled.
`;
const { values: options } = parseArgs({ options: {
  preset: { type: 'string', default: 'all' }, url: { type: 'string' }, 'source-dir': { type: 'string' },
  stations: { type: 'string' }, output: { type: 'string' }, 'require-complete': { type: 'boolean', default: false },
  help: { type: 'boolean', default: false },
} });
if (options.help) { console.log(help); process.exit(0); }
assert(['whole-site', 'photos', 'atlas', 'all'].includes(options.preset), 'Unknown --preset. Use --help.');
process.umask(0o077);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));
const saveJSON = (filename, value) => writeFile(filename, JSON.stringify(value, null, 2), { mode: 0o600 });
const wants = name => options.preset === 'all' || options.preset === name;

async function privateInput(filename) {
  const resolved = path.resolve(root, filename);
  assert(resolved.startsWith(`${path.join(root, '.local')}${path.sep}`), 'Reference/station files must stay inside this repository’s .local/ privacy boundary.');
  await noSymlinks(resolved);
  assert((await stat(resolved)).isFile(), `Required private file is missing: ${resolved}`);
  return resolved;
}

async function runAudit(source, output, runtime) {
  const executable = process.env.SPATIAL_PYTHON ?? path.join(root, '.local/blueprint-venv/bin/python');
  const args = [path.join(root, 'tools/review/spatial.py'), 'audit', '--source-dir', source, '--output', output, '--runtime-mesh', runtime,
    ...(options['require-complete'] ? ['--require-complete'] : [])];
  const child = spawn(executable, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  const stop = () => { void stopChild(child); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    await saveJSON(path.join(output, 'audit-process.json'), { executable, args, code, stdout, stderr });
    const audit = await json(path.join(output, 'audit.json')).catch(error => {
      throw Error(`Geometry audit did not produce audit.json (exit ${code}): ${stderr || stdout}. ${error.message}`);
    });
    if (code !== 0 && !(code === 1 && options['require-complete'] && audit.complete === false)) throw Error(`Geometry audit failed (exit ${code}): ${stderr || stdout}`);
    assert(audit.schemaVersion === 1 && Array.isArray(audit.bounds) && audit.bounds.length === 4 && audit.bounds.every(Number.isFinite), 'Unsupported geometry audit result.');
    return audit;
  } finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}

// Called in the actual loaded application: matrixWorld includes all exported parents.
function extractMeshes(names) {
  const review = window.__pilotReview;
  const allowed = new Set(names), meshes = [];
  review.world.root.updateMatrixWorld(true);
  review.world.root.traverse(object => {
    if (!object.isMesh || !allowed.has(object.name)) return;
    if (object.isInstancedMesh || object.isSkinnedMesh || object.morphTargetInfluences?.some(Boolean)) throw Error(`Unsupported deformed paving: ${object.name}`);
    for (let parent = object; parent; parent = parent.parent) if (!parent.visible) throw Error(`Paving is hidden: ${object.name}`);
    const geometry = object.geometry, position = geometry.attributes.position;
    if (!position) throw Error(`Paving has no decoded positions: ${object.name}`);
    const point = review.camera.position.clone(), vertices = [];
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
      vertices.push(point.toArray());
    }
    const count = geometry.index?.count ?? position.count;
    if (geometry.drawRange.start !== 0 || geometry.drawRange.count < count) throw Error(`Partial paving draw range: ${object.name}`);
    const triangles = [];
    for (let i = 0; i < count; i += 3) triangles.push(geometry.index
      ? [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)] : [i, i + 1, i + 2]);
    meshes.push({ name: object.name, vertices, triangles });
  });
  if (!meshes.length) throw Error('No identifiable decoded paving meshes loaded.');
  return { schemaVersion: 1, meshes, worldFrame: 'threejs-x-east-z-south',
    provenance: { extraction: 'loaded Three.js BufferGeometry positions and indices transformed by matrixWorld', expectedNames: names,
      observedNames: meshes.map(mesh => mesh.name), loadedAt: location.href } };
}

// Uses the real renderer and scene on EVERY animation frame, not a schematic canvas.
// A cloned camera with Three's orthographic projection matrix avoids bundler-specific imports.
function installCaptureCamera(spec) {
  const review = window.__pilotReview;
  if (!window.__spatialCapture) {
    window.__spatialCapture = { render: review.renderer.render, fog: review.scene.fog };
    review.renderer.render = function(scene, camera) {
      return window.__spatialCapture.render.call(this, scene, scene === review.scene ? window.__spatialCapture.camera : camera);
    };
  }
  const state = window.__spatialCapture, camera = review.camera.clone();
  review.player.setEnabled(false);
  review.setLighting('neutral');
  if (spec.kind === 'orthographic') {
    const [west, south, east, north] = spec.bounds;
    camera.isPerspectiveCamera = false; camera.isOrthographicCamera = true; camera.type = 'OrthographicCamera';
    camera.near = .1; camera.far = 2000; camera.zoom = 1;
    camera.left = -(east - west) / 2; camera.right = -camera.left;
    camera.top = (north - south) / 2; camera.bottom = -camera.top;
    camera.position.set((west + east) / 2, 500, -(south + north) / 2);
    camera.up.set(0, 0, -1); camera.lookAt((west + east) / 2, 0, -(south + north) / 2);
    camera.projectionMatrix.makeOrthographic(camera.left, camera.right, camera.top, camera.bottom, camera.near, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    review.scene.fog = null; // Explicit neutral plan-view evidence, not a ground atmosphere claim.
  } else {
    const station = spec.station, floor = review.sampleHeight(station.x, -station.y);
    if (!Number.isFinite(floor)) throw Error(`Station outside supported terrain: ${station.id}`);
    camera.position.set(station.x, floor + station.eye_height_m, -station.y);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(station.pitch_deg * Math.PI / 180, -station.heading_grid_deg * Math.PI / 180, station.roll_deg * Math.PI / 180, 'YXZ');
    camera.fov = station.vertical_fov_deg; camera.aspect = innerWidth / innerHeight;
    camera.near = .1; camera.far = review.camera.far; camera.updateProjectionMatrix();
    review.scene.fog = state.fog;
  }
  camera.updateMatrixWorld(true); state.camera = camera;
  let style = document.querySelector('#spatial-capture-style');
  if (!style) { style = document.createElement('style'); style.id = 'spatial-capture-style'; document.head.append(style); }
  style.textContent = 'body>*:not(canvas):not(#spatial-pose-label){visibility:hidden!important} canvas{visibility:visible!important}';
  document.querySelector('#spatial-pose-label')?.remove();
  if (spec.station) {
    const label = document.createElement('div'); label.id = 'spatial-pose-label';
    label.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#111d;color:white;font:18px/1.4 system-ui;padding:8px 12px;white-space:pre-wrap';
    label.textContent = `Photo ${spec.station.photo_number} · ${spec.station.pose_status.toUpperCase()} POSE — ${typeof spec.station.uncertainty === 'string' ? spec.station.uncertainty : JSON.stringify(spec.station.uncertainty)}`;
    document.body.append(label);
  }
  review.renderer.render(review.scene, camera);
  return { kind: spec.kind, position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(), fogDisabled: spec.kind === 'orthographic' };
}

function framedBounds(bounds, ratio = 4 / 3) {
  const [w, s, e, n] = bounds, cx = (w + e) / 2, cy = (s + n) / 2;
  const width = Math.max(e - w, (n - s) * ratio) * 1.04, height = width / ratio;
  return [cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2];
}

function sourceSVG(features, bounds, raster) {
  const colors = ['#ffd449', '#ff6584', '#51c8ff', '#79e094', '#e7a1ff', '#ff9e4f', '#fff'];
  const categories = [...new Set(features.map(feature => feature.category ?? 'unknown'))].sort();
  const line = coordinates => coordinates.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  function shape(geometry) {
    if (!geometry) return '';
    const c = geometry.coordinates;
    switch (geometry.type) {
      case 'Point': return `<circle cx="${c[0]}" cy="${c[1]}" r=".85"/>`;
      case 'MultiPoint': return c.map(p => shape({ type: 'Point', coordinates: p })).join('');
      case 'LineString': return `<path d="${line(c)}" fill="none"/>`;
      case 'MultiLineString': return c.map(p => shape({ type: 'LineString', coordinates: p })).join('');
      case 'Polygon': return `<path d="${c.map(ring => `${line(ring)}Z`).join(' ')}" fill-rule="evenodd" fill-opacity=".09"/>`;
      case 'MultiPolygon': return c.map(p => shape({ type: 'Polygon', coordinates: p })).join('');
      case 'GeometryCollection': return geometry.geometries.map(shape).join('');
      default: throw Error(`Unsupported source geometry: ${geometry.type}`);
    }
  }
  const [w, s, e, n] = bounds;
  const aerial = raster ? `<image data-aerial="true" href="aerial.png" x="${raster.bounds[0]}" y="${-raster.bounds[3]}" width="${raster.bounds[2] - raster.bounds[0]}" height="${raster.bounds[3] - raster.bounds[1]}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${w} ${-n} ${e - w} ${n - s}" role="img" aria-label="All canonical source features, independently of authored selection">${aerial}<g transform="scale(1,-1)" stroke-width=".4">${categories.map((category, index) => `<g data-category="${escape(category)}" stroke="${colors[index % colors.length]}" fill="${colors[index % colors.length]}">${features.filter(feature => (feature.category ?? 'unknown') === category).map(feature => `<g data-feature-id="${escape(feature.id)}"><title>${escape(feature.id)} · ${escape(category)}</title>${shape(feature.geometry)}</g>`).join('')}</g>`).join('')}</g></svg>`;
}

function reportHTML(evidence, audit, overviewSVG) {
  const photos = evidence.photos ?? [];
  const whole = overviewSVG ? `<section><h2>Whole-site: actual orthographic scene / independent source + aerial</h2><p>Same north-up metre frame on both sides. All canonical features are present, regardless of authored selection. Overview fog is disabled; geometry is not altered.</p><div class="controls"><label><input id="overlay" type="checkbox"> Source over render</label><label><input id="aerial" type="checkbox" checked> Aerial</label>${[...new Set(audit.features.map(f => f.category ?? 'unknown'))].sort().map(category => `<label><input type="checkbox" checked data-category-toggle="${escape(category)}"> ${escape(category)}</label>`).join('')}</div><div class="pair"><figure><div class="stack"><img src="whole-site-render.png" alt="Actual rendered scene"><div id="scene-overlay" hidden>${overviewSVG.replace(/<image\b[^>]*\/>/, '')}</div></div><figcaption>Actual decoded runtime geometry; north up</figcaption></figure><figure>${overviewSVG}<figcaption>Independent complete canonical source and official aerial; not survey accuracy</figcaption></figure></div></section>` : '';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; object-src 'none'; base-uri 'none'"><title>Private spatial review</title><style>body{background:#141b20;color:#edf2f5;font:16px/1.5 system-ui;margin:24px}h1,h2{line-height:1.2}.warning{background:#523e13;padding:14px}a{color:#91d6ff}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;min-width:0}img,svg{width:100%;display:block}figcaption{padding:8px}.stack{position:relative}.stack>div{position:absolute;inset:0}.controls{display:flex;gap:15px;flex-wrap:wrap;margin:15px 0}section{margin:35px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse}td,th{padding:7px;border:1px solid #52616b;text-align:left}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><h1>Private spatial review — ${escape(evidence.preset)}</h1><p class="warning">Not visual acceptance. Geometry complete: <strong>${audit.complete ? 'YES' : 'NO'}</strong>. Camera calibration, source uncertainty, occlusion and visual quality require human review. Private references must not be published.</p><p>DPR2 throughout; actual CSS, drawing buffer and PNG dimensions recorded in <a href="report.json">report.json</a>. <a href="audit.json">Full geometry audit</a> · <a href="source-overlay.svg">Complete source overlay</a> · <a href="runtime-mesh.json">Decoded paving geometry</a></p><details><summary>Geometry summary and limits</summary><pre>${escape(JSON.stringify({ summary: audit.summary, limits: audit.limits }, null, 2))}</pre></details>${whole}${evidence.atlas ? '<section><h2>Full private Atlas — all source / orientation toggles enabled</h2><a href="atlas.png"><img src="atlas.png" alt="Full Atlas screenshot with source layers and orientation toggles"></a><p>RGB aerial selected. All layer checkboxes enabled; metadata and source panels expanded.</p></section>' : ''}${photos.map(photo => `<section><h2>Photo ${escape(photo.station.photo_number)} · ${escape(photo.station.id)}</h2><p class="warning">${escape(photo.station.pose_status.toUpperCase())} POSE — ${escape(typeof photo.station.uncertainty === 'string' ? photo.station.uncertainty : JSON.stringify(photo.station.uncertainty))}</p><div class="pair"><figure><img src="${photo.reference}" alt="Private reference photo ${escape(photo.station.photo_number)}"><figcaption>Original oriented aspect ${photo.station.width}:${photo.station.height}; working proxy, no forced crop</figcaption></figure><figure><img src="${photo.render}" alt="Pose-matched runtime render"><figcaption>Fixed station; neutral light; pose not optimized against the changing scene</figcaption></figure></div><details><summary>Pose and anchors</summary><pre>${escape(JSON.stringify(photo.station, null, 2))}</pre></details></section>`).join('')}<script>document.querySelector('#overlay')?.addEventListener('change',e=>{document.querySelector('#scene-overlay').hidden=!e.target.checked});document.querySelector('#aerial')?.addEventListener('change',e=>{document.querySelectorAll('[data-aerial]').forEach(x=>x.style.display=e.target.checked?'':'none')});document.querySelectorAll('[data-category-toggle]').forEach(input=>input.addEventListener('change',()=>{document.querySelectorAll('[data-category]').forEach(group=>{if(group.dataset.category===input.dataset.categoryToggle)group.style.display=input.checked?'':'none'})}));</script></html>`;
}

let session, sessionStart, server, output;
const evidence = { schemaVersion: 1, preset: options.preset, createdAt: new Date().toISOString(), dpr: 2, captures: [], photos: [], visualAcceptance: false };
const shutdown = async () => { await sessionStart?.catch(() => {}); await session?.close(); await server?.close(); };
const interrupted = signal => { void shutdown().finally(() => { process.exit(signal === 'SIGINT' ? 130 : 143); }); };
process.once('SIGINT', interrupted); process.once('SIGTERM', interrupted);
try {
  const configPath = path.join(root, '.local/spatial-review/config.json');
  await noSymlinks(configPath);
  const config = await json(configPath).catch(error => { if (error.code === 'ENOENT') return {}; throw error; });
  const sourceOption = options['source-dir'] ?? config.source_dir;
  assert(sourceOption, 'Missing source revision. Pass --source-dir PATH or set source_dir in .local/spatial-review/config.json.');
  const source = path.resolve(root, sourceOption);
  await noSymlinks(source);
  await noSymlinks(path.join(source, 'inputs.json'));
  const inputs = await json(path.join(source, 'inputs.json'));
  const sitePath = await privateInput('.local/blueprint/site-local.json');
  const site = await json(sitePath);
  let stations = [];
  if (wants('photos')) {
    const stationOption = options.stations ?? config.stations;
    assert(stationOption, 'Missing photo stations. Pass --stations PATH or set stations in .local/spatial-review/config.json.');
    const manifestPath = await privateInput(stationOption), manifest = await json(manifestPath);
    assert(manifest.schemaVersion === 1 && Array.isArray(manifest.stations) && manifest.stations.length, 'Station manifest needs schemaVersion:1 and nonempty stations.');
    stations = manifest.stations;
    const ids = new Set();
    for (const station of stations) {
      assert(typeof station.id === 'string' && station.id && !ids.has(station.id), 'Station IDs must be unique nonempty strings.'); ids.add(station.id);
      for (const field of ['x', 'y', 'heading_grid_deg', 'eye_height_m', 'pitch_deg', 'roll_deg', 'vertical_fov_deg', 'width', 'height']) assert(Number.isFinite(station[field]), `Station ${station.id} missing finite ${field}.`);
      assert(station.width > 0 && station.height > 0 && station.eye_height_m > 0 && station.vertical_fov_deg > 0 && station.vertical_fov_deg < 180, `Invalid dimensions/optics for ${station.id}.`);
      assert(typeof station.pose_status === 'string' && station.pose_status && station.uncertainty && Array.isArray(station.anchors), `Station ${station.id} must label pose_status, uncertainty and anchors.`);
      const photo = site.photos.find(photo => photo.id === station.photo_id && photo.number === station.photo_number);
      assert(photo, `Station ${station.id} does not match a canonical private photo ID/number.`);
      await privateInput(path.resolve(path.dirname(sitePath), photo.proxy));
    }
    evidence.stationManifest = { path: manifestPath, sha256: sha256(await readFile(manifestPath)) };
  }
  output = await privateOutput(root, options.output);
  evidence.output = output; evidence.source = source;
  let url;
  if (options.url) url = localURL(options.url);
  else {
    server = await createServer({ root, server: { host: '127.0.0.1', port: 0, open: false,
      fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local/**', '**/assets/source/**'] } }, clearScreen: false });
    await server.listen();
    url = localURL(`http://127.0.0.1:${server.httpServer.address().port}/`);
  }
  assert(url.searchParams.get('mode') !== 'sandbox', 'Spatial review requires the cemetery, not sandbox mode.');
  evidence.url = url.href; evidence.serverOwned = !!server;
  session = await (sessionStart = createBrowserSession());
  await navigateReady(session, url.href, 'document.querySelector("#pilot-review")?.dataset.state === "ready" || document.querySelector("#pilot-review")?.dataset.state === "error"');
  await session.evaluate('__pilotReview.ready.then(() => true)');
  const names = ['paving', ...(inputs.surfaces ?? []).map(surface => `PROVISIONAL_${surface.id}`)];
  const runtime = await session.evaluate(`(${extractMeshes.toString()})(${JSON.stringify(names)})`);
  runtime.hashes = { decoded_geometry_sha256: sha256(JSON.stringify(runtime.meshes)) };
  runtime.provenance.resources = [];
  for (const response of session.responses.filter(row => /\/(?:entrance-hall|layout)\.glb(?:\?|$)/.test(row.url))) {
    assert(response.status < 400, `Runtime resource failed: ${response.url}`);
    const body = await session.send('Network.getResponseBody', { requestId: response.requestId });
    const hash = sha256(Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8'));
    runtime.hashes[response.url] = hash;
    runtime.provenance.resources.push({ url: response.url, sha256: hash });
  }
  assert(runtime.provenance.resources.length >= 2, 'Missing loaded pilot/spatial GLB provenance.');
  const runtimePath = path.join(output, 'runtime-mesh.json');
  await saveJSON(runtimePath, runtime);
  const audit = await runAudit(source, output, runtimePath);
  evidence.geometryComplete = audit.complete;
  evidence.runtime = { meshNames: runtime.meshes.map(mesh => mesh.name), hashes: runtime.hashes };
  let overviewSVG = '';
  if (wants('whole-site')) {
    const bounds = framedBounds(audit.bounds);
    await session.viewport(1600, 1200, 2);
    evidence.overview = { terrainBounds: audit.bounds, captureBounds: bounds,
      camera: await session.evaluate(`(${installCaptureCamera.toString()})(${JSON.stringify({ kind: 'orthographic', bounds })})`) };
    evidence.captures.push(await session.screenshot(path.join(output, 'whole-site-render.png'), { renderer: true }));
    const raster = site.rasters.find(raster => raster.id === 'rgb');
    assert(raster, 'Independent official RGB aerial is missing from site-local.json.');
    const aerialPath = await privateInput(path.resolve(path.dirname(sitePath), raster.path));
    await copyFile(aerialPath, path.join(output, 'aerial.png')); await chmod(path.join(output, 'aerial.png'), 0o600);
    overviewSVG = sourceSVG(audit.features, bounds, raster);
    await writeFile(path.join(output, 'source-comparison.svg'), overviewSVG, { mode: 0o600 });
    await writeFile(path.join(output, 'source-comparison.html'), `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#182027;width:100%;height:100%;overflow:hidden}svg{width:100%;height:100%;display:block}</style>${overviewSVG}`, { mode: 0o600 });
    evidence.overview.aerial = { ...raster, sha256: sha256(await readFile(aerialPath)) };
  }
  for (let index = 0; index < stations.length; index++) {
    const station = stations[index], height = Math.round(1600 * station.height / station.width);
    const photo = site.photos.find(photo => photo.id === station.photo_id);
    const reference = `photo-${String(index + 1).padStart(2, '0')}-reference.jpg`, render = `photo-${String(index + 1).padStart(2, '0')}-render.png`;
    const sourcePhoto = await privateInput(path.resolve(path.dirname(sitePath), photo.proxy));
    await copyFile(sourcePhoto, path.join(output, reference)); await chmod(path.join(output, reference), 0o600);
    await session.viewport(1600, height, 2);
    const camera = await session.evaluate(`(${installCaptureCamera.toString()})(${JSON.stringify({ kind: 'photo', station })})`);
    evidence.captures.push(await session.screenshot(path.join(output, render), { renderer: true }));
    evidence.photos.push({ station, reference, render, camera, referenceSha256: sha256(await readFile(sourcePhoto)), cssAspectRounding: { width: 1600, height } });
  }
  evidence.runtimeBrowser = { logs: [...session.logs], errors: [...session.errors], responses: [...session.responses] };
  assert(session.errors.length === 0 && !session.logs.some(row => row.level === 'error'), 'Runtime browser errors occurred; see report.json.');
  assert(!session.responses.some(row => row.status >= 400 && !row.url.endsWith('/favicon.ico')), 'Runtime resource failed; see report.json.');
  if (overviewSVG) {
    await session.viewport(1600, 1200, 2);
    await navigateReady(session, pathToFileURL(path.join(output, 'source-comparison.html')).href);
    await session.evaluate('Promise.all([...document.querySelectorAll("svg image")].map(image => new Promise((resolve,reject) => {const probe=new Image();probe.onload=resolve;probe.onerror=()=>reject(Error("Aerial failed to load"));probe.src=image.getAttribute("href")}))).then(() => true)');
    evidence.captures.push(await session.screenshot(path.join(output, 'whole-site-source.png')));
  }
  if (wants('atlas')) {
    const atlasPath = await privateInput('.local/blueprint/atlas.html');
    await session.viewport(1800, 1200, 2);
    await navigateReady(session, pathToFileURL(atlasPath).href, 'document.readyState === "complete" && document.querySelectorAll("#layer-options input").length > 0');
    const atlasData = await session.evaluate('JSON.parse(document.querySelector("#site-data").textContent)');
    for (const field of ['features', 'frame', 'rasters', 'photos']) assert.deepEqual(atlasData[field], site[field],
      `Private Atlas ${field} are stale. Refresh with python3 tools/blueprint/atlas.py render, then retry into a new output.`);
    evidence.atlas = await session.evaluate(`(() => {
      const embedded=JSON.parse(document.querySelector('#site-data').textContent);
      document.querySelectorAll('#show-source,#layer-options input,#show-grid').forEach(input=>{input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}))});
      document.querySelectorAll('#show-photos,#show-rays').forEach(input=>{input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}))});
      const raster=document.querySelector('#raster');raster.value=String(embedded.rasters.findIndex(row=>row.id==='rgb'));raster.dispatchEvent(new Event('change',{bubbles:true}));
      document.querySelector('#fit-site').click();
      return {source:location.href,featureCount:embedded.features.length,toggles:[...document.querySelectorAll('input[type="checkbox"]')].map(input=>({label:input.closest('label')?.textContent,checked:input.checked})),raster:'rgb'};
    })()`);
    await session.evaluate(`Promise.all([
      ...[...document.images].filter(image=>image.getAttribute('src')).map(image=>image.decode()),
      ...[...document.querySelectorAll('svg image')].filter(image=>image.getAttribute('href')).map(image=>new Promise((resolve,reject)=>{
        const probe=new Image();probe.onload=resolve;probe.onerror=()=>reject(Error('Atlas raster failed to load'));probe.src=image.getAttribute('href');
      }))
    ]).then(()=>true)`);
    await session.evaluate(twoFrames);
    evidence.captures.push(await session.screenshot(path.join(output, 'atlas.png')));
  }
  await writeFile(path.join(output, 'index.html'), reportHTML(evidence, audit, overviewSVG), { mode: 0o600 });
  // Decode the copied proxies locally: reject stale manifests/aspect mismatch, never stretch/crop to hide it.
  if (evidence.photos.length) {
    await navigateReady(session, pathToFileURL(path.join(output, 'index.html')).href);
    for (const photo of evidence.photos) {
      const dimensions = await session.evaluate(`(async()=>{const image=document.querySelector('img[src=${JSON.stringify(photo.reference)}]');await image.decode();return [image.naturalWidth,image.naturalHeight]})()`);
      assert(Math.abs(dimensions[0] / dimensions[1] - photo.station.width / photo.station.height) < .01, `Photo ${photo.station.photo_number} proxy aspect differs from station's oriented dimensions.`);
      photo.proxyDimensions = dimensions;
    }
  }
  evidence.result = options['require-complete'] && !audit.complete ? 'INCOMPLETE' : 'CAPTURED';
  await saveJSON(path.join(output, 'report.json'), evidence);
  console.log(JSON.stringify({ result: evidence.result, output, report: path.join(output, 'index.html'), geometryComplete: audit.complete, visualAcceptance: false }, null, 2));
  if (options['require-complete'] && !audit.complete) process.exitCode = 1;
} catch (error) {
  if (output) await saveJSON(path.join(output, 'report.json'), { ...evidence, result: 'ERROR', error: String(error), browser: session ? { logs: session.logs, errors: session.errors, responses: session.responses, chromeLog: session.chromeLog } : null });
  console.error(`Spatial review failed: ${error.message}${output ? `\nPrivate evidence: ${output}` : ''}`);
  process.exitCode = 1;
} finally {
  await shutdown();
  process.removeListener('SIGINT', interrupted); process.removeListener('SIGTERM', interrupted);
}
