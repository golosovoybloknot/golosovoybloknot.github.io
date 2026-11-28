function configureGallery(selector) {
  const links = Array.from(document.querySelectorAll(selector));
  if (!links.length) return;
  function select(active) {
    for (const link of links) {
      const selected = link === active;
      const panel = document.getElementById(link.hash.slice(1));
      panel.hidden = !selected;
      panel.querySelectorAll('.ed-mock, .demo-tr, .demo-call, .demo-note, .demo-wave, .demo-link, .show')
        .forEach(d => d.dispatchEvent(new Event(selected ? 'vn:show' : 'vn:hide')));
      link.classList.toggle('current', selected);
      if (selected) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    }
  }
  select(links.find(link => link.hash === location.hash) || links[0]);
  for (const link of links) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      select(link);
      history.replaceState(null, '', link.hash);
    });
  }
  function followHash() {
    const active = links.find(link => link.hash === location.hash);
    if (active) { select(active); document.getElementById(active.hash.slice(1)).scrollIntoView({block:'nearest'}); }
  }
  window.addEventListener('hashchange', followHash);
  document.querySelector('.hero-snippet')?.addEventListener('click', () => {
    const active = links.find(link => link.hash === document.querySelector('.hero-snippet').hash);
    if (active) select(active);
  });
}
configureGallery('.tour-tabs a');
configureGallery('.scenario-links a');

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const controls = document.querySelector('.site-theme');
let preference = 'system';
function readPreference() {
  try { preference = localStorage.getItem('vn-site-theme') || 'system'; } catch {}
}
const darkImages = {
  'images/files-example.webp': 'images/files-example-dark.webp',
  'images/phone.webp': 'images/phone-dark.webp',
  'images/okno-poverh.webp': 'images/okno-poverh-dark.webp',
  'images/rasshifrovka.webp': 'images/rasshifrovka-dark.webp',
  'images/listen-light.webp': 'images/listen-dark.webp',
  'images/mark-light.webp': 'images/mark-dark.webp',
  'images/document-light.webp': 'images/document-dark.webp'
};
for (const img of document.querySelectorAll('a.zoom img')) {
  const light = img.getAttribute('src');
  if (!img.dataset.dark && darkImages[light]) {
    img.dataset.light = light;
    img.dataset.dark = darkImages[light];
  }
}
function applyTheme() {
  const current = ['dark', 'light'].includes(preference) ? preference : (systemTheme.matches ? 'dark' : 'light');
  document.documentElement.dataset.vnTheme = current;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = current === 'dark' ? '#121a26' : '#f8f9ff';
  for (const button of controls.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.value === preference));
  }
  for (const img of document.querySelectorAll('img[data-dark]')) {
    const path = img.dataset[current];
    img.setAttribute('src',path);
    const zoom = img.closest('a.zoom');
    if (zoom) zoom.href = path;
    const enlarge = img.closest('figure')?.querySelector('.enlarge');
    if (enlarge) enlarge.href = path;
  }
  const openImage = document.querySelector('dialog[open] img');
  if (openImage && openImage.dataset.light) openImage.src = openImage.dataset[current];
}
for (const [value,label,icon] of [['light','Светлая','☀'],['dark','Тёмная','☾'],['system','Как в Windows','▣']]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.value = value;
  const symbol = document.createElement('span');
  symbol.setAttribute('aria-hidden','true');
  symbol.textContent = icon;
  button.append(symbol,document.createTextNode(label));
  button.onclick = () => {
    preference = value;
    try { localStorage.setItem('vn-site-theme',value); } catch {}
    applyTheme();
  };
  controls.append(button);
}
controls.hidden = false;
systemTheme.addEventListener('change',applyTheme);
function refreshTheme() { readPreference(); applyTheme(); }
window.addEventListener('pageshow',refreshTheme);
window.addEventListener('storage',refreshTheme);
refreshTheme();

const marksArt = document.querySelector('.marks-art');
if (marksArt && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      marksArt.classList.add('in-view');
      observer.disconnect();
    }
  }, {threshold: 0.5});
  observer.observe(marksArt);
}

function setupDictationDemo(demo) {
  const typed = demo.querySelector('.typed');
  const phrase = demo.querySelector('.phrase');
  const state = demo.querySelector('.dictation-state');
  const wave = demo.querySelector('.dictation-wave');
  const replay = demo.querySelector('.replay');
  const chips = Array.from(demo.querySelectorAll('.where-apps li'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const examples = [[phrase.textContent, 'MAX'],
    ['Пришлите, пожалуйста, договор до конца дня.', 'Почта'],
    ['Спасибо, всё получил. Отвечу завтра утром.', 'Telegram'],
    ['Итоги встречи: запуск переносим на тридцатое.', 'Word']];
  let n = 0, letters = Array.from(examples[0][0]), visible = false, pause = 0;
  function show() {
    const [text, app] = examples[n];
    letters = Array.from(text); phrase.textContent = text;
    chips.forEach(chip => chip.classList.toggle('on', chip.textContent.trim() === app));
  }
  let timer;
  function finish() {
    clearTimeout(timer); clearTimeout(pause);
    demo.classList.remove('playing');
    typed.textContent = letters.join('');
    state.textContent = 'Готово';
    wave.style.backgroundPositionY = '100%';
    if (replay) replay.hidden = reduced.matches;
    if (visible && !reduced.matches) pause = setTimeout(() => { n = (n + 1) % examples.length; play(); }, 2600);
  }
  function play() {
    clearTimeout(timer); clearTimeout(pause);
    show();
    if (reduced.matches) { finish(); return; }
    const start = performance.now();
    demo.classList.add('playing');
    function draw() {
      const frame = Math.floor((performance.now() - start) / 50);
      if (frame >= 70) { finish(); return; }
      wave.style.backgroundPositionY = (frame / 70 * 100) + '%';
      typed.textContent = '';
      state.textContent = frame < 60 ? 'Диктовка' : 'Распознавание';
      timer = setTimeout(draw, 50);
    }
    draw();
  }
  show();
  finish();
  if (!replay) {
    reduced.addEventListener('change', finish);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        const now = entries.some(entry => entry.isIntersecting);
        if (now && !visible) { visible = true; if (!demo.classList.contains('playing')) play(); }
        else if (!now && visible) { visible = false; clearTimeout(pause); }
      }, { threshold: 0.5 }).observe(demo);
    }
    return;
  }
  let pressedAt = 0;
  replay.addEventListener('click', event => { if (event.detail === 0) play(); });
  replay.addEventListener('keydown', event => {
    if (event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) play();
    }
  });
  replay.addEventListener('keyup', event => {
    if (event.key === ' ') { event.preventDefault(); finish(); }
  });
  replay.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    replay.setPointerCapture(event.pointerId);
    pressedAt = performance.now();
    play();
  });
  replay.addEventListener('pointerup', () => {
    if (performance.now() - pressedAt > 350) finish();
  });
  replay.addEventListener('pointercancel', finish);
  reduced.addEventListener('change', finish);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        play();
      }
    }, { threshold: 0.5 });
    observer.observe(demo);
  }
}
document.querySelectorAll('.dictation-demo').forEach(setupDictationDemo);

