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
  var state = { hall: 0, days: [], day: 0, slot: null };
  var slotsEl = $('#slots'), dayTabs = $('#dayTabs'), hallTabs = $('#hallTabs');
  var durWrap = $('#durationWrap'), durSel = $('#duration');
  var form = $('#bookingForm'), submitBtn = $('#submitBtn'), errEl = $('#formError');

  function renderHalls(halls) {
    hallTabs.hidden = halls.length < 2;
    hallTabs.innerHTML = halls.map(function (h, i) {
      return '<button type="button" role="tab" class="tab' + (i === state.hall ? ' tab--active' : '') +
        '" data-hall="' + i + '" aria-selected="' + (i === state.hall) + '">' + esc(h.name) + '</button>';
    }).join('');
  }
  hallTabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hall]');
    if (!b) return;
    state.hall = +b.dataset.hall;
    renderHalls(content.halls);
    loadSlots();
  });

  function loadSlots() {
    state.slot = null;
    form.hidden = false;
    $('#bookingBody').classList.remove('booking__body--closed');
    updateSummary();
    slotsEl.innerHTML = '<p class="muted">Загружаем свободное время…</p>';
    dayTabs.innerHTML = '';
    var p = DEMO ? Promise.resolve(demoSlots()) : apiGet({ action: 'slots', hall: state.hall });
    return p.then(function (res) {
      if (!res.ok) throw new Error(res.error);
      state.days = res.days;
      state.day = 0;
      if (res.closed) return renderClosed(res.reopens);
      renderDays();
    }).catch(function () {
      slotsEl.innerHTML = '<p class="muted">Не удалось загрузить расписание. Позвоните нам: <a href="' +
        $('[data-link="phone"]').href + '">' + esc($('[data-link="phone"]').textContent) + '</a></p>';
    });
  }

  function phoneLinkHtml() {
    var a = $('[data-link="phone"]');
    return '<a href="' + a.href + '">' + esc(a.textContent) + '</a>';
  }

  function renderClosed(reopens) {
    dayTabs.innerHTML = '';
    form.hidden = true;
    $('#bookingBody').classList.add('booking__body--closed');
    slotsEl.innerHTML = '<div class="closed-note"><b>Онлайн-запись откроется ' + esc(reopens) + '.</b>' +
      '<span>Сейчас мы составляем расписание на следующий месяц. Если нужно срочно — позвоните: ' + phoneLinkHtml() + '</span></div>';
  }

  function renderDays() {
    if (!state.days.length) {
      dayTabs.innerHTML = '';
      slotsEl.innerHTML = '<p class="muted">На ближайшие двое суток свободного времени нет. Позвоните нам — постараемся что-нибудь придумать.</p>';
      return;
    }
    dayTabs.innerHTML = state.days.map(function (d, i) {
      var parts = d.label.split(' · ');
      return '<button type="button" role="tab" class="tab' + (i === state.day ? ' tab--active' : '') +
        '" data-day="' + i + '" aria-selected="' + (i === state.day) + '"><b>' + esc(parts[0]) + '</b>' +
        (parts[1] ? '<small>' + esc(parts[1]) + '</small>' : '') + '</button>';
    }).join('');
    renderSlots();
  }
  dayTabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-day]');
    if (!b) return;
    state.day = +b.dataset.day;
    state.slot = null;
    renderDays();
    updateSummary();
  });

  function renderSlots() {
    var day = state.days[state.day];
    slotsEl.innerHTML = day.slots.map(function (s, i) {
      var active = state.slot && state.slot.start === s.start;
      return '<button type="button" class="slot' + (active ? ' slot--active' : '') + '" data-slot="' + i + '" aria-pressed="' + !!active + '">' + s.time + '</button>';
    }).join('');
  }
  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-slot]');
    if (!b) return;
    state.slot = state.days[state.day].slots[+b.dataset.slot];
    renderSlots();
    renderDuration();
    updateSummary();
  });

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
  function addMinutes(hhmm, minutes) {
    var p = hhmm.split(':'), t = (+p[0]) * 60 + (+p[1]) + minutes;
    t = t % (24 * 60);
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }

  function renderDuration() {
    var s = state.slot;
    durWrap.hidden = !s;
    if (!s) return;
    var prev = +durSel.value || 1;
    var opts = '';
    for (var n = 1; n <= s.maxHours; n++) {
      var mins = n * s.stepMinutes;
      opts += '<option value="' + n + '">' + durationLabel(mins) + ' (' + s.time + '–' + addMinutes(s.time, mins) + ')</option>';
    }
    durSel.innerHTML = opts;
    durSel.value = Math.min(prev, s.maxHours);
  }
  durSel.addEventListener('change', updateSummary);

  function updateSummary() {
    var s = state.slot;
    var summary = $('#summary');
    if (!s) {
      durWrap.hidden = true;
      summary.textContent = 'Сначала выберите время';
      summary.classList.remove('form__summary--ready');
      submitBtn.disabled = true;
      return;
    }
    var steps = +durSel.value || 1;
    var label = state.days[state.day].label.replace(' · ', ', ');
    var hall = content.halls.length > 1 ? content.halls[state.hall].name + ' · ' : '';
    summary.textContent = hall + label + ', ' + s.time + '–' + addMinutes(s.time, steps * s.stepMinutes);
    summary.classList.add('form__summary--ready');
    submitBtn.disabled = false;
  }

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

    if (!state.slot) return showError('Выберите дату и время');
    if (name.length < 2) { f.name.focus(); return showError('Укажите имя'); }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) { f.phone.focus(); return showError('Проверьте номер телефона'); }
    if (!f.consent.checked) return showError('Нужно согласие на обработку персональных данных');

    var payload = {
      action: 'book',
      hall: state.hall,
      start: state.slot.start,
      steps: +durSel.value || 1,
      name: name,
      phone: f.phone.value.trim(),
      comment: f.comment.value.trim(),
      equipment: f.equipment.checked,
      consent: true,
      website: f.website.value
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';
    var req = DEMO
      ? new Promise(function (r) { setTimeout(function () { r({ ok: true }); }, 700); })
      : apiPost(payload);

    req.then(function (res) {
      if (!res.ok) {
        showError(res.error || 'Ошибка. Попробуйте ещё раз или позвоните нам.');
        if (res.slotTaken) loadSlots();
        return;
      }
      $('#doneWhen').textContent = res.when || $('#summary').textContent;
      $('#bookingBody').hidden = true;
      $('#bookingDone').hidden = false;
      $('#booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
      form.reset();
    }).catch(function () {
      showError('Нет связи с сервером. Попробуйте ещё раз или позвоните нам.');
    }).then(function () {
      submitBtn.textContent = 'Записаться';
      submitBtn.disabled = !state.slot;
    });
  });

  $('#bookAgain').addEventListener('click', function () {
    $('#bookingDone').hidden = true;
    $('#bookingBody').hidden = false;
    loadSlots();
  });

  // ───────────── демо-режим (без бэкенда) ─────────────
  function demoSlots() {
    if (/[?&]closed\b/.test(location.search)) return { ok: true, days: [], closed: true, reopens: '1 декабря' };
    var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    var now = new Date(), earliest = now.getTime() + 3600e3, horizon = now.getTime() + 48 * 3600e3;
    var days = [];
    for (var d = 0; d < 3; d++) {
      var base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      var free = [];
      for (var h = 9; h < 22; h++) {
        var t = new Date(base); t.setHours(h);
        var busy = (h * 7 + d * 3) % 5 === 0;
        free.push(!busy && t.getTime() >= earliest && t.getTime() <= horizon ? t : null);
      }
      var slots = [];
      free.forEach(function (t, i) {
        if (!t) return;
        var n = 0;
        while (i + n < free.length && free[i + n] && n < 8) n++;
        slots.push({ start: t.toISOString(), time: String(t.getHours()).padStart(2, '0') + ':00', maxHours: n, stepMinutes: 60 });
      });
      if (slots.length) {
        days.push({
          label: ['Сегодня', 'Завтра', 'Послезавтра'][d] + ' · ' + base.getDate() + ' ' + MONTHS[base.getMonth()] + ', ' + WD[base.getDay()],
          slots: slots
        });
      }
    }
    return { ok: true, days: days };
  }

  // ───────────── старт ─────────────
  renderContent();
  loadSlots();

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
