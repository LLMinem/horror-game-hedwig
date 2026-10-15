#!/usr/bin/env python3
"""Local-only reference preparation. Never writes into source directories."""

import argparse
from collections import Counter
from datetime import datetime, timezone
import html
import json
import math
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from zoneinfo import ZoneInfo

REPO = Path(__file__).resolve().parents[2]
LOCAL = REPO / ".local" / "references"
MANIFEST = LOCAL / "photos.json"
CACHED_EXIF = LOCAL / "cached-exif.json"
POSITIONS = LOCAL / "positions.json"
REVIEWS = LOCAL / "reviews.json"
CANONICAL_MAP = REPO / "data" / "cemetery_final.geojson"
MAP_TEMPLATE = Path(__file__).with_name("map-template.html")
SELECTION = {
    "capture_date": "2025-08-31",
    "timezone": "Europe/Berlin",
    "latitude": [50.171, 50.175],
    "longitude": [8.932, 8.938],
    "expected_count": 98,
    "limit": "Known date/GPS candidates, not all cemetery photos or verified visual coverage.",
}
EXIF_FIELDS = (
    "DateTimeOriginal", "OffsetTimeOriginal", "GPSLatitude", "GPSLongitude",
    "GPSAltitude", "GPSAltitudeRef", "GPSImgDirection", "GPSImgDirectionRef",
    "GPSHPositioningError", "GPSDOP", "GPSMeasureMode",
    "Make", "Model", "LensModel", "FocalLength", "FocalLengthIn35mmFormat",
    "FNumber", "ExposureTime", "ImageWidth", "ImageHeight", "Orientation",
)


def local_dir(path):
    """Refuse symlinks so generated files cannot escape the private local tree."""
    relative = path.relative_to(REPO)
    current = REPO
    for part in relative.parts:
        current /= part
        if current.is_symlink():
            raise ValueError(f"Refusing symlink output directory: {current}")
        current.mkdir(exist_ok=True, mode=0o700)
    return path


def save(path, text):
    local_dir(path.parent)
    if path.is_symlink():
        raise ValueError(f"Refusing symlink output file: {path}")
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(text)
            stream.close()
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)