function createViewer() {
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label','Просмотр снимка программы');
  dialog.innerHTML = '<div class="viewer-tools"><strong>Экран программы</strong><div><button type="button" class="size">В натуральную величину</button> <button type="button" class="close">Закрыть</button></div></div><div class="viewer-scroll"><img alt=""></div>';
  document.body.append(dialog);
  const image = dialog.querySelector('img'), size = dialog.querySelector('.size');
  size.addEventListener('click', () => {
    const full = image.classList.toggle('actual');
    size.textContent = full ? 'Вписать в окно' : 'В натуральную величину';
    size.setAttribute('aria-pressed',String(full));
  });
  dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event => { if(event.target === dialog) dialog.close(); });
  return function open(link) {
    const ownImage = link.querySelector('img') || link.closest('figure')?.querySelector('img');
    image.dataset.light = ownImage?.dataset.light || link.href;
    image.dataset.dark = ownImage?.dataset.dark || link.href;
    image.src = link.href;
    image.alt = ownImage?.alt || 'Снимок программы';
    image.classList.remove('actual');
    size.textContent = 'В натуральную величину';
    size.setAttribute('aria-pressed','false');
    dialog.showModal();
  };
}
if (typeof HTMLDialogElement !== 'undefined') {
  const open = createViewer();
  document.addEventListener('click',event => {
    const link = event.target.closest('a.zoom');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();open(link);
  });
}
document.querySelectorAll('.mobile-nav a').forEach(link => {
  link.addEventListener('click', () => { link.closest('details').open = false; });
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function onFirstView(element, fn, threshold = 0.45) {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); fn(); }
  }, { threshold });
  observer.observe(element);
}

function setupTranscribeDemo(demo) {
  const bar = demo.querySelector('.am-prog i'), status = demo.querySelector('.am-status');
  const lines = Array.from(demo.querySelectorAll('.am-line')), go = demo.querySelector('[data-go]');
  const names = lines.map(line => line.querySelector('.who').textContent);
  const times = ['0:00', '0:07', '0:15', '0:23'];
  let timers = [];
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function finish() {
    timers.forEach(clearTimeout); timers = [];
    bar.style.width = '100%';
    lines.forEach((line, i) => {
      line.classList.add('show');
      const who = line.querySelector('.who'); who.textContent = names[i]; who.classList.remove('plain');
    });
    status.textContent = '✓ Готово: 3 участника · «Открыть в редакторе»';
    go.disabled = false;
  }
  function play() {
    if (reducedMotion.matches) { finish(); return; }
    timers.forEach(clearTimeout); timers = [];
    go.disabled = true;
    bar.style.width = '0';
    lines.forEach((line, i) => {
      line.classList.remove('show');
      const who = line.querySelector('.who'); who.textContent = times[i]; who.classList.add('plain');
    });
    status.textContent = 'Распознавание… фрагмент 1 из 12';
    for (let step = 1; step <= 10; step++) {
      later(step * 380, () => {
        bar.style.width = step * 10 + '%';
        if (step < 9) status.textContent = 'Распознавание… фрагмент ' + Math.min(12, step + 2) + ' из 12';
        const line = lines[Math.floor((step - 1) / 2)];
        if (line) line.classList.add('show');
      });
    }
    later(4200, () => { status.textContent = 'Текст готов и сохранён. Разделяю голоса…'; });
    later(5600, () => {
      lines.forEach((line, i) => {
        const who = line.querySelector('.who'); who.textContent = names[i]; who.classList.remove('plain');
      });
      status.textContent = '✓ Готово: 3 участника · «Открыть в редакторе»';
      go.disabled = false;
      if (visible) later(4500, play);
    });
  }
  let visible = false;
  go.addEventListener('click', play);
  demo.addEventListener('vn:show', () => { if (!visible) { visible = true; if (!go.disabled) play(); } });
  demo.addEventListener('vn:hide', () => { visible = false; finish(); });
  finish();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const now = entries.some(entry => entry.isIntersecting);
      if (now && !visible) { visible = true; if (!go.disabled) play(); }
      else if (!now && visible) { visible = false; finish(); }
    }, { threshold: 0.45 }).observe(demo);
  }
}
document.querySelectorAll('.demo-tr').forEach(setupTranscribeDemo);

