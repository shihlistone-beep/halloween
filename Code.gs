/**
 * 什浬鍋萬聖節親子遊街活動｜報名系統 API（Google Apps Script 後端）
 *
 * 此版本為純 API，前端部署在 GitHub Pages。
 * 首次使用請先執行 setup()，並在「專案設定 → 指令碼屬性」設定 ADMIN_PASSWORD。
 */

// ===================== 設定區 =====================
const CONFIG = {
  SHEET_NAME: '報名資料',
  TIMEZONE: 'Asia/Taipei',
  DEADLINE: '2026-10-30T17:00:00+08:00',
  MAX_PEOPLE: 0,
  BLOCK_DUPLICATE_PHONE: true,
  SITE_URL: 'https://shihlistone-beep.github.io/halloween',
};

const FIELDS = [
  ['id', '報名編號'],
  ['createdAt', '報名時間'],
  ['name', '主要聯絡人'],
  ['phone', '聯絡電話'],
  ['email', '電子信箱'],
  ['memberType', '參加成員'],
  ['totalPeople', '總人數'],
  ['petCount', '寵物數量'],
  ['source', '得知管道'],
  ['note', '備註需求'],
  ['adults', '大人人數'],
  ['children', '兒童人數'],
  ['childAges', '兒童年齡'],
  ['hasInfant', '嬰幼兒同行'],
  ['needStroller', '嬰兒推車'],
  ['kidCostume', '小朋友變裝'],
  ['childSafety', '兒童安全確認'],
  ['petTypes', '寵物種類'],
  ['petNum', '毛孩隻數'],
  ['petNames', '毛孩名字'],
  ['petSize', '毛孩體型'],
  ['petTemper', '毛孩外出狀況'],
  ['petMode', '參加方式'],
  ['petCostume', '毛孩變裝'],
  ['petNote', '毛孩注意事項'],
  ['petAgree', '毛孩參加提醒'],
  ['timeAgree', '時間確認'],
  ['safetyAgree', '安全確認'],
  ['privacyAgree', '個資告知'],
  ['photoConsent', '影像使用'],
  ['checkedIn', '已報到'],
  ['checkinTime', '報到時間'],
];

const OPT = {
  memberType: ['親子家庭（有小朋友）', '寵物家庭（有攜帶毛孩）', '親子與寵物一起參加', '一般民眾（沒有攜帶小朋友或寵物）'],
  source: ['什浬鍋 Facebook', '什浬鍋 Instagram', 'LINE 分享', '親友分享', '在地合作商家', '其他'],
  childAges: ['未滿3歲', '3－5歲', '6－8歲', '9－12歲', '13歲以上'],
  hasInfant: ['沒有', '有'],
  needStroller: ['不會', '會'],
  kidCostume: ['會，已經準備好了！', '還在準備中', '不會，輕鬆參加就好'],
  petTypes: ['狗狗', '貓咪', '其他寵物'],
  petNum: ['1隻', '2隻', '3隻', '4隻以上'],
  petSize: ['小型', '中型', '大型'],
  petTemper: ['喜歡與人互動', '喜歡和其他毛孩玩耍', '比較慢熟，需要一點時間適應', '遇到陌生環境會比較緊張', '比較喜歡保持自己的空間', '其他情況，歡迎補充'],
  petMode: ['使用牽繩陪走', '使用寵物推車', '依毛孩狀況搭配牽繩或推車', '其他合適的安全方式'],
  petCostume: ['會，準備好變裝了！', '還在準備中', '不穿裝扮，舒適參加就好'],
  photoConsent: ['同意主辦單位將活動照片或影像用於本次活動紀錄及後續宣傳。', '不同意將可辨識我本人或同行兒童的影像用於公開宣傳。'],
};
const KIDS_TYPES = [OPT.memberType[0], OPT.memberType[2]];
const PETS_TYPES = [OPT.memberType[1], OPT.memberType[2]];

// ===================== API 路由 =====================

