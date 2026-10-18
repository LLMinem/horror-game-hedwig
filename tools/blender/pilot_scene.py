"""Bounded reference-backed entrance/hall authoring; run with Blender Python.
Creates a NEW source only. Revisions are never overwritten. See pilot_inputs.py.
"""
import argparse
from collections import defaultdict
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--source-dir',required=True)
parser.add_argument('--render',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
source=(ROOT/args.source_dir).resolve()
blend=source/'entrance-hall.blend'
if blend.exists(): raise FileExistsError(f'Preserve existing revision: {blend}')
data=json.loads((source/'inputs.json').read_text())
walk=json.loads((source/'walk.json').read_text())
p=data['parameters']; floor=data['floor']; u=data['u']; v=data['v']; origin=data['origin']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
export=bpy.data.collections.new('EXPORT_EntranceHall');scene.collection.children.link(export)
movement=bpy.data.collections.new('MOVEMENT_Review');scene.collection.children.link(movement);movement.hide_render=True
references=bpy.data.collections.new('PRIVATE_References');scene.collection.children.link(references);references.hide_render=True
review=bpy.data.collections.new('REVIEW_Lighting');scene.collection.children.link(review)
materials={}; batches=defaultdict(lambda:{'vertices':[],'faces':[],'uv':[]})


def material(name,color,rough=.8,metal=0):
    m=bpy.data.materials.new(name)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    if name in data['textures']:
        spec=data['textures'][name];bs.inputs['Roughness'].default_value=spec['roughness']
        for suffix,socket in [('base','Base Color'),('normal','Normal')]:
            im=bpy.data.images.load(str(source/'textures'/f'{name}_{suffix}.png'));im.pack()
            if suffix=='normal':im.colorspace_settings.name='Non-Color'
            tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT'
            if suffix=='normal':
                normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45
                m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],bs.inputs[socket])
            else:m.node_tree.links.new(tex.outputs['Color'],bs.inputs[socket])
    materials[name]=m;return m


for name in data['textures']:material(name,(.5,.5,.5))
material('glass',(.075,.11,.12),.18,.25)
material('metal',(.4,.43,.42),.34,.75)
material('dark-metal',(.065,.075,.085),.65,.5)
material('rubber',(.045,.05,.052),.98)


def world(co):
    x,y,z=co
    return (origin[0]+x*u[0]+y*v[0],origin[1]+x*u[1]+y*v[1],floor+z)


def add(verts,faces,mat,space='world',uvs=None):
    batch=batches[mat];offset=len(batch['vertices'])
    batch['vertices'].extend([world(co) for co in verts] if space=='hall' else verts)
    metres=data['textures'].get(mat,{}).get('tile_metres',1)
    for fi,face in enumerate(faces):
        batch['faces'].append([index+offset for index in (reversed(face) if space=='hall' else face)])
        if uvs is not None:uv=uvs[fi]
        else:
            a,b,c=[Vector(verts[index]) for index in face[:3]]
            normal=(b-a).cross(c-a);axis=max(range(3),key=lambda i:abs(normal[i]))
            axes=(0,1) if axis==2 else ((0,2) if axis==1 else (1,2))
            uv=[(verts[index][axes[0]]/metres,verts[index][axes[1]]/metres) for index in face]
            if mat=='paving':
                uv=[(((verts[index][0]-origin[0])*u[0]+(verts[index][1]-origin[1])*u[1])/metres,
                     ((verts[index][0]-origin[0])*v[0]+(verts[index][1]-origin[1])*v[1])/metres) for index in face]
        batch['uv'].append(list(reversed(uv)) if space=='hall' else uv)


def box(name,centre,size,mat,space='hall'):
    x,y,z=centre;a,b,c=[s/2 for s in size]
    verts=[(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),
           (x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)]
    add(verts,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],mat,space)


