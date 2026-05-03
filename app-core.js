/* ═══════════════════════════════════════════════════════════════
   存錢冠 app-core.js — 本地端主程式
   版本：v2.1（分類管理 + 動態資料 + 防誤觸 Swipe）
   職責：所有本地記帳邏輯、畫面渲染、圖表計算
   資料層：localStorage（key = 'cg'）
   ═══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════
// ① 預設分類資料（僅作為初始化種子）
// ══════════════════════════════════════════

var DEFAULT_SUBS = [
  // ── 支出：飲食 ─────────────────────────
  {ic:'🌅', nm:'早餐',    cat:'飲食',    t:'e'},
  {ic:'🍱', nm:'午餐',    cat:'飲食',    t:'e'},
  {ic:'🍜', nm:'晚餐',    cat:'飲食',    t:'e'},
  {ic:'🧋', nm:'飲品',    cat:'飲食',    t:'e'},
  {ic:'🍰', nm:'點心',    cat:'飲食',    t:'e'},
  {ic:'🍺', nm:'酒類',    cat:'飲食',    t:'e'},
  {ic:'🚬', nm:'香菸',    cat:'飲食',    t:'e'},
  // ── 支出：服裝 ─────────────────────────
  {ic:'👗', nm:'服裝',    cat:'服裝',    t:'e'},
  // ── 支出：住宿 ─────────────────────────
  {ic:'🏠', nm:'房租',    cat:'住宿',    t:'e'},
  {ic:'🏨', nm:'旅館',    cat:'住宿',    t:'e'},
  // ── 支出：交通 ─────────────────────────
  {ic:'🚇', nm:'大眾運輸', cat:'交通',   t:'e'},
  {ic:'🛵', nm:'Gogoro',  cat:'交通',    t:'e'},
  {ic:'✈️', nm:'機票',    cat:'交通',    t:'e'},
  {ic:'🛡️', nm:'旅平險',  cat:'交通',    t:'e'},
  // ── 支出：貓咪 ─────────────────────────
  {ic:'🐱', nm:'貓糧',    cat:'貓咪',    t:'e'},
  {ic:'🪨', nm:'貓砂',    cat:'貓咪',    t:'e'},
  {ic:'💉', nm:'貓咪看病', cat:'貓咪',   t:'e'},
  // ── 支出：娛樂 ─────────────────────────
  {ic:'🛍️', nm:'購物',    cat:'娛樂',    t:'e'},
  {ic:'🎭', nm:'娛樂',    cat:'娛樂',    t:'e'},
  {ic:'🎁', nm:'禮物',    cat:'娛樂',    t:'e'},
  {ic:'💃', nm:'跳舞',    cat:'娛樂',    t:'e'},
  {ic:'🕹️', nm:'遊戲',    cat:'娛樂',    t:'e'},
  // ── 支出：生產力 ───────────────────────
  {ic:'🤖', nm:'AI',      cat:'生產力',  t:'e'},
  {ic:'🌐', nm:'網路',    cat:'生產力',  t:'e'},
  {ic:'📺', nm:'串流平台', cat:'生產力',  t:'e'},
  {ic:'📊', nm:'投資',    cat:'生產力',  t:'e'},
  {ic:'🎥', nm:'器材/道具', cat:'生產力', t:'e'},
  {ic:'🎬', nm:'影片製作', cat:'生產力',  t:'e'},
  // ── 支出：其他 ─────────────────────────
  {ic:'🧴', nm:'日用品',  cat:'其他',    t:'e'},
  {ic:'💊', nm:'醫療',    cat:'其他',    t:'e'},
  {ic:'📱', nm:'電話費',  cat:'其他',    t:'e'},
  {ic:'💰', nm:'預備金',  cat:'其他',    t:'e'},
  {ic:'❤️', nm:'捐款',    cat:'其他',    t:'e'},
  {ic:'💡', nm:'水電瓦斯', cat:'其他',   t:'e'},
  {ic:'🔧', nm:'支出校正', cat:'其他',   t:'e'},
  {ic:'💸', nm:'還錢',    cat:'其他',    t:'e'},
  // ── 收入：固定收入 ─────────────────────
  {ic:'💵', nm:'薪水',    cat:'固定收入',  t:'i'},
  {ic:'🏢', nm:'租金',    cat:'固定收入',  t:'i'},
  // ── 收入：不固定收入 ───────────────────
  {ic:'🎉', nm:'獎金',    cat:'不固定收入', t:'i'},
  {ic:'💱', nm:'交易',    cat:'不固定收入', t:'i'},
  {ic:'▶️', nm:'YouTube', cat:'不固定收入', t:'i'},
  {ic:'📷', nm:'攝影',    cat:'不固定收入', t:'i'},
  {ic:'🎤', nm:'主持',    cat:'不固定收入', t:'i'},
  {ic:'✂️', nm:'剪輯',    cat:'不固定收入', t:'i'},
  {ic:'🚚', nm:'UberEats', cat:'不固定收入', t:'i'},
  {ic:'🔧', nm:'收入校正', cat:'不固定收入', t:'i'},
  {ic:'🎊', nm:'禮金',    cat:'不固定收入', t:'i'},
  {ic:'📢', nm:'業配',    cat:'不固定收入', t:'i'},
  {ic:'🤝', nm:'借錢',    cat:'不固定收入', t:'i'},
  // ── 收入：被動收入 ─────────────────────
  {ic:'📈', nm:'股息',    cat:'被動收入',  t:'i'},
  {ic:'💹', nm:'投資獲利', cat:'被動收入', t:'i'},
  {ic:'📡', nm:'eSIM分潤', cat:'被動收入', t:'i'}
];

var DEFAULT_CATS = {
  飲食:'🍽️', 服裝:'👗', 住宿:'🏠', 交通:'🚇', 貓咪:'🐱',
  娛樂:'🎮', 生產力:'💡', 其他:'📦',
  固定收入:'💼', 不固定收入:'💸', 被動收入:'📈'
};


// ══════════════════════════════════════════
// ② 資料層（localStorage）
// ══════════════════════════════════════════

function db(){
  try{ return JSON.parse(localStorage.getItem('cg') || '{}'); }
  catch(e){ return {}; }
}

function save(d){ localStorage.setItem('cg', JSON.stringify(d)); }

function getTxns(){ return db().txns || []; }
function setTxns(a){ var d = db(); d.txns = a; save(d); }

function getFixed(){ return db().fixed || []; }
function setFixed(a){ var d = db(); d.fixed = a; save(d); }

// ── 動態分類存取 ──────────────────────────
function getSubs(){ return db().subs || []; }
function setSubs(a){ var d = db(); d.subs = a; save(d); }

function getCats(){
  var d = db();
  return d.cats || {};
}
function setCats(o){ var d = db(); d.cats = o; save(d); }

// 初始化分類（首次使用時寫入預設值，並補上 id/ts）
function initSubs(){
  var d = db();
  if(!d.subs || !d.subs.length){
    var ts = Date.now();
    var seeded = DEFAULT_SUBS.map(function(s, i){
      return { id: uid(), ts: ts + i, ic: s.ic, nm: s.nm, cat: s.cat, t: s.t };
    });
    d.subs = seeded;
    d.cats = JSON.parse(JSON.stringify(DEFAULT_CATS));
    save(d);
  }
}

function uid(){
  return 'u' + Date.now() + 'r' + (Math.random() * 9999 | 0);
}

// ── 動態分類工具函式 ──────────────────────
function catIc(c){
  var cats = getCats();
  return cats[c] || '📦';
}

function subIc(nm){
  var subs = getSubs();
  for(var i = 0; i < subs.length; i++){
    if(subs[i].nm === nm) return subs[i].ic;
  }
  return '📦';
}

function subInfo(nm){
  var subs = getSubs();
  for(var i = 0; i < subs.length; i++){
    if(subs[i].nm === nm) return subs[i];
  }
  return null;
}


// ══════════════════════════════════════════
// ③ 全域狀態
// ══════════════════════════════════════════

var CUR_YR, CUR_MO, MP_YR, MP_OPEN = false;
var ADD_TYPE = 'e', CALC_VAL = '', CALC_EXPR = '', SEL_SUB = '';
var AF_TYPE = 'e', AF_DAY = '', AF_EDITING = null;
var CONFIRM_CB = null;
var PIE_CHART = null;
// 分類管理狀態
var CM_TYPE = 'e', CM_EDITING = null;


// ══════════════════════════════════════════
// ④ 初始化
// ══════════════════════════════════════════

window.onload = function(){
  try {
    // 初始化分類資料（首次才寫入）
    initSubs();

    // 月份
    var now  = new Date();
    CUR_YR   = now.getFullYear();
    CUR_MO   = now.getMonth() + 1;
    MP_YR    = CUR_YR;
    setText('h-yr', CUR_YR + '年');
    setText('h-mo', CUR_MO + '月');

    // 預設日期
    var ed = document.getElementById('entry-date');
    if(ed) ed.value = now.toISOString().split('T')[0];

    // 初始分類
    buildCatGrid('e');

    // 渲染首頁
    renderHome();

    // 底部 Sheet 手勢
    initSwipe();

  } catch(err){
    alert('初始化錯誤: ' + err.message);
  }
};


// ══════════════════════════════════════════
// ⑤ 通用工具
// ══════════════════════════════════════════

function setText(id, v){
  var e = document.getElementById(id);
  if(e) e.textContent = v;
}

function fmt(n){ return (Math.round(n) || 0).toLocaleString(); }

function pad(n){ return n < 10 ? '0' + n : '' + n; }

function objEntries(o){
  var r = [];
  for(var k in o){ if(o.hasOwnProperty(k)) r.push([k, o[k]]); }
  return r;
}


// ══════════════════════════════════════════
// ⑥ 導航
// ══════════════════════════════════════════

function go(id){
  var screens = document.querySelectorAll('.screen');
  for(var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
  var s = document.getElementById(id);
  if(s) s.classList.add('active');

  var map = {
    's-home':     'nb-home',
    's-fixed':    'nb-fixed',
    's-report':   'nb-report',
    's-settings': 'nb-settings'
  };
  var btns = document.querySelectorAll('.nav-btn');
  for(var i = 0; i < btns.length; i++) btns[i].classList.remove('on');
  if(map[id]){
    var nb = document.getElementById(map[id]);
    if(nb) nb.classList.add('on');
  }
  if(MP_OPEN) closeMP();
}


// ══════════════════════════════════════════
// ⑦ 月份選擇器
// ══════════════════════════════════════════

function toggleMP(){
  MP_OPEN = !MP_OPEN;
  MP_YR   = CUR_YR;
  var ov = document.getElementById('mo-ov');
  if(ov) ov.classList.toggle('open', MP_OPEN);
  if(MP_OPEN) buildMPgrid();
}

function closeMP(){
  MP_OPEN = false;
  var ov = document.getElementById('mo-ov');
  if(ov) ov.classList.remove('open');
}

function mpYr(d){
  MP_YR += d;
  setText('mp-yr', MP_YR);
  buildMPgrid();
}

function buildMPgrid(){
  setText('mp-yr', MP_YR);
  var months = ['1月','2月','3月','4月','5月','6月',
                '7月','8月','9月','10月','11月','12月'];
  var html = '';
  for(var i = 0; i < months.length; i++){
    var mo = i + 1;
    var on = (MP_YR === CUR_YR && mo === CUR_MO);
    html += '<button class="mo-cell' + (on ? ' cur' : '') +
            '" onclick="pickMo(' + mo + ')">' + months[i] + '</button>';
  }
  var g = document.getElementById('mp-grid');
  if(g) g.innerHTML = html;
}

function pickMo(mo){
  CUR_MO = mo;
  CUR_YR = MP_YR;
  setText('h-yr', CUR_YR + '年');
  setText('h-mo', CUR_MO + '月');
  closeMP();
  renderHome();
}


// ══════════════════════════════════════════
// ⑧ 首頁渲染
// ══════════════════════════════════════════

function renderHome(){
  var txns = getTxns();
  var pre  = CUR_YR + '-' + pad(CUR_MO);
  var mt   = txns.filter(function(t){ return t.date && t.date.indexOf(pre) === 0; });

  var exp = 0, inc = 0, catBreak = {};
  for(var i = 0; i < mt.length; i++){
    var t = mt[i];
    if(t.type === 'e'){
      exp += t.amount;
      catBreak[t.cat] = (catBreak[t.cat] || 0) + t.amount;
    } else {
      inc += t.amount;
    }
  }

  var sur = inc - exp;
  var pct = inc > 0 ? Math.round(exp / inc * 100) : 0;

  setText('pie-pct',    pct + '%');
  setText('pie-exp',    '$' + fmt(exp));
  setText('pie-inc',    '$' + fmt(inc));
  setText('pie-surplus', (sur >= 0 ? '+' : '−') + '$' + fmt(Math.abs(sur)));

  var catArr = objEntries(catBreak).sort(function(a, b){ return b[1] - a[1]; });
  setText('pie-top', catArr.length ? catIc(catArr[0][0]) + ' ' + catArr[0][0] : '--');

  drawPie(exp, inc);
  buildTxnList(mt);
}


// ══════════════════════════════════════════
// ⑨ 交易清單
// ══════════════════════════════════════════

function buildTxnList(txns){
  var dayMap = {};
  for(var i = 0; i < txns.length; i++){
    var t = txns[i];
    if(!dayMap[t.date]) dayMap[t.date] = [];
    dayMap[t.date].push(t);
  }

  var days = Object.keys(dayMap).sort().reverse();
  var el   = document.getElementById('txn-list');
  if(!el) return;

  if(!days.length){
    el.innerHTML = '<div class="empty-hint">本月尚無記錄<br>點下方 ＋ 開始記帳</div>';
    return;
  }

  var WD  = ['日','一','二','三','四','五','六'];
  var html = '';

  for(var di = 0; di < days.length; di++){
    var day   = days[di];
    var items = dayMap[day];
    items.sort(function(a, b){ return (b.ts || 0) - (a.ts || 0); });

    var net = 0;
    for(var i = 0; i < items.length; i++){
      net += (items[i].type === 'i' ? 1 : -1) * items[i].amount;
    }

    var p  = day.split('-');
    var wd = WD[new Date(day).getDay()];

    html += '<div class="day-group">';
    html += '<div class="day-hdr">';
    html += '<span>' + p[1] + '月' + p[2] + '日 週' + wd + '</span>';
    html += '<span class="day-net ' + (net >= 0 ? 'pos' : 'neg') + '">';
    html += (net >= 0 ? '+' : '') + '$' + fmt(Math.abs(net)) + '</span></div>';

    for(var i = 0; i < items.length; i++){
      var t  = items[i];
      var ic = subIc(t.sub) || catIc(t.cat) || '💳';
      html += '<div class="txn-row">';
      html += '<div class="txn-icon ' + t.type + '">' + ic + '</div>';
      html += '<div class="txn-info">';
      html += '<div class="txn-name">' + (t.sub || t.cat || '') + '</div>';
      html += '<div class="txn-sub">'  + (t.note || t.cat || '') + '</div>';
      html += '</div>';
      html += '<div class="txn-amount ' + t.type + '">';
      html += (t.type === 'i' ? '+' : '−') + '$' + fmt(t.amount) + '</div>';
      html += '<div class="txn-acts">';
      html += '<button class="txn-btn" data-id="' + t.id + '" onclick="editTxnById(this)">✏️</button>';
      html += '<button class="txn-btn del" data-id="' + t.id + '" data-nm="' +
              encodeURIComponent(t.sub || t.cat || '') + '" onclick="delTxnById(this)">🗑️</button>';
      html += '</div></div>';
    }
    html += '</div>';
  }
  el.innerHTML = html;
}

function editTxnById(btn){ openEditTxn(btn.dataset.id); }
function delTxnById(btn){ delTxn(btn.dataset.id, decodeURIComponent(btn.dataset.nm || '')); }


// ══════════════════════════════════════════
// ⑩ 圓餅圖
// ══════════════════════════════════════════

function drawPie(exp, inc){
  var canvas = document.getElementById('pie-canvas');
  if(!canvas || typeof Chart === 'undefined') return;
  if(PIE_CHART){ PIE_CHART.destroy(); PIE_CHART = null; }

  var e = exp || 0, i = inc || 0;
  if(e === 0 && i === 0){ e = 1; i = 1; }

  PIE_CHART = new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [e, i],
        backgroundColor: ['#E05252', '#2DB87A'],
        borderWidth: 0,
        borderRadius: 4,
        spacing: 2
      }]
    },
    options: {
      responsive: false,
      cutout: '65%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

function setPieMo(mode, btn){
  var tabs = document.querySelectorAll('.pie-tab');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  btn.classList.add('on');

  var sl = document.getElementById('pie-surplus-lbl');

  if(mode === 'total'){
    if(sl) sl.textContent = '總結餘';
    var txns = getTxns();
    var exp = 0, inc = 0;
    for(var i = 0; i < txns.length; i++){
      if(txns[i].type === 'e') exp += txns[i].amount;
      else                      inc += txns[i].amount;
    }
    var sur = inc - exp;
    setText('pie-exp',    '$' + fmt(exp));
    setText('pie-inc',    '$' + fmt(inc));
    setText('pie-surplus', (sur >= 0 ? '+' : '−') + '$' + fmt(Math.abs(sur)));
    setText('pie-pct',    (inc > 0 ? Math.round(exp / inc * 100) : 0) + '%');
    drawPie(exp, inc);
  } else {
    if(sl) sl.textContent = '月結餘';
    renderHome();
  }
}


// ══════════════════════════════════════════
// ⑪ 記帳 — 分類選擇
// ══════════════════════════════════════════

function buildCatGrid(type){
  var subs = getSubs().filter(function(s){ return s.t === type; });
  SEL_SUB  = subs.length ? subs[0].nm : '';

  var html = '';
  for(var i = 0; i < subs.length; i++){
    var s  = subs[i];
    var on = (i === 0);
    html += '<button class="cat-btn' + (on ? ' on' : '') +
            '" data-nm="' + encodeURIComponent(s.nm) + '" onclick="pickCat(this)">';
    html += '<div class="cat-icon">' + s.ic + '</div>';
    html += '<div class="cat-name">' + s.nm + '</div>';
    html += '</button>';
  }
  var g = document.getElementById('cat-grid');
  if(g) g.innerHTML = html;
}

function pickCat(btn){
  var grid = document.getElementById('cat-grid');
  var btns = grid.querySelectorAll('.cat-btn');
  for(var i = 0; i < btns.length; i++) btns[i].classList.remove('on');
  btn.classList.add('on');
  SEL_SUB = decodeURIComponent(btn.dataset.nm || '');
}

function swType(type){
  ADD_TYPE = type;
  document.getElementById('pill-e').className = 'type-pill' + (type === 'e' ? ' ae' : '');
  document.getElementById('pill-i').className = 'type-pill' + (type === 'i' ? ' ai' : '');
  document.getElementById('calc-disp').className = 'amt-display ' + (type === 'e' ? 'e' : 'i');
  buildCatGrid(type);
  calcReset();
}


// ══════════════════════════════════════════
// ⑫ 計算機
// ══════════════════════════════════════════

function calcReset(){
  CALC_VAL  = '';
  CALC_EXPR = '';
  setText('calc-disp', '$0');
}

function cp(k){
  var disp = document.getElementById('calc-disp');

  if(k === 'AC'){
    calcReset();
    return;
  }

  if(k === 'DEL'){
    CALC_VAL = CALC_VAL.slice(0, -1);
    if(disp) disp.textContent = '$' + (CALC_EXPR || '') + (CALC_VAL || '0');
    return;
  }

  if(k === 'OK'){
    if(!CALC_VAL || CALC_VAL === '0'){ toast('⚠️ 請輸入金額', 'err'); return; }
    var sub = subInfo(SEL_SUB) || getSubs()[0];
    var amt = parseFloat(CALC_VAL);
    if(isNaN(amt) || amt <= 0){ toast('⚠️ 無效金額', 'err'); return; }

    var d = document.getElementById('entry-date');
    var n = document.getElementById('entry-note');

    var txn = {
      id:     uid(),
      type:   ADD_TYPE,
      amount: amt,
      cat:    sub ? sub.cat : '',
      sub:    sub ? sub.nm  : '',
      ic:     sub ? sub.ic  : '💳',
      date:   d ? d.value : new Date().toISOString().split('T')[0],
      note:   n ? n.value : '',
      ts:     Date.now()
    };

    var txns = getTxns();
    txns.push(txn);
    setTxns(txns);

    toast('✅ 已記帳 ' + (ADD_TYPE === 'i' ? '+' : '−') + '$' + fmt(amt));
    calcReset();
    if(n) n.value = '';
    go('s-home');
    renderHome();
    return;
  }

  if(k === '÷' || k === '×' || k === '-' || k === '+'){
    CALC_EXPR = CALC_VAL + k;
    CALC_VAL  = '';
    if(disp) disp.textContent = '$' + CALC_EXPR;
    return;
  }

  if(k === '.' && CALC_VAL.indexOf('.') >= 0) return;
  if(k === '00' && !CALC_VAL) return;
  if(CALC_VAL === '0' && k !== '.') CALC_VAL = '';
  CALC_VAL += k;
  if(disp) disp.textContent = '$' + (CALC_EXPR || '') + CALC_VAL;
}


// ══════════════════════════════════════════
// ⑬ 編輯 & 刪除記帳
// ══════════════════════════════════════════

function openEditTxn(id){
  var txns = getTxns();
  var txn  = null;
  for(var i = 0; i < txns.length; i++){
    if(txns[i].id === id){ txn = txns[i]; break; }
  }
  if(!txn) return;

  document.getElementById('edit-id').value   = id;
  document.getElementById('edit-amt').value  = txn.amount;
  document.getElementById('edit-date').value = txn.date;
  document.getElementById('edit-note').value = txn.note || '';

  buildEditCatGrid(txn.type, txn.sub);
  document.getElementById('edit-te').className = 'type-toggle-btn' + (txn.type === 'e' ? ' ae' : '');
  document.getElementById('edit-ti').className = 'type-toggle-btn' + (txn.type === 'i' ? ' ai' : '');
  openModal('edit-modal');
}

function setEditType(type){
  document.getElementById('edit-te').className = 'type-toggle-btn' + (type === 'e' ? ' ae' : '');
  document.getElementById('edit-ti').className = 'type-toggle-btn' + (type === 'i' ? ' ai' : '');
  buildEditCatGrid(type, '');
}

function buildEditCatGrid(type, selNm){
  var subs = getSubs().filter(function(s){ return s.t === type; });
  var html = '';
  for(var i = 0; i < subs.length; i++){
    var s  = subs[i];
    var on = (s.nm === selNm);
    html += '<button class="fcat-btn' + (on ? ' on' : '') +
            '" data-nm="' + encodeURIComponent(s.nm) + '" onclick="pickEditCat(this)">';
    html += '<div class="fi">' + s.ic + '</div><div class="fn">' + s.nm + '</div></button>';
  }
  var g = document.getElementById('edit-cat-grid');
  if(g) g.innerHTML = html;
}

function pickEditCat(btn){
  var grid = document.getElementById('edit-cat-grid');
  var btns = grid.querySelectorAll('.fcat-btn');
  for(var i = 0; i < btns.length; i++) btns[i].classList.remove('on');
  btn.classList.add('on');
}

function saveEdit(){
  var id   = document.getElementById('edit-id').value;
  var amt  = parseFloat(document.getElementById('edit-amt').value) || 0;
  var type = document.getElementById('edit-te').classList.contains('ae') ? 'e' : 'i';
  var selBtn = document.querySelector('#edit-cat-grid .fcat-btn.on');
  var txns = getTxns();

  for(var i = 0; i < txns.length; i++){
    if(txns[i].id === id){
      txns[i].amount = amt;
      txns[i].type   = type;
      txns[i].date   = document.getElementById('edit-date').value;
      txns[i].note   = document.getElementById('edit-note').value;
      if(selBtn){
        var nm = decodeURIComponent(selBtn.dataset.nm || '');
        var si = subInfo(nm);
        if(si){ txns[i].sub = si.nm; txns[i].cat = si.cat; txns[i].ic = si.ic; }
      }
      break;
    }
  }

  setTxns(txns);
  closeModal('edit-modal');
  toast('✅ 已更新');
  renderHome();
}

function delTxn(id, nm){
  showConfirm('確定要刪除「' + (nm || '此筆') + '」記錄嗎？', function(){
    setTxns(getTxns().filter(function(t){ return t.id !== id; }));
    toast('✅ 已刪除');
    renderHome();
  });
}


// ══════════════════════════════════════════
// ⑭ 固定項目
// ══════════════════════════════════════════

function renderFixed(){
  var fixed = getFixed();
  buildFixedList('fl-e', fixed.filter(function(f){ return f.type === 'e'; }));
  buildFixedList('fl-i', fixed.filter(function(f){ return f.type === 'i'; }));
}

function buildFixedList(elId, items){
  var el = document.getElementById(elId);
  if(!el) return;
  if(!items.length){
    el.innerHTML = '<div class="empty-hint">尚無固定項目<br>點下方新增</div>';
    return;
  }

  var FMAP = { weekly:'每週', monthly:'每月', yearly:'每年' };
  var html = '';

  for(var i = 0; i < items.length; i++){
    var f   = items[i];
    var ic  = subIc(f.sub) || catIc(f.cat) || '💳';
    var amt = (f.type === 'e' ? '− ' : '+ ') + '$' + fmt(f.amount);
    var fq  = FMAP[f.frequency] || '每月';

    html += '<div class="fixed-card">';
    html += '<div class="fixed-icon">' + ic + '</div>';
    html += '<div class="fixed-info"><div class="fixed-name">' + f.name + '</div>';
    html += '<div class="fixed-meta">' + fq + ' ' + (f.day || '') + '・' + (f.cat || '') + '</div></div>';
    html += '<div class="fixed-right">';
    html += '<div class="fixed-amt ' + f.type + '">' + amt + '</div>';
    html += '<div class="fixed-cycle">' + f.cycle + '</div></div>';
    html += '<div class="fixed-acts">';
    html += '<button class="txn-btn" data-fid="' + f.id + '" onclick="editFixedById(this)">✏️</button>';
    html += '<button class="txn-btn del" data-fid="' + f.id + '" data-fnm="' +
            encodeURIComponent(f.name) + '" onclick="delFixedById(this)">🗑️</button>';
    html += '</div></div>';
  }
  el.innerHTML = html;
}

function editFixedById(btn){ openEditFixed(btn.dataset.fid); }
function delFixedById(btn){ delFixed(btn.dataset.fid, decodeURIComponent(btn.dataset.fnm || '')); }

function swFixedTab(type, btn){
  var tabs = document.querySelectorAll('#s-fixed .tab-btn');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  btn.classList.add('on');
  document.getElementById('fl-e').style.display = type === 'e' ? 'block' : 'none';
  document.getElementById('fl-i').style.display = type === 'i' ? 'block' : 'none';
}

function openAF(){
  AF_EDITING = null;
  AF_DAY     = '';
  setText('af-title', '新增固定項目');
  document.getElementById('af-name').value = '';
  document.getElementById('af-amt').value  = '';
  document.getElementById('af-note').value = '';
  document.getElementById('af-freq').value = 'monthly';
  setAFtype('e', '');
  buildDayPicker();
  document.getElementById('af-bg').classList.add('open');
}

function openEditFixed(id){
  var fixed = getFixed();
  var f     = null;
  for(var i = 0; i < fixed.length; i++){
    if(fixed[i].id === id){ f = fixed[i]; break; }
  }
  if(!f) return;

  AF_EDITING = f;
  AF_DAY     = f.day || '';
  setText('af-title', '編輯固定項目');
  document.getElementById('af-name').value = f.name;
  document.getElementById('af-amt').value  = f.amount;
  document.getElementById('af-note').value = f.note || '';
  document.getElementById('af-freq').value = f.frequency || 'monthly';
  setAFtype(f.type, f.sub);
  buildDayPicker();
  document.getElementById('af-bg').classList.add('open');
}

function setAFtype(type, selNm){
  AF_TYPE = type;
  document.getElementById('af-te').className = 'type-toggle-btn' + (type === 'e' ? ' ae' : '');
  document.getElementById('af-ti').className = 'type-toggle-btn' + (type === 'i' ? ' ai' : '');

  var subs = getSubs().filter(function(s){ return s.t === type; });
  var html = '';
  for(var i = 0; i < subs.length; i++){
    var s  = subs[i];
    var on = (selNm && s.nm === selNm);
    html += '<button class="fcat-btn' + (on ? ' on' : '') +
            '" data-nm="' + encodeURIComponent(s.nm) + '" onclick="pickAFcat(this)">';
    html += '<div class="fi">' + s.ic + '</div><div class="fn">' + s.nm + '</div></button>';
  }
  var g = document.getElementById('af-cat-grid');
  if(g) g.innerHTML = html;
}

function pickAFcat(btn){
  var grid = document.getElementById('af-cat-grid');
  var btns = grid.querySelectorAll('.fcat-btn');
  for(var i = 0; i < btns.length; i++) btns[i].classList.remove('on');
  btn.classList.add('on');
  var nm = decodeURIComponent(btn.dataset.nm || '');
  var n  = document.getElementById('af-name');
  if(n && (!n.value || getSubs().some(function(s){ return s.nm === n.value; }))){
    n.value = nm;
  }
}

function buildDayPicker(){
  var freq = document.getElementById('af-freq');
  if(!freq) return;
  var fv   = freq.value;
  var wrap = document.getElementById('af-day-wrap');
  if(!wrap) return;

  AF_DAY = '';

  if(fv === 'weekly'){
    var days = ['一','二','三','四','五','六','日'];
    var html = '<div class="day-picker wk">';
    for(var i = 0; i < days.length; i++){
      html += '<button class="day-cell" data-dv="' + days[i] +
              '" onclick="pickDay(this)">' + days[i] + '</button>';
    }
    wrap.innerHTML = html + '</div>';

  } else if(fv === 'monthly'){
    var html = '<div class="day-picker mo">';
    for(var n = 1; n <= 31; n++){
      html += '<button class="day-cell" data-dv="' + n +
              '日" onclick="pickDay(this)">' + n + '</button>';
    }
    wrap.innerHTML = html + '</div>';

  } else {
    wrap.innerHTML =
      '<div class="form-row"><input class="form-input" id="af-yearly" type="date"' +
      ' onchange="AF_DAY=this.value"></div>';
  }
}

function pickDay(btn){
  var picker = btn.closest('.day-picker');
  if(picker){
    var cells = picker.querySelectorAll('.day-cell');
    for(var i = 0; i < cells.length; i++) cells[i].classList.remove('on');
  }
  btn.classList.add('on');
  AF_DAY = btn.dataset.dv || '';
}

function saveFixed(){
  var nm = document.getElementById('af-name').value.trim();
  if(!nm){ toast('⚠️ 請填入名稱', 'err'); return; }

  var selBtn = document.querySelector('#af-cat-grid .fcat-btn.on');
  var sub    = selBtn ? decodeURIComponent(selBtn.dataset.nm || '') : '';
  var si     = subInfo(sub);

  var freq = document.getElementById('af-freq').value;
  if(freq === 'yearly'){
    var yd = document.getElementById('af-yearly');
    if(yd) AF_DAY = yd.value;
  }

  var item = {
    id:        AF_EDITING ? AF_EDITING.id : uid(),
    name:      nm,
    amount:    parseFloat(document.getElementById('af-amt').value) || 0,
    type:      AF_TYPE,
    sub:       sub,
    cat:       si ? si.cat : '',
    frequency: freq,
    day:       AF_DAY,
    cycle:     document.getElementById('af-cycle').value,
    note:      document.getElementById('af-note').value
  };

  var fixed = getFixed();
  if(AF_EDITING){
    for(var i = 0; i < fixed.length; i++){
      if(fixed[i].id === AF_EDITING.id){ fixed[i] = item; break; }
    }
  } else {
    fixed.push(item);
  }

  setFixed(fixed);
  closeAF();
  toast('✅ 已儲存');
  renderFixed();
}

function delFixed(id, nm){
  showConfirm('確定要刪除固定項目「' + (nm || '此項') + '」？', function(){
    setFixed(getFixed().filter(function(f){ return f.id !== id; }));
    toast('✅ 已刪除');
    renderFixed();
  });
}

function closeAF(){ document.getElementById('af-bg').classList.remove('open'); }

function closeAFbg(e){
  if(e.target === document.getElementById('af-bg')) closeAF();
}

// ══════════════════════════════════════════
// 第一部分：Bottom Sheet 手勢 — 通用化與流暢化 (修復卡頓Bug版)
// ══════════════════════════════════════════

function initSwipe(){
  // 抓取畫面上所有的 bottom sheet
  var sheets = document.querySelectorAll('.bsheet');

  for(var i = 0; i < sheets.length; i++){
    (function(sheet){
      var handle = sheet.querySelector('.bsheet-handle');
      var bg     = sheet.closest('.bsheet-bg');
      if(!handle || !bg) return;

      var sy = 0, mv = 0, dragging = false;

      // ── 工具：強制清除所有行內手勢樣式 ──────────────────────
      function resetStyle(){
        sheet.style.transition = '';
        sheet.style.transform  = '';
      }

      // ── 工具：平滑回彈到頂部 ─────────────────────────────
      function snapBack(){
        sheet.style.transition = 'transform 0.25s ease';
        sheet.style.transform  = 'translateY(0)';
        // 動畫結束後徹底清空行內樣式，避免殘留
        sheet.addEventListener('transitionend', function onEnd(){
          sheet.removeEventListener('transitionend', onEnd);
          resetStyle();
        });
      }

      // ── 工具：關閉對應的 sheet（含清除遮罩） ─────────────────
      function closeSheet(){
        // 先用動畫滑出畫面底部，再執行正式關閉函式
        sheet.style.transition = 'transform 0.25s ease';
        sheet.style.transform  = 'translateY(100%)';
        sheet.addEventListener('transitionend', function onEnd(){
          sheet.removeEventListener('transitionend', onEnd);
          // 徹底清空行內樣式，避免下次開啟時殘留
          resetStyle();
          // 呼叫對應的正式關閉函式，確保 bg open class 被移除
          if(sheet.id === 'af-sheet' && typeof closeAF === 'function'){
            closeAF();
          } else if(sheet.id === 'subform-sheet' && typeof closeSubForm === 'function'){
            closeSubForm();
          } else {
            bg.classList.remove('open');
          }
        });
      }

      // ── touchstart：記錄起點，關閉 CSS transition 緊跟手指 ──
      handle.addEventListener('touchstart', function(e){
        sy       = e.touches[0].clientY;
        mv       = 0;
        dragging = true;
        sheet.style.transition = 'none';
        sheet.style.transform  = 'translateY(0)';
      }, {passive: true});

      // ── touchmove：只允許向下拖（mv > 0） ────────────────────
      handle.addEventListener('touchmove', function(e){
        if(!dragging) return;
        mv = e.touches[0].clientY - sy;
        if(mv > 0){
          sheet.style.transform = 'translateY(' + mv + 'px)';
        }
      }, {passive: true});

      // ── touchend：判斷關閉或回彈，絕不讓 sheet 卡住 ──────────
      handle.addEventListener('touchend', function(){
        if(!dragging) return;
        dragging = false;

        var dist = mv;
        mv = 0; // 立刻歸零，避免後續狀態污染

        if(dist > 80){
          // 下滑夠遠 → 關閉
          closeSheet();
        } else {
          // 下滑不夠遠 → 平滑回彈
          snapBack();
        }
      });

      // ── touchcancel：意外中斷（來電、通知等）→ 強制回彈 ──────
      handle.addEventListener('touchcancel', function(){
        if(!dragging) return;
        dragging = false;
        mv = 0;
        snapBack();
      });

    })(sheets[i]);
  }
}


// ══════════════════════════════════════════
// ⑮ 統計分析
// ══════════════════════════════════════════

function renderReport(){
  var mo = document.getElementById('rep-mo-btn');
  if(mo) mo.textContent = CUR_YR + '年 ' + CUR_MO + '月 ▾';

  var txns = getTxns();
  var pre  = CUR_YR + '-' + pad(CUR_MO);
  var mt   = txns.filter(function(t){ return t.date && t.date.indexOf(pre) === 0; });

  var exp = 0, inc = 0, cats = {}, subs = {};
  for(var i = 0; i < mt.length; i++){
    var t = mt[i];
    if(t.type === 'e'){
      exp += t.amount;
      cats[t.cat]            = (cats[t.cat] || 0) + t.amount;
      subs[t.sub || t.cat]   = (subs[t.sub || t.cat] || 0) + t.amount;
    } else {
      inc += t.amount;
    }
  }

  var sur  = inc - exp;
  var savR = inc > 0 ? Math.round(sur / inc * 100) : 0;

  var catArr = objEntries(cats).sort(function(a, b){ return b[1] - a[1]; });
  var subArr = objEntries(subs).sort(function(a, b){ return b[1] - a[1]; }).slice(0, 12);
  var maxC   = catArr.length ? catArr[0][1] : 1;
  var maxS   = subArr.length ? subArr[0][1] : 1;

  var catH = '';
  for(var i = 0; i < catArr.length; i++){
    var e = catArr[i];
    catH += '<div class="cat-bar-row">';
    catH += '<div class="cat-bar-icon">' + catIc(e[0]) + '</div>';
    catH += '<div class="cat-bar-info"><div class="cat-bar-name">' + e[0] + '</div>';
    catH += '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:' +
            Math.round(e[1] / maxC * 100) + '%"></div></div></div>';
    catH += '<div class="cat-bar-amt">$' + fmt(e[1]) + '</div></div>';
  }

  var subH = '';
  for(var i = 0; i < subArr.length; i++){
    var e = subArr[i];
    subH += '<div class="cat-bar-row">';
    subH += '<div class="cat-bar-icon">' + subIc(e[0]) + '</div>';
    subH += '<div class="cat-bar-info"><div class="cat-bar-name">' + e[0] + '</div>';
    subH += '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:' +
            Math.round(e[1] / maxS * 100) + '%"></div></div></div>';
    subH += '<div class="cat-bar-amt">$' + fmt(e[1]) + '</div></div>';
  }

  var rb = document.getElementById('rep-body');
  if(!rb) return;

  rb.innerHTML =
    '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-lbl">💸 總支出</div><div class="stat-val e">$' + fmt(exp) + '</div></div>' +
    '<div class="stat-card"><div class="stat-lbl">💰 總收入</div><div class="stat-val i">$' + fmt(inc) + '</div></div>' +
    '<div class="stat-card"><div class="stat-lbl">📊 月結餘</div><div class="stat-val g">' + (sur >= 0 ? '+' : '−') + '$' + fmt(Math.abs(sur)) + '</div></div>' +
    '<div class="stat-card"><div class="stat-lbl">📈 儲蓄率</div><div class="stat-val g">' + savR + '%</div></div>' +
    '</div>' +
    '<div class="chart-tabs"><button class="chart-tab on" onclick="swRC(this,\'pie\')">圓餅圖</button>' +
    '<button class="chart-tab" onclick="swRC(this,\'trend\')">走勢</button></div>' +
    '<div class="chart-box" id="rep-pie-box">' +
    '<div class="cat-legend">' +
    '<div class="cat-leg-item"><div class="cat-leg-dot" style="background:#E05252"></div>支出</div>' +
    '<div class="cat-leg-item"><div class="cat-leg-dot" style="background:#2DB87A"></div>收入</div></div>' +
    '<div style="position:relative;width:100%;height:180px"><canvas id="rep-pie"></canvas></div></div>' +
    '<div class="chart-box" id="rep-trend-box" style="display:none">' +
    '<div style="color:var(--t2);font-size:13px;text-align:center;padding:20px">走勢圖即將推出</div></div>' +
    '<div class="detail-tabs">' +
    '<button class="detail-tab on" onclick="swDet(this,\'cat\')">依類別</button>' +
    '<button class="detail-tab" onclick="swDet(this,\'sub\')">依細項</button></div>' +
    '<div id="rep-cat">' + (catH || '<div style="color:var(--t3);font-size:13px;padding:8px 0">本月尚無支出</div>') + '</div>' +
    '<div id="rep-sub" style="display:none">' + (subH || '<div style="color:var(--t3);font-size:13px;padding:8px 0">本月尚無細項</div>') + '</div>';

  setTimeout(function(){
    var ctx = document.getElementById('rep-pie');
    if(!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [exp || 1, inc || 1],
          backgroundColor: ['#E05252', '#2DB87A'],
          borderWidth: 0,
          borderRadius: 3,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: { legend: { display: false } }
      }
    });
  }, 80);
}

function swRC(btn, type){
  var tabs = document.querySelectorAll('.chart-tab');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  btn.classList.add('on');
  document.getElementById('rep-pie-box').style.display   = type === 'pie'   ? 'block' : 'none';
  document.getElementById('rep-trend-box').style.display = type === 'trend' ? 'block' : 'none';
}

function swDet(btn, mode){
  var tabs = document.querySelectorAll('.detail-tab');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  btn.classList.add('on');
  document.getElementById('rep-cat').style.display = mode === 'cat' ? 'block' : 'none';
  document.getElementById('rep-sub').style.display = mode === 'sub' ? 'block' : 'none';
}

function swRepTab(mode, btn){
  var tabs = document.querySelectorAll('#s-report .tab-btn');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  btn.classList.add('on');
  renderReport();
}


// ══════════════════════════════════════════
// ⑯ 設定
// ══════════════════════════════════════════

function exportData(){
  var data = localStorage.getItem('cg') || '{}';
  var blob = new Blob([data], {type: 'application/json'});
  var a    = document.createElement('a');
  a.href   = URL.createObjectURL(blob);
  a.download = '存錢冠備份_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('✅ 備份已下載');
}

function clearAllData(){
  showConfirm('確定要清除所有資料嗎？此操作無法復原！', function(){
    localStorage.removeItem('cg');
    toast('✅ 已清除');
    initSubs();
    renderHome();
  });
}


// ══════════════════════════════════════════
// ⑰ 通用 UI 工具
// ══════════════════════════════════════════

function openModal(id){
  var e = document.getElementById(id);
  if(e) e.classList.add('open');
}

function closeModal(id){
  var e = document.getElementById(id);
  if(e) e.classList.remove('open');
}

function toast(msg, type){
  var el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.className   = 'toast' + (type === 'err' ? ' err' : '') + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.classList.remove('show'); }, 2800);
}

function showConfirm(msg, cb){
  setText('confirm-msg', msg);
  CONFIRM_CB = cb;
  document.getElementById('confirm-bg').classList.add('open');
  document.getElementById('confirm-ok').onclick = function(){
    closeConfirm();
    if(cb) cb();
  };
}

function closeConfirm(){
  document.getElementById('confirm-bg').classList.remove('open');
  CONFIRM_CB = null;
}


// ══════════════════════════════════════════
// ⑱ 分類管理（Category Manager）
// ══════════════════════════════════════════

function openCatManager(){
  CM_TYPE    = 'e';
  CM_EDITING = null;
  go('s-catmgr');
  renderCatMgr();
}

function swCatMgrTab(type, btn){
  var tabs = document.querySelectorAll('#s-catmgr .tab-btn');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  btn.classList.add('on');
  CM_TYPE = type;
  renderCatMgr();
}

function renderCatMgr(){
  var subs = getSubs().filter(function(s){ return s.t === CM_TYPE; });
  var el   = document.getElementById('catmgr-list');
  if(!el) return;

  if(!subs.length){
    el.innerHTML = '<div class="empty-hint">尚無分類項目<br>點下方新增</div>';
    return;
  }

  var html = '';
  for(var i = 0; i < subs.length; i++){
    var s = subs[i];
    html += '<div class="cm-row">';
    html += '<div class="cm-icon">' + s.ic + '</div>';
    html += '<div class="cm-info">';
    html += '<div class="cm-nm">' + s.nm + '</div>';
    html += '<div class="cm-cat">' + s.cat + '</div>';
    html += '</div>';
    html += '<div class="txn-acts">';
    html += '<button class="txn-btn" data-sid="' + s.id + '" onclick="editSubById(this)">✏️</button>';
    html += '<button class="txn-btn del" data-sid="' + s.id + '" data-snm="' +
            encodeURIComponent(s.nm) + '" onclick="delSubById(this)">🗑️</button>';
    html += '</div></div>';
  }
  el.innerHTML = html;
}

function editSubById(btn){ openSubForm(btn.dataset.sid); }
function delSubById(btn){
  var nm = decodeURIComponent(btn.dataset.snm || '');
  var id = btn.dataset.sid;
  showConfirm('確定要刪除分類「' + nm + '」？', function(){
    var subs = getSubs().filter(function(s){ return s.id !== id; });
    setSubs(subs);
    toast('✅ 已刪除分類');
    renderCatMgr();
    buildCatGrid(CM_TYPE);
  });
}

// 分類表單
var CM_FORM_TYPE = 'e';

function openSubForm(editId){
  CM_EDITING    = editId || null;
  CM_FORM_TYPE  = CM_TYPE;

  var subs = getSubs();
  var existing = null;
  if(editId){
    for(var i = 0; i < subs.length; i++){
      if(subs[i].id === editId){ existing = subs[i]; break; }
    }
  }

  setText('subform-title', existing ? '編輯分類項目' : '新增分類項目');
  document.getElementById('subform-ic').value  = existing ? existing.ic  : '';
  document.getElementById('subform-nm').value  = existing ? existing.nm  : '';
  document.getElementById('subform-cat').value = existing ? existing.cat : '';

  // 類型切換按鈕
  CM_FORM_TYPE = existing ? existing.t : CM_TYPE;
  var btnE = document.getElementById('subform-te');
  var btnI = document.getElementById('subform-ti');
  if(btnE) btnE.className = 'type-toggle-btn' + (CM_FORM_TYPE === 'e' ? ' ae' : '');
  if(btnI) btnI.className = 'type-toggle-btn' + (CM_FORM_TYPE === 'i' ? ' ai' : '');

  document.getElementById('subform-bg').classList.add('open');
}

function setSubFormType(type){
  CM_FORM_TYPE = type;
  document.getElementById('subform-te').className = 'type-toggle-btn' + (type === 'e' ? ' ae' : '');
  document.getElementById('subform-ti').className = 'type-toggle-btn' + (type === 'i' ? ' ai' : '');
}

function saveSubForm(){
  var ic  = document.getElementById('subform-ic').value.trim();
  var nm  = document.getElementById('subform-nm').value.trim();
  var cat = document.getElementById('subform-cat').value.trim();

  if(!nm)  { toast('⚠️ 請填入細項名稱', 'err'); return; }
  if(!cat) { toast('⚠️ 請填入主分類', 'err');   return; }
  if(!ic)  { toast('⚠️ 請填入 Emoji 圖示', 'err'); return; }

  var subs = getSubs();

  // 防呆：細項名稱不可重複（排除自身）
  for(var i = 0; i < subs.length; i++){
    if(subs[i].nm === nm && subs[i].id !== CM_EDITING){
      toast('⚠️ 細項名稱「' + nm + '」已存在', 'err');
      return;
    }
  }

  if(CM_EDITING){
    // 更新現有
    for(var i = 0; i < subs.length; i++){
      if(subs[i].id === CM_EDITING){
        subs[i].ic  = ic;
        subs[i].nm  = nm;
        subs[i].cat = cat;
        subs[i].t   = CM_FORM_TYPE;
        subs[i].ts  = Date.now();
        break;
      }
    }
  } else {
    // 新增
    subs.push({ id: uid(), ts: Date.now(), ic: ic, nm: nm, cat: cat, t: CM_FORM_TYPE });
  }

  // 同步更新 cats 對照表（若主分類不存在則新增）
  var cats = getCats();
  if(!cats[cat]){
    cats[cat] = ic;
    setCats(cats);
  }

  setSubs(subs);
  closeSubForm();
  toast('✅ 分類已儲存');
  renderCatMgr();
  buildCatGrid(CM_TYPE);
}

function closeSubForm(){
  document.getElementById('subform-bg').classList.remove('open');
  CM_EDITING = null;
}

function closeSubFormBg(e){
  if(e.target === document.getElementById('subform-bg')) closeSubForm();
}
