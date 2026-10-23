"""Synthetic public audit CLI tests. No real site, browser or private photos are read.

Run with .local/blueprint-venv/bin/python -m unittest discover -s tools/review.
"""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
CLI = Path(__file__).with_name('spatial.py')
FRAME = {'epsg': 25832, 'origin': [495360, 5557830, 111.5],
         'blender': '(E-E0, N-N0, H-H0); one unit = one metre',
         'gltf_threejs': '(E-E0, H-H0, -(N-N0)); standard Blender glTF Y-up conversion once'}


def feature(identifier, category, kind, coords, tags=None):
    return {'id': 'osm:' + identifier, 'category': category,
            'geometry': {'type': kind, 'coordinates': coords},
            'properties': {'source_id': identifier, 'tags': tags or {}, 'note': 'Synthetic unsurveyed source'}}


def rectangle(west, south, east, north):
    return [[west, south], [east, south], [east, north], [west, north], [west, south]]


def paving(rectangles):
    vertices, faces = [], []
    for west, south, east, north in rectangles:
        offset = len(vertices)
        vertices.extend([[west, south, .025], [east, south, .025], [east, north, .025], [west, north, .025]])
        faces.extend([[offset, offset+1, offset+2], [offset, offset+2, offset+3]])
    return {'vertices': vertices, 'faces': faces}


def runtime_mesh(mesh, name='paving'):
    return {'name': name, 'vertices': [[x, h, -y] for x, y, h in mesh['vertices']],
            'triangles': copy.deepcopy(mesh['faces'])}


