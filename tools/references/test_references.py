"""Synthetic-only reference workflow checks; never accesses the real photo library."""

import argparse
from contextlib import redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("references", Path(__file__).with_name("references.py"))
references = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(references)


class ReferenceWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        root = Path(self.temporary.name)
        local = root / ".local" / "references"
        local.mkdir(parents=True)
        self.paths = {
            "REPO": root, "LOCAL": local, "MANIFEST": local / "photos.json",
            "CACHED_EXIF": local / "cached-exif.json", "POSITIONS": local / "positions.json",
            "CANONICAL_MAP": root / "canonical.geojson", "MAP_TEMPLATE": root / "template.html",
        }
        self.patcher = patch.multiple(references, **self.paths)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.geojson = {"type": "FeatureCollection", "features": [{
            "type": "Feature", "properties": {},
            "geometry": {"type": "LineString", "coordinates": [[8.934, 50.172], [8.936, 50.174]]},
        }]}
        self.photos = [
            {"id": "photo-a", "source": str(root / "photo-a.heic"), "status": "available",
             "metadata": {"GPSLongitude": 8.935, "GPSLatitude": 50.173,
                          "GPSHPositioningError": 3.0, "GPSAltitude": 170,
                          "GPSImgDirection": 42, "GPSImgDirectionRef": "M", "FocalLength": 5.7}},
            {"id": "photo-b", "source": str(root / "photo-b.heic"), "status": "unavailable",
             "metadata": {}},
        ]
        self.correction = {"id": "photo-a", "longitude": 8.9351, "latitude": 50.1731,
                           "confirmed": True, "heading_deg": None, "note": "Checked on map"}
        references.save_json(references.MANIFEST, {"version": 1, "photos": self.photos})
        references.save_json(references.CANONICAL_MAP, self.geojson)
        references.save(references.MAP_TEMPLATE, '<script type="application/json">__REFERENCE_DATA_JSON__</script>')

    def corrections(self, row=None):
        return {"version": 1, "photos": [self.correction if row is None else row]}

    def import_value(self, value):
        path = references.LOCAL / "incoming positions.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        with redirect_stdout(io.StringIO()):
            return references.import_positions(argparse.Namespace(path=str(path)))

    def test_invalid_imports_leave_existing_file_unchanged(self):
        references.save_json(references.POSITIONS, self.corrections())
        original = references.POSITIONS.read_bytes()
        invalid_rows = [
            {"id": "unknown"}, {"longitude": float("nan")}, {"latitude": float("inf")},
            {"longitude": -181}, {"latitude": 91}, {"longitude": 9},
            {"latitude": True}, {"heading_deg": -1}, {"heading_deg": 360},
            {"heading_deg": float("inf")}, {"heading_deg": "90"}, {"confirmed": 1},
            {"note": None}, {"unexpected": "field"},
        ]
        values = [self.corrections({**self.correction, **change}) for change in invalid_rows]
        values.extend([
            {"version": True, "photos": []}, {"version": 2, "photos": []},
            {"version": 1, "photos": [self.correction, self.correction]},
            {"version": 1, "photos": [{}]}, {"version": 1, "photos": "invalid"},
            {"version": 1, "photos": [], "extra": True},
        ])
        for value in values:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    self.import_value(value)
                self.assertEqual(references.POSITIONS.read_bytes(), original)

    def test_valid_import_and_explicit_clear(self):
        row = {key: value for key, value in self.correction.items() if key != "heading_deg"}
        self.assertEqual(self.import_value(self.corrections(row)), 0)
        self.assertEqual(references.load_positions(self.photos, self.geojson), self.corrections(row))
        self.assertEqual(self.import_value({"version": 1, "photos": []}), 0)
        self.assertEqual(references.load_positions(self.photos, self.geojson)["photos"], [])

    def test_missing_and_malformed_existing_corrections(self):
        self.assertEqual(references.load_positions(self.photos, self.geojson)["photos"], [])
        references.POSITIONS.write_text("{broken", encoding="utf-8")
        with self.assertRaises(ValueError):
            self.import_value(self.corrections())
        with self.assertRaises(ValueError):
            references.reference_map(argparse.Namespace(threshold=5))
        self.assertEqual(references.POSITIONS.read_text(), "{broken")
        self.assertFalse((references.LOCAL / "map.html").exists())

    def test_effective_placement_keeps_observations_and_heading_reference(self):
        result = references.placements(self.photos, self.corrections(), 5)
        first, second = result["features"]
        self.assertEqual(first["geometry"]["coordinates"], [8.9351, 50.1731])
        props = first["properties"]
        self.assertEqual(props["observed_gps"], [8.935, 50.173])
        self.assertEqual(props["metadata"]["GPSAltitude"], 170)
        self.assertTrue(props["user_confirmed"])
        self.assertTrue(props["reported_low_error_unconfirmed"])
        self.assertEqual(props["effective_heading_source"], "observed_exif")
        self.assertEqual(props["effective_heading_ref"], "M")
        self.assertIsNone(second["geometry"])
        heading = references.placements(self.photos, self.corrections({**self.correction, "heading_deg": 90}), 5)
        self.assertEqual(heading["features"][0]["properties"]["effective_heading_source"], "user_confirmed")
        self.assertEqual(heading["features"][0]["properties"]["effective_heading_ref"], "T")

    def test_accuracy_statistics_and_threshold_validation(self):
        photos = [{"metadata": {"GPSHPositioningError": value}} for value in (2, 8, -1, None, True, "3")]
        photos.append({"metadata": {}})
        errors = references.metadata_statistics(photos, 5)["horizontal_error"]
        self.assertEqual(errors, {"valid": 2, "missing": 1, "invalid": 4,
                                  "reported_low_error_unconfirmed": 1, "review_location": 1,
                                  "minimum_m": 2, "median_m": 5, "maximum_m": 8})
        for value in ("0", "-1", "nan", "inf", "1e999", "words"):
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                references.positive_distance(value)
        self.assertEqual(references.positive_distance("5"), 5)

    def test_map_json_is_script_safe_and_all_ids_are_retained(self):
        note = '</script><script>alert("private")</script>\u2028&'
        references.save_json(references.POSITIONS, self.corrections({**self.correction, "note": note}))
        positions_before = references.POSITIONS.read_bytes()
        with redirect_stdout(io.StringIO()):
            references.reference_map(argparse.Namespace(threshold=5))
        page = (references.LOCAL / "map.html").read_text()
        self.assertEqual(page.count("</script>"), 1)
        payload = json.loads(page.split(">", 1)[1].rsplit("</script>", 1)[0])
        self.assertEqual(payload["overrides"]["photos"][0]["note"], note)
        effective = references.load_json(references.LOCAL / "placements.geojson")
        self.assertEqual([row["id"] for row in effective["features"]], ["photo-a", "photo-b"])
        self.assertEqual(references.POSITIONS.read_bytes(), positions_before)

    def test_refresh_keeps_ids_metadata_cache_and_corrections(self):
        Path(self.photos[0]["source"]).write_bytes(b"synthetic source, not an image")
        references.save_json(references.POSITIONS, self.corrections())
        before = references.POSITIONS.read_bytes()
        fresh = [{"SourceFile": self.photos[0]["source"], "GPSAltitudeRef": 0, "CameraPitch": -3}]
        with patch.object(references, "read_exif", return_value=fresh), patch.object(references, "status", return_value=0):
            self.assertEqual(references.refresh_metadata(argparse.Namespace()), 0)
        photos = references.load_manifest()["photos"]
        self.assertEqual([row["id"] for row in photos], ["photo-a", "photo-b"])
        self.assertEqual(photos[0]["metadata"]["FocalLength"], 5.7)
        self.assertEqual(photos[0]["metadata"]["CameraPitch"], -3)
        self.assertEqual(photos[1]["status"], "unavailable")
        self.assertEqual(len(references.load_json(references.CACHED_EXIF)), 2)
        self.assertEqual(references.POSITIONS.read_bytes(), before)

    def test_index_preserves_corrections_and_refuses_orphans(self):
        references.save_json(references.POSITIONS, self.corrections())
        positions_before = references.POSITIONS.read_bytes()
        cached = [{"SourceFile": row["source"], **row["metadata"]} for row in self.photos]
        references.save_json(references.CACHED_EXIF, cached)
        args = argparse.Namespace(metadata=str(references.CACHED_EXIF), originals_root=None)
        with patch.object(references, "status", return_value=0):
            references.index(args)
        self.assertEqual(references.POSITIONS.read_bytes(), positions_before)
        manifest_before = references.MANIFEST.read_bytes()
        incomplete = references.LOCAL / "incomplete.json"
        references.save_json(incomplete, cached[1:])
        args.metadata = str(incomplete)
        with self.assertRaises(ValueError):
            references.index(args)
        self.assertEqual(references.MANIFEST.read_bytes(), manifest_before)
        self.assertEqual(references.POSITIONS.read_bytes(), positions_before)


if __name__ == "__main__":
    unittest.main()
