#!/usr/bin/env python3
"""Remove publication/revision dates from OMEGALUX Blog PDF footers in place.

Uses actual PDF text redaction (not overlays), retains all other page content.
Requires PyMuPDF. No editing of unrelated standards or manufacturer documents.
"""
from pathlib import Path
import re, tempfile, os
import fitz

ROOT=Path(__file__).resolve().parents[1]
FILES=sorted((ROOT/'articles').glob('*.pdf'))
assert len(FILES)==5, f"Expected five Blog PDFs, found {len(FILES)}"
PUBLISH_DATE='2 NOVEMBER 2026 / REVISED 5 NOVEMBER 2026'
DATE_RE=re.compile(r'\b(?:19|20)\d{2}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June|July|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:\d{1,2}[ ,]+)?(?:19|20)\d{2}\b',re.I)
for pdf in FILES:
    doc=fitz.open(pdf)
    edited=0
    for page in doc:
        text=page.get_text()
        if not DATE_RE.search(text): continue
        rects=page.search_for(PUBLISH_DATE)
        if not rects:
            raise ValueError(f"Unable to locate exact revision footer on {pdf.name}, page {page.number + 1}: {repr(text[-220:])}")
        for rect in rects:
            # The date is printed in the white footer region; leave clean white paper.
            page.add_redact_annot(rect + (-0.3,-0.5,0.3,0.5),fill=(1,1,1),cross_out=False)
        page.apply_redactions(images=0,graphics=0,text=0)
        edited+=len(rects)
    meta=doc.metadata
    meta['creationDate']=''
    meta['modDate']=''
    doc.set_metadata(meta)
    fd,tmp=tempfile.mkstemp(suffix='.pdf',dir=pdf.parent);os.close(fd)
    try:
        doc.save(tmp,garbage=4,deflate=True)
        doc.close()
        with fitz.open(tmp) as verify:
            assert len(verify)>0
            residual=[(p.number+1,DATE_RE.findall(p.get_text())) for p in verify if DATE_RE.search(p.get_text())]
            assert not residual, f"Date still visible in {pdf.name}: {residual}"
            assert all(len(p.get_text().strip())>300 for p in verify), f"Content removed unexpectedly from {pdf.name}"
        os.replace(tmp,pdf)
    finally:
        if os.path.exists(tmp):os.remove(tmp)
    print(f"PDF CLEANED {pdf.name} footer-date instances={edited}")
