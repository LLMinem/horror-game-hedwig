#!/usr/bin/env python3
"""Private canonical-route audit; run with .local/blueprint-venv/bin/python.

Exit 2: invalid inputs (audit.json records the error when output is safe).
Exit 1: valid but incomplete evidence with --require-complete; otherwise exit 0.
Completeness is technical coverage, never visual acceptance or survey accuracy.
"""
import argparse
import hashlib
from html import escape
import json
import math
from pathlib import Path
import sys

from shapely import make_valid
from shapely.errors import ShapelyError
from shapely.geometry import GeometryCollection, LineString, Polygon, box, mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
EXPORT_TOLERANCE = 0.01  # Metres: deterministic export error, NOT positional accuracy.
SELECTION_TOLERANCE = 0.00001  # Authored lines retain canonical coordinates.
LENGTH_EPSILON = 0.0001
AREA_EPSILON = 0.000001
WORLD_FRAME = 'threejs-x-east-z-south'
EMPTY = GeometryCollection()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def coordinates(values, dimensions, label):
    require(isinstance(values, list) and len(values) > 0, f'{label}: empty coordinates')
    require(all(isinstance(p, list) and len(p) == dimensions and all(finite(v) for v in p)
                for p in values), f'{label}: expected finite {dimensions}D coordinates')
    return values


def load(path, hashes):
    raw = path.read_bytes()
    hashes[str(path)] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f'Nonfinite JSON: {value}')))


def geometry(data, label):
    result = shape(data)
    require(not result.is_empty and result.is_valid, f'{label}: empty or invalid geometry')
    require(not result.has_z and all(math.isfinite(v) for v in result.bounds), f'{label}: expected finite local XY geometry')
    # Check every coordinate, not only bounds (GEOS can ignore NaN in bounds).
    def check(values):
        if isinstance(values, (list, tuple)) and values and isinstance(values[0], (int, float)):
            require(len(values) == 2 and all(finite(v) for v in values), f'{label}: invalid XY coordinate')
        else:
            require(isinstance(values, (list, tuple)) and bool(values), f'{label}: empty coordinates')
            for part in values:
                check(part)
    require('coordinates' in data, f'{label}: unsupported geometry collection')
    check(data['coordinates'])
    return result


def validate_frame(frame):
    require(isinstance(frame, dict) and frame.get('epsg') == 25832,
            'Unsupported coordinate frame: require EPSG:25832 local east/north metres')
    origin = frame.get('origin')
    require(isinstance(origin, list) and len(origin) == 3 and all(finite(v) for v in origin),
            'Frame requires finite [E0,N0,H0] origin')
    require(frame.get('blender') == '(E-E0, N-N0, H-H0); one unit = one metre',
            'Unsupported or undeclared local coordinate frame')
    require(frame.get('gltf_threejs') == '(E-E0, H-H0, -(N-N0)); standard Blender glTF Y-up conversion once',
            'Unsupported or undeclared runtime coordinate frame')
    return {'epsg': frame['epsg'], 'origin': origin}


def components(value, kind):
    if value.geom_type == kind:
        return [value]
    return [part for child in getattr(value, 'geoms', []) for part in components(child, kind)]


def line_geometry(value):
    return unary_union(components(value, 'LineString'))


def gaps(line, covered, tolerance=0):
    mask = covered.buffer(tolerance) if tolerance and not covered.is_empty else covered
    return line_geometry(line.difference(mask))


def coverage(line, covered):
    raw = gaps(line, covered)
    technical = gaps(line, covered, EXPORT_TOLERANCE)
    return {'covered_length_m': max(0, line.length - raw.length),
            'gap_length_m': raw.length, 'technical_gap_length_m': technical.length,
            'gaps': mapping(raw), 'technical_gaps': mapping(technical)}


