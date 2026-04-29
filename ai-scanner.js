/* ═══════════════════════════════════════════════════════════════
   存錢冠 ai-scanner.js — 雲端發票載具 AI 辨識模組
   版本：v1.0 skeleton（架構預建，實際邏輯待開發）
   職責：所有「截圖上傳 → AI OCR → 解析發票 → 自動填入記帳」邏輯
   載入時機：gas-sync.js 之後（見 index.html 底部）

   ★ 開發說明（未來實作時填入）：
     方案 A（純前端）：上傳截圖到 Claude / GPT-4o Vision API，解析回傳 JSON
     方案 B（GAS 中轉）：截圖傳到 GAS doPost → GAS 呼叫 Vision API → 回傳解析結果
     目前 s-invoice 畫面已保留 id="invoice-status-msg" 供此模組動態更新說明文字
   ═══════════════════════════════════════════════════════════════ */

;(function(global){

  'use strict';

  // ── 模組命名空間 ──────────────────────────
  var AI = global.AI_SCANNER = {};


  // ══════════════════════════════════════════
  // ① 設定檔（待填入真實值）
  // ══════════════════════════════════════════

  var AI_CONFIG = {
    // AI Vision API 端點（Claude / GPT-4o / GAS 中轉 URL）
    endpoint: '',

    // API 金鑰（若直接打 Claude/OpenAI；若透過 GAS 則由 GAS 保管，此處留空）
    apiKey: '',

    // 使用的 AI 服務："claude" | "openai" | "gas"
    provider: 'gas',

    // Claude 模型（provider=claude 時使用）
    model: 'claude-opus-4-6',

    // 最大回傳 token 數
    maxTokens: 512,

    // 圖片最大壓縮寬度（px），0 = 不壓縮
    maxImgWidth: 1200,

    // 圖片壓縮品質（0.1–1.0）
    imgQuality: 0.82,

    // 請求逾時（毫秒）
    timeout: 30000
  };


  // ══════════════════════════════════════════
  // ② 狀態管理
  // ══════════════════════════════════════════

  var STATE = {
    ready:        false,   // 模組是否就緒（endpoint 已設定）
    isScanning:   false,   // 是否正在辨識中
    lastResult:   null,    // 上次辨識結果（InvoiceResult 物件）
    lastError:    null,    // 上次錯誤訊息
    scanCount:    0        // 累積辨識次數
  };

  AI.getState = function(){ return Object.assign({}, STATE); };


  // ══════════════════════════════════════════
  // ③ 工具函式
  // ══════════════════════════════════════════

  /** 更新設定頁 badge 與副標題 */
  function updateSettingsBadge(text, badgeClass, subText){
    var badge = document.getElementById('ai-scanner-badge');
    var sub   = document.getElementById('ai-scanner-sub');
    if(badge){
      badge.textContent = text;
      badge.className   = 'badge ' + (badgeClass || 'gy');
    }
    if(sub && subText !== undefined){
      sub.textContent = subText;
    }
  }

  /** 更新發票掃描畫面的狀態說明文字 */
  function updateInvoiceScreen(msg){
    var el = document.getElementById('invoice-status-msg');
    if(el) el.innerHTML = msg;
  }

  /**
   * 將 File / Blob 轉為 base64 字串
   * @param {File|Blob} file
   * @returns {Promise<string>}  base64（不含 data:image/...;base64, 前綴）
   */
  function fileToBase64(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload  = function(e){ resolve(e.target.result.split(',')[1]); };
      reader.onerror = function(e){ reject(e); };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 壓縮圖片至指定最大寬度
   * @param {File|Blob} file
   * @param {number} maxWidth
   * @param {number} quality
   * @returns {Promise<Blob>}
   */
  function compressImage(file, maxWidth, quality){
    return new Promise(function(resolve){
      if(!maxWidth || maxWidth <= 0){ resolve(file); return; }
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function(){
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        if(w <= maxWidth){ resolve(file); return; }
        var scale  = maxWidth / w;
        var canvas = document.createElement('canvas');
        canvas.width  = maxWidth;
        canvas.height = Math.round(h * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob){ resolve(blob || file); },
          file.type || 'image/jpeg', quality || 0.82);
      };
      img.onerror = function(){ resolve(file); };
      img.src = url;
    });
  }

  /**
   * 建構送給 Claude Vision API 的 prompt
   * 要求回傳 JSON 格式，方便後端解析
   */
  function buildInvoicePrompt(){
    return [
      '請仔細辨識這張台灣電子發票或載具消費截圖，',
      '提取以下資訊並僅回傳純 JSON（不要加 markdown 或任何說明）：',
      '{',
      '  "date": "YYYY-MM-DD",',
      '  "merchant": "商家名稱",',
      '  "total": 金額數字（整數或小數，不含符號）,',
      '  "items": [',
      '    {"name": "品項名稱", "qty": 數量, "price": 單價}',
      '  ],',
      '  "invoiceNo": "發票號碼（如無則空字串）",',
      '  "note": "備註（如無則空字串）"',
      '}',
      '若圖片無法辨識為發票，回傳 {"error": "非發票圖片"}'
    ].join('');
  }


  // ══════════════════════════════════════════
  // ④ InvoiceResult 型別說明
  // ══════════════════════════════════════════

  /*
   * InvoiceResult {
   *   date:      string   "YYYY-MM-DD"
   *   merchant:  string   商家名稱
   *   total:     number   消費總額
   *   items:     Array<{ name:string, qty:number, price:number }>
   *   invoiceNo: string   發票號碼
   *   note:      string   備註
   *   rawText:   string   AI 原始回傳（除錯用）
   * }
   */


  // ══════════════════════════════════════════
  // ⑤ 核心辨識函式
  // ══════════════════════════════════════════

  /**
   * AI.scanImage(file)
   * 接收圖片 File 物件，送 AI 辨識，回傳解析後的 InvoiceResult
   * @param {File} file
   * @returns {Promise<InvoiceResult|null>}
   */
  AI.scanImage = function(file){
    console.log('[ai-scanner] scanImage() — 架構預建，尚未實作');

    if(!AI_CONFIG.endpoint && AI_CONFIG.provider !== 'claude'){
      console.warn('[ai-scanner] endpoint 未設定，跳過辨識');
      updateInvoiceScreen('⚠️ AI 服務端點尚未設定<br>請先在設定頁填入 API 資訊');
      return Promise.resolve(null);
    }

    if(STATE.isScanning){
      console.warn('[ai-scanner] 辨識進行中，跳過重複請求');
      return Promise.resolve(null);
    }

    STATE.isScanning = true;
    updateInvoiceScreen('🔍 辨識中，請稍候…');

    // ── 壓縮圖片 ──
    return compressImage(file, AI_CONFIG.maxImgWidth, AI_CONFIG.imgQuality)
      .then(function(blob){ return fileToBase64(blob); })
      .then(function(base64){

        console.log('[ai-scanner] 圖片 base64 取得，長度=', base64.length,
                    '，準備送 AI（' + AI_CONFIG.provider + '）');

        /* ── 待實作區塊（方案 A：直接打 Claude API）──────────────────
        if(AI_CONFIG.provider === 'claude'){
          return fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type':         'application/json',
              'x-api-key':            AI_CONFIG.apiKey,
              'anthropic-version':    '2023-06-01'
            },
            body: JSON.stringify({
              model:      AI_CONFIG.model,
              max_tokens: AI_CONFIG.maxTokens,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64',
                      media_type: file.type || 'image/jpeg', data: base64 } },
                  { type: 'text', text: buildInvoicePrompt() }
                ]
              }]
            })
          })
          .then(function(res){ return res.json(); })
          .then(function(data){
            var raw = data.content && data.content[0] && data.content[0].text || '';
            return parseInvoiceJSON(raw);
          });
        }
        ─────────────────────────────────────────────────────────────── */

        /* ── 待實作區塊（方案 B：GAS 中轉）─────────────────────────────
        if(AI_CONFIG.provider === 'gas'){
          return fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action:    'scanInvoice',
              imageData: base64,
              mimeType:  file.type || 'image/jpeg'
            })
          })
          .then(function(res){ return res.json(); })
          .then(function(data){
            if(!data.ok) throw new Error(data.error || 'GAS 辨識失敗');
            return parseInvoiceJSON(data.rawText);
          });
        }
        ─────────────────────────────────────────────────────────────── */

        // skeleton：回傳假資料供 UI 測試
        return _mockInvoiceResult();
      })
      .then(function(result){
        STATE.isScanning = false;
        STATE.lastResult = result;
        STATE.scanCount++;
        if(result){
          _fillAddScreen(result);
          updateInvoiceScreen(
            '✅ 辨識完成！<br>' +
            '<strong>' + (result.merchant || '？') + '</strong><br>' +
            '金額：$' + (result.total || 0) + '<br>' +
            '<small style="color:var(--t2)">' + (result.date || '') + '</small>'
          );
        }
        return result;
      })
      .catch(function(err){
        STATE.isScanning = false;
        STATE.lastError  = err.message || '未知錯誤';
        console.error('[ai-scanner] scanImage 失敗', err);
        updateInvoiceScreen(
          '❌ 辨識失敗<br><small>' + STATE.lastError + '</small><br>' +
          '<button onclick="go(\'s-add\')" ' +
          'style="margin-top:12px;padding:8px 20px;background:var(--gold);' +
          'color:#1A0F00;border:none;border-radius:8px;cursor:pointer">手動記帳</button>'
        );
        return null;
      });
  };


  // ══════════════════════════════════════════
  // ⑥ JSON 解析（AI 回傳 → InvoiceResult）
  // ══════════════════════════════════════════

  /**
   * AI.parseInvoiceJSON(rawText)
   * 容錯解析 AI 回傳的 JSON 字串
   * @param {string} rawText
   * @returns {InvoiceResult|null}
   */
  AI.parseInvoiceJSON = function(rawText){
    console.log('[ai-scanner] parseInvoiceJSON() rawText=', rawText);

    /* ── 待實作區塊 ──────────────────────────
    try {
      // 去除可能的 markdown 包裹
      var clean = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      var obj = JSON.parse(clean);

      if(obj.error){
        console.warn('[ai-scanner] AI 回傳錯誤:', obj.error);
        return null;
      }

      return {
        date:      obj.date      || new Date().toISOString().split('T')[0],
        merchant:  obj.merchant  || '未知商家',
        total:     parseFloat(obj.total) || 0,
        items:     Array.isArray(obj.items) ? obj.items : [],
        invoiceNo: obj.invoiceNo || '',
        note:      obj.note      || '',
        rawText:   rawText
      };
    } catch(e){
      console.error('[ai-scanner] JSON 解析失敗', e, rawText);
      return null;
    }
    ─────────────────────────────────────────── */

    return null;
  };

  // 模組內部使用（不對外）
  var parseInvoiceJSON = AI.parseInvoiceJSON;


  // ══════════════════════════════════════════
  // ⑦ 辨識結果 → 自動填入記帳畫面
  // ══════════════════════════════════════════

  /**
   * _fillAddScreen(result)
   * 將 InvoiceResult 填入 s-add 畫面並切換過去
   * @param {InvoiceResult} result
   *
   * ── 待實作區塊 ──────────────────────────
   * 目前僅 console.log，未來應：
   * 1. 切換到 s-add 畫面
   * 2. 設定 ADD_TYPE = 'e'（消費 = 支出）
   * 3. 在計算機顯示欄填入 result.total
   * 4. 設定日期欄 = result.date
   * 5. 設定備註欄 = result.merchant + result.note
   * 6. 嘗試自動選中最接近的分類
   */
  function _fillAddScreen(result){
    console.log('[ai-scanner] _fillAddScreen() result=', result);

    /* ── 待實作區塊 ──────────────────────────
    if(typeof go === 'function') go('s-add');

    // 切換為支出
    if(typeof swType === 'function') swType('e');

    // 填入金額（覆寫 CALC_VAL）
    if(result.total > 0){
      CALC_VAL = String(result.total);
      var disp = document.getElementById('calc-disp');
      if(disp) disp.textContent = '$' + result.total;
    }

    // 填入日期
    var dateEl = document.getElementById('entry-date');
    if(dateEl && result.date) dateEl.value = result.date;

    // 填入備註
    var noteEl = document.getElementById('entry-note');
    if(noteEl){
      noteEl.value = [result.merchant, result.invoiceNo, result.note]
        .filter(Boolean).join(' ');
    }

    // 嘗試智慧選類別（依 merchant 關鍵字）
    _autoSelectCategory(result.merchant, result.items);
    ─────────────────────────────────────────── */
  }

  /**
   * _autoSelectCategory(merchant, items)
   * 依商家名稱或品項關鍵字，自動點選最接近的分類按鈕
   *
   * ── 關鍵字對照（待擴充）─────────────────
   */
  function _autoSelectCategory(merchant, items){
    console.log('[ai-scanner] _autoSelectCategory() merchant=', merchant);

    /* ── 待實作區塊 ──────────────────────────
    var name = (merchant || '').toLowerCase();
    var RULES = [
      { keywords: ['全家','7-11','全聯','萊爾富','OK超商'], sub: '購物' },
      { keywords: ['麥當勞','肯德基','摩斯','subway','星巴克','路易莎'], sub: '午餐' },
      { keywords: ['超市','頂好','家樂福','大潤發'], sub: '購物' },
      { keywords: ['藥局','藥妝','屈臣氏','康是美'], sub: '醫療' },
      { keywords: ['加油','中油','台塑'], sub: 'Gogoro' }
    ];
    var matched = null;
    RULES.forEach(function(rule){
      if(!matched){
        rule.keywords.forEach(function(kw){
          if(name.indexOf(kw.toLowerCase()) >= 0) matched = rule.sub;
        });
      }
    });
    if(matched && typeof pickCatByName === 'function'){
      pickCatByName(matched); // app-core.js 需暴露此函式
    }
    ─────────────────────────────────────────── */
  }


  // ══════════════════════════════════════════
  // ⑧ 模擬資料（skeleton 測試用，上線前移除）
  // ══════════════════════════════════════════

  function _mockInvoiceResult(){
    console.log('[ai-scanner] _mockInvoiceResult() — 僅供 skeleton 測試');
    return {
      date:      new Date().toISOString().split('T')[0],
      merchant:  '全家便利商店（skeleton 測試）',
      total:     99,
      items:     [{ name: '測試品項', qty: 1, price: 99 }],
      invoiceNo: 'AB-12345678',
      note:      'skeleton 模式，非真實辨識',
      rawText:   '{mock}'
    };
  }


  // ══════════════════════════════════════════
  // ⑨ 發票畫面 UI 事件綁定
  // ══════════════════════════════════════════

  /**
   * AI.bindInvoiceScreen()
   * 在 s-invoice 畫面掛載「選擇圖片」與「相機拍照」按鈕
   * 由 init() 呼叫，或可在 HTML 中手動呼叫
   */
  AI.bindInvoiceScreen = function(){
    var wrap = document.querySelector('#s-invoice .scroll > div');
    if(!wrap) return;

    // 保留原本說明文字，在下方追加互動按鈕
    var btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'margin-top:20px;display:flex;flex-direction:column;gap:10px;align-items:center';
    btnGroup.innerHTML =
      '<button id="ai-upload-btn" style="padding:11px 28px;background:var(--gold);' +
      'color:#1A0F00;border:none;border-radius:10px;font-size:14px;font-weight:900;cursor:pointer">' +
      '📁 選擇截圖上傳</button>' +
      '<button id="ai-camera-btn" style="padding:11px 28px;background:var(--s2);' +
      'border:1px solid var(--b2);color:var(--tx);border-radius:10px;font-size:14px;cursor:pointer">' +
      '📷 相機拍照辨識</button>' +
      '<input type="file" id="ai-file-input" accept="image/*" style="display:none">' +
      '<input type="file" id="ai-camera-input" accept="image/*" capture="environment" style="display:none">';
    wrap.appendChild(btnGroup);

    // 綁定事件
    var fileInput   = document.getElementById('ai-file-input');
    var cameraInput = document.getElementById('ai-camera-input');

    document.getElementById('ai-upload-btn').addEventListener('click', function(){
      if(fileInput) fileInput.click();
    });
    document.getElementById('ai-camera-btn').addEventListener('click', function(){
      if(cameraInput) cameraInput.click();
    });

    function handleFile(e){
      var file = e.target.files && e.target.files[0];
      if(!file) return;
      e.target.value = ''; // 清除，允許重複選同一檔案
      AI.scanImage(file);
    }

    if(fileInput)   fileInput.addEventListener('change',   handleFile);
    if(cameraInput) cameraInput.addEventListener('change', handleFile);

    console.log('[ai-scanner] bindInvoiceScreen() 按鈕已掛載');
  };


  // ══════════════════════════════════════════
  // ⑩ 設定接口（由設定頁 UI 呼叫）
  // ══════════════════════════════════════════

  /**
   * AI.configure(options)
   * 動態更新 AI 設定，並持久化到 localStorage
   *
   * 使用範例：
   *   AI_SCANNER.configure({
   *     provider: 'claude',
   *     apiKey:   'sk-ant-...',
   *     model:    'claude-opus-4-6'
   *   });
   */
  AI.configure = function(options){
    if(!options) return;
    Object.keys(options).forEach(function(k){
      if(AI_CONFIG.hasOwnProperty(k)) AI_CONFIG[k] = options[k];
    });
    try {
      localStorage.setItem('cg_ai', JSON.stringify({
        endpoint: AI_CONFIG.endpoint,
        provider: AI_CONFIG.provider,
        model:    AI_CONFIG.model
        // 注意：apiKey 不存 localStorage（資安考量）
      }));
    } catch(e){}
    console.log('[ai-scanner] configure() 已更新設定', AI_CONFIG);
    _refreshReadyState();
  };

  AI.restoreConfig = function(){
    try {
      var saved = JSON.parse(localStorage.getItem('cg_ai') || '{}');
      if(saved.endpoint) AI_CONFIG.endpoint = saved.endpoint;
      if(saved.provider) AI_CONFIG.provider = saved.provider;
      if(saved.model)    AI_CONFIG.model    = saved.model;
    } catch(e){}
  };

  function _refreshReadyState(){
    var ready = !!(AI_CONFIG.endpoint || AI_CONFIG.apiKey);
    STATE.ready = ready;
    if(ready){
      updateSettingsBadge('已設定', 'ok', '點擊發票按鈕開始辨識');
    } else {
      updateSettingsBadge('截圖辨識', 'bl', '待啟用');
    }
  }


  // ══════════════════════════════════════════
  // ⑪ 初始化（模組自動執行）
  // ══════════════════════════════════════════

  function init(){
    AI.restoreConfig();
    _refreshReadyState();
    AI.bindInvoiceScreen();

    // 更新發票畫面說明
    updateInvoiceScreen(
      STATE.ready
        ? '請選擇截圖或拍照，AI 將自動辨識並填入記帳'
        : '需連結 AI 服務後啟用<br>目前請使用手動記帳'
    );

    console.log('[ai-scanner] 模組初始化完成（skeleton 模式，ready=' + STATE.ready + '）');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