def beam(a,b,width,depth,mat,space='hall'):
    a,b=Vector(a),Vector(b);direction=(b-a).normalized()
    side=direction.cross(Vector((0,1,0)))
    if side.length<.01:side=direction.cross(Vector((0,0,1)))
    side.normalize();other=direction.cross(side).normalized()
    verts=[]
    for end in [a,b]:
        for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append(tuple(end+side*s*width/2+other*t*depth/2))
    add(verts,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],mat,space)


def ground(x,y):
    g=walk['ground'];cx=(x-g['x0'])/g['step'];rz=(-y-g['z0'])/g['step']
    col=min(g['columns']-2,max(0,math.floor(cx)));row=min(g['rows']-2,max(0,math.floor(rz)))
    tx=cx-col;tz=rz-row;i=row*g['columns']+col;hs=g['heights']
    a,b,c,d=hs[i],hs[i+1],hs[i+g['columns']],hs[i+g['columns']+1]
    return a+(c-a)*tz+(d-c)*tx if tz>=tx else a+(b-a)*tx+(d-b)*tz


# Shared triangulation with the runtime height sampler.
g=walk['ground'];verts=[(g['x0']+col,-g['z0']-row,g['heights'][row*g['columns']+col]) for row in range(g['rows']) for col in range(g['columns'])]
faces=[]
for row in range(g['rows']-1):
    for col in range(g['columns']-1):
        i=row*g['columns']+col;n=g['columns'];faces.extend([(i,i+n,i+n+1),(i,i+n+1,i+1)])
add(verts,faces,'grass')
add(data['paving']['vertices'],data['paving']['faces'],'paving')
# Small flush-to-low concrete edge, no invented high steps.
for ring in data['paving']['edges']:
    for a,b in zip(ring,ring[1:]):
        length=math.dist(a,b);steps=max(1,math.ceil(length))
        for i in range(steps):
            f=i/steps;t=(i+1)/steps
            aa=[a[j]+(b[j]-a[j])*f for j in range(2)];bb=[a[j]+(b[j]-a[j])*t for j in range(2)]
            beam((*aa,ground(*aa)+.025),(*bb,ground(*bb)+.025),.075,.045,'concrete','world')

# Flat annex, front entrance recess retained from the canonical footprint.
H=p['annex_height'];W=p['hall_width'];D=p['hall_depth'];start=p['gable_start'];peak=(start+W)/2;R=p['ridge_height'];e=p['eave_height']
box('annex-body',(7.6,D/2,H/2-.08),(15.2,D,H+.16),'plaster')
# Visible narrow high glazing on front and west facade (opaque reflective exterior, no interior).
for a,b in [(0.35,4.8),(5.0,9.7),(14.4,15.1)]:
    box('front-clerestory',((a+b)/2,-.022,2.57),(b-a,.055,.46),'glass')
    for z in [2.32,2.82]:box('front-frame',((a+b)/2,-.064,z),(b-a+.08,.055,.055),'metal')
for j in range(7):
    y=.35+j*2.14
    box('side-clerestory',(-.025,y+1,2.57),(.055,1.95,.46),'glass')
    for z in [2.32,2.82]:box('side-frame',(-.065,y+1,z),(.055,2,.055),'metal')
    box('side-mullion',(-.065,y,2.57),(.07,.07,.54),'metal')
box('annex-roof',(7.6,D/2,H+.08),(15.6,D+.5,.2),'slate')
for x in [-.18,15.35]:box('fascia-side',(x,D/2,H-.17),(.15,D+.5,.45),'dark-metal')
for y in [-.18,D+.18]:box('fascia-front',(7.6,y,H-.17),(15.65,.15,.45),'dark-metal')
for y in [-.2,D+.2]:box('coping',(7.6,y,H+.09),(15.7,.18,.12),'metal')
# Main A-frame roof and gable. No unsupported side ornament or interior.
box('gable-plinth',((start+W)/2,D/2,e/2),(W-start,D,e),'plaster')
for front in [0,D]:
    # Solid pale outer triangle; aggregate inset and sloping bands are exterior layers.
    add([(start,front,e),(W,front,e),(peak,front,R)],[(0,1,2)] if front==0 else [(2,1,0)],'plaster','hall')
    inward=.7
    add([(start+inward,front-.035 if front==0 else front+.035,e+.25),
         (W-inward,front-.035 if front==0 else front+.035,e+.25),
         (peak,front-.035 if front==0 else front+.035,R-1.75)],[(0,1,2)] if front==0 else [(2,1,0)],'aggregate','hall')