def mesh_geometry(record, runtime=False):
    label = record.get('name', record.get('id', 'paving'))
    verts = coordinates(record.get('vertices'), 3, label)
    triangles = record.get('triangles' if runtime else 'faces')
    require(isinstance(triangles, list) and triangles, f'{label}: empty triangle mesh')
    polygons = []
    used = set()
    degenerate = 0
    for tri in triangles:
        require(isinstance(tri, list) and len(tri) == 3 and
                all(type(i) is int and 0 <= i < len(verts) for i in tri), f'{label}: invalid triangle indices')
        points = [(verts[i][0], -verts[i][2]) if runtime else (verts[i][0], verts[i][1]) for i in tri]
        polygon = Polygon(points)
        if polygon.area == 0:
            degenerate += 1
            continue
        require(polygon.is_valid, f'{label}: invalid projected paving triangle')
        used.update(tri)
        polygons.append(polygon)
    require(polygons, f'{label}: all projected paving triangles are degenerate')
    heights = [verts[i][1 if runtime else 2] for i in used]
    return (unary_union(polygons), [min(heights), max(heights)],
            {'triangle_count': len(triangles), 'degenerate_triangles': degenerate})


def ground_extent(walk):
    require(walk.get('version') == 2, 'Unsupported walk version; require version 2')
    ground = walk['ground']
    require(all(finite(ground.get(k)) for k in ('x0', 'z0', 'step')) and ground['step'] > 0,
            'Invalid terrain origin/step')
    require(all(type(ground.get(k)) is int and ground[k] >= 2 for k in ('rows', 'columns')),
            'Invalid terrain grid dimensions')
    require(isinstance(ground.get('heights'), list) and len(ground['heights']) == ground['rows'] * ground['columns']
            and all(finite(h) for h in ground['heights']), 'Invalid or partial terrain heights')
    return box(ground['x0'], -ground['z0'] - (ground['rows'] - 1) * ground['step'],
               ground['x0'] + (ground['columns'] - 1) * ground['step'], -ground['z0'])


def walk_polygon(record, errors):
    points = coordinates(record['polygon'], 2, record.get('id', 'walk surface'))
    holes = record.get('holes', [])
    rings = [[(x, -z) for x, z in coordinates(ring, 2, 'walk hole')] for ring in holes]
    value = Polygon([(x, -z) for x, z in points], rings)
    if value.area == 0 and make_valid(value).area == 0:
        errors.append({'code': 'invalid_walk_surface', 'surface': record.get('id'),
                       'reason': 'Zero-area derived ring; excluded from coverage, not accepted as valid paving.'})
        return EMPTY
    require(value.is_valid and value.area > 0, 'Invalid walk polygon')
    return value


def source_chain(directory, hashes):
    chain, seen = [], set()
    while directory is not None:
        directory = directory.resolve()
        require(directory not in seen, 'Cyclic source baseline chain')
        seen.add(directory)
        data = load(directory / 'inputs.json', hashes)
        require(isinstance(data, dict), 'inputs.json must be an object')
        chain.append((directory, data))
        baseline = data.get('baseline')
        directory = ROOT / baseline if baseline else None
    return list(reversed(chain))


def svg_geometry(value, color):
    paths = []
    for polygon in components(value, 'Polygon'):
        rings = [polygon.exterior, *polygon.interiors]
        d = ' '.join('M ' + ' L '.join(f'{x:.6f},{y:.6f}' for x, y in ring.coords) + ' Z' for ring in rings)
        paths.append(f'<path d="{d}" fill="{color}" fill-opacity="0.16" fill-rule="evenodd" stroke="{color}"/>')
    for line in components(value, 'LineString'):
        points = ' '.join(f'{x:.6f},{y:.6f}' for x, y in line.coords)
        paths.append(f'<polyline points="{points}" fill="none" stroke="{color}"/>')
    for point in components(value, 'Point'):
        paths.append(f'<circle cx="{point.x:.6f}" cy="{point.y:.6f}" r="0.5" fill="{color}"/>')
    return ''.join(paths)


def overlay(report):
    west, south, east, north = report['bounds']
    chunks = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{west} {-north} {east-west} {north-south}">',
              '<title>Full canonical source; supported terrain extent; north up; not survey acceptance</title>',
              '<g transform="scale(1,-1)" stroke-width="0.18">']
    colors = {'path': '#ae5116', 'boundary': '#24572b', 'building': '#6d327d', 'hedge': '#38773b'}
    for feature in report['features']:
        chunks.append(f'<g><title>{escape(feature["id"])}</title>')
        chunks.append(svg_geometry(shape(feature['geometry']), colors.get(feature['category'], '#566779')))
        chunks.append('</g>')
    chunks.append('</g></svg>\n')
    return ''.join(chunks)


