"""Run through run.sh; no source saves, UI selection, or global configuration writes."""

import argparse
import json
import math
import os
from pathlib import Path
import struct
import sys
import tempfile

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = (ROOT / "assets/source").resolve()
DRACO = "KHR_draco_mesh_compression"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def output_path(value):
    path = Path(value).expanduser().absolute()
    resolved = path.resolve()
    require(not resolved.is_relative_to(SOURCE_ROOT), "Outputs must not be inside assets/source.")
    require(not path.is_symlink(), "Output must not be a symlink.")
    return path


def open_source(value):
    path = Path(value).expanduser().resolve(strict=True)
    require(path.is_file() and path.suffix.lower() == ".blend", "Source must be an explicit .blend file.")
    result = bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False, use_scripts=False)
    require(result == {"FINISHED"}, "Opening the source failed.")
    return path


def image_inputs(objects):
    images = set()
    seen = set()

    def visit(tree):
        if tree is None or tree in seen:
            return
        seen.add(tree)
        for node in tree.nodes:
            if getattr(node, "image", None):
                images.add(node.image)
            if node.type == "GROUP":
                visit(node.node_tree)

    for obj in objects:
        for slot in obj.material_slots:
            if slot.material:
                visit(slot.material.node_tree)
    result = []
    for image in sorted(images, key=lambda item: item.name):
        packed = bool(image.packed_file or image.packed_files)
        path = bpy.path.abspath(image.filepath, library=image.library) if image.filepath else ""
        result.append({"name": image.name, "source": image.source, "packed": packed,
                       "path": path, "missing": image.source == "FILE" and not packed
                       and not Path(path).is_file()})
    return result


def inspect_source(args):
    source = open_source(args.source)
    return {"source": str(source), "scene": bpy.context.scene.name,
            "units": bpy.context.scene.unit_settings.system,
            "unit_scale": bpy.context.scene.unit_settings.scale_length,
            "collections": [{"name": collection.name,
                             "objects_including_children": len(collection.all_objects)}
                            for collection in bpy.data.collections],
            "objects": [{"name": obj.name, "type": obj.type,
                         "parent": obj.parent.name if obj.parent else None,
                         "hide_viewport": obj.hide_viewport, "hide_render": obj.hide_render}
                        for obj in bpy.context.scene.objects],
            "material_images": image_inputs(bpy.context.scene.objects)}


def export_glb(path):
    result = bpy.ops.export_scene.gltf(
        filepath=str(path), check_existing=False, export_format="GLB",
        use_selection=True, use_active_scene=True, use_visible=False, use_renderable=False,
        export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
        export_tangents=True, export_materials="EXPORT", export_animations=False,
        export_current_frame=True,
        export_skins=False, export_morph=False, export_cameras=False, export_lights=False,
        export_extras=False, export_use_gltfpack=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        will_save_settings=False,
    )
    require(result == {"FINISHED"}, "GLB export failed.")
    return glb_facts(path)


def glb_facts(path):
    # Check the emitted file, not merely that the compression option was requested.
    with path.open("rb") as stream:
        magic, version, size = struct.unpack("<4sII", stream.read(12))
        require(magic == b"glTF" and version == 2 and size == path.stat().st_size,
                "Invalid GLB header.")
        length, kind = struct.unpack("<II", stream.read(8))
        require(kind == 0x4E4F534A, "GLB JSON chunk missing.")
        data = json.loads(stream.read(length))
    primitives = [primitive for mesh in data.get("meshes", []) for primitive in mesh["primitives"]]
    require(primitives and DRACO in data.get("extensionsRequired", []),
            "Export did not require Draco compression.")
    require(all(DRACO in primitive.get("extensions", {}) for primitive in primitives),
            "Some exported primitives are not Draco-compressed.")
    return {"bytes": size, "meshes": len(data["meshes"]), "primitives": len(primitives),
            "materials": len(data.get("materials", [])),
            "extensions_required": data.get("extensionsRequired", [])}


def export_collection(args):
    source = Path(args.source).expanduser().resolve(strict=True)
    output = output_path(args.output)
    require(output.suffix.lower() == ".glb", "Output must end in .glb.")
    require(output.resolve() != source, "Output must not replace its source.")
    require(args.overwrite or not output.exists(), "Output exists; use --overwrite only intentionally.")
    require(not output.exists() or output.is_file(), "Output must be a file.")
    source = open_source(str(source))
    source_scene = bpy.context.scene
    require(math.isclose(source_scene.unit_settings.scale_length, 1.0),
            "Only unit scale 1 is supported; prepare a separate metre-scale source revision.")
    collection = bpy.data.collections.get(args.collection)
    require(collection is not None, "Collection not found; use inspect to list exact names.")
    objects = sorted(collection.all_objects, key=lambda obj: obj.name)
    require(0 < len(objects) <= 500, "Collection must contain 1–500 objects including children.")
    require(any(obj.type == "MESH" for obj in objects), "Collection must include a mesh.")
    members = set(objects)
    for obj in objects:
        require(obj.type in {"MESH", "EMPTY"}, f"Unsupported object type: {obj.name} ({obj.type}).")
        require(obj.instance_type == "NONE", f"Realize instances in a source copy first: {obj.name}.")
        require(obj.parent is None or obj.parent in members, f"Parent outside collection: {obj.name}.")
        require(not obj.constraints, f"Bake constraints in a source copy first: {obj.name}.")
        require(not any(mod.type == "ARMATURE" for mod in obj.modifiers),
                f"Armature deformation is not supported: {obj.name}.")
        if obj.type == "MESH":
            require(obj.data.uv_layers, f"UVs required for tangent export: {obj.name}.")
    images = image_inputs(objects)
    require(not any(image["missing"] for image in images),
            "Missing material images; inspect reports paths. Repair a source copy, not originals.")
    require(all(image["source"] in {"FILE", "GENERATED"} for image in images),
            "Bake sequence, movie, tiled or viewer images to ordinary textures in a source copy.")

    # Fresh view layer ignores saved selection, exclusions and hidden alternatives.
    # Every member of the explicitly named collection is included, even if hidden.
    scene = bpy.data.scenes.new("HedwigExport")
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.frame_set(source_scene.frame_current)
    bpy.context.window.scene = scene
    for obj in objects:
        scene.collection.objects.link(obj)
        obj.hide_viewport = False
        obj.hide_render = False
        obj.hide_select = False
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = next(obj for obj in objects if obj.type == "MESH")
    bpy.context.view_layer.update()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".hedwig-export-", dir=output.parent) as staging:
        staged = Path(staging) / "asset.glb"
        facts = export_glb(staged)
        if args.overwrite:
            os.replace(staged, output)
        else:
            # Atomic no-clobber publication, including a file appearing during export.
            os.link(staged, output)
    return {"source": str(source), "collection": args.collection, "output": str(output),
            "objects": [obj.name for obj in objects], "frame": scene.frame_current,
            "units": "metres, Blender Z-up to glTF Y-up", "glb": facts,
            "material_images": images, "source_saved": False}


