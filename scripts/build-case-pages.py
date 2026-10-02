"""Keep the existing case-study content while sharing the new site's shell.

Run with Python + lxml after updating reference/case-studies snapshots.
No network access is used by this build step.
"""
from copy import deepcopy
from pathlib import Path
from lxml import etree, html

ROOT = Path(__file__).resolve().parents[1]
HOME = html.parse(str(ROOT / 'index.html'))
PROJECTS = {
    'project-1-lighthouse': 'Lighthouse',
    'project-2-southerncrafted': 'Southern Crafted',
    'project-3-hhi': 'HHI Concours',
    'project-4-nalu': 'Nalu',
}


def has_class(name):
    return f'contains(concat(" ", normalize-space(@class), " "), " {name} ")'


def add_class(el, name):
    classes = el.get('class', '').split()
    if name not in classes:
        el.set('class', ' '.join([*classes, name]))


def append_fragment(parent, source):
    parent.append(html.fragment_fromstring(source))


def merge_hhi_research(breakpoint):
    """Keep the research methods and findings together in Discovery."""
    def source_node(suffix):
        return next(node for node in breakpoint.xpath('.//*[@data-source]')
                    if node.get('data-source').endswith(suffix))

    # Reuse the existing two-column row (stacked on Phone) for exact alignment.
    methods = source_node('rLNbX7C_Z')
    source_node('PBZDMa2qV').find('.//span').text = 'What the Research Revealed'
    methods.append(source_node('cbpvcnJvw'))
    methods.addprevious(source_node('MGBPvuQtT'))
    source_node('iN2jVm1UP').find('.//span').text = (
        'Younger visitors want more than car displays. They seek stories, learning, '
        'and hands-on experiences that make car culture feel relevant to them.'
    )
    image = source_node('EihvBCRGP')
    research = image.getparent()
    image_index = research.index(image)
    for offset, suffix in enumerate(('V3U4pLe9P', 'kKn4KG6T9')):
        research.insert(image_index + offset, source_node(suffix))
    research.remove(image)
    insights = source_node('CiPB72jO8')
    insights.getparent().remove(insights)


HOME_CARDS = HOME.xpath(f'//*[{has_class("project-grid")}]/article')
HOME_ORDER = [card.find('a').get('href').strip('/') for card in HOME_CARDS]
HOME_TYPES = {
    card.find('a').get('href').strip('/'): card.xpath(
        f'.//*[{has_class("project-meta")}]/span'
    )[0].text_content().strip()
    for card in HOME_CARDS
}


