import { pageContext, suggestions, photos } from './catalog.js';
import { readSSE, renderAnswer, escapeHTML } from './core.js';
import { CHAT_ENDPOINT } from './config.js';
import { mountFoxMotion } from './pet-motion.js';
import { foxAvatar } from './fox-avatar.js';
import { fallbackAnswer, faqSuggestions } from './faq.js';

if (!document.querySelector('.fox-companion')) mount();
function mount() {
  const KEY = 'blair-fox-chat-v1';
  const sendIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></svg>';
  const stopIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
  const context = pageContext(location.pathname, document.body.dataset.project);
  const projectPage = context.page === 'project';
  const inviteText = projectPage ? 'Ask me about this project' : 'Ask me about Blair';
  const welcomeText = projectPage ? 'Ask me about this project'
    : context.page === 'home' ? 'Curious about something?' : 'Curious about Blair?';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.createElement('aside');
  root.className = 'fox-companion';
  root.setAttribute('aria-label', 'Blair’s AI fox');
  root.innerHTML = `
    <section class="fox-panel" id="fox-panel" role="dialog" aria-modal="false" aria-labelledby="fox-title" hidden>
      <header class="fox-header">
        <h2 id="fox-title">BLAIR AI</h2>
        <button type="button" class="fox-icon fox-privacy-toggle" aria-label="About this chat" aria-expanded="false" aria-controls="fox-privacy"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.1"/></svg></button>
        <span class="fox-header-space"></span>
        <button class="fox-icon fox-reset" type="button" aria-label="Reset chat" title="Reset chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a9 9 0 1 1 0 4M3 4v6h6"/></svg></button>
        <button class="fox-icon fox-close" type="button" aria-label="Close chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </header>
      <div class="fox-privacy" id="fox-privacy" role="tooltip" hidden><p>Blair’s little fox is an AI guide and can make mistakes. AI questions, recent chat, current page and selected excerpts are processed by Cloudflare. If AI is unavailable, clearly labelled saved portfolio answers are shown instead. History stays in this tab until you reset it or close the tab. Please avoid sensitive information.</p></div>
      <div class="fox-context" hidden><span></span></div>
      <div class="fox-scroll">
        <div class="fox-welcome"><h3>${welcomeText}</h3></div>
        <div class="fox-messages" role="log" aria-label="Conversation" aria-live="off"></div>
        <div class="fox-suggestions" aria-label="Suggested questions"></div>
      </div>
      <div class="fox-error" role="alert" hidden><span></span><button type="button" class="fox-retry">Try again</button></div>
      <form class="fox-form">
        <div class="fox-quote" hidden><span></span><button type="button" aria-label="Remove selected context">×</button></div>
        <div class="fox-input-row"><textarea rows="1" maxlength="2000" aria-label="Ask Blair’s little fox" placeholder="Ask about Blair..."></textarea><button class="fox-send" type="submit" aria-label="Send message" title="Send message">${sendIcon}</button></div>
      </form>
      <div class="fox-sr" role="status" aria-live="polite"></div>
    </section>
    <div class="fox-pet-dock">
      <div class="fox-pet-label" aria-hidden="true"><span class="fox-invite">${inviteText}</span></div>
      <button type="button" class="fox-pet" aria-label="Open chat with Blair’s little fox" aria-expanded="false" aria-controls="fox-panel" data-pose="seated" data-phase="rest">
        ${foxAvatar()}
      </button>
    </div>`;
  document.body.append(root);
  const $ = selector => root.querySelector(selector);
  const panel = $('.fox-panel'), pet = $('.fox-pet'), field = $('textarea'), send = $('.fox-send');
  mountFoxMotion({ pet, reduced });
  const resume = [...document.querySelectorAll('.site-header nav a')].find(link => link.textContent.trim().toLowerCase() === 'resume');
  function alignPet() {
    const anchor = resume?.getBoundingClientRect();
    if (innerWidth < 768 || !anchor?.width) {
      root.style.removeProperty('--fox-pet-right');
      return;
    }
    const center = anchor.left + anchor.width / 2;
    root.style.setProperty('--fox-pet-right', `${document.documentElement.clientWidth - center - pet.getBoundingClientRect().width / 2}px`);
  }
  // Track the actual Resume button after font loading and responsive resizing.
  if (resume) {
    const alignment = new ResizeObserver(alignPet);
    alignment.observe(resume);
    alignment.observe(pet);
    window.addEventListener('resize', alignPet);
    document.fonts.ready.then(alignPet);
    alignPet();
  }
  const scroll = $('.fox-scroll'), messagesNode = $('.fox-messages'), prompts = $('.fox-suggestions');
  const errorBox = $('.fox-error'), quote = $('.fox-quote'), live = $('.fox-sr');
  const infoButton = $('.fox-privacy-toggle'), infoPopover = $('.fox-privacy');
  $('.fox-context span:last-child').textContent = context.projectTitle ? `Exploring ${context.projectTitle}` : context.page === 'about' ? 'Getting to know Blair' : 'Exploring Blair’s portfolio';
  let messages = [], controller = null, requestId = 0, selectedText = '', selectedPhotos = [], lastRequest = null, returnFocus = null, faqUntil = 0;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    if (Array.isArray(saved)) messages = saved.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 10000).slice(-40).map(m => ({ role: m.role, content: m.content, status: m.status === 'complete' ? 'complete' : 'interrupted', kind: m.kind === 'faq' ? 'faq' : 'ai', note: typeof m.note === 'string' ? m.note.slice(0, 200) : '', context: typeof m.context === 'string' ? m.context.slice(0, 1000) : '' }));
  } catch { /* Storage can be disabled by the visitor. */ }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-40))); } catch {} }
  function open() {
    if (!panel.hidden) return;
    returnFocus = document.activeElement;
    panel.hidden = false;
    root.classList.add('is-open'); pet.setAttribute('aria-expanded', 'true');
    pet.setAttribute('aria-label', 'Close chat with Blair’s little fox');
    field.focus({ preventScroll: true });
  }
  function close() {
    setInfoOpen(false);
    panel.hidden = true; root.classList.remove('is-open'); pet.setAttribute('aria-expanded', 'false');
    pet.setAttribute('aria-label', 'Open chat with Blair’s little fox');
    (returnFocus?.isConnected ? returnFocus : pet).focus({ preventScroll: true });
  }
  pet.addEventListener('click', () => panel.hidden ? open() : close());
  $('.fox-close').addEventListener('click', close);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault(); event.stopPropagation();
      if (!infoPopover.hidden) { setInfoOpen(false); infoButton.focus({ preventScroll: true }); }
      else close();
    }
  });

  function render(forceBottom = false) {
    const nearBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 90;
    $('.fox-welcome').hidden = messages.length > 0;
    messagesNode.innerHTML = messages.map(m => `<article class="fox-message fox-${m.role}"><span class="fox-author">${m.role === 'user' ? 'You' : m.kind === 'faq' ? 'Portfolio FAQ' : 'Little fox'}</span>${m.context ? `<blockquote>${escapeHTML(m.context)}</blockquote>` : ''}${m.role === 'assistant' && m.kind === 'faq' ? `<p class="fox-faq-note">${escapeHTML(m.note)}</p>` : ''}<div class="fox-answer">${m.role === 'user' ? `<p>${escapeHTML(m.content)}</p>` : m.content ? renderAnswer(m.content, m.status === 'pending') : m.status === 'pending' ? '<span class="fox-thinking">Thinking<span>...</span></span>' : '<p>Reply interrupted.</p>'}</div>${['interrupted', 'error'].includes(m.status) && m.role === 'assistant' ? '<small class="fox-interrupted">This reply wasn’t completed.</small>' : ''}</article>`).join('');
    const questions = messages.at(-1)?.kind === 'faq' ? faqSuggestions(/[\u3400-\u9fff]/.test(messages.at(-1).content)) : suggestions(context, messages);
    prompts.innerHTML = controller ? '' : questions.map(q => `<button type="button" data-question="${escapeHTML(q)}">${escapeHTML(q)}</button>`).join('');
    if (nearBottom || forceBottom) scroll.scrollTop = scroll.scrollHeight;
  }
  function setQuote(text = '', ids = []) {
    selectedText = text.slice(0, 1000); selectedPhotos = ids;
    quote.hidden = !selectedText && !ids.length;
    quote.querySelector('span').textContent = ids.length ? `About: ${photos[ids[0]].title}` : `“${selectedText}”`;
  }
  quote.querySelector('button').addEventListener('click', () => setQuote());
  function positionInfo() {
    if (infoPopover.hidden || panel.hidden) return;
    const buttonRect = infoButton.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const top = buttonRect.bottom - panelRect.top - panel.clientTop + 10;
    infoPopover.style.top = `${top}px`;
    const popoverRect = infoPopover.getBoundingClientRect();
    const tip = buttonRect.left + buttonRect.width / 2 - popoverRect.left;
    infoPopover.style.setProperty('--fox-info-tip', `${Math.max(12, Math.min(popoverRect.width - 12, tip))}px`);
    infoPopover.style.setProperty('--fox-info-text-height', `${Math.max(36, panel.clientHeight - top - 48)}px`);
  }
  function setInfoOpen(open) {
    infoPopover.hidden = !open;
    infoButton.setAttribute('aria-expanded', String(open));
    if (open) { infoButton.setAttribute('aria-describedby', 'fox-privacy'); positionInfo(); }
    else infoButton.removeAttribute('aria-describedby');
  }
  infoButton.addEventListener('click', () => setInfoOpen(infoPopover.hidden));
  document.addEventListener('pointerdown', event => {
    if (!infoPopover.hidden && !infoButton.contains(event.target) && !infoPopover.contains(event.target)) setInfoOpen(false);
  });
  new ResizeObserver(positionInfo).observe(panel);
  function busy(active) {
    send.setAttribute('aria-label', active ? 'Stop reply' : 'Send message');
    send.title = active ? 'Stop reply' : 'Send message';
    send.innerHTML = active ? stopIcon : sendIcon;
    field.disabled = active;
    messagesNode.setAttribute('aria-busy', String(active));
  }
  function history() {
    let remaining = 14000;
    const recent = [];
    for (const m of messages.filter(m => m.status === 'complete' && m.kind !== 'faq').slice(-20).reverse()) {
      const content = (m.content + (m.context ? `\nSelected portfolio excerpt: ${m.context}` : '')).slice(0, 6000);
      if (remaining < content.length) break;
      remaining -= content.length;
      recent.unshift({ role: m.role, content });
    }
    if (recent[0]?.role === 'assistant') recent.shift();
    return recent;
  }
  async function submit(text) {
    if (controller || !text.trim()) return;
    const previous = history();
    const request = { message: text.trim().slice(0, 2000), conversationHistory: previous, pageContext: context, selectedPhotos: [...selectedPhotos], context: selectedText };
    lastRequest = request;
    const user = { role: 'user', content: request.message, context: selectedText, status: 'pending' };
    const answer = { role: 'assistant', content: '', status: 'pending' };
    messages.push(user, answer);
    controller = new AbortController();
    const activeController = controller, id = ++requestId;
    const timer = setTimeout(() => activeController.abort('timeout'), 55000);
    field.value = ''; field.style.height = ''; setQuote(); errorBox.hidden = true;
    busy(true); render(true); save(); live.textContent = 'Little fox is thinking.';
    let canFallback = true;
    const useFAQ = () => {
      const fallback = fallbackAnswer(request);
      answer.content = fallback.content; answer.note = fallback.note;
      answer.kind = user.kind = 'faq'; answer.status = user.status = 'complete';
      faqUntil = Date.now() + 60000; errorBox.hidden = true;
      live.textContent = `${fallback.note} ${fallback.content}`;
    };
    try {
      if (Date.now() < faqUntil) { useFAQ(); return; }
      const endpoint = document.querySelector('meta[name="blair-chat-endpoint"]')?.content || CHAT_ENDPOINT;
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: activeController.signal });
      if (!response.ok) {
        canFallback = [404, 408, 429].includes(response.status) || response.status >= 500;
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : response.status === 404 ? 'My AI connection is still being set up. Please explore the projects or email Blair for now.' : 'I couldn’t connect. Please try again.');
      }
      if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('My AI connection is still being set up. Please try again later.');
      let done = false;
      for await (const raw of readSSE(response.body)) {
        if (id !== requestId) return;
        if (raw === '[DONE]') { done = true; break; }
        const data = JSON.parse(raw);
        if (data.error) throw new Error(data.error);
        if (data.mode === 'faq') { answer.kind = user.kind = 'faq'; answer.note = fallbackAnswer(request).note; faqUntil = Date.now() + 60000; }
        if (typeof data.delta === 'string') { answer.content += data.delta; if (answer.content.length > 12000) throw new Error('This reply was too long. Please ask a shorter question.'); render(); }
      }
      if (!done || !answer.content.trim()) throw new Error('The connection ended before my reply was complete. Please try again.');
      answer.status = 'complete'; user.status = 'complete';
      live.textContent = `${answer.kind === 'faq' ? answer.note : 'Little fox replied:'} ${answer.content.replace(/\[IMAGE:[\w-]+\]/g, '')}`;
    } catch (error) {
      if (id !== requestId) return;
      if (canFallback && !answer.content.trim() && (!activeController.signal.aborted || activeController.signal.reason === 'timeout')) { useFAQ(); return; }
      answer.status = 'interrupted'; user.status = 'interrupted';
      if (!activeController.signal.aborted || activeController.signal.reason === 'timeout') {
        errorBox.hidden = false;
        errorBox.querySelector('span').textContent = activeController.signal.reason === 'timeout' ? 'That took a little too long. Please try again.' : error.message || 'Please try again.';
      } else live.textContent = 'Reply stopped.';
    } finally {
      clearTimeout(timer);
      if (id === requestId) { controller = null; busy(false); save(); render(); if (!panel.hidden) field.focus({ preventScroll: true }); }
    }
  }
  $('.fox-form').addEventListener('submit', event => { event.preventDefault(); if (controller) controller.abort(); else submit(field.value); });
  field.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(field.value); }
  });
  field.addEventListener('input', () => { field.style.height = 'auto'; field.style.height = `${Math.min(104, field.scrollHeight)}px`; });
  root.addEventListener('click', event => {
    const q = event.target.closest('[data-question]'); if (q) submit(q.dataset.question);
    const photo = event.target.closest('button[data-photo]'); if (photo && !controller) { setQuote('', [photo.dataset.photo]); field.value = `Tell me about ${photos[photo.dataset.photo].title}.`; field.focus(); }
  });
  $('.fox-retry').addEventListener('click', () => {
    if (!lastRequest || controller) return;
    const old = lastRequest;
    messages.splice(-2); setQuote(old.context, old.selectedPhotos); submit(old.message);
  });
  $('.fox-reset').addEventListener('click', () => {
    requestId++; controller?.abort(); controller = null; messages = []; lastRequest = null; faqUntil = 0; setQuote();
    field.value = ''; errorBox.hidden = true; busy(false); save(); render(); live.textContent = 'Chat reset.'; field.focus();
  });
  const selectionButton = document.createElement('button');
  selectionButton.className = 'fox-selection'; selectionButton.type = 'button'; selectionButton.textContent = 'Ask little fox'; selectionButton.hidden = true;
  document.body.append(selectionButton);
  let excerpt = '';
  function hideSelection() { selectionButton.hidden = true; }
  document.addEventListener('selectionchange', () => {
    const selection = getSelection();
    const anchor = selection?.anchorNode?.parentElement;
    const end = selection?.focusNode?.parentElement;
    if (!selection || selection.isCollapsed || !anchor?.closest('main') || !end?.closest('main') || anchor.closest('input,textarea,[contenteditable]') || !selection.rangeCount) return hideSelection();
    excerpt = selection.toString().trim().slice(0, 1000);
    if (excerpt.length < 3) return hideSelection();
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    selectionButton.style.left = `${Math.min(innerWidth - 170, Math.max(8, rect.left))}px`;
    selectionButton.style.top = `${Math.max(8, Math.min(innerHeight - 48, rect.top - 42))}px`;
    selectionButton.hidden = false;
  });
  selectionButton.addEventListener('pointerdown', event => event.preventDefault());
  selectionButton.addEventListener('click', () => { window.dispatchEvent(new CustomEvent('askBlair', { detail: { text: excerpt } })); hideSelection(); });
  window.addEventListener('askBlair', event => {
    if (controller) { open(); return; }
    const text = typeof event.detail?.text === 'string' ? event.detail.text : '';
    open(); setQuote(text); field.value = ''; field.placeholder = 'What would you like to know about this?'; field.focus();
  });
  document.addEventListener('scroll', hideSelection, { passive: true, capture: true });
  window.addEventListener('resize', hideSelection);
  // Follow the visual viewport when the phone keyboard is open.
  function viewport() {
    if (!window.visualViewport) return;
    root.style.setProperty('--fox-keyboard', `${Math.max(0, innerHeight - visualViewport.height - visualViewport.offsetTop)}px`);
    root.style.setProperty('--fox-view-height', `${visualViewport.height}px`);
    root.classList.toggle('is-keyboard', innerHeight - visualViewport.height > 100 && visualViewport.height < 520);
  }
  window.visualViewport?.addEventListener('resize', viewport); viewport();
  render();
}