# Roof faces with slope-length UVs so slate courses retain physical scale.
for left,right in [(start-.22,peak),(peak,W+.22)]:
    zl=e if left<peak else R+.12;zr=R+.12 if right==peak else e
    slope=math.hypot(right-left,zr-zl);tile=data['textures']['slate']['tile_metres']
    vertices=[(left,-.3,zl),(right,-.3,zr),(right,D+.3,zr),(left,D+.3,zl)]
    add(vertices,[(0,1,2,3)],'slate','hall',
        [[(0,0),(0,slope/tile),((D+.6)/tile,slope/tile),((D+.6)/tile,0)]])
for front in [-.32,D+.32]:
    for end in [start-.22,W+.22]:beam((end,front,e),(peak,front,R+.12),.22,.19,'dark-metal')
beam((peak,-.35,R+.12),(peak,D+.35,R+.12),.18,.16,'dark-metal')
# One framed diamond joins the two sloping window bands, as in the gable photo.
top=Vector((peak,-.09,R-1.05));bottom=Vector((peak,-.09,R-2.55))
left=Vector((peak-.55,-.09,R-1.8));right=Vector((peak+.55,-.09,R-1.8))
diamond=[top,left,bottom,right]
add([tuple(q) for q in diamond],[(0,1,2,3)],'glass','hall')
for a,b in zip(diamond,diamond[1:]+diamond[:1]):beam(tuple(a),tuple(b),.06,.06,'metal')
beam(tuple(top),tuple(bottom),.045,.06,'metal')
for side,outer_top in [(-1,left),(1,right)]:
    outer_low=Vector((start+.65 if side<0 else W-.65,-.09,e+.65))
    inner_low=Vector((start+1.35 if side<0 else W-1.35,-.09,e+.65))
    quad=[outer_top,outer_low,inner_low,bottom]
    add([tuple(q) for q in quad],[(0,1,2,3)],'glass','hall')
    beam(tuple(outer_top),tuple(outer_low),.055,.06,'metal')
    beam(tuple(bottom),tuple(inner_low),.055,.06,'metal')
    for i in range(24):
        t=i/23
        outer=outer_top.lerp(outer_low,t);inner=bottom.lerp(inner_low,t)
        beam(tuple(outer),tuple(inner),.035,.05,'metal')
        if i<23:
            # A small repeatable irregular lead pattern, not a regular ladder.
            next_t=(i+(.35 if i%3==0 else .68))/23
            a=outer_top.lerp(outer_low,next_t).lerp(bottom.lerp(inner_low,next_t),.45)
            b=outer_top.lerp(outer_low,(i+1)/23).lerp(bottom.lerp(inner_low,(i+1)/23),.6 if i%2 else .35)
            beam(tuple(a),tuple(b),.022,.04,'metal')