def save_json(path, value):
    save(path, json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")


def load_json(path):
    def invalid_constant(value):
        raise ValueError(f"Nonfinite JSON number in {path}: {value}")
    return json.loads(path.read_text(encoding="utf-8"), parse_constant=invalid_constant)


def metadata_fields(row):
    return {key: value for key, value in row.items()
            if key in EXIF_FIELDS or "pitch" in key.lower() or "roll" in key.lower()}


def read_exif(paths):
    if not paths:
        return []
    # Wildcards discover only tags actually present; no assumed pitch/roll names.
    records = json.loads(run([require_tool("exiftool"), "-json", "-n",
                             *("-" + field for field in EXIF_FIELDS),
                             "-*Pitch*", "-*Roll*", *map(str, paths)]))
    if not isinstance(records, list):
        raise ValueError("ExifTool did not return a metadata array.")
    expected = {str(path) for path in paths}
    found = set()
    for row in records:
        if not isinstance(row, dict) or not isinstance(row.get("SourceFile"), str):
            raise ValueError("ExifTool returned an invalid source record.")
        source = row.get("SourceFile")
        if source not in expected or source in found or "Error" in row:
            raise ValueError(f"Unexpected or failed ExifTool source: {source}")
        found.add(source)
    if found != expected:
        raise ValueError("ExifTool did not return every requested source.")
    return records


def require_tool(name):
    executable = shutil.which(name)
    if not executable:
        raise ValueError(f"Required tool is missing: {name}. No installation attempted.")
    return executable


def run(command):
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise ValueError(result.stderr.strip() or result.stdout.strip() or f"Command failed: {command[0]}")
    return result.stdout


def availability(path):
    try:
        with path.open("rb") as source:
            header = source.read(12)
            size = os.fstat(source.fileno()).st_size
        return {"status": "available" if header else "empty", "bytes": size}
    except OSError as error:
        return {"status": "unavailable", "error": str(error)}


def index(args):
    if args.metadata:
        metadata_path = Path(args.metadata).expanduser().resolve()
        records = load_json(metadata_path)
        provenance = {"method": "cached ExifTool JSON", "metadata_source": str(metadata_path)}
        if not isinstance(records, list):
            raise ValueError("Metadata must be an ExifTool JSON array with SourceFile in every row.")
    else:
        library = Path(args.photos_library).expanduser().resolve()
        database = library / "database" / "Photos.sqlite"
        root = library / "originals"
        zone = ZoneInfo(SELECTION["timezone"])
        epoch = datetime(2001, 1, 1, tzinfo=timezone.utc)
        start = (datetime(2025, 8, 31, tzinfo=zone) - epoch).total_seconds()
        end = (datetime(2025, 9, 1, tzinfo=zone) - epoch).total_seconds()
        connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)
        try:
            connection.execute("PRAGMA query_only = ON")
            rows = connection.execute(
                "SELECT ZDIRECTORY, ZFILENAME FROM ZASSET "
                "WHERE ZDATECREATED >= ? AND ZDATECREATED < ? "
                "AND ZLATITUDE BETWEEN ? AND ? AND ZLONGITUDE BETWEEN ? AND ?",
                (start, end, *SELECTION["latitude"], *SELECTION["longitude"]),
            ).fetchall()
        finally:
            connection.close()
        paths = [(root / directory / filename).resolve() for directory, filename in rows]
        if any(not path.is_relative_to(root) for path in paths):
            raise ValueError("Photos database returned a path outside its originals directory.")
        present = [path for path in paths if availability(path)["status"] == "available"]
        records = read_exif(present)
        found = {row["SourceFile"] for row in records}
        records.extend({"SourceFile": str(path)} for path in paths if str(path) not in found)
        provenance = {"method": "bounded read-only Photos query", "database": str(database)}
    photos = []
    cached_records = []
    for row in records:
        if not isinstance(row, dict) or not isinstance(row.get("SourceFile"), str):
            raise ValueError("Metadata must contain an object with SourceFile for every photo.")
        source = Path(row["SourceFile"]).expanduser().resolve()
        if args.originals_root:
            parts = source.parts
            if "originals" not in parts:
                raise ValueError("Remapping requires an originals/ component in SourceFile.")
            root = Path(args.originals_root).expanduser().resolve()
            source = (root / Path(*parts[parts.index("originals") + 1:])).resolve()
            if not source.is_relative_to(root):
                raise ValueError("Remapped source escapes originals root.")
        photo_id = source.stem
        if not photo_id or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in photo_id):
            raise ValueError(f"Unsupported photo identifier: {photo_id}")
        photos.append({"id": photo_id, "source": str(source), **availability(source),
                       "metadata": metadata_fields(row)})
        cached_records.append({**row, "SourceFile": str(source)})
    if len({row["id"] for row in photos}) != len(photos):
        raise ValueError("Duplicate photo identifiers in source metadata.")
    # Refuse a reindex that would orphan corrections; never reset positions.json.
    load_positions(photos, load_json(CANONICAL_MAP))
    load_reviews(photos, load_json(CANONICAL_MAP))
    save_json(CACHED_EXIF, cached_records)
    save_json(MANIFEST, {"version": 1, "recorded_at": datetime.now(timezone.utc).isoformat(),
                         "selection": SELECTION, "provenance": provenance,
                         "photos": sorted(photos, key=lambda row: (row["metadata"].get("DateTimeOriginal", ""), row["id"]))})
    return status(args)


def load_manifest():
    if not MANIFEST.is_file():
        raise ValueError("No local manifest. Run index with --metadata or --photos-library first.")
    manifest = load_json(MANIFEST)
    photos = manifest["photos"]
    if not isinstance(photos, list):
        raise ValueError("Manifest photos must be an array.")
    ids = set()
    for row in photos:
        photo_id = row["id"]
        if (not isinstance(photo_id, str) or not photo_id
                or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in photo_id)
                or photo_id in ids):
            raise ValueError(f"Invalid or duplicate manifest ID: {photo_id}")
        if not isinstance(row["source"], str) or not Path(row["source"]).is_absolute():
            raise ValueError(f"Manifest source must be an absolute path: {photo_id}")
        if not isinstance(row["metadata"], dict):
            raise ValueError(f"Manifest metadata must be an object: {photo_id}")
        ids.add(photo_id)
    return manifest


def finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def map_bounds(geojson):
    """WGS84 bbox with a 100 m angular margin, not a world-space projection."""
    points = []

    def coordinates(value):
        if not isinstance(value, list) or not value:
            raise ValueError("Canonical map contains invalid coordinates.")
        if len(value) >= 2 and finite_number(value[0]) and finite_number(value[1]):
            if not -180 <= value[0] <= 180 or not -90 <= value[1] <= 90:
                raise ValueError("Canonical coordinates must be WGS84.")
            points.append(value[:2])
        else:
            for child in value:
                coordinates(child)

    def geometry(value):
        if value is None:
            return
        if value.get("type") == "GeometryCollection":
            for child in value["geometries"]:
                geometry(child)
        else:
            coordinates(value["coordinates"])

    if geojson.get("type") != "FeatureCollection":
        raise ValueError("Canonical map must be a FeatureCollection.")
    for feature in geojson["features"]:
        geometry(feature["geometry"])
    if not points:
        raise ValueError("Canonical map has no coordinates.")
    west, east = min(p[0] for p in points), max(p[0] for p in points)
    south, north = min(p[1] for p in points), max(p[1] for p in points)
    latitude_margin = 100 / 111320
    cosine = math.cos(math.radians((south + north) / 2))
    if cosine <= 0:
        raise ValueError("Canonical map latitude cannot support a longitude margin.")
    longitude_margin = latitude_margin / cosine
    return [west - longitude_margin, south - latitude_margin,
            east + longitude_margin, north + latitude_margin]


def validate_positions(value, photos, geojson):
    if (not isinstance(value, dict) or set(value) != {"version", "photos"}
            or type(value["version"]) is not int or value["version"] != 1
            or not isinstance(value["photos"], list)):
        raise ValueError("Positions must be {version: 1, photos: [...]} with no extra fields.")
    known = {row["id"] for row in photos}
    seen = set()
    west, south, east, north = map_bounds(geojson)
    required = {"id", "longitude", "latitude", "confirmed", "note"}
    for row in value["photos"]:
        if not isinstance(row, dict) or not required <= set(row) or set(row) - required - {"heading_deg"}:
            raise ValueError("Each position requires id, longitude, latitude, confirmed, note; heading_deg is optional.")
        photo_id = row["id"]
        if not isinstance(photo_id, str) or photo_id not in known or photo_id in seen:
            raise ValueError(f"Unknown or duplicate position ID: {photo_id}")
        seen.add(photo_id)
        if row["confirmed"] is not True or not isinstance(row["note"], str):
            raise ValueError(f"Position must be confirmed with a string note: {photo_id}")
        longitude, latitude = row["longitude"], row["latitude"]
        if (not finite_number(longitude) or not finite_number(latitude)
                or not -180 <= longitude <= 180 or not -90 <= latitude <= 90):
            raise ValueError(f"Invalid WGS84 position: {photo_id}")
        if not west <= longitude <= east or not south <= latitude <= north:
            raise ValueError(f"Position outside canonical map plus 100 m margin: {photo_id}")
        heading = row.get("heading_deg")
        if heading is not None and (not finite_number(heading) or not 0 <= heading < 360):
            raise ValueError(f"Heading must be null or finite in [0, 360): {photo_id}")
    return value


def load_positions(photos, geojson):
    if POSITIONS.is_symlink():
        raise ValueError(f"Refusing symlink correction file: {POSITIONS}")
    try:
        value = load_json(POSITIONS)
    except FileNotFoundError:
        return {"version": 1, "photos": []}
    return validate_positions(value, photos, geojson)