/** GET 請求：簡單回傳 API 狀態 */
function doGet(e) {
  return json_({ ok: true, message: '什浬鍋萬聖節報名 API 運作中' });
}

/** POST 請求：所有前端呼叫都走這裡 */
function doPost(e) {
  try {
    const input = JSON.parse(e.postData.contents);
    let result;
    switch (input.action) {
      case 'getFormStatus':
        result = getFormStatus();
        break;
      case 'submitRegistration':
        result = submitRegistration(input.data);
        break;
      case 'adminGetData':
        result = adminGetData(input.pw);
        break;
      case 'adminSetCheckin':
        result = adminSetCheckin(input.pw, input.id, input.checked);
        break;
      case 'checkinById':
        result = checkinById(input.pw, input.id);
        break;
      case 'lookupRegistration':
        result = lookupRegistration(input.pw, input.id);
        break;
      case 'getImages':
        result = getImages();
        break;
      case 'getMusic':
        result = getMusic();
        break;
      case 'adminSetMusic':
        result = adminSetMusic(input.pw, input.url);
        break;
      case 'adminUploadImage':
        result = adminUploadImage(input.pw, input.category, input.fileName, input.base64);
        break;
      case 'adminDeleteImage':
        result = adminDeleteImage(input.pw, input.fileId);
        break;
      case 'adminDeleteRegistration':
        result = adminDeleteRegistration(input.pw, input.id);
        break;
      case 'adminBatchDelete':
        result = adminBatchDelete(input.pw, input.ids);
        break;
      case 'adminDeleteAll':
        result = adminDeleteAll(input.pw);
        break;
      case 'getEventInfo':
        result = getEventInfo();
        break;
      case 'adminSetEventInfo':
        result = adminSetEventInfo(input.pw, input.data);
        break;
      case 'adminChangePassword':
        result = adminChangePassword(input.pw, input.newPw);
        break;
      case 'adminUpdateRegistration':
        result = adminUpdateRegistration(input.pw, input.id, input.data);
        break;
      default:
        result = { error: '未知的 action：' + (input.action || '') };
    }
    return json_(result);
  } catch (err) {
    return json_({ error: err.message || '伺服器錯誤' });
  }
}

/** 回傳 JSON 回應 */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================== 初始化 =====================
function setup() {
  ensureSheet_();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PASSWORD')) {
    Logger.log('⚠️ 尚未設定 ADMIN_PASSWORD，請到「專案設定 → 指令碼屬性」新增。');
  }
  Logger.log('✅ 試算表已就緒：' + CONFIG.SHEET_NAME);
}

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    const n = FIELDS.length;
    sh.getRange(1, 1, sh.getMaxRows(), n).setNumberFormat('@');
    sh.getRange(1, 1, 1, n).setValues([FIELDS.map(f => f[1])])
      .setFontWeight('bold').setBackground('#2b1a3d').setFontColor('#ffb347');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(3);
  }
  return sh;
}

// ===================== 前台 API =====================
function getFormStatus() {
  if (CONFIG.DEADLINE && new Date() > new Date(CONFIG.DEADLINE)) {
    return { open: false, message: '報名已截止，感謝大家的熱情支持！現場若有名額，歡迎洽什浬鍋櫃檯。' };
  }
  if (CONFIG.MAX_PEOPLE > 0 && countPeople_() >= CONFIG.MAX_PEOPLE) {
    return { open: false, message: '報名人數已額滿，感謝大家的熱情支持！' };
  }
  return { open: true };
}