function setupCallDemo(demo) {
  const vc = demo.querySelector('.vc'), stage = demo.querySelector('.vc-stage');
  const ovl = demo.querySelector('.call-ovl'), box = demo.querySelector('.ovl-lines');
  const close = demo.querySelector('.ovl-x'), pill = demo.querySelector('.ovl-pill');
  const open = pill.querySelector('.pill-open'), tip = demo.querySelector('.ovl-tip');
  const cursor = demo.querySelector('.demo-cursor');
  const scenes = Array.from(demo.querySelectorAll('.vc-scene'));
  const sizes = Array.from(demo.querySelectorAll('[data-size]'));
  const apps = Array.from(demo.querySelectorAll('button[data-app]'));
  const appName = demo.querySelector('.vc-app');
  const clocks = Array.from(demo.querySelectorAll('.vc-clock, .ovl-time, .pill-time'));
  let tiles = Array.from(demo.querySelectorAll('.vc-tile'));
  let auto = !reducedMotion.matches, shown = false, tipTimer = 0, scene = 0, sceneTick = 0;

  function showTip(text, ms) {
    tip.textContent = text; tip.hidden = false;
    tip.style.top = (pill.hidden ? ovl.offsetTop : pill.offsetTop + pill.offsetHeight + 6) + 'px';
    clearTimeout(tipTimer); tipTimer = setTimeout(() => { tip.hidden = true; }, ms);
  }
  function collapse() {
    pill.style.top = ovl.offsetTop + 'px';
    ovl.classList.add('closed'); ovl.inert = true;
    pill.hidden = false;
    showTip('Окно свёрнуто в значок: время записи на виду. Нажмите «Открыть» — окно вернётся.', 4500);
  }
  function restore() {
    ovl.classList.remove('closed'); ovl.inert = false;
    pill.hidden = true; tip.hidden = true; fit();
  }
  function setSize(mini) {
    sizes.forEach(b => b.setAttribute('aria-pressed', String((b.dataset.size === 'mini') === mini)));
    ovl.classList.toggle('mini', mini);
    setTimeout(fit, 400);
  }
  let userAt = 0;
  function byUser() { auto = false; userAt = Date.now(); cursor.classList.remove('on'); }
  function resumeAuto() {
    auto = true; sceneTick = 0;
    if (card) card.hidden = true;
    tip.hidden = true; restore(); setSize(false);
  }
  const card = demo.querySelector('.call-card');
  const cardRec = card && card.querySelector('.cc-rec');
  function showCard() {
    ovl.classList.add('closed'); ovl.inert = true; pill.hidden = true; tip.hidden = true;
    const appBox = card.querySelector('.cc-app');
    if (appBox && scenes.length) appBox.textContent = scenes[scene].dataset.app;
    card.hidden = false; card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  }
  function startRecording() {
    card.hidden = true; recSeconds = 0; showClock();
    pill.style.top = ovl.offsetTop + 'px'; pill.hidden = false;
    showTip('Запись идёт. Окно с текстом по ходу разговора — «Открыть».', 3000);
  }
  if (card) {
    cardRec.addEventListener('click', () => { byUser(); startRecording(); open.focus({ preventScroll: true }); });
    card.querySelector('.cc-x')?.addEventListener('click', () => {
      byUser(); card.hidden = true;
      showTip('Этот созвон пропущен. Начнётся новый — карточка появится снова.', 2600);
      setTimeout(restore, 2600);
    });
  }
  close.addEventListener('click', () => { byUser(); collapse(); open.focus({ preventScroll: true }); });
  open.addEventListener('click', () => { byUser(); restore(); close.focus({ preventScroll: true }); });
  pill.querySelector('.pill-name').addEventListener('click', () => {
    byUser(); showTip('«Назвать» — дать записи название, не открывая окна. Оно будет видно в «Записях».', 4000);
  });
  for (const button of sizes) button.addEventListener('click', () => { byUser(); setSize(button.dataset.size === 'mini'); });

  let seconds = Number(demo.dataset.start) || 7 * 60 + 3, recSeconds = seconds, clockTimer = null;
  const mmss = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  function showClock() {
    clocks.forEach(c => { c.textContent = mmss(c.classList.contains('vc-clock') ? seconds : recSeconds); });
  }
  function tickClock() { seconds++; recSeconds++; showClock(); }

  function speak(who) { tiles.forEach(t => t.classList.toggle('speaking', t.dataset.who === who)); }
  function addLine([who, text, task, color], quiet) {
    const p = document.createElement('p'); if (!quiet) p.className = 'fresh';
    const b = document.createElement('b'); b.textContent = who + ':';
    p.append(b, ' ', text);
    if (task) {
      const mark = document.createElement('mark'); mark.className = color || 'm-task';
      mark.textContent = task; p.append(mark);
    }
    box.append(p);
    while (box.children.length > 4) box.firstElementChild.remove();
    fit();
  }
  function fit() {
    if (!box.clientHeight) return;
    while (box.children.length > 1 && box.scrollHeight > box.clientHeight + 1) box.firstElementChild.remove();
  }
  box.addEventListener('transitionend', fit);

  let script = [], next = 0, lineTimer = null;
  function setScene(i) {
    scene = i; sceneTick = 0;
    const s = scenes[i];
    scenes.forEach(x => x.classList.toggle('on', x === s));
    tiles = Array.from(s.querySelectorAll('.vc-tile'));
    vc.dataset.app = s.dataset.app; appName.textContent = s.dataset.app;
    apps.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.app === s.dataset.app)));
    seconds = Number(s.dataset.start) || seconds; recSeconds = Math.max(0, seconds - 25); showClock();
    card && (card.hidden = true);
    script = JSON.parse(s.dataset.lines);
    const copy = demo.closest('.record-panel')?.querySelector('.record-copy');
    if (copy && s.dataset.copy) {
      const c = JSON.parse(s.dataset.copy), h = copy.querySelector('h3'), ul = copy.querySelector('ul');
      if (h.textContent !== c.h) {
        h.textContent = c.h;
        ul.replaceChildren(...c.li.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
        copy.classList.remove('swap'); void copy.offsetWidth; copy.classList.add('swap');
      }
    }
    box.textContent = '';
    script.slice(0, 3).forEach(line => addLine(line, true));
    next = 3; speak('');
  }
  if (scenes.length) {
    setScene(0);
    for (const button of apps) {
      button.addEventListener('click', () => {
        byUser(); restore(); setSize(false);
        setScene(scenes.findIndex(s => s.dataset.app === button.dataset.app));
      });
    }
  } else {
    const more = JSON.parse(demo.dataset.lines || '[]');
    script = Array.from(box.children, p => {
      const b = p.querySelector('b'), mark = p.querySelector('mark');
      let text = '';
      for (const node of p.childNodes) if (node.nodeType === 3) text += node.textContent;
      return [b ? b.textContent.replace(/:\s*$/, '') : '', text.replace(/^\s+/, ''),
              mark ? mark.textContent : '', mark ? mark.className : ''];
    }).concat(more);
    next = box.children.length;
  }
  function tickLine() {
    const line = script[next % script.length], at = scene;
    next++;
    speak(line[0]);
    setTimeout(() => { if (at === scene) addLine(line); }, 1300);
    if (!auto && !reducedMotion.matches && Date.now() - userAt > 15000) resumeAuto();
    if (scenes.length) story(++sceneTick);
    else meetStory(++sceneTick);
  }

  const slideBox = demo.querySelector('.slide'), slides = JSON.parse(demo.dataset.slides || 'null');
  let slideN = 0;
  function showSlide(n) {
    const s = slides[n]; slideN = n;
    slideBox.querySelector('.slide-title').textContent = s.t;
    slideBox.querySelector('ul').replaceChildren(...s.li.map(([state, text]) => {
      const li = document.createElement('li'), dot = document.createElement('i');
      dot.className = state; li.append(dot, text); return li;
    }));
    slideBox.querySelectorAll('.slide-chart i').forEach((bar, k) => { bar.style.height = s.c[k] + '%'; });
    slideBox.classList.remove('turn'); void slideBox.offsetWidth; slideBox.classList.add('turn');
  }
  function meetStory(t) {
    if (slides && slideBox && t % 3 === 0) showSlide((slideN + 1) % slides.length);
    if (!auto) return;
    const k = t % 16;
    const mini = sizes.find(b => b.dataset.size === 'mini'), normal = sizes.find(b => b.dataset.size === 'normal');
    if (k === 4) act(mini, () => setSize(true));
    if (k === 7) act(normal, () => setSize(false));
    if (k === 10) act(close, collapse);
    if (k === 12) act(open, restore);
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function point(el, dx, dy) {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return 'translate(' + Math.round(r.left - s.left + (dx ?? r.width / 2)) + 'px,' + Math.round(r.top - s.top + (dy ?? r.height / 2)) + 'px)';
  }
  function click() { cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click'); }
  async function act(el, fn) {
    if (!cursor.classList.contains('on')) {
      cursor.style.transition = 'none'; cursor.style.transform = point(el, -70, 60);
      void cursor.offsetWidth; cursor.style.transition = '';
      cursor.classList.add('on');
      await wait(300); if (!auto) return;
    }
    cursor.style.transform = point(el); await wait(1100); if (!auto) return;
    click(); fn(); await wait(900);
    if (auto) cursor.classList.remove('on');
  }
  let introAt = -1;
  async function intro() {
    if (!auto || !card || introAt === scene) return;
    introAt = scene;
    showCard();
    await wait(800); if (!auto) return;
    await act(cardRec, startRecording); if (!auto) return;
    await wait(1700); if (!auto) return;
    await act(open, restore);
  }
  function story(t) {
    if (!auto) return;
    const app = scenes[scene].dataset.app;
    const mini = sizes.find(b => b.dataset.size === 'mini'), normal = sizes.find(b => b.dataset.size === 'normal');
    if (app === 'Telegram' && t === 1) act(mini, () => setSize(true));
    if (app === 'Telegram' && t === 4) act(normal, () => setSize(false));
    if (app === 'WhatsApp' && t === 1) act(close, collapse);
    if (app === 'WhatsApp' && t === 3) act(open, restore);
    if (t === (app === 'MAX' ? 7 : 5)) {
      setTimeout(() => {
        if (!auto) return;
        setScene((scene + 1) % scenes.length); introAt = -1;
        if (scene === 0) intro();
      }, 2200);
    }
  }
  function start() {
    fit(); vc.classList.remove('idle');
    if (!clockTimer) clockTimer = setInterval(tickClock, 1000);
    if (!reducedMotion.matches && !lineTimer) {
      vc.classList.add('live'); lineTimer = setInterval(tickLine, 2600);
    }
  }
  function maybeIntro() { if (card && scene === 0 && introAt === -1) intro(); }
  function stop() {
    clearInterval(clockTimer); clockTimer = null; vc.classList.add('idle');
    clearInterval(lineTimer); lineTimer = null; vc.classList.remove('live'); speak('');
  }
  demo.addEventListener('vn:show', () => { start(); maybeIntro(); });
  demo.addEventListener('vn:hide', () => stop());
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const e = entries[entries.length - 1];
      if (e.isIntersecting && e.intersectionRatio >= 0.3) { start(); if (e.intersectionRatio >= 0.55) maybeIntro(); }
      else stop();
    }, { threshold: [0, 0.3, 0.55, 0.8] }).observe(demo);
  }
}
document.querySelectorAll('.demo-call').forEach(setupCallDemo);

