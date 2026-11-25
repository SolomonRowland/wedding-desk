#!/usr/bin/env python3
"""Build The Wedding Desk.

  python3 build.py          index.html (the live site) and build/preview.html (one file, for previews)
  python3 build.py --test   also build/site/, the same site wired to a fake sign-in server for tests

The app is one page: src/app.html holds all markup, styles and code. This script fills in
the example wedding (src/data.json), the Privacy Policy text (src/legal.json) and the
Supabase project URL and publishable key (src/supabase-keys.json). After a build, bump
CACHE in sw.js so phones pick up the new version.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
compact = lambda p: json.dumps(json.loads(read(p)), ensure_ascii=False, separators=(',', ':'))

def write(p, text):
    p = os.path.join(ROOT, p); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text)

def page(keys):
    src = read('src/app.html').replace('__LEGAL__', compact('src/legal.json'))
    src = src.replace('__SB_URL__', keys['url']).replace('__SB_KEY__', keys['key'])
    data = compact('src/data.json')
    preview = src.replace('__DATA__', data, 1)                      # loads fonts and libraries from CDNs
    body = src[src.index('<style>'):].replace('__DATA__', data, 1)   # the site ships its own copies
    body = body.replace('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'lib/jspdf.umd.min.js')
    body = body.replace('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'lib/xlsx.full.min.js')
    assert body.count('</script>') == 1 and 'cdnjs' not in body and 'googleapis' not in body
    body = body.replace('</script>\n', read('src/sw-register.js') + '</script>\n', 1)
    return preview, read('src/site-head.html').rstrip('\n') + '\n' + body + '\n</body>\n</html>\n'

keys_path = os.path.join(ROOT, 'src/supabase-keys.json')
keys = json.load(open(keys_path)) if os.path.exists(keys_path) else {'url': '', 'key': ''}
preview, site = page(keys)
write('index.html', site); write('build/preview.html', preview)
print('index.html', len(site), 'bytes; sign-in', 'on' if keys['url'] else 'off')

if '--test' in sys.argv:
    _, test = page({'url': 'https://fake.supabase.co', 'key': 'fake-anon-key-for-testing-only-123'})
    write('build/site/index.html', test)
    for name in ['lib', 'fonts', 'icons', 'manifest.webmanifest', 'sw.js', 'wedding-desk-template.xlsx']:
        link = os.path.join(ROOT, 'build/site', name)
        if not os.path.lexists(link): os.symlink(os.path.join(ROOT, name), link)
    print('build/site ready')