def audit(args):
    hashes = {}
    site = load(args.site.resolve(), hashes)
    frame = validate_frame(site['frame'])
    features = site['features']
    require(isinstance(features, list) and features, 'Canonical site has no features')
    canonical, all_shapes, ids = {}, {}, set()
    for feature in features:
        identifier = feature['id']
        require(isinstance(identifier, str) and identifier and identifier not in ids, 'Missing/duplicate canonical feature ID')
        ids.add(identifier)
        value = geometry(feature['geometry'], identifier)
        all_shapes[identifier] = value
        if feature['category'] == 'path':
            require(value.geom_type in ('LineString', 'MultiLineString') and value.length > 0,
                    f'{identifier}: canonical path must be a nonzero centreline')
            source_id = feature['properties']['source_id']
            require(source_id not in canonical, f'Duplicate route source ID: {source_id}')
            canonical[source_id] = (feature, value)
    require(canonical, 'Canonical site contains no routes')
    cemetery_parts = [all_shapes[f['id']] for f in features if f['category'] == 'boundary'
                      and f['properties'].get('tags', {}).get('landuse') == 'cemetery']
    require(cemetery_parts and all(p.geom_type in ('Polygon', 'MultiPolygon') for p in cemetery_parts),
            'Missing canonical cemetery polygon')
    cemetery = unary_union(cemetery_parts)
    chain = source_chain(args.source_dir, hashes)
    walk = load(args.source_dir.resolve() / 'walk.json', hashes)
    extent = ground_extent(walk)
    require(isinstance(walk.get('surfaces'), list) and walk['surfaces'], 'Walk has no surface geometry')
    errors, warnings, selections, expected, exceptions, targets = [], [], [], {}, [], {}
    walk_shape = unary_union([walk_polygon(record, errors) for record in walk['surfaces']])
    for directory, data in chain:
        provenance = str(directory / 'inputs.json')
        if 'frame' in data:
            require(validate_frame(data['frame']) == frame, f'{provenance}: source frame differs from canonical site')
        if 'source_sha256' in data and data['source_sha256'] != hashes[str(args.site.resolve())]:
            errors.append({'code': 'canonical_source_hash_mismatch', 'source': provenance})
        for name, digest in data.get('baseline_sha256', {}).items():
            path = ROOT / data['baseline'] / name
            require(path.is_file(), f'Missing baseline dependency: {path}')
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            hashes[str(path)] = actual
            if actual != digest:
                errors.append({'code': 'baseline_hash_mismatch', 'source': str(path)})
        planned = data.get('plan', {}).get('routes', [])
        require(isinstance(planned, list), 'Plan routes must be an array')
        authored = {section['id']: section for section in data.get('pathSections', [])}
        require(len(authored) == len(data.get('pathSections', [])), 'Duplicate authored section ID')
        for route in planned:
            require(route.get('source_id') in canonical and route.get('id') in authored,
                    'Planned route missing its authored section or canonical source')
            canonical_line = canonical[route['source_id']][1]
            require(canonical_line.geom_type == 'LineString', 'Planned slices require a LineString')
            points = list(canonical_line.coords)
            if 'slice' in route:
                cut = route['slice']
                require(isinstance(cut, list) and 1 <= len(cut) <= 3 and
                        all(v is None or type(v) is int for v in cut), 'Invalid planned route slice')
                points = points[slice(*cut)]
            require(len(points) >= 2, 'Empty planned route slice')
            section = authored[route['id']]
            require(section.get('source_id') == route['source_id'] and section.get('width') == route.get('width'),
                    'Plan and authored route source/width disagree')
            planned_line = LineString(points)
            actual_line = geometry({'type': 'LineString', 'coordinates': section['line']}, route['id'])
            require(planned_line.hausdorff_distance(actual_line) <= SELECTION_TOLERANCE
                    and abs(planned_line.length - actual_line.length) <= LENGTH_EPSILON,
                    f'Plan slice and authored line disagree: {route["id"]}')
        for section in data.get('pathSections', []):
            line = geometry({'type': 'LineString', 'coordinates': section['line']}, 'path section')
            require(line.length > 0, 'Empty authored path section')
            width = section.get('width')
            require(width is None or (finite(width) and width > 0), 'Invalid authored route width')
            source_id = section.get('source_id')
            require(source_id is None or source_id in canonical, f'Unknown selected route: {source_id}')
            selections.append({'line': line, 'source_id': source_id, 'id': section['id'], 'width': width,
                               'provenance': provenance, 'uncertainty': section.get('uncertainty', data.get('uncertainty',
                               'Authored estimate; not a surveyed measurement'))})
        records = [('paving', data['paving'])] if 'paving' in data else []
        records += [('PROVISIONAL_' + row['id'], row) for row in data.get('surfaces', [])]
        for name, record in records:
            require(name not in expected, f'Duplicate source mesh name: {name}')
            expected[name] = mesh_geometry(record)
            if expected[name][2]['degenerate_triangles']:
                warnings.append(f'{name}: {expected[name][2]["degenerate_triangles"]} zero-area source triangles contribute no coverage.')
        for solid in data.get('solids', []):
            targets[('solid', solid['id'])] = geometry({'type': 'Polygon', 'coordinates': [solid['polygon']]}, solid['id'])
        for pad in data.get('plan', {}).get('pads', []):
            if 'polygon' in pad:
                polygon = geometry({'type': 'Polygon', 'coordinates': [pad['polygon']]}, pad['id'])
            else:
                matching = [all_shapes[f['id']] for f in features if f['properties']['source_id'] == pad['source_id']]
                require(len(matching) == 1 and matching[0].geom_type in ('Polygon', 'MultiPolygon'), 'Invalid source pad')
                polygon = matching[0]
            targets[('pad', pad['id'])] = polygon
        exceptions.extend(data.get('plan', {}).get('route_exceptions', []))
    require(selections, 'Source chain contains no authored path sections')
    require(expected, 'Source chain contains no paving meshes')
    source_shape = unary_union([value[0] for value in expected.values()])
    runtime_shape, runtime_rows = EMPTY, []
    if args.runtime_mesh:
        exported = load(args.runtime_mesh.resolve(), hashes)
        require(exported.get('schemaVersion') == 1 and exported.get('worldFrame') == WORLD_FRAME,
                'Unsupported runtime mesh schema or worldFrame')
        require(isinstance(exported.get('meshes'), list) and exported['meshes'], 'Runtime export contains zero meshes')
        actual = {}
        for record in exported['meshes']:
            name = record['name']
            require(isinstance(name, str) and name and name not in actual, 'Duplicate/invalid runtime mesh name')
            actual[name] = mesh_geometry(record, runtime=True)
            if actual[name][2]['degenerate_triangles']:
                warnings.append(f'{name}: {actual[name][2]["degenerate_triangles"]} zero-area decoded triangles contribute no coverage; footprint parity still required.')
        runtime_shape = unary_union([value[0] for value in actual.values()])
        for name in sorted(expected.keys() | actual.keys()):
            empty_stats = {'triangle_count': 0, 'degenerate_triangles': 0}
            authored, heights, source_stats = expected.get(name, (EMPTY, None, empty_stats))
            rendered, actual_heights, runtime_stats = actual.get(name, (EMPTY, None, empty_stats))
            missing = authored.difference(rendered.buffer(EXPORT_TOLERANCE))
            extra = rendered.difference(authored.buffer(EXPORT_TOLERANCE))
            height_error = max(abs(a-b) for a, b in zip(heights, actual_heights)) if heights and actual_heights else None
            good = (name in expected and name in actual and missing.area <= AREA_EPSILON
                    and extra.area <= AREA_EPSILON and height_error <= EXPORT_TOLERANCE)
            row = {'name': name, 'status': 'complete' if good else 'export_mismatch',
                   'source_triangle_count': source_stats['triangle_count'],
                   'source_degenerate_triangles': source_stats['degenerate_triangles'],
                   'runtime_triangle_count': runtime_stats['triangle_count'],
                   'runtime_degenerate_triangles': runtime_stats['degenerate_triangles'],
                   'source_area_m2': authored.area, 'runtime_area_m2': rendered.area,
                   'raw_missing_area_m2': authored.difference(rendered).area,
                   'raw_extra_area_m2': rendered.difference(authored).area,
                   'technical_missing_area_m2': missing.area, 'technical_extra_area_m2': extra.area,
                   'height_bounds_error_m': height_error}
            runtime_rows.append(row)
            if not good:
                errors.append({'code': 'runtime_export_mismatch', 'mesh': name})
        runtime_provenance = {'hashes': exported.get('hashes', {}), 'provenance': exported.get('provenance', {})}
    else:
        warnings.append('No decoded runtime mesh supplied: walk-contract-only evidence cannot establish completeness.')
        runtime_provenance = None
    resolved_exceptions = []
    for exception in exceptions:
        require(exception.get('source_id') in canonical and exception.get('kind') in ('solid', 'pad')
                and isinstance(exception.get('reason'), str) and exception['reason'].strip(), 'Invalid explicit route exception')
        key = (exception['kind'], exception.get('target_id'))
        require(key in targets, f'Unknown route exception target: {key}')
        resolved_exceptions.append((exception, targets[key]))
    routes = []
    for source_id, (feature, line) in canonical.items():
        requested = line_geometry(line.intersection(extent))
        selected_parts, width_records = [], []
        for section in selections:
            if section['source_id'] not in (None, source_id):
                continue
            overlap = line_geometry(requested.intersection(section['line'].buffer(SELECTION_TOLERANCE)))
            # A crossing is not a selected segment. Authored slices retain exact source geometry.
            if overlap.length <= LENGTH_EPSILON:
                continue
            selected_parts.append(overlap)
            width_records.append({key: value for key, value in section.items() if key not in ('line', 'source_id')}
                                 | {'selected_length_m': overlap.length, 'status': 'estimated' if section['width'] else 'unknown'})
        selected = unary_union(selected_parts)
        exemption, alternate, exception_rows = EMPTY, EMPTY, []
        for exception, polygon in resolved_exceptions:
            if exception['source_id'] != source_id:
                continue
            cut = line_geometry(requested.intersection(polygon))
            require(cut.length > LENGTH_EPSILON, f'Route exception does not intersect route: {source_id}')
            if exception['kind'] == 'solid':
                exemption = exemption.union(cut)
            else:
                alternate = alternate.union(cut)
            exception_rows.append({**exception, 'length_m': cut.length, 'geometry': mapping(cut)})
        required = line_geometry(requested.difference(exemption))
        selection_gap = gaps(requested, selected.union(exemption).union(alternate), SELECTION_TOLERANCE)
        walk_coverage = coverage(required, walk_shape)
        source_coverage = coverage(required, source_shape)
        runtime_coverage = coverage(required, runtime_shape) if args.runtime_mesh else None
        issues = []
        if requested.length > LENGTH_EPSILON:
            if selection_gap.length > LENGTH_EPSILON:
                issues.append('missing_selection' if selected.length <= LENGTH_EPSILON else 'partial_selection')
            if source_coverage['technical_gap_length_m'] > LENGTH_EPSILON:
                issues.append('source_paving_gap')
            if walk_coverage['technical_gap_length_m'] > LENGTH_EPSILON:
                issues.append('walk_surface_gap')
            if runtime_coverage and runtime_coverage['technical_gap_length_m'] > LENGTH_EPSILON:
                issues.append('runtime_paving_gap')
        status = ('outside_supported_terrain' if requested.length <= LENGTH_EPSILON else
                  'incomplete' if issues else 'complete' if args.runtime_mesh else 'walk_only')
        routes.append({'id': feature['id'], 'source_id': source_id, 'status': status, 'issues': issues,
                       'canonical_length_m': line.length, 'requested_length_m': requested.length,
                       'outside_supported_length_m': max(0, line.length-requested.length),
                       'inside_cemetery_length_m': requested.intersection(cemetery).length,
                       'selected_length_m': requested.length - selection_gap.length,
                       'selection_gap_length_m': selection_gap.length,
                       'selection_gaps': mapping(selection_gap), 'requested_geometry': mapping(requested),
                       'required_paving_length_m': required.length, 'exceptions': exception_rows,
                       'width': {'status': 'estimated' if any(r['width'] is not None for r in width_records) else 'unknown', 'sections': width_records,
                                 'source_tag': feature['properties'].get('tags', {}).get('width')},
                       'uncertainty': 'Canonical position and widths are unverified, not survey control.',
                       'walk': walk_coverage, 'source_paving': source_coverage, 'runtime': runtime_coverage,
                       'runtime_covered_length_m': runtime_coverage['covered_length_m'] if runtime_coverage else None})
        if issues:
            errors.append({'code': 'route_incomplete', 'source_id': source_id, 'issues': issues})
    supported = [r for r in routes if r['requested_length_m'] > LENGTH_EPSILON]
    require(supported, 'No canonical routes intersect supported terrain; check frame/scale')
    total = sum(r['requested_length_m'] for r in routes)
    report = {'schemaVersion': 1, 'frame': frame, 'bounds': list(extent.bounds), 'features': features,
              'mode': 'decoded-runtime-mesh' if args.runtime_mesh else 'walk-contract-only',
              'complete': bool(args.runtime_mesh) and not errors,
              'summary': {'canonical_routes': len(routes), 'supported_routes': len(supported),
                          'complete_routes': sum(r['status'] == 'complete' for r in routes),
                          'incomplete_routes': sum(r['status'] == 'incomplete' for r in routes),
                          'requested_length_m': total, 'selected_length_m': sum(r['selected_length_m'] for r in routes),
                          'inside_cemetery_length_m': sum(r['inside_cemetery_length_m'] for r in routes),
                          'outside_cemetery_supported_length_m': total-sum(r['inside_cemetery_length_m'] for r in routes),
                          'supported_terrain_area_m2': extent.area, 'cemetery_area_m2': cemetery.area,
                          'supported_cemetery_area_m2': cemetery.intersection(extent).area,
                          'cemetery_outside_terrain_area_m2': cemetery.difference(extent).area},
              'cemetery': {'bounds': list(cemetery.bounds), 'geometry': mapping(cemetery)},
              'routes': routes, 'meshes': runtime_rows, 'hashes': hashes, 'runtime_provenance': runtime_provenance,
              'source_meshes': [{'name': name, **value[2]} for name, value in sorted(expected.items())],
              'errors': errors, 'warnings': warnings,
              'limits': {'technical_export_tolerance_m': EXPORT_TOLERANCE,
                         'authored_selection_tolerance_m': SELECTION_TOLERANCE,
                         'length_epsilon_m': LENGTH_EPSILON, 'area_epsilon_m2': AREA_EPSILON,
                         'degenerate_triangles': 'Exact zero projected area contributes no coverage; counts reported, all-degenerate meshes rejected, nonzero footprint gaps still fail.',
                         'source_positional_accuracy_m': None,
                         'source_positional_accuracy': 'Unknown; not conflated with deterministic export tolerance.',
                         'scope': 'Planar route coverage and per-mesh footprint/height-bound export parity; not visibility, topology, local height-field parity, collision or visual acceptance.',
                         'widths': 'Authored estimates with provenance; unknown widths are never measured values.',
                         'clipping': 'Terrain extent, not cemetery boundary. Full canonical features retained in overlay.'}}
    return report