function setupNoteDemo(demo) {
  const nm = demo.querySelector('.note-name');
  if (nm) nm.textContent = 'Заметка, ' + new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const vc = demo.querySelector('.vc'), stage = demo.querySelector('.note-stage');
  const out = demo.querySelector('.note-text'), hint = demo.querySelector('.note-hint');
  const words = demo.querySelector('.note-full').textContent.trim().split(/\s+/);
  const rec = demo.querySelector('.note-rec'), time = demo.querySelector('.note-time');
  const btn = demo.querySelector('.note-stop'), keys = demo.querySelector('.note-keys');
  const cursor = demo.querySelector('.demo-cursor');
  const foot = demo.querySelector('.note-foot'), footText = foot.textContent;
  let i = 0, typer = null, state = 'idle', visible = false, run = 0, busy = false, cycle = 0, userAt = 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const auto = () => !reducedMotion.matches && Date.now() - userAt > 15000;
  function show() { time.textContent = '00:' + String(Math.round(i / 2.3)).padStart(2, '0'); }
  function setState(s) {
    state = s;
    vc.classList.toggle('live', s === 'rec'); vc.classList.toggle('saved', s === 'saved');
    if (s === 'idle') {
      clearInterval(typer); typer = null; i = 0; out.textContent = ''; show();
      hint.hidden = false; foot.textContent = footText;
      rec.textContent = 'Голосовая заметка'; btn.textContent = '● Начать голосовую заметку';
    } else if (s === 'rec') {
      hint.hidden = true; rec.textContent = '● Идёт заметка'; btn.textContent = '■ Остановить и сохранить';
    } else {
      clearInterval(typer); typer = null; out.textContent = words.join(' '); i = words.length; show();
      hint.hidden = true; rec.textContent = '✓ Заметка сохранена'; btn.textContent = '● Начать голосовую заметку';
      foot.textContent = 'Сохранена в «Записях» вместе со звуком — можно переслушать и поправить.';
    }
  }
  function typeOn() {
    if (state === 'saved') setState('idle');
    setState('rec'); clearInterval(typer);
    typer = setInterval(() => {
      if (i >= words.length) { clearInterval(typer); typer = null; return; }
      out.textContent += (i ? ' ' : '') + words[i++]; show();
    }, 170);
  }
  function at(el) {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2];
  }
  const place = ([x, y]) => { cursor.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; };
  async function moveClick(el, my) {
    const [x, y] = at(el);
    cursor.style.transition = 'none'; place([x - 90, y + 70]); void cursor.offsetWidth; cursor.style.transition = '';
    cursor.classList.add('on'); await wait(250); if (my !== run) return false;
    place([x, y]); await wait(1050); if (my !== run) return false;
    cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click');
    setTimeout(() => { if (my === run) cursor.classList.remove('on'); }, 700);
    return true;
  }
  async function cycleOnce() {
    const my = ++run; busy = true;
    try {
      setState('idle'); await wait(900); if (my !== run) return;
      if (cycle % 2 === 0) {
        keys.classList.remove('press'); void keys.offsetWidth; keys.classList.add('press');
        await wait(800); if (my !== run) return;
      } else if (!(await moveClick(btn, my))) return;
      typeOn();
      await wait(words.length * 170 + 700); if (my !== run) return;
      if (!(await moveClick(btn, my))) return;
      setState('saved');
      await wait(3200); if (my !== run) return;
      cycle++;
      if (visible && auto()) cycleOnce();
    } finally {
      if (my === run && !visible) busy = false;
      if (my === run && state === 'saved' && !(visible && auto())) busy = false;
    }
  }
  function halt() { run++; busy = false; clearInterval(typer); typer = null; cursor.classList.remove('on'); }
  btn.addEventListener('click', () => {
    userAt = Date.now(); halt();
    if (state === 'rec') setState('saved'); else typeOn();
  });
  function seen(now) {
    visible = now;
    if (!now) { halt(); return; }
    if (!busy && auto()) cycleOnce();
  }
  setInterval(() => { if (visible && !busy && auto()) cycleOnce(); }, 2000);
  demo.addEventListener('vn:show', () => seen(true));
  demo.addEventListener('vn:hide', () => seen(false));
  if (reducedMotion.matches) setState('saved');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const e = entries[entries.length - 1];
      seen(e.isIntersecting && e.intersectionRatio >= 0.3);
    }, { threshold: [0, 0.3] }).observe(demo);
  } else setState('saved');
}
document.querySelectorAll('.demo-note').forEach(setupNoteDemo);

function setupWaveDemo(demo) {
  const wave = demo.querySelector('.wave-big'), state = demo.querySelector('.wave-state');
  const note = demo.querySelector('.wave-note'), keys = demo.querySelector('.wave-keys');
  const TEXT = {
    rec: ['Диктовка', 'пока держите Ctrl + Alt, волна сияет: программа вас слышит.'],
    proc: ['Распознавание', 'отпустили клавиши — волна сворачивается, текст распознаётся.'],
    done: ['Готово', 'текст со знаками препинания уже стоит у курсора.'],
  };
  let timer = 0, frame = 0;
  function say(k) { state.textContent = TEXT[k][0]; note.textContent = '— ' + TEXT[k][1]; keys.classList.toggle('down', k === 'rec'); }
  function draw(f) { wave.style.backgroundPositionY = (f / 70 * 100) + '%'; }
  function step() {
    let f;
    if (frame < 60) { f = frame; if (frame === 0) say('rec'); }
    else if (frame < 70) { f = frame; if (frame === 60) say('proc'); }
    else { f = 70; if (frame === 70) say('done'); }
    draw(f); frame = (frame + 1) % 100;
    timer = setTimeout(step, 65);
  }
  const go = () => { if (!timer && !reducedMotion.matches) step(); };
  const halt = () => { clearTimeout(timer); timer = 0; };
  say('rec'); draw(24);
  demo.addEventListener('vn:show', go);
  demo.addEventListener('vn:hide', halt);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => (entries[entries.length - 1].isIntersecting ? go() : halt()),
                             { threshold: 0.3 }).observe(demo);
  }
}
document.querySelectorAll('.demo-wave').forEach(setupWaveDemo);

