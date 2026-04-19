import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

CHUNK_SIZE = 1024 * 1024


def _parse_range(range_header, file_size):
    if not range_header or not range_header.startswith("bytes="):
        return None
    range_spec = range_header.replace("bytes=", "", 1)
    if "-" not in range_spec:
        return None
    start_text, end_text = range_spec.split("-", 1)
    try:
        start = int(start_text) if start_text else 0
        end = int(end_text) if end_text else file_size - 1
    except ValueError:
        return None
    if start > end or start < 0:
        return None
    return start, min(end, file_size - 1)


class PdfHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/pdf":
            self.send_response(404)
            self.end_headers()
            return

        pdf_path = os.environ.get("STREAM_PDF_PATH")
        if not pdf_path:
            pdf_dir = os.path.join(os.getcwd(), "PDF")
            if os.path.isdir(pdf_dir):
                filename = None
                if parsed.query:
                    for part in parsed.query.split("&"):
                        if part.startswith("file="):
                            filename = part.split("=", 1)[1]
                            break
                if filename:
                    candidate = os.path.join(pdf_dir, filename)
                    pdf_path = candidate if os.path.isfile(candidate) else None
                else:
                    candidates = [
                        os.path.join(pdf_dir, name)
                        for name in os.listdir(pdf_dir)
                        if name.lower().endswith(".pdf")
                    ]
                    candidates.sort()
                    pdf_path = candidates[0] if candidates else None

        if not pdf_path or not os.path.isfile(pdf_path):
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"STREAM_PDF_PATH is not set or file not found in ./PDF.")
            return

        file_size = os.path.getsize(pdf_path)
        byte_range = _parse_range(self.headers.get("Range"), file_size)

        self.send_response(206 if byte_range else 200)
        self._send_cors()
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Accept-Ranges", "bytes")
        if "download=1" in parsed.query:
            filename = os.path.basename(pdf_path)
            self.send_header("Content-Disposition", f"attachment; filename=\"{filename}\"")

        if byte_range:
            start, end = byte_range
            length = end - start + 1
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(length))
        else:
            start = 0
            end = file_size - 1
            length = file_size
            self.send_header("Content-Length", str(length))

        self.end_headers()

        with open(pdf_path, "rb") as pdf:
            pdf.seek(start)
            remaining = length
            while remaining > 0:
                chunk = pdf.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type")


def main():
    host = os.environ.get("STREAM_HOST", "0.0.0.0")
    port = int(os.environ.get("STREAM_PORT", "9000"))
    server = HTTPServer((host, port), PdfHandler)
    print(f"Streaming server running on http://{host}:{port}/pdf")
    server.serve_forever()


if __name__ == "__main__":
    main()
