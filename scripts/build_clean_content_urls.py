#!/usr/bin/env python3
"""Generate real GitHub Pages subdirectories for Lighting Guide and Blog pages.

The original HTML files remain in Git as editable source files. The published
artifact contains the canonical clean pages and redirect stubs for old links.
"""
from pathlib import Path
import re
from html import escape
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://www.omegaluxstudio.com"
GUIDES = {
    "sll": ("sll-code-2022", "SLL Code for Lighting 2022"),
    "lg4": ("sll-lg4-2006", "SLL LG4 Sports Lighting 2006"),
    "adm": ("adm-september-2020", "Abu Dhabi Lighting Manual September 2020"),
}
CANONICAL_RE = re.compile(r'<link\s+rel=["\x27]canonical["\x27][^>]*>', re.I)
URL_ATTR = re.compile(r'((?:href|action)\s*=\s*["\x27])([^"\x27]+)(["\x27])', re.I)
ARTICLE_RE = re.compile(r'^/?([a-z0-9][a-z0-9-]*)\.html$', re.I)

def canonical(page, url):
    tag = '<link rel="canonical" href="' + escape(url, quote=True) + '">'
    if CANONICAL_RE.search(page):
        return CANONICAL_RE.sub(tag, page, count=1)
    return page.replace("<head>", "<head>" + tag, 1)

def replace_title(page, title):
    return re.sub(r'<title>.*?</title>', '<title>' + escape(title) + '</title>',
                  page, count=1, flags=re.I | re.S)

def redirect(url):
    # Keep the query and fragment from old bookmarks. A meta refresh also
    # covers browsers that disable JavaScript.
    dest = escape(url, quote=True)
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="robots" content="noindex,follow">'
            '<link rel="canonical" href="' + DOMAIN + url + '">'
            '<meta http-equiv="refresh" content="0; url=' + dest + '">'
            '<script>location.replace(' + repr(url) +
            '+location.search+location.hash);</script>'
            '<title>Page moved – OMEGALUX Studio</title></head><body>'
            '<p>This page has moved to <a href="' + dest + '">its new address</a>.</p>'
            '</body></html>')

# A real index.html is created for each reference. Static hosts can serve and
# refresh these deep links without a fallback/router and without query strings.
guide_source = (ROOT / "lighting-guide" / "index.html").read_text(encoding="utf-8")
for key, (slug, title) in GUIDES.items():
    route = "/lighting-guide/" + slug + "/"
    page = canonical(guide_source, DOMAIN + route)
    page = replace_title(page, title + " – OMEGALUX Studio")
    target = ROOT / "lighting-guide" / slug / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page, encoding="utf-8")

# Article inventory comes from the live Blog index, not guessed filenames.
blog_file = ROOT / "blog" / "index.html"
blog_source = blog_file.read_text(encoding="utf-8")
article_names = sorted({
    m.group(1) for m in re.finditer(r'href=["\x27]/?([a-z0-9-]+)\.html(?:[?#][^"\x27]*)?["\x27]',
                                 blog_source, re.I)
    if (ROOT / (m.group(1) + ".html")).is_file()
} | {
    p.parent.name for p in (ROOT / "blog").glob("*/index.html")
})
assert article_names, "No Blog articles discovered: refusing to publish empty routes"
routes = {name + ".html": "/blog/" + name + "/" for name in article_names}

def hrefs_clean(page, current_route=None):
    def transform(match):
        prefix, raw, suffix = match.groups()
        bits = urlsplit(raw)
        if bits.scheme in ("mailto", "tel") or (bits.scheme and bits.scheme not in ("http", "https")):
            return match.group(0)
        if bits.netloc and bits.netloc.lower() not in ("omegaluxstudio.com", "www.omegaluxstudio.com"):
            return match.group(0)
        path = bits.path
        name = path.lstrip("/")
        if name in routes:
            new = routes[name]
        elif name in ("index.html",):
            new = "/"
        elif name in ("blog.html",):
            new = "/blog/"
        elif name in ("expertise.html",):
            new = "/about-us/"
        elif name in ("approach.html",):
            new = "/our-approach/"
        elif name in ("recommendations.html",):
            new = "/lighting-guide/"
        elif name in ("contact.html",):
            new = "/let's-talk/"
        elif not path and raw.startswith("#") and current_route:
            new = current_route
        else:
            return match.group(0)
        new += ("?" + bits.query if bits.query else "") + ("#" + bits.fragment if bits.fragment else "")
        return prefix + new + suffix
    return URL_ATTR.sub(transform, page)

