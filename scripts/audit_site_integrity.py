#!/usr/bin/env python3
"""Audit navigation and human-visible dates without modifying any site file."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from collections import Counter
import re, subprocess
ROOT=Path(__file__).resolve().parents[1]
html_files=sorted(ROOT.rglob("*.html"))
legacy=Counter(); missing=Counter(); badcanon=[]; dates=[]; rawdates=[]
anchor=re.compile(r'\b(?:href|action)=["\x27]([^"\x27]+)["\x27]',re.I)
base_re=re.compile(r'<base\b[^>]*href=["\x27]([^"\x27]+)',re.I)
canonical=re.compile(r'<link\b[^>]*rel=["\x27]canonical["\x27][^>]*href=["\x27]([^"\x27]+)',re.I)
date_re=re.compile(r'\b(?:19|20)\d{2}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:\d{1,2}[ ,]+)?(?:19|20)\d{2}\b|\b(?:published|updated|posted)\s+(?:on\s+)?(?:19|20)\d{2}',re.I)
for file in html_files:
    rel=file.relative_to(ROOT).as_posix()
    s=file.read_text(errors="replace")
    m=base_re.search(s)
    base=m.group(1) if m else '/' + rel.rsplit('/',1)[0]+'/'
    for ref in anchor.findall(s):
        u=urlsplit(ref)
        if u.scheme and u.scheme not in ('http','https'):continue
        if u.netloc and u.netloc not in ('omegaluxstudio.com','www.omegaluxstudio.com'):continue
        path=unquote(u.path)
        if not path:continue
        if path.endswith('.html'):
            legacy[(rel,path)]+=1
        if path.startswith('/'):
            full=ROOT/path.lstrip('/')
        else:
            full=ROOT/(base.lstrip('/') if base.startswith('/') else '')/path
        if not (full.is_file() or (full/'index.html').is_file() or path in ('#',)):
            if len(path)<200 and not path.startswith(('javascript:', '#')):missing[(rel,path)]+=1
    # Strip all non-visible code before checking publication years.
    visible=re.sub(r'<script\b[\s\S]*?</script>|<style\b[\s\S]*?</style>|<!--[\s\S]*?-->', ' ',s,flags=re.I)
    visible=re.sub(r'<[^>]*>',' ',visible)
    for d in list(date_re.finditer(visible))[:8]:
        hits=' '.join(visible[max(0,d.start()-45):d.end()+45].split())
        dates.append((rel,d.group(0),hits[:145]))
    if '/index.html' in rel:
        expected='https://omegaluxstudio.com/'+rel.removesuffix('index.html')
        c=canonical.search(s)
        if c and c.group(1).replace('www.','')!=expected: badcanon.append((rel,c.group(1),expected))
for pdf in sorted((ROOT/'articles').glob('*.pdf')):
    try:
        r=subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,check=True,text=True)
        if r.returncode==0:
            for m in list(date_re.finditer(r.stdout))[:30]:
                rawdates.append((pdf.name,m.group(0),' '.join(r.stdout[max(0,m.start()-45):m.end()+45].split())[:140]))
    except Exception as ex: rawdates.append((pdf.name,'pdftotext unavailable',str(ex)[:120]))
print('AUDIT HTML_PAGES',len(html_files))
print('AUDIT LEGACY_LINKS',sum(legacy.values()),'UNIQUE',len(legacy))
for (rel,link),count in legacy.most_common(25):print('LEGACY',rel,link,count)
print('AUDIT MISSING_LOCAL_TARGETS',sum(missing.values()),'UNIQUE',len(missing))
for (rel,link),count in missing.most_common(30):print('MISSING',rel,link,count)
print('AUDIT BAD_CANONICAL',len(badcanon))
for row in badcanon[:22]:print('BAD_CANON',*row)
print('AUDIT VISIBLE_DATE_HITS',len(dates))
for row in dates[:35]:print('VISIBLE_DATE',*row)
print('AUDIT PDF_DATE_HITS',len(rawdates))
for row in rawdates[:60]:print('PDF_DATE',*row)
