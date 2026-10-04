# xuan-1998.github.io

This repository contains the source for Xuan Jiang's personal website at `https://xuan-1998.github.io/`. English is served at `/` and Chinese at `/zh/`.

## Build

GitHub Pages builds the site with Jekyll, with no plugins beyond the `github-pages` gem. There is no JavaScript framework; the site uses one stylesheet, `assets/css/site.css`, and one script, `assets/js/site.js`. The page works without JavaScript except for the paper filters and animations.

The hero mark and headline lines wipe in on load, section headings wipe in when they scroll into view, and the figure strip drifts. Everything is static for readers who request reduced motion.

## Edit content

| File | What to edit |
| --- | --- |
| `_data/i18n.yml` | Every piece of page text, in `zh` and `en` blocks with the same keys. |
| `_data/profile.yml` | Name, email, profile and project links, `stats`, publication venues, reviewing, and mentees and their links. It also holds `research_tags`, `comms`, `position_links`, `bilibili_followers`, and the links for Substack (`substack`, `substack_subscribe`) and Bilibili. |
| `_data/papers.yml` | The paper list, newest year first. The order within each year is the display order. |
| `_data/authors.yml` | Coauthor names that should link to a home page. |
| `_data/figures.yml` | Detail crops of figures for the moving strip and the paper each links to. Images in `assets/img/fig/` come from papers listed on the site. Captions and alt text are under `reel` in `_data/i18n.yml`. |

The `stats` field holds five numbers: years in AI since 2019, Google Scholar citations, h-index, papers, and merged reef and CORAL pull requests. They are updated by hand and reflect October 2026.

The `research_tags` field holds one list of linked tags per research row. Each `comms` item has a repository, link and status (`open`, `merged` or `released`). `position_links` adds an optional link after each research position.

The `name_zh` field is the name shown in the Chinese header, intro and footer. Paper author lists keep "Xuan Jiang".

Edit section text in `_data/i18n.yml` under `research.rows`, `comms`, `writing`, `earlier`, and `honors.teaching` / `honors.editorial`. Lists in `_data/i18n.yml` and `_data/profile.yml` match by position, so keep them in the same order.

Paper fields are `title`, `authors`, `equal` (names marked with an asterisk), `venue`, `year`, `topics` (`moe`, `agents`, `systems`, `mobility`), `selected`, `award`, `first_author`, `sole_author`, `cites`, and `links` (`paper`, `arxiv`, `code`). The paper list has a filter chip for each topic.

## Templates and languages

- `_layouts/base.html` defines the head, header and footer.
- `_layouts/home.html` sets the section order: hero, timeline, numbers, figure strip, research, selected work, GPU communication, self-evolving agents, papers, newsletter, background, earlier work (a Bilibili channel), contact.
- `_includes/sections/*.html` contains one file per section.

To change which language is at the root, edit `langs` in `_config.yml` and the `permalink` values in `index.html` and `zh/index.html`.

Each page links to the other language. Browsers whose first language is the other one get a small, dismissible suggestion after scrolling.

The old `/publications` address forwards to the paper list on the home page.

## Fonts

Subsets of Source Serif 4 and Noto Serif SC are self-hosted in `assets/fonts/` and declared in `_includes/fonts.html`. Both fonts use the SIL Open Font License.

The Chinese serif has a small core file containing the characters currently used in headings, research row titles and the channel name, and a larger fallback file containing the 3,755 most common characters. The browser downloads the fallback only when the serif text needs it.

After changing Chinese text set in the serif face (headings, research row titles or the channel name), rerun `python tools/build_fonts.py --src DIR`. `DIR` must contain `SourceSerif4-Var.ttf` and `NotoSerifSC-Bold.otf`; the script needs `fonttools`, `brotli` and `pyyaml`.

## Social preview images

Run `python tools/build_og.py --src DIR` to render `assets/img/og-en.jpg` and `assets/img/og-zh.jpg` from the hero text. `DIR` needs the same font files plus `portrait-bust.png`. The script needs `pillow` and `pyyaml`.

## Local preview

```sh
bundle install
bundle exec jekyll serve
```

Open `http://127.0.0.1:4000/` for English and `http://127.0.0.1:4000/zh/` for Chinese.