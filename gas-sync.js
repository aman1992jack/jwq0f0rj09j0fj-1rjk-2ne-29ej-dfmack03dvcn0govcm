/* ═══════════════════════════════════════════════════════════════
   存錢冠 gas-sync.js — 戶部尚書（Google Apps Script）聯動模組
   版本：v1.0 skeleton（架構預建，實際邏輯待開發）
   職責：所有與 GAS / Google Sheets 的現金流同步邏輯
   載入時機：app-core.js 之後（見 index.html 底部）

   ★ 開發說明（未來實作時填入）：
     1. 在 GAS 部署 doPost / doGet Web App，取得部署網址
     2. 將網址填入 GAS_CONFIG.endpoint
     3. 在 GAS_CONFIG.sheetId 填入 Google Sheets 試算表 ID
     4. 解除各函式內的 console.log，改寫真實的 fetch 邏輯
   ═══════════════════════════════════════════════════════════════ */

;(function(global){

  'use strict';

  // ── 模組命名空間 ──────────────────────────
  var GAS = global.GAS_SYNC = {};


  // ══════════════════════════════════════════
  // ① 設定檔（待填入真實值）
  // ══════════════════════════════════════════

  var GAS_CONFIG = {
    // GAS Web App 部署網址（doPost / doGet）
    endpoint:  '',

    // Google Sheets 試算表 ID（URL 中的長串 ID）
    sheetId:   '',

    // 工作表名稱（Sheet tab 名稱）
    sheetName: '現金流',

    // 同步方向："push"（本機→雲端）| "pull"（雲端→本機）| "both"
    syncMode:  'push',

    // 自動同步間隔（毫秒），0 = 不自動同步
    autoInterval: 0,

    // 請求逾時（毫秒）
    timeout: 15000
  };


  // ══════════════════════════════════════════
  // ② 狀態管理
  // ══════════════════════════════════════════

  var STATE = {
    connected:    false,   // 是否成功連線
    lastSyncAt:   null,    // 上次同步時間（Date）
    lastSyncOk:   false,   // 上次同步是否成功
    pendingCount: 0,       // 待同步筆數
    isSyncing:    false,   // 是否正在同步中
    autoTimer:    null     // 自動同步 timer id
  };

  // 對外暴露唯讀狀態
  GAS.getState = function(){ return Object.assign({}, STATE); };


  // ══════════════════════════════════════════
  // ③ 工具函式
  // ══════════════════════════════════════════

  /** 更新設定頁 badge 與副標題 */
  function updateSettingsBadge(text, badgeClass, subText){
    var badge = document.getElementById('gas-status-badge');
    var sub   = document.getElementById('gas-status-sub');
    if(badge){
      badge.textContent  = text;
      badge.className    = 'badge ' + (badgeClass || 'gy');
    }
    if(sub && subText !== undefined){
      sub.textContent = subText;
    }
  }

  /** 格式化時間為 HH:MM:SS */
  function fmtTime(date){
    if(!date) return '--';
    var h = date.getHours(),
        m = date.getMinutes(),
        s = date.getSeconds();
    return [h,m,s].map(function(n){ return n < 10 ? '0'+n : n; }).join(':');
  }

  /** 簡單的請求逾時包裝（fetch + AbortController） */
  function fetchWithTimeout(url, options, ms){
    // AbortController 在部分舊版 iOS WebView 不支援，做 fallback
    if(typeof AbortController !== 'undefined'){
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, ms || GAS_CONFIG.timeout);
      options.signal = ctrl.signal;
      return fetch(url, options).finally(function(){ clearTimeout(timer); });
    }
    return fetch(url, options);
  }

  /**
   * 將一筆 txn 物件轉換為 GAS 期望的列格式
   * （後續依實際試算表欄位調整）
   */
  function txnToRow(txn){
    return {
      id:     txn.id,
      date:   txn.date,
      type:   txn.type === 'e' ? '支出' : '收入',
      cat:    txn.cat  || '',
      sub:    txn.sub  || '',
      amount: txn.amount,
      note:   txn.note || '',
      ts:     txn.ts   || 0
    };
  }

  /**
   * 將 GAS 回傳的列格式還原為 txn 物件
   * （後續依實際試算表欄位調整）
   */
  function rowToTxn(row){
    return {
      id:     row.id,
      date:   row.date,
      type:   row.type === '支出' ? 'e' : 'i',
      cat:    row.cat    || '',
      sub:    row.sub    || '',
      amount: parseFloat(row.amount) || 0,
      note:   row.note   || '',
      ts:     parseInt(row.ts) || 0
    };
  }


  // ══════════════════════════════════════════
  // ④ 連線測試（ping）
  // ══════════════════════════════════════════

  /**
   * GAS.ping()
   * 向 GAS Web App 發送 ping，確認端點可用
   * @returns {Promise<boolean>}
   *
   * ── 實際邏輯（待實作）──────────────────────
   * GAS doGet 端需回傳 JSON：{ ok: true, version: "1.0" }
   */
  GAS.ping = function(){
    console.log('[gas-sync] ping() — 架構預建，尚未實作');

    if(!GAS_CONFIG.endpoint){
      console.warn('[gas-sync] endpoint 未設定，跳過 ping');
      return Promise.resolve(false);
    }

    /* ── 待實作區塊 ──────────────────────────
    return fetchWithTimeout(
      GAS_CONFIG.endpoint + '?action=ping',
      { method: 'GET' },
      GAS_CONFIG.timeout
    )
    .then(function(res){ return res.json(); })
    .then(function(data){
      if(data && data.ok){
        STATE.connected = true;
        updateSettingsBadge('已連結', 'ok', '戶部尚書同步中');
        return true;
      }
      throw new Error('ping 回傳非預期格式');
    })
    .catch(function(err){
      STATE.connected = false;
      console.error('[gas-sync] ping 失敗', err);
      updateSettingsBadge('連線失敗', 'gy', 'GAS 端點無法連線');
      return false;
    });
    ─────────────────────────────────────────── */

    return Promise.resolve(false);
  };


  // ══════════════════════════════════════════
  // ⑤ 推送（本機 → GAS Sheets）
  // ══════════════════════════════════════════

  /**
   * GAS.push(txns)
   * 將指定的 txn 陣列批次寫入 Google Sheets
   * @param {Array} txns  要推送的記帳陣列（預設：本機全部）
   * @returns {Promise<{ok:boolean, count:number}>}
   *
   * ── GAS doPost 端預期格式 ──────────────────
   * POST body: { action:"push", rows:[{...txnRow}] }
   * 回傳:      { ok:true, written:N }
   */
  GAS.push = function(txns){
    console.log('[gas-sync] push() — 架構預建，尚未實作');

    if(!GAS_CONFIG.endpoint){
      console.warn('[gas-sync] endpoint 未設定，跳過 push');
      return Promise.resolve({ ok: false, count: 0 });
    }

    if(STATE.isSyncing){
      console.warn('[gas-sync] 上一次同步尚未完成，跳過');
      return Promise.resolve({ ok: false, count: 0 });
    }

    // 若未傳入，預設推送本機全部 txns
    if(!txns){
      try {
        txns = JSON.parse(localStorage.getItem('cg') || '{}').txns || [];
      } catch(e){
        txns = [];
      }
    }

    var rows = txns.map(txnToRow);
    STATE.isSyncing    = true;
    STATE.pendingCount = rows.length;
    updateSettingsBadge('同步中…', 'bl', '正在推送 ' + rows.length + ' 筆');

    console.log('[gas-sync] 準備推送', rows.length, '筆資料（rows preview）:', rows.slice(0,2));

    /* ── 待實作區塊 ──────────────────────────
    return fetchWithTimeout(
      GAS_CONFIG.endpoint,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'push', rows: rows, sheetName: GAS_CONFIG.sheetName })
      },
      GAS_CONFIG.timeout
    )
    .then(function(res){ return res.json(); })
    .then(function(data){
      STATE.isSyncing  = false;
      STATE.lastSyncAt = new Date();
      if(data && data.ok){
        STATE.lastSyncOk   = true;
        STATE.pendingCount = 0;
        updateSettingsBadge('已連結', 'ok', '上次同步：' + fmtTime(STATE.lastSyncAt));
        return { ok: true, count: data.written || rows.length };
      }
      throw new Error(data.error || 'push 失敗');
    })
    .catch(function(err){
      STATE.isSyncing  = false;
      STATE.lastSyncOk = false;
      console.error('[gas-sync] push 失敗', err);
      updateSettingsBadge('同步失敗', 'gy', err.message || '請檢查 GAS 端點');
      return { ok: false, count: 0 };
    });
    ─────────────────────────────────────────── */

    STATE.isSyncing = false;
    return Promise.resolve({ ok: false, count: 0 });
  };


  // ══════════════════════════════════════════
  // ⑥ 拉取（GAS Sheets → 本機）
  // ══════════════════════════════════════════

  /**
   * GAS.pull()
   * 從 Google Sheets 拉回所有記帳資料，合併至本機
   * @returns {Promise<{ok:boolean, merged:number}>}
   *
   * ── GAS doGet 端預期格式 ───────────────────
   * GET  ?action=pull&sheetName=現金流
   * 回傳: { ok:true, rows:[{...txnRow}] }
   *
   * ── 合併策略 ───────────────────────────────
   * 以 id 去重；雲端 ts 較新者覆蓋本機
   */
  GAS.pull = function(){
    console.log('[gas-sync] pull() — 架構預建，尚未實作');

    if(!GAS_CONFIG.endpoint){
      console.warn('[gas-sync] endpoint 未設定，跳過 pull');
      return Promise.resolve({ ok: false, merged: 0 });
    }

    /* ── 待實作區塊 ──────────────────────────
    return fetchWithTimeout(
      GAS_CONFIG.endpoint + '?action=pull&sheetName=' + encodeURIComponent(GAS_CONFIG.sheetName),
      { method: 'GET' },
      GAS_CONFIG.timeout
    )
    .then(function(res){ return res.json(); })
    .then(function(data){
      if(!data || !data.ok) throw new Error(data.error || 'pull 失敗');

      var remoteTxns = (data.rows || []).map(rowToTxn);

      // 合併：以 id 為 key，ts 較新者優先
      var localData = JSON.parse(localStorage.getItem('cg') || '{}');
      var localTxns = localData.txns || [];
      var map = {};
      localTxns.forEach(function(t){ map[t.id] = t; });
      remoteTxns.forEach(function(t){
        if(!map[t.id] || t.ts > map[t.id].ts) map[t.id] = t;
      });

      var merged = Object.values ? Object.values(map) : Object.keys(map).map(function(k){ return map[k]; });
      localData.txns = merged;
      localStorage.setItem('cg', JSON.stringify(localData));

      STATE.lastSyncAt = new Date();
      STATE.lastSyncOk = true;
      updateSettingsBadge('已連結', 'ok', '上次同步：' + fmtTime(STATE.lastSyncAt));

      // 通知 app-core 重新渲染
      if(typeof renderHome === 'function') renderHome();

      return { ok: true, merged: merged.length };
    })
    .catch(function(err){
      STATE.lastSyncOk = false;
      console.error('[gas-sync] pull 失敗', err);
      updateSettingsBadge('同步失敗', 'gy', err.message || '請檢查 GAS 端點');
      return { ok: false, merged: 0 };
    });
    ─────────────────────────────────────────── */

    return Promise.resolve({ ok: false, merged: 0 });
  };


  // ══════════════════════════════════════════
  // ⑦ 雙向同步（push + pull）
  // ══════════════════════════════════════════

  /**
   * GAS.sync()
   * 依照 GAS_CONFIG.syncMode 執行同步
   * 可由設定頁手動呼叫，也可由自動排程觸發
   */
  GAS.sync = function(){
    console.log('[gas-sync] sync() mode=' + GAS_CONFIG.syncMode, '— 架構預建，尚未實作');

    if(!GAS_CONFIG.endpoint){
      console.warn('[gas-sync] endpoint 未設定，跳過 sync');
      return Promise.resolve({ ok: false });
    }

    var mode = GAS_CONFIG.syncMode;

    if(mode === 'push'){
      return GAS.push();
    } else if(mode === 'pull'){
      return GAS.pull();
    } else {
      // 'both'：先 push 再 pull
      return GAS.push().then(function(){ return GAS.pull(); });
    }
  };


  // ══════════════════════════════════════════
  // ⑧ 自動同步排程
  // ══════════════════════════════════════════

  /**
   * GAS.startAutoSync(intervalMs)
   * 啟動自動同步（設定頁「開啟自動同步」時呼叫）
   */
  GAS.startAutoSync = function(intervalMs){
    GAS.stopAutoSync();
    var ms = intervalMs || GAS_CONFIG.autoInterval;
    if(ms <= 0){ console.log('[gas-sync] autoInterval=0，不啟動自動同步'); return; }

    console.log('[gas-sync] startAutoSync interval=' + ms + 'ms — 架構預建');
    STATE.autoTimer = setInterval(function(){
      GAS.sync().catch(function(e){ console.error('[gas-sync] 自動同步錯誤', e); });
    }, ms);
  };

  /** GAS.stopAutoSync() — 停止自動同步 */
  GAS.stopAutoSync = function(){
    if(STATE.autoTimer){
      clearInterval(STATE.autoTimer);
      STATE.autoTimer = null;
      console.log('[gas-sync] stopAutoSync');
    }
  };


  // ══════════════════════════════════════════
  // ⑨ 設定接口（由設定頁 UI 呼叫）
  // ══════════════════════════════════════════

  /**
   * GAS.configure(options)
   * 動態更新設定，並將 endpoint / sheetId 存到 localStorage
   * @param {Object} options  可覆寫 GAS_CONFIG 的任意欄位
   *
   * 使用範例（設定頁儲存按鈕）：
   *   GAS_SYNC.configure({
   *     endpoint: 'https://script.google.com/macros/s/xxx/exec',
   *     sheetId:  '1aBcDeFgHiJk...'
   *   });
   */
  GAS.configure = function(options){
    if(!options) return;
    Object.keys(options).forEach(function(k){
      if(GAS_CONFIG.hasOwnProperty(k)) GAS_CONFIG[k] = options[k];
    });

    // 持久化 endpoint 與 sheetId
    try {
      var saved = JSON.parse(localStorage.getItem('cg_gas') || '{}');
      if(options.endpoint) saved.endpoint = options.endpoint;
      if(options.sheetId)  saved.sheetId  = options.sheetId;
      localStorage.setItem('cg_gas', JSON.stringify(saved));
    } catch(e){}

    console.log('[gas-sync] configure() 已更新設定', GAS_CONFIG);
  };

  /** 從 localStorage 還原上次儲存的設定 */
  GAS.restoreConfig = function(){
    try {
      var saved = JSON.parse(localStorage.getItem('cg_gas') || '{}');
      if(saved.endpoint) GAS_CONFIG.endpoint = saved.endpoint;
      if(saved.sheetId)  GAS_CONFIG.sheetId  = saved.sheetId;
      console.log('[gas-sync] restoreConfig() endpoint=' + (GAS_CONFIG.endpoint || '（未設定）'));
    } catch(e){}
  };


  // ══════════════════════════════════════════
  // ⑩ 初始化（模組自動執行）
  // ══════════════════════════════════════════

  function init(){
    // 還原上次儲存的設定
    GAS.restoreConfig();

    // 更新設定頁 badge 初始狀態
    if(GAS_CONFIG.endpoint){
      updateSettingsBadge('端點已設定', 'bl', '點同步按鈕測試連線');
      // 自動 ping（確認端點是否仍有效）
      GAS.ping();
    } else {
      updateSettingsBadge('待連結', 'gy', 'GAS 連線確認後啟用');
    }

    // 啟動自動同步（若 autoInterval > 0）
    GAS.startAutoSync();

    console.log('[gas-sync] 模組初始化完成（skeleton 模式）');
  }

  // 等 DOM 載入完再執行
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);


