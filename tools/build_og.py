"""Render the 1200x630 social preview images from the hero text in _data/i18n.yml.

    python tools/build_og.py --src DIR

DIR must contain SourceSerif4-Var.ttf and NotoSerifSC-Bold.otf (see build_fonts.py) and
portrait-bust.png (the hero photo with a transparent background). Needs pillow and pyyaml.
"""
import argparse
import math
import os
import random

import yaml
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
SEA, SEA_DEEP = (12, 42, 51), (7, 27, 33)
IVORY = (244, 239, 229)
IVORY_2 = (244, 239, 229, 190)
CORAL = (239, 127, 96)
HUES = [(95, 188, 176), (239, 127, 96), (230, 200, 143), (134, 185, 216)]


def serif(src, size, wght=700):
    f = ImageFont.truetype(os.path.join(src, 'SourceSerif4-Var.ttf'), size)
    f.set_variation_by_axes([wght, min(60, max(8, size))])
    return f


def background():
    img = Image.new('RGB', (W, H), SEA)
    px = img.load()
    for y in range(H):
        k = y / H
        row = tuple(round(SEA[i] * (1 - k) + SEA_DEEP[i] * k) for i in range(3))
        for x in range(W):
            px[x, y] = row
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse([640, -80, 1320, 600], fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.composite(Image.new('RGB', (W, H), (26, 92, 104)), img, glow)
    return img.convert('RGBA')


def network(img):
    rnd = random.Random(20261003)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    cell = 34
    cx, cy, R = 900, 300, 520
    seeds = [(cx + math.cos(k * math.pi / 2 + .6) * R * .42, cy + math.sin(k * math.pi / 2 + .6) * R * .42) for k in range(4)]
    grid = {}
    for r in range(-1, H // cell + 2):
        for c in range(-1, W // cell + 2):
            x = c * cell + (rnd.random() - .5) * cell * .55
            y = r * cell + (rnd.random() - .5) * cell * .55
            dist = math.hypot((x - cx) / 1.25, y - cy) / R
            if dist > 1 or rnd.random() < .07 + dist * .25:
                continue
            part = min(range(4), key=lambda i: (x - seeds[i][0]) ** 2 + (y - seeds[i][1]) ** 2)
            fade = max(0.0, 1 - dist) * min(1.0, max(0.0, (x - 380) / 420))
            grid[(r, c)] = (x, y, part, fade)
    for (r, c), (x, y, part, fade) in grid.items():
        for dr_, dc in ((0, 1), (1, 0)):
            o = grid.get((r + dr_, c + dc))
            if o and rnd.random() < .86:
                f = min(fade, o[3])
                col = HUES[part] if part == o[2] else IVORY
                dr.line([(x, y), (o[0], o[1])], fill=col + (round(255 * (.08 + f * .3)),), width=1)
    for (x, y, part, fade) in grid.values():
        a = round(255 * (.15 + fade * .55))
        rr = 1.4 + fade
        dr.ellipse([x - rr, y - rr, x + rr, y + rr], fill=HUES[part] + (a,))
    img.alpha_composite(layer)


def mark(img, x, y, size, font):
    m = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=round(size * .25), fill=(214, 95, 63))
    tw = d.textlength('XJ', font=font)
    bbox = d.textbbox((0, 0), 'XJ', font=font)
    d.text(((size - tw) / 2, (size - (bbox[3] - bbox[1])) / 2 - bbox[1]), 'XJ', font=font, fill=(251, 246, 236))
    img.alpha_composite(m, (x, y))


def render(lang, t, name, src, out):
    img = background()
    network(img)
    portrait = Image.open(os.path.join(src, 'portrait-bust.png')).convert('RGBA')
    ph = 452
    pw = round(portrait.width * ph / portrait.height)
    portrait = portrait.resize((pw, ph), Image.LANCZOS)
    img.alpha_composite(portrait, (W - pw - 36, H - ph))

    d = ImageDraw.Draw(img)
    mark(img, 80, 74, 52, serif(src, 27, 700))
    d.text((148, 72), name, font=serif(src, 31, 700), fill=IVORY)
    if lang == 'zh':
        sub_font = ImageFont.truetype(os.path.join(src, 'NotoSerifSC-Bold.otf'), 21)
    else:
        sub_font = serif(src, 21, 500)
    d.text((149, 110), t['brand']['sub'], font=sub_font, fill=IVORY_2)

    if lang == 'zh':
        hfont = ImageFont.truetype(os.path.join(src, 'NotoSerifSC-Bold.otf'), 62)
        step = 84
    else:
        hfont = serif(src, 74, 700)
        step = 84
    y = 236
    for line in (t['hero']['h1_line1'], t['hero']['h1_line2']):
        d.text((78, y), line, font=hfont, fill=IVORY)
        y += step
    d.text((80, 520), 'xuan-1998.github.io', font=serif(src, 25, 600), fill=CORAL)
    img.convert('RGB').save(out, 'JPEG', quality=88, optimize=True, progressive=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--root', default='.')
    a = ap.parse_args()
    data = yaml.safe_load(open(os.path.join(a.root, '_data/i18n.yml'), encoding='utf-8'))
    profile = yaml.safe_load(open(os.path.join(a.root, '_data/profile.yml'), encoding='utf-8'))
    for lang in ('en', 'zh'):
        out = os.path.join(a.root, f'assets/img/og-{lang}.jpg')
        name = profile['name_zh'] if lang == 'zh' and profile.get('name_zh') else profile['name']
        render(lang, data[lang], name, a.src, out)
        print(out, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    main()
