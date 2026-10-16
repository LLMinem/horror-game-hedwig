// Runtime metres: +X east, +Y up, +Z south. No render-mesh queries.
export const PLAYER_RADIUS = 0.28;
const EPSILON = 1e-8;

function distanceSquared(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length)) : 0;
  return (x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2;
}

export function insidePolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if (distanceSquared(x, z, a, b) < EPSILON * EPSILON) return true;
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function polygonEdges(polygons) {
  return polygons.flatMap(polygon => polygon.map((a, i) => ({ a, b: polygon[(i + 1) % polygon.length] })));
}

// Split polygon edges at intersections, retaining only the exposed union boundary.
// Internal seams must not block a circle crossing overlapping public paths.
function unionEdges(polygons) {
  const edges = polygonEdges(polygons);
  const exposed = [];
  const contains = (x, z) => polygons.some(polygon => insidePolygon(x, z, polygon));
  for (const edge of edges) {
    const { a, b } = edge;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length2 = dx * dx + dz * dz;
    if (length2 < EPSILON) continue;
    const cuts = [0, 1];
    for (const other of edges) {
      const ex = other.b[0] - other.a[0], ez = other.b[1] - other.a[1];
      const qx = other.a[0] - a[0], qz = other.a[1] - a[1];
      const cross = dx * ez - dz * ex;
      if (Math.abs(cross) > EPSILON) {
        const t = (qx * ez - qz * ex) / cross;
        const u = (qx * dz - qz * dx) / cross;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
      } else if (Math.abs(qx * dz - qz * dx) < EPSILON) {
        for (const point of [other.a, other.b]) {
          const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length2;
          if (t > 0 && t < 1) cuts.push(t);
        }
      }
    }
    cuts.sort((left, right) => left - right);
    const nx = -dz / Math.sqrt(length2) * 1e-6;
    const nz = dx / Math.sqrt(length2) * 1e-6;
    for (let i = 1; i < cuts.length; i++) {
      const lo = cuts[i - 1], hi = cuts[i];
      if (hi - lo < EPSILON) continue;
      const t = (lo + hi) / 2, x = a[0] + dx * t, z = a[1] + dz * t;
      if (contains(x + nx, z + nz) !== contains(x - nx, z - nz)) {
        exposed.push({ a: [a[0] + dx * lo, a[1] + dz * lo], b: [a[0] + dx * hi, a[1] + dz * hi] });
      }
    }
  }
  return exposed;
}

function validateData(data) {
  const fail = () => { throw new Error('Invalid pilot walk.json: expected version 1 terrain, polygons, barriers and review views.'); };
  const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  const polygon = p => Array.isArray(p) && p.length >= 3 && p.every(point);
  const ground = data?.ground;
  if (data?.version !== 1 || !ground || ![ground.x0, ground.z0, ground.step].every(Number.isFinite) || ground.step <= 0 ||
      !Number.isInteger(ground.columns) || !Number.isInteger(ground.rows) || ground.columns < 2 || ground.rows < 2 ||
      !Array.isArray(ground.heights) || ground.heights.length !== ground.columns * ground.rows || !ground.heights.every(Number.isFinite) ||
      !Array.isArray(data.walkable) || !data.walkable.length || !data.walkable.every(polygon) ||
      !Array.isArray(data.surfaces) || !data.surfaces.every(s => polygon(s.polygon) && (s.height === undefined || Number.isFinite(s.height)) && (s.offset === undefined || Number.isFinite(s.offset))) ||
      !Array.isArray(data.obstacles) || !data.obstacles.every(o => polygon(o.polygon)) ||
      !Array.isArray(data.barriers) || !data.barriers.every(b => point(b.a) && point(b.b)) ||
      !data.spawn || ![data.spawn.x, data.spawn.z, data.spawn.yaw, data.spawn.pitch].every(Number.isFinite) ||
      !Array.isArray(data.views) || !data.views.every(v => typeof v.id === 'string' && [v.x, v.z, v.yaw, v.pitch].every(Number.isFinite) && (!v.inspection || Number.isFinite(v.y)))) fail();
}

