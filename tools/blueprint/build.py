#!/usr/bin/env python3
"""Build private, metric cemetery reference products from acquired evidence; no Blender.

Run with .local/blueprint-venv/bin/python tools/blueprint/build.py.
Canonical source inputs remain immutable. Outputs stay under .local/blueprint.
"""
from __future__ import annotations

import hashlib
import html
import json
import math
from collections import Counter
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw, ImageFont
from pyproj import Geod, Transformer
from rasterio.features import geometry_mask
from shapely.geometry import mapping, shape
from shapely import transform as transform_shape

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.local/blueprint'
DERIVED = WORK / 'derived'
ORIGIN = (495360.0, 5557830.0, 111.5)
BOUNDS = (495100.0, 5557570.0, 495620.0, 5558090.0)
LOCAL_BOUNDS = [-260, -260, 260, 260]
SITE_BOUNDS = [-130, -140, 150, 140]
SOURCE_HASH = 'faa0de398279fca13e7c4946a1991db14257dda8082053c3a63a363020eddfca'
PROJECT = Transformer.from_crs(4326, 25832, always_xy=True)
GEOGRAPHIC = Transformer.from_crs(25832, 4326, always_xy=True)
GEOD = Geod(ellps='WGS84')
COLORS = {'boundary':'#f8d56b', 'path':'#ffdf9c', 'building':'#f1987f',
          'storage':'#e0ad89', 'hedge':'#70d4a7', 'fence':'#e5c8ff',
          'gate':'#ffadce', 'water':'#72dcff', 'landmark':'#ffffff',
          'columbarium':'#ffa68f'}


