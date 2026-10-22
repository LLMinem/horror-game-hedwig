"""Open the accepted scene and save a NEW additive spatial source revision.

Run in Blender with factory startup, disabled autoexec and --python-exit-code 1.
EXPORT_Spatial contains only additive surfaces and solids. Vegetation instances,
cameras and private source evidence remain outside that collection. The paired
walk.json places the unchanged vegetation prototypes in the runtime candidate.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]


def mesh_object(name, vertices, faces, collection, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    mesh.materials.append(material)
    uv = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        axis = max(range(3), key=lambda i: abs(polygon.normal[i]))
        axes = (0, 1) if axis == 2 else ((0, 2) if axis == 1 else (1, 2))
        for index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[index].vertex_index].co
            uv.data[index].uv = (vertex[axes[0]], vertex[axes[1]])
    obj['status'] = 'PROVISIONAL coarse spatial review; not production geometry'
    return obj


def prism(solid, collection, material, suffix='', bottom=None, top=None):
    points = solid['polygon']
    n = len(points)
    bottom = solid['base'] if bottom is None else bottom
    top = solid['top'] if top is None else top
    vertices = [(x, y, z) for heights in (bottom, top) for (x, y), z in zip(points, heights)]
    # Canonical rings can have either winding; normalize without altering footprint.
    area = sum(a[0]*b[1]-b[0]*a[1] for a, b in zip(points, points[1:]+points[:1]))
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    faces.extend((i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n))
    if area < 0:
        faces = [tuple(reversed(face)) for face in faces]
    return mesh_object('PROVISIONAL_'+solid['id']+suffix, vertices, faces, collection, material)


def ground_height(ground, x, y):
    cx = (x-ground['x0'])/ground['step']
    rz = (-y-ground['z0'])/ground['step']
    if not (0 <= cx <= ground['columns']-1 and 0 <= rz <= ground['rows']-1):
        raise ValueError(f'Camera outside finite ground: {x}, {y}')
    col = min(ground['columns']-2, math.floor(cx))
    row = min(ground['rows']-2, math.floor(rz))
    tx, tz = cx-col, rz-row
    i, n, h = row*ground['columns']+col, ground['columns'], ground['heights']
    a, b, c, d = h[i], h[i+1], h[i+n], h[i+n+1]
    return a+(c-a)*tz+(d-c)*tx if tz >= tx else a+(b-a)*tx+(d-b)*tz


def add_vegetation(walk, baseline_count, path, collection):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = set(bpy.data.objects)-before
    roots = {obj.name: obj for obj in imported if obj.parent not in imported}
    for group_index, group in enumerate(walk['vegetation']):
        root = roots[group['prototype']]
        members = [root]+list(root.children_recursive)
        for index, (x, y, z, scale, yaw) in enumerate(group['positions']):
            prefix = 'BASELINE' if group_index < baseline_count else 'PROVISIONAL'
            pivot = bpy.data.objects.new(f'{prefix}_vegetation_{group["prototype"]}_{index}', None)
            collection.objects.link(pivot)
            pivot.location = (x, -z, y)
            pivot.scale = (scale,)*3
            pivot.rotation_euler.z = -yaw
            clones = {}
            for old in members:
                obj = old.copy()
                obj.name = prefix+'_'+old.name
                collection.objects.link(obj)
                clones[old] = obj
            for old, obj in clones.items():
                obj.parent = clones.get(old.parent, pivot)
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', required=True)
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--output', default='.local/issue-22/source')
    parser.add_argument('--render-only', action='store_true', help='Render the saved candidate without saving or reauthoring')
    parser.add_argument('--views', help='Comma-separated subset of candidate views')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    source = (ROOT/args.source_dir).resolve()
    blend = source/'spatial-layout.blend'
    data = json.loads((source/'inputs.json').read_text())
    walk = json.loads((source/'walk.json').read_text())
    if args.render_only:
        bpy.ops.wm.open_mainfile(filepath=str(blend), load_ui=False, use_scripts=False)
    else:
        if blend.exists():
            raise FileExistsError(f'Preserve existing source: {blend}')
        baseline = ROOT/data['baseline']/'entrance-hall.blend'
        if hashlib.sha256(baseline.read_bytes()).hexdigest() != data['baseline_sha256']['entrance-hall.blend']:
            raise ValueError('Accepted baseline changed since input preparation')
        bpy.ops.wm.open_mainfile(filepath=str(baseline), load_ui=False, use_scripts=False)
        scene = bpy.context.scene
        if 'EXPORT_Spatial' in bpy.data.collections:
            raise ValueError('Accepted source unexpectedly already contains spatial additions')
        export = bpy.data.collections.new('EXPORT_Spatial')
        scene.collection.children.link(export)
        review = bpy.data.collections.new('REVIEW_Spatial')
        scene.collection.children.link(review)
        vegetation = bpy.data.collections.new('REVIEW_Spatial_Vegetation')
        review.children.link(vegetation)
        materials = {}
        for name, color in data['plan']['materials'].items():
            material = bpy.data.materials.new('PROVISIONAL_'+name)
            material.use_nodes = True
            bsdf = material.node_tree.nodes.get('Principled BSDF')
            bsdf.inputs['Base Color'].default_value = (*color, 1)
            bsdf.inputs['Roughness'].default_value = .9
            materials[name] = material
        # The accepted paving map is authored, not private reference imagery.
        materials['paving'] = bpy.data.materials['paving']
        for surface in data['surfaces']:
            mesh_object('PROVISIONAL_'+surface['id'], surface['vertices'], surface['faces'],
                        export, materials[surface['material']])
        for solid in data['solids']:
            prism(solid, export, materials[solid['material']])
            if solid['kind'] == 'utility':
                prism(solid, export, materials['roof'], '-flat-roof',
                      bottom=solid['top'], top=[z+.16 for z in solid['top']])
            elif solid['kind'] == 'wall' and solid['id'].startswith('spatial-urn-'):
                prism(solid, export, materials['roof'], '-coping',
                      bottom=solid['top'], top=[z+.08 for z in solid['top']])
        # Broad foliage envelopes do not invent trunks or ground-level barriers.
        for mass in data['plan'].get('canopy_masses', []):
            x, y = mass['centre']
            z = ground_height(walk['ground'], x, y) + mass['bottom'] + mass['height']/2
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=(x, y, z))
            obj = bpy.context.object
            obj.name = 'PROVISIONAL_canopy_'+mass['id']
            obj.scale = (*mass['radii'], mass['height']/2)
            obj.rotation_euler.z = mass['rotation']
            for collection in list(obj.users_collection):
                collection.objects.unlink(obj)
            export.objects.link(obj)
            obj.data.materials.append(materials[mass['material']])
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
            obj['status'] = 'Coarse foliage envelope only; no inferred trunk inventory'
        add_vegetation(walk, data['baseline_counts']['vegetation'], ROOT/data['plan']['vegetation_asset'], vegetation)
        ground = walk['ground']
        for view in data['plan']['views']:
            camera = bpy.data.cameras.new(view['id'])
            obj = bpy.data.objects.new(view['id'], camera)
            review.objects.link(obj)
            x, y = view['x'], -view['z']
            obj.location = (x, y, view.get('y', ground_height(ground, x, y)+1.7))
            yaw, pitch = view['yaw'], view['pitch']
            direction = Vector((math.sin(yaw)*math.cos(pitch), math.cos(yaw)*math.cos(pitch), math.sin(pitch)))
            obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
            camera.sensor_fit = 'VERTICAL'
            camera.sensor_height = 24
            camera.lens = 24/(2*math.tan(math.radians(55)/2))
            camera.clip_end = 1200
            if view.get('inspection'):
                camera.type = 'ORTHO'
                camera.sensor_fit = 'HORIZONTAL'
                camera.ortho_scale = max((ground['columns']-1)*ground['step'],
                                         (ground['rows']-1)*ground['step']*16/9)*1.06
        scene['spatial_revision'] = data['revision']
        scene['spatial_status'] = 'Unaccepted additive coarse spatial review; baseline preserved; no detailed graves'
        scene['spatial_inputs_sha256'] = hashlib.sha256((source/'inputs.json').read_bytes()).hexdigest()
        scene.camera = bpy.data.objects['spatial-overhead']
        # Pack dependencies into the new file only; never save the accepted source.
        for image in bpy.data.images:
            if image.source == 'FILE' and image.has_data and not image.packed_file:
                image.pack()
        scene.render.resolution_x = 1280
        scene.render.resolution_y = 720
        scene.render.resolution_percentage = 100
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        print(json.dumps({'blend': str(blend), 'collection': export.name,
                          'objects': len(export.objects), 'vegetation_collection': vegetation.name}))
    if args.render or args.render_only:
        scene = bpy.context.scene
        output = ROOT/args.output
        output.mkdir(parents=True, exist_ok=True)
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = 8
        scene.cycles.use_denoising = True
        scene.render.threads_mode = 'FIXED'
        scene.render.threads = 12
        names = args.views.split(',') if args.views else [v['id'] for v in data['plan']['views']]+['approach']
        for name in names:
            scene.camera = bpy.data.objects[name]
            scene.render.filepath = str(output/f'blender-neutral-{name}.png')
            bpy.ops.render.render(write_still=True)
        print(json.dumps({'renders': str(output), 'views': names, 'size': [1280, 720]}))


if __name__ == '__main__':
    main()