export function createPilotMovement(data) {
  validateData(data);
  const ground = data.ground;
  const xMax = ground.x0 + (ground.columns - 1) * ground.step;
  const zMax = ground.z0 + (ground.rows - 1) * ground.step;
  const bounds = unionEdges(data.walkable);
  const edges = [...bounds, ...polygonEdges(data.obstacles.map(o => o.polygon)), ...data.barriers];
  // Include heightfield bounds in sliding, even if a walkable polygon extends beyond it.
  edges.push(...polygonEdges([[[ground.x0, ground.z0], [xMax, ground.z0], [xMax, zMax], [ground.x0, zMax]]]));

  function sampleHeight(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || x < ground.x0 || z < ground.z0 || x > xMax || z > zMax) return null;
    const gx = (x - ground.x0) / ground.step, gz = (z - ground.z0) / ground.step;
    const column = Math.min(Math.floor(gx), ground.columns - 2);
    const row = Math.min(Math.floor(gz), ground.rows - 2);
    const u = gx - column, v = gz - row, i = row * ground.columns + column;
    const nw = ground.heights[i], ne = ground.heights[i + 1];
    const sw = ground.heights[i + ground.columns], se = ground.heights[i + ground.columns + 1];
    // NW-SW-SE when v >= u; NW-SE-NE otherwise (not bilinear).
    const height = v >= u ? nw + v * (sw - nw) + u * (se - sw) : nw + u * (ne - nw) + v * (se - ne);
    for (let s = data.surfaces.length - 1; s >= 0; s--) {
      const surface = data.surfaces[s];
      if (insidePolygon(x, z, surface.polygon)) return surface.height ?? height + (surface.offset ?? 0.025);
    }
    return height;
  }

  function canStand(x, z, radius = PLAYER_RADIUS) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(radius) || radius < 0 ||
        x - radius < ground.x0 || x + radius > xMax || z - radius < ground.z0 || z + radius > zMax) return false;
    let supported = false;
    for (const polygon of data.walkable) if (insidePolygon(x, z, polygon)) { supported = true; break; }
    if (!supported) return false;
    for (const obstacle of data.obstacles) if (insidePolygon(x, z, obstacle.polygon)) return false;
    const radius2 = radius * radius;
    for (const edge of edges) if (distanceSquared(x, z, edge.a, edge.b) < radius2 - EPSILON) return false;
    return true;
  }

  // Mutates the caller's position; no per-frame vectors, polygon copies or raycasts.
  function move(position, dx, dz) {
    if (!Number.isFinite(dx) || !Number.isFinite(dz) || !canStand(position.x, position.z)) return false;
    const distance = Math.hypot(dx, dz);
    if (distance > 10) return false; // Review calls cannot request unbounded work or teleport.
    const count = Math.max(1, Math.ceil(distance / (PLAYER_RADIUS / 4)));
    const sx = dx / count, sz = dz / count;
    const slideRange2 = (PLAYER_RADIUS + distance / count) ** 2;
    for (let step = 0; step < count; step++) {
      const x = position.x, z = position.z;
      if (canStand(x + sx, z + sz)) { position.x += sx; position.z += sz; continue; }
      let bestX = 0, bestZ = 0, bestProgress = 0;
      // Project onto nearby wall tangents; this slides along rotated walls too.
      for (const edge of edges) {
        if (distanceSquared(x + sx, z + sz, edge.a, edge.b) > slideRange2) continue;
        const ex = edge.b[0] - edge.a[0], ez = edge.b[1] - edge.a[1], length2 = ex * ex + ez * ez;
        if (length2 < EPSILON) continue;
        const t = (sx * ex + sz * ez) / length2, tx = t * ex, tz = t * ez;
        const progress = tx * sx + tz * sz;
        if (progress > bestProgress && canStand(x + tx, z + tz)) { bestX = tx; bestZ = tz; bestProgress = progress; }
      }
      if (sx * sx > bestProgress && canStand(x + sx, z)) { bestX = sx; bestZ = 0; bestProgress = sx * sx; }
      if (sz * sz > bestProgress && canStand(x, z + sz)) { bestX = 0; bestZ = sz; }
      position.x += bestX;
      position.z += bestZ;
    }
    position.y = sampleHeight(position.x, position.z);
    return true;
  }

  if (!canStand(data.spawn.x, data.spawn.z)) throw new Error('Pilot spawn is outside radius-safe walking space.');
  for (const view of data.views) {
    if (!view.inspection && !canStand(view.x, view.z)) throw new Error(`Pilot view ${view.id} is outside radius-safe walking space.`);
  }
  return { sampleHeight, canStand, move, radius: PLAYER_RADIUS };
}
