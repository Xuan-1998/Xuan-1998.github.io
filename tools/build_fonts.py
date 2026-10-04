"""Subset the two web fonts to the text the site uses.

Run from the repo root after editing headings in _data/i18n.yml:

    python tools/build_fonts.py --src DIR

DIR must contain SourceSerif4-Var.ttf (Source Serif 4, variable) and
NotoSerifSC-Bold.otf (Noto Serif SC, SubsetOTF/SC). Needs fonttools, brotli, pyyaml.

Outputs assets/fonts/*.woff2 and _includes/fonts.html. The Chinese serif is split in two:
a small "core" file with the characters used in serif text today, and an "ext" file with the
3,755 most common characters, which a browser only downloads if a heading uses a character
that is missing from the core file.
"""
import argparse
import os

import yaml
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

# i18n.yml paths rendered in the serif face (a * matches any list index or key).
SERIF_KEYS = [
    'hero.h1_line1', 'hero.h1_line2',
    'works.h2_line1', 'works.h2_line2', 'works.cards.*.title',
    'agents.h2_line1', 'agents.h2_line2', 'agents.loop_title', 'agents.stages.*.name',
    'agents.reef.title', 'agents.coral.title',
    'papers.h2_line1', 'papers.h2_line2',
    'research.h2', 'research.cards.*.title',
    'honors.h2', 'honors.education_label', 'honors.positions_label', 'honors.awards_label',
    'honors.service_label', 'honors.mentoring_label',
    'contact.h2_line1', 'contact.h2_line2',
    'path.items.*.org',
    'nav.work', 'nav.agents', 'nav.papers', 'nav.research', 'nav.honors', 'nav.contact',
    'notfound.title', 'redirect.title',
    'nav.comms', 'comms.h2_line1', 'comms.h2_line2', 'comms.items.*.name',
    'earlier.h2', 'earlier.channel', 'honors.teaching_label', 'honors.editorial_label',
    'research.rows.*.title', 'writing.h2_line1', 'writing.h2_line2', 'honors.reviewing_label',
]

LATIN = [(0x20, 0x7E), (0xA0, 0xFF), (0x131, 0x131), (0x152, 0x153), (0x2BB, 0x2BC), (0x2C6, 0x2C6),
         (0x2DA, 0x2DA), (0x2DC, 0x2DC), (0x2010, 0x2011), (0x2018, 0x201E), (0x2022, 0x2022),
         (0x2026, 0x2026), (0x2032, 0x2033), (0x2039, 0x203A), (0x2044, 0x2044), (0x20AC, 0x20AC),
         (0x2122, 0x2122), (0x2190, 0x2193), (0x2212, 0x2212)]

CJK_PUNCT = '，。：；、！？“”‘’（）《》〈〉「」『』【】…·－'

# CJK characters written directly in templates in the serif face (follower count unit).
TEMPLATE_CJK = '万'

FEATURES = ['kern', 'liga', 'calt', 'lnum', 'tnum', 'pnum', 'onum', 'palt', 'halt', 'locl']


def lookup(node, parts):
    if not parts:
        yield node
        return
    head, rest = parts[0], parts[1:]
    if head == '*':
        children = node.values() if isinstance(node, dict) else node if isinstance(node, list) else []
        for child in children:
            yield from lookup(child, rest)
    elif isinstance(node, dict) and head in node:
        yield from lookup(node[head], rest)


def strings(node):
    if isinstance(node, dict):
        for v in node.values():
            yield from strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from strings(v)
    elif node is not None:
        yield str(node)


def is_cjk(ch):
    cp = ord(ch)
    return 0x3000 <= cp <= 0x303F or 0x3400 <= cp <= 0x9FFF or 0xF900 <= cp <= 0xFAFF or 0xFF00 <= cp <= 0xFFEF \
        or ch in CJK_PUNCT