for slug, name in PROJECTS.items():
    source = html.parse(str(ROOT / 'reference/case-studies' / f'{slug}.html'))
    title = source.find('.//title').text
    sections = source.xpath(f'//*[{has_class("case-tablet")}]//*[{has_class("case-contents-menu")}]//a[starts-with(@href,"#")]')
    menu_items = [(a.get('href')[1:], a.text_content().strip()) for a in sections]
    if slug == 'project-3-hhi':
        menu_items = [(anchor, 'Prototype' if anchor == 'final-prototype' else label)
                      for anchor, label in menu_items if anchor != 'problem']
    doc = html.fromstring('<html lang="en"><head></head><body></body></html>')
    head, body = doc.find('head'), doc.find('body')
    body.set('id', 'top')
    body.set('class', 'case-page')
    body.set('data-project', slug)
    body.set('data-project-title', name)
    for tag, attrs in [
        ('meta', {'charset': 'utf-8'}),
        ('meta', {'name': 'viewport', 'content': 'width=device-width, initial-scale=1'}),
        ('base', {'href': '/'}),
        ('meta', {'name': 'description', 'content': f'{name} project case study by Blair Su.'}),
        ('link', {'rel': 'icon', 'type': 'image/svg+xml', 'href': '/assets/blair-photo-icon-rounded.svg'}),
        ('link', {'rel': 'stylesheet', 'href': '/assets/case-studies/layout.css'}),
        ('link', {'rel': 'stylesheet', 'href': '/assets/case-studies/behavior.css'}),
        ('link', {'rel': 'stylesheet', 'href': '/styles.css'}),
        ('link', {'rel': 'stylesheet', 'href': '/assets/case-studies/fonts.css'}),
        ('link', {'rel': 'stylesheet', 'href': '/case-study.css'}),
    ]:
        etree.SubElement(head, tag, **attrs)
    etree.SubElement(head, 'title').text = title
    skip = deepcopy(HOME.xpath('//a[@class="skip-link"]')[0])
    body.append(skip)
    header = deepcopy(HOME.find('.//header'))
    header.xpath('.//a[@class="brand"]')[0].set('href', '/#top')
    header.xpath('.//nav/a')[0].set('href', '/#work')
    body.append(header)
    main = etree.SubElement(body, 'main', id='main-content', **{'class': 'case-main'})
    content = etree.SubElement(main, 'div', **{'class': 'frame case-content'})
    for original in source.xpath(f'//*[{has_class("case-breakpoint")}]'):
        breakpoint = deepcopy(original)
        if slug == 'project-3-hhi':
            merge_hhi_research(breakpoint)
        for old in breakpoint.xpath('.//nav[@aria-label="Case study sections"] | .//*[contains(concat(" ",@class," ")," case-bottom ")]'):
            if 'case-bottom' in old.get('class', '').split():
                while old.getparent() is not breakpoint and len(old.getparent()) == 1:
                    old = old.getparent()
            old.getparent().remove(old)
        canvas = breakpoint[0]
        add_class(canvas, 'case-canvas')
        # The former footer is replaced by one shared footer outside the copies.
        for old in list(canvas):
            if old.xpath('.//*[@data-layer="Footer Top"]'):
                canvas.remove(old)
        # One responsive recommendation section below the case content replaces
        # the three original breakpoint-specific carousels.
        for old in breakpoint.xpath(f'.//*[{has_class("case-more-projects")}]'):
            recommendation = old.getparent()
            recommendation.getparent().remove(recommendation)
        # Separate the closing thank-you message from the related-project cards.
        for message in breakpoint.xpath('.//span[normalize-space(text())="Thank you for reading!"]'):
            closing = message
            while closing.getparent().tag != 'article':
                closing = closing.getparent()
            divider = etree.Element('div', **{'data-layer': 'Divider', 'class': 'case-closing-divider'})
            closing.addnext(divider)
            add_class(closing.getparent().getparent(), 'case-closing-body')
        for divider in breakpoint.xpath('.//*[@data-layer="Divider"]'):
            add_class(divider, 'case-divider')
            divider.set('role', 'separator')
            # Preserve horizontal extensions through the original clipped wrappers.
            for ancestor in divider.iterancestors():
                if ancestor is breakpoint:
                    break
                add_class(ancestor, 'case-rule-host')
        for cover in breakpoint.xpath('.//*[@data-layer="S1 Introduction"]'):
            add_class(cover, 'case-cover')
        for article in breakpoint.xpath('.//article'):
            add_class(article, 'case-article')
            add_class(article.getparent(), 'case-body')
        # Keep each intro tag's wording in sync with its homepage type label.
        intro_title = breakpoint.find('.//article').xpath('./*/*[@data-layer="Title"]')[0]
        etree.SubElement(intro_title, 'span', **{'class': 'case-project-tag'}).text = HOME_TYPES[slug]
        if slug == 'project-1-lighthouse':
            for old, new in {
                'What we learned': 'From what we learned',
                'The research findings indicate that:': 'Therefore, the findings indicate that:',
            }.items():
                for label in breakpoint.xpath('.//span[text()=$text]', text=old):
                    label.text = new
        if slug == 'project-3-hhi':
            for label in breakpoint.xpath('.//span[text()="Final Prototype"]'):
                label.text = 'Prototype'
            for row in breakpoint.xpath('.//*[@data-source]'):
                if row.get('data-source', '').endswith('ySehltyG_'):
                    role = row.find('p')
                    role[0].text = 'AI Product Designer:'
                    role[1].text = (
                        ' I defined the features and functionality of the ticket confirmation email '
                        'and translated them into high-fidelity prototypes assisted by AI tools.'
                    )
                if row.get('data-source', '').endswith('udG1E1PVN'):
                    heading = row.find('p')
                    heading[0].text = 'Trip Planning & Purchase Team’s Priority Opportunity'
                    for extra in list(heading)[1:]:
                        heading.remove(extra)
                if row.get('data-source', '').endswith('svhstBpCN'):
                    add_class(row, 'case-validation-heading')
                    heading = row.find('p')
                    heading.text = 'From our usability testing, '
                    heading[0].tag = 'strong'
                if row.get('data-source', '').endswith('LJIeROXE3'):
                    description = row.find('p')
                    description[0].text = 'The original email confirmed the purchase, but '
                    emphasis = etree.SubElement(description, 'strong', **{'class': 's85'})
                    emphasis.text = 'the experience stopped there'
                    emphasis.tail = ', leaving a gap between buying a ticket and arriving at the event.'
                if row.get('data-source', '').endswith('RNWtIxjXw'):
                    prototype_link = row.xpath('./p[a[contains(@href,"figma.com/make/")]]')[0]
                    prototype_link.find('a').set('data-cursor-label', 'View Figma prototype')
                    note = etree.Element('p', **{'class': 'case-prototyping-note'})
                    note.text = 'I designed and iterated on the ticket confirmation experience using '
                    emphasis = etree.SubElement(note, 'strong')
                    emphasis.text = 'AI-assisted prototyping in Figma Make'
                    emphasis.tail = ', aligning the design with HHI’s visual identity and accessibility needs.'
                    prototype_link.addprevious(note)
                if row.get('data-source', '').endswith(('M1dt5hREI', 'GrwoZJ6D8', 'l3aF0lFbh')):
                    add_class(row, 'case-prototype-row')
        if slug == 'project-4-nalu':
            for row in breakpoint.xpath('.//*[@data-source]'):
                if row.get('data-source', '').endswith('WyN1gOw8Y'):
                    phrase = row.find('.//span')
                    before, emphasis_text, after = phrase.text.partition('prototyping is valuable at every stage')
                    phrase.text = before
                    emphasis = etree.SubElement(phrase, 'strong')
                    emphasis.text = emphasis_text
                    emphasis.tail = after
        if slug == 'project-2-southerncrafted':
            for row in breakpoint.xpath('.//*[@data-source]'):
                if row.get('data-source', '').endswith('cqGmzFA4S'):
                    phrase = row.find('.//span')
                    phrase.text = phrase.text.replace('We tested', 'We also tested', 1)
        if slug == 'project-2-southerncrafted' and 'case-desktop' in breakpoint.get('class', '').split():
            for quote in breakpoint.xpath('.//*[@data-source="IwNJHK_uq"]'):
                phrase = quote.find('.//span')
                phrase.text = phrase.text.replace('important things', 'important thing').replace('price. ”', 'price.”')
                quote.set('data-layer', phrase.text)
            for phrase in breakpoint.xpath('.//*[@data-source="JpNHIFman"]//span[text()="easily navigate, find relevant information, and better engage"]'):
                phrase.text = 'easily navigate, find relevant information,'
                etree.SubElement(phrase, 'br').tail = 'and better engage'
        # A cropped email preview opens the complete design on this page.
        for email in breakpoint.xpath(f'.//img[{has_class("case-ticket-email")}]'):
            crop = email.getparent()
            column = crop.getparent()
            add_class(column, 'case-email-column')
            add_class(column.getparent(), 'case-email-row')
            for label in column.xpath('./*[@data-source]'):
                if label.get('data-source', '').endswith('UB99XMy9z'):
                    column.remove(label)
            preview = etree.Element('button', type='button', **{
                'class': 'case-email-preview',
                'aria-label': 'View enlarged ticket confirmation email',
                'aria-haspopup': 'dialog',
                'aria-controls': 'ticket-email-viewer',
            })
            preview.append(email)
            prompt = etree.SubElement(preview, 'span', **{
                'class': 'case-email-prompt',
                'aria-hidden': 'true',
            })
            prompt.append(etree.fromstring('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M10.5 7.5v6M7.5 10.5h6"/></svg>'))
            etree.SubElement(prompt, 'span').text = 'Click to view'
            column.replace(crop, preview)
            column.getparent().insert(0, column)
        # Put navigation beside the artwork and retain a screen-reader slide status.
        for carousel in breakpoint.xpath('.//*[@data-carousel]'):
            slides = carousel.xpath(f'./*[{has_class("case-carousel-slides")}]')[0]
            controls = carousel.xpath(f'./*[{has_class("case-carousel-controls")}]')[0]
            if slug == 'project-2-southerncrafted':
                for slide, slide_name in zip(slides.xpath('./*[@data-slide]'), ('Header', 'Body', 'Footer')):
                    slide.set('data-slide-label', slide_name)
                    for visual in slide.xpath('.//*[@role="img"]'):
                        visual.set('aria-label', f'{slide_name} card sorting findings')
            for button in list(controls.findall('button')):
                add_class(button, 'case-carousel-arrow')
                if slug == 'project-2-southerncrafted':
                    button.set('aria-label', 'See Footer' if 'data-prev' in button.attrib else 'See Body')
                slides.append(button)
            count = controls.xpath('.//*[@data-carousel-count]')[0]
            count.set('aria-live', 'polite')
            count.set('aria-atomic', 'true')
        content.append(breakpoint)
    related = etree.SubElement(main, 'section', **{'class': 'case-related', 'aria-labelledby': 'related-title'})
    append_fragment(related, '<div class="band case-related-heading"><div class="frame"><h2 id="related-title">Check out more of my projects here ↓</h2></div></div>')
    grid = etree.SubElement(related, 'div', **{'class': 'frame project-grid'})
    current = HOME_ORDER.index(slug)
    for offset in (1, 2):
        grid.append(deepcopy(HOME_CARDS[(current + offset) % len(HOME_CARDS)]))
    related.append(deepcopy(HOME.xpath(f'//*[{has_class("work-end")}]')[0]))
    body.append(deepcopy(HOME.find('.//footer')))
    directory = etree.SubElement(body, 'aside', **{'class': 'case-directory', 'aria-label': 'Case study contents'})
    inner = etree.SubElement(directory, 'div', **{'class': 'frame directory-inner'})
    append_fragment(inner, '<button class="contents-toggle" type="button" aria-expanded="false" aria-controls="case-contents"><span>Contents</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>')
    menu = etree.SubElement(inner, 'nav', id='case-contents', hidden='', **{'class': 'contents-menu', 'aria-label': 'Case study sections'})
    for anchor, label in menu_items:
        etree.SubElement(menu, 'a', href=f'#{anchor}', **{'data-section': anchor}).text = label
    etree.SubElement(inner, 'span', **{'class': 'directory-project'}).text = name
    for selector in ['custom-cursor', 'copy-status']:
        body.append(deepcopy(HOME.xpath(f'//*[{has_class(selector)}]')[0]))
    if slug == 'project-3-hhi':
        cursor_label = body.xpath(f'.//*[{has_class("cursor-label")}]')[0]
        cursor_label.append(etree.fromstring('<svg class="cursor-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>'))
        append_fragment(body, '''<dialog class="case-email-viewer" id="ticket-email-viewer" aria-labelledby="ticket-email-title">
          <div class="case-email-toolbar">
            <h2 id="ticket-email-title">Ticket confirmation email</h2>
            <button class="case-email-close" type="button" aria-label="Close enlarged email" autofocus>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </div>
          <div class="case-email-full" tabindex="0" role="region" aria-label="Complete email design, scroll to explore">
            <img src="/assets/case-studies/hhi-ticket-confirmation-email.png" width="2432" height="16083" loading="lazy" alt="Complete redesigned HHI Concours ticket confirmation email, including ticket status, QR code, schedule, parking, arrival guidance, and contact details">
          </div>
        </dialog>''')
    for path in ['/script.js', '/assets/case-studies/interactions.js', '/case-study.js']:
        etree.SubElement(body, 'script', src=path, defer='')
    # Keep internal case links local, while retaining genuine external references.
    for link in body.xpath('.//a[@href]'):
        href = link.get('href')
        if href.startswith('#'):
            link.set('href', f'/{slug}/{href}')
        if href == './about.html':
            link.set('href', '/about.html')
        for project in PROJECTS:
            if href == f'https://www.blairsu.design/{project}/':
                link.set('href', f'/{project}/')
    for video in body.xpath('.//video'):
        video.set('preload', 'metadata')
    dest = ROOT / slug / 'index.html'
    dest.parent.mkdir(exist_ok=True)
    dest.write_text('<!doctype html>\n' + html.tostring(doc, encoding='unicode', pretty_print=True))
    print(f'{slug}: {len(menu_items)} chapters')

# Retain the source's artwork scaling, carousel, and diagram improvements.
behavior = (ROOT / 'reference/case-studies/behavior.js').read_text()
setup = behavior[:behavior.index('  const copyTimers =')]
carousel = behavior[behavior.index("  document.querySelectorAll('[data-carousel]')"):behavior.index('  let pending=false;')]
(ROOT / 'assets/case-studies/interactions.js').write_text(setup + carousel + '})();\n')
