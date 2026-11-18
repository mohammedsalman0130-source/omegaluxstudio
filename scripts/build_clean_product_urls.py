#!/usr/bin/env python3
"""Build real, refreshable /products/<category>/<Product-Name>/ paths.
Run from the repository root. Original HTML stays available as a fallback.
"""
from pathlib import Path
from html import unescape
import re
import sys

ROOT = Path(__file__).resolve().parents[1] / "products"
CATEGORIES = {
    "table": "table-lamps",
    "pendant": "pendants",
    "chandelier": "chandeliers",
    "wall": "wall-lights",
    "floor": "floor-lamps",
    "dining": "above-the-table",
}
CANON = "https://www.omegaluxstudio.com"
FILES = sorted(ROOT.glob("product-*.html")) + sorted(ROOT.glob("category-*.html"))
def title(html, pattern, fallback):
    match = re.search(pattern, html, re.I | re.S)
    return unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip() if match else fallback
def slug(name):
    value = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-")
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part) or "Design"
def replace_url(html, original, target):
    # Only URL attributes, not content, script payloads, or embedded base64 images.
    return re.sub(r'((?:href|action)\s*=\s*["\x27])(?:https?://(?:www\.)?omegaluxstudio\.com/products/)?(?:/products/)?' + re.escape(original) + r'(?=["\x27#?])',
                  lambda m: m.group(1) + target, html, flags=re.I)
sources = {}
urls = {}
seen = set()
for path in FILES:
    source = path.read_text(encoding="utf-8")
    if not source.strip():
        continue
    if path.name.startswith("category-"):
        category = path.stem.removeprefix("category-")
        route = ("/products/" if category == "all" else f"/products/{CATEGORIES.get(category, category)}/")
    else:
        match = re.fullmatch(r"product-([a-z]+)-(\d+)", path.stem)
        if not match:
            continue
        cat = CATEGORIES.get(match.group(1), match.group(1))
        product_name = title(source, r"<h1[^>]*>(.*?)</h1>", path.stem)
        route = f"/products/{cat}/{slug(product_name)}/"
    if route in seen:
        raise ValueError(f"Duplicate product URL: {route}")
    seen.add(route)
    sources[path] = source
    urls[path.name] = route
# Match navigational attributes once per document rather than scanning every
# product file hundreds of times (product images include large embedded data URLs).
LINK_RE = re.compile(r'((?:href|action)\s*=\s*["\x27])([^"\x27]+)(["\x27])', re.I)
def normalize(html):
    def rewrite(m):
        prefix, raw, suffix = m.groups()
        if raw.startswith(("https://", "http://")):
            match = re.match(r'https?://(?:www\.)?omegaluxstudio\.com(/.*)', raw, re.I)
            if not match:
                return m.group(0)
            raw_path = match.group(1)
        else:
            raw_path = raw
        path, sep, extra = raw_path.partition("#")
        path, query_sep, query = path.partition("?")
        name = path.removeprefix("/products/").removeprefix("/")
        route = urls.get(name)
        if name == "index.html":
            route = "/products/"
        if not route:
            return m.group(0)
        return prefix + route + ("?" + query if query_sep else "") + ("#" + extra if sep else "") + suffix
    return LINK_RE.sub(rewrite, html)
for original, source in sources.items():
    route = urls[original.name]
    # All images, styles, scripts and generated download dependencies remain in /products/.
    page = normalize(source)
    # The shared base keeps media/CSS/JS working on nested pages. Keep
    # fragment-only links local to the product page, not the /products/ base.
    page = re.sub(r'((?:href|action)\s*=\s*["\x27])#([^"\x27]*)', lambda m: m.group(1) + route + "#" + m.group(2), page, flags=re.I)
    page = re.sub(r'<link\s+rel=["\x27]canonical["\x27][^>]*>', "", page, count=1, flags=re.I)
    page = page.replace("<head>", f'<head><base href="/products/"><link rel="canonical" href="{CANON}{route}">', 1)
    destination = ROOT / route.removeprefix("/products/") / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page, encoding="utf-8")
    # Preserve original filename route as a working fallback with its new canonical.
    fallback = normalize(source)
    fallback = re.sub(r'<link\s+rel=["\x27]canonical["\x27][^>]*>', "", fallback, count=1, flags=re.I)
    fallback = fallback.replace("<head>", f'<head><link rel="canonical" href="{CANON}{route}">', 1)
    original.write_text(fallback, encoding="utf-8")
# Update the catalog entrance links, too.
home = ROOT / "index.html"
if home.exists():
    source = home.read_text(encoding="utf-8")
    new = normalize(source)
    if new != source:
        home.write_text(new, encoding="utf-8")
print(f"Generated {len(sources)} clean URLs. Vein Globe: {urls.get('product-table-001.html', 'missing')}")