function setupLinkDemo(demo) {
  const URL_TEXT = 'https://www.youtube.com/watch?v=lekciya-szhatie';
  const mock = demo.querySelector('.link-mock'), url = demo.querySelector('.link-url');
  const ph = demo.querySelector('.link-ph'), go = demo.querySelector('.link-go'), field = demo.querySelector('.link-input');
  const bar = demo.querySelector('.am-prog i'), status = demo.querySelector('.link-status');
  const lines = Array.from(demo.querySelectorAll('.am-line'));
  const names = lines.map(line => line.querySelector('.who').textContent);
  const times = ['0:00', '0:06', '0:13', '0:19'];
  const cursor = demo.querySelector('.demo-cursor');
  let run = 0, busy = false, visible = false, userAt = 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const auto = () => !reducedMotion.matches && Date.now() - userAt > 15000;
  function reset() {
    url.textContent = ''; ph.hidden = false; field.classList.remove('focus'); bar.style.width = '0';
    status.textContent = 'Вставьте ссылку и нажмите «Расшифровать»'; go.disabled = false;
    lines.forEach((line, i) => {
      line.classList.remove('show');
      const who = line.querySelector('.who'); who.textContent = times[i]; who.classList.add('plain');
    });
  }
  function done() {
    url.textContent = URL_TEXT; ph.hidden = true; bar.style.width = '100%'; go.disabled = false;
    lines.forEach((line, i) => {
      line.classList.add('show');
      const who = line.querySelector('.who'); who.textContent = names[i]; who.classList.remove('plain');
    });
    status.textContent = '✓ Готово: 2 участника · «Открыть в редакторе»';
  }
  function at(el) {
    const s = mock.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [r.left - s.left + Math.min(r.width / 2, 60), r.top - s.top + r.height / 2];
  }
  const place = ([x, y]) => { cursor.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; };
  async function moveClick(el, my) {
    const [x, y] = at(el);
    if (!cursor.classList.contains('on')) {
      cursor.style.transition = 'none'; place([x - 80, y + 70]); void cursor.offsetWidth; cursor.style.transition = '';
      cursor.classList.add('on'); await wait(250); if (my !== run) return false;
    }
    place([x, y]); await wait(1050); if (my !== run) return false;
    cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click');
    return true;
  }
  async function process(my) {
    go.disabled = true;
    const steps = [[8, 'Проверяю ссылку…'], [22, 'Субтитров нет — скачиваю звук… 40 %'], [38, 'Скачиваю звук… 100 %'],
                   [50, 'Распознавание… фрагмент 3 из 9'], [64, 'Распознавание… фрагмент 5 из 9'],
                   [78, 'Распознавание… фрагмент 7 из 9'], [90, 'Распознавание… фрагмент 9 из 9']];
    for (let k = 0; k < steps.length; k++) {
      bar.style.width = steps[k][0] + '%'; status.textContent = steps[k][1];
      if (k >= 3) lines[k - 3]?.classList.add('show');
      await wait(650); if (my !== run) return false;
    }
    status.textContent = 'Текст готов и сохранён. Разделяю голоса…'; bar.style.width = '96%';
    await wait(1200); if (my !== run) return false;
    done();
    return true;
  }
  async function cycle() {
    const my = ++run; busy = true;
    try {
      reset(); await wait(700); if (my !== run) return;
      if (!(await moveClick(field, my))) return;
      field.classList.add('focus'); ph.hidden = true;
      for (const ch of URL_TEXT) { url.textContent += ch; await wait(28); if (my !== run) return; }
      await wait(300); if (my !== run) return;
      if (!(await moveClick(go, my))) return;
      field.classList.remove('focus');
      setTimeout(() => { if (my === run) cursor.classList.remove('on'); }, 600);
      if (!(await process(my))) return;
      await wait(4500); if (my !== run) return;
      if (visible && auto()) cycle();
    } finally {
      if (my === run && !(visible && auto())) busy = false;
    }
  }
  function halt() { run++; busy = false; cursor.classList.remove('on'); }
  go.addEventListener('click', () => {
    userAt = Date.now(); halt();
    const my = run; url.textContent = URL_TEXT; ph.hidden = true;
    lines.forEach(line => line.classList.remove('show'));
    process(my);
  });
  function seen(now) {
    visible = now;
    if (!now) { halt(); done(); return; }
    if (!busy && auto()) cycle();
  }
  setInterval(() => { if (visible && !busy && auto()) cycle(); }, 2000);
  done();
  demo.addEventListener('vn:show', () => seen(true));
  demo.addEventListener('vn:hide', () => seen(false));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const e = entries[entries.length - 1];
      seen(e.isIntersecting && e.intersectionRatio >= 0.4);
    }, { threshold: [0, 0.4] }).observe(demo);
  }
}
document.querySelectorAll('.demo-link').forEach(setupLinkDemo);

if ('IntersectionObserver' in window) {
  document.querySelectorAll('.no-cloud').forEach(el => new IntersectionObserver(entries => {
    el.classList.toggle('paused', !entries[entries.length - 1].isIntersecting);
  }).observe(el));
}

for (const block of document.querySelectorAll('.record')) {
  const tabs = Array.from(block.querySelectorAll('[role=tab]'));
  const select = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.querySelectorAll('.demo-call, .demo-note').forEach(d => d.dispatchEvent(new Event(on ? 'vn:show' : 'vn:hide')));
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, n) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (k) { event.preventDefault(); select(tabs[(n + k + tabs.length) % tabs.length], true); }
    });
  });
}

