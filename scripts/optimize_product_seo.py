#!/usr/bin/env python3
"""Add search metadata to the existing lighting catalogue without changing its UI.

Only HTML heads and crawlable image copies and their sitemap are written. It never modifies <body>, image tags,
CSS, JavaScript, layout, product codes, route slugs, or quotation controls.
Run after the canonical URL normalization step during GitHub Pages builds.
"""
from __future__ import annotations

from html import escape, unescape
from pathlib import Path
import base64
import unicodedata
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "products"
HOST = "https://www.omegaluxstudio.com"

# Human-facing labels in the browser tab and search results, NOT page headings.
CATEGORY = {
    "table-lamps": (
        "Alabaster Table Lamps in Dubai & Abu Dhabi | OMEGALUX Studio",
        "Explore alabaster table lamps for luxury villas and interiors in Dubai and Abu Dhabi. View designs and request a supply quotation from OMEGALUX Studio.",
        "Alabaster table lamps",
    ),
    "pendants": (
        "Alabaster Pendant Lights UAE | OMEGALUX Studio",
        "Explore decorative alabaster pendant lights for UAE villas, dining rooms and luxury interiors. Request a quotation in Dubai or Abu Dhabi.",
        "Alabaster pendant lights",
    ),
    "chandeliers": (
        "Luxury Alabaster Chandeliers UAE | OMEGALUX Studio",
        "Explore luxury alabaster chandeliers for villas, dining rooms and commercial interiors in Dubai and Abu Dhabi. Request a quotation from OMEGALUX Studio.",
        "Alabaster chandeliers",
    ),
    "wall-lights": (
        "Alabaster Wall Lights UAE | OMEGALUX Studio",
        "Discover alabaster wall lights for luxury interiors in Dubai, Abu Dhabi and across the UAE. Explore designs and request a lighting supply quotation.",
        "Alabaster wall lights",
    ),
    "floor-lamps": (
        "Luxury Floor Lamps UAE | OMEGALUX Studio",
        "Explore decorative floor lamps and alabaster lighting for villas and hospitality interiors in Dubai and Abu Dhabi. Request a supply quotation.",
        "Decorative floor lamps",
    ),
    "above-the-table": (
        "Dining Table Chandeliers & Pendants UAE | OMEGALUX Studio",
        "Explore pendant lights and chandeliers for dining tables in Dubai and Abu Dhabi. Discover alabaster designs and request a supply quotation.",
        "Dining table lighting",
    ),
    "all-products": (
        "All Alabaster Lighting Products UAE | OMEGALUX Studio",
        "Explore OMEGALUX Studio's alabaster table lamps, pendants, chandeliers, wall lights and floor lamps. Request a quotation for supply across the UAE.",
        "Alabaster lighting",
    ),
}
PRODUCT_TYPES = {
    "table-lamps": "table lamp",
    "pendants": "pendant light",
    "chandeliers": "chandelier",
    "wall-lights": "wall light",
    "floor-lamps": "floor lamp",
}
CANONICAL = re.compile(r'<link\b(?=[^>]*\brel=["\x27]canonical["\x27])[^>]*\bhref=["\x27]([^"\x27]+)["\x27][^>]*>', re.I)
HEAD = re.compile(r'(<head\b[^>]*>)(.*?)(</head\s*>)', re.I | re.S)
TITLE = re.compile(r'<title\b[^>]*>.*?</title\s*>', re.I | re.S)
META_DESC = re.compile(r'<meta\b(?=[^>]*\bname=["\x27]description["\x27])[^>]*>', re.I)
OLD_SEO = re.compile(r'<script\b(?=[^>]*\bdata-ol-seo=["\x27]1["\x27])[^>]*>.*?</script\s*>', re.I | re.S)
DATA = re.compile(r'<script\b(?=[^>]*\bid=["\x27]page-data["\x27])[^>]*>(.*?)</script\s*>', re.I | re.S)
IMG = re.compile(r'<img\b[^>]*>', re.I)
SRC = re.compile(r'\bsrc=["\x27]([^"\x27]+)["\x27]', re.I)
H1 = re.compile(r'<h1\b[^>]*>(.*?)</h1\s*>', re.I | re.S)


def trim(s: str, max_len: int) -> str:
    s = re.sub(r'\s+', ' ', unescape(str(s))).strip()
    if len(s) <= max_len:
        return s
    return s[:max_len - 1].rsplit(' ', 1)[0].rstrip(' ,.;:') + '…'


