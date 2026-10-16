"""Bounded pilot vegetation authoring; run with factory startup and disabled autoexec.

Inspect marketplace FBX in a disposable scene before authoring a new source revision.
Private reports and render evidence stay under .local; inputs are never saved.
"""

import argparse
import json
import math
import random
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "assets/source/raw/cemetery-pack"


def bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector([min(point[i] for point in points) for i in range(3)])
    high = Vector([max(point[i] for point in points) for i in range(3)])
    return low, high


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def studio(directory, name, target, width, resolution=(1400, 900)):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 6
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new("PreviewWorld")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.45, 0.5, 0.56, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 1.4
    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = Vector(target) + Vector((0, -width * 1.6, width * 0.18))
    aim(camera, target)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = width * max(1, resolution[1] / resolution[0])
    scene.camera = camera
    light_data = bpy.data.lights.new("PreviewSun", "SUN")
    light_data.energy = 2.2
    light_data.angle = math.radians(15)
    light = bpy.data.objects.new("PreviewSun", light_data)
    scene.collection.objects.link(light)
    light.rotation_euler = (math.radians(28), math.radians(-25), math.radians(-35))
    scene.view_settings.view_transform = "AgX"
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(directory / name)
    bpy.ops.render.render(write_still=True)


def inspection_material(name, color, opacity=None):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    tree = material.node_tree
    shader = tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = 0.85
    node = tree.nodes.new("ShaderNodeTexImage")
    node.image = bpy.data.images.load(str(color), check_existing=True)
    tree.links.new(node.outputs["Color"], shader.inputs["Base Color"])
    if opacity:
        mask = tree.nodes.new("ShaderNodeTexImage")
        mask.image = bpy.data.images.load(str(opacity), check_existing=True)
        mask.image.colorspace_settings.name = "Non-Color"
        tree.links.new(mask.outputs["Color"], shader.inputs["Alpha"])
        material.surface_render_method = "DITHERED"
    return material


