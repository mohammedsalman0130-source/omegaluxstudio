#!/usr/bin/env python3
"""Build direct, refreshable, canonical URLs for every Projects detail view."""
from pathlib import Path
import json, html, re, unicodedata
root=Path(__file__).resolve().parents[1]
folder=root/'projects'
original=(folder/'index.html').read_text(encoding='utf-8')
match=re.search(r'<script[^>]+id=["\x27]project-data["\x27][^>]*>([\s\S]*?)</script>',original,re.I)
assert match, 'Cannot locate project-data JSON in projects/index.html'
projects=json.loads(match.group(1))
def slug(text):
    text=unicodedata.normalize('NFKD',text)
    text=text.encode('ascii','ignore').decode()
    return re.sub(r'[^a-z0-9]+','-',text.lower()).strip('-')
seen=set()
for p in projects:
    key=slug(p['title'])
    assert key and key not in seen, 'Duplicate/empty project slug'
    seen.add(key)
    route=f'/projects/{key}/'
    page=original.replace('<head>','<head><base href="/projects/">',1)
    page=re.sub(r'<title>[\s\S]*?</title>',f'<title>{html.escape(p["title"])} – Projects – OMEGALUX Studio</title>',page,count=1,flags=re.I)
    page=re.sub(r'<link\s+rel=["\x27]canonical["\x27][^>]*>',f'<link rel="canonical" href="https://www.omegaluxstudio.com{route}">',page,count=1,flags=re.I)
    dest=folder/key/'index.html'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(page,encoding='utf-8')
print('Project deep links generated:',len(seen))