SITEMAPS = "http://www.sitemaps.org/schemas/sitemap/0.9"
IMAGES = "http://www.google.com/schemas/sitemap-image/1.1"
IMG_SRC = re.compile(r'<img\b[^>]*?\ssrc="([^"]+)"', re.I)


def image_url(src, base, filename):
    if src.startswith("data:image/webp;base64,"):
        data = base64.b64decode(src.partition(",")[2], validate=True)
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise ValueError(f"Invalid WebP gallery image for {filename}")
        dest = ROOT / "assets" / "search-images" / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists() or dest.read_bytes() != data:
            dest.write_bytes(data)
        return f"{HOST}/assets/search-images/{filename}"
    url = urlsplit(urljoin(HOST + base, unescape(src)))
    path = ROOT / unquote(url.path).lstrip("/")
    if url.netloc != urlsplit(HOST).netloc or not path.is_file():
        raise ValueError(f"Missing local image for {filename}")
    return HOST + url.path


def product_images(document, folder, slug):
    gallery = re.search(r'<div class="picture-pair\b[^"]*">(.*?)</div>', document, re.S)
    if not gallery:
        raise ValueError(f"Missing product gallery on {slug}")
    return [image_url(src, "/products/", f"{folder}-{slug}-{n}.webp")
            for n, src in enumerate(IMG_SRC.findall(gallery[1]), 1)]


def write_image_sitemap():
    entries = {}
    for path in sorted((ROOT / "products").glob("*/*/index.html")):
        document = path.read_text(encoding="utf-8")
        schema = json.loads(re.search(r'<script type="application/ld\+json" data-ol-seo="1">(.*?)</script>', document, re.S)[1])
        entries[schema["url"]] = schema["image"]

    for path in sorted((ROOT / "blog").glob("*/index.html")):
        document = path.read_text(encoding="utf-8")
        imgs = [src for src in IMG_SRC.findall(document)
                if "assets/journal/" in src or src.startswith("data:image/webp;base64,")]
        if imgs:
            entries[f"{HOST}/blog/{path.parent.name}/"] = [
                image_url(src, "/", f"article-{path.parent.name}-{n}.webp")
                for n, src in enumerate(dict.fromkeys(imgs), 1)
            ]

    project_page = (ROOT / "projects/index.html").read_text(encoding="utf-8")
    projects = json.loads(re.search(r'<script id="project-data" type="application/json">(.*?)</script>', project_page, re.S)[1])
    for project in projects:
        title = unicodedata.normalize("NFKD", project["title"]).encode("ascii", "ignore").decode()
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        sources = [project["heroImg"]]
        sources.extend(view["render"] for area in project["areas"] for view in area["views"] if view.get("render"))
        # Keep the existing cover/render order (and inline WebP filenames).
        # Include existing publicly displayed technical comparisons and site
        # execution photos, but do not expose additional drawings or files.
        sources.extend(view["map"] for area in project["areas"] for view in area["views"] if view.get("map"))
        execution = project.get("execution") or {}
        sources.extend(photo["src"] for photo in execution.get("images", []) if photo.get("src"))
        sources.extend(video["poster"] for video in execution.get("videos", []) if video.get("poster"))
        entries[f"{HOST}/projects/{slug}/"] = [
            image_url(src, "/projects/", f"project-{slug}-{n}.webp")
            for n, src in enumerate(dict.fromkeys(sources), 1)
        ]

    ET.register_namespace("", SITEMAPS)
    ET.register_namespace("image", IMAGES)
    root = ET.Element(f"{{{SITEMAPS}}}urlset")
    for page, images in sorted(entries.items()):
        if not images or not (ROOT / urlsplit(page).path.lstrip("/") / "index.html").is_file():
            raise ValueError(f"Invalid image sitemap entry for {page}")
        url = ET.SubElement(root, f"{{{SITEMAPS}}}url")
        ET.SubElement(url, f"{{{SITEMAPS}}}loc").text = page
        for photo in dict.fromkeys(images):
            img = ET.SubElement(url, f"{{{IMAGES}}}image")
            ET.SubElement(img, f"{{{IMAGES}}}loc").text = photo
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(ROOT / "sitemap-images.xml", encoding="utf-8", xml_declaration=True)