beam((peak,-.065,.5),(peak,-.065,R-2.55),.012,.015,'dark-metal')
# Door portal: the exterior has no readable notices or invented inscription.
doorA,doorB=10.57,14.25;centre=(doorA+doorB)/2
box('door-shadow',(centre,-1.37,1.4),(doorB-doorA,.1,2.8),'glass')
for x in [doorA-.12,doorB+.12]:box('portal-return',(x,-.68,1.4),(.24,1.38,2.8),'plaster')
for x in [doorA,doorA+.85,doorB-.85,doorB]:box('door-jamb',(x,-1.46,1.4),(.07,.09,2.8),'metal')
for z in [.08,2.25,2.78]:box('door-transom',(centre,-1.46,z),(doorB-doorA,.09,.065),'metal')
box('door-centre',(centre,-1.46,1.16),(.065,.09,2.2),'metal')
for x in [centre-.12,centre+.12]:box('door-pull',(x,-1.55,1.06),(.07,.1,.3),'dark-metal')
box('door-canopy',(centre,-.74,3.05),(4.1,1.9,.48),'dark-metal')
box('door-coping',(centre,-.74,3.31),(4.2,1.95,.12),'metal')
box('door-mat',(centre,-2.2,.045),(2.35,1.0,.025),'rubber')
for x in [0,W]:box('foundation',(x,D/2,.13),(.2,D,.26),'concrete')
# Roof slab rear/side closure under gable is deliberately plain where evidence is missing.
box('rear-base',((start+W)/2,D-.08,.28),(W-start,.2,.55),'plaster')

# Bell tower: four splayed timber legs, tapered louvres and simple cross. No mechanism.
tx,ty=data['tower'];tz=ground(tx,ty);TH=p['tower_height'];tw=p['tower_width']/2
for sx in [-1,1]:
    for sy in [-1,1]:beam((tx+sx*tw,ty+sy*tw,tz),(tx+sx*.2,ty+sy*.2,tz+TH),.32,.32,'wood','world')
for i in range(31):
    z=2.65+i*.205;half=tw*(1-z/TH)+.10
    for sign in [-1,1]:
        box('louvre',(tx,ty+sign*half,tz+z),(half*2,.16,.24),'wood','world')
        box('louvre',(tx+sign*half,ty,tz+z),(.16,half*2,.24),'wood','world')
box('tower-cap',(tx,ty,tz+TH),(.8,.8,.28),'dark-metal','world')
beam((tx,ty,tz+TH),(tx,ty,tz+TH+1.15),.09,.09,'metal','world')
beam((tx-.35,ty,tz+TH+.78),(tx+.35,ty,tz+TH+.78),.08,.08,'metal','world')
# The existing collision bed has a visible soil surface and low stone edging.
box('tower-bed',(tx,ty,tz+.045),(4,4,.09),'soil','world')
for side in [-1,1]:
    beam((tx-2,ty+side*2,tz+.09),(tx+2,ty+side*2,tz+.09),.18,.14,'stone','world')
    beam((tx+side*2,ty-2,tz+.09),(tx+side*2,ty+2,tz+.09),.18,.14,'stone','world')

# Entrance opening and flanking masonry; gates folded open along the approach.
gx,gy=data['gate'];ax,ay=data['gateAcross']
def gp(d):return (gx+ax*d,gy+ay*d)
for sign in [-1,1]:
    a,b=gp(sign*3),gp(sign*6.5)
    za,zb=ground(*a),ground(*b)
    beam((*a,za+.7),(*b,zb+.7),1.4,.38,'stone','world')
    beam((*a,za+1.43),(*b,zb+1.43),.12,.48,'concrete','world')
    # Adjacent simple vertical timber fencing, consistent with entrance context.
    for i in range(17):
        pt=gp(sign*(6.5+i*.32));z=ground(*pt)
        box('fence',(*pt,z+.66),(.085,.085,1.32),'wood','world')
    a,b=gp(sign*6.5),gp(sign*12)
    for z in [.38,.95]:beam((*a,ground(*a)+z),(*b,ground(*b)+z),.08,.08,'wood','world')
    post=gp(sign*3);z=ground(*post)
    box('gate-post',(*post,z+.78),(.14,.14,1.56),'metal','world')
    end=(post[0]+v[0]*2.7,post[1]+v[1]*2.7)
    for h in [.16,1.35]:beam((*post,z+h),(*end,ground(*end)+h),.06,.06,'metal','world')
    for i in range(14):
        q=(post[0]+(end[0]-post[0])*i/13,post[1]+(end[1]-post[1])*i/13)
        beam((*q,ground(*q)+.16),(*q,ground(*q)+1.35),.025,.025,'metal','world')