function setupEditorDemo(demo) {
  const toast = demo.querySelector('.ed-toast');
  const rows = Array.from(demo.querySelectorAll('.ed-row'));
  const listen = demo.querySelector('.ed-listen'), track = demo.querySelector('.ed-track i');
  const time = demo.querySelector('.ed-time');
  const TOTAL = 38;
  let picked = null;

  for (const text of demo.querySelectorAll('.ed-x')) {
    const words = text.textContent.split(/(\s+)/);
    text.textContent = '';
    for (const part of words) {
      if (/^\s+$/.test(part) || !part) { text.append(part); continue; }
      const w = document.createElement('span'); w.className = 'ed-word'; w.textContent = part; text.append(w);
    }
  }
  const starts = rows.map(r => Number(r.dataset.start));
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  let playing = false, raf = 0, pos = 0, last = 0;
  function rowAt(t) { let i = 0; for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k; return i; }
  function render() {
    const i = rowAt(pos), row = rows[i];
    const end = i + 1 < starts.length ? starts[i + 1] : TOTAL;
    const words = Array.from(row.querySelectorAll('.ed-word'));
    const k = Math.min(words.length - 1, Math.floor((pos - starts[i]) / (end - starts[i]) * words.length));
    rows.forEach(r => r.classList.toggle('playing', r === row && playing));
    demo.querySelectorAll('.ed-word.now').forEach(w => w.classList.remove('now'));
    if (playing && words[k]) words[k].classList.add('now');
    track.style.width = (pos / TOTAL * 100) + '%';
    time.textContent = fmt(pos) + ' / ' + fmt(TOTAL);
  }
  function frame(now) {
    pos += (now - last) / 1000; last = now;
    if (pos >= TOTAL) { pos = TOTAL; pause(); return; }
    render(); raf = requestAnimationFrame(frame);
  }
  function play(from) {
    if (typeof from === 'number') pos = from;
    if (pos >= TOTAL) pos = 0;
    playing = true; listen.textContent = '❚❚ Пауза'; listen.setAttribute('aria-pressed', 'true');
    toast.textContent = '▶ В примере без звука: подсветка идёт по словам, как в программе со звуком. Пробел — пауза.';
    if (reducedMotion.matches) { render(); return; }
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function pause() {
    playing = false; cancelAnimationFrame(raf);
    listen.textContent = '▶ Слушать'; listen.setAttribute('aria-pressed', 'false'); render();
  }
  listen.addEventListener('click', () => (playing ? pause() : play()));
  demo.querySelector('.ed-back').addEventListener('click', () => { pos = Math.max(0, pos - 10); render(); });
  demo.querySelector('.ed-fwd').addEventListener('click', () => { pos = Math.min(TOTAL - 0.1, pos + 10); render(); });
  demo.addEventListener('keydown', event => {
    if (event.key === ' ' && !event.target.matches('input, button, [contenteditable="true"]')) { event.preventDefault(); playing ? pause() : play(); }
  });

  for (const input of demo.querySelectorAll('.ed-side input')) {
    let previous = input.value;
    input.addEventListener('input', () => {
      const value = input.value.trim() || 'Спикер ' + input.dataset.s;
      const all = demo.querySelectorAll('.ed-w[data-s="' + input.dataset.s + '"]');
      for (const who of all) {
        who.textContent = value;
        who.classList.remove('flash'); void who.offsetWidth; who.classList.add('flash');
      }
      toast.textContent = '✓ «' + previous + '» теперь «' + value + '» — во всей записи, реплик: ' + all.length;
      previous = value;
    });
  }
  function pick(row) { rows.forEach(r => r.classList.remove('picked')); row.classList.add('picked'); picked = row; }
  for (const row of rows) {
    row.addEventListener('click', event => {
      if (event.target.closest('.ed-play')) { pick(row); play(Number(row.dataset.start)); return; }
      pick(row);
    });
    row.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === row) {
        event.preventDefault(); event.stopPropagation(); pick(row);
        toast.textContent = 'Реплика выбрана — нажмите цвет справа, чтобы отметить её.';
      }
    });
  }
  function startEdit(text, word) {
    if (text.isContentEditable) return;
    text.contentEditable = 'true'; text.classList.add('editing'); text.focus();
    const range = document.createRange();
    if (word) range.selectNodeContents(word); else { range.selectNodeContents(text); range.collapse(false); }
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    toast.textContent = 'Впишите своё слово и нажмите Enter.';
  }
  function endEdit(text) {
    if (!text.isContentEditable) return;
    text.contentEditable = 'false'; text.classList.remove('editing');
    toast.textContent = '✓ Исправлено. В программе правка сохраняется сразу и попадает в документ.';
  }
  for (const text of demo.querySelectorAll('.ed-x')) {
    text.addEventListener('dblclick', event => startEdit(text, event.target.closest('.ed-word')));
    text.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); endEdit(text); text.blur(); }
      event.stopPropagation();
    });
    text.addEventListener('blur', () => endEdit(text));
  }
  let saved = null;
  document.addEventListener('selectionchange', () => {
    const selection = getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const text = (node.nodeType === 1 ? node : node.parentElement).closest('.ed-x');
    if (text && demo.contains(text) && range.toString().trim()) saved = { range: range.cloneRange(), text };
  });
  for (const button of demo.querySelectorAll('.ed-marks button')) {
    button.addEventListener('click', () => {
      const name = '«' + button.textContent + '»';
      if (saved && saved.text.isConnected) {
        const mark = document.createElement('mark');
        mark.className = 'ed-mark ' + button.dataset.m;
        try { saved.range.surroundContents(mark); }
        catch { mark.append(saved.range.extractContents()); saved.range.insertNode(mark); }
        pick(saved.text.closest('.ed-row'));
        saved = null;
        getSelection().removeAllRanges();
        toast.textContent = 'Отмечено ' + name + ' — только выделенные слова. В документ попадут «Итогом по цветам».';
        return;
      }
      if (!picked) { toast.textContent = 'Выделите мышью слова в реплике и нажмите цвет'; return; }
      picked.querySelector('.ed-x').classList.add(button.dataset.m);
      toast.textContent = 'Отмечена вся реплика ' + name + '. Чтобы отметить только слова — выделите их мышью.';
    });
  }
  render();

  const cursor = demo.querySelector('.demo-cursor');
  let tour = false, touched = false;
  const stopTour = () => { touched = true; if (tour) { tour = false; cursor.classList.remove('on'); } };
  const tip = document.createElement('span'); tip.className = 'cur-tip';
  if (cursor) cursor.append(tip);
  const say = (text, short) => { toast.textContent = text; tip.textContent = short || ''; };
  demo.addEventListener('pointerdown', stopTour, true);
  demo.addEventListener('keydown', stopTour, true);
  function resetEditor() {
    demo.querySelectorAll('mark.ed-mark').forEach(mark => mark.replaceWith(...mark.childNodes));
    for (const input of demo.querySelectorAll('.ed-side input')) {
      const name = 'Спикер ' + input.dataset.s;
      if (input.value !== name) { input.value = name; input.dispatchEvent(new Event('input')); }
    }
    if (playing) pause();
    pos = 0; render();
  }
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function point(el, dx, dy) {
    const s = demo.getBoundingClientRect(), r = el.getBoundingClientRect();
    return 'translate(' + Math.round(r.left - s.left + (dx ?? r.width / 2)) + 'px,' + Math.round(r.top - s.top + (dy ?? r.height / 2)) + 'px)';
  }
  function tap() { cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click'); }
  async function type(input, text) {
    input.classList.add('typing'); input.value = '';
    for (const ch of text) { if (!tour) break; input.value += ch; await wait(75); }
    input.value = text; input.classList.remove('typing');
    input.dispatchEvent(new Event('input'));
  }
  async function showTour() {
    if (tour || touched || reducedMotion.matches || !cursor) return;
    tour = true; resetEditor();
    const words = Array.from(rows[1].querySelectorAll('.ed-word'));
    const from = words.findIndex(w => w.textContent === 'сдам');
    const target = from >= 0 ? words.slice(from) : words.slice(-3);
    cursor.style.transition = 'none'; cursor.style.transform = point(rows[0], 60, 12);
    void cursor.offsetWidth; cursor.style.transition = '';
    cursor.classList.add('on');
    say('Смотрите: выделяем слова и отмечаем цветом.', 'Выделяем слова');
    await wait(500); if (!tour) return;
    cursor.style.transform = point(target[0], 1, 6); await wait(1100); if (!tour) return;
    const selection = getSelection(), range = document.createRange();
    range.setStartBefore(target[0]);
    cursor.style.transition = 'transform .22s linear, opacity .3s';
    for (const w of target) {
      range.setEndAfter(w); selection.removeAllRanges(); selection.addRange(range);
      cursor.style.transform = point(w, w.getBoundingClientRect().width, 6);
      await wait(240); if (!tour) { selection.removeAllRanges(); return; }
    }
    cursor.style.transition = '';
    await wait(500); if (!tour) return;
    const task = demo.querySelector('.ed-marks [data-m="m-task"]');
    cursor.style.transform = point(task); await wait(1100); if (!tour) return;
    tip.textContent = 'Отмечаем «Задача»'; tap(); task.click(); await wait(1800); if (!tour) return;
    const [first, second] = demo.querySelectorAll('.ed-side input');
    tip.textContent = 'Переименуем спикеров'; cursor.style.transform = point(first, 40); await wait(1100); if (!tour) return;
    tap(); await type(first, 'Руководитель'); await wait(1300); if (!tour) return;
    cursor.style.transform = point(second, 40); await wait(1000); if (!tour) return;
    tap(); await type(second, 'Дизайнер'); await wait(1500); if (!tour) return;
    tip.textContent = 'Слушаем — слова подсвечиваются'; cursor.style.transform = point(listen); await wait(1100); if (!tour) return;
    tap(); play(0); await wait(9000); if (!tour) return;
    if (playing) pause();
    tour = false; cursor.classList.remove('on'); tip.textContent = '';
    toast.textContent = 'Теперь сами: «▶ Слушать», впишите имя участника или выделите слова и нажмите цвет.';
  }
  const tryBox = demo.closest('.tour-slide')?.querySelector('.ed-try');
  if (tryBox) tryBox.addEventListener('click', event => {
    const b = event.target.closest('button[data-try]');
    if (!b) return;
    stopTour();
    const pulse = el => { el.classList.remove('ed-pulse'); void el.offsetWidth; el.classList.add('ed-pulse'); };
    if (b.dataset.try === 'fix') {
      const text = rows[0].querySelector('.ed-x');
      const word = Array.from(text.querySelectorAll('.ed-word')).find(w => w.textContent.startsWith('утро')) || text.querySelector('.ed-word');
      startEdit(text, word); pulse(text);
    } else if (b.dataset.try === 'name') {
      const input = demo.querySelector('.ed-side input');
      input.focus(); input.select(); pulse(input);
      toast.textContent = 'Впишите имя — оно заменится во всей записи.';
    } else if (b.dataset.try === 'mark') {
      const words = Array.from(rows[1].querySelectorAll('.ed-word'));
      const from = Math.max(0, words.findIndex(w => w.textContent === 'сдам'));
      const range = document.createRange();
      range.setStartBefore(words[from]); range.setEndAfter(words[words.length - 1]);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      pulse(demo.querySelector('.ed-marks'));
      toast.textContent = 'Слова выделены — нажмите цвет справа: «Задача», «Важно»…';
    } else {
      if (playing) pause();
      play(Number(rows[0].dataset.start));
    }
  });
  function seenEditor(now) {
    if (now) { showTour(); return; }
    if (tour) { tour = false; cursor.classList.remove('on'); if (playing) pause(); }
  }
  demo.addEventListener('vn:show', () => seenEditor(true));
  demo.addEventListener('vn:hide', () => seenEditor(false));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const e = entries[entries.length - 1];
      seenEditor(e.isIntersecting && e.intersectionRatio >= 0.35);
    }, { threshold: [0, 0.35] }).observe(demo);
  }
}
document.querySelectorAll('.ed-mock').forEach(setupEditorDemo);