def smoke(args):
    if args.output:
        directory = output_path(args.output)
        require(not directory.resolve().is_relative_to((ROOT / "public").resolve()),
                "Smoke artifacts must not be published under public/.")
        directory.mkdir(parents=True, exist_ok=False)
    else:
        parent = ROOT / ".local/blender-smoke"
        output_path(str(parent))
        parent.mkdir(parents=True, exist_ok=True)
        directory = Path(tempfile.mkdtemp(prefix="run-", dir=parent))
    print(f"Smoke artifacts: {directory}", flush=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))
    cube = bpy.context.object
    cube.name = "HedwigSmokeCube"
    material = bpy.data.materials.new("HedwigSmokeMaterial")
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.18, 0.4, 0.15, 1)
    cube.data.materials.append(material)
    camera_data = bpy.data.cameras.new("SmokeCamera")
    camera = bpy.data.objects.new("SmokeCamera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (2.5, -3, 2)
    camera.rotation_euler = (Vector((0, 0, 0.5)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    light_data = bpy.data.lights.new("SmokeLight", "AREA")
    light_data.energy = 300
    light = bpy.data.objects.new("SmokeLight", light_data)
    scene.collection.objects.link(light)
    light.location = (1, -2, 4)
    light.rotation_euler = (Vector((0, 0, 0.5)) - light.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.resolution_x = scene.render.resolution_y = 32
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(directory / "smoke.png")
    require(bpy.ops.render.render(write_still=True) == {"FINISHED"}, "CPU render failed.")
    require((directory / "smoke.png").stat().st_size > 0, "Render output missing.")
    # Static exports must freeze the chosen frame, not silently evaluate frame zero.
    cube.keyframe_insert(data_path="location", frame=0)
    cube.location.x = 2
    cube.keyframe_insert(data_path="location", frame=10)
    scene.frame_set(10)
    bpy.ops.object.select_all(action="DESELECT")
    cube.select_set(True)
    bpy.context.view_layer.objects.active = cube
    facts = export_glb(directory / "smoke.glb")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    require(bpy.ops.import_scene.gltf(filepath=str(directory / "smoke.glb")) == {"FINISHED"},
            "Draco GLB reimport failed.")
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    require(len(meshes) == 1, "Expected one round-tripped mesh.")
    mesh = meshes[0]
    mesh.data.calc_loop_triangles()
    require(len(mesh.data.loop_triangles) == 12, "Expected twelve round-tripped triangles.")
    require(all(abs(value - 1) < 0.001 for value in mesh.dimensions), "Metre cube dimensions changed.")
    require(all(abs(a - b) < 0.001 for a, b in zip(mesh.location, (2, 0, 0.5))),
            "Static export did not preserve the selected frame's transform.")
    report = {"result": "PASS", "output": str(directory), "blender": bpy.app.version_string,
              "build_hash": bpy.app.build_hash.decode(), "python": sys.version,
              "render": {"engine": "CYCLES", "device": "CPU", "samples": 1,
                         "resolution": [32, 32], "threads": 4},
              "glb": facts, "roundtrip": {"meshes": 1, "triangles": 12,
                                         "dimensions_metres": list(mesh.dimensions),
                                         "selected_frame": 10,
                                         "location_metres": list(mesh.location)},
              "gpu_render_proved": False, "original_sources_opened": False}
    (directory / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    smoke_parser = commands.add_parser("smoke", help="Disposable CPU render and Draco round trip; no source inputs.")
    smoke_parser.add_argument("--output", help="New artifact directory; default .local/blender-smoke/run-<unique>.")
    inspect_parser = commands.add_parser("inspect", help="Read-only source collection, object and image inventory.")
    inspect_parser.add_argument("--source", required=True)
    export_parser = commands.add_parser("export", help="Export one explicit static collection without saving its source.")
    export_parser.add_argument("--source", required=True)
    export_parser.add_argument("--collection", required=True)
    export_parser.add_argument("--output", required=True)
    export_parser.add_argument("--overwrite", action="store_true", help="Intentionally replace a derived GLB only.")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    result = {"smoke": smoke, "inspect": inspect_source, "export": export_collection}[args.command](args)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