class SpatialAuditCLI(unittest.TestCase):
    def setUp(self):
        local = ROOT / '.local'
        local.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(prefix='synthetic-spatial-', dir=local)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.site = {'frame': copy.deepcopy(FRAME), 'features': [
            feature('cemetery', 'boundary', 'Polygon', [rectangle(-2, -3, 12, 3)], {'landuse': 'cemetery'}),
            feature('route-a', 'path', 'LineString', [[0, 0], [10, 0], [20, 0]])]}
        self.inputs = {'frame': copy.deepcopy(FRAME),
                       'pathSections': [{'id': 'a', 'source_id': 'route-a', 'line': [[0, 0], [10, 0], [20, 0]],
                                         'width': 2, 'uncertainty': 'Unmeasured authored width'}],
                       'paving': paving([(0, -1, 20, 1)])}
        self.walk = {'version': 2, 'ground': {'x0': -5, 'z0': -5, 'step': 1, 'columns': 31, 'rows': 11,
                                            'heights': [0] * 341},
                     'surfaces': [{'id': 'paving-0', 'polygon': [[x, -y] for x, y in rectangle(0, -1, 20, 1)]}]}
        self.runtime = {'schemaVersion': 1, 'worldFrame': 'threejs-x-east-z-south',
                        'meshes': [runtime_mesh(self.inputs['paving'])], 'hashes': {'synthetic': 'fixture'}}
        self.runs = 0

    def invoke(self, *, require_complete=True, runtime=True):
        for path, content in [(self.root / 'site.json', self.site), (self.source / 'inputs.json', self.inputs),
                              (self.source / 'walk.json', self.walk), (self.root / 'mesh.json', self.runtime)]:
            path.write_text(json.dumps(content))
        output = self.root / f'audit-{self.runs}'
        self.runs += 1
        output.mkdir()
        args = [sys.executable, str(CLI), 'audit', '--source-dir', str(self.source),
                '--site', str(self.root / 'site.json'), '--output', str(output)]
        if runtime:
            args += ['--runtime-mesh', str(self.root / 'mesh.json')]
        if require_complete:
            args.append('--require-complete')
        result = subprocess.run(args, capture_output=True, text=True, check=False)
        report = json.loads((output / 'audit.json').read_text())
        return result, report, output

    def test_direct_cli_refuses_external_output_without_writing_evidence(self):
        self.invoke()  # Materialize only synthetic inputs under .local.
        with tempfile.TemporaryDirectory(prefix='hedwig-external-output-', dir=Path(tempfile.gettempdir()).resolve()) as directory:
            result = subprocess.run(
                [sys.executable, str(CLI), 'audit', '--source-dir', str(self.source),
                 '--site', str(self.root / 'site.json'), '--output', directory],
                capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 2, result.stdout)
            self.assertFalse((Path(directory) / 'audit.json').exists())
            self.assertFalse((Path(directory) / 'source-overlay.svg').exists())

    def test_complete_actual_paving_and_separate_cemetery_extent(self):
        result, report, output = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(report['complete'])
        self.assertEqual(report['bounds'], [-5, -5, 25, 5])
        self.assertEqual(report['summary']['requested_length_m'], 20)
        self.assertEqual(report['summary']['inside_cemetery_length_m'], 12)
        self.assertEqual(report['summary']['outside_cemetery_supported_length_m'], 8)
        self.assertEqual(report['summary']['cemetery_area_m2'], 84)
        self.assertEqual(report['summary']['supported_terrain_area_m2'], 300)
        self.assertEqual(len(report['hashes']), 4)
        self.assertEqual(report['routes'][0]['width']['sections'][0]['width'], 2)
        self.assertEqual(report['features'], self.site['features'])
        ET.parse(output / 'source-overlay.svg')

    def test_omitted_canonical_route_is_not_filtered_by_plan(self):
        self.site['features'].append(feature('route-b', 'path', 'LineString', [[0, 3], [20, 3]]))
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report['summary']['supported_routes'], 2)
        self.assertIn('missing_selection', report['routes'][1]['issues'])
        self.assertEqual(report['routes'][1]['width']['status'], 'unknown')

    def test_same_id_with_partial_selection_does_not_pass(self):
        self.inputs['pathSections'][0]['line'] = [[0, 0], [10, 0]]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        route = report['routes'][0]
        self.assertIn('partial_selection', route['issues'])
        self.assertAlmostEqual(route['selected_length_m'], 10, places=4)
        self.assertAlmostEqual(route['selection_gap_length_m'], 10, places=4)
        self.assertEqual(route['runtime_covered_length_m'], 20)

    def test_crossing_an_unselected_route_is_not_completeness(self):
        self.site['features'].append(feature('route-b', 'path', 'LineString', [[10, -4], [10, 4]]))
        # Historical pilot sections have no IDs: a crossing must not inherit their selection.
        del self.inputs['pathSections'][0]['source_id']
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report['routes'][1]['selected_length_m'], 0)
        self.assertEqual(report['routes'][1]['runtime_covered_length_m'], 2)

    def test_all_routes_are_clipped_to_ground_not_cemetery(self):
        self.site['features'][1]['geometry']['coordinates'] = [[-10, 0], [30, 0]]
        self.inputs['pathSections'][0]['line'] = [[-10, 0], [30, 0]]
        self.inputs['paving'] = paving([(-5, -1, 25, 1)])
        self.runtime['meshes'] = [runtime_mesh(self.inputs['paving'])]
        self.walk['surfaces'][0]['polygon'] = [[x, -y] for x, y in rectangle(-5, -1, 25, 1)]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        route = report['routes'][0]
        self.assertEqual(route['canonical_length_m'], 40)
        self.assertEqual(route['requested_length_m'], 30)
        self.assertEqual(route['outside_supported_length_m'], 10)
        self.assertEqual(route['inside_cemetery_length_m'], 14)

    def test_baseline_and_new_partial_sections_combine_geometrically(self):
        baseline = self.root / 'baseline'
        baseline.mkdir()
        old = copy.deepcopy(self.inputs)
        old['pathSections'][0]['line'] = [[0, 0], [10, 0]]
        old['paving'] = paving([(0, -1, 10, 1)])
        (baseline / 'inputs.json').write_text(json.dumps(old))
        self.inputs = {'baseline': str(baseline), 'frame': copy.deepcopy(FRAME),
                       'pathSections': [{'id': 'new', 'source_id': 'route-a', 'line': [[10, 0], [20, 0]], 'width': 2}],
                       'surfaces': [{'id': 'new-paving', **paving([(10, -1, 20, 1)])}]}
        self.runtime['meshes'] = [runtime_mesh(old['paving']), runtime_mesh(self.inputs['surfaces'][0], 'PROVISIONAL_new-paving')]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(report['routes'][0]['width']['sections']), 2)
        self.assertAlmostEqual(report['routes'][0]['selected_length_m'], 20)

    def test_same_named_mesh_with_missing_middle_fails(self):
        self.runtime['meshes'] = [runtime_mesh(paving([(0, -1, 8, 1), (12, -1, 20, 1)]))]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report['routes'][0]['runtime']['gap_length_m'], 4)
        self.assertIn('runtime_paving_gap', report['routes'][0]['issues'])
        self.assertEqual(report['meshes'][0]['status'], 'export_mismatch')

    def test_world_scale_and_axis_errors_fail(self):
        for transform in ('scale', 'axis', 'height'):
            with self.subTest(transform=transform):
                self.runtime['meshes'] = [runtime_mesh(self.inputs['paving'])]
                for vertex in self.runtime['meshes'][0]['vertices']:
                    if transform == 'scale':
                        vertex[:] = [v * 2 for v in vertex]
                    elif transform == 'axis':
                        vertex[0], vertex[2] = vertex[2], vertex[0]
                    else:
                        vertex[1] += 2
                result, report, _ = self.invoke()
                self.assertEqual(result.returncode, 1)
                self.assertFalse(report['complete'])
                self.assertEqual(report['meshes'][0]['status'], 'export_mismatch')

    def test_narrow_export_fails_even_when_centerline_is_covered(self):
        self.runtime['meshes'] = [runtime_mesh(paving([(0, -.1, 20, .1)]))]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report['routes'][0]['runtime_covered_length_m'], 20)
        self.assertGreater(report['meshes'][0]['technical_missing_area_m2'], 30)

    def test_technical_tolerance_is_not_source_accuracy(self):
        for vertex in self.runtime['meshes'][0]['vertices']:
            vertex[0] += .005
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertGreater(report['routes'][0]['runtime']['gap_length_m'], .004)
        self.assertEqual(report['routes'][0]['runtime']['technical_gap_length_m'], 0)
        self.assertEqual(report['limits']['technical_export_tolerance_m'], .01)
        self.assertIsNone(report['limits']['source_positional_accuracy_m'])

    def test_plan_slice_cannot_be_blessed_by_a_full_line_with_the_same_id(self):
        self.inputs['plan'] = {'routes': [{'id': 'a', 'source_id': 'route-a', 'slice': [0, 2], 'width': 2}]}
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 2)
        self.assertIn('Plan slice and authored line disagree', report['errors'][0]['message'])
        self.inputs['pathSections'][0]['line'] = [[0, 0], [10, 0]]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertIn('partial_selection', report['routes'][0]['issues'])

    def test_unknown_authored_width_remains_unknown(self):
        del self.inputs['pathSections'][0]['width']
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report['routes'][0]['width']['status'], 'unknown')
        self.assertIsNone(report['routes'][0]['width']['sections'][0]['width'])

    def test_canonical_hash_mismatch_is_reported_not_silently_accepted(self):
        self.inputs['source_sha256'] = '0' * 64
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertIn('canonical_source_hash_mismatch', [e['code'] for e in report['errors']])

    def test_holes_survive_source_overlay_and_physical_coverage(self):
        hole = rectangle(8, -1, 12, 1)
        self.site['features'][0]['geometry']['coordinates'][0] = rectangle(-2, -3, 22, 3)
        self.site['features'][0]['geometry']['coordinates'].append(hole)
        mesh = paving([(0, -2, 8, 2), (12, -2, 20, 2), (8, -2, 12, -1), (8, 1, 12, 2)])
        self.inputs['paving'] = mesh
        self.runtime['meshes'] = [runtime_mesh(mesh)]
        self.walk['surfaces'] = [{'id': 'ring', 'polygon': [[x, -y] for x, y in rectangle(0, -2, 20, 2)],
                                 'holes': [[[x, -y] for x, y in hole]]}]
        result, report, output = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report['summary']['cemetery_area_m2'], 136)
        self.assertEqual(report['routes'][0]['walk']['gap_length_m'], 4)
        self.assertEqual(report['routes'][0]['runtime']['gap_length_m'], 4)
        document = ET.parse(output / 'source-overlay.svg')
        paths = document.findall('.//{http://www.w3.org/2000/svg}path')
        self.assertTrue(any(p.attrib.get('fill-rule') == 'evenodd' and p.attrib['d'].count('M ') == 2 for p in paths))

    def test_rendered_filled_hole_is_export_mismatch(self):
        self.inputs['paving'] = paving([(0, -2, 8, 2), (12, -2, 20, 2), (8, -2, 12, -1), (8, 1, 12, 2)])
        self.runtime['meshes'] = [runtime_mesh(paving([(0, -2, 20, 2)]))]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertGreater(report['meshes'][0]['technical_extra_area_m2'], 7)

    def test_walk_only_never_claims_runtime_completeness(self):
        result, report, _ = self.invoke(runtime=False)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report['mode'], 'walk-contract-only')
        self.assertFalse(report['complete'])
        self.assertIsNone(report['routes'][0]['runtime'])
        result, report, _ = self.invoke(runtime=False, require_complete=False)
        self.assertEqual(result.returncode, 0)
        self.assertFalse(report['complete'])

    def test_incomplete_non_strict_run_keeps_evidence(self):
        self.inputs['pathSections'][0]['line'] = [[0, 0], [10, 0]]
        result, report, output = self.invoke(require_complete=False)
        self.assertEqual(result.returncode, 0)
        self.assertFalse(report['complete'])
        self.assertTrue((output / 'source-overlay.svg').exists())
        self.assertTrue(report['errors'])

    def test_duplicate_point_walk_rings_preserve_full_failing_evidence(self):
        self.walk['surfaces'].append({'id': 'paving-18', 'polygon': [[2, 1], [2, 1], [3, 1]]})
        # A retraced bent line has a positive-area convex hull but no filled area.
        self.walk['surfaces'].append({'id': 'spatial-main-paths-476',
                                      'polygon': [[2, 1], [3, 2], [2, 1], [0, 2], [0, 2]]})
        result, report, output = self.invoke()
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertFalse(report['complete'])
        failures = [e for e in report['errors'] if e['code'] == 'invalid_walk_surface']
        self.assertEqual([e['surface'] for e in failures], ['paving-18', 'spatial-main-paths-476'])
        self.assertEqual(report['routes'][0]['walk']['covered_length_m'], 20)
        self.assertEqual(report['features'], self.site['features'])
        self.assertTrue((output / 'source-overlay.svg').is_file())

    def test_only_degenerate_walk_surfaces_do_not_gain_coverage(self):
        self.walk['surfaces'] = [{'id': 'empty', 'polygon': [[2, 1], [2, 1], [3, 1]]}]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(report['routes'][0]['walk']['gap_length_m'], 20)
        self.assertIn('walk_surface_gap', report['routes'][0]['issues'])

    def test_self_intersecting_walk_polygon_still_rejects_input(self):
        for points in ([[0, 0], [4, 4], [0, 4], [3, 0]], [[0, 0], [4, 4], [0, 4], [4, 0]]):
            with self.subTest(points=points):
                self.walk['surfaces'] = [{'id': 'crossed', 'polygon': points}]
                result, report, _ = self.invoke()
                self.assertEqual(result.returncode, 2)
                self.assertEqual(report['status'], 'invalid_input')

    def test_collapsed_runtime_triangle_is_counted_without_inventing_area(self):
        self.runtime['meshes'][0]['triangles'].append([0, 0, 1])
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report['meshes'][0]['runtime_degenerate_triangles'], 1)
        self.assertEqual(report['meshes'][0]['runtime_triangle_count'], 3)
        self.assertEqual(report['meshes'][0]['runtime_area_m2'], 40)
        self.assertTrue(report['warnings'])

    def test_collapsed_triangles_cannot_hide_a_missing_mesh_segment(self):
        self.runtime['meshes'][0]['triangles'][1] = [0, 0, 1]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertGreater(report['meshes'][0]['technical_missing_area_m2'], 19)
        self.assertIn('runtime_paving_gap', report['routes'][0]['issues'])
        self.assertEqual(report['meshes'][0]['runtime_degenerate_triangles'], 1)

    def test_all_collapsed_runtime_triangles_are_invalid_input(self):
        self.runtime['meshes'][0]['triangles'] = [[0, 0, 1]]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 2)
        self.assertFalse(report['complete'])

    def test_empty_malformed_and_unsupported_inputs_are_machine_readable_errors(self):
        original = copy.deepcopy((self.site, self.inputs, self.walk, self.runtime))
        for bad in ('zero_meshes', 'empty_vertices', 'bad_index', 'wrong_frame', 'unknown_local_frame',
                    'empty_features', 'empty_routes', 'empty_walk', 'invalid_terrain', 'nan'):
            with self.subTest(bad=bad):
                self.site, self.inputs, self.walk, self.runtime = copy.deepcopy(original)
                if bad == 'zero_meshes':
                    self.runtime['meshes'] = []
                elif bad == 'empty_vertices':
                    self.runtime['meshes'][0]['vertices'] = []
                elif bad == 'bad_index':
                    self.runtime['meshes'][0]['triangles'][0][0] = 999
                elif bad == 'wrong_frame':
                    self.runtime['worldFrame'] = 'blender-z-up'
                elif bad == 'unknown_local_frame':
                    self.site['frame']['epsg'] = 4326
                elif bad == 'empty_features':
                    self.site['features'] = []
                elif bad == 'empty_routes':
                    self.site['features'] = self.site['features'][:1]
                elif bad == 'empty_walk':
                    self.walk['surfaces'] = []
                elif bad == 'invalid_terrain':
                    self.walk['ground']['heights'].pop()
                else:
                    self.runtime['meshes'][0]['vertices'][0][0] = float('nan')
                result, report, _ = self.invoke(require_complete=False)
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertEqual(report['status'], 'invalid_input')
                self.assertFalse(report['complete'])

    def test_missing_named_mesh_and_unknown_extra_mesh_fail(self):
        self.runtime['meshes'][0]['name'] = 'not-paving'
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(report['meshes']), 2)
        self.assertTrue(all(m['status'] == 'export_mismatch' for m in report['meshes']))

    def test_solid_crossing_needs_an_explicit_bounded_exception(self):
        self.inputs['paving'] = paving([(0, -1, 8, 1), (12, -1, 20, 1)])
        self.inputs['solids'] = [{'id': 'building', 'polygon': rectangle(8, -2, 12, 2)}]
        self.runtime['meshes'] = [runtime_mesh(self.inputs['paving'])]
        self.walk['surfaces'] = [{'id': str(i), 'polygon': [[x, -y] for x, y in rectangle(a, -1, b, 1)]}
                                 for i, (a, b) in enumerate(((0, 8), (12, 20)))]
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 1)
        self.inputs['plan'] = {'route_exceptions': [{'source_id': 'route-a', 'kind': 'solid',
                                                   'target_id': 'building', 'reason': 'Observed source overlap'}]}
        result, report, _ = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report['routes'][0]['requested_length_m'], 20)
        self.assertEqual(report['routes'][0]['required_paving_length_m'], 16)
        self.assertEqual(report['routes'][0]['exceptions'][0]['length_m'], 4)


if __name__ == '__main__':
    unittest.main()
