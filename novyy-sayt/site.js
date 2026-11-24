function configureGallery(selector) {
  const links = Array.from(document.querySelectorAll(selector));
  if (!links.length) return;
  function select(active) {
    for (const link of links) {
      const selected = link === active;
      const panel = document.getElementById(link.hash.slice(1));
      panel.hidden = !selected;
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
  // The hero may link to a currently hidden slide, including the already active URL.
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
  // Пример идёт по кругу, пока он на экране, без кнопки «Повторить» (владелец 24.11: «убрать кнопку,
  // чтобы постоянно ходил»), и меняет место вставки — оно подсвечено в строке «Текст встанет туда…».
  // Первая фраза — из настроек сайта.
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
  // The sprite holds 60 recording frames, 10 processing frames, and the done frame,
  // rendered by the Windows app's SilkWaveOverlay at its native 20 fps.
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
      typed.textContent = letters.slice(0, Math.ceil(letters.length * Math.min(1, frame / 59))).join('');
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
  // A tap plays to the end. A long press ends the example on release.
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

/* ── Живые примеры (Claude, 24.11): расшифровка, окно созвона, редактор; тема; появление блоков ── */
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
      // По кругу, пока пример на экране (владелец 24.11: «картинки тоже стоит по кругу пропустить»).
      if (visible) later(4500, play);
    });
  }
  let visible = false;
  go.addEventListener('click', play);
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
  // Видеозвонок с нашим окном поверх (владелец 24.11: «изображение собеседника как в Zoom… MAX,
  // Telegram»; «закрываешь крестиком — остаётся маленькое окошко»). Крестик сворачивает окно
  // в значок «● Запись 07:12 · Назвать · Открыть», как ZnachokZapisi в программе.
  // Сценки (владелец 24.11: «нажимаешь — ничего не меняется… разных героев, разные сценки… и разные
  // варианты окошек»): у MAX, Telegram, WhatsApp и Zoom свои герои, фон и разговор; сами сменяют друг
  // друга, курсор по ходу показывает «Мини», крестик и «Открыть». Любое нажатие человека — показ стоп.
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
    pill.hidden = true; tip.hidden = true;
  }
  function setSize(mini) {
    sizes.forEach(b => b.setAttribute('aria-pressed', String((b.dataset.size === 'mini') === mini)));
    ovl.classList.toggle('mini', mini);
    for (const p of box.children) p.classList.remove('cut');
    setTimeout(fit, 400);
  }
  function byUser() { auto = false; cursor.classList.remove('on'); }
  // Карточка «Похоже, идёт созвон», как в программе (app.py: «Записать созвон», закрыть — пропустить
  // этот созвон). Владелец 24.11: «сначала та, которая всплывает, — записать, либо крестиком закрыть».
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

  // Часы записи идут, пока пример на экране.
  // Двое часов: сколько идёт звонок (заголовок звонилки) и сколько идёт наша запись (окно и значок).
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
  // Реплика, которая не влезла целиком, прячется: обрезанная сверху строка читалась как
  // отметка без говорящего (замечание владельца 24.11 по снимку окна встречи).
  function fit() {
    const top = box.getBoundingClientRect().top;
    for (const p of box.children) p.classList.toggle('cut', p.getBoundingClientRect().top < top - 1);
  }
  box.addEventListener('transitionend', fit);

  // Разговор идёт по кругу, пока пример на экране (владелец 24.11: «лучше бы всегда болтали»).
  // Без сценок (встреча) — первые реплики из окна + продолжение из data-lines.
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
    // Надпись справа — своя у каждой сценки (владелец 24.11: «почему разные надписи не сделать?»).
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
    if (scenes.length) story(++sceneTick);
    else meetStory(++sceneTick);
  }

  // Встреча: слайды листаются по ходу разговора (владелец 24.11: «внизу стоит 4 / 9» — стояло на месте).
  const slideBox = demo.querySelector('.slide'), slides = JSON.parse(demo.dataset.slides || 'null');
  let slideN = 0;
  function showSlide(n) {
    const s = slides[n]; slideN = n;
    slideBox.querySelector('.slide-kicker').textContent = 'Планёрка · слайд ' + s.n + ' из 9';
    slideBox.querySelector('.slide-title').textContent = s.t;
    slideBox.querySelector('ul').replaceChildren(...s.li.map(([state, text]) => {
      const li = document.createElement('li'), dot = document.createElement('i');
      dot.className = state; li.append(dot, text); return li;
    }));
    slideBox.querySelectorAll('.slide-chart i').forEach((bar, k) => { bar.style.height = s.c[k] + '%'; });
    demo.querySelector('.slide-num').textContent = s.n + ' / 9';
    slideBox.classList.remove('turn'); void slideBox.offsetWidth; slideBox.classList.add('turn');
  }
  // Встреча по кругу: слайд — каждые три реплики; курсор — «Мини» и обратно, крестик и «Открыть».
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

  // Курсор: показывает, что можно сделать с окном.
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
  // Начало показа — сразу, как в жизни (владелец 24.11: «анимация должна начаться сразу… всплывать
  // надпись „Похоже, идёт созвон“»): звонок идёт → карточка → «Записать созвон» → значок «● Запись»
  // → «Открыть» → окно с текстом. В программе так и есть: при записи сначала значок (config.py,
  // okno_poverh_samo=False), окно — по «Открыть».
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
  // Сценарий одной сценки (по номеру реплики): MAX — карточка и запись, Telegram — «Мини» и обратно,
  // WhatsApp — крестик и «Открыть»; потом следующая сценка.
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
    fit();
    if (!clockTimer) clockTimer = setInterval(tickClock, 1000);
    if (!reducedMotion.matches && !lineTimer) {
      vc.classList.add('live'); lineTimer = setInterval(tickLine, 2600);
    }
  }
  // Начало (карточка и курсор) — когда пример виден больше чем наполовину, чтобы не пролетело при прокрутке.
  function maybeIntro() { if (card && scene === 0 && introAt === -1) intro(); }
  function stop() {
    clearInterval(clockTimer); clockTimer = null;
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
  // Голосовая заметка (владелец 24.11: «заметки — мы это упустили»): Ctrl + F9, текст по ходу речи.
  const vc = demo.querySelector('.vc'), out = demo.querySelector('.note-text');
  const words = demo.querySelector('.note-full').textContent.trim().split(/\s+/);
  const rec = demo.querySelector('.note-rec'), time = demo.querySelector('.note-time');
  const foot = demo.querySelector('.note-foot'), footText = foot.textContent;
  let i = 0, timer = null, done = false, visible = false, again = 0;
  function show() {
    const s = Math.round(i / 2.3);
    time.textContent = '00:' + String(s).padStart(2, '0');
  }
  function finish() {
    clearInterval(timer); timer = null; done = true;
    out.textContent = words.join(' '); i = words.length; show();
    vc.classList.remove('live'); vc.classList.add('saved');
    rec.textContent = '✓ Заметка сохранена';
    foot.textContent = 'Сохранена в «Записях» вместе со звуком — можно переслушать и поправить.';
    // По кругу, пока пример на экране, — без кнопки «Повторить» (владелец 24.11).
    clearTimeout(again);
    if (visible && !reducedMotion.matches) again = setTimeout(() => { reset(); start(); }, 3500);
  }
  function step() {
    if (i >= words.length) { finish(); return; }
    out.textContent += (i ? ' ' : '') + words[i++]; show();
  }
  function start() {
    if (done || timer) return;
    if (reducedMotion.matches) { finish(); return; }
    vc.classList.add('live'); timer = setInterval(step, 170);
  }
  function pause() { clearInterval(timer); timer = null; vc.classList.remove('live'); }
  function reset() {
    pause(); i = 0; done = false; out.textContent = ''; show();
    vc.classList.remove('saved'); rec.textContent = '● Идёт заметка'; foot.textContent = footText;
  }
  function seen(now) {
    visible = now;
    if (!now) { clearTimeout(again); pause(); return; }
    if (done) { clearTimeout(again); again = setTimeout(() => { reset(); start(); }, 1200); }
    else start();
  }
  demo.addEventListener('vn:show', () => seen(true));
  demo.addEventListener('vn:hide', () => seen(false));
  demo.querySelector('.note-stop').addEventListener('click', finish);
  demo.querySelector('.note-replay')?.addEventListener('click', () => { reset(); start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => seen(entries.some(e => e.isIntersecting)), { threshold: 0.3 }).observe(demo);
  } else finish();
}
document.querySelectorAll('.demo-note').forEach(setupNoteDemo);