def import_positions(args):
    photos = load_manifest()["photos"]
    geojson = load_json(CANONICAL_MAP)
    # An existing corrupt file must be surfaced, never implicitly discarded.
    load_positions(photos, geojson)
    value = validate_positions(load_json(Path(args.path).expanduser()), photos, geojson)
    save_json(POSITIONS, value)
    print(json.dumps({"confirmed_positions": len(value["photos"]),
                      "positions": str(POSITIONS.relative_to(REPO)),
                      "next": "Run map to regenerate the offline viewer and placements.geojson."}, indent=2))
    return 0


def validate_reviews(value, photos, geojson):
    """Agent estimates are not human confirmations; validate each component."""
    if (not isinstance(value, dict) or set(value) != {"version", "photos"}
            or type(value["version"]) is not int or value["version"] != 1
            or not isinstance(value["photos"], list)):
        raise ValueError("Reviews must be {version: 1, photos: [...]}.")
    known = {row["id"] for row in photos}
    seen = set()
    west, south, east, north = map_bounds(geojson)
    for row in value["photos"]:
        if not isinstance(row, dict) or set(row) != {"id", "number", "position", "heading", "needs_review", "evidence"}:
            raise ValueError("Invalid review fields.")
        photo_id = row["id"]
        if not isinstance(photo_id, str) or photo_id not in known or photo_id in seen:
            raise ValueError(f"Unknown or duplicate review ID: {photo_id}")
        seen.add(photo_id)
        if type(row["number"]) is not int or row["number"] < 1:
            raise ValueError(f"Invalid review photo number: {photo_id}")
        pending = row["needs_review"]
        if (not isinstance(pending, list) or any(v not in ("position", "heading") for v in pending)
                or len(set(pending)) != len(pending)):
            raise ValueError(f"Invalid review components: {photo_id}")
        if not isinstance(row["evidence"], list) or not row["evidence"] or any(not isinstance(v, str) or not v.strip() for v in row["evidence"]):
            raise ValueError(f"Review evidence is required: {photo_id}")
        for component, field in (("position", "coordinates"), ("heading", "degrees")):
            assessment = row[component]
            if not isinstance(assessment, dict) or set(assessment) != {"status", field, "confidence", "reason"}:
                raise ValueError(f"Invalid {component} assessment: {photo_id}")
            status = assessment["status"]
            if status not in ("adjusted", "plausible", "uncertain") or assessment["confidence"] not in ("high", "medium", "low"):
                raise ValueError(f"Invalid assessment status/confidence: {photo_id}")
            if not isinstance(assessment["reason"], str) or not assessment["reason"].strip():
                raise ValueError(f"Assessment reason is required: {photo_id}")
            if status == "uncertain" and component not in pending:
                raise ValueError(f"Uncertain {component} must remain flagged: {photo_id}")
            estimate = assessment[field]
            if status != "adjusted":
                if estimate is not None:
                    raise ValueError(f"Only adjusted assessments may replace observations: {photo_id}")
            elif assessment["confidence"] == "low":
                raise ValueError(f"Low-confidence estimates must not be applied: {photo_id}")
            elif component == "position":
                if (not isinstance(estimate, list) or len(estimate) != 2
                        or not all(finite_number(v) for v in estimate)
                        or not west <= estimate[0] <= east or not south <= estimate[1] <= north):
                    raise ValueError(f"Invalid estimated position: {photo_id}")
            elif not finite_number(estimate) or not 0 <= estimate < 360:
                raise ValueError(f"Invalid estimated heading: {photo_id}")
    return value


def load_reviews(photos, geojson):
    if REVIEWS.is_symlink():
        raise ValueError(f"Refusing symlink review file: {REVIEWS}")
    try:
        value = load_json(REVIEWS)
    except FileNotFoundError:
        return {"version": 1, "photos": []}
    return validate_reviews(value, photos, geojson)


def import_reviews(args):
    photos, geojson = load_manifest()["photos"], load_json(CANONICAL_MAP)
    load_reviews(photos, geojson)
    value = validate_reviews(load_json(Path(args.path).expanduser()), photos, geojson)
    save_json(REVIEWS, value)
    print(json.dumps({"reviewed_photos": len(value["photos"]), "reviews": str(REVIEWS.relative_to(REPO))}))
    return 0


