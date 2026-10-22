# xuan-1998.github.io

This repository contains the source for Xuan Jiang's homepage at `https://xuan-1998.github.io/`. It is a plain one-page academic homepage built by GitHub Pages with Jekyll and the `github-pages` gem, with one stylesheet (`assets/css/site.css`), one small script (`assets/js/site.js`) and no framework. Without JavaScript everything still shows except the [abs] toggles and the mobile menu button.

## Pages

| Path | Source | Content |
| --- | --- | --- |
| `/` | `index.html`, `_layouts/home.html` | About, research, selected work, open source, talks, mentoring |
| `/misc/` | `misc.html` | Experience, education, honors, teaching, service, earlier work |
| `/blog/` | `blog.html` | Substack posts |
| `/publications`, `/zh/`, `/zh/blog/` | `_layouts/redirect.html` | Redirects that keep old links working |

## Edit content

| File | What it holds |
| --- | --- |
| `_data/text.yml` | All page text: the bio, the research summary and overview, section titles, and the entries on the misc page. Values may contain HTML links. |
| `_data/papers.yml` | Every paper, newest year first. `selected: true` puts a paper in Selected Work with a thumbnail, and the others appear under "Show all papers". `equal` marks co-first authors (*), `lead` marks the project lead (†) and `corresponding` marks corresponding authors (✉). `key` names the paper's thumbnail and abstract, and `video` names an optional teaser video. `links` takes `paper`, `arxiv`, `website`, `code` and `dataset`. |
| `_data/abstracts.yml` | The abstracts behind [abs], copied verbatim from arXiv or Crossref. |
| `_data/thumbs.yml` | Size and alt text of each thumbnail in `assets/img/thumb/`, plus an optional `credit` line for third-party material. |
| `_data/talks.yml` | Talks, newest first: title, date (`YYYY-MM`), venue, an optional logo from `assets/img/logo/` and an optional `slides` PDF in `assets/slides/`. Internal talks get no slides. |
| `_data/projects.yml` | Open-source entries and their buttons. |
| `_data/profile.yml` | Name, email, profile links, mentees and reviewing lists. |
| `_data/blog.yml` | Substack posts, newest first. |

The Scholar sync on the Mac (`~/.autobook/scholar_sync/sync.py`) rewrites each paper's `cites` and items 2 and 3 of `stats` in `_data/profile.yml` every day. The page shows neither, but keep both keys in place so the sync keeps working.

## Images and videos

Thumbnails are WebP files about 520 to 640 px wide. A selected paper with `video` loops a muted H.264 MP4 from `assets/video/` (640 px wide, under 300 KB), and its thumbnail is the video's poster frame. Readers who ask for reduced motion see the poster with player controls instead.

The XJ icon in `assets/img/favicon.svg` is the source of `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png` and `icon-512.png`. `assets/img/og.jpg` is the social preview image.

## Local preview

```sh
bundle install
bundle exec jekyll serve
```

Jekyll serves on `http://127.0.0.1:4000/` by default.
