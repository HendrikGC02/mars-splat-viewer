"""Serve this folder (the splat viewer) on http://localhost:8765 (or the port given as argv[1])."""
import functools
import http.server
import os
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
here = os.path.dirname(os.path.abspath(__file__))
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=here)
handler.func.extensions_map.update({".ply": "application/octet-stream", ".spz": "application/octet-stream",
                                    ".js": "text/javascript"})
print(f"Serving {here} at http://localhost:{port}/")
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