def mesh_object(name,verts,faces,collection,mat=None,uv=None):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
    if mat:mesh.materials.append(mat)
    layer=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        coords=uv[poly.index] if uv else [(verts[mesh.loops[i].vertex_index][0],verts[mesh.loops[i].vertex_index][1]) for i in poly.loop_indices]
        for index,co in zip(poly.loop_indices,coords):layer.data[index].uv=co
    return obj


for name,batch in batches.items():mesh_object(name,batch['vertices'],batch['faces'],export,materials[name],batch['uv'])
for obstacle in walk['obstacles']:
    coords=obstacle['polygon'];mesh_object(obstacle['id'],[(x,-z,floor) for x,z in coords],[list(range(len(coords)))],movement)
movement.hide_viewport=True
# Reference plane is private, excluded from export and render, packed for source recovery.
im=bpy.data.images.load(str(ROOT/'.local/blueprint/derived/orthophoto-rgb.png'));im.pack()
m=bpy.data.materials.new('PRIVATE_Aerial');node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im
m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
ref=mesh_object('PRIVATE_TrueDOP_reference',[(-260,-260,-4),(260,-260,-4),(260,260,-4),(-260,260,-4)],[(0,1,2,3)],references,m,[[(0,0),(1,0),(1,1),(0,1)]])
ref.hide_viewport=True
# Named reference-guided review cameras; pitch/lens are not calibrated photo poses.
for view in walk['views']:
    cam=bpy.data.cameras.new(view['id']);obj=bpy.data.objects.new(view['id'],cam);review.objects.link(obj)
    x,y=view['x'],-view['z'];z=view.get('y',ground(x,y)+1.7)
    obj.location=(x,y,z);yaw=view['yaw'];pitch=view['pitch']
    direction=Vector((math.sin(yaw)*math.cos(pitch),math.cos(yaw)*math.cos(pitch),math.sin(pitch)))
    obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    cam.sensor_fit='VERTICAL';cam.sensor_height=24;cam.lens=24/(2*math.tan(math.radians(55)/2))
    if view.get('inspection'):
        cam.type='ORTHO';cam.sensor_fit='HORIZONTAL'
        cam.ortho_scale=max(walk['ground']['columns'],walk['ground']['rows'])*1.9 if view['id']=='site-overhead' else 200
scene.camera=bpy.data.objects['approach']
worldmat=bpy.data.worlds.new('Review World');scene.world=worldmat
bg=worldmat.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.58,.65,.72,1);bg.inputs[1].default_value=.65
sun=bpy.data.lights.new('Review sun','SUN');sun.energy=2.2;sun.angle=.12
sunobj=bpy.data.objects.new('Review sun',sun);review.objects.link(sunobj);sunobj.rotation_euler=(.4,-.5,-.5)
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene['revision']=data['revision'];scene['input_sha256']=__import__('hashlib').sha256((source/'inputs.json').read_bytes()).hexdigest()
scene['scope']='Entrance / hall exterior pilot; source and browser appearance await owner review'
scene['estimates']=json.dumps(p)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if args.render:
    renders=ROOT/'.local/pilot'/data['revision'];renders.mkdir(parents=True,exist_ok=True)
    for name in ['approach','gable','entrance','tower','gate','overhead']:
        scene.camera=bpy.data.objects[name];scene.render.filepath=str(renders/f'blender-neutral-{name}.png');bpy.ops.render.render(write_still=True)
    scene.camera=bpy.data.objects['approach'];sun.energy=.3;sun.color=(.55,.65,1);bg.inputs[0].default_value=(.12,.18,.3,1);bg.inputs[1].default_value=.24
    scene.render.filepath=str(renders/'blender-dusk-approach.png');bpy.ops.render.render(write_still=True)
print(json.dumps({'blend':str(blend),'collection':export.name,'objects':len(export.objects),'floor':floor}))