def inspect(directory):
    directory.mkdir(parents=True, exist_ok=False)
    report = {"purpose": "Disposable source suitability inspection; no site placements", "sources": []}
    for filename in ("5111390_trees.fbx", "5111390_plants.fbx"):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(RAW / filename), use_image_search=False)
        bpy.context.view_layer.update()
        trees = RAW / "5111390_Trees"
        plants = RAW / "5111390_Plants"
        leaves = inspection_material("LeafPreview", trees / "tree_leafs_baseColor.png", trees / "tree_leafs_Opacity.png")
        bark = inspection_material("BarkPreview", trees / "Bark_BaseColor.png")
        plant = inspection_material("PlantPreview", plants / "plants_grass_BaseColor.png", plants / "plants_grass_Opacity.png")
        objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
        source = {"file": filename, "meshes": []}
        for index, obj in enumerate(objects):
            low, high = bounds(obj)
            obj.data.calc_loop_triangles()
            source["meshes"].append({"index": index, "name": obj.name,
                                      "bounds": [list(low), list(high)],
                                      "triangles": len(obj.data.loop_triangles),
                                      "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
                                      "uv_layers": len(obj.data.uv_layers)})
        source["images"] = [{"name": image.name, "path": image.filepath, "size": list(image.size)} for image in bpy.data.images]
        report["sources"].append(source)
        (directory / "inventory.json").write_text(json.dumps(report, indent=2) + "\n")
        # Separate normalized silhouettes preserve each imported mesh's topology/UVs.
        for index, obj in enumerate(objects):
            world = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world
            obj.data.transform(obj.matrix_world)
            obj.matrix_world = Matrix.Identity(4)
            bpy.context.view_layer.update()
            low, high = bounds(obj)
            size = max(high - low)
            for vertex in obj.data.vertices:
                vertex.co = (vertex.co - Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))) * (4 / size)
            obj.location = ((index % 6) * 5, 0, -(index // 6) * 5)
            for slot in obj.material_slots:
                slot.material = leaves if slot.material.name == "leaves" else bark if slot.material.name in ("Bark", "roots2") else plant
        rows = math.ceil(len(objects) / 6)
        studio(directory, filename + ".png", (12.5, 0, 2 - (rows - 1) * 2.5), max(33, rows * 5 * 1600 / max(500, rows * 280)), (1600, max(500, rows * 280)))
    print(json.dumps(report, indent=2))


def image_copy(source, directory, name, size=512, opacity=None, non_color=False):
    original = bpy.data.images.load(str(source), check_existing=False)
    if non_color:
        original.colorspace_settings.name = "Non-Color"
    original.scale(size, size)
    pixels = np.array(original.pixels[:], dtype=np.float32).reshape(-1, 4)
    if opacity:
        mask = bpy.data.images.load(str(opacity), check_existing=False)
        mask.colorspace_settings.name = "Non-Color"
        mask.scale(size, size)
        pixels[:, 3] = np.array(mask.pixels[:], dtype=np.float32).reshape(-1, 4)[:, 0]
        bpy.data.images.remove(mask)
    # A generated RGBA datablock retains the edited buffer when assigning its new
    # filepath; changing a file-backed source path can invalidate that buffer.
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(pixels.ravel())
    bpy.data.images.remove(original)
    image.filepath_raw = str(directory / name)
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def material(name, color, normal=None, cutout=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    shader = tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = 0.87
    shader.inputs["Specular IOR Level"].default_value = 0.25
    texture = tree.nodes.new("ShaderNodeTexImage")
    texture.image = color
    tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    if cutout:
        clip = tree.nodes.new("ShaderNodeMath")
        clip.operation = "ROUND"
        tree.links.new(texture.outputs["Alpha"], clip.inputs[0])
        tree.links.new(clip.outputs[0], shader.inputs["Alpha"])
        mat.surface_render_method = "DITHERED"
        mat.use_backface_culling = False
    if normal:
        texture = tree.nodes.new("ShaderNodeTexImage")
        texture.image = normal
        node = tree.nodes.new("ShaderNodeNormalMap")
        node.inputs["Strength"].default_value = 0.55
        tree.links.new(texture.outputs["Color"], node.inputs["Color"])
        tree.links.new(node.outputs["Normal"], shader.inputs["Normal"])
    return mat


def needle_image(directory):
    """Bake an original evergreen spray; no reference pixels are sampled."""
    size = 256
    pixels = np.zeros((size, size, 4), dtype=np.float32)
    rng = random.Random(17021)

    def stroke(a, b, color, radius=1):
        a, b = np.array(a), np.array(b)
        for t in np.linspace(0, 1, max(2, int(np.linalg.norm(b - a) * 2))):
            x, y = np.round(a + t * (b - a)).astype(int)
            pixels[max(0, y - radius):min(size, y + radius + 1),
                   max(0, x - radius):min(size, x + radius + 1)] = (*color, 1)

    stroke((128, 12), (128, 244), (0.14, 0.19, 0.055))
    for row in range(12):
        y = 24 + row * 17
        span = 95 * (1 - row / 14)
        for side in (-1, 1):
            start = np.array((128, y), dtype=float)
            end = np.array((128 + side * span, y + 34), dtype=float)
            stroke(start, end, (0.10, 0.22, 0.07))
            for t in np.linspace(0.08, 1, 18):
                point = start + t * (end - start)
                green = rng.uniform(0.19, 0.34)
                for sign in (-1, 1):
                    tip = point + np.array((side * rng.uniform(7, 13), sign * rng.uniform(7, 14)))
                    stroke(point, tip, (green * 0.48, green, green * 0.44), 0)
    image = bpy.data.images.new("AuthoredNeedleSpray", width=size, height=size, alpha=True)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(directory / "needle-spray.png")
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


class Geometry:
    def __init__(self):
        self.vertices, self.faces, self.uvs, self.materials = [], [], [], []

    def face(self, points, uv, material_index):
        start = len(self.vertices)
        self.vertices.extend(points)
        self.faces.append(tuple(range(start, start + len(points))))
        self.uvs.append(uv)
        self.materials.append(material_index)

    def card(self, centre, u, v, material_index=0):
        centre, u, v = Vector(centre), Vector(u) / 2, Vector(v) / 2
        self.face([centre - u - v, centre + u - v, centre + u + v, centre - u + v],
                  [(0, 0), (1, 0), (1, 1), (0, 1)], material_index)

    def branch(self, a, b, radius, end_radius, material_index=1):
        a, b = Vector(a), Vector(b)
        direction = (b - a).normalized()
        u = direction.cross(Vector((0, 1, 0))).normalized()
        v = direction.cross(u).normalized()
        for i in range(8):
            angle, following = i * math.tau / 8, (i + 1) * math.tau / 8
            p = u * math.cos(angle) + v * math.sin(angle)
            q = u * math.cos(following) + v * math.sin(following)
            self.face([a + p * radius, a + q * radius, b + q * end_radius, b + p * end_radius],
                      [(i / 8, 0), ((i + 1) / 8, 0), ((i + 1) / 8, (b - a).length), (i / 8, (b - a).length)], material_index)

    def object(self, name, mats, collection):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        uv = mesh.uv_layers.new(name="UVMap")
        for polygon, coords, index in zip(mesh.polygons, self.uvs, self.materials):
            polygon.material_index = index
            for loop, coord in zip(polygon.loop_indices, coords):
                uv.data[loop].uv = coord
        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        for mat in mats:
            mesh.materials.append(mat)
        return obj


def fit(obj, dimensions, ground_trunk=False):
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.data.transform(world)
    obj.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.update()
    low, high = bounds(obj)
    centre = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
    scale = Vector([dimensions[i] / (high[i] - low[i]) for i in range(3)])
    for vertex in obj.data.vertices:
        point = vertex.co - centre
        vertex.co = Vector([point[i] * scale[i] for i in range(3)])
    if ground_trunk:
        base = [vertex.co for vertex in obj.data.vertices if vertex.co.z < 0.025]
        centre = sum(base, Vector()) / len(base)
        centre.z = 0
        for vertex in obj.data.vertices:
            vertex.co -= centre
    obj.data.update()
    bpy.context.view_layer.update()


def build(directory, evidence):
    directory = directory.resolve()
    directory.mkdir(parents=True, exist_ok=False)
    evidence.mkdir(parents=True, exist_ok=False)
    textures = directory / "textures"
    textures.mkdir()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1
    collection = bpy.data.collections.new("EXPORT_PilotVegetation")
    scene.collection.children.link(collection)
    trees = RAW / "5111390_Trees"
    leaves = material("PilotBroadleaf", image_copy(trees / "tree_leafs_baseColor.png", textures, "broadleaf.png", opacity=trees / "tree_leafs_Opacity.png"), cutout=True)
    bark = material("PilotBark", image_copy(trees / "Bark_BaseColor.png", textures, "bark.png"),
                    image_copy(trees / "Bark_Normal.png", textures, "bark-normal.png", non_color=True))
    needles = material("PilotNeedles", needle_image(textures), cutout=True)
    selected = []
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(RAW / "5111390_trees.fbx"), use_image_search=False)
    imported = set(bpy.data.objects) - before
    for source_name, name, dimensions in (
        ("tree_tall_02_lod1", "AvenueTree", (4.6, 4.3, 12)),
        ("tree_mid_01_lod1", "RoundedTree", (4.5, 4.3, 5.8)),
    ):
        obj = bpy.data.objects[source_name]
        fit(obj, dimensions, ground_trunk=True)
        for slot in obj.material_slots:
            slot.material = leaves if slot.material.name == "leaves" else bark
        obj.name = name
        obj.data.name = name
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        collection.objects.link(obj)
        obj["source_mesh"] = source_name
        selected.append(obj)
        imported.remove(obj)
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    # Seed affects reusable mesh structure only, never site placement.
    rng = random.Random(1138)
    shrub = Geometry()
    for _ in range(2200):
        direction = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
        if direction.length_squared > 1:
            direction.normalize()
        centre = Vector((direction.x * 1.05, direction.y * 0.85, 1.05 + direction.z * 0.85))
        normal = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized()
        u = normal.cross(Vector((0, 0, 1))).normalized() * rng.uniform(0.4, 0.6)
        v = normal.cross(u.normalized()) * rng.uniform(0.4, 0.6)
        shrub.card(centre, u, v)
    obj = shrub.object("GableShrub", [leaves], collection)
    fit(obj, (2.6, 2.2, 2.2))
    # Keep the observed dense shrub silhouette when masked leaf cards minify away.
    # The inner mass is smaller than the cards, so close views retain their edges.
    core_material = material("PilotShrubCore", bpy.data.images["broadleaf.png"])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    core = bpy.context.object
    for vertex in core.data.vertices:
        vertex.co.x *= 1.18
        vertex.co.y *= .96
        vertex.co.z = max(0, vertex.co.z * 1.15 + .7)
    core.data.materials.append(core_material)
    for polygon in core.data.polygons:
        polygon.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT")
    core.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    selected.append(obj)
    hedge = Geometry()
    for _ in range(1400):
        centre = Vector((rng.uniform(-0.91, 0.91), rng.uniform(-0.37, 0.37), rng.uniform(0.09, 0.57)))
        normal = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized()
        u = normal.cross(Vector((0, 0, 1))).normalized() * rng.uniform(0.18, 0.27)
        v = normal.cross(u.normalized()) * rng.uniform(0.18, 0.27)
        hedge.card(centre, u, v)
    obj = hedge.object("LowHedge", [leaves], collection)
    fit(obj, (2, 0.9, 0.65))
    selected.append(obj)
    conifer = Geometry()
    conifer.branch((0, 0, 0), (0.08, 0.03, 12), 0.24, 0.025)
    for level in range(26):
        z = 1.15 + level * 0.40
        radius = 2.85 * (1 - z / 12) ** 0.8
        for branch in range(8):
            angle = branch * math.tau / 8 + level * 1.73 + rng.uniform(-0.25, 0.25)
            radial = Vector((math.cos(angle), math.sin(angle), 0))
            tangent = Vector((-math.sin(angle), math.cos(angle), 0))
            length = radius * rng.uniform(0.72, 1.13)
            start = Vector((0, 0, z + rng.uniform(-0.2, 0.2)))
            end = radial * length + Vector((0, 0, z - length * rng.uniform(0.13, 0.35)))
            conifer.branch(start, end, 0.045 * (1 - z / 13), 0.008)
            for step in range(10):
                t = (step + 0.5) / 10
                centre = start.lerp(end, t)
                width = (0.22 + 0.7 * (1 - t)) * (0.35 + radius / 3)
                for side in (-1, 1):
                    point = centre + tangent * side * width * 0.27
                    point.z += rng.uniform(-0.17, 0.17)
                    along = (radial * 0.6 + tangent * side * 0.4 + Vector((0, 0, rng.uniform(-1.1, -0.3)))).normalized()
                    conifer.card(point, tangent * width, along * rng.uniform(0.55, 0.95))
    obj = conifer.object("Conifer", [needles, bark], collection)
    fit(obj, (5.6, 5.4, 12), ground_trunk=True)
    selected.append(obj)
    bpy.context.view_layer.update()
    report = {
        "source_revision": str(directory / (directory.name + ".blend")),
        "collection": collection.name,
        "blender": bpy.app.version_string,
        "prototype_bounds_blender_metres": {},
        "source_inspection": ".local/pilot-vegetation/inspection-r03/inventory.json",
        "photos_inspected": [1, 13, 15, 17, 21, 26],
        "selection": {
            "AvenueTree": "Narrowed tree_tall_02_lod1; photo 1 supports tall dense avenue silhouettes. Shape/height estimates, not species identification.",
            "RoundedTree": "Rescaled tree_mid_01_lod1 for rounded crowns/visible trunks in photo 17; not an exact clipped maple reconstruction.",
            "GableShrub": "Authored dense rounded mass with a smaller opaque inner crown to retain the photo 1/13 silhouette under browser minification. Pack broadleaf texture is not an exact glossy rhododendron match.",
            "LowHedge": "Authored dense 2m module using pack foliage; clipped low hedge supported by photos 1,17,26. No pack mesh fitted a clipped boundary.",
            "Conifer": "Authored branch whorls and original needle-spray image; layered evergreen silhouettes in photos 17,21,26. Species and dimensions uncertain.",
        },
        "rejected": "Bare roots, sparse seedlings, flowers, grasses and sparse ligustrum_01. No birch/conifer mesh in inspected FBXs; no grave/ornate props selected.",
        "rights": "Purchased cemetery pack: owner-confirmed commercial permission in repository guidance. Original conifer geometry/needle image and hedge/shrub geometry. No private photo pixels used.",
        "textures": [
            {"file": "broadleaf.png", "source": "5111390_Trees/tree_leafs_baseColor.png + tree_leafs_Opacity.png", "size": 512, "space": "sRGB RGB, linear alpha"},
            {"file": "bark.png", "source": "5111390_Trees/Bark_BaseColor.png", "size": 512, "space": "sRGB"},
            {"file": "bark-normal.png", "source": "5111390_Trees/Bark_Normal.png", "size": 512, "space": "Non-Color", "convention": "OpenGL; NormalDX excluded"},
            {"file": "needle-spray.png", "source": "Original procedural image from pilot_vegetation.py", "size": 256, "space": "sRGB RGB, linear alpha"},
        ],
        "treatment": "Selected source-map copies downscaled; opacity packed into color alpha, MASK cutoff .5 on leaf cards. GableShrub inner crown is opaque using the same colour image. Constant .87 roughness; only bark uses a normal map. No giant FBX map dump.",
        "limits": "Prototype review only. Dimensions estimated; placements supplied by parent. No birch substitute claimed. Source/browser human acceptance outstanding.",
    }
    for obj in selected:
        # The imported avenue mesh contains n-gons; triangulate the evaluated copy
        # so glTF can export tangents for its bark normal map.
        obj.modifiers.new("RuntimeTriangles", "TRIANGULATE")
        low, high = bounds(obj)
        obj.data.calc_loop_triangles()
        report["prototype_bounds_blender_metres"][obj.name] = {"min": list(low), "max": list(high), "dimensions": list(high - low), "triangles": len(obj.data.loop_triangles)}
    (evidence / "provenance.json").write_text(json.dumps(report, indent=2) + "\n")
    scene["revision"] = directory.name + "; private provenance records dimensional estimates"
    bpy.ops.wm.save_as_mainfile(filepath=str(directory / (directory.name + ".blend")))
    # Render-only layout: all prototypes in saved source stay at the base origin.
    for obj, x in zip(selected, (-9, -3.5, 1.5, 5, 10)):
        obj.location.x = x
    studio(evidence, "vegetation-neutral.png", (0, 0, 5.7), 29, (1600, 1000))
    scene.camera.location = (3.3, -10, 3)
    aim(scene.camera, (3.3, 0, 1))
    scene.camera.data.ortho_scale = 6
    scene.render.filepath = str(evidence / "vegetation-shrub-detail.png")
    bpy.ops.render.render(write_still=True)
    scene.camera.location = (0, -29 * 1.6, 5.7 + 29 * 0.18)
    aim(scene.camera, (0, 0, 5.7))
    scene.camera.data.ortho_scale = 29
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.15, 0.20, 0.32, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    bpy.data.lights["PreviewSun"].energy = 0.8
    bpy.data.lights["PreviewSun"].color = (1.0, 0.73, 0.49)
    scene.render.filepath = str(evidence / "vegetation-dusk.png")
    bpy.ops.render.render(write_still=True)
    print(json.dumps(report, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("inspect", "build"))
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--evidence", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if args.command == "inspect":
        inspect(args.output)
    else:
        if args.evidence is None:
            parser.error("build requires --evidence")
        build(args.output, args.evidence)


if __name__ == "__main__":
    main()