def safe_output(path):
    path = path.absolute()
    require(not any(p.is_symlink() for p in (path, *path.parents)), 'Output must not traverse symlinks')
    require(path.is_dir(), 'Output directory must already exist (created by the private review caller)')
    resolved = path.resolve()
    require(resolved.is_relative_to(ROOT / '.local') and resolved != ROOT / '.local',
            'Private audit output must be below this repository\'s .local/')
    require(not any((path / name).exists() or (path / name).is_symlink() for name in ('audit.json', 'source-overlay.svg')),
            'Refusing to overwrite existing audit evidence')
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    command = sub.add_parser('audit', help='Audit every canonical route against supported terrain and actual paving')
    command.add_argument('--source-dir', type=Path, required=True)
    command.add_argument('--output', type=Path, required=True)
    command.add_argument('--site', type=Path, default=ROOT / '.local/blueprint/site-local.json',
                         help='Canonical projected site-local JSON (default: private blueprint)')
    command.add_argument('--runtime-mesh', type=Path)
    command.add_argument('--require-complete', action='store_true')
    args = parser.parse_args()
    output = None
    try:
        output = safe_output(args.output)
        report = audit(args)
        (output / 'source-overlay.svg').write_text(overlay(report))
        (output / 'audit.json').write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
        print(json.dumps({'schemaVersion': 1, 'complete': report['complete'], 'mode': report['mode'],
                          'summary': report['summary'], 'audit': str(output / 'audit.json')}))
        return 1 if args.require_complete and not report['complete'] else 0
    except (ValueError, TypeError, KeyError, IndexError, AttributeError, OverflowError, OSError, ShapelyError) as error:
        report = {'schemaVersion': 1, 'complete': False, 'status': 'invalid_input',
                  'errors': [{'code': 'invalid_input', 'message': str(error)}]}
        if output is not None:
            (output / 'audit.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
