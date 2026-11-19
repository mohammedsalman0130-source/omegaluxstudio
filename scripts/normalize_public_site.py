#!/usr/bin/env python3
"""Normalize every public HTML navigation URL, canonical and visible date.

Keeps layout, assets, IDs and JS payloads intact. Old .html pages remain
as inbound redirect/fallback pages; main navigation always uses folder URLs.
"""
from pathlib import Path
from urllib.parse import urlsplit
import re, html
import xml.etree.ElementTree as ET
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
HOST='https://omegaluxstudio.com'
PRODUCTS=ROOT/'products'
CATEGORY={'table':'table-lamps','pendant':'pendants','chandelier':'chandeliers',
          'wall':'wall-lights','floor':'floor-lamps','dining':'above-the-table',
          'all':''}
ROUTES={
    'index.html':'/','expertise.html':'/about-us/','approach.html':'/our-approach/',
    'blog.html':'/blog/','recommendations.html':'/lighting-guide/',
    'contact.html':"/let's-talk/",
}
for f in (ROOT/'blog').glob('*/index.html'):
    ROUTES[f.parent.name+'.html']='/blog/'+f.parent.name+'/'
for key,category in CATEGORY.items():
    ROUTES['products/category-'+key+'.html']='/products/'+(category+'/' if category else '')
# The product builder already has authoritative named routes in canonical tags.
product_re=re.compile(r'<link\b(?=[^>]*\brel=["\x27]canonical["\x27])[^>]*\bhref=(["\x27])(.*?)\1[^>]*>',re.I)
for f in PRODUCTS.glob('product-*.html'):
    m=product_re.search(f.read_text(encoding='utf-8'))
    if m:
        url=urlsplit(m.group(2))
        if url.path.startswith('/products/') and not url.path.endswith('.html'):
            ROUTES['products/'+f.name]=url.path
    if 'products/'+f.name not in ROUTES:
        raise ValueError('No clean product route for '+f.name)
# Also recognize the full domain's direct .html filenames in legacy navigation.
URL_ATTR=re.compile(r'(?P<prefix>\b(?:href|action)\s*=\s*)(?P<quote>["\x27])(?P<url>.*?)(?P=quote)',re.I|re.S)
BASE_RE=re.compile(r'<base\b[^>]*href=(["\x27])(.*?)\1',re.I)
CANONICAL_RE=re.compile(r'<link\b(?=[^>]*\brel=["\x27]canonical["\x27])[^>]*>',re.I)
FOOTER_RE=re.compile(r'©\s*(?:<span\b[^>]*\bid=["\x27]year["\x27][^>]*>\s*)?(?:19|20)\d{2}\s*(?:</span>)?\s*',re.I)
REMOVE_DATE_META=re.compile(r'<meta\b(?=[^>]*(?:article:(?:published|modified)_time|(?:name|itemprop)=["\x27](?:date|datePublished|dateModified)["\x27]))[^>]*>',re.I)
DATE_ELEMENT=re.compile(r'<(?:time|span|small)\b(?=[^>]*(?:class|itemprop)=["\x27][^"\x27]*(?:datePublished|dateModified|publish-date|post-date|published-date|updated-date)[^"\x27]*["\x27])[^>]*>[\s\S]*?</(?:time|span|small)>',re.I)
hit=Counter();changed=[]

def clean_hrefs(source,rel):
    def attr(match):
        url=match.group('url')
        if not url or url.startswith(('data:','javascript:','mailto:','tel:','//')):return match.group(0)
        bits=urlsplit(url)
        if bits.scheme and bits.scheme not in ('http','https'):return match.group(0)
        if bits.netloc and bits.netloc.lower() not in ('omegaluxstudio.com','www.omegaluxstudio.com'):return match.group(0)
        path=bits.path
        if not path:return match.group(0)
        bare=path.lstrip('/')
        keys=[bare]
        if rel.startswith('products/') and not bare.startswith('products/'):
            keys.insert(0,'products/'+bare)
        route=('/products/' if rel.startswith('products/') and bare=='index.html' and not path.startswith('/')
               else '/projects/' if rel.startswith('projects/') and bare=='index.html' and not path.startswith('/')
               else next((ROUTES[k] for k in keys if k in ROUTES),None))
        if not route:
            if path.endswith('/index.html'):
                route=path.removesuffix('index.html')
            elif path=='/index.html':
                route='/'
            else:
                return match.group(0)
        # Keep URL query/fragment (e.g. product variant, DIALux report print view).
        target=route+('?' + bits.query if bits.query else '')+('#'+bits.fragment if bits.fragment else '')
        if target!=url:hit['legacy_urls_cleaned']+=1
        return match.group('prefix')+match.group('quote')+target+match.group('quote')
    return URL_ATTR.sub(attr,source)

for path in sorted(ROOT.rglob('*.html')):
    rel=path.relative_to(ROOT).as_posix()
    source=path.read_text(encoding='utf-8')
    result=clean_hrefs(source,rel)
    # Remove only visible site age, never technical standard edition labels.
    result,n=FOOTER_RE.subn('© ',result)
    hit['dated_footers_removed']+=n
    result,n=DATE_ELEMENT.subn('',result)
    hit['publication_date_blocks_removed']+=n
    result,n=REMOVE_DATE_META.subn('',result)
    hit['dated_article_metadata_removed']+=n
    if path.name=='index.html':
        target=HOST+('/' if rel=='index.html' else '/'+rel.removesuffix('index.html'))
        tag='<link rel="canonical" href="'+html.escape(target,quote=False)+'">'
        if CANONICAL_RE.search(result):
            result=CANONICAL_RE.sub(tag,result,count=1)
        else:
            result=result.replace('<head>','<head>'+tag,1)
        # Blog/article and project pages have per-page identity. Fix social URLs
        # without inventing a new publication date.
        if rel.startswith(('blog/','projects/')):
            result=re.sub(r'(<meta\b(?=[^>]*property=["\x27]og:url["\x27])[^>]*\bcontent=)(["\x27]).*?\2',
                          lambda m:m.group(1)+m.group(2)+target+m.group(2),result,count=1,flags=re.I)
    if result!=source:
        path.write_text(result,encoding='utf-8')
        changed.append(rel)
# Only public pages with real index.html files are listed in the sitemap.
names=sorted({'/' if p.relative_to(ROOT).as_posix()=='index.html'
              else '/'+p.relative_to(ROOT).as_posix().removesuffix('index.html')
              for p in ROOT.rglob('index.html')})
xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
xml+=''.join('  <url><loc>'+html.escape(HOST+url,quote=False)+'</loc></url>\n' for url in names)
xml+='</urlset>\n'
sitemap=ROOT/'sitemap.xml'
if not sitemap.exists() or sitemap.read_text(encoding='utf-8')!=xml:
    sitemap.write_text(xml,encoding='utf-8')
    changed.append('sitemap.xml')
print('SITE NORMALIZED',len(changed),'changed files:',len(names),'canonical sitemap pages')
print('DETAILS',dict(hit))
print('SAMPLE_CHANGES',changed[:30])