function submitRegistration(input) {
  input = input || {};
  if (input.website) return { ok: true, id: '—' };

  const status = getFormStatus();
  if (!status.open) return { ok: false, errors: [status.message] };

  const { data, errors } = validate_(input);
  if (errors.length) return { ok: false, errors: errors };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet_();
    const last = sh.getLastRow();

    if (CONFIG.BLOCK_DUPLICATE_PHONE && last > 1) {
      const phoneCol = fieldIndex_('phone') + 1;
      const phones = sh.getRange(2, phoneCol, last - 1, 1).getDisplayValues().flat().map(normPhone_);
      if (phones.indexOf(normPhone_(data.phone)) !== -1) {
        return { ok: false, errors: ['這支電話已經報名過囉！如需修改報名資料，請直接聯繫什浬鍋。'] };
      }
    }
    if (CONFIG.MAX_PEOPLE > 0 && countPeople_() + Number(data.totalPeople) > CONFIG.MAX_PEOPLE) {
      return { ok: false, errors: ['剩餘名額不足，請減少人數或洽什浬鍋櫃檯。'] };
    }

    data.id = 'H' + String(last).padStart(3, '0');
    data.createdAt = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    data.checkedIn = '';
    data.checkinTime = '';

    const row = FIELDS.map(f => safeCell_(data[f[0]]));
    sh.getRange(last + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]);

    // 寄送報名確認信（含 QR Code）
    if (data.email) {
      try { sendConfirmationEmail_(data); } catch (e) { Logger.log('寄信失敗: ' + e); }
    }

    return { ok: true, id: data.id };
  } finally {
    lock.releaseLock();
  }
}

// ===================== 驗證 =====================
function validate_(x) {
  const e = [];
  const d = {};
  const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 200);
  const one = (v, list) => (list.indexOf(v) !== -1 ? v : null);
  const many = v => (Array.isArray(v) ? v : v ? [v] : []);
  const subset = (v, list) => many(v).filter(i => list.indexOf(i) !== -1);
  const int = v => (/^\d+$/.test(String(v).trim()) ? parseInt(v, 10) : NaN);

  d.name = str(x.name, 50);
  if (!d.name) e.push('請填寫主要聯絡人姓名');
  d.phone = str(x.phone, 20);
  if ((d.phone.match(/\d/g) || []).length < 8 || !/^[\d\s+\-()#]+$/.test(d.phone)) e.push('請填寫正確的聯絡電話');
  d.email = str(x.email, 100);
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.push('電子信箱格式不正確');
  d.memberType = one(x.memberType, OPT.memberType);
  if (!d.memberType) e.push('請選擇參加成員');
  const total = int(x.totalPeople);
  if (!(total >= 1 && total <= 50)) e.push('預計參加總人數請填 1–50 的數字');
  d.totalPeople = total;
  const kids = KIDS_TYPES.indexOf(d.memberType) !== -1;
  const pets = PETS_TYPES.indexOf(d.memberType) !== -1;
  const petCount = pets ? int(x.petCount) : 0;
  if (pets && !(petCount >= 1 && petCount <= 20)) e.push('攜帶寵物時，寵物數量請填 1–20');
  d.petCount = petCount;
  d.source = x.source ? one(x.source, OPT.source) || '' : '';
  d.note = str(x.note, 500);

  if (kids) {
    const a = int(x.adults), c = int(x.children);
    if (!(a >= 1)) e.push('請填寫參加大人人數');
    if (!(c >= 1)) e.push('請填寫參加兒童人數');
    d.adults = a; d.children = c;
    d.childAges = subset(x.childAges, OPT.childAges).join('、');
    if (!d.childAges) e.push('請勾選兒童年齡');
    d.hasInfant = one(x.hasInfant, OPT.hasInfant);
    if (!d.hasInfant) e.push('請選擇是否有嬰幼兒同行');
    d.needStroller = one(x.needStroller, OPT.needStroller);
    if (!d.needStroller) e.push('請選擇是否會推嬰兒車到場');
    d.kidCostume = x.kidCostume ? one(x.kidCostume, OPT.kidCostume) || '' : '';
    if (x.childSafety !== true) e.push('請勾選兒童安全確認');
    d.childSafety = '已確認';
  }

  if (pets) {
    d.petTypes = subset(x.petTypes, OPT.petTypes).join('、');
    if (!d.petTypes) e.push('請勾選寵物種類');
    d.petNum = one(x.petNum, OPT.petNum);
    if (!d.petNum) e.push('請選擇攜帶幾隻毛孩');
    d.petNames = str(x.petNames, 100);
    d.petSize = subset(x.petSize, OPT.petSize).join('、');
    d.petTemper = subset(x.petTemper, OPT.petTemper).join('、');
    d.petMode = one(x.petMode, OPT.petMode);
    if (!d.petMode) e.push('請選擇毛孩參加方式');
    d.petCostume = x.petCostume ? one(x.petCostume, OPT.petCostume) || '' : '';
    d.petNote = str(x.petNote, 500);
    if (many(x.petAgree).length < 3) e.push('請勾選全部毛孩參加提醒');
    d.petAgree = '已確認';
  }

  if (many(x.timeAgree).length < 2) e.push('請勾選全部活動時間確認');
  if (many(x.safetyAgree).length < 3) e.push('請勾選全部活動安全確認');
  if (x.privacyAgree !== true) e.push('請勾選個人資料使用告知');
  d.timeAgree = d.safetyAgree = d.privacyAgree = '已確認';
  d.photoConsent = x.photoConsent ? (x.photoConsent === OPT.photoConsent[0] ? '同意' : x.photoConsent === OPT.photoConsent[1] ? '不同意' : '') : '';

  return { data: d, errors: e };
}

// ===================== 後台 API =====================
function checkAdmin_(pw) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!real) throw new Error('尚未設定管理密碼（ADMIN_PASSWORD），請參考 README。');
  if (String(pw || '') !== real) throw new Error('密碼錯誤');
}

