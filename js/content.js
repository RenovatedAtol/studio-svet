/**
 * Запасной контент — показывается, пока не загрузились данные из Google-таблицы
 * (или всегда, если API_URL в config.js не задан).
 * Владельцу студии этот файл менять не нужно: всё редактируется в Google-таблице.
 */
window.DEFAULT_CONTENT = {
  texts: {},
  halls: [{ name: 'Студия', description: '' }],
  services: [
    { group: 'Аренда', name: 'Белый зал', price: '2 500 ₽', unit: 'час', note: '60 м², окна в пол, белая циклорама' },
    { group: 'Аренда', name: 'Тёмный зал', price: '2 200 ₽', unit: 'час', note: '45 м², тёмные стены, фоны на выбор' },
    { group: 'Аренда', name: 'Будни до 12:00', price: '−20%', unit: '', note: 'Скидка на любой зал' },
    { group: 'Оборудование', name: 'Импульсный свет (2 источника)', price: '500 ₽', unit: 'час', note: 'Godox, софтбоксы, октобоксы' },
    { group: 'Оборудование', name: 'Постоянный свет LED', price: '400 ₽', unit: 'час', note: 'Для видео и подкастов' },
    { group: 'Оборудование', name: 'Бумажный фон', price: '300 ₽', unit: 'съёмка', note: '12 цветов' },
    { group: 'Оборудование', name: 'Генератор дыма', price: '500 ₽', unit: 'съёмка', note: '' }
  ],
  photos: [
    {
      "src": "img/photos/01.jpg",
      "thumb": "img/photos/01-sm.jpg",
      "alt": "Белый зал"
    },
    {
      "src": "img/photos/02.jpg",
      "thumb": "img/photos/02-sm.jpg",
      "alt": "Белый зал"
    },
    {
      "src": "img/photos/03.jpg",
      "thumb": "img/photos/03-sm.jpg",
      "alt": "Белый зал"
    },
    {
      "src": "img/photos/04.jpg",
      "thumb": "img/photos/04-sm.jpg",
      "alt": "Тёмный зал"
    },
    {
      "src": "img/photos/05.jpg",
      "thumb": "img/photos/05-sm.jpg",
      "alt": "Тёмный зал"
    },
    {
      "src": "img/photos/06.jpg",
      "thumb": "img/photos/06-sm.jpg",
      "alt": "Тёмный зал"
    },
    {
      "src": "img/photos/07.jpg",
      "thumb": "img/photos/07-sm.jpg",
      "alt": "Циклорама"
    },
    {
      "src": "img/photos/08.jpg",
      "thumb": "img/photos/08-sm.jpg",
      "alt": "Циклорама"
    },
    {
      "src": "img/photos/09.jpg",
      "thumb": "img/photos/09-sm.jpg",
      "alt": "Гримёрная"
    },
    {
      "src": "img/photos/10.jpg",
      "thumb": "img/photos/10-sm.jpg",
      "alt": "Зона отдыха"
    },
    {
      "src": "img/photos/11.jpg",
      "thumb": "img/photos/11-sm.jpg",
      "alt": "Кухня"
    },
    {
      "src": "img/photos/12.jpg",
      "thumb": "img/photos/12-sm.jpg",
      "alt": "Интерьер"
    },
    {
      "src": "img/photos/13.jpg",
      "thumb": "img/photos/13-sm.jpg",
      "alt": "Оборудование"
    },
    {
      "src": "img/photos/14.jpg",
      "thumb": "img/photos/14-sm.jpg",
      "alt": "Оборудование"
    },
    {
      "src": "img/photos/15.jpg",
      "thumb": "img/photos/15-sm.jpg",
      "alt": "Реквизит"
    },
    {
      "src": "img/photos/16.jpg",
      "thumb": "img/photos/16-sm.jpg",
      "alt": "Лофт-зона"
    },
    {
      "src": "img/photos/17.jpg",
      "thumb": "img/photos/17-sm.jpg",
      "alt": "Лофт-зона"
    },
    {
      "src": "img/photos/18.jpg",
      "thumb": "img/photos/18-sm.jpg",
      "alt": "Окна"
    }
  ]
};
