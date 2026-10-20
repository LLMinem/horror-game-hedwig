"""Read-only review rendering of a saved pilot revision, with exported vegetation.
No source save. Private reference planes remain excluded from renders.
"""
import argparse
import json
from pathlib import Path
import sys
import bpy

ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True)
p.add_argument('--views',default='approach,gable,entrance,tower,gate,overhead');p.add_argument('--vegetation')
p.add_argument('--save-review',action='store_true',help='Save a new entrance-hall-review.blend beside the source; never overwrite')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
source=(ROOT/a.source).resolve();out=ROOT/a.output;out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
scene=bpy.context.scene
if a.vegetation:
    walk=json.loads((source.parent/'walk.json').read_text())
    existing=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/a.vegetation))
    imported=set(bpy.data.objects)-existing
    roots={obj.name:obj for obj in imported if obj.parent not in imported}
    for group in walk['vegetation']:
        root=roots[group['prototype']]
        members=[root]+list(root.children_recursive)
        for x,y,z,scale,yaw in group['positions']:
            pivot=bpy.data.objects.new('Review vegetation',None);scene.collection.objects.link(pivot)
            pivot.location=(x,-z,y);pivot.scale=(scale,)*3;pivot.rotation_euler.z=-yaw
            clones={}
            for old in members:
                obj=old.copy();scene.collection.objects.link(obj);clones[old]=obj
            for old,obj in clones.items():obj.parent=clones.get(old.parent,pivot)
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12
scene.render.threads_mode='FIXED';scene.render.threads=12
bpy.data.objects['overhead'].data.ortho_scale=200
if a.save_review:
    review_source=source.parent/'entrance-hall-review.blend'
    if review_source.exists():raise FileExistsError(review_source)
    bpy.ops.wm.save_as_mainfile(filepath=str(review_source))
for name in a.views.split(','):
    scene.camera=bpy.data.objects[name];scene.render.filepath=str(out/f'blender-neutral-{name}.png')
    bpy.ops.render.render(write_still=True)
scene.camera=bpy.data.objects['approach']
sun=bpy.data.lights['Review sun'];sun.energy=.3;sun.color=(.55,.65,1)
bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.12,.18,.3,1);bg.inputs[1].default_value=.24
scene.render.filepath=str(out/'blender-dusk-approach.png');bpy.ops.render.render(write_still=True)
print(json.dumps({'source':str(source),'output':str(out),'views':a.views,'vegetation':a.vegetation}))