(function themeHint() {
  const group = document.querySelector('.site-theme');
  if (!group) return;
  group.setAttribute('aria-label', 'Тема программы на снимках и сайта');
  for (const button of group.querySelectorAll('button')) {
    const text = Array.from(button.childNodes).find(n => n.nodeType === 3);
    if (text) {
      button.title = text.textContent + ' — так выглядит программа';
      const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text.textContent;
      text.replaceWith(sr);
    }
  }
  const menu = document.querySelector('.mobile-nav div'), home = group.parentElement, after = group.nextElementSibling;
  const narrow = matchMedia('(max-width: 630px)');
  const place = () => {
    if (narrow.matches && menu && group.parentElement !== menu) {
      menu.insertBefore(group, menu.querySelector('.menu-sub')); group.classList.add('in-menu'); }
    else if (!narrow.matches && group.parentElement !== home) { home.insertBefore(group, after); group.classList.remove('in-menu'); }
  };
  place(); narrow.addEventListener('change', place);
  const toast = document.createElement('div');
  toast.className = 'theme-toast';
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  let hideTimer;
  group.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const text = { light: 'Окна программы на снимках — в светлой теме.',
                   dark: 'Окна программы на снимках — в тёмной теме.',
                   system: 'Как в Windows: тема программы следует настройке системы.' }[button.value];
    toast.textContent = text + ' В самой программе тема выбирается в «Настройки» → «Вид».';
    toast.classList.add('on');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.classList.remove('on'), 4200);
  });
})();

(function reveal() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.no-cloud').forEach(f => f.classList.add('in-view'));
    return;
  }
  const items = document.querySelectorAll(
    '.section-heading, .editor-intro, .tour, .feature-panel, .secure-grid > div, .sensitive, .use, .free-band, .tariff, .faq details, .final-inner');
  document.documentElement.classList.add('reveal-on');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
      el.style.transitionDelay = Math.min(6, Math.max(0, siblings.indexOf(el))) * 60 + 'ms';
      el.classList.add('shown');
      observer.unobserve(el);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  for (const el of items) {
    if (el.getBoundingClientRect().top < innerHeight) continue;   // уже на экране — не трогаем
    el.classList.add('reveal'); observer.observe(el);
  }
  document.querySelectorAll('.no-cloud').forEach(f => onFirstView(f, () => f.classList.add('in-view'), 0.5));
  document.querySelectorAll('.prices').forEach(p => onFirstView(p, () => p.classList.add('in-view'), 0.5));
})();

(function openLinkedDetails() {
  function openTo(id) {
    const el = id && document.getElementById(id);
    const d = el && el.closest('details');
    if (!d) return false;
    d.open = true;
    el.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || a.pathname !== location.pathname) return;
    const id = decodeURIComponent(a.hash.slice(1));
    if (openTo(id)) { e.preventDefault(); history.replaceState(null, '', '#' + id); }
  });
  if (location.hash) openTo(decodeURIComponent(location.hash.slice(1)));
  addEventListener('hashchange', () => openTo(decodeURIComponent(location.hash.slice(1))));
})();

(function notebookMotion() {
for (const holder of document.querySelectorAll('[data-notebook-motion]')) {
  const film = holder.querySelector('video');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!window.IntersectionObserver || !film.canPlayType('video/webm; codecs="vp9"')) continue;
  let nearby = false, visible = false, alphaReady = false, failed = false;

  function update() {
    if (failed || reduce.matches) {
      film.pause();
      film.hidden = true;
      if (film.readyState) film.currentTime = 0;
      return;
    }
    if (nearby && !document.hidden && !film.hasAttribute('src')) film.src = holder.dataset.notebookMotion;
    if (!visible || document.hidden) { film.pause(); return; }
    if (film.hasAttribute('src')) {
      film.hidden = !alphaReady;
      film.play().catch(() => {});
    }
  }
  film.addEventListener('loadeddata', () => {
    try {
      const probe = document.createElement('canvas');
      probe.width = probe.height = 1;
      const ctx = probe.getContext('2d', {willReadFrequently:true});
      ctx.drawImage(film, 0, 0, 1, 1, 0, 0, 1, 1);
      alphaReady = ctx.getImageData(0,0,1,1).data[3] === 0;
    } catch {
      alphaReady = location.protocol === 'file:';
    }
    failed = !alphaReady;
    update();
  });
  film.addEventListener('error', () => { failed = true; film.hidden = true; });
  new IntersectionObserver(([entry]) => { nearby = entry.isIntersecting; update(); },
    {rootMargin:'180px 0px'}).observe(holder);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(holder);
  document.addEventListener('visibilitychange', update);
  reduce.addEventListener('change', update);
}

})();

