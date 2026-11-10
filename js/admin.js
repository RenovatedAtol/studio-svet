(function () {
  'use strict';

  var API = (window.SITE_CONFIG && window.SITE_CONFIG.API_URL || '').trim();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TOKEN_KEY = 'studio_admin_token';
  var token = localStorage.getItem(TOKEN_KEY) || '';

  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 3000);
  }
  function showErr(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }

  // ───────────── API ─────────────
  function call(op, data) {
    data = data || {};
    data.action = 'admin';
    data.op = op;
    data.token = token;
    return fetch(API, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.auth === false) { logout(res.error); throw new Error(res.error); }
        return res;
      });
  }

  // ───────────── вход / выход ─────────────
  function showLogin(msg) {
    $('#app').hidden = true;
    $('#adminNav').hidden = true;
    $('#loginView').hidden = false;
    showErr($('#loginError'), msg);
    $('#loginForm').elements.password.focus();
  }
  function logout(msg) {
    if (token) call('logout').catch(function () {});
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    showLogin(msg);
  }
  $('#logoutBtn').addEventListener('click', function () { logout(); });

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#loginBtn');
    btn.disabled = true;
    btn.textContent = 'Проверяем…';
    showErr($('#loginError'), '');
    fetch(API, { method: 'POST', body: JSON.stringify({ action: 'admin', op: 'login', password: this.elements.password.value }) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) return showErr($('#loginError'), res.error || 'Ошибка входа');
        token = res.token;
        localStorage.setItem(TOKEN_KEY, token);
        $('#loginForm').reset();
        start(res);
      })
      .catch(function () { showErr($('#loginError'), 'Нет связи с сервером'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Войти'; });
  });

  var meta = { halls: [{ name: 'Студия' }], stepMinutes: 30 };

  function start(m) {
    meta = m;
    $('#loginView').hidden = true;
    $('#app').hidden = false;
    $('#adminNav').hidden = false;
    renderHalls();
    loadList();
    loadMonth(planner.month);
    loadTg();
  }

  // ───────────── список записей ─────────────
  var list = { period: 'upcoming', type: 'all', q: '', events: [] };

  function loadList() {
    $('#listBody').innerHTML = '<tr><td colspan="8" class="muted">Загрузка…</td></tr>';
    return call('list', { period: list.period }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      list.events = res.events;
      renderList();
    }).catch(function (err) {
      $('#listBody').innerHTML = '<tr><td colspan="8" class="muted">Не удалось загрузить: ' + esc(err.message) + '</td></tr>';
    });
  }

  var SOURCE = { site: 'сайт', admin: 'админка', calendar: 'календарь' };

  function renderList() {
    var q = list.q.toLowerCase();
    var rows = list.events.filter(function (e) {
      if (list.type !== 'all' && e.type !== list.type) return false;
      if (!q) return true;
      return [e.name, e.phone, e.comment, e.title].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    var multiHall = meta.halls.length > 1;
    var prevDate = null;
    $('#listBody').innerHTML = rows.length ? rows.map(function (e) {
      var newDay = e.date !== prevDate;
      prevDate = e.date;
      var who = e.type === 'block'
        ? '<span class="badge badge--block">Закрыто</span>'
        : esc(e.name || e.title);
      var phone = e.phone ? '<a href="tel:' + esc(e.phone.replace(/[^\d+]/g, '')) + '">' + esc(e.phone) + '</a>' : '';
      return '<tr class="' + (newDay ? 'row--newday ' : '') + (e.type === 'block' ? 'row--block' : '') + '">' +
        '<td data-label="Дата"><b>' + esc(e.dateLabel) + '</b>' + (multiHall ? '<br><small class="muted">' + esc(e.hallName) + '</small>' : '') + '</td>' +
        '<td data-label="Время">' + esc(e.time) + '</td>' +
        '<td data-label="Клиент">' + who + '</td>' +
        '<td data-label="Телефон">' + phone + '</td>' +
        '<td data-label="Обор.">' + (e.equipment === 'да' ? '✓' : '') + '</td>' +
        '<td data-label="Комментарий" class="cell-comment">' + esc(e.comment) + '</td>' +
        '<td data-label="Откуда"><span class="badge badge--' + esc(e.source) + '">' + (SOURCE[e.source] || esc(e.source)) + '</span></td>' +
        '<td class="cell-actions">' + (e.recurring ? '<small class="muted" title="Повторяющееся — меняется в Google Календаре">повтор.</small>' :
          '<button type="button" class="icon-btn" data-del="' + esc(e.id) + '" data-hall="' + e.hall + '" title="Удалить">✕</button>') + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="8" class="muted">Ничего не найдено</td></tr>';
    $('#listCount').textContent = rows.length ? 'Показано: ' + rows.length : '';
  }

  $('#periodSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-period]');
    if (!b) return;
    $$('#periodSeg .seg__btn').forEach(function (x) { x.classList.toggle('seg__btn--active', x === b); });
    list.period = b.dataset.period;
    loadList();
  });
  $('#typeSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-type]');
    if (!b) return;
    $$('#typeSeg .seg__btn').forEach(function (x) { x.classList.toggle('seg__btn--active', x === b); });
    list.type = b.dataset.type;
    renderList();
  });
  $('#search').addEventListener('input', function () { list.q = this.value.trim(); renderList(); });
  $('#reloadList').addEventListener('click', loadList);

  function findEvent(id) {
    var e = list.events.filter(function (x) { return x.id === id; })[0];
    return e || (planner.data && planner.data.events[id]);
  }

  function deleteEvent(id, hall) {
    var e = findEvent(id);
    var what = e ? (e.type === 'block' ? 'закрытое время' : 'запись «' + (e.name || e.title) + '»') + ' — ' + e.dateLabel + ', ' + e.time : 'событие';
    if (!confirm('Удалить ' + what + '?\n\nСобытие удалится и из Google Календаря. Клиенту никто не сообщит — позвоните ему сами.')) return;
    call('delete', { id: id, hall: hall }).then(function (res) {
      if (!res.ok) return alert(res.error);
      toast('Удалено');
      loadList();
      reloadPlanner();
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]');
    if (b) deleteEvent(b.dataset.del, +b.dataset.hall);
  });

  // ───────────── календарь админа ─────────────
  var planner = { hall: 0, month: null, data: null, day: null, selected: {}, kind: 'booking', cache: {} };

  function ymNow() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function parseDate(str) { var p = str.split('-'); return new Date(+p[0], +p[1] - 1, +(p[2] || 1)); }
  function dateLabel(str) { var d = parseDate(str); return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()] + ', ' + WD[d.getDay()]; }
  function shiftMonth(month, n) { var d = parseDate(month); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function addMinutes(hhmm, minutes) {
    var p = hhmm.split(':'), t = ((+p[0]) * 60 + (+p[1]) + minutes) % 1440;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }
  function durationLabel(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return [h ? h + ' ч' : '', m ? m + ' мин' : ''].filter(Boolean).join(' ');
  }

  function renderHalls() {
    var el = $('#hallTabs');
    el.hidden = meta.halls.length < 2;
    el.innerHTML = meta.halls.map(function (h, i) {
      return '<button type="button" class="tab' + (i === planner.hall ? ' tab--active' : '') + '" data-hall-tab="' + i + '">' + esc(h.name) + '</button>';
    }).join('');
  }
  $('#hallTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-hall-tab]');
    if (!b) return;
    planner.hall = +b.dataset.hallTab;
    planner.selected = {};
    renderHalls();
    reloadPlanner();
  });

  function reloadPlanner() {
    planner.cache = {};
    return loadMonth(planner.month);
  }

  function loadMonth(month) {
    month = month || ymNow();
    var key = planner.hall + '|' + month;
    var p = planner.cache[key] ? Promise.resolve(planner.cache[key]) : call('month', { hall: planner.hall, month: month });
    if (!planner.data) $('#cal').innerHTML = '<p class="muted">Загрузка…</p>';
    return p.then(function (res) {
      if (!res.ok) throw new Error(res.error);
      planner.cache[key] = res;
      planner.data = res;
      planner.month = res.month;
      if (!planner.day || planner.day.slice(0, 7) !== res.month || !dayData(planner.day)) {
        var today = new Date(), t = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        planner.day = dayData(t) ? t : (res.days[0] && res.days[0].date) || null;
      }
      renderCal();
      renderDay();
      updateSelection();
    }).catch(function (err) {
      $('#cal').innerHTML = '<p class="muted">Не удалось загрузить: ' + esc(err.message) + '</p>';
    });
  }

  function dayData(date) {
    var d = planner.data;
    if (!d) return null;
    for (var i = 0; i < d.days.length; i++) if (d.days[i].date === date) return d.days[i];
    return null;
  }

  function dayStats(day) {
    var ids = {}, booked = 0, free = 0, past = 0;
    day.slots.forEach(function (s) {
      if (s.status === 'free') free++;
      if (s.status === 'past') past++;
      if (s.status === 'booking' && !ids[s.eventId]) { ids[s.eventId] = 1; booked++; }
    });
    return { booked: booked, free: free, past: past === day.slots.length };
  }

  function renderCal() {
    var d = planner.data, month = d.month;
    var first = parseDate(month), year = first.getFullYear(), mon = first.getMonth();
    var daysInMonth = new Date(year, mon + 1, 0).getDate();
    var offset = (first.getDay() + 6) % 7;
    var sel = {};
    Object.keys(planner.selected).forEach(function (k) { sel[planner.selected[k].date] = 1; });
    var html = '<div class="cal__head">' +
      '<button type="button" class="cal__nav" data-nav="-1" aria-label="Предыдущий месяц">‹</button>' +
      '<b class="cal__title">' + MONTHS_NOM[mon] + ' ' + year + '</b>' +
      '<button type="button" class="cal__nav" data-nav="1" aria-label="Следующий месяц">›</button></div>' +
      '<div class="cal__grid">' + ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(function (w) { return '<span class="cal__wd">' + w + '</span>'; }).join('');
    for (var i = 0; i < offset; i++) html += '<span></span>';
    for (var day = 1; day <= daysInMonth; day++) {
      var key = month + '-' + String(day).padStart(2, '0');
      var dd = dayData(key);
      var st = dd ? dayStats(dd) : null;
      var cls = 'cal__day' + (dd ? '' : ' cal__day--off') + (key === planner.day ? ' cal__day--active' : '') + (sel[key] ? ' cal__day--sel' : '') +
        (st && st.past ? ' cal__day--past' : st && st.free === 0 ? ' cal__day--full' : '');
      html += '<button type="button" class="' + cls + '" data-date="' + key + '"' + (dd ? '' : ' disabled') + '>' + day +
        (st && st.booked ? '<i class="cal__count">' + st.booked + '</i>' : '') + '</button>';
    }
    $('#cal').innerHTML = html + '</div>';
  }

  $('#cal').addEventListener('click', function (e) {
    var nav = e.target.closest('[data-nav]');
    if (nav) return loadMonth(shiftMonth(planner.month, +nav.dataset.nav));
    var b = e.target.closest('[data-date]');
    if (!b || b.disabled) return;
    planner.day = b.dataset.date;
    renderCal();
    renderDay();
  });

  function renderDay() {
    var day = planner.day && dayData(planner.day);
    $('#daySlots').hidden = !day;
    if (!day) return;
    var step = planner.data.stepMinutes, events = planner.data.events;
    $('#dayTitle').textContent = dateLabel(day.date);
    $('#slots').innerHTML = day.slots.map(function (s) {
      var ev = s.eventId && events[s.eventId];
      var active = !!planner.selected[s.start];
      var cls = 'slot slot--' + s.status + (active ? ' slot--active' : '');
      var title = s.time + '–' + addMinutes(s.time, step) + (ev ? ' · ' + (ev.type === 'block' ? 'закрыто' + (ev.comment ? ': ' + ev.comment : '') : ev.name) : s.status === 'past' ? ' · прошло' : '');
      return '<button type="button" class="' + cls + '" data-start="' + s.start + '" data-time="' + s.time + '"' +
        (s.eventId ? ' data-event="' + esc(s.eventId) + '"' : '') + (s.status === 'past' ? ' disabled' : '') +
        ' title="' + esc(title) + '">' + s.time + '</button>';
    }).join('');

    // события этого дня
    var dayEvents = Object.keys(events).map(function (k) { return events[k]; })
      .filter(function (e) { return e.date === day.date || (e.allDay && e.start.slice(0, 10) <= day.date && e.end.slice(0, 10) > day.date); })
      .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    $('#dayEvents').innerHTML = dayEvents.length ? '<h4>В этот день</h4>' + dayEvents.map(function (e) {
      return '<div class="ev ev--' + e.type + '" id="ev-' + esc(e.id).replace(/[^\w-]/g, '_') + '">' +
        '<div class="ev__time">' + esc(e.time) + '</div>' +
        '<div class="ev__body">' + (e.type === 'block'
          ? '<b>Закрыто</b>' + (e.comment ? ' — ' + esc(e.comment) : '')
          : '<b>' + esc(e.name || e.title) + '</b>' + (e.phone ? ' · <a href="tel:' + esc(e.phone.replace(/[^\d+]/g, '')) + '">' + esc(e.phone) + '</a>' : '') +
            (e.equipment === 'да' ? ' · доп. оборудование' : '') + (e.comment ? '<br><small>' + esc(e.comment) + '</small>' : '')) +
        ' <span class="badge badge--' + esc(e.source) + '">' + (SOURCE[e.source] || esc(e.source)) + '</span></div>' +
        (e.recurring ? '<small class="muted">повтор.</small>' : '<button type="button" class="icon-btn" data-del="' + esc(e.id) + '" data-hall="' + planner.hall + '" title="Удалить">✕</button>') +
        '</div>';
    }).join('') : '';
  }

  $('#slots').addEventListener('click', function (e) {
    var b = e.target.closest('[data-start]');
    if (!b || b.disabled) return;
    if (b.dataset.event) {
      var card = document.getElementById('ev-' + b.dataset.event.replace(/[^\w-]/g, '_'));
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); card.classList.add('ev--flash'); setTimeout(function () { card.classList.remove('ev--flash'); }, 1200); }
      return;
    }
    var k = b.dataset.start;
    if (planner.selected[k]) delete planner.selected[k];
    else planner.selected[k] = { date: planner.day, time: b.dataset.time, ms: new Date(k).getTime() };
    renderDay();
    renderCal();
    updateSelection();
  });

  $('#selectDay').addEventListener('click', function () {
    var day = dayData(planner.day);
    if (!day) return;
    day.slots.forEach(function (s) {
      if (s.status === 'free') planner.selected[s.start] = { date: day.date, time: s.time, ms: new Date(s.start).getTime() };
    });
    renderDay();
    renderCal();
    updateSelection();
  });

  $('#clearSel').addEventListener('click', function () {
    planner.selected = {};
    renderDay();
    renderCal();
    updateSelection();
  });

  function selectionGroups() {
    var step = planner.data ? planner.data.stepMinutes : 30;
    var items = Object.keys(planner.selected).map(function (k) { return planner.selected[k]; }).sort(function (a, b) { return a.ms - b.ms; });
    var groups = [], cur = null, last = null;
    items.forEach(function (it) {
      if (!cur || cur.date !== it.date) { cur = { date: it.date, ranges: [] }; groups.push(cur); last = null; }
      if (last && it.ms === last.endMs) { last.minutes += step; last.endMs += step * 60000; last.to = addMinutes(last.from, last.minutes); }
      else { last = { from: it.time, to: addMinutes(it.time, step), minutes: step, endMs: it.ms + step * 60000 }; cur.ranges.push(last); }
    });
    return groups;
  }

  function updateSelection() {
    var n = Object.keys(planner.selected).length;
    var step = planner.data ? planner.data.stepMinutes : 30;
    $('#clearSel').hidden = !n;
    $('#createBtn').disabled = !n;
    var s = $('#selSummary');
    if (!n) {
      s.textContent = 'Выберите свободное время в календаре';
      s.classList.remove('form__summary--ready');
      return;
    }
    s.innerHTML = (meta.halls.length > 1 ? '<div class="sum__hall">' + esc(meta.halls[planner.hall].name) + '</div>' : '') +
      selectionGroups().map(function (g) {
        return '<div class="sum__row"><b>' + esc(dateLabel(g.date)) + '</b><span>' + g.ranges.map(function (r) { return r.from + '–' + r.to; }).join(', ') + '</span></div>';
      }).join('') + '<div class="sum__total">Всего: ' + durationLabel(n * step) + '</div>';
    s.classList.add('form__summary--ready');
  }

  $('#kindSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-kind]');
    if (!b) return;
    planner.kind = b.dataset.kind;
    $$('#kindSeg .seg__btn').forEach(function (x) { x.classList.toggle('seg__btn--active', x === b); });
    $$('[data-kind-only]').forEach(function (x) { x.hidden = x.dataset.kindOnly !== planner.kind; });
    $('#createBtn').textContent = planner.kind === 'block' ? 'Закрыть время' : 'Записать';
    $('#createBtn').classList.toggle('btn--dark', planner.kind === 'block');
  });

  $('#createForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this.elements, err = $('#createError'), ok = $('#createOk');
    showErr(err, ''); ok.hidden = true;
    var slots = Object.keys(planner.selected);
    if (!slots.length) return showErr(err, 'Выберите время в календаре');
    if (planner.kind === 'booking' && f.name.value.trim().length < 2) { f.name.focus(); return showErr(err, 'Укажите имя клиента'); }
    var btn = $('#createBtn');
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Сохраняем…';
    call('create', {
      hall: planner.hall, kind: planner.kind, slots: slots,
      name: f.name.value.trim(), phone: f.phone.value.trim(), comment: f.comment.value.trim(), equipment: f.equipment.checked,
      reason: f.reason.value.trim()
    }).then(function (res) {
      if (!res.ok) return showErr(err, res.error);
      var text = planner.kind === 'block' ? 'Время закрыто' : 'Клиент записан';
      ok.textContent = '✓ ' + text + (res.created > 1 ? ' (' + res.created + ' отрезка)' : '');
      ok.hidden = false;
      toast(text);
      planner.selected = {};
      $('#createForm').reset();
      loadList();
      return reloadPlanner();
    }).catch(function (e2) { showErr(err, e2.message || 'Нет связи с сервером'); })
      .then(function () { btn.textContent = label; btn.disabled = !Object.keys(planner.selected).length; });
  });

  // ───────────── Telegram ─────────────
  function renderTg(res) {
    var bot = res.bot ? '<a href="https://t.me/' + esc(res.bot) + '" target="_blank" rel="noopener">@' + esc(res.bot) + '</a>' : 'бота';
    $('#tgHint').innerHTML = 'Кому приходят уведомления о новых записях с сайта и напоминания за час до начала. ' +
      'Чтобы добавить человека: впишите его ник ниже, а он пусть откроет ' + bot + ' и нажмёт «Старт» — подключится автоматически в течение 5 минут.' +
      (res.configured ? '' : '<br><b>Бот ещё не подключён: в Google-таблице выберите «📸 Фотостудия → 2. Telegram: ввести токен бота».</b>') +
      (res.warning ? '<br><small>Telegram: ' + esc(res.warning) + '</small>' : '');
    $('#tgList').innerHTML = res.recipients.length ? res.recipients.map(function (r) {
      var who = r.name ? esc(r.name) + (r.username ? ' <span class="muted">@' + esc(r.username) + '</span>' : '') : (r.username ? '@' + esc(r.username) : 'чат ' + esc(r.key));
      return '<li><span class="tg-who">' + who + '</span>' +
        (r.connected ? '<span class="badge badge--ok">✓ подключён</span>' : '<span class="badge badge--wait">ждём «Старт» у бота</span>') +
        '<button type="button" class="icon-btn" data-tg-remove="' + esc(r.key) + '" title="Убрать">✕</button></li>';
    }).join('') : '<li class="muted">Пока никого — уведомления никуда не уходят.</li>';
  }
  function loadTg() {
    return call('tg_list').then(function (res) { if (res.ok) renderTg(res); });
  }
  $('#tgAdd').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = this.elements.username;
    showErr($('#tgError'), '');
    call('tg_add', { username: input.value }).then(function (res) {
      if (!res.ok) return showErr($('#tgError'), res.error);
      input.value = '';
      renderTg(res);
    });
  });
  $('#tgList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tg-remove]');
    if (!b || !confirm('Убрать получателя из списка уведомлений?')) return;
    call('tg_remove', { key: b.dataset.tgRemove }).then(function (res) { if (res.ok) renderTg(res); });
  });
  $('#tgTest').addEventListener('click', function () {
    call('tg_test').then(function (res) {
      if (res.ok) toast('Отправлено получателям: ' + res.sent);
      else alert('Не отправилось: ' + res.error);
    });
  });

  // ───────────── старт ─────────────
  if (!API) {
    showLogin('Админка работает только с подключённым бэкендом (js/config.js → API_URL).');
  } else if (token) {
    call('meta').then(function (res) { if (res.ok) start(res); }).catch(function () {});
  } else {
    showLogin();
  }
})();
