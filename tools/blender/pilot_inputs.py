"""Prepare only the approved entrance/hall section, using the private source-only atlas.
Run with the existing .local/blueprint-venv/bin/python. Never edits source evidence.
Dimensions without survey control are explicit editable review estimates below.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from shapely import constrained_delaunay_triangles
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
PARAMETERS = {
    "hall_width": 27.72, "hall_depth": 15.7,
    "gable_start": 15.0, "ridge_height": 9.8, "eave_height": 0.45,
    "annex_height": 3.15, "tower_height": 9.2, "tower_width": 3.8,
    "widths": {"gate": 6.0, "approach": 5.2, "bend": 6.0,
               "forecourt": 5.5, "west": 4.2, "south": 4.0, "east": 2.4},
}
ORIGIN = (-23.701952902018093, 13.59084656368941)
U = (0.84585, 0.53343)
V = (U[1], -U[0])


def xy(u, v):
    return [ORIGIN[0] + u * U[0] + v * V[0], ORIGIN[1] + u * U[1] + v * V[1]]


def rings(shape):
    parts = [shape] if shape.geom_type == "Polygon" else list(shape.geoms)
    # Split holes into simple triangles so runtime union needs no winding convention.
    result = []
    for part in parts:
        if part.interiors:
            for tri in constrained_delaunay_triangles(part).geoms:
                result.append(list(tri.exterior.coords)[:-1])
        else:
            result.append(list(part.exterior.coords)[:-1])
    return result


def runtime_ring(coords):
    return [[round(x, 5), round(-y, 5)] for x, y in coords]


def textures(folder):
    """Authored image maps, not photo textures. Deterministic metre-scale tile library."""
    folder.mkdir()
    rng = np.random.default_rng(161026)
    size = 512
    records = {}

    def save(name, rgb, height, metres, roughness):
        rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        Image.fromarray(rgb).save(folder / f"{name}_base.png")
        h = np.asarray(height, dtype=float)
        # Periodic central differences: OpenGL tangent-space (+Y) normal map.
        dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.015
        dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.015
        n = np.stack((-dx, dy, np.ones_like(dx)), axis=-1)
        n /= np.linalg.norm(n, axis=-1, keepdims=True)
        Image.fromarray(((n * .5 + .5) * 255).astype(np.uint8)).save(folder / f"{name}_normal.png")
        records[name] = {"tile_metres": metres, "roughness": roughness,
                         "source": "Agent-authored deterministic tile; no photo pixels or marketplace maps",
                         "base_color_space": "sRGB", "normal_color_space": "Non-Color / OpenGL"}

    # Rounded square paving with small square interlocks, as visible in the approach.
    paving = Image.new('RGB', (size, size), (72, 72, 65))
    relief = Image.new('L', (size, size), 60)
    d, h = ImageDraw.Draw(paving), ImageDraw.Draw(relief)
    cell = 64
    for y in range(-cell, size + cell, cell):
        for x in range(-cell, size + cell, cell):
            c = int(rng.integers(116, 143))
            points = [(x+13,y+2),(x+51,y+2),(x+62,y+13),(x+62,y+51),
                      (x+51,y+62),(x+13,y+62),(x+2,y+51),(x+2,y+13)]
            d.polygon(points, fill=(c+3,c+2,c)); h.polygon(points, fill=170)
            d.rounded_rectangle((x-9,y-9,x+9,y+9),radius=3,fill=(c-5,c-5,c-7))
            h.rounded_rectangle((x-9,y-9,x+9,y+9),radius=3,fill=165)
    noise = rng.normal(0, 5, (size,size,1))
    save('paving', np.asarray(paving)+noise, np.asarray(relief.filter(ImageFilter.GaussianBlur(.65))), 1.6, .91)

    # Slate courses, half-lapped; subtle irregular texture rather than a pack UV atlas.
    slate = Image.new('RGB',(size,size),(34,37,40)); sr=Image.new('L',(size,size),60)
    d,h=ImageDraw.Draw(slate),ImageDraw.Draw(sr)
    for row,y in enumerate(range(-64,size+64,64)):
        for x in range(-128,size+128,128):
            xx=x+(row%2)*64; c=int(rng.integers(58,78))
            d.rectangle((xx+2,y+2,xx+125,y+61),fill=(c,c+3,c+5))
            h.rectangle((xx+2,y+2,xx+125,y+61),fill=150)
            d.line((xx+3,y+60,xx+124,y+60),fill=(c+17,c+19,c+20),width=2)
    save('slate',np.asarray(slate)+rng.normal(0,4,(size,size,1)),np.asarray(sr),2.4,.82)
    for name,color,amplitude,metres,roughness in [
        ('plaster',(210,207,194),4,1,.94),('aggregate',(164,159,139),28,.65,.96),
        ('grass',(66,80,43),16,3,.98),('soil',(76,66,50),10,2,1),
        ('wood',(62,57,49),7,1,.87),('concrete',(145,144,131),7,1,.9)]:
        noise=rng.normal(0,amplitude,(size,size))
        if name=='aggregate':
            seeds=rng.integers(0,180,(128,128),dtype=np.uint8)
            noise=np.asarray(Image.fromarray(seeds).resize((size,size),Image.Resampling.BILINEAR),dtype=float)-90
        if name=='wood':
            noise += np.tile(rng.normal(0,7,size),(size,1))
        rgb=np.array(color)[None,None,:]+noise[:,:,None]
        save(name,rgb,noise,metres,roughness)
    # Rough entrance masonry, authored courses with irregular polygon edges.
    stone=Image.new('RGB',(size,size),(87,88,80)); sr=Image.new('L',(size,size),60)
    d,h=ImageDraw.Draw(stone),ImageDraw.Draw(sr)
    for row in range(8):
        y=row*64
        for col in range(-1,5):
            x=col*128+(row%2)*64; c=int(rng.integers(125,170))
            pts=[(x+4,y+12),(x+22,y+3),(x+111,y+6),(x+124,y+22),(x+115,y+57),(x+12,y+61)]
            d.polygon(pts,fill=(c,c+2,c-3));h.polygon(pts,fill=160)
    save('stone',np.asarray(stone)+rng.normal(0,8,(size,size,1)),np.asarray(sr.filter(ImageFilter.GaussianBlur(1))),2,.96)
    return records


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--revision',required=True)
    args=parser.parse_args()
    if not args.revision.replace('-','').isalnum(): raise ValueError('Invalid revision')
    source=ROOT/'assets/source/working/entrance-hall-pilot'/args.revision
    source.mkdir(parents=True,exist_ok=False)
    site=json.loads((ROOT/'.local/blueprint/site-local.json').read_text())
    features={f['properties']['source_id']:f for f in site['features']}
    coords=lambda id: features[id]['geometry']['coordinates']
    dgm=np.loadtxt(ROOT/'.local/blueprint/derived/terrain-local.csv',delimiter=',')
    # Exact DGM centres: local east x=-49.5..29.5, north y=84.5..-24.5.
    heights=dgm[175:285,210:290].copy()
    hall=Polygon(coords('way/362596059')[0])
    floor=float(np.median([heights[round(84.5-y),round(x+49.5)] for x,y in hall.exterior.coords]))
    # Local constructed hall platform, blended into general DGM over two metres.
    # The one-metre DGM is not a kerb/threshold survey.
    terrace=Polygon([xy(0,-1.8),xy(27.72,-1.8),xy(27.72,15.7),xy(0,15.7)])
    for row in range(110):
        for col in range(80):
            p=Point(-49.5+col,84.5-row)
            weight=max(0,1-terrace.distance(p)/2)
            heights[row,col]=heights[row,col]*(1-weight)+floor*weight
    heights=np.round(heights,5)

    def ground(x,y):
        cx=x+49.5; rz=84.5-y; col=min(78,max(0,math.floor(cx))); row=min(108,max(0,math.floor(rz)))
        tx=cx-col; tz=rz-row
        a,b,c,d=heights[row,col],heights[row,col+1],heights[row+1,col],heights[row+1,col+1]
        return float(a+(c-a)*tz+(d-c)*tx if tz>=tx else a+(b-a)*tx+(d-b)*tz)

    path=coords('way/1165077095')
    # Bounded centreline segments. Each width remains an editable estimate.
    sections=[('gate',[[-32.2,70.5]]+path[1:4],6),('approach',path[3:5],5.2),
              ('bend',path[4:9],6),('forecourt',path[8:13],5.5),
              ('west',path[12:20],4.2),('south',path[19:24],4),
              ('south-junction',coords('way/1165079381'),3),
              ('east',coords('way/1165093239'),2.4),
              ('north-junction',coords('way/1165093234')[-3:],3),
              ('south-limit',coords('way/1165079380')[:2],3)]
    paving=unary_union([LineString(line).buffer(width/2,cap_style=2,join_style=2) for _,line,width in sections])
    # Door landing connects the centreline surface to the existing source entrance recess.
    landing=Polygon([xy(10,-4.2),xy(14.8,-4.2),xy(14.8,-1.0),xy(10,-1.0)])
    paving=unary_union([paving,landing]).difference(hall)
    paths=rings(paving)
    walkable=unary_union([paving.buffer(1.2,join_style=2),Point(*coords('node/10836993157')).buffer(6.5)])
    # Keep the supported area connected but bounded; this is not the entire authoring rectangle.
    obstacles=[{'id':'hall','polygon':runtime_ring(hall.exterior.coords)}]
    tower=coords('node/10837322627')
    tower_poly=Polygon([(tower[0]-2,tower[1]-2),(tower[0]+2,tower[1]-2),
                        (tower[0]+2,tower[1]+2),(tower[0]-2,tower[1]+2)])
    obstacles.append({'id':'tower-bed','polygon':runtime_ring(tower_poly.exterior.coords)})
    gate=coords('node/10836993157'); across=(.859,.512)
    gatep=lambda distance:[gate[0]+across[0]*distance,gate[1]+across[1]*distance]
    barriers=[{'id':'gate-west-wall','a':runtime_ring([gatep(-12)])[0],'b':runtime_ring([gatep(-3)])[0]},
              {'id':'gate-east-wall','a':runtime_ring([gatep(3)])[0],'b':runtime_ring([gatep(12)])[0]}]
    for side in [-1,1]:
        a=gatep(side*3);b=[a[0]+V[0]*2.7,a[1]+V[1]*2.7]
        barriers.append({'id':f'open-gate-leaf-{side}','a':runtime_ring([a])[0],'b':runtime_ring([b])[0]})
    views=[{'id':'approach','label':'Zuweg','x':-29,'z':-65,'yaw':math.radians(149),'pitch':.03},
           {'id':'gable','label':'Giebel','x':-10.5,'z':-28.5,'yaw':math.radians(122),'pitch':.45},
           {'id':'entrance','label':'Halleneingang','x':-17.2,'z':-27,'yaw':math.radians(149),'pitch':.1},
           {'id':'tower','label':'Glockenturm','x':-16,'z':-25,'yaw':math.radians(230),'pitch':.12},
           {'id':'overhead','label':'Aufsicht · Inspektion','x':-10,'y':100,'z':-29,'yaw':0,'pitch':-math.pi/2+.0001,'inspection':True}]
    walk={'version':1,'ground':{'x0':-49.5,'z0':-84.5,'step':1,'columns':80,'rows':110,'heights':heights.flatten().tolist()},
          'surfaces':[{'id':f'paving-{i}','polygon':runtime_ring(p),'offset':.025} for i,p in enumerate(paths)],
          'walkable':[runtime_ring(p) for p in rings(walkable)],'obstacles':obstacles,'barriers':barriers,
          'spawn':views[0], 'views':views,'vegetation':[]}
    # Deliberate, sparse reference-guided placements; no inferred full tree inventory.
    plants={
        'AvenueTree':[(-29.1,55.5,1),(-24,46.9,.9),(-18.9,38.3,.86)],
        'RoundedTree':[(-21.5,61,1.45),(-15.5,51,1.25),(-25.5,23,.8),(-36,7,.85)],
        'Conifer':[(-17,54,1.1),(-6,39,1),(-37,19,1.1),(-22,9,.8)],
        'GableShrub':[(*xy(s,-.8),1) for s in [16,17.7,19.4,21.1,22.8,24.5,26.2]],
        'LowHedge':[],
    }
    for i in range(28):
        t=6+i
        plants['LowHedge'].append((gate[0]+.514*t-.858*3.3,gate[1]-.858*t-.514*3.3,1))
    for name,placements in plants.items():
        walk['vegetation'].append({'prototype':name,'positions':[[round(x,4),round(ground(x,y),5),round(-y,4),scale,0] for x,y,scale in placements]})
        if name in ('AvenueTree','RoundedTree','Conifer'):
            for i,(x,y,scale) in enumerate(placements):
                obstacles.append({'id':f'{name}-trunk-{i}','polygon':runtime_ring(Point(x,y).buffer(.25*scale,quad_segs=4).exterior.coords)})
    # Clip visible paving against EACH ground triangle: identical interpolation everywhere.
    pavement_vertices=[]; pavement_faces=[]
    for row in range(109):
        for col in range(79):
            x,y=-49.5+col,84.5-row
            for points in [[(x,y),(x,y-1),(x+1,y-1)],[(x,y),(x+1,y-1),(x+1,y)]]:
                poly=Polygon(points).intersection(paving)
                if poly.is_empty or poly.area<1e-8: continue
                for ring in rings(poly) if poly.geom_type in ('Polygon','MultiPolygon') else []:
                    for tri in constrained_delaunay_triangles(Polygon(ring)).geoms:
                        verts=list(tri.exterior.coords)[:3]; offset=len(pavement_vertices)
                        if (verts[1][0]-verts[0][0])*(verts[2][1]-verts[0][1])-(verts[1][1]-verts[0][1])*(verts[2][0]-verts[0][0]) < 0:
                            verts.reverse()
                        pavement_vertices.extend([[x,y,ground(x,y)+.025] for x,y in verts])
                        pavement_faces.append([offset,offset+1,offset+2])
    records=textures(source/'textures')
    inputs={'revision':args.revision,'parameters':PARAMETERS,'origin':ORIGIN,'u':U,'v':V,'floor':floor,
            'hall':list(hall.exterior.coords),'tower':tower,'gate':gate,'gateAcross':across,
            'paving':{'vertices':pavement_vertices,'faces':pavement_faces,'edges':[list(paving.exterior.coords)] if paving.geom_type=='Polygon' else [list(p.exterior.coords) for p in paving.geoms]},
            'pathSections':[{'id':name,'line':line,'width':width} for name,line,width in sections],
            'textures':records,
            'uncertainty':[
                'Source hall footprint retained. Roof versus wall extent is unresolved under foliage; gable/annex split follows photos 13/15 and aerial roof break.',
                'Roof height 9.8m, annex 3.15m, tower 9.2m and all widths are photo-proportional estimates, not surveyed measurements.',
                'Local hall platform is level at median nearby DGM; blend over 2m. Door landing and kerb heights are provisional.',
                'Approach, gate and hall anchors agree qualitatively with aerial within canopy visibility; no georeferencing correction applied.',
                'Path tag asphalt overridden locally by regular grey paving visible in photos 1/15/17/26. No full grave field or interiors.',
                'Fixed runtime views are rounded authored review stations, not exported private camera metadata.',
            ],
            'sources':{'geojson_sha256':hashlib.sha256((ROOT/'data/cemetery_final.geojson').read_bytes()).hexdigest(),
                       'terrain':'HVBG DGM1 2020, dl-zero-de/2.0; local authored platform modification',
                       'map':'© OpenStreetMap contributors, ODbL; bounded derived section',
                       'appearance':'Private photos 1,9,13,15,17,21,26,96,98; guidance only, no pixels exported'}}
    (source/'inputs.json').write_text(json.dumps(inputs,separators=(',',':')))
    (source/'walk.json').write_text(json.dumps(walk,separators=(',',':')))
    print(json.dumps({'source':str(source),'floor':floor,'paving_triangles':len(pavement_faces),'surfaces':len(paths),'textures':len(records)}))


if __name__=='__main__':main()