// «Созвон · Встреча · Заметка» — вкладки, как карточки на главном экране программы.
for (const block of document.querySelectorAll('.record')) {
  const tabs = Array.from(block.querySelectorAll('[role=tab]'));
  const select = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      // Показ в открытой вкладке начинается сразу, в закрытой — останавливается: наблюдатель
      // видимости замечает смену вкладки не во всех браузерах.
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

  // Слова — отдельными кусками: по ним бежит подсветка при прослушивании, как в программе.
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
    toast.textContent = '▶ Слушаем — подсветка идёт по словам. Пробел ставит на паузу.';
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
    if (event.key === ' ' && !event.target.matches('input, button')) { event.preventDefault(); playing ? pause() : play(); }
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
  // Как в программе: цветом отмечаются выделенные слова, а не вся реплика (владелец 24.11).
  // Выделение запоминаем заранее: нажатие на кнопку цвета в некоторых браузерах его снимает.
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

  // Показ курсором, один раз при первом появлении (владелец 24.11: «в редакторе тоже стоит сделать…
  // мышкой указание, что можно сделать»): выделить слова → «Задача», вписать имена участников,
  // «▶ Слушать» с бегунком. Любое нажатие человека в примере останавливает показ.
  const cursor = demo.querySelector('.demo-cursor');
  let tour = !reducedMotion.matches && !!cursor;
  const stopTour = () => { if (tour) { tour = false; cursor.classList.remove('on'); } };
  demo.addEventListener('pointerdown', stopTour, true);
  demo.addEventListener('keydown', stopTour, true);
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
    if (!tour) return;
    const words = Array.from(rows[1].querySelectorAll('.ed-word'));
    const from = words.findIndex(w => w.textContent === 'сдам');
    const target = from >= 0 ? words.slice(from) : words.slice(-3);
    cursor.style.transition = 'none'; cursor.style.transform = point(rows[0], 60, 12);
    void cursor.offsetWidth; cursor.style.transition = '';
    cursor.classList.add('on');
    toast.textContent = 'Смотрите: выделяем слова и отмечаем цветом.';
    await wait(500); if (!tour) return;
    cursor.style.transform = point(target[0], 1, 6); await wait(1100); if (!tour) return;
    // Выделение «тянется» по словам, как мышью.
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
    tap(); task.click(); await wait(1800); if (!tour) return;
    const [first, second] = demo.querySelectorAll('.ed-side input');
    cursor.style.transform = point(first, 40); await wait(1100); if (!tour) return;
    tap(); await type(first, 'Руководитель'); await wait(1300); if (!tour) return;
    cursor.style.transform = point(second, 40); await wait(1000); if (!tour) return;
    tap(); await type(second, 'Дизайнер'); await wait(1500); if (!tour) return;
    cursor.style.transform = point(listen); await wait(1100); if (!tour) return;
    tap(); play(0); await wait(9000); if (!tour) return;
    if (playing) pause();
    stopTour();
    toast.textContent = 'Теперь сами: «▶ Слушать», впишите имя участника или выделите слова и нажмите цвет.';
  }
  onFirstView(demo, showTour, 0.6);
}
document.querySelectorAll('.ed-mock').forEach(setupEditorDemo);

/* Переключатель темы: компактно (значки с подсказками) и с подписью — видно, что это про программу. */
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
  const label = document.createElement('span');
  label.className = 'theme-label';
  label.textContent = 'Тема программы:';
  group.prepend(label);
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

/* Мягкое появление блоков при прокрутке и схема «без облака». Без скрипта всё видно сразу:
   прячем только когда скрипт работает; первый экран не трогаем. */
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