def gb2312_level1():
    out = set()
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(bytes([hi, lo]).decode('gb2312'))
            except UnicodeDecodeError:
                pass
    return out


def to_ranges(cps):
    cps = sorted(set(cps))
    out = []
    start = prev = None
    for cp in cps:
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            out.append((start, prev))
            start = prev = cp
    if start is not None:
        out.append((start, prev))
    return out


def css_ranges(ranges):
    return ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in ranges)


def save_subset(font, unicodes, path):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = FEATURES
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    s = subset.Subsetter(opts)
    s.populate(unicodes=unicodes)
    s.subset(font)
    font.flavor = 'woff2'
    font.save(path)
    return os.path.getsize(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--root', default='.')
    a = ap.parse_args()

    data = yaml.safe_load(open(os.path.join(a.root, '_data/i18n.yml'), encoding='utf-8'))
    zh = data['zh']
    serif_text = ''.join(s for k in SERIF_KEYS for v in lookup(zh, k.split('.')) for s in strings(v))
    core = {ch for ch in serif_text if is_cjk(ch)} | set(CJK_PUNCT) | set(TEMPLATE_CJK)
    everything = {ch for s in strings(zh) for ch in s if is_cjk(ch)}
    ext = (gb2312_level1() | everything) - core

    fonts_dir = os.path.join(a.root, 'assets/fonts')
    os.makedirs(fonts_dir, exist_ok=True)

    latin_cps = [cp for lo, hi in LATIN for cp in range(lo, hi + 1)]
    ss = TTFont(os.path.join(a.src, 'SourceSerif4-Var.ttf'))
    ss = instantiateVariableFont(ss, {'wght': (400, 700), 'opsz': (16, 60)})
    n_latin = save_subset(ss, latin_cps, os.path.join(fonts_dir, 'source-serif-4-latin.woff2'))

    noto_path = os.path.join(a.src, 'NotoSerifSC-Bold.otf')
    core_cps = sorted(ord(c) for c in core)
    ext_cps = sorted(ord(c) for c in ext)
    n_core = save_subset(TTFont(noto_path), core_cps, os.path.join(fonts_dir, 'noto-serif-sc-700-core.woff2'))
    n_ext = save_subset(TTFont(noto_path), ext_cps, os.path.join(fonts_dir, 'noto-serif-sc-700-ext.woff2'))

    ext_range = 'U+3000-303F,U+3400-4DBF,U+4E00-9FFF,U+F900-FAFF,U+FF00-FFEF'
    css = (
        "<style>\n"
        "@font-face{font-family:\"XJ Serif\";font-style:normal;font-weight:400 700;font-display:swap;"
        "src:url(\"{{ '/assets/fonts/source-serif-4-latin.woff2' | relative_url }}\") format(\"woff2\");"
        f"unicode-range:{css_ranges(LATIN)}}}\n"
        "@font-face{font-family:\"XJ Serif SC\";font-style:normal;font-weight:700;font-display:swap;"
        "src:url(\"{{ '/assets/fonts/noto-serif-sc-700-ext.woff2' | relative_url }}\") format(\"woff2\");"
        f"unicode-range:{ext_range}}}\n"
        "@font-face{font-family:\"XJ Serif SC\";font-style:normal;font-weight:700;font-display:swap;"
        "src:url(\"{{ '/assets/fonts/noto-serif-sc-700-core.woff2' | relative_url }}\") format(\"woff2\");"
        f"unicode-range:{css_ranges(to_ranges(core_cps))}}}\n"
        "</style>\n"
    )
    with open(os.path.join(a.root, '_includes/fonts.html'), 'w', encoding='utf-8') as f:
        f.write(css)
    print(f'latin {n_latin/1024:.0f} KB; zh core {len(core_cps)} chars {n_core/1024:.0f} KB; '
          f'zh ext {len(ext_cps)} chars {n_ext/1024:.0f} KB')


if __name__ == '__main__':
    main()
