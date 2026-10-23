"""Seed private photo stations from effective placements and original lens metadata.

The generated camera poses are provisional. Preserve and edit this private manifest
for calibration; rerunning this command never overwrites an existing manifest.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def private_destination(value):
    path = Path(value).absolute()
    private = ROOT / '.local'
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError('Station output must not traverse symlinks')
    path = path.resolve()
    if not path.is_relative_to(private) or path == private:
        raise ValueError('Station manifests must be below this project\'s .local directory')
    if path.exists():
        raise FileExistsError(f'Preserve existing station calibration: {path}')
    return path


def seed(numbers, site, metadata, blueprint):
    photos = {photo['number']: photo for photo in site['photos']}
    observations = {Path(row['SourceFile']).stem: row for row in metadata}
    stations = []
    for number in numbers:
        if number not in photos:
            raise ValueError(f'Unknown photo number: {number}')
        photo = photos[number]
        observed = observations.get(photo['id'], {})
        x, y, heading = photo.get('x'), photo.get('y'), photo.get('grid_heading')
        focal = observed.get('FocalLengthIn35mmFormat')
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
                   for v in (x, y, heading, focal)) or focal <= 0:
            raise ValueError(f'Photo {number} needs position, grid heading and equivalent focal length')
        proxy = (blueprint / photo['proxy']).resolve()
        allowed = (ROOT / '.local/references/proxies').resolve()
        if not proxy.is_relative_to(allowed) or proxy.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
            raise ValueError(f'Photo {number} has an unsafe proxy path')
        with Image.open(proxy) as image:
            width, height = image.size
        # Equivalent focal length describes the diagonal field of view. Use the
        # oriented proxy aspect, not a 36x24 sensor imposed on a phone's 4:3 photo.
        diagonal_35mm = math.hypot(36, 24)
        vertical_fov = math.degrees(2 * math.atan(diagonal_35mm /
                                  (2 * focal * math.hypot(width / height, 1))))
        stations.append({
            'id': f'photo-{number:03d}', 'photo_number': number, 'photo_id': photo['id'],
            'x': x, 'y': y, 'heading_grid_deg': heading,
            'eye_height_m': 1.7, 'pitch_deg': 0, 'roll_deg': 0,
            'vertical_fov_deg': vertical_fov, 'width': width, 'height': height,
            'pose_status': 'provisional',
            'uncertainty': [
                'Position and heading are effective reference values, not surveyed camera control.',
                'Eye height 1.7 m and pitch/roll zero are initial assumptions, not measurements.',
                'Field of view is initialized from equivalent focal length; crop and lens distortion remain uncalibrated.',
                *photo.get('pending', []),
            ],
            'anchors': [],
            'provenance': {
                'position_source': photo.get('position_source'),
                'heading_source': photo.get('heading_source'),
                'owner_note': photo.get('note', ''),
                'evidence': photo.get('evidence', []),
                'focal_length_35mm': focal,
                'proxy_sha256': hashlib.sha256(proxy.read_bytes()).hexdigest(),
            },
        })
    return {'schemaVersion': 1, 'status': 'Provisional poses; owner calibration tracked in issue #38',
            'stations': stations}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--photos', required=True, help='Comma-separated explicit photo numbers')
    parser.add_argument('--output', required=True, help='New private JSON manifest below .local/')
    args = parser.parse_args()
    try:
        numbers = [int(number.strip()) for number in args.photos.split(',')]
        if not numbers or len(numbers) != len(set(numbers)) or any(number < 1 for number in numbers):
            raise ValueError('Choose distinct positive photo numbers')
        destination = private_destination(args.output)
        site_path = ROOT / '.local/blueprint/site-local.json'
        metadata_path = ROOT / '.local/references/cached-exif.json'
        manifest = seed(numbers, json.loads(site_path.read_text()),
                        json.loads(metadata_path.read_text()), site_path.parent)
        manifest['inputs'] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                              for path in (site_path, metadata_path)}
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('x') as output:
            json.dump(manifest, output, indent=2, ensure_ascii=False)
            output.write('\n')
        print(json.dumps({'manifest': str(destination.relative_to(ROOT)),
                          'stations': len(manifest['stations']), 'pose_status': 'provisional'}))
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(2, f'Station preparation failed: {error}\n')


if __name__ == '__main__':
    main()
