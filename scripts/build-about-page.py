"""Build the local About page from the saved original and the shared home shell.

No network access. Run with Python + lxml after changing the shared shell.
"""
from copy import deepcopy
from html import escape
from pathlib import Path
from lxml import html
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
original = html.parse(str(ROOT / 'reference/about.html'))
home = html.parse(str(ROOT / 'index.html'))
ROLE_UPDATES = {
    'International Cultural Exchange Center': 'Web Experience Designer',
    'HHI Concours x SCAD SERVE': 'Product & Service Designer',
    'FINRA x SCAD Pro': 'Product Designer',
    'BMW x SCAD Pro': 'Product Designer',
}


def render(node):
    return html.tostring(node, encoding='unicode', method='html')


def local_image(node):
    name = Path(node.get('src')).name
    return f'assets/about/{name}'


def photo(src, alt, extra='', lazy=True):
    with Image.open(ROOT / src) as image:
        width, height = image.size
    loading = ' loading="lazy"' if lazy else ''
    return f'<img src="{src}" alt="{escape(alt)}" width="{width}" height="{height}" decoding="async"{loading}{extra}>'


def resume_entry(row):
    info = row.find('.//div[@class="resume-row-content"]')
    if info is None:
        info = row.find('.//div[@class="resume-row-content education-row-content"]')
    title = ' '.join(info.find('h3').text_content().split())
    role = ROLE_UPDATES.get(title, info.find('p').text_content().strip())
    dates = info.find('div').text_content().strip()
    description = row.xpath('./p')[0].text_content().strip()
    if title == 'HHI Concours x SCAD SERVE':
        description = description.replace(
            ' and attract Gen Z audiences, drawing on journey insights and client co-creation', ''
        )
    logos = ''.join(
        f'<img src="{local_image(image)}" alt="{escape(image.get("alt", ""))}" loading="lazy" decoding="async">'
        for image in row.xpath('.//img')
    )
    return f'''<article class="about-resume-row">
      <div class="about-resume-identity">
        <div class="about-resume-logos">{logos}</div>
        <div><h3>{escape(title)}</h3><p class="about-role">{escape(role)}</p><p class="about-dates">{escape(dates)}</p></div>
      </div>
      <div class="about-resume-description"><p>{escape(description)}</p></div>
    </article>'''


header = deepcopy(home.find('.//header'))
header.xpath('.//a[@class="brand"]')[0].set('href', '/#top')
header.xpath('.//nav/a')[0].set('href', '/#work')
header.xpath('.//nav/a')[1].set('aria-current', 'page')
footer = deepcopy(home.find('.//footer'))
cursor = home.xpath('//div[@class="custom-cursor"]')[0]
status = home.xpath('//div[@class="copy-status"]')[0]
resume_url = header.xpath('.//nav/a')[2].get('href')
rows = original.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," resume-row ")]')
experience = ''.join(resume_entry(row) for row in rows if 'education-row' not in row.get('class', ''))
education = ''.join(resume_entry(row) for row in rows if 'education-row' in row.get('class', ''))
gallery_images = original.xpath('//img[@class="diving-image"]')
gallery = ''
for index, image in enumerate(gallery_images):
    src = local_image(image)
    with Image.open(ROOT / src) as asset:
        width, height = asset.size
    gallery += f'<button class="about-gallery-photo" type="button" data-photo="{index}" style="aspect-ratio:{width}/{height}" aria-label="Enlarge photo {index + 1}: {escape(image.get("alt"))}">{photo(src, image.get("alt"))}</button>'

page = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#ffffff">
  <meta name="description" content="Get to know Blair Su, a product designer with a background in UX and service design. Experience, education, and life beyond design.">
  <title>About — Blair Su</title>
  {render(home.find('.//link[@rel="icon"]'))}
  <link rel="preload" href="assets/fonts/averia-serif-libre.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/source-serif-4.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="about-page.css">
  <script src="script.js" defer></script>
  <script src="about-page.js" defer></script>
