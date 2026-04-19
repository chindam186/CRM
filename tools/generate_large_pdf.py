import argparse
import math
import os

CHUNK_SIZE = 1024 * 1024


def _build_objects(stream_lengths):
    num_pages = len(stream_lengths)
    catalog = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    kids = " ".join([f"{3 + i} 0 R" for i in range(num_pages)])
    pages = f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {num_pages} >>\nendobj\n".encode("ascii")

    page_objects = []
    for i in range(num_pages):
        contents_id = 3 + num_pages + 1 + i
        page_obj = (
            f"{3 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {3 + num_pages} 0 R >> >> /Contents {contents_id} 0 R >>\nendobj\n"
        ).encode("ascii")
        page_objects.append(page_obj)

    font_obj = (
        f"{3 + num_pages} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    ).encode("ascii")

    stream_headers = []
    stream_footers = []
    for i, length in enumerate(stream_lengths):
        obj_id = 3 + num_pages + 1 + i
        stream_headers.append(
            f"{obj_id} 0 obj\n<< /Length {length} >>\nstream\n".encode("ascii")
        )
        stream_footers.append(b"\nendstream\nendobj\n")

    return catalog, pages, page_objects, font_obj, stream_headers, stream_footers


def _compute_overhead(stream_lengths):
    catalog, pages, page_objects, font, stream_headers, stream_footers = _build_objects(stream_lengths)
    header = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"
    overhead = len(header) + len(catalog) + len(pages) + len(font)
    overhead += sum(len(obj) for obj in page_objects)
    overhead += sum(len(h) for h in stream_headers) + sum(len(f) for f in stream_footers)
    return overhead


def _solve_stream_lengths(target_bytes, num_pages):
    base_lengths = [0 for _ in range(num_pages)]
    overhead = _compute_overhead(base_lengths) + 200
    available = max(0, target_bytes - overhead)
    per_page = max(1, available // num_pages)
    lengths = [per_page for _ in range(num_pages)]

    # adjust to account for headers size change
    for _ in range(3):
        overhead = _compute_overhead(lengths) + 200
        available = max(0, target_bytes - overhead)
        per_page = max(1, available // num_pages)
        lengths = [per_page for _ in range(num_pages)]

    return lengths


def generate_pdf(output_path, target_bytes, num_pages):
    stream_lengths = _solve_stream_lengths(target_bytes, num_pages)
    header = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"
    catalog, pages, page_objects, font, stream_headers, stream_footers = _build_objects(stream_lengths)

    offsets = []

    with open(output_path, "wb") as pdf:
        pdf.write(header)
        offsets.append(pdf.tell())
        pdf.write(catalog)
        offsets.append(pdf.tell())
        pdf.write(pages)
        for page_obj in page_objects:
            offsets.append(pdf.tell())
            pdf.write(page_obj)

        offsets.append(pdf.tell())
        pdf.write(font)

        pattern = b"BT /F1 12 Tf 72 720 Td (Large PDF content stream) Tj ET\n"
        for idx, stream_header in enumerate(stream_headers):
            offsets.append(pdf.tell())
            pdf.write(stream_header)

            remaining = stream_lengths[idx]
            while remaining > 0:
                chunk = pattern if len(pattern) <= remaining else pattern[:remaining]
                pdf.write(chunk)
                remaining -= len(chunk)
                if remaining <= 0:
                    break
                if len(pattern) < CHUNK_SIZE and remaining > len(pattern):
                    fill_size = min(CHUNK_SIZE, remaining)
                    repeats = max(1, fill_size // len(pattern))
                    chunk = pattern * repeats
                    chunk = chunk[:fill_size]
                    pdf.write(chunk)
                    remaining -= len(chunk)

            pdf.write(stream_footers[idx])
        xref_offset = pdf.tell()

        # xref
        pdf.write(b"xref\n")
        pdf.write(f"0 {len(offsets) + 1}\n".encode("ascii"))
        pdf.write(b"0000000000 65535 f \n")
        for offset in offsets:
            pdf.write(f"{offset:010d} 00000 n \n".encode("ascii"))

        # trailer
        pdf.write(b"trailer\n")
        pdf.write(f"<< /Size {len(offsets) + 1} /Root 1 0 R >>\n".encode("ascii"))
        pdf.write(b"startxref\n")
        pdf.write(f"{xref_offset}\n".encode("ascii"))
        pdf.write(b"%%EOF\n")

    return sum(stream_lengths)


def main():
    parser = argparse.ArgumentParser(description="Generate a large dummy PDF file.")
    parser.add_argument("--output", default=os.path.join("PDF", "sample-2.pdf"))
    parser.add_argument("--size-gb", type=float, default=1.5)
    parser.add_argument("--pages", type=int, default=5)
    args = parser.parse_args()

    target_bytes = int(args.size_gb * 1024 * 1024 * 1024)
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    stream_length = generate_pdf(args.output, target_bytes, args.pages)
    print(f"Generated {args.output} with stream length {stream_length} bytes across {args.pages} pages")


if __name__ == "__main__":
    main()
