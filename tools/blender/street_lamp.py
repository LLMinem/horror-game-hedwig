"""Create an immutable lamp revision with an opaque roof liner and separate glass.

Run with Blender's bundled Python; export EXPORT_StreetLamp via run.sh afterward.
"""
import argparse
import math
from pathlib import Path
import shutil
import sys

import bmesh
import bpy


def material(name, images, glass=False):
    mat = bpy.data.materials.new(name)
    tree = mat.node_tree
    shader = tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (0.25, 0.22, 0.18, 1) if glass else (0.025, 0.025, 0.025, 1)
    shader.inputs['Metallic'].default_value = 0 if glass else 0.7
    shader.inputs['Roughness'].default_value = 0.12 if glass else 0.65
    if glass:
        shader.inputs['Transmission Weight'].default_value = 0.7
        shader.inputs['Emission Color'].default_value = (1, 0.95, 0.78, 1)
        shader.inputs['Emission Strength'].default_value = 0.1
    else:
        for filename, socket in [('lamp_baseColor.png', 'Base Color'), ('lamp_Metalness.png', 'Metallic'), ('lamp_Roughness.png', 'Roughness')]:
            tex = tree.nodes.new('ShaderNodeTexImage')
            tex.image = images[filename]
            tree.links.new(tex.outputs['Color'], shader.inputs[socket])
        tex = tree.nodes.new('ShaderNodeTexImage')
        tex.image = images['lamp_Normal.png']
        normal = tree.nodes.new('ShaderNodeNormalMap')
        tree.links.new(tex.outputs['Color'], normal.inputs['Color'])
        tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    return mat


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--revision-dir', required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source = args.source.resolve(strict=True)
    revision = args.revision_dir.absolute()
    if any(p.is_symlink() for p in [revision, *revision.parents]):
        raise ValueError('Revision path must not contain symlinks')
    revision.mkdir(parents=True, exist_ok=False)
    textures = revision / 'textures'
    textures.mkdir()
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    images = {}
    for image in bpy.data.images:
        if image.source != 'FILE' or not image.filepath:
            continue
        dependency = Path(bpy.path.abspath(image.filepath)).resolve(strict=True)
        shutil.copy2(dependency, textures / dependency.name)
        image.filepath = str(textures / dependency.name)
        images[dependency.name] = image
    for name, image in images.items():
        image.colorspace_settings.name = 'sRGB' if name == 'lamp_baseColor.png' else 'Non-Color'

    collection = bpy.data.collections.new('EXPORT_StreetLamp')
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects['SM_StreetLamp_Simple']
    metal = material('MAT_StreetLamp_Metal', images)
    glass = material('MAT_StreetLamp_Glass', images, glass=True)
    liner = bpy.data.materials.new('MAT_StreetLamp_RoofLiner')
    liner_shader = liner.node_tree.nodes.get('Principled BSDF')
    liner_shader.inputs['Base Color'].default_value = (0.025, 0.025, 0.025, 1)
    liner_shader.inputs['Metallic'].default_value = 0.7
    liner_shader.inputs['Roughness'].default_value = 0.65

    lantern = bpy.data.objects['SM_StreetLamp_Lantern']
    mask = images['lamp_emission.png']
    width, height = mask.size
    pixels = list(mask.pixels)
    uv = lantern.data.uv_layers.active.data
    pane_faces = set()
    for face in lantern.data.polygons:
        u = sum(uv[i].uv.x for i in face.loop_indices) / len(face.loop_indices)
        v = sum(uv[i].uv.y for i in face.loop_indices) / len(face.loop_indices)
        if pixels[4 * ((int(v * height) % height) * width + int(u * width) % width)] > 0.8:
            pane_faces.add(face.index)
    if len(pane_faces) != 12:
        raise ValueError(f'Expected the inspected twelve glass faces, got {len(pane_faces)}')
    panes = lantern.copy()
    panes.data = lantern.data.copy()
    panes.name = 'SM_StreetLamp_Glass'
    collection.objects.link(panes)
    for obj, keep_glass, mat in [(panes, True, glass), (lantern, False, metal)]:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if (f.index in pane_faces) != keep_glass], context='FACES')
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        for face in obj.data.polygons:
            face.material_index = 0

    # Measured roof lip is z=4.1246, radius=.1938. The liner overlaps it,
    # closes the entire aperture and stays inside the .22 m exterior eaves.
    vertices = [(0.195 * math.cos(math.pi / 2 + i * math.pi / 3),
                 0.195 * math.sin(math.pi / 2 + i * math.pi / 3), z)
                for z in (4.118, 4.132) for i in range(6)]
    faces = [tuple(range(6)), tuple(reversed(range(6, 12)))]
    faces += [(i, i + 6, (i + 1) % 6 + 6, (i + 1) % 6) for i in range(6)]
    mesh = bpy.data.meshes.new('StreetLamp_SealedRoofLiner')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        axes = sorted(range(3), key=lambda axis: abs(face.normal[axis]))[:2]
        for index in face.loop_indices:
            co = mesh.vertices[mesh.loops[index].vertex_index].co
            uv_layer.data[index].uv = (co[axes[0]], co[axes[1]])
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    blocker = bpy.data.objects.new('SM_StreetLamp_RoofLiner', mesh)
    blocker.parent = root
    mesh.materials.append(liner)
    collection.objects.link(blocker)

    base = bpy.data.objects['SM_StreetLamp_Base']
    base.data.materials.clear()
    base.data.materials.append(metal)
    bottom = bpy.data.objects['SM_StreetLamp_Lantern_BottomPane']
    bottom.data.materials.clear()
    bottom.data.materials.append(liner)
    for obj in [root, base, lantern, bottom]:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        collection.objects.link(obj)
    # Keep alternates and the superseded cap available for source history only.
    bpy.data.objects['SM_StreetLamp_Lantern_TopPane'].hide_render = True
    bpy.data.objects['SM_StreetLamp_Lantern_TopPane'].hide_set(True)
    for name, image in images.items():
        image.filepath = '//textures/' + name
    bpy.ops.wm.save_as_mainfile(filepath=str(revision / 'street-lamp.blend'), relative_remap=False)
    shutil.copy2(__file__, revision / 'street_lamp.py')
    print('LAMP_REVISION', revision, 'EXPORT', sorted(o.name for o in collection.objects))


if __name__ == '__main__':
    main()