</head>
<body id="top" class="about-page" data-page-title="About">
  <a class="skip-link" href="#main-content">Skip to content</a>
  {render(header)}
  <main id="main-content">
    <div class="band about-spacer" aria-hidden="true"><div class="frame"></div></div>
    <section class="band about-intro" aria-labelledby="about-title">
      <div class="frame about-intro-frame">
        <div class="about-intro-copy">
          <p class="about-availability"><span aria-hidden="true"></span>Open to work</p>
          <div class="about-intro-heading">
            <h1 id="about-title">Hi, I’m Blair Su!</h1>
            <picture class="about-intro-art" aria-hidden="true">
              <source media="(prefers-reduced-motion: reduce)" srcset="assets/about/typing-still-warm-light.webp">
              <img src="assets/about/typing-loop-warm-light.webp" alt="" width="420" height="420" decoding="async">
            </picture>
          </div>
          <div class="about-intro-prose">
            <p>I’m a product designer with a background in <strong>UX and service design.</strong> I turn ambiguous problems into clear product experiences by connecting user needs, stakeholder priorities, and the systems around them.</p>
            <p>I’m curious about how things work and how small design decisions can make an experience feel noticeably better. I use AI to explore ideas, prototype quickly, and turn early thinking into something tangible.</p>
            <p>Previously worked on projects with <strong>Hilton Head Island Concours, BMW, FINRA and Deloitte.</strong> Reach me on <a href="https://www.linkedin.com/in/blair-xun-su-1263921a9" target="_blank" rel="noopener noreferrer">LinkedIn</a> or <a href="mailto:suxun70@gmail.com">email</a>.</p>
          </div>
        </div>
        <div class="about-intro-photos" aria-label="A little about Blair">
          <figure class="about-portrait" data-cursor-label="that's me!">{photo('assets/about/blair-selfie.jpg', 'Blair Su outdoors in the afternoon sunlight', lazy=False)}</figure>
          <figure class="about-team-photo" data-cursor-label="with the team :)">{photo('assets/about/diving-scad-serve-team.jpg', 'Blair with the SCAD SERVE team', lazy=False)}</figure>
          <figure class="about-outdoors-photo" data-cursor-label="weekend mode ✨">{photo('assets/about/diving-mountain-view.jpg', 'Blair taking in a snowy mountain view', lazy=False)}</figure>
        </div>
      </div>
    </section>
    <section class="band about-resume-section" aria-labelledby="experience-title">
      <div class="frame">
        <div class="about-section-heading"><h2 id="experience-title">Experience</h2><a class="about-resume-link" href="{escape(resume_url)}" target="_blank" rel="noopener noreferrer">View my Resume</a></div>
        {experience}
      </div>
    </section>
    <section class="band about-resume-section" aria-labelledby="education-title">
      <div class="frame">
        <div class="about-section-heading"><h2 id="education-title">Education</h2></div>
        {education}
      </div>
    </section>
    <section class="band about-gallery-section" aria-labelledby="diving-title">
      <div class="frame">
        <div class="about-section-heading">
          <h2 id="diving-title">What I’ve been diving into</h2>
          <button class="gallery-toggle" type="button" aria-label="Pause photo scrolling" aria-controls="about-gallery">
            <svg class="gallery-pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>
            <svg class="gallery-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>
            <span>Pause</span>
          </button>
        </div>
        <div class="about-gallery" id="about-gallery" role="region" aria-label="Photos from life beyond design" tabindex="0">
          <div class="about-gallery-track"><div class="about-gallery-set">{gallery}</div></div>
        </div>
      </div>
    </section>
  </main>
  {render(footer)}
  <dialog class="photo-lightbox" aria-labelledby="photo-caption">
    <div class="photo-lightbox-toolbar"><p id="photo-caption"></p><button class="photo-close" type="button" aria-label="Close photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M5 19 19 5"/></svg></button></div>
    <img class="photo-lightbox-image" alt="">
    <div class="photo-lightbox-navigation"><button type="button" data-photo-step="-1">Previous</button><span class="photo-count"></span><button type="button" data-photo-step="1">Next</button></div>
  </dialog>
  {render(cursor)}
  {render(status)}
</body>
</html>
'''
(ROOT / 'about.html').write_text(page)
print(f'Built about.html: 5 experience entries, 2 education entries, {len(gallery_images)} gallery photos.')
