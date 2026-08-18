"""Minimal valid PDF used for demo syllabus / submissions."""

from __future__ import annotations


def demo_pdf(lines: list[str]) -> bytes:
    def esc(s: str) -> str:
        cleaned = (
            (s or "")
            .replace("—", "-")
            .replace("–", "-")
            .replace("’", "'")
            .replace("‘", "'")
            .replace("“", '"')
            .replace("”", '"')
            .replace("œ", "oe")
            .encode("latin-1", "replace")
            .decode("latin-1")
        )
        return cleaned.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    text = "\n".join(
        f"BT /F1 {15 if i == 0 else 11} Tf 56 {760 - i * 26} Td ({esc(l)}) Tj ET"
        for i, l in enumerate(lines)
    )
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(text)} >>\nstream\n{text}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    parts = [b"%PDF-1.4\n"]
    offsets: list[int] = []
    for i, body in enumerate(objs):
        offsets.append(sum(len(p) for p in parts))
        parts.append(f"{i + 1} 0 obj\n{body}\nendobj\n".encode("latin-1", "replace"))
    xref_at = sum(len(p) for p in parts)
    xref = [f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode("ascii")]
    for off in offsets:
        xref.append(f"{off:010d} 00000 n \n".encode("ascii"))
    xref.append(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF".encode("ascii"))
    return b"".join(parts + xref)
