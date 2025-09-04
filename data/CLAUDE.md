# Cemetery GeoJSON (Neuer Friedhof, Bruchköbel) — Line-Based Map Data

This directory contains line-based GeoJSON data for runtime geometry generation in Three.js.

## Files

- `cemetery_final.geojson` — **The production map file** (69KB)
  - Contains lines with width metadata (not polygons)
  - Includes cemetery boundary, paths, hedges, buildings, and POIs
  - All coordinates verified to be within cemetery bounds

## Data Structure

### Path/Road Lines

- **Type:** `LineString`
- **Properties:**
  - `highway`: "path" | "footway" | "service"
  - `surface`: "gravel" | "asphalt" | "sett" (optional)
  - Recommended widths for runtime generation:
    - Gravel paths: 2.0m
    - Paved paths: 2.5m
    - Service roads: 3.5m

### Hedge Lines

- **Type:** `LineString`
- **Properties:**
  - `barrier`: "hedge"
  - `type`: "hedge"
  - `width`: 1.0 (meters)
  - `height`: 1.5 (meters)
  - Positioned parallel to paths with 0.3-0.5m offset

### Buildings

- **Type:** `Polygon`
- Buildings remain as polygons (funeral hall, garages, storage)
- Properties include `building` and/or `amenity` tags

### Points of Interest

- **Type:** `Point`
- Water taps: `man_made=water_tap` (7 total)
- Other POIs: toilets, bicycle parking, recycling, bell tower

### Cemetery Boundary

- **Type:** `Polygon`
- Properties: `landuse=cemetery`, `name=Neuer Friedhof`
- Defines playable area (~171×173m)

## Coordinate System

- **Format:** WGS84 (longitude, latitude)
- **Center:** 8.935045°E, 50.172849°N
- **Bounds:** Tight rectangle around cemetery only

## Runtime Geometry Generation

Instead of pre-generated polygons, generate geometry at runtime:

```javascript
// Example: Generate path geometry from line + width
function createPathGeometry(lineCoords, width) {
  const curve = new THREE.CatmullRomCurve3(
    lineCoords.map((coord) => latLonToLocal(coord)),
  );

  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, 0.02);
  shape.lineTo(-width / 2, 0.02);

  return new THREE.ExtrudeGeometry(shape, {
    extrudePath: curve,
    steps: lineCoords.length * 2,
  });
}
```

## Why Lines Instead of Polygons?

1. **No overlaps:** Geometry generated with proper constraints
2. **Consistent widths:** Features maintain uniform width
3. **Smaller file:** 69KB vs 475KB
4. **Dynamic adjustment:** Change widths without regenerating data
5. **Clean intersections:** Path junctions handled properly

## Navigation Graph

Build AI pathfinding from path centerlines:

- Sample points every 8-10m along lines
- Connect at intersections
- Block edges at closed gates

## Feature Counts

- **Paths:** 89 lines (various types)
- **Hedges:** 17 lines (manually positioned)
- **Water taps:** 7 points
- **Buildings:** 6 polygons
- **Gates:** 4 points
- **Fences:** 4 lines

## Attribution

Data derived from OpenStreetMap (ODbL). Please attribute OSM contributors in credits.