function adminGetData(pw) {
  checkAdmin_(pw);
  const sh = ensureSheet_();
  const last = sh.getLastRow();
  if (last < 2) return { rows: [], fields: FIELDS, serverTime: now_() };
  const values = sh.getRange(2, 1, last - 1, FIELDS.length).getDisplayValues();
  const rows = values
    .filter(r => r[0])
    .map(r => {
      const o = {};
      FIELDS.forEach((f, i) => (o[f[0]] = r[i]));
      return o;
    });
  return { rows: rows, fields: FIELDS, serverTime: now_() };
}

function adminSetCheckin(pw, id, checked) {
  checkAdmin_(pw);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet_();
    const last = sh.getLastRow();
    if (last < 2) throw new Error('找不到報名資料');
    const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues().flat();
    const idx = ids.indexOf(String(id));
    if (idx === -1) throw new Error('找不到報名編號 ' + id);
    const row = idx + 2;
    const val = checked ? '✔' : '';
    const time = checked ? Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'HH:mm:ss') : '';
    sh.getRange(row, fieldIndex_('checkedIn') + 1, 1, 2).setValues([[val, time]]);
    return { id: id, checkedIn: val, checkinTime: time };
  } finally {
    lock.releaseLock();
  }
}

// ===================== 刪除報名 =====================

function adminDeleteRegistration(pw, id) {
  checkAdmin_(pw);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet_();
    const last = sh.getLastRow();
    if (last < 2) throw new Error('找不到報名資料');
    const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues().flat();
    const idx = ids.indexOf(String(id));
    if (idx === -1) throw new Error('找不到報名編號 ' + id);
    const row = idx + 2;
    sh.deleteRow(row);
    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

/** 批次刪除多筆報名 */
function adminBatchDelete(pw, ids) {
  checkAdmin_(pw);
  if (!Array.isArray(ids) || !ids.length) throw new Error('請提供要刪除的編號');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet_();
    const last = sh.getLastRow();
    if (last < 2) throw new Error('找不到報名資料');
    const allIds = sh.getRange(2, 1, last - 1, 1).getDisplayValues().flat();
    // 找出要刪除的列號（從大到小排，避免刪除後行號偏移）
    var rowsToDelete = [];
    ids.forEach(function(id) {
      var idx = allIds.indexOf(String(id));
      if (idx !== -1) rowsToDelete.push(idx + 2);
    });
    rowsToDelete.sort(function(a, b) { return b - a; });
    rowsToDelete.forEach(function(row) { sh.deleteRow(row); });
    return { ok: true, deleted: rowsToDelete.length };
  } finally {
    lock.releaseLock();
  }
}

