"""Prepare an additive spatial revision from a private, evidence-backed plan.

Use the blueprint venv. The plan owns observations, bounded estimates and source
IDs; this tool never infers buildings from closed lines or cameras from objects.
The accepted walk contract is copied, not regenerated. Scene/export is separate.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import shutil

from shapely import constrained_delaunay_triangles
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union

from pilot_inputs import rings, runtime_ring

ROOT = Path(__file__).resolve().parents[2]


def load(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sample_ground(ground, x, y):
    """Same NW–SE diagonal as accepted source and runtime; no re-leveling."""
    cx = (x - ground['x0']) / ground['step']
    rz = (-y - ground['z0']) / ground['step']
    if not (0 <= cx <= ground['columns'] - 1 and 0 <= rz <= ground['rows'] - 1):
        raise ValueError(f'Outside supported ground: {x}, {y}')
    col = min(ground['columns'] - 2, math.floor(cx))
    row = min(ground['rows'] - 2, math.floor(rz))
    tx, tz = cx - col, rz - row
    i, n, hs = row * ground['columns'] + col, ground['columns'], ground['heights']
    a, b, c, d = hs[i], hs[i + 1], hs[i + n], hs[i + n + 1]
    return a + (c - a) * tz + (d - c) * tx if tz >= tx else a + (b - a) * tx + (d - b) * tz


def surface_mesh(shape, ground):
    """Clip paving to every intersected ground triangle before triangulation."""
    vertices, faces = [], []
    if shape.is_empty:
        return {'vertices': vertices, 'faces': faces}
    west, south, east, north = shape.bounds
    step, x0, y0 = ground['step'], ground['x0'], -ground['z0']
    rows, columns = ground['rows'], ground['columns']
    for row in range(max(0, math.floor((y0 - north) / step)), min(rows - 1, math.ceil((y0 - south) / step))):
        for col in range(max(0, math.floor((west - x0) / step)), min(columns - 1, math.ceil((east - x0) / step))):
            x, y = x0 + col * step, y0 - row * step
            for points in (((x, y), (x, y-step), (x+step, y-step)),
                           ((x, y), (x+step, y-step), (x+step, y))):
                cut = Polygon(points).intersection(shape)
                parts = [cut] if cut.geom_type == 'Polygon' else getattr(cut, 'geoms', [])
                for part in parts:
                    if part.geom_type != 'Polygon' or part.area < 1e-8:
                        continue
                    for tri in constrained_delaunay_triangles(part).geoms:
                        coords = list(tri.exterior.coords)[:3]
                        a, b, c = coords
                        if (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]) < 0:
                            coords.reverse()
                        offset = len(vertices)
                        vertices.extend([[x, y, sample_ground(ground, x, y) + .025] for x, y in coords])
                        faces.append([offset, offset+1, offset+2])
    return {'vertices': vertices, 'faces': faces}


def prepare(args):
    plan_path = (ROOT / args.plan).resolve()
    plan = load(plan_path)
    baseline = (ROOT / plan['baseline']).resolve()
    destination = (ROOT / args.source_dir).resolve()
    source_root = (ROOT / 'assets/source/working/spatial-layout').resolve()
    if destination.parent != source_root or destination.exists():
        raise ValueError('Choose a new immediate revision under assets/source/working/spatial-layout')
    site_path = ROOT / '.local/blueprint/site-local.json'
    site = load(site_path)
    features = {f['properties']['source_id']: f for f in site['features']}
    baseline_walk = load(baseline / 'walk.json')
    walk = copy.deepcopy(baseline_walk)
    ground = walk['ground']
    bounds = box(ground['x0'], -ground['z0']-(ground['rows']-1)*ground['step'],
                 ground['x0']+(ground['columns']-1)*ground['step'], -ground['z0'])
    existing = unary_union([Polygon([(x, -z) for x, z in s['polygon']]) for s in walk['surfaces']])
    old_solids = unary_union([Polygon([(x, -z) for x, z in s['polygon']]) for s in walk['obstacles']])
    routes, route_shapes, solids, pads = [], [], [], []

    def add_solid(identifier, polygon, height, material, kind, provenance):
        polygon = Polygon(polygon)
        if not polygon.is_valid or not bounds.covers(polygon):
            raise ValueError(f'Invalid or unsupported solid {identifier}')
        coords = list(polygon.exterior.coords)[:-1]
        corner_ground = [sample_ground(ground, x, y) for x, y in coords]
        west, south, east, north = polygon.bounds
        step, columns = ground['step'], ground['columns']
        col0, col1 = math.floor((west - ground['x0']) / step), math.ceil((east - ground['x0']) / step)
        row0, row1 = math.floor((-north - ground['z0']) / step), math.ceil((-south - ground['z0']) / step)
        # Piecewise-linear terrain cannot fall below these covering grid nodes.
        # Bury the complete bottom, rather than bridging hollows between corners.
        bottom = min(ground['heights'][row * columns + col]
                     for row in range(max(0, row0), min(ground['rows'] - 1, row1) + 1)
                     for col in range(max(0, col0), min(columns - 1, col1) + 1)) - .05
        base = [bottom] * len(coords)
        top = [max(corner_ground) + height] * len(coords) if kind == 'utility' else [z + height for z in corner_ground]
        solids.append({'id': identifier, 'polygon': coords, 'base': base, 'top': top,
                       'material': material, 'kind': kind, 'provenance': provenance})
        walk['obstacles'].append({'id': identifier, 'polygon': runtime_ring(coords)})

    for route in plan['routes']:
        feature = features[route['source_id']]
        if feature['geometry']['type'] != 'LineString':
            raise ValueError(f'Route is not a source centreline: {route}')
        coords = feature['geometry']['coordinates']
        if 'slice' in route:
            coords = coords[slice(*route['slice'])]
        shape = LineString(coords).buffer(route['width']/2, cap_style=2, join_style=2)
        route_shapes.append(shape)
        routes.append({**route, 'line': coords})
    for building in plan['buildings']:
        feature = features[building['source_id']]
        add_solid(building['id'], feature['geometry']['coordinates'][0], building['height'],
                  building['material'], 'utility', building)
    for pad in plan['pads']:
        coords = features[pad['source_id']]['geometry']['coordinates'][0] if 'source_id' in pad else pad['polygon']
        pads.append((pad, Polygon(coords)))
    for wall in plan['walls']:
        line = wall['line']
        for index, (a, b) in enumerate(zip(line, line[1:])):
            polygon = LineString([a, b]).buffer(wall['width']/2, cap_style=2, join_style=2)
            add_solid(f"{wall['id']}-{index}", polygon.exterior.coords, wall['height'],
                      wall['material'], 'wall', wall)
    solid_shape = unary_union([Polygon(s['polygon']) for s in solids])
    # Material patches have disjoint ownership; accepted paving always wins.
    occupied = existing.union(old_solids).union(solid_shape)
    patches = []
    for pad, polygon in pads:
        shape = polygon.intersection(bounds).difference(occupied)
        occupied = occupied.union(shape)
        patches.append((pad['id'], pad['material'], shape))
    route_shape = unary_union(route_shapes).intersection(bounds).difference(occupied)
    patches.append(('spatial-main-paths', 'path', route_shape))
    surfaces = []
    for identifier, material, shape in patches:
        if shape.is_empty:
            continue
        for index, ring in enumerate(rings(shape)):
            walk['surfaces'].append({'id': f'{identifier}-{index}', 'polygon': runtime_ring(ring), 'offset': .025})
        surfaces.append({'id': identifier, 'material': material, **surface_mesh(shape, ground)})
    # Placement records are private; only neutral prototype transforms enter walk.
    groups = {}
    for plant in plan['plants']:
        prototype = plant['prototype']
        x, y, scale = plant['x'], plant['y'], plant['scale']
        position = [x, sample_ground(ground, x, y), -y, scale, plant.get('yaw', 0)]
        groups.setdefault(prototype, []).append(position)
        if prototype in ('AvenueTree', 'RoundedTree', 'Conifer'):
            polygon = Point(x, y).buffer(.25*scale, quad_segs=4)
            if polygon.intersects(existing.union(route_shape).union(solid_shape)):
                raise ValueError(f'Provisional trunk obstructs a represented path/solid: {plant["id"]}')
            walk['obstacles'].append({'id': 'spatial-tree-'+plant['id'], 'polygon': runtime_ring(polygon.exterior.coords)})
    walk['vegetation'].extend({'prototype': key, 'positions': value} for key, value in groups.items())
    for view in plan['views']:
        public_view = {k: v for k, v in view.items() if k not in ('photos', 'uncertainty')}
        walk['views'].append(public_view)
    inputs = {'revision': destination.name, 'baseline': str(baseline.relative_to(ROOT)),
              'baseline_sha256': {name: digest(baseline/name) for name in ('entrance-hall.blend', 'walk.json', 'inputs.json')},
              'plan': plan, 'pathSections': routes, 'surfaces': surfaces, 'solids': solids,
              'source_sha256': digest(site_path), 'frame': load(ROOT/'.local/blueprint/site-frame.json'),
              'ground_policy': 'Exact accepted ground; NW-SE triangles; all new surfaces offset .025; no cemetery fence',
              'baseline_counts': {k: len(baseline_walk[k]) for k in ('surfaces', 'obstacles', 'barriers', 'vegetation', 'views')}}
    destination.mkdir(parents=True)
    shutil.copytree(baseline/'textures', destination/'textures')
    shutil.copy2(plan_path, destination/'authoring-plan.json')
    for name in ('spatial_inputs.py', 'spatial_scene.py', 'pilot_inputs.py'):
        shutil.copy2(ROOT/'tools/blender'/name, destination/name)
    (destination/'inputs.json').write_text(json.dumps(inputs, separators=(',', ':')))
    (destination/'walk.json').write_text(json.dumps(walk, separators=(',', ':')))
    print(json.dumps({'source': str(destination), 'new_solids': len(solids),
                      'new_path_triangles': sum(len(s['faces']) for s in surfaces),
                      'new_plants': len(plan['plants']), 'views': [v['id'] for v in plan['views']]}))


def comparisons(args):
    """Private source/photo pairs, not pose-calibrated or acceptance reports."""
    from PIL import Image, ImageDraw, ImageOps
    source = ROOT / args.source_dir
    plan = load(source/'inputs.json')['plan']
    site = load(ROOT/'.local/blueprint/site-local.json')
    photos = {p['number']: p for p in site['photos']}
    output = ROOT / args.output
    for view in plan['views']:
        if not view.get('photos'):
            continue
        number = view['photos'][0]
        photo = Image.open((ROOT/'.local/blueprint'/photos[number]['proxy']).resolve()).convert('RGB')
        rendered = Image.open(output/f"blender-neutral-{view['id']}.png").convert('RGB')
        sheet = Image.new('RGB', (1600, 540), 'white')
        for index, image in enumerate((photo, rendered)):
            sheet.paste(ImageOps.contain(image, (800, 450)), (index*800, 45))
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 12), f"Private photo {number} | {view['id']} | PROVISIONAL coarse candidate; poses are not calibrated", fill='black')
        draw.text((12, 505), 'Accepted Chapel/ground and vegetation retained. Missing graves/details are deliberate; no source acceptance implied.', fill='black')
        sheet.save(output/f"comparison-{view['id']}.jpg", quality=92)
    ground = load(source/'walk.json')['ground']
    overview = next(v for v in plan['views'] if v['id'] == 'spatial-overhead')
    raster = next(r for r in site['rasters'] if r['id'] == 'rgb')
    aerial = Image.open(ROOT/'.local/blueprint'/raster['path']).convert('RGB')
    west, south, east, north = raster['bounds']
    width = max((ground['columns']-1)*ground['step'],
                (ground['rows']-1)*ground['step']*16/9)*1.06
    height = width*9/16
    cx, cy = overview['x'], -overview['z']
    left, top = cx-width/2, cy+height/2
    crop = ((left-west)/(east-west)*aerial.width,
            (north-top)/(north-south)*aerial.height,
            (left+width-west)/(east-west)*aerial.width,
            (north-top+height)/(north-south)*aerial.height)
    aerial = aerial.crop(crop).resize((1280, 720), Image.Resampling.LANCZOS)
    def pixel(x, y):
        return ((x-left)/width*1280, (top-y)/height*720)
    draw = ImageDraw.Draw(aerial)
    draw.rectangle([pixel(ground['x0'], -ground['z0']),
                    pixel(ground['x0']+(ground['columns']-1)*ground['step'],
                          -ground['z0']-(ground['rows']-1)*ground['step'])],
                   outline='cyan', width=2)
    rendered = Image.open(output/'blender-neutral-spatial-overhead.png').convert('RGB')
    sheet = Image.new('RGB', (2560, 780), 'white')
    sheet.paste(aerial, (0, 40))
    sheet.paste(rendered, (1280, 40))
    ImageDraw.Draw(sheet).text((12, 12), 'PRIVATE official aerial | cyan: supported ground | neutral additive candidate, same plan extent, no acceptance implied', fill='black')
    sheet.save(output/'comparison-spatial-overhead.jpg', quality=94)
    draw = ImageDraw.Draw(aerial)
    inputs = load(source/'inputs.json')
    for route in inputs['pathSections']:
        draw.line([pixel(x, y) for x, y in route['line']], fill='#f4db67', width=2)
    for solid in inputs['solids']:
        draw.line([pixel(x, y) for x, y in solid['polygon']+[solid['polygon'][0]]],
                  fill='#fb7260', width=2)
    aerial.save(output/'source-plan-aerial.png')
    print(json.dumps({'comparison_directory': str(output)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    prepare_parser = sub.add_parser('prepare')
    prepare_parser.add_argument('--plan', required=True)
    prepare_parser.add_argument('--source-dir', required=True)
    compare_parser = sub.add_parser('comparisons')
    compare_parser.add_argument('--source-dir', required=True)
    compare_parser.add_argument('--output', required=True)
    args = parser.parse_args()
    (prepare if args.command == 'prepare' else comparisons)(args)


if __name__ == '__main__':
    main()
