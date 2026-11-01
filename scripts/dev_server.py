#!/usr/bin/env python3
"""Local server for development: like `python -m http.server`, but with caching disabled, plus the
save endpoint for the story editor (tools/story_editor.html).

Browsers otherwise keep serving old copies of edited JS and data. PUT writes a story file
(data/flows/dayN.json or data/dialogue/prologue.json), only from this machine, only valid JSON,
keeping the file's byte-order mark and line endings.
Usage: python scripts/dev_server.py [port] [directory]
"""

from __future__ import annotations

import functools
import http.server
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

WRITABLE = re.compile(r"^/data/(flows/day\d+|dialogue/prologue)\.json$")
LOOPBACK = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        if self.client_address[0] not in LOOPBACK or not WRITABLE.match(path):
            self.send_error(403, "Only story files, only from this machine")
            return
        try:
            text = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode("utf-8")
            json.loads(text)
        except (ValueError, UnicodeDecodeError) as e:
            self.send_error(400, f"Not valid JSON: {e}")
            return
        target = Path(self.directory) / path.lstrip("/")
        old = target.read_bytes() if target.exists() else b""
        out = text.replace("\r\n", "\n")
        if b"\r\n" in old:
            out = out.replace("\n", "\r\n")
        target.write_bytes((b"\xef\xbb\xbf" if old.startswith(b"\xef\xbb\xbf") else b"") + out.encode("utf-8"))
        self.send_response(204)
        self.end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    directory = sys.argv[2] if len(sys.argv) > 2 else str(Path(__file__).resolve().parents[1])
    handler = functools.partial(NoStoreHandler, directory=directory)
    print(f"Serving {directory} at http://localhost:{port}/ (no-store)")
    print(f"Story editor: http://localhost:{port}/tools/story_editor.html")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()


if __name__ == "__main__":
    main()