def identify_product(document: str, folder: str, product_slug: str) -> tuple[str, str, dict] | None:
    data_match = DATA.search(document)
    if not data_match:
        return None
    try:
        data = json.loads(data_match.group(1))
    except json.JSONDecodeError:
        raise AssertionError("Invalid existing page-data JSON in " + folder)
    if not isinstance(data, dict) or not data.get("name"):
        return None
    name = str(data["name"]).strip()
    category = PRODUCT_TYPES[folder]
    ref = str(data.get("ref") or "").strip()
    description = str(data.get("description") or "").strip()
    variants = data.get("variants") or []
    variant = variants[0] if isinstance(variants, list) and variants and isinstance(variants[0], dict) else {}
    material = str(variant.get("materials") or "")
    if "alabaster" in material.lower():
        category = "alabaster " + category

    # Keep descriptive, location-focused snippets while preserving the original
    # product name and reference. No price or made-up availability claim.
    prefix = f"{name} — {category} ({ref}): " if ref else f"{name} — {category}: "
    suffix = " Request a quotation for Abu Dhabi & Dubai, UAE."
    allowed = max(0, 157 - len(prefix) - len(suffix))
    summary = trim(description, min(allowed, 78)) if allowed > 16 else ""
    meta = trim(prefix + summary.rstrip(".…") + "." + suffix, 160) if summary else trim(f"{name} {category}. {suffix.strip()}", 160)
    title = f"{name} {category.title()} UAE | OMEGALUX Studio"
    if len(title) > 72:
        title = f"{name} {category.title()} | OMEGALUX Studio"

    schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "description": description or f"{name} {category}",
        "category": category,
        "url": HOST + f"/products/{folder}/{product_slug}/",
    }
    if ref:
        schema["sku"] = ref
    if material:
        schema["material"] = material
    if variant.get("dimensions"):
        schema["additionalProperty"] = [{
            "@type": "PropertyValue",
            "name": "Dimensions",
            "value": str(variant["dimensions"]),
        }]
    schema["image"] = product_images(document, folder, product_slug)
    # Intentionally no Offer, price, GTIN, manufacturer, or invented brand.
    return title, meta, schema


def update_page(path: Path) -> bool:
    relative = path.relative_to(PRODUCTS).parts
    if relative == ("index.html",):
        title = "Alabaster Lighting Collection UAE | OMEGALUX Studio"
        meta = ("Explore decorative alabaster lighting by OMEGALUX Studio: "
                "table lamps, pendants, chandeliers, wall and floor lights. "
                "Enquire in Dubai and Abu Dhabi.")
        schema = None
    elif len(relative) == 2 and relative[1] == "index.html" and relative[0] in CATEGORY:
        title, meta, _ = CATEGORY[relative[0]]
        schema = None
    elif len(relative) == 3 and relative[0] in PRODUCT_TYPES and relative[2] == "index.html":
        source = path.read_text(encoding="utf-8")
        product = identify_product(source, relative[0], relative[1])
        if not product:
            raise AssertionError("Cannot find product data: " + str(path))
        title, meta, schema = product
    else:
        return False

    source = path.read_text(encoding="utf-8")
    head_match = HEAD.search(source)
    if not head_match:
        raise AssertionError("Missing HTML head: " + str(path))
    prefix, inner, closing = head_match.groups()
    canonical = CANONICAL.search(inner)
    route = "/" + path.relative_to(ROOT).as_posix().removesuffix("index.html")
    required = HOST + route
    if not canonical or canonical.group(1) != required:
        raise AssertionError(f"Canonical must be {required}, got {canonical.group(1) if canonical else 'none'}")

    if not TITLE.search(inner):
        raise AssertionError("Missing HTML title " + str(path))
    inner = TITLE.sub("<title>" + escape(title) + "</title>", inner, count=1)
    inner = META_DESC.sub("", inner)
    inner = OLD_SEO.sub("", inner)
    tags = '<meta name="description" content="' + escape(meta, quote=True) + '">'
    if schema is not None:
        # JSON within a non-executing script inside HEAD. Escape HTML-sensitive
        # characters so untrusted product copy cannot break the HTML element.
        raw = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
        raw = raw.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
        tags += '<script type="application/ld+json" data-ol-seo="1">' + raw + '</script>'
    updated = source[:head_match.start()] + prefix + inner + tags + closing + source[head_match.end():]

    # Explicit protection of what the user asked to preserve.
    assert source[head_match.end():] == updated[HEAD.search(updated).end():], (
        "Body/image/layout changes prohibited: " + str(path)
    )
    if updated != source:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


if __name__ == "__main__":
    paths = [PRODUCTS / "index.html"]
    paths += sorted(PRODUCTS.glob("*/index.html"))
    for family in PRODUCT_TYPES:
        paths += sorted((PRODUCTS / family).glob("*/index.html"))
    paths = list(dict.fromkeys(paths))
    count = sum(update_page(path) for path in paths)
    write_image_sitemap()
    print(f"SEO metadata applied to {count} of {len(paths)} existing catalogue pages. All bodies and product images preserved.")
