"""PDF export with proper Devanagari shaping (HarfBuzz via fpdf2) for Hindi and Marathi."""

from pathlib import Path

from functools import partial

from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"

FOOTER_NOTE = (
    "Prepared with AI assistance on VaadaKaro. Generating this PDF does not submit it to any authority."
)


class _Doc(FPDF):
    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("NotoSans", size=7)
        self.set_text_color(110)
        self.cell(0, 5, FOOTER_NOTE, align="C")
        self.ln(4)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="C")


def _new_doc(title: str) -> _Doc:
    pdf = _Doc(format="A4")
    pdf.set_title(title)
    pdf.set_creator("VaadaKaro")
    for family, stem in (("NotoSans", "NotoSans"), ("NotoDeva", "NotoSansDevanagari")):
        pdf.add_font(family, "", FONT_DIR / f"{stem}-Regular.ttf")
        pdf.add_font(family, "B", FONT_DIR / f"{stem}-Bold.ttf")
    pdf.set_fallback_fonts(["NotoDeva"])
    pdf.set_text_shaping(True)
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(True, margin=22)
    pdf.add_page()
    return pdf


def render_document(title: str, body: str, meta: list[tuple[str, str]] | None = None) -> bytes:
    """Render a title, optional key/value header and a light-markdown body (#, ##, **bold** lines)."""
    pdf = _new_doc(title)
    # Full-width block that returns the cursor to the left margin on the next line.
    para = partial(pdf.multi_cell, 0, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("NotoSans", "B", 15)
    para(8, title)
    pdf.ln(2)

    if meta:
        pdf.set_font("NotoSans", size=9)
        pdf.set_text_color(70)
        for label, value in meta:
            para(5, f"{label}: {value}")
        pdf.set_text_color(0)
        pdf.ln(4)

    for raw in body.splitlines():
        line = raw.rstrip()
        if not line:
            pdf.ln(4)
            continue
        if line.startswith("#"):
            text = line.lstrip("#").strip()
            pdf.set_font("NotoSans", "B", 12 if line.startswith("##") else 13)
            pdf.ln(1)
            para(7, text)
            continue
        pdf.set_font("NotoSans", size=11)
        para(6, line, markdown=True)

    return bytes(pdf.output())