/** 清空全部報名資料 */
function adminDeleteAll(pw) {
  checkAdmin_(pw);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet_();
    const last = sh.getLastRow();
    if (last < 2) return { ok: true, deleted: 0 };
    sh.deleteRows(2, last - 1);
    return { ok: true, deleted: last - 1 };
  } finally {
    lock.releaseLock();
  }
}

/** 修改報名資料（後台用） */
function adminUpdateRegistration(pw, id, data) {
  checkAdmin_(pw);
  if (!id || !data) throw new Error('缺少必要參數');
  var sh = ensureSheet_();
  var last = sh.getLastRow();
  if (last < 2) throw new Error('找不到報名資料');
  var ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues().flat();
  var idx = ids.indexOf(String(id));
  if (idx === -1) throw new Error('找不到報名編號 ' + id);
  var row = idx + 2;
  // 只更新允許修改的欄位
  var editable = ['name', 'phone', 'email', 'totalPeople', 'adults', 'children', 'petCount', 'petNames', 'note', 'petNote'];
  editable.forEach(function(key) {
    if (data[key] !== undefined) {
      var col = fieldIndex_(key);
      if (col >= 0) sh.getRange(row, col + 1).setValue(safeCell_(data[key]));
    }
  });
  // 回傳更新後的資料
  var vals = sh.getRange(row, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var obj = {};
  FIELDS.forEach(function(f, i) { obj[f[0]] = vals[i] || ''; });
  return { ok: true, registration: obj };
}

// ===================== QR 報到 =====================

/** 用報名編號或電話號碼查詢報名資料（報到頁用） */
function lookupRegistration(pw, id) {
  checkAdmin_(pw);
  var query = String(id || '').trim();
  if (!query) throw new Error('請輸入編號或電話號碼');
  var sh = ensureSheet_();
  var last = sh.getLastRow();
  if (last < 2) throw new Error('找不到報名資料');
  var cols = sh.getLastColumn();
  var data = sh.getRange(2, 1, last - 1, cols).getDisplayValues();
  var idCol = fieldIndex_('id');
  var phoneCol = fieldIndex_('phone');
  var row = -1;
  // 先用編號找
  for (var i = 0; i < data.length; i++) {
    if (data[i][idCol] === query) { row = i; break; }
  }
  // 找不到就用電話找
  if (row === -1) {
    var normQuery = normPhone_(query);
    for (var i = 0; i < data.length; i++) {
      if (normPhone_(data[i][phoneCol]) === normQuery) { row = i; break; }
    }
  }
  if (row === -1) throw new Error('找不到編號或電話 ' + query);
  var vals = data[row];
  var obj = {};
  FIELDS.forEach(function(f, i) { obj[f[0]] = vals[i] || ''; });
  return { registration: obj };
}

/** 用報名編號直接報到（QR 掃碼用） */
function checkinById(pw, id) {
  checkAdmin_(pw);
  return adminSetCheckin(pw, id, true);
}

// ===================== 報名確認信 =====================

function sendConfirmationEmail_(data) {
  var siteUrl = CONFIG.SITE_URL || '';
  var checkinUrl = siteUrl ? siteUrl.replace(/\/+$/, '') + '/scan.html?id=' + data.id : '';
  // 用 Google Charts API 產生 QR Code 圖片
  var qrContent = checkinUrl || data.id;
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrContent);
  var qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName('qrcode.png');

  var info = getEventInfo();
  var checkinTime = info.checkinTime || '17:40－18:00';
  var departTime = info.departTime || '18:10 準時出發';
  var depShort = departTime.replace(/\s*準時出發/, '');
  var evDate = info.date || '10/30（五）';
  var evLocation = info.location || '什浬鍋停車場';

  var html = '<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">'
    + '<div style="background:#1a1a2e;color:#fff;padding:24px;border-radius:12px;text-align:center">'
    + '<h1 style="margin:0 0 8px">🎃 報名成功！</h1>'
    + '<p style="color:#ffb347;margin:0">什浬鍋萬聖節親子遊街活動</p>'
    + '</div>'
    + '<div style="background:#fff;border:2px solid #eee;border-radius:12px;padding:24px;margin:16px 0;text-align:center">'
    + '<p style="color:#666;margin:0 0 4px">你的報名編號</p>'
    + '<h2 style="color:#ff6600;font-size:28px;margin:0 0 16px">' + data.id + '</h2>'
    + '<p style="margin:0 0 8px"><b>📱 活動當天請出示以下 QR Code 快速報到</b></p>'
    + '<img src="cid:qrcode" alt="QR Code" style="width:200px;height:200px;border-radius:8px" />'
    + '</div>'
    + '<div style="background:#f8f5ff;border-radius:12px;padding:16px;margin:16px 0">'
    + '<p style="margin:0 0 8px">📍 請於 <b>' + evDate + ' ' + checkinTime + '</b> 至<b>' + evLocation + '</b>報到</p>'
    + '<p style="margin:0 0 8px">🚶 隊伍預計於 <b>' + depShort + '</b> 準時出發</p>'
    + '<p style="margin:0;color:#888">若遲到請至什浬鍋店內櫃檯報到，由工作人員協助。</p>'
    + '</div>'
    + '<p style="color:#888;font-size:13px;text-align:center">報名資訊：' + data.name + '／' + data.totalPeople + ' 人' + (Number(data.petCount) > 0 ? '＋' + data.petCount + ' 隻毛孩' : '') + '</p>'
    + '</body></html>';

  MailApp.sendEmail({
    to: data.email,
    subject: '🎃 什浬鍋萬聖節遊街 — 報名確認（' + data.id + '）',
    htmlBody: html,
    inlineImages: { qrcode: qrBlob },
  });
}

