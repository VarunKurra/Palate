#!/usr/bin/env python3
"""Local Palate server. Build first with npm run build."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import os
ROOT=Path(__file__).resolve().parents[1]/'dist'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
        if self.path.endswith('/') or '.html' in self.path: self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def list_directory(self,path): self.send_error(404); return None
    def send_error(self,code,message=None,explain=None):
        if code==404 and (ROOT/'404.html').exists():
            content=(ROOT/'404.html').read_bytes();self.send_response(404);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
        else: super().send_error(code,message,explain)
if not ROOT.exists(): raise SystemExit('Run npm run build first.')
print('Palate is running at http://127.0.0.1:8942/',flush=True)
ThreadingHTTPServer(('127.0.0.1',8942),Handler).serve_forever()