def load(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def to_local(x, y, z=None):
    e, n = PROJECT.transform(x, y)
    return e - ORIGIN[0], n - ORIGIN[1]


def to_wgs(x, y, z=None):
    return GEOGRAPHIC.transform(np.asarray(x) + ORIGIN[0], np.asarray(y) + ORIGIN[1])


def category(props):
    if props.get('landuse') == 'cemetery': return 'boundary'
    if props.get('cemetery') == 'columbarium' or props.get('building') == 'columbarium': return 'columbarium'
    if props.get('building'): return 'building'
    if props.get('man_made') == 'storage': return 'storage'
    if props.get('highway') in ('footway', 'path', 'service', 'pedestrian'): return 'path'
    if props.get('barrier') in ('hedge', 'fence', 'gate'): return props['barrier']
    if props.get('man_made') == 'water_tap' or props.get('amenity') == 'water_point': return 'water'
    if props.get('amenity') == 'columbarium' or props.get('building') == 'columbarium': return 'columbarium'
    return 'landmark'


def source_features(geo):
    result = []
    for number, feature in enumerate(geo['features'], 1):
        props = feature['properties']
        sid = props.get('@id', f'feature-{number}')
        result.append({'id': f'osm:{sid}', 'category': category(props),
                       'geometry': mapping(transform_shape(shape(feature['geometry']), to_local, interleaved=False)),
                       'properties': {'label': f'F{number:03} · {props.get("name", sid)}',
                                      'status': 'source_unverified', 'source_id': sid,
                                      'evidence': ['data/cemetery_final.geojson'],
                                      'note': 'Unveränderte OSM-Quelle; Lage, Breite und Höhe nicht als vermessen behandeln.',
                                      'tags': props}})
    return result


def read_raster(path, resolution, bands):
    with rasterio.open(path) as ds:
        if ds.crs.to_epsg() != 25832 or ds.count != bands:
            raise ValueError(f'Unexpected CRS/bands: {path}')
        if not np.allclose(ds.bounds, BOUNDS, atol=1e-6, rtol=0):
            raise ValueError(f'Unexpected bounds: {path}: {ds.bounds}')
        if not np.allclose(ds.res, [resolution, resolution], atol=1e-9, rtol=0):
            raise ValueError(f'Unexpected pixel size: {path}')
        array = ds.read(masked=True)
        if np.ma.getmaskarray(array).any() or not np.isfinite(array).all():
            raise ValueError(f'Missing/nonfinite pixels: {path}')
        return np.asarray(array), ds.transform


def world_file(path, resolution):
    # Pixel-centre coordinates, not upper-left pixel edges.
    path.write_text(f'{resolution}\n0\n0\n{-resolution}\n{BOUNDS[0]+resolution/2}\n{BOUNDS[3]-resolution/2}\n')


def raster_products(boundary):
    rasters = []
    for key, label in [('rgb', 'TrueDOP RGB'), ('cir', 'TrueDOP CIR · Vegetationsansicht')]:
        source = WORK / f'sources/aerial/truedop20_{key}_25832_520m.tif'
        data, _ = read_raster(source, .2, 3)
        output = DERIVED / f'orthophoto-{key}.png'
        image = Image.fromarray(np.moveaxis(data, 0, -1))
        image.save(output)
        if key == 'rgb':
            image.crop((650,600,2050,2000)).save(DERIVED / 'site-inspection.png')
        world_file(output.with_suffix('.pgw'), .2)
        output.with_suffix('.prj').write_text(PROJECT.target_crs.to_wkt())
        epoch = ('Friedhof 19.08.2025; östliches Umfeld ab E495500: 29.05.2023.'
                 if key == 'rgb' else 'Alle abgefragten Kacheln: 19.08.2025. Falschfarben, keine Artenkarte/quantitative NDVI-Daten.')
        rasters.append({'id': key, 'label': label, 'path': f'derived/{output.name}',
                        'bounds': LOCAL_BOUNDS, 'description': f'HVBG, 20 cm/Pixel. {epoch}'})
    terrain, affine = read_raster(WORK / 'sources/terrain/dgm1_epsg25832_495100_5557570_520m.tif', 1, 1)
    surface, _ = read_raster(WORK / 'sources/terrain/dom1_epsg25832_495100_5557570_520m.tif', 1, 1)
    terrain, surface = terrain[0], surface[0]
    north_gradient, east_gradient = np.gradient(terrain)
    normals = np.stack((-east_gradient, north_gradient, np.ones_like(terrain)), axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    light = np.array([-.5, .5, math.sqrt(.5)])
    shade = np.clip(.25 + .75 * np.maximum(normals @ light, 0), 0, 1)
    Image.fromarray((shade * 255).astype('uint8')).save(DERIVED / 'hillshade.png')
    t = np.clip((terrain - terrain.min()) / np.ptp(terrain), 0, 1)
    terrain_rgb = np.stack((80 + 160*t, 155 + 45*t, 195 - 110*t), axis=-1).astype('uint8')
    Image.fromarray(terrain_rgb).save(DERIVED / 'terrain-height.png')
    residual = surface - terrain
    h = np.clip(residual / 35, 0, 1)
    residual_rgb = np.stack((45 + 205*h, 65 + 130*np.sin(h*np.pi), 110 - 70*h), axis=-1).astype('uint8')
    Image.fromarray(residual_rgb).save(DERIVED / 'surface-residual.png')
    for name in ('hillshade', 'terrain-height', 'surface-residual'):
        world_file(DERIVED / f'{name}.pgw', 1)
        (DERIVED / f'{name}.prj').write_text(PROJECT.target_crs.to_wkt())
    # Rows run north to south; columns west to east. Values are local Z in metres.
    np.savez_compressed(DERIVED / 'terrain-local.npz', height=terrain - ORIGIN[2],
                        x=np.arange(520, dtype='float64') - 259.5,
                        y=259.5 - np.arange(520, dtype='float64'))
    np.savetxt(DERIVED / 'terrain-local.csv', terrain - ORIGIN[2], fmt='%.3f', delimiter=',')
    projected_boundary = transform_shape(boundary, lambda x,y:(x+ORIGIN[0],y+ORIGIN[1]), interleaved=False)
    mask = geometry_mask([mapping(projected_boundary)], out_shape=terrain.shape, transform=affine, invert=True)
    stats = {'context_height_min_m': float(terrain.min()), 'context_height_max_m': float(terrain.max()),
             'cemetery_height_min_m': float(terrain[mask].min()), 'cemetery_height_max_m': float(terrain[mask].max()),
             'surface_minus_terrain_min_m': float(residual.min()), 'surface_minus_terrain_max_m': float(residual.max()),
             'negative_residual_cells': int((residual < 0).sum()),
             'height_offset_m': ORIGIN[2], 'height_grid_shape': list(terrain.shape),
             'grid_first_center_local': [-259.5,259.5], 'grid_step_col_row_m': [1,-1],
             'note': 'DGM/DOM-Kachelmetadaten: Laserscan 01.04.2020; WCS selbst ohne Epochenfeld. DOM−DGM ist keine aktuelle Baumarten-/Stammkarte.'}
    rasters.extend([
        {'id':'hillshade','label':'Geländerelief · Schummerung','path':'derived/hillshade.png','bounds':LOCAL_BOUNDS,
         'description':'DGM1, 1 m Raster; Beleuchtung von NW, keine vertikale Überhöhung. Nicht als Höhenwerte importieren.'},
        {'id':'terrain','label':'Geländehöhen · Farbansicht','path':'derived/terrain-height.png','bounds':LOCAL_BOUNDS,
         'description':f'DGM1: {terrain.min():.2f}–{terrain.max():.2f} m NHN, blau=niedrig, gelb=hoch. Numerische Höhen separat in GeoTIFF/NPZ/CSV.'},
        {'id':'surface','label':'DOM−DGM · Oberflächenhöhe','path':'derived/surface-residual.png','bounds':LOCAL_BOUNDS,
         'description':'Darstellung 0–35 m, dunkel=niedrig/gelb=hoch. Ältere Laserscan-Epoche; negative Residuen nur in Anzeige auf0 begrenzt. Nicht ungeprüft als Baumhöhen verwenden.'}])
    return rasters, stats


def geometry_parts(geometry):
    kind, coords = geometry['type'], geometry['coordinates']
    if kind == 'Point': return [('point', [coords])]
    if kind == 'LineString': return [('line', coords)]
    if kind == 'Polygon': return [('polygon', coords[0])] + [('line', ring) for ring in coords[1:]]
    if kind == 'MultiLineString': return [('line', line) for line in coords]
    if kind == 'MultiPolygon': return [part for polygon in coords for part in geometry_parts({'type':'Polygon','coordinates':polygon})]
    raise ValueError(f'Unsupported geometry: {kind}')


def sheets(features):
    font_path = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
    font = ImageFont.truetype(font_path, size=22)
    small = ImageFont.truetype(font_path, size=17)
    title_font = ImageFont.truetype(font_path, size=36)
    base = Image.open(DERIVED / 'orthophoto-rgb.png').convert('RGB')
    specifications = [('context', LOCAL_BOUNDS, 'Umfeld · 520 × 520 m'),
                      ('site', SITE_BOUNDS, 'Quellplan · Friedhof'),
                      ('north', [-130,-10,150,140], 'Quellplan · Detail Nord'),
                      ('south', [-130,-140,150,10], 'Quellplan · Detail Süd')]
    for name, bounds, title in specifications:
        lo_x, lo_y, hi_x, hi_y = bounds
        width, height = round((hi_x-lo_x)*5), round((hi_y-lo_y)*5)
        crop = (round((lo_x+260)*5),round((260-hi_y)*5),round((hi_x+260)*5),round((260-lo_y)*5))
        image = Image.new('RGB',(width+100,height+220),'#13211d')
        map_image = base.crop(crop)
        map_draw = ImageDraw.Draw(map_image)
        draw = ImageDraw.Draw(image)
        draw.text((50,22), title, font=title_font, fill='#f2f2df')
        draw.text((50,68), 'Neuer Friedhof · Luftbild + GeoJSON-Quelle · unvollständig, nicht vermessen', font=font, fill='#c1d0c5')
        def xy(point): return (point[0]-lo_x)*5,(hi_y-point[1])*5
        for f in features:
            color = COLORS.get(f['category'],'#ffffff')
            for kind, points in geometry_parts(f['geometry']):
                pts = [xy(p) for p in points]
                if kind == 'point':
                    x,y=pts[0]; map_draw.ellipse((x-4,y-4,x+4,y+4),outline=color,width=2)
                elif len(pts)>1:
                    map_draw.line(pts,fill=color,width=3)
        image.paste(map_image,(50,110))
        # Scale is exact in the stored sheet, independent of display/print zoom.
        y=height+140
        draw.line((50,y,300,y),fill='white',width=4)
        for x in (50,175,300): draw.line((x,y-6,x,y+6),fill='white',width=3)
        draw.text((50,y+12),'0                    25                   50 m',font=small,fill='white')
        draw.text((380,y-8),'N ↑ · RGB: Friedhof 19.08.2025; Ostumfeld ab E495500: 29.05.2023',font=small,fill='#c1d0c5')
        draw.text((380,y+20),'HVBG · © OpenStreetMap contributors, ODbL · nur projizierte Quellgeometrie',font=small,fill='#c1d0c5')
        draw.text((50,y+48),'Gelb: Grenze / Wege   Grün: Hecken   Orange: Gebäude / Lager   Violett: Zäune   Rosa: Tore   Blau: Wasser',font=small,fill='#c1d0c5')
        image.save(DERIVED / f'sheet-{name}.png')
    # Pure vector sheet: one SVG unit = one metre. Raster is deliberately separate.
    chunks=['<svg xmlns="http://www.w3.org/2000/svg" width="560mm" height="560mm" viewBox="-130 -140 280 280">',
            '<title>Neuer Friedhof, GeoJSON-Quellplan, Maßstab 1:500 bei Originalgröße</title>',
            '<desc>Nur projizierte kanonische GeoJSON-Quelle. Lokale Meter; x Ost, SVG y Süd. Nützlich, aber unvollständig und nicht vermessen. Keine Ersatzgeometrie für zurückgezogene Agent-Zeichnungen.</desc>',
            '<rect x="-130" y="-140" width="280" height="280" fill="#f6f4e9"/>']
    chunks.extend(['<text x="-120" y="-130" font-family="sans-serif" font-size="5" fill="#293d35">Neuer Friedhof, Bruchköbel</text>',
                   '<text x="-120" y="-124" font-family="sans-serif" font-size="3" fill="#52665c">GeoJSON-Quelle, unvollständig und nicht vermessen.</text>',
                   '<text x="125" y="-125" font-family="sans-serif" font-size="5" fill="#293d35">N ↑</text>'])
    for f in features:
        stroke = {'path':'#6b624e','hedge':'#397957','building':'#b36f55','storage':'#a58b6d','boundary':'#293d35'}.get(f['category'],'#396b83')
        for kind, points in geometry_parts(f['geometry']):
            label=html.escape(f['properties'].get('label',f['id']))
            if kind=='point':
                x,y=points[0]; chunks.append(f'<circle cx="{x:.3f}" cy="{-y:.3f}" r="0.7" fill="{stroke}"><title>{label}</title></circle>')
            else:
                pts=' '.join(f'{x:.3f},{-y:.3f}' for x,y,*_ in points)
                tag='polygon' if kind=='polygon' else 'polyline'
                fill=stroke if kind=='polygon' and f['category'] in ('building','storage') else 'none'
                chunks.append(f'<{tag} points="{pts}" fill="{fill}" fill-opacity="0.18" stroke="{stroke}" stroke-width="0.35"><title>{label}</title></{tag}>')
    chunks.extend(['<path d="M-120,130 h50 m-50,-2 v4 m25,-4 v4 m25,-4 v4" fill="none" stroke="#293d35" stroke-width="0.5"/>',
                   '<g font-family="sans-serif" font-size="3" fill="#293d35"><text x="-120" y="126">0</text><text x="-95" y="126" text-anchor="middle">25</text><text x="-70" y="126" text-anchor="end">50 m</text></g>',
                   '<text x="-55" y="131" font-family="sans-serif" font-size="2.8"><tspan fill="#6b624e">Wege </tspan><tspan fill="#397957">Hecken </tspan><tspan fill="#b36f55">Gebäude / Lager </tspan><tspan fill="#396b83">Weitere Quellobjekte</tspan></text>',
                   '<text x="-120" y="138" font-family="sans-serif" font-size="2.6" fill="#52665c">© OpenStreetMap contributors, ODbL. Nur projizierte Quelle, keine Lagebestätigung. 1:500 bei 560 mm Blattbreite.</text>', '</svg>'])
    (DERIVED/'site-plan-1-500.svg').write_text('\n'.join(chunks))


def main():
    if WORK.is_symlink() or DERIVED.is_symlink():
        raise ValueError('Refusing symlink work/output directory')
    DERIVED.mkdir(parents=True, exist_ok=True)
    source = ROOT/'data/cemetery_final.geojson'
    if sha(source)!=SOURCE_HASH: raise ValueError('Canonical source changed; review instead of silently rebuilding')
    geo=load(source)
    features=source_features(geo)
    ids=set()
    for f in features:
        if f['id'] in ids: raise ValueError(f'Duplicate feature ID: {f["id"]}')
        ids.add(f['id'])
        geom=shape(f['geometry'])
        if geom.is_empty or not geom.is_valid: raise ValueError(f'Invalid geometry: {f["id"]}')
        if not np.isfinite(geom.bounds).all(): raise ValueError(f'Nonfinite geometry: {f["id"]}')
    boundary=shape(features[0]['geometry'])
    rasters, terrain_stats=raster_products(boundary)
    manifest=load(ROOT/'.local/references/photos.json')['photos']
    positions=load(ROOT/'.local/references/placements.geojson')['features']
    manual={p['id']:p for p in load(ROOT/'.local/references/positions.json')['photos']}
    numbering={p['id']:i+1 for i,p in enumerate(manifest)}
    if len(positions) != len(manifest) or {f['properties']['id'] for f in positions} != set(numbering):
        raise ValueError('Photo placements do not match manifest; regenerate references map')
    photos=[]
    for f in positions:
        p=f['properties']; pid=p['id']
        if p.get('correction') != manual.get(pid):
            raise ValueError(f'Stale human correction in placements: {pid}; run npm run references -- map')
        if not f['geometry']: raise ValueError(f'Missing camera position: {pid}')
        x,y=to_local(*f['geometry']['coordinates'])
        lon,lat=f['geometry']['coordinates']
        heading=p['effective_heading_deg']
        grid_heading=None
        if heading is not None:
            ahead_lon,ahead_lat,_=GEOD.fwd(lon,lat,heading,10)
            ahead_x,ahead_y=to_local(ahead_lon,ahead_lat)
            grid_heading=math.degrees(math.atan2(ahead_x-x,ahead_y-y)) % 360
        photos.append({'number':numbering[pid],'id':pid,'x':x,'y':y,
                       'heading':heading,'grid_heading':grid_heading,'position_source':p['position_source'],
                       'heading_source':p['effective_heading_source'],'note':manual.get(pid,{}).get('note',''),
                       'proxy':f'../references/proxies/{pid}.jpg','pending':p['pending_review'],
                       'evidence':p.get('review',{}).get('evidence',[])})
    photo_index=load(WORK/'photo-index.json')
    frame={'epsg':25832,'origin':list(ORIGIN),'bounds':LOCAL_BOUNDS,'siteBounds':SITE_BOUNDS,
           'projectedBounds':list(BOUNDS),'heightDatum':'DHHN2016 / NHN, metres; product metadata, not TIFF vertical CRS',
           'blender':'(E-E0, N-N0, H-H0); one unit = one metre',
           'gltf_threejs':'(E-E0, H-H0, -(N-N0)); standard Blender glTF Y-up conversion once',
           'rasterPixelCenters':'RGB: x=-259.9+0.2*column, y=259.9-0.2*row; DGM: x=-259.5+column,y=259.5-row',
           'heightOffsetReason':'111.5 m is a convenient rounded local datum; not a surveyed marker.',
           'headingNote':'heading is true north; grid_heading projects a 10m WGS84 geodesic. Local +Y is UTM grid north. No calibrated pose/pitch/roll.'}
    warnings=[
        'Micha hat die früheren Agent-Zeichnungen wegen ungenauer Platzierung zurückgewiesen. Sie sind archiviert und keine Bauvorlage. Die ursprüngliche GeoJSON-Quelle bleibt die Arbeitsgrundlage, mit bekannten Lücken und lokalen Fehlern.',
        'Micha-Korrekturen sind maßgeblich. Freitextunsicherheiten gelten auch bei bestätigter Position; sieben Fotos ohne manuelle Zeile.',
        'RGB-Epochengrenze bei E495500 / lokal x140: Friedhof 2025, östliches Umfeld 2023. CIR 2025.',
        'DGM/DOM-Kachelmetadaten nennen 01.04.2020. Oberfläche und Fotos sind nicht dieselbe Epoche.',
        'Dächer sind keine vermessenen Wandgrundrisse; Kronenumrisse keine Stammpositionen. Verdeckte Gräber und Wasserstellen nicht erfunden.',
        'Der regionale Fotoindex dient nur der Navigation, nicht als geprüfte Beobachtung oder Bauanweisung.',
        'Private Fotoverknüpfungen und Bestandsableitungen nicht veröffentlichen. OSM und amtliche Quelllizenzen getrennt beachten.'
    ]
    sources=[{'label':'Hessen TrueDOP RGB/CIR','url':'https://hvbg.hessen.de/landesvermessung/geotopographie/luftbilder/digitale-orthophotos-true-orthophoto',
              'evidence':'sources/aerial/','note':'20cm, GeoTIFF über amtlichen WMS; Epochen siehe Rasterbeschreibung und Akquisitionsbericht.'},
             {'label':'Hessen DGM1/DOM1','url':'https://inspire-hessen.de/raster/dgm1/ows','evidence':'sources/terrain/',
              'note':'1m Float32, EPSG25832; DHHN2016 laut Produktblatt; Quelldateien und Metadaten unverändert.'},
             {'label':'OpenStreetMap','url':'https://www.openstreetmap.org/copyright','note':'© OpenStreetMap contributors, ODbL; kanonische Quelldaten nur in den lokalen Meterrahmen projiziert, nicht lagebestätigt.'}]
    data={'title':'Neuer Friedhof · Quellenatlas','frame':frame,'rasters':rasters,'features':features,
          'photos':photos,'summary':{'source_features':len(features),
          'human_positions':len(manual),'photos':len(photos),'terrain':terrain_stats,
          'categories':dict(Counter(f['category'] for f in features))},
          'sources':sources,'warnings':warnings,'photo_index':photo_index}
    template=(ROOT/'tools/blueprint/atlas-template.html').read_text()
    if template.count('__SITE_JSON__')!=1: raise ValueError('Expected exactly one template data placeholder')
    (WORK/'atlas.html').write_text(template.replace('__SITE_JSON__',json.dumps(data,ensure_ascii=False,allow_nan=False).replace('<','\\u003c')))
    save(WORK/'site-local.json',data)
    save(WORK/'site-frame.json',frame)
    save(DERIVED/'terrain-grid.json',terrain_stats)
    sheets(features)
    # Three non-collinear numeric checks: registration/axis proof, not independent survey control.
    controls=[]
    for lon,lat in [geo['features'][0]['geometry']['coordinates'][0][i] for i in (0,2,4)]:
        x,y=to_local(lon,lat); lon2,lat2=to_wgs(x,y)
        if max(abs(lon-lon2),abs(lat-lat2))>1e-8: raise ValueError('CRS roundtrip failed')
        controls.append({'wgs84':[lon,lat],'local_blender_xy':[x,y],'runtime_xz':[x,-y],
                         'rgb_pixel_edge_xy':[(x+260)/.2,(260-y)/.2]})
    evidence={'canonical_sha256':sha(source),'human_import_sha256':sha(ROOT/'.local/references/positions.json'),
              'agent_reviews_sha256':sha(ROOT/'.local/references/reviews.json'),'numeric_controls':controls,
              'summary':data['summary'],'sources':{str(p.relative_to(WORK)):sha(p) for p in sorted((WORK/'sources').rglob('*.tif'))},
              'limitations':warnings}
    save(WORK/'build-report.json',evidence)
    print(json.dumps({'atlas':str((WORK/'atlas.html').relative_to(ROOT)),**data['summary']},ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