// ===================== 圖片管理 =====================

/** 取得圖片資料夾（自動建立） */
function getImageFolder_() {
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('IMAGE_FOLDER_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) { /* 資料夾被刪了，重新建立 */ }
  }
  const folder = DriveApp.createFolder('什浬鍋萬聖節活動圖片');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  props.setProperty('IMAGE_FOLDER_ID', folder.getId());
  return folder;
}

/** 前台取得所有圖片（不需密碼） */
function getImages() {
  const props = PropertiesService.getScriptProperties();
  const meta = JSON.parse(props.getProperty('IMAGE_META') || '[]');
  return { images: meta };
}

/** 後台上傳圖片 */
function adminUploadImage(pw, category, fileName, base64) {
  checkAdmin_(pw);
  if (!category || !fileName || !base64) throw new Error('缺少必要參數');
  if (['route', 'gift'].indexOf(category) === -1) throw new Error('無效的圖片分類');

  // 解析 base64（移除 data:image/...;base64, 前綴）
  const parts = base64.split(',');
  const raw = parts.length > 1 ? parts[1] : parts[0];
  const mimeMatch = base64.match(/^data:(image\/\w+);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const blob = Utilities.newBlob(Utilities.base64Decode(raw), mime, fileName);
  const folder = getImageFolder_();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const url = 'https://lh3.googleusercontent.com/d/' + fileId;

  // 儲存 metadata
  const props = PropertiesService.getScriptProperties();
  const meta = JSON.parse(props.getProperty('IMAGE_META') || '[]');
  meta.push({
    id: fileId,
    category: category,
    name: fileName,
    url: url,
    createdAt: now_(),
  });
  props.setProperty('IMAGE_META', JSON.stringify(meta));

  return { ok: true, image: meta[meta.length - 1] };
}

/** 後台刪除圖片 */
function adminDeleteImage(pw, fileId) {
  checkAdmin_(pw);
  if (!fileId) throw new Error('缺少檔案 ID');

  try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { /* 檔案可能已被刪除 */ }

  const props = PropertiesService.getScriptProperties();
  const meta = JSON.parse(props.getProperty('IMAGE_META') || '[]');
  const updated = meta.filter(m => m.id !== fileId);
  props.setProperty('IMAGE_META', JSON.stringify(updated));

  return { ok: true };
}

// ===================== 背景音樂 =====================

/** 前台取得背景音樂連結 */
function getMusic() {
  const url = PropertiesService.getScriptProperties().getProperty('MUSIC_URL') || '';
  return { url: url };
}

/** 後台設定背景音樂連結 */
function adminSetMusic(pw, url) {
  checkAdmin_(pw);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('MUSIC_URL', String(url || '').trim());
  return { ok: true, url: props.getProperty('MUSIC_URL') };
}

// ===================== 活動資訊設定 =====================

/** 預設活動資訊 */
var DEFAULT_EVENT_INFO = {
  date: '115年10月30日（星期五）',
  location: '什浬鍋停車場',
  address: '雲林縣麥寮鄉中山路409號',
  checkinTime: '17:40－18:00',
  departTime: '18:10 準時出發',
  audience: '親子家庭、寵物家庭及一般民眾',
  giftDesc: '活動當日完成報到並全程參與者，即可獲得萬聖節小禮物一份！🎃',
  rules: [
    '請於 17:40－18:00 至什浬鍋停車場完成報到，隊伍預計於 18:10 準時出發。',
    '若因故晚到，請直接至什浬鍋店內櫃檯報到，由工作人員協助確認後續參與方式，請勿自行追趕遊街隊伍。',
    '兒童須由家長或法定監護人全程陪同，不可自行離隊。',
    '歡迎毛孩一起參加！請飼主依毛孩的個性準備合適的牽繩或推車。',
    '活動期間請飼主全程照顧毛孩，留意毛孩情緒及周遭人車安全，並自行清理排泄物。',
    '請所有參加者配合工作人員及交通引導人員的指示，共同維護活動安全。',
    '如遇天候或其他不可抗力因素，活動安排若有異動，將另行通知。'
  ]
};

/** 前台取得活動資訊（不需密碼） */
function getEventInfo() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('EVENT_INFO');
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fallback */ }
  }
  return DEFAULT_EVENT_INFO;
}