/* ═══════════════════════════════════════════════════════════════
   ★ GAS 端（Google Apps Script）程式碼範本
   ───────────────────────────────────────────────────────────────
   將以下貼入 Apps Script 編輯器，部署為 Web App：
   執行身分：我（或「任何人」），存取：任何人

   function doGet(e) {
     var action = e.parameter.action;
     if(action === 'ping'){
       return ContentService.createTextOutput(
         JSON.stringify({ ok: true, version: '1.0' })
       ).setMimeType(ContentService.MimeType.JSON);
     }
     if(action === 'pull'){
       var sheet = SpreadsheetApp.openById('YOUR_SHEET_ID')
                     .getSheetByName(e.parameter.sheetName || '現金流');
       var rows  = sheet.getDataRange().getValues();
       var keys  = rows.shift(); // 第一列為欄位名稱
       var data  = rows.map(function(r){
         var o = {};
         keys.forEach(function(k,i){ o[k] = r[i]; });
         return o;
       });
       return ContentService.createTextOutput(
         JSON.stringify({ ok: true, rows: data })
       ).setMimeType(ContentService.MimeType.JSON);
     }
     return ContentService.createTextOutput(
       JSON.stringify({ ok: false, error: 'unknown action' })
     ).setMimeType(ContentService.MimeType.JSON);
   }

   function doPost(e) {
     var payload = JSON.parse(e.postData.contents);
     if(payload.action === 'push'){
       var sheet = SpreadsheetApp.openById('YOUR_SHEET_ID')
                     .getSheetByName(payload.sheetName || '現金流');
       // 清空後重寫（簡單策略）
       sheet.clearContents();
       var keys = ['id','date','type','cat','sub','amount','note','ts'];
       sheet.appendRow(keys);
       payload.rows.forEach(function(row){
         sheet.appendRow(keys.map(function(k){ return row[k] || ''; }));
       });
       return ContentService.createTextOutput(
         JSON.stringify({ ok: true, written: payload.rows.length })
       ).setMimeType(ContentService.MimeType.JSON);
     }
     return ContentService.createTextOutput(
       JSON.stringify({ ok: false, error: 'unknown action' })
     ).setMimeType(ContentService.MimeType.JSON);
   }
   ═══════════════════════════════════════════════════════════════ */
