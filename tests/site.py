"""Check a Jekyll build: python3 tests/site.py _site [--drafts]."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

root = Path(sys.argv[1])

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        self.urls.extend(value for name, value in attrs if name in ('href', 'src') and value)

pages = [root / 'index.html', root / 'projects/index.html', root / 'blog/index.html']
posts = list((root / 'blog').glob('*/*/*/*/index.html'))
assert bool(posts) == ('--drafts' in sys.argv), 'Sample draft visibility is incorrect'
for page in pages + posts:
    html = page.read_text()
    assert '{{' not in html and '{%' not in html, f'Unrendered template: {page}'
    assert '<main id="main">' in html, f'Missing main landmark: {page}'
    links = Links()
    links.feed(html)
    for url in links.urls:
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        target = root / unquote(parsed.path.lstrip('/')) if parsed.path.startswith('/') else page.parent / unquote(parsed.path)
        if target.is_dir():
            target /= 'index.html'
        assert target.is_file(), f'Broken link in {page}: {url}'
assert 'No posts yet' in pages[2].read_text() if not posts else 'Your first post starts here' in pages[2].read_text()
assert not (root / 'chatgpt.html').exists(), 'Removed archive page is still published'
for legacy in ['counter.html', 'javamax.html', '204/204.html', 'button/button.html']:
    assert (root / legacy).read_bytes() == Path(legacy).read_bytes(), f'Legacy page changed: {legacy}'
print(f'Build checks passed: {len(pages) + len(posts)} pages, internal links, draft visibility, and legacy pages.')
