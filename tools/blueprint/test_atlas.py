"""Boundary checks for serving private reference files, using synthetic inputs."""
import json
import tempfile
import threading
import unittest
from contextlib import closing
from http.client import HTTPConnection
from pathlib import Path
from http.server import ThreadingHTTPServer

from atlas import handler_for, prepare


class PrivateAtlasTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.blueprint = self.root / '.local/blueprint'
        self.derived = self.blueprint / 'derived'
        self.proxies = self.root / '.local/references/proxies'
        for directory in (self.derived, self.proxies, self.root / 'tools/blueprint'):
            directory.mkdir(parents=True)
        (self.derived / 'raster.png').write_bytes(b'synthetic raster')
        (self.proxies / 'photo.jpg').write_bytes(b'synthetic photo')
        (self.root / 'tools/blueprint/atlas-template.html').write_text('<script type="application/json">__SITE_JSON__</script>')
        self.data = {'rasters': [{'path': 'derived/raster.png'}], 'photos': [{'proxy': '../references/proxies/photo.jpg', 'note': '</script><script>bad()</script>'}]}
        self.save()

    def save(self):
        (self.blueprint / 'site-local.json').write_text(json.dumps(self.data))

    def server(self):
        offline, page, routes = prepare(self.root)
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(page, routes))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        def close():
            server.shutdown()
            server.server_close()
            thread.join()
        self.addCleanup(close)
        return server.server_port, offline, page

    def request(self, port, path, method='GET', headers=None):
        with closing(HTTPConnection('127.0.0.1', port)) as connection:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()

    def test_only_explicit_images_and_page_are_served(self):
        port, offline, page = self.server()
        for path, expected in (('/', page), ('/images/photos-0.jpg', b'synthetic photo'), ('/images/rasters-0.png', b'synthetic raster')):
            status, headers, body = self.request(port, path)
            self.assertEqual(status, 200)
            self.assertEqual(body, expected)
            self.assertEqual(headers['Cache-Control'], 'private, no-store')
            self.assertIn("frame-ancestors 'none'", headers['Content-Security-Policy'])
        self.assertIn(b'../references/proxies/photo.jpg', offline)
        self.assertNotIn(b'../references/proxies/photo.jpg', page)
        self.assertNotIn(b'</script><script>bad()', page)
        status, headers, body = self.request(port, '/', 'HEAD')
        self.assertEqual((status, body), (200, b''))
        self.assertEqual(int(headers['Content-Length']), len(page))

    def test_private_paths_traversal_and_new_files_are_unreachable(self):
        port, _, _ = self.server()
        (self.proxies / 'extra.jpg').write_bytes(b'not in atlas')
        for path in ('/.git/config', '/.local/references/photos.json', '/site-local.json', '/images/', '/../site-local.json', '/%2e%2e/site-local.json', '/images/photos-0.jpg/../../site-local.json', '/images/extra.jpg'):
            self.assertEqual(self.request(port, path)[0], 404, path)
        self.assertEqual(self.request(port, '/', 'POST')[0], 501)
        self.assertEqual(self.request(port, '/', headers={'Sec-Fetch-Site': 'cross-site'})[0], 403)
        navigation = {'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document'}
        self.assertEqual(self.request(port, '/', headers=navigation)[0], 200)
        navigation['Sec-Fetch-Dest'] = 'iframe'
        self.assertEqual(self.request(port, '/', headers=navigation)[0], 403)

    def test_unexpected_source_paths_are_rejected(self):
        for bad in ('../../secret.jpg', 'https://example.com/photo.jpg', '../references/proxies/../../secret.jpg', '../references/proxies/subdir/photo.jpg'):
            self.data['photos'][0]['proxy'] = bad
            self.save()
            with self.assertRaises(ValueError):
                prepare(self.root)

    def test_symlinks_are_rejected_before_and_after_start(self):
        port, _, _ = self.server()
        proxy = self.proxies / 'photo.jpg'
        proxy.unlink()
        proxy.symlink_to(self.derived / 'raster.png')
        self.assertEqual(self.request(port, '/images/photos-0.jpg')[0], 404)
        with self.assertRaises(ValueError):
            prepare(self.root)
        proxy.unlink()
        self.proxies.rename(self.proxies.with_name('saved'))
        self.proxies.symlink_to(self.proxies.with_name('saved'), target_is_directory=True)
        with self.assertRaises(ValueError):
            prepare(self.root)


if __name__ == '__main__':
    unittest.main()
