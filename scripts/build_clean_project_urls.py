#!/usr/bin/env python3
"""Build direct, refreshable, canonical URLs for every Projects detail view."""
from pathlib import Path
import json, html, re, unicodedata
from optimize_product_seo import image_url
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
    project_titles = {
        'oceanz-by-danube': 'Oceanz by Danube – Facade Lighting Design Dubai',
        'aqua-properties-reception-workspace': 'Aqua Properties – Office Lighting Design',
        'atcon-gm-office': 'ATCON GM Office – Executive Office Lighting',
        'private-villa': 'Private Villa – Facade Lighting Concept',
        'al-ain-tower-45th-floor': 'Al Ain Tower – Residential Lighting Concept',
        'zayed-villa': 'Zayed Villa – Abu Dhabi Villa Lighting',
        'sidra-villa-02': 'Sidra Villa 02 – Dubai Interior Lighting',
        'al-safa-park-pavilion-building': 'Al Safa Park Pavilion – Lighting Concept Dubai',
    }
    title = project_titles.get(key, p['title'] + ' – Lighting Project')
    page=re.sub(r'<title>[\s\S]*?</title>', lambda _: f'<title>{html.escape(title)} | OMEGALUX Studio</title>',page,count=1,flags=re.I)
    page=re.sub(r'<link\s+rel=["\x27]canonical["\x27][^>]*>',f'<link rel="canonical" href="https://www.omegaluxstudio.com{route}">',page,count=1,flags=re.I)
    description = p.get('desc', '').strip()
    if description:
        summary = re.split(r'(?<=[.!?])\s+', description, maxsplit=1)[0]
        tag = '<meta name="description" content="' + html.escape(summary, quote=True) + '">'
        page = re.sub(r'<meta name="description"[^>]*>', lambda _: tag, page, count=1)
    # Render the existing project description as real initial HTML. The existing
    # project JS replaces it with the original interactive detail view on load.
    esc = lambda value: html.escape(str(value), quote=True)
    areas = ', '.join(a['name'] for a in p.get('areas', []) if a.get('name'))
    initial = ('<section class="projectIntro"><h1>' + esc(p['title']) +
               '</h1><p>' + esc(p.get('subtitle', '')) + '</p>' +
               ('<p>' + esc(p['location']) + '</p>' if p.get('location') else '') +
               '<h2>Lighting approach</h2><p>' + esc(description) + '</p>' +
               ('<h2>Areas studied</h2><p>' + esc(areas) + '</p>' if areas else '') +
               '<p><a href="/services/lighting-design-supply/">Lighting design and supply services</a> · <a href="/projects/">All projects</a></p></section>')
    # Reuse existing sitemap image URLs, including byte-identical WebP copies
    # of inline gallery images. Never rename or replace an existing asset.
    sources = [p["heroImg"]] + [
        v["render"] for a in p["areas"] for v in a["views"] if v.get("render")
    ]
    urls = {src: image_url(src, "/projects/", f"project-{key}-{n}.webp")
            for n, src in enumerate(dict.fromkeys(sources), 1)}
    def image_tag(src, alt, hero=False):
        loading = 'fetchpriority="high"' if hero else 'loading="lazy"'
        return f'<img {loading} src="{esc(urls[src])}" alt="{esc(alt)}">'
    # These are actual existing project pictures, visible without JS, not
    # hidden keyword content. The original interactive renderer replaces
    # this fallback on load and retains all existing gallery interactions.
    hero_alt = f'{p["title"]} — {p.get("subtitle") or "lighting project"}'
    initial = ('<div class="hero">' + image_tag(p["heroImg"], hero_alt, True) +
               '<div class="heroCopy"><div class="eyebrow">' + esc(p.get("category", "")) +
               '</div><h1>' + esc(p["title"]) + '</h1><p>' + esc(p.get("subtitle", "")) +
               '</p></div></div>' + initial.replace('<h1>' + esc(p["title"]) + '</h1>', '', 1))
    cards = []
    for area in p["areas"]:
        views = []
        for v in area["views"]:
            if not v.get("render"):
                continue
            alt = f'{p["title"]} — {area["name"]}: {v["title"]} — project lighting visual'
            views.append('<div><div class="viewThumb">' + image_tag(v["render"], alt) +
                         '</div><div class="viewLabel">' + esc(v["title"]) + '</div></div>')
        cards.append('<article class="area"><div class="areaTitle"><h3>' + esc(area["name"]) +
                     '</h3></div>' + ''.join(views) + '</article>')
    initial += ('<section class="sections"><div class="sectionHead"><h2>Lighting concepts</h2>'
                '<span>Area by area · project visuals</span></div><div class="areas">' +
                ''.join(cards) + '</div></section>')
    # Preserve the existing base URL, which already appears on the listing.
    page = page.replace('<base href="/projects/"><base href="/projects/">', '<base href="/projects/">', 1)
    page=page.replace('<section class="listing" id="listing">', '<section class="listing hidden" id="listing">', 1)
    page=page.replace('<section class="detail" id="detail"></section>', '<section class="detail active" id="detail">' + initial + '</section>', 1)
    dest=folder/key/'index.html'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(page,encoding='utf-8')
print('Project deep links generated:',len(seen))
