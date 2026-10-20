#!/usr/bin/env python3
"""Render the private atlas or serve only its page and referenced working images."""

import argparse
import copy
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLACEHOLDER = '__SITE_JSON__'


def regular_file(path, directory):
    """Refuse symlinks at every level, including the allowed directory itself."""
    path = Path(path).absolute()
    directory = Path(directory).absolute()
    if not path.is_relative_to(directory):
        raise ValueError('Image is outside the allowed reference directory')
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError('Symlink reference paths are not served')
    if not path.is_file():
        raise ValueError('A required atlas file is missing')
    return path


def render(template, data):
    if template.count(PLACEHOLDER) != 1:
        raise ValueError('Expected one atlas data placeholder')
    payload = json.dumps(data, ensure_ascii=False, allow_nan=False).replace('<', '\\u003c')
    return template.replace(PLACEHOLDER, payload).encode('utf-8')


def prepare(root=ROOT):
    blueprint = root / '.local/blueprint'
    data = json.loads(regular_file(blueprint / 'site-local.json', blueprint).read_text())
    template = (root / 'tools/blueprint/atlas-template.html').read_text()
    hosted = copy.deepcopy(data)
    routes = {}
    # The server never maps URL paths onto the filesystem. Only these image
    # entries from the current atlas can be requested. Metadata stays embedded.
    for key, field, directory, prefix, suffixes in (
        ('rasters', 'path', blueprint / 'derived', 'derived/', {'.png', '.jpg'}),
        ('photos', 'proxy', root / '.local/references/proxies', '../references/proxies/', {'.jpg'}),
    ):
        for index, row in enumerate(hosted[key]):
            value = row[field]
            if not isinstance(value, str) or not value.startswith(prefix):
                raise ValueError('Unexpected atlas image reference')
            filename = value[len(prefix):]
            if '/' in filename or '\\' in filename or Path(filename).suffix not in suffixes:
                raise ValueError('Atlas images must be plain filenames of the expected type')
            source = regular_file(directory / filename, directory)
            route = f'/images/{key}-{index}{source.suffix}'
            routes[route] = (source, directory)
            row[field] = route.lstrip('/')
    return render(template, data), render(template, hosted), routes


def handler_for(page, routes):
    class AtlasHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.respond(body=True)

        def do_HEAD(self):
            self.respond(body=False)

        def respond(self, body):
            path = self.path.partition('?')[0]
            # Following a link to the atlas is allowed; embedding or fetching
            # its private content from a different website is not.
            navigation = (path in ('/', '/index.html')
                          and self.headers.get('Sec-Fetch-Mode') == 'navigate'
                          and self.headers.get('Sec-Fetch-Dest') == 'document')
            if self.headers.get('Sec-Fetch-Site') == 'cross-site' and not navigation:
                self.send_error(403)
                return
            image = None
            if path in ('/', '/index.html'):
                content = page
                content_type = 'text/html; charset=utf-8'
            elif path in routes:
                source, directory = routes[path]
                try:
                    source = regular_file(source, directory)
                    image = source.open('rb')
                except (ValueError, OSError):
                    self.send_error(404)
                    return
                content = None
                content_type = mimetypes.guess_type(source.name)[0]
            else:
                self.send_error(404)
                return
            try:
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(content) if content is not None else source.stat().st_size))
                self.send_header('Cache-Control', 'private, no-store')
                self.send_header('X-Content-Type-Options', 'nosniff')
                self.send_header('Referrer-Policy', 'no-referrer')
                self.send_header('X-Frame-Options', 'DENY')
                self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
                self.end_headers()
                if body:
                    if image:
                        while chunk := image.read(128 * 1024):
                            self.wfile.write(chunk)
                    else:
                        self.wfile.write(content)
            except (BrokenPipeError, ConnectionResetError):
                pass  # Navigating away while an image loads is normal.
            finally:
                if image:
                    image.close()

        def log_message(self, format, *args):
            pass  # Do not write private browsing history to a persistent log.

    return AtlasHandler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('render', 'serve'))
    parser.add_argument('--port', type=int, default=4184)
    args = parser.parse_args()
    offline, page, routes = prepare()
    if args.command == 'render':
        output = ROOT / '.local/blueprint/atlas.html'
        if output.is_symlink():
            raise ValueError('Refusing symlink output')
        output.write_bytes(offline)
        print('Refreshed .local/blueprint/atlas.html from existing site-local.json')
        return
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler_for(page, routes)) as server:
        print(f'Private atlas: http://127.0.0.1:{server.server_port}/ ({len(routes)} images). Ctrl+C stops it.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
