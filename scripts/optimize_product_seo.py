#!/usr/bin/env python3
"""Add search metadata to the existing lighting catalogue without changing its UI.

This tool touches ONLY the HTML <head>. It never modifies <body>, image tags,
CSS, JavaScript, layout, product codes, route slugs, or quotation controls.
Run after the canonical URL normalization step during GitHub Pages builds.
"""
from __future__ import annotations

from html import escape, unescape
from pathlib import Path
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
        "Alabaster Lighting Collection UAE | OMEGALUX Studio",
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


def first_image(document: str) -> str | None:
    # Existing local product photograph only. Do not synthesize images or use
    # inline base64 / diagrams as Google search image URLs.
    for tag in IMG.findall(document):
        m = SRC.search(tag)
        if not m:
            continue
        src = unescape(m.group(1))
        if not src.startswith("media/editorial/"):
            continue
        candidate = PRODUCTS / src
        if candidate.is_file() and candidate.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"}:
            return HOST + "/products/" + src
    return None


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
    prefix = f"{name} ({ref}): " if ref else f"{name}: "
    suffix = " Request a quotation for Abu Dhabi & Dubai, UAE."
    allowed = max(0, 157 - len(prefix) - len(suffix))
    summary = trim(description, min(allowed, 78)) if allowed > 16 else category
    meta = trim(prefix + summary.rstrip(".") + "." + suffix, 160)
    title = trim(f"{name} {category.title()} | OMEGALUX Studio", 68)

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
    photo = first_image(document)
    if photo:
        schema["image"] = photo
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
    print(f"SEO metadata applied to {count} of {len(paths)} existing catalogue pages. All bodies and product images preserved.")