const SHOW_STEPS = {
  listen: [
    { f: 0, to: [3.5, 37.7], cap: 'Возле каждой реплики — время и кнопка ▶', wait: 1300 },
    { click: 1, band: [33.5, 41.8], sweep: [21.9, 73.1, 37.7], cap: 'Нажали ▶ — слышна именно эта фраза, подсветка идёт по словам', wait: 3600 },
    { to: [61.9, 6.6], cap: '«Участники…» — подписать, кто говорит', wait: 1300 },
    { click: 1, wait: 350 },
    { f: 1, to: [35.5, 15], cap: 'Впишите имена — они заменятся во всей записи. «▶ Голос» — послушать, кто это', wait: 3400 }
  ],
  mark: [
    { f: 0, to: [51.7, 45.7], cap: 'Выделите мышью слова в реплике', wait: 1200 },
    { drag: [74.1, 45.7], wait: 1000 },
    { f: 1, cap: 'Сразу появляется: Важно, Вопрос, Цитата, Задача, Решение, Заметка', wait: 1700 },
    { to: [58.3, 54.5], wait: 1000 },
    { click: 1, wait: 350 },
    { f: 2, hide: 1, cap: 'Отметка — справа, в «Отметках и заметках»: со временем и говорящим', wait: 2800 },
    { to: [87, 57], cap: 'Отсюда — послушать это место, добавить заметку или снять отметку', wait: 2800 }
  ],
  doc: [
    { f: 0, to: [91.7, 6.6], cap: 'Из отметок — документ: нажмите «Собрать документ»', wait: 1500 },
    { click: 1, wait: 350 },
    { f: 1, to: [46.9, 3.9], cap: 'Что взять: всё отмеченное, итог по цветам, только «Важно» — или весь текст', wait: 2900 },
    { click: 1, wait: 350 },
    { f: 2, to: [87.7, 3.9], cap: 'Весь текст записи — со временем или без', wait: 2500 },
    { click: 1, wait: 300 },
    { f: 3, to: [27.5, 37.8], cap: 'Документ — в редакторе: заголовки, жирный, списки', wait: 2600 },
    { f: 4, to: [21, 95], cap: 'Пишите прямо в документе: дописать, исправить — как в Word', wait: 3000 },
    { to: [65, 45], cap: '«Картинка…» — вставить снимок экрана или схему', wait: 1600 },
    { click: 1, wait: 350 },
    { f: 5, to: [27, 75], cap: 'Схема — прямо в документе, рядом с текстом', wait: 3000 },
    { f: 6, hide: 1, cap: '«Причесать»: программа уберёт «э-э», «ну» и повторы', wait: 2300 },
    { f: 7, cap: 'Готово одним нажатием — дальше «Сохранить в Word»', wait: 3200 }
  ]
};
function setupShow(show) {
  const steps = SHOW_STEPS[show.dataset.show];
  if (!steps) return;
  const stage = show.querySelector('.show-stage'), frames = Array.from(show.querySelectorAll('.sf'));
  const cursor = show.querySelector('.demo-cursor'), cap = show.querySelector('.show-cap');
  const band = show.querySelector('.show-band'), sweep = show.querySelector('.show-sweep');
  let cur = 0, run = 0, visible = false, tabOn = !show.closest('[hidden]'), hold = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function frame(i) { cur = i; frames.forEach((f, k) => f.classList.toggle('on', k === i)); }
  function box() {
    const s = stage.getBoundingClientRect(), r = frames[cur].getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }
  function place(xy) { const b = box(); cursor.style.transform = 'translate(' + Math.round(b.x + b.w * xy[0] / 100) + 'px,' + Math.round(b.y + b.h * xy[1] / 100) + 'px)'; }
  function tap() { cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click'); }
  function overlays(st) {
    band.hidden = !st.band; sweep.hidden = !st.sweep;
    if (st.band) { const b = box(); Object.assign(band.style, { left: b.x + 'px', top: (b.y + b.h * st.band[0] / 100) + 'px', width: b.w + 'px', height: (b.h * (st.band[1] - st.band[0]) / 100) + 'px' }); }
    if (st.sweep) {
      const b = box(), [x1, x2, y] = st.sweep, w = b.w * 0.06, h = b.h * 0.05;
      Object.assign(sweep.style, { transition: 'none', width: w + 'px', height: h + 'px', top: (b.y + b.h * y / 100 - h / 2) + 'px', left: (b.x + b.w * x1 / 100) + 'px' });
      void sweep.offsetWidth;
      sweep.style.transition = 'left ' + (st.wait / 1000 - 0.3) + 's linear';
      sweep.style.left = (b.x + b.w * x2 / 100 - w) + 'px';
    }
  }
  async function loop(id) {
    frame(0); cursor.classList.remove('on'); band.hidden = sweep.hidden = true;
    await wait(400);
    while (run === id) {
      for (const st of steps) {
        if (run !== id) return;
        if (st.f !== undefined) frame(st.f);
        if (st.cap && cap.textContent !== st.cap) { cap.textContent = st.cap; cap.classList.remove('new'); void cap.offsetWidth; cap.classList.add('new'); }
        if (st.hide) cursor.classList.remove('on');
        if (st.to) { cursor.classList.add('on'); place(st.to); }
        if (st.drag) { cursor.style.transition = 'transform .9s linear, opacity .3s'; place(st.drag); setTimeout(() => { cursor.style.transition = ''; }, 950); }
        if (st.click) tap();
        overlays(st);
        await wait(st.wait);
      }
      band.hidden = sweep.hidden = true; cursor.classList.remove('on');
      await wait(1500);
      if (run === id) frame(0);
    }
  }
  function update() {
    const go = visible && tabOn && !hold && !reducedMotion.matches;
    if (go && !run) loop(run = Date.now());
    if (!go && run) { run = 0; cursor.classList.remove('on'); band.hidden = sweep.hidden = true; }
  }
  if (reducedMotion.matches) { frame(steps.reduce((m, s) => s.f !== undefined ? s.f : m, 0)); cap.textContent = steps[steps.length - 1].cap; }
  show.addEventListener('vn:show', () => { tabOn = true; update(); });
  show.addEventListener('vn:hide', () => { tabOn = false; update(); });
  show.addEventListener('pointerdown', () => { clearTimeout(hold); hold = setTimeout(() => { hold = 0; update(); }, 15000); update(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[es.length - 1].intersectionRatio >= 0.35; update(); }, { threshold: [0, 0.35] }).observe(show);
}
document.querySelectorAll('.show').forEach(setupShow);
