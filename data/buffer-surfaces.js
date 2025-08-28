#!/usr/bin/env node
/**
 * buffer-surfaces.js (ESM, robust clipping)
 *
 * - Paths (highway=path|footway|service) -> surface polygons (by width)
 * - Hedges (barrier=hedge)               -> 1.0 m polygons by default
 * - Hedges are clipped against ALL surfaces (per-surface difference; no union)
 * - Coordinates are sanitized (cleaned & truncated) to avoid boolean-op errors
 * - Drops tiny hedge slivers by area threshold
 * - Pretty-prints output by default
 *
 * Usage:
 *   node buffer-surfaces.js <input.geojson> <output.geojson>
 *        [--hedge-width 1.0] [--paving-width 3.0] [--gravel-width 2.4] [--service-width 4.0]
 *        [--precision 6] [--min-hedge-area 0.05] [--no-clip-hedges] [--minify]
 */

import * as turf from "@turf/turf";
import fs from "fs";

// ---------- tiny arg parser ----------
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node buffer-surfaces.js <input.geojson> <output.geojson> [options]");
  process.exit(1);
}
const inPath = args[0];
const outPath = args[1];

function getFlag(name, def = undefined) {
  const i = args.indexOf(name);
  if (i !== -1 && i + 1 < args.length) return args[i + 1];
  return def;
}
function hasFlag(name) {
  return args.includes(name);
}

// Widths (TOTAL width in meters)
const HEDGE_W = parseFloat(getFlag("--hedge-width", 1.0));
const PAVING_W = parseFloat(getFlag("--paving-width", 3.0));
const GRAVEL_W = parseFloat(getFlag("--gravel-width", 2.4));
const SERVICE_W = parseFloat(getFlag("--service-width", 4.0));

// Tuning
const PRECISION = parseInt(getFlag("--precision", 6), 10); // decimal places
const MIN_HEDGE_AREA_M2 = parseFloat(getFlag("--min-hedge-area", 0.05)); // drop slivers
const CLIP_HEDGES = !hasFlag("--no-clip-hedges");
const PRETTY = !hasFlag("--minify");

// Convert TOTAL width to HALF‐width (buffer distance)
const HEDGE_R = HEDGE_W / 2;
const PAVING_R = PAVING_W / 2;
const GRAVEL_R = GRAVEL_W / 2;
const SERVICE_R = SERVICE_W / 2;

// Buffer options
const BUFFER_OPTS = { units: "meters", steps: 16 };

// ---------- helpers ----------
const isLS = (f) => f?.geometry?.type === "LineString";
const isPoly = (f) => ["Polygon", "MultiPolygon"].includes(f?.geometry?.type);

const deepClone = (o) => JSON.parse(JSON.stringify(o ?? {}));

function sanitize(feat) {
  // clean double vertices & truncate precision to stabilize boolean ops
  let f = turf.cleanCoords(feat, { mutate: false });
  f = turf.truncate(f, { precision: PRECISION, mutate: false });
  return f;
}

function surfaceClass(props = {}) {
  const s = (props.surface || "").toLowerCase();
  if (["asphalt", "sett", "paving_stones", "concrete"].includes(s)) return "paving";
  if (["gravel", "fine_gravel"].includes(s)) return "gravel";
  return "unknown";
}
function pathHalfWidth(props = {}) {
  const hw = (props.highway || "").toLowerCase();
  const sc = surfaceClass(props);
  if (hw === "service") return SERVICE_R;
  if (sc === "paving") return PAVING_R;
  if (sc === "gravel") return GRAVEL_R;
  return PAVING_R; // default if unknown
}

function safeBuffer(f, r) {
  try {
    return sanitize(turf.buffer(sanitize(f), r, BUFFER_OPTS));
  } catch (e) {
    console.warn("buffer failed, skipping feature:", e?.message || e);
    return null;
  }
}

function safeDiff(a, b) {
  try {
    const out = turf.difference(sanitize(a), sanitize(b));
    return out ? sanitize(out) : null;
  } catch (e) {
    // leave it unchanged if difference fails
    return null;
  }
}

// ---------- load ----------
const raw = JSON.parse(fs.readFileSync(inPath, "utf8"));
const feats = raw.features || [];

const surfaces = [];
const hedgesBuf = [];
const passthrough = [];

// ---------- build surfaces & hedges ----------
for (const f of feats) {
  const props = deepClone(f.properties);
  const gtype = f?.geometry?.type;

  // Paths to surfaces
  if (isLS(f) && ["path", "footway", "service"].includes((props.highway || "").toLowerCase())) {
    const r = pathHalfWidth(props);
    const buf = safeBuffer(f, r);
    if (buf && isPoly(buf)) {
      const p = deepClone(props);
      p.type = "surface";
      p.surface_class = surfaceClass(props);
      p.generated_from = "line_buffer";
      p.generated_width_m = r * 2;
      surfaces.push(turf.feature(buf.geometry, p));
    }
    continue;
  }

  // Hedges to polygons
  if (isLS(f) && (props.barrier || "").toLowerCase() === "hedge") {
    const buf = safeBuffer(f, HEDGE_R);
    if (buf && isPoly(buf)) {
      const p = deepClone(props);
      p.type = "hedge";
      p.generated_from = "line_buffer";
      p.generated_width_m = HEDGE_W;
      hedgesBuf.push(turf.feature(buf.geometry, p));
    }
    continue;
  }

  // Keep everything else as-is
  if (gtype) passthrough.push(f);
}

// ---------- clip hedges per-surface (no union) ----------
let hedgesFinal = [];
if (CLIP_HEDGES && surfaces.length && hedgesBuf.length) {
  for (const h of hedgesBuf) {
    let cut = h;
    for (const s of surfaces) {
      const d = safeDiff(cut, s);
      if (d) cut = d;
      // if fully removed, stop early
      if (!d && turf.booleanWithin(cut, s)) {
        cut = null;
        break;
      }
    }
    if (cut) {
      // drop micro slivers
      const a = turf.area(cut);
      if (a >= MIN_HEDGE_AREA_M2) hedgesFinal.push(cut);
    }
  }
} else {
  hedgesFinal = hedgesBuf;
}

// ---------- assemble ----------
const out = {
  type: "FeatureCollection",
  features: [...passthrough, ...surfaces, ...hedgesFinal]
};

// ---------- optional overlap report ----------
let overlapArea = 0;
try {
  for (const h of hedgesFinal) {
    for (const s of surfaces) {
      const inter = turf.intersect(h, s);
      if (inter) overlapArea += turf.area(inter);
    }
  }
} catch {
  /* best-effort only */
}

// ---------- write ----------
const json = PRETTY ? JSON.stringify(out, null, 2) : JSON.stringify(out);
fs.writeFileSync(outPath, json, "utf8");

console.log(`✔ Wrote ${outPath}
  Surfaces (from paths): ${surfaces.length}
  Hedges (buffered):     ${hedgesBuf.length}${CLIP_HEDGES ? ` → kept ${hedgesFinal.length} after clipping` : ""}
  Residual hedge-on-path overlap area: ${overlapArea.toFixed(3)} m²
  Pretty JSON:           ${PRETTY ? "yes" : "no"}`);
