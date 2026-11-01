#!/usr/bin/env python3
"""Local server for development: like `python -m http.server`, but with caching disabled.

Module URLs carry fixed ?v= stamps, so without no-store the browser keeps serving old copies of
edited JS for days. Usage: python scripts/dev_server.py [port] [directory]
"""

from __future__ import annotations

import functools
import http.server
import sys
from pathlib import Path


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    directory = sys.argv[2] if len(sys.argv) > 2 else str(Path(__file__).resolve().parents[1])
    handler = functools.partial(NoStoreHandler, directory=directory)
    print(f"Serving {directory} at http://localhost:{port}/ (no-store)")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()


if __name__ == "__main__":
    main()
