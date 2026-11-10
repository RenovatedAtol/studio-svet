(function () {
  'use strict';

  var API = (window.SITE_CONFIG && window.SITE_CONFIG.API_URL || '').trim();
  var DEMO = !API;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  document.getElementById('year').textContent = new Date().getFullYear();

  // ───────────── меню на телефоне ─────────────
  var burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('nav--open'); burger.setAttribute('aria-expanded', 'false'); }
  });
  window.addEventListener('scroll', function () {
    document.body.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // ───────────── API ─────────────
  function apiGet(params) {
    var qs = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(API + '?' + qs).then(function (r) { return r.json(); });
  }
  function apiPost(body) {
    // text/plain — «простой» запрос без CORS-preflight, так требует Apps Script
    return fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }

  // ───────────── контент ─────────────
  var content = window.DEFAULT_CONTENT;

  function photoUrl(p, width) {
    if (p.src) return width <= 800 && p.thumb ? p.thumb : p.src;
    return 'https://lh3.googleusercontent.com/d/' + p.id + '=w' + width;
  }

  function linkFor(key, v) {
    if (!v) return '';
    var digits = v.replace(/\D/g, '');
    switch (key) {
      case 'phone': return 'tel:+' + (digits.charAt(0) === '8' && digits.length === 11 ? '7' + digits.slice(1) : digits);
      case 'email': return 'mailto:' + v;
      case 'whatsapp': return /^https?:/.test(v) ? v : 'https://wa.me/' + digits;
      case 'telegram': return /^https?:/.test(v) ? v : 'https://t.me/' + v.replace(/^@/, '');
      default: return v;
    }
  }

  function applyTexts(t) {
    $$('[data-text]').forEach(function (el) {
      var v = t[el.dataset.text];
      if (v) el.textContent = v;
    });
    $$('[data-attr-content]').forEach(function (el) {
      var v = t[el.dataset.attrContent];
      if (v) el.setAttribute('content', v);
    });
    $$('[data-link]').forEach(function (el) {
      var key = el.dataset.link;
      if (!(key in t)) return; // не загружено — оставляем как в HTML
      var href = linkFor(key, t[key]);
      el.hidden = !href;
      if (href) {
        el.href = href;
        if (key === 'phone' || key === 'email') el.textContent = t[key];
      }
    });
    $$('[data-show]').forEach(function (el) {
      var key = el.dataset.show;
      if (key in t) el.hidden = !t[key];
    });
    renderMap(t);
  }

  function renderMap(t) {
    var q = t.map_query || '', src;
    var m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) {
      var ll = m[2] + ',' + m[1]; // Яндекс ждёт «долгота,широта»
      src = 'https://yandex.ru/map-widget/v1/?ll=' + ll + '&pt=' + ll + ',pm2rdm&z=16';
    } else {
      var addr = t.address || $('[data-text="address"]').textContent;
      src = 'https://yandex.ru/map-widget/v1/?text=' + encodeURIComponent(addr) + '&z=16';
    }
    var map = $('#map');
    var frame = map.querySelector('iframe');
    if (frame && frame.src === src) return;
    map.innerHTML = '<iframe src="' + src + '" loading="lazy" title="Карта: как добраться" allowfullscreen></iframe>';
  }

  // ───────────── галерея ─────────────
  function renderGallery(photos) {
    var grid = $('#galleryGrid');
    grid.innerHTML = '';
    photos.forEach(function (p, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery__item';
      btn.setAttribute('aria-label', 'Открыть фото: ' + (p.alt || i + 1));
      var img = document.createElement('img');
      img.src = photoUrl(p, 800);
      img.alt = p.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      btn.appendChild(img);
      btn.addEventListener('click', function () { openLightbox(i); });
      grid.appendChild(btn);
    });
    if (photos[0]) $('#heroBg').style.backgroundImage = 'url("' + photoUrl(photos[0], 2000) + '")';
  }

  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbIndex = 0, lastFocus = null;
  function showLb(i) {
    var photos = content.photos, n = photos.length;
    lbIndex = (i + n) % n;
    lbImg.src = photoUrl(photos[lbIndex], 2000);
    lbImg.alt = photos[lbIndex].alt || '';
    $('#lbCounter').textContent = (lbIndex + 1) + ' / ' + n;
    // подгружаем соседнее фото заранее
    new Image().src = photoUrl(photos[(lbIndex + 1) % n], 2000);
  }
  function openLightbox(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add('no-scroll');
    showLb(i);
    $('#lbClose').focus();
  }
  function closeLightbox() {
    lb.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', function () { showLb(lbIndex - 1); });
  $('#lbNext').addEventListener('click', function () { showLb(lbIndex + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  });
  var touchX = null;
  lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // ───────────── цены ─────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderPrices(services) {
    var groups = [];
    var map = {};
    services.forEach(function (s) {
      if (!map[s.group]) { map[s.group] = []; groups.push(s.group); }
      map[s.group].push(s);
    });
    $('#pricesWrap').innerHTML = groups.map(function (g) {
      return '<div class="prices__group"><h3>' + esc(g) + '</h3><ul class="price-list">' +
        map[g].map(function (s) {
          return '<li><div class="price-list__name">' + esc(s.name) +
            (s.note ? '<small>' + esc(s.note) + '</small>' : '') + '</div>' +
            '<div class="price-list__price">' + esc(s.price) + (s.unit ? '<small> / ' + esc(s.unit) + '</small>' : '') + '</div></li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  function renderContent() {
    applyTexts(content.texts || {});
    renderGallery(content.photos || []);
    renderPrices(content.services || []);
    renderHalls(content.halls || []);
  }

  // ───────────── запись ─────────────
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  var state = {
    hall: 0,
    month: null,      // 'yyyy-MM' — показанный месяц
    data: null,       // ответ сервера по этому месяцу
    meta: null,       // правила записи из последнего ответа
    cache: {},        // 'hall|month' → ответ
    day: null,        // 'yyyy-MM-dd' — открытый день
    selected: {}      // start ISO → {date, time, ms}
  };
  var calEl = $('#cal'), slotsEl = $('#slots'), daySlots = $('#daySlots'), hallTabs = $('#hallTabs');
  var form = $('#bookingForm'), submitBtn = $('#submitBtn'), errEl = $('#formError');

  function phoneLinkHtml() {
    var a = $('[data-link="phone"]');
    return '<a href="' + a.href + '">' + esc(a.textContent) + '</a>';
  }
  function parseDate(str) { var p = str.split('-'); return new Date(+p[0], +p[1] - 1, +(p[2] || 1)); }
  function dateLabel(str) { var d = parseDate(str); return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()] + ', ' + WD_SHORT[d.getDay()]; }
  function shiftMonth(month, n) { var d = parseDate(month); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function addMinutes(hhmm, minutes) {
    var p = hhmm.split(':'), t = ((+p[0]) * 60 + (+p[1]) + minutes) % 1440;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function durationLabel(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60, out = [];
    if (h) out.push(h + ' ' + plural(h, 'час', 'часа', 'часов'));
    if (m) out.push(m + ' мин');
    return out.join(' ');
  }

  function renderHalls(halls) {
    hallTabs.hidden = halls.length < 2;
    hallTabs.innerHTML = halls.map(function (h, i) {
      return '<button type="button" role="tab" class="tab' + (i === state.hall ? ' tab--active' : '') +
        '" data-hall="' + i + '" aria-selected="' + (i === state.hall) + '">' + esc(h.name) + '</button>';
    }).join('');
  }
  hallTabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hall]');
    if (!b || +b.dataset.hall === state.hall) return;
    state.hall = +b.dataset.hall;
    state.selected = {};
    state.day = null;
    renderHalls(content.halls);
    loadMonth(state.month);
  });

  var inflight = {};
  function fetchMonth(month) {
    var key = state.hall + '|' + (month || '');
    if (state.cache[key]) return Promise.resolve(state.cache[key]);
    if (inflight[key]) return inflight[key];           // уже грузится (например, предзагрузкой)
    var params = { action: 'slots', hall: state.hall };
    if (month) params.month = month;
    var p = DEMO ? Promise.resolve(demoMonth(month)) : apiGet(params);
    inflight[key] = p.then(function (res) {
      delete inflight[key];
      if (res.ok && !res.closed) state.cache[state.hall + '|' + res.month] = res;
      return res;
    }, function (err) { delete inflight[key]; throw err; });
    return inflight[key];
  }

  /** Тихо подгрузить соседние месяцы, чтобы переключение было мгновенным. */
  function prefetchAround(res) {
    [1, 2].forEach(function (n) {
      var m = shiftMonth(res.month, n);
      if (m <= res.maxMonth) fetchMonth(m).catch(function () {});
    });
    if (res.month > res.minMonth) fetchMonth(shiftMonth(res.month, -1)).catch(function () {});
  }

  function loadMonth(month) {
    form.hidden = false;
    $('#bookingBody').classList.remove('booking__body--closed');
    if (state.data && calEl.querySelector('.cal__grid')) calEl.classList.add('cal--loading');   // календарь остаётся на месте
    else calEl.innerHTML = '<p class="muted">Загружаем расписание…</p>';
    var title = calEl.querySelector('.cal__title');
    if (title && month) { var md = parseDate(month); title.textContent = MONTHS_NOM[md.getMonth()] + ' ' + md.getFullYear(); }
    return fetchMonth(month).then(function (res) {
      calEl.classList.remove('cal--loading');
      if (!res.ok) throw new Error(res.error);
      if (res.closed) return renderClosed(res.reopens);
      state.data = res;
      state.month = res.month;
      state.meta = res;
      renderHint();
      if (!state.day || state.day.slice(0, 7) !== res.month || !dayData(state.day)) {
        state.day = res.days.length ? res.days[0].date : null;
      }
      renderCalendar();
      renderDay();
      updateSummary();
      prefetchAround(res);
    }).catch(function () {
      calEl.classList.remove('cal--loading');
      calEl.innerHTML = '<p class="muted">Не удалось загрузить расписание. Позвоните нам: ' + phoneLinkHtml() + '</p>';
      daySlots.hidden = true;
    });
  }

  function renderClosed(reopens) {
    form.hidden = true;
    daySlots.hidden = true;
    $('#bookingBody').classList.add('booking__body--closed');
    calEl.innerHTML = '<div class="closed-note"><b>Онлайн-запись откроется ' + esc(reopens) + '.</b>' +
      '<span>Сейчас мы составляем расписание на следующий месяц. Если нужно срочно — позвоните: ' + phoneLinkHtml() + '</span></div>';
  }

  function renderHint() {
    var m = state.meta, n = m.minDaysAhead;
    var lead = n === 0 ? '' : n === 1 ? 'Запись — не позже чем за день. ' : 'Запись — не позже чем за ' + n + ' ' + plural(n, 'день', 'дня', 'дней') + '. ';
    $('#bookingHint').textContent = lead + 'Выберите дату и один или несколько промежутков по ' + m.stepMinutes +
      ' минут — можно с перерывами и в разные дни. Оплата на месте — мы свяжемся с вами для подтверждения.';
  }

  function dayData(date) {
    if (!state.data) return null;
    for (var i = 0; i < state.data.days.length; i++) if (state.data.days[i].date === date) return state.data.days[i];
    return null;
  }

  function selectedDates() {
    var out = {};
    Object.keys(state.selected).forEach(function (k) { out[state.selected[k].date] = (out[state.selected[k].date] || 0) + 1; });
    return out;
  }

  function renderCalendar() {
    var d = state.data, month = d.month;
    var first = parseDate(month), year = first.getFullYear(), mon = first.getMonth();
    var daysInMonth = new Date(year, mon + 1, 0).getDate();
    var offset = (first.getDay() + 6) % 7; // понедельник — первый день недели
    var avail = {};
    d.days.forEach(function (x) { avail[x.date] = true; });
    var sel = selectedDates();

    var html = '<div class="cal__head">' +
      '<button type="button" class="cal__nav" data-nav="-1" aria-label="Предыдущий месяц"' + (month <= d.minMonth ? ' disabled' : '') + '>‹</button>' +
      '<b class="cal__title">' + MONTHS_NOM[mon] + ' ' + year + '</b>' +
      '<button type="button" class="cal__nav" data-nav="1" aria-label="Следующий месяц"' + (month >= d.maxMonth ? ' disabled' : '') + '>›</button>' +
      '</div><div class="cal__grid">' +
      ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(function (w) { return '<span class="cal__wd">' + w + '</span>'; }).join('');
    for (var i = 0; i < offset; i++) html += '<span></span>';
    for (var day = 1; day <= daysInMonth; day++) {
      var key = month + '-' + String(day).padStart(2, '0');
      var cls = 'cal__day' + (avail[key] ? '' : ' cal__day--off') + (key === state.day ? ' cal__day--active' : '') + (sel[key] ? ' cal__day--sel' : '');
      html += '<button type="button" class="' + cls + '" data-date="' + key + '"' + (avail[key] ? '' : ' disabled') +
        ' aria-label="' + esc(dateLabel(key)) + (sel[key] ? ', выбрано промежутков: ' + sel[key] : '') + '">' + day + '</button>';
    }
    html += '</div>';
    if (!d.days.length) html += '<p class="muted cal__empty">В этом месяце свободного времени нет' + (month < d.maxMonth ? ' — посмотрите следующий.' : '.') + '</p>';
    calEl.innerHTML = html;
  }

  calEl.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-nav]');
    if (nav && !nav.disabled) return loadMonth(shiftMonth(state.month, +nav.dataset.nav));
    var b = e.target.closest('[data-date]');
    if (!b || b.disabled) return;
    state.day = b.dataset.date;
    renderCalendar();
    renderDay();
    if (window.innerWidth < 900) daySlots.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  function renderDay() {
    var day = state.day && dayData(state.day);
    daySlots.hidden = !day;
    if (!day) return;
    var step = state.meta.stepMinutes;
    $('#dayTitle').textContent = dateLabel(day.date);
    slotsEl.innerHTML = day.slots.map(function (s) {
      var active = !!state.selected[s.start];
      var cls = 'slot' + (s.free ? '' : ' slot--busy') + (active ? ' slot--active' : '');
      return '<button type="button" class="' + cls + '" data-start="' + s.start + '" data-time="' + s.time + '"' +
        (s.free ? '' : ' disabled') + ' aria-pressed="' + active + '" title="' + s.time + '–' + addMinutes(s.time, step) +
        (s.free ? '' : ' · занято') + '">' + s.time + '</button>';
    }).join('');
  }

  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-start]');
    if (!b || b.disabled) return;
    var k = b.dataset.start;
    if (state.selected[k]) delete state.selected[k];
    else state.selected[k] = { date: state.day, time: b.dataset.time, ms: new Date(k).getTime() };
    renderDay();
    renderCalendar();
    updateSummary();
  });

  /** Выбранное → [{date, ranges:[{from, to, minutes}]}], соседние промежутки склеены. */
  function selectionGroups() {
    var step = state.meta ? state.meta.stepMinutes : 30;
    var items = Object.keys(state.selected).map(function (k) { return state.selected[k]; }).sort(function (a, b) { return a.ms - b.ms; });
    var groups = [], last = null, cur = null;
    items.forEach(function (it) {
      if (!cur || cur.date !== it.date) { cur = { date: it.date, ranges: [] }; groups.push(cur); last = null; }
      if (last && it.ms - last.endMs === 0) {
        last.minutes += step; last.endMs += step * 60000; last.to = addMinutes(last.from, last.minutes);
      } else {
        last = { from: it.time, to: addMinutes(it.time, step), minutes: step, endMs: it.ms + step * 60000 };
        cur.ranges.push(last);
      }
    });
    return groups;
  }

  function updateSummary() {
    var summary = $('#summary'), clearBtn = $('#clearSel');
    var groups = selectionGroups();
    var total = Object.keys(state.selected).length * (state.meta ? state.meta.stepMinutes : 30);
    clearBtn.hidden = !total;
    if (!total) {
      summary.innerHTML = 'Выберите в календаре дату и время';
      summary.classList.remove('form__summary--ready');
      submitBtn.disabled = true;
      return;
    }
    var hall = content.halls.length > 1 ? '<div class="sum__hall">' + esc(content.halls[state.hall].name) + '</div>' : '';
    summary.innerHTML = hall + groups.map(function (g) {
      return '<div class="sum__row"><b>' + esc(dateLabel(g.date)) + '</b><span>' +
        g.ranges.map(function (r) { return r.from + '–' + r.to; }).join(', ') + '</span></div>';
    }).join('') + '<div class="sum__total">Всего: ' + durationLabel(total) + '</div>';
    summary.classList.add('form__summary--ready');
    submitBtn.disabled = false;
  }

  $('#clearSel').addEventListener('click', function () {
    state.selected = {};
    showError('');
    renderDay();
    renderCalendar();
    updateSummary();
  });

  // маска телефона для российских номеров
  var phoneInput = form.elements.phone;
  phoneInput.addEventListener('input', function () {
    var d = phoneInput.value.replace(/\D/g, '');
    if (!d) { phoneInput.value = ''; return; }
    if (phoneInput.value.trim().charAt(0) === '+' && d.charAt(0) !== '7') return; // иностранный номер — не трогаем
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d.charAt(0) !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    phoneInput.value = out;
  });

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = !msg;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showError('');
    var f = form.elements;
    var name = f.name.value.trim();
    var phoneDigits = f.phone.value.replace(/\D/g, '');
    var starts = Object.keys(state.selected);
    var m = state.meta;

    if (!starts.length) return showError('Выберите дату и время');
    if (m && starts.length * m.stepMinutes > m.maxMinutes) return showError('В одной заявке можно выбрать не больше ' + durationLabel(m.maxMinutes) + '. Для большего — позвоните нам.');
    var short = selectionGroups().some(function (g) { return g.ranges.some(function (r) { return m && r.minutes < m.minMinutes; }); });
    if (short) return showError('Минимальная длительность одного отрезка — ' + durationLabel(m.minMinutes) + '.');
    if (name.length < 2) { f.name.focus(); return showError('Укажите имя'); }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) { f.phone.focus(); return showError('Проверьте номер телефона'); }
    if (!f.consent.checked) return showError('Нужно согласие на обработку персональных данных');

    var payload = {
      action: 'book',
      hall: state.hall,
      slots: starts,
      name: name,
      phone: f.phone.value.trim(),
      comment: f.comment.value.trim(),
      equipment: f.equipment.checked,
      consent: true,
      website: f.website.value
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';
    var summaryLines = selectionGroups().map(function (g) {
      return dateLabel(g.date) + ', ' + g.ranges.map(function (r) { return r.from + '–' + r.to; }).join(', ');
    });
    var req = DEMO
      ? new Promise(function (r) { setTimeout(function () { r({ ok: true, when: summaryLines }); }, 700); })
      : apiPost(payload);

    req.then(function (res) {
      if (!res.ok) {
        showError(res.error || 'Ошибка. Попробуйте ещё раз или позвоните нам.');
        if (res.slotTaken) {
          state.cache = {};
          var keep = state.selected;
          loadMonth(state.month).then(function () {
            // убрать из выбора то, что стало занятым
            Object.keys(keep).forEach(function (k) {
              var dd = dayData(keep[k].date);
              if (!dd) return;
              var s = dd.slots.filter(function (x) { return x.start === k; })[0];
              if (!s || !s.free) delete state.selected[k];
            });
            renderDay(); renderCalendar(); updateSummary();
          });
        }
        return;
      }
      var when = Array.isArray(res.when) ? res.when : [res.when || ''];
      $('#doneWhen').innerHTML = when.map(esc).join('<br>');
      setupTelegramSubscribe(res.tgLink, res.tgCode);
      $('#bookingBody').hidden = true;
      $('#bookingDone').hidden = false;
      $('#booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
      form.reset();
      state.selected = {};
      state.cache = {};
    }).catch(function () {
      showError('Нет связи с сервером. Попробуйте ещё раз или позвоните нам.');
    }).then(function () {
      submitBtn.textContent = 'Записаться';
      submitBtn.disabled = !Object.keys(state.selected).length;
    });
  });

  // ───────────── подписка клиента на напоминания в Telegram ─────────────
  var tgPoll = { timer: null, until: 0, code: null };

  function setupTelegramSubscribe(link, code) {
    stopTgPolling();
    $('#tgSubOk').hidden = true;
    $('#tgSub').hidden = !link;
    if (!link) return;
    $('#tgSubBtn').href = link;
    tgPoll.code = code;
  }
  function stopTgPolling() { clearTimeout(tgPoll.timer); tgPoll.timer = null; }
  function checkTg() {
    if (!tgPoll.code || Date.now() > tgPoll.until) return stopTgPolling();
    apiGet({ action: 'tgcheck', code: tgPoll.code }).then(function (res) {
      if (res && res.linked) {
        stopTgPolling();
        $('#tgSub').hidden = true;
        $('#tgSubOk').hidden = false;
        return;
      }
      tgPoll.timer = setTimeout(checkTg, 3000);
    }).catch(function () { tgPoll.timer = setTimeout(checkTg, 5000); });
  }
  $('#tgSubBtn').addEventListener('click', function () {
    tgPoll.until = Date.now() + 5 * 60000;   // ждём подключения до 5 минут
    stopTgPolling();
    tgPoll.timer = setTimeout(checkTg, 2500);
  });
  document.addEventListener('visibilitychange', function () {
    // вернулись из Telegram — проверить сразу
    if (!document.hidden && tgPoll.timer) { stopTgPolling(); checkTg(); }
  });

  $('#bookAgain').addEventListener('click', function () {
    stopTgPolling();
    $('#bookingDone').hidden = true;
    $('#bookingBody').hidden = false;
    updateSummary();
    loadMonth(state.month);
  });

  // ───────────── демо-режим (без бэкенда) ─────────────
  function demoMonth(month) {
    if (/[?&]closed\b/.test(location.search)) return { ok: true, days: [], closed: true, reopens: '1 декабря' };
    var now = new Date();
    var first = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    var ym = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
    var minMonth = ym(first), maxMonth = ym(new Date(now.getFullYear(), now.getMonth() + 24, 1));
    if (!month || month < minMonth) month = minMonth;
    if (month > maxMonth) month = maxMonth;
    var start = parseDate(month), days = [];
    for (var d = new Date(start); d.getMonth() === start.getMonth(); d.setDate(d.getDate() + 1)) {
      if (d < first) continue;
      var date = ym(d) + '-' + String(d.getDate()).padStart(2, '0'), slots = [];
      for (var m = 9 * 60; m < 22 * 60; m += 30) {
        var t = new Date(d); t.setHours(Math.floor(m / 60), m % 60, 0, 0);
        var seed = (d.getDate() * 31 + m / 30 * 7) % 11;
        slots.push({ start: t.toISOString(), time: addMinutes('00:00', m), free: seed > 2 });
      }
      days.push({ date: date, slots: slots });
    }
    return {
      ok: true, month: month, minMonth: minMonth, maxMonth: maxMonth, firstDate: ym(first) + '-' + String(first.getDate()).padStart(2, '0'),
      minDaysAhead: 2, stepMinutes: 30, minMinutes: 30, maxMinutes: 720, days: days
    };
  }

  // ───────────── старт ─────────────
  renderContent();
  loadMonth();

  if (!DEMO) {
    apiGet({ action: 'content' }).then(function (res) {
      if (!res.ok) return;
      content = {
        texts: res.texts || {},
        halls: res.halls && res.halls.length ? res.halls : content.halls,
        services: res.services && res.services.length ? res.services : content.services,
        photos: res.photos && res.photos.length ? res.photos : content.photos
      };
      if (content.texts.seo_title) document.title = content.texts.seo_title;
      renderContent();
    }).catch(function () { /* остаёмся на запасном контенте */ });
  } else {
    console.info('Сайт работает в демо-режиме: укажите API_URL в js/config.js');
  }
})();