def refresh_metadata(args):
    manifest = load_manifest()
    geojson = load_json(CANONICAL_MAP)
    load_positions(manifest["photos"], geojson)
    load_reviews(manifest["photos"], geojson)
    photos = [{**row, **availability(Path(row["source"]))} for row in manifest["photos"]]
    records = read_exif([Path(row["source"]) for row in photos if row["status"] == "available"])
    fresh = {row["SourceFile"]: row for row in records}
    try:
        cached = load_json(CACHED_EXIF)
    except FileNotFoundError:
        cached = []
    if not isinstance(cached, list) or any(not isinstance(row, dict) or not isinstance(row.get("SourceFile"), str)
                                            for row in cached):
        raise ValueError("Cached ExifTool data must be an array of objects with SourceFile.")
    previous = {row["SourceFile"]: row for row in cached}
    retained = []
    for row in photos:
        source = row["source"]
        # Retain earlier metadata when a file/tag cannot currently be read.
        row["metadata"] = {**row["metadata"], **metadata_fields(fresh.get(source, {}))}
        retained.append({**previous.get(source, {}), **row["metadata"],
                         **fresh.get(source, {}), "SourceFile": source})
    manifest["photos"] = photos
    manifest["metadata_refreshed_at"] = datetime.now(timezone.utc).isoformat()
    save_json(CACHED_EXIF, retained)
    save_json(MANIFEST, manifest)
    return status(args)


def accuracy_group(metadata, threshold):
    if "GPSHPositioningError" not in metadata:
        return "missing"
    error = metadata["GPSHPositioningError"]
    if not finite_number(error) or error < 0:
        return "invalid"
    return "reported_low_error_unconfirmed" if error <= threshold else "review_location"


def placements(photos, overrides, threshold, reviews):
    corrected = {row["id"]: row for row in overrides["photos"]}
    assessed = {row["id"]: row for row in reviews["photos"]}
    features = []
    for row in photos:
        metadata = row["metadata"]
        longitude, latitude = metadata.get("GPSLongitude"), metadata.get("GPSLatitude")
        observed = ([longitude, latitude] if finite_number(longitude) and finite_number(latitude)
                    and -180 <= longitude <= 180 and -90 <= latitude <= 90 else None)
        correction = corrected.get(row["id"])
        review = assessed.get(row["id"])
        estimate = review["position"]["coordinates"] if review else None
        effective = [correction["longitude"], correction["latitude"]] if correction else (estimate or observed)
        original_heading = metadata.get("GPSImgDirection")
        heading = original_heading if finite_number(original_heading) and 0 <= original_heading < 360 else None
        heading_source = "observed_exif" if heading is not None else "unavailable_or_invalid"
        heading_ref = metadata.get("GPSImgDirectionRef") if heading is not None else None
        if review and not correction and review["heading"]["degrees"] is not None:
            heading, heading_source, heading_ref = review["heading"]["degrees"], "agent_estimate", "T"
        if correction and correction.get("heading_deg") is not None:
            heading, heading_source, heading_ref = correction["heading_deg"], "user_confirmed", "T"
        pending = [component for component in review["needs_review"]
                   if not correction or (component == "heading" and correction.get("heading_deg") is None)] if review else []
        group = accuracy_group(metadata, threshold)
        features.append({
            "type": "Feature", "id": row["id"],
            "geometry": {"type": "Point", "coordinates": effective} if effective is not None else None,
            "properties": {
                "id": row["id"], "source": row["source"], "status": row["status"],
                "proxy": f"proxies/{row['id']}.jpg", "metadata": metadata,
                "observed_gps": observed, "accuracy_group": group,
                "reported_low_error_unconfirmed": group == "reported_low_error_unconfirmed",
                "user_confirmed": correction is not None,
                "position_source": "user_confirmed" if correction else ("agent_estimate" if estimate else ("observed_gps" if observed else "unavailable_or_invalid")),
                "correction": correction,
                "review": review, "pending_review": pending,
                "effective_heading_deg": heading, "effective_heading_source": heading_source,
                "effective_heading_ref": heading_ref,
            },
        })
    return {"type": "FeatureCollection", "threshold_m": threshold,
            "coordinate_semantics": "WGS84 longitude/latitude only; no altitude/world-Z or metric projection.",
            "accuracy_semantics": "Device-reported horizontal error, not verified accuracy; manual confirmation is separate.",
            "features": features}


