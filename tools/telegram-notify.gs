/**
 * Заявки с сайта ретрита → уведомление в Telegram.
 *
 * Скрипт вставляется в редактор скриптов Google-формы анкеты
 * (форма → ⋮ → «Редактор скриптов»). На каждую новую заявку бот присылает
 * сообщение со всеми ответами и ссылкой на таблицу ответов.
 *
 * Настройка — в README.md, раздел «Уведомления о заявках в Telegram».
 * Токен бота вставляется в строку BOT_TOKEN ниже — только в редакторе скриптов
 * Google-формы. В этот файл на сайте токен не вписывать: сайт виден всем.
 */

// Токен бота от @BotFather — вставить между кавычками.
var BOT_TOKEN = '';

// Кому слать: Telegram-ник без @. Можно несколько через запятую: 'verak_, ivan'.
var RECIPIENTS = 'verak';

var TITLE = '🌿 Новая заявка · Ретрит в DOMA 2027';

/* ---------- 1. Один раз: включить отправку при каждой новой заявке ---------- */
function setup() {
  var form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSubmit').forForm(form).onFormSubmit().create();
  Logger.log('Готово: уведомления включены для формы «' + form.getTitle() + '».');
  findChats();
}

/* ---------- 2. Найти чаты получателей (после того как они нажали Start у бота) ---------- */
function findChats() {
  var res = tg_('getUpdates', {});
  var wanted = names_();
  var props = PropertiesService.getScriptProperties();
  var saved = JSON.parse(props.getProperty('CHAT_IDS') || '{}');
  (res.result || []).forEach(function (u) {
    var m = u.message || u.my_chat_member || u.edited_message;
    if (!m || !m.chat) return;
    var c = m.chat, from = m.from || {};
    var uname = String(c.username || from.username || '').toLowerCase();
    Logger.log('Чат ' + c.id + ' · ' + (c.title || [c.first_name, c.last_name].join(' ')) + (uname ? ' · @' + uname : ''));
    if (wanted.indexOf(uname) !== -1 && c.type === 'private') saved[uname] = c.id;
  });
  props.setProperty('CHAT_IDS', JSON.stringify(saved));
  wanted.forEach(function (n) {
    Logger.log(saved[n] ? '✓ @' + n + ' найден(а), чат ' + saved[n]
                        : '✗ @' + n + ' не найден(а): пусть откроет бота и нажмёт Start, затем запустите findChats ещё раз.');
  });
  return saved;
}

/* ---------- 3. Проверка: отправить последнюю заявку ещё раз ---------- */
function sendTest() {
  var all = FormApp.getActiveForm().getResponses();
  if (!all.length) { Logger.log('В форме пока нет ответов.'); return; }
  notify_(all[all.length - 1], '🧪 Тест · ');
}

/* ---------- Срабатывает сам на каждую новую заявку ---------- */
function onSubmit(e) {
  notify_(e.response, '');
}

/* ---------- внутреннее ---------- */
function notify_(response, prefix) {
  var form = FormApp.getActiveForm();
  var parts = ['<b>' + esc_(prefix + TITLE) + '</b>',
               esc_(Utilities.formatDate(response.getTimestamp(), 'Europe/Lisbon', 'dd.MM.yyyy HH:mm') + ' (Лиссабон)')];

  response.getItemResponses().forEach(function (ir) {
    var v = flat_(ir.getResponse());
    if (!v) return;
    parts.push('<b>' + esc_(ir.getItem().getTitle()) + '</b>\n' + esc_(v));
  });

  try {
    if (form.getDestinationType() === FormApp.DestinationType.SPREADSHEET) {
      var url = SpreadsheetApp.openById(form.getDestinationId()).getUrl();
      parts.push('<a href="' + url + '">Открыть таблицу заявок</a>');
    }
  } catch (err) { /* таблица не привязана — просто без ссылки */ }

  var chats = chatIds_();
  if (!chats.length) throw new Error('Нет получателей: запустите findChats после того, как получатель нажал Start у бота.');
  chunks_(parts, 3800).forEach(function (text) {
    chats.forEach(function (id) {
      tg_('sendMessage', { chat_id: id, text: text, parse_mode: 'HTML', disable_web_page_preview: true });
    });
  });
}

function chatIds_() {
  var saved = JSON.parse(PropertiesService.getScriptProperties().getProperty('CHAT_IDS') || '{}');
  var missing = names_().some(function (n) { return !saved[n]; });
  if (missing) saved = findChats();
  return names_().map(function (n) { return saved[n]; }).filter(Boolean);
}

function names_() {
  return RECIPIENTS.split(',').map(function (s) { return s.trim().replace(/^@/, '').toLowerCase(); }).filter(Boolean);
}

function tg_(method, payload) {
  var token = BOT_TOKEN || PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  if (!token) throw new Error('Добавьте токен бота: вставьте его между кавычками в строке BOT_TOKEN в начале скрипта.');
  var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var body = JSON.parse(r.getContentText());
  if (!body.ok) throw new Error('Telegram: ' + body.description);
  return body;
}

function flat_(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(flat_).filter(String).join(', ');
  return String(v).trim();
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function chunks_(parts, max) {
  var out = [], cur = '';
  parts.forEach(function (p) {
    if (p.length > max) p = p.slice(0, max - 1) + '…';
    if (cur && (cur + '\n\n' + p).length > max) { out.push(cur); cur = p; }
    else cur = cur ? cur + '\n\n' + p : p;
  });
  if (cur) out.push(cur);
  return out;
}
