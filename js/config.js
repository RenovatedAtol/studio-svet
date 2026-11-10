/**
 * Настройка сайта.
 *
 * API_URL — адрес веб-приложения Google Apps Script
 * (Развернуть → Управление развёртываниями → URL вида https://script.google.com/macros/s/…/exec).
 *
 * Если оставить пустым, сайт работает в ДЕМО-режиме: тексты и фото берутся из js/content.js,
 * свободное время генерируется случайно, заявки никуда не отправляются.
 */
window.SITE_CONFIG = {
  // Где студия и её часовой пояс — для расчёта восхода и заката в блоке записи («световой день»).
  // utcOffset — смещение от UTC в минутах (Калининград: +120, Москва: +180).
  STUDIO_LOCATION: { lat: 54.7104, lng: 20.4522, utcOffset: 120 },
  API_URL: 'https://script.google.com/macros/s/AKfycbziQqGun-hKOkk-e-TMl-lbWbWEFgfwQxQV9oKlHgujsqZq0H_2LWZJc-b7mVfgmROH/exec'
};