# Preserve the Blog landing-page layout and content; change article destinations.
blog_file.write_text(hrefs_clean(blog_source), encoding="utf-8")

for name in article_names:
    filename = name + ".html"
    route = routes[filename]
    existing_page = ROOT / "blog" / name / "index.html"
    original_source = existing_page if existing_page.is_file() else ROOT / filename
    source = original_source.read_text(encoding="utf-8")
    page = hrefs_clean(source, current_route=route)
    # Articles were authored at /; their relative CSS/JS/images must continue
    # resolving against the domain root when served from /blog/article-slug/.
    if not re.search(r'<base\b', page, re.I):
        page = page.replace("<head>", '<head><base href="/">', 1)
    page = canonical(page, DOMAIN + route)
    # Existing OG and JSON-LD URLs should also name the new canonical page.
    for prefix in ("https://omegaluxstudio.com/", "https://www.omegaluxstudio.com/"):
        page = page.replace(prefix + filename, DOMAIN + route)
    output = ROOT / "blog" / name / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding="utf-8")
    # Keep old inbound links and search-engine results functional, then move to
    # the canonical article. The original source remains unchanged in Git.
    (ROOT / filename).write_text(redirect(route), encoding="utf-8")

# Homepage and other main landing pages may contain direct legacy links too.
for rel in ("index.html", "about-us/index.html", "our-approach/index.html",
            "projects/index.html"):
    p = ROOT / rel
    if p.exists():
        s = p.read_text(encoding="utf-8")
        new = hrefs_clean(s)
        if new != s:
            p.write_text(new, encoding="utf-8")

# The sitemap should advertise canonical clean article and standard paths.
sitemap = ROOT / "sitemap.xml"
if sitemap.is_file():
    xml = sitemap.read_text(encoding="utf-8")
    for filename, route in routes.items():
        xml = re.sub(r'https?://(?:www\.)?omegaluxstudio\.com/' + re.escape(filename),
                     DOMAIN + route, xml, flags=re.I)
    present = set(re.findall(r'<loc>(.*?)</loc>', xml))
    additions = []
    for slug, _ in GUIDES.values():
        url = DOMAIN + "/lighting-guide/" + slug + "/"
        if url not in present:
            additions.append("<url><loc>" + url + "</loc></url>")
    for route in routes.values():
        url = DOMAIN + route
        if url not in present:
            additions.append("<url><loc>" + url + "</loc></url>")
    if additions:
        xml = xml.replace("</urlset>", "\n" + "\n".join(additions) + "\n</urlset>")
    sitemap.write_text(xml, encoding="utf-8")

# Static build-time verification.
for key, (slug, _) in GUIDES.items():
    html = (ROOT / "lighting-guide" / slug / "index.html").read_text(encoding="utf-8")
    assert 'href="' + DOMAIN + "/lighting-guide/" + slug + '/"' in html
    assert 'src="/recommendations.js"' in html and 'src="/manuals.js"' in html
for filename, route in routes.items():
    html = (ROOT / route.lstrip("/") / "index.html").read_text(encoding="utf-8")
    assert '<base href="/">' in html
    assert '<link rel="canonical" href="' + DOMAIN + route + '">' in html
    assert 'href="/blog/"' in html, "Missing back link to Blog in " + filename
assert len(article_names) >= 10, "Unexpectedly low Blog article count"
assert not re.search(r'href=["\x27]/[a-z0-9-]+\.html', blog_file.read_text(encoding="utf-8"), re.I)
print("Clean URL build complete: 3 guide standards, " + str(len(article_names)) +
      " Blog articles, sitemap + inbound redirects; layout and article media retained.")