def metadata_statistics(photos, threshold):
    groups = Counter(accuracy_group(row["metadata"], threshold) for row in photos)
    errors = sorted(row["metadata"]["GPSHPositioningError"] for row in photos
                    if accuracy_group(row["metadata"], threshold) not in ("missing", "invalid"))
    count = len(errors)
    median = errors[(count - 1) // 2] / 2 + errors[count // 2] / 2 if count else None
    return {"photos": len(photos), "threshold_m": threshold,
            "metadata_presence": {field: sum(field in row["metadata"] for row in photos) for field in EXIF_FIELDS},
            "horizontal_error": {
                "valid": count, "missing": groups["missing"], "invalid": groups["invalid"],
                "reported_low_error_unconfirmed": groups["reported_low_error_unconfirmed"],
                "review_location": groups["review_location"],
                "minimum_m": errors[0] if count else None, "median_m": median,
                "maximum_m": errors[-1] if count else None}}


def reference_map(args):
    photos = load_manifest()["photos"]
    geojson = load_json(CANONICAL_MAP)
    overrides = load_positions(photos, geojson)
    reviews = load_reviews(photos, geojson)
    template = MAP_TEMPLATE.read_text(encoding="utf-8")
    token = "__REFERENCE_DATA_JSON__"
    if template.count(token) != 1:
        raise ValueError("Map template must contain exactly one reference-data token.")
    payload = {"photos": photos, "geojson": geojson, "threshold_m": args.threshold,
               "overrides": overrides, "reviews": reviews}
    # Safe both in a JSON script element and as a JavaScript expression.
    encoded = json.dumps(payload, ensure_ascii=True, allow_nan=False)
    encoded = encoded.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
    effective = placements(photos, overrides, args.threshold, reviews)
    summary = metadata_statistics(photos, args.threshold)
    summary["visual_review"] = {
        "reviewed": len(reviews["photos"]),
        "position_adjusted": sum(r["position"]["status"] == "adjusted" for r in reviews["photos"]),
        "heading_adjusted": sum(r["heading"]["status"] == "adjusted" for r in reviews["photos"]),
        "pending_photos": sum(bool(f["properties"]["pending_review"]) for f in effective["features"]),
        "pending_position": sum("position" in f["properties"]["pending_review"] for f in effective["features"]),
        "pending_heading": sum("heading" in f["properties"]["pending_review"] for f in effective["features"]),
    }
    summary.update({"confirmed_positions": len(overrides["photos"]),
                    "missing_or_invalid_observed_gps": sum(feature["properties"]["observed_gps"] is None
                                                           for feature in effective["features"]),
                    "map": str((LOCAL / "map.html").relative_to(REPO)),
                    "placements": str((LOCAL / "placements.geojson").relative_to(REPO))})
    save_json(LOCAL / "placements.geojson", effective)
    save(LOCAL / "map.html", template.replace(token, encoded))
    save_json(LOCAL / "map-status.json", summary)
    gallery(photos)
    print(json.dumps(summary, indent=2, allow_nan=False))
    return 0


def gallery(photos):
    cards = []
    for row in photos:
        photo_id = html.escape(row["id"])
        proxy = LOCAL / "proxies" / (row["id"] + ".jpg")
        image = f'<a href="proxies/{photo_id}.jpg"><img loading="lazy" src="proxies/{photo_id}.jpg" alt="{photo_id}"></a>' if proxy.is_file() else "No local proxy generated."
        cards.append(f'<figure>{image}<figcaption>{photo_id}<br>{html.escape(row["status"])}</figcaption></figure>')
    save(LOCAL / "index.html", '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
         '<title>Private cemetery references</title><style>body{font:16px system-ui;margin:2rem}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem}figure{margin:0;overflow-wrap:anywhere}img{width:100%;height:220px;object-fit:contain}figcaption{font-size:12px}</style>'
         '<h1>Private cemetery references</h1><p>Local working copies, not publication assets. '
         'Photos may contain names or people. Rich original metadata remain in photos.json, linked by stable photo ID, '
         'rather than duplicating embedded GPS in each proxy. '
         'No visual identification or coverage assessment is implied.</p>'
         '<p><a href="map.html">Private photo positioning map</a> (generate with the map command), '
         '<a href="photos.json">Metadata sidecar</a>, <a href="placements.geojson">Effective placements</a></p><main>'
         + "\n".join(cards) + '</main>')


def status(args):
    manifest = load_manifest()
    photos = [{**row, **availability(Path(row["source"]))} for row in manifest["photos"]]
    counts = dict(Counter(row["status"] for row in photos))
    summary = {"photos": len(photos), "expected": SELECTION["expected_count"], "availability": counts,
               "manifest": str(MANIFEST.relative_to(REPO)),
               "metadata_presence": {field: sum(field in row["metadata"] for row in photos) for field in EXIF_FIELDS},
               "true_north_heading": sum(row["metadata"].get("GPSImgDirectionRef") == "T" and "GPSImgDirection" in row["metadata"] for row in photos),
               "unavailable_ids": [row["id"] for row in photos if row["status"] != "available"]}
    save_json(LOCAL / "status.json", summary)
    gallery(photos)
    print(json.dumps(summary, indent=2))
    return 0 if len(photos) == SELECTION["expected_count"] and counts.get("available") == len(photos) else 1


def proxies(args):
    photos = load_manifest()["photos"]
    if args.id:
        photos = [row for row in photos if row["id"] in args.id]
        if len(photos) != len(set(args.id)):
            raise ValueError("At least one --id is absent from the manifest.")
    if args.limit:
        photos = photos[:args.limit]
    sips, exiftool = require_tool("sips"), require_tool("exiftool")
    destination = local_dir(LOCAL / "proxies")
    errors, generated, existing = [], 0, 0
    for row in photos:
        target = destination / (row["id"] + ".jpg")
        if target.is_symlink():
            raise ValueError(f"Refusing symlink proxy: {target}")
        if target.is_file():
            existing += 1
            continue
        try:
            source = Path(row["source"])
            if availability(source)["status"] != "available":
                raise ValueError("Original unavailable locally; no cloud export attempted.")
            with tempfile.TemporaryDirectory(dir=destination) as scratch:
                temporary = Path(scratch) / "proxy.jpg"
                run([sips, "-s", "format", "jpeg", "-s", "formatOptions", "85", "-Z", str(args.size), str(source), "--out", str(temporary)])
                # Bake EXIF orientation into pixels before removing metadata.
                orientation_text = run([exiftool, "-n", "-s3", "-Orientation", str(temporary)]).strip()
                orientation = int(orientation_text) if orientation_text else 1
                transforms = {1: [], 2: [("-f", "horizontal")], 3: [("-r", "180")],
                              4: [("-f", "vertical")], 5: [("-r", "90"), ("-f", "horizontal")],
                              6: [("-r", "90")], 7: [("-r", "90"), ("-f", "vertical")],
                              8: [("-r", "270")]}
                if orientation not in transforms:
                    raise ValueError(f"Unsupported EXIF orientation: {orientation}")
                for option, value in transforms[orientation]:
                    run([sips, option, value, str(temporary)])
                run([exiftool, "-overwrite_original", "-all=", str(temporary)])
                if not temporary.is_file() or temporary.stat().st_size == 0:
                    raise ValueError("Image conversion produced no data.")
                temporary.chmod(0o600)
                temporary.replace(target)
                generated += 1
        except (OSError, ValueError) as error:
            errors.append({"id": row["id"], "error": str(error)})
    result = {"generated": generated, "already_present": existing, "errors": errors, "maximum_dimension": args.size}
    save_json(LOCAL / "proxy-report.json", result)
    print(json.dumps(result, indent=2))
    reference_status = status(args)
    return 1 if errors else reference_status


def inventory(args):
    roots = {"raw": args.raw_root, "working": args.working_root, "runtime": args.runtime_root}
    report = {"recorded_at": datetime.now(timezone.utc).isoformat(), "groups": {},
              "terrain_and_aerial": "DGM/DOP not supplied to this workflow. No broad disk search or download attempted.",
              "limits": "File inventory only; no visual suitability, texture channels, licensing paperwork or independent backup verified."}
    for name, value in roots.items():
        root = Path(value).expanduser().resolve()
        files = []
        if root.is_dir():
            for path in sorted(root.rglob("*")):
                if path.is_file() and not path.is_symlink() and not any(part.startswith(".") for part in path.relative_to(root).parts):
                    files.append({"path": path.relative_to(root).as_posix(), "bytes": path.stat().st_size, "extension": path.suffix.lower()})
        report["groups"][name] = {"root": str(root), "status": "available" if root.is_dir() else "missing",
                                  "counts": dict(Counter(row["extension"] for row in files)), "files": files}
    save_json(LOCAL / "inventory.json", report)
    print(json.dumps({name: {key: group[key] for key in ("status", "counts")} for name, group in report["groups"].items()}, indent=2))
    return 1 if any(group["status"] == "missing" for group in report["groups"].values()) else 0


def positive(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("Must be a positive integer.")
    return number


def positive_distance(value):
    try:
        number = float(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("Must be a positive finite distance in metres.") from error
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("Must be a positive finite distance in metres.")
    return number


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    command = commands.add_parser("index", help="Import cached metadata, or run the documented bounded Photos query.")
    source = command.add_mutually_exclusive_group(required=True)
    source.add_argument("--metadata", help="Existing ExifTool -json array. Preferred over database rediscovery.")
    source.add_argument("--photos-library", help="Explicit local .photoslibrary path; read-only date/site query.")
    command.add_argument("--originals-root", help="Remap cached SourceFile paths to a relocated originals/ directory.")
    command.set_defaults(action=index)
    command = commands.add_parser("status", help="Check manifest paths with cached metadata and refresh the local gallery.")
    command.set_defaults(action=status)
    command = commands.add_parser("refresh-metadata", help="Read only manifest originals with ExifTool; keep IDs and corrections.")
    command.set_defaults(action=refresh_metadata)
    command = commands.add_parser("map", help="Generate private offline map.html, placements.geojson and map-status.json.")
    command.add_argument("--threshold", type=positive_distance, default=5.0,
                         help="Device-reported horizontal-error grouping threshold in metres, default 5; not verified accuracy.")
    command.set_defaults(action=reference_map)
    command = commands.add_parser("import-positions", help="Validate an entire correction export and atomically save positions.json.")
    command.add_argument("path", help="Private JSON export with version 1 and confirmed photo positions.")
    command.set_defaults(action=import_positions)
    command = commands.add_parser("import-reviews", help="Validate private visual assessments; never marks them human-confirmed.")
    command.add_argument("path", help="Private version-1 review JSON.")
    command.set_defaults(action=import_reviews)
    command = commands.add_parser("proxies", help="Create private JPEGs linked by ID to rich metadata sidecars; preserve originals.")
    command.add_argument("--id", action="append", help="Only this manifest ID; repeat to select several.")
    command.add_argument("--limit", type=positive, help="Only the first N selected originals.")
    command.add_argument("--size", type=positive, default=1600, help="Maximum image dimension, default 1600.")
    command.set_defaults(action=proxies)
    command = commands.add_parser("inventory", help="List source and runtime assets without modifying them.")
    command.add_argument("--raw-root", default=str(REPO / "assets/source/raw/cemetery-pack"))
    command.add_argument("--working-root", default=str(REPO / "assets/source/working/cemetery-pack"))
    command.add_argument("--runtime-root", default=str(REPO / "public/assets"))
    command.set_defaults(action=inventory)
    args = parser.parse_args()
    try:
        return args.action(args)
    except (OSError, ValueError, KeyError, TypeError, sqlite3.Error) as error:
        print(f"Reference preparation failed: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