/** 後台設定活動資訊 */
function adminSetEventInfo(pw, data) {
  checkAdmin_(pw);
  if (!data) throw new Error('缺少活動資訊');
  var info = {
    date: String(data.date || '').trim(),
    location: String(data.location || '').trim(),
    address: String(data.address || '').trim(),
    checkinTime: String(data.checkinTime || '').trim(),
    departTime: String(data.departTime || '').trim(),
    audience: String(data.audience || '').trim(),
    rules: Array.isArray(data.rules) ? data.rules.map(function(r){ return String(r).trim(); }).filter(function(r){ return r; }) : [],
    giftDesc: String(data.giftDesc || '').trim()
  };
  var props = PropertiesService.getScriptProperties();
  props.setProperty('EVENT_INFO', JSON.stringify(info));
  return { ok: true, data: info };
}

function adminChangePassword(pw, newPw) {
  checkAdmin_(pw);
  var np = String(newPw || '').trim();
  if (np.length < 4) throw new Error('新密碼至少需要 4 個字元');
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', np);
  return { ok: true };
}

// ===================== 工具 =====================
function fieldIndex_(key) {
  return FIELDS.findIndex(f => f[0] === key);
}
function normPhone_(p) {
  return String(p || '').replace(/\D/g, '').replace(/^886/, '0');
}
function countPeople_() {
  const sh = ensureSheet_();
  const last = sh.getLastRow();
  if (last < 2) return 0;
  return sh.getRange(2, fieldIndex_('totalPeople') + 1, last - 1, 1).getDisplayValues().flat()
    .reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
}
function safeCell_(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function now_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}
