// Code.gs

// === Trip Configuration ===
// Edit this section to customize for your trip
var CONFIG = {
  // App title displayed in browser tab
  pageTitle: 'Honeymoon Journey',

  // Users who can edit (add expenses, modify itinerary)
  authorizedEditors: [
    'ab889721@gmail.com',
    'tingyyyung@gmail.com'
  ],

  // Google Sheet tab names (must match your spreadsheet)
  sheetNames: {
    itinerary: '行程',
    expenses: '記帳',
    attractions: '景點介紹',
    navigation: '導航'
  }
};

// Legacy alias for backward compatibility
var AUTHORIZED_EDITORS = CONFIG.authorizedEditors;

// 檢查目前使用者是否有編輯權限
function isAuthorizedEditor() {
  try {
    var email = Session.getActiveUser().getEmail();
    return AUTHORIZED_EDITORS.indexOf(email) !== -1;
  } catch (e) {
    return false;
  }
}

// 給前端呼叫：取得目前使用者的權限狀態
function getUserPermission() {
  try {
    var email = Session.getActiveUser().getEmail();
    var canEdit = AUTHORIZED_EDITORS.indexOf(email) !== -1;
    return {
      email: email,
      canEdit: canEdit
    };
  } catch (e) {
    return {
      email: null,
      canEdit: false
    };
  }
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.pageTitle)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- 新增：將 Google Sheet 富文字轉為 HTML 的工具函式 ---
function convertRichTextToHtml(richTextValue) {
  // 如果是空的，回傳空字串
  if (!richTextValue) return "";
  
  var runs = richTextValue.getRuns();
  var html = "";
  
  runs.forEach(function(run) {
    var text = run.getText();
    var url = run.getLinkUrl();
    
    // 處理特殊字元與換行 (將 \n 轉為 <br>)
    // 簡單的 HTML 跳脫處理，避免文字破壞排版
    text = text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/\n/g, '<br>');

    if (url) {
      // 如果這段文字有連結，包上 <a> 標籤
      // 加入 style 讓連結呈現金色並有底線
      html += `<a href="${url}" target="_blank" style="color: #c5a059; text-decoration: underline; font-weight: bold;">${text}</a>`;
    } else {
      html += text;
    }
  });
  
  return html;
}

// 取得行程資料
function getItineraryData() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.itinerary);
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    
    // 讀取 A~I (共9欄)
    var data = sheet.getRange(2, 1, lastRow - 1, 9).getRichTextValues();

    return data.map(function(row, index) {
      return {
        rowNumber: index + 2, // 關鍵：記下行號以便修改
        day: row[0].getText(),       // Day 只要純文字
        date: row[1].getText(),      // 日期 只要純文字
        weekday: row[2].getText(),   // 星期 只要純文字
        // 下面這些欄位可能包含連結，我們轉成 HTML
        city: row[3].getText(),      // 城市通常不需要超連結顯示在標題上，取純文字即可，或者你要轉 HTML 也可以
        content: convertRichTextToHtml(row[4]),   // 主要內容 (轉 HTML)
        transport: convertRichTextToHtml(row[5]), // 交通 (轉 HTML)
        ticket: convertRichTextToHtml(row[6]),    // 票務 (轉 HTML)
        link: row[7].getText(),       // 這是原本的「購票連結」欄位，通常是純網址，維持原樣
        hotel: convertRichTextToHtml(row[8]), 
      };
    });
  } catch (e) {
    Logger.log(e);
    return [];
  }
}

// 修改行程 (新增的功能)
function editItinerary(form) {
  try {
    // 權限檢查
    if (!isAuthorizedEditor()) {
      return { success: false, message: "您沒有編輯權限" };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.itinerary);
    var row = form.rowNumber;
    
    // 安全檢查：確保行號有效
    if (row < 2) throw new Error("無效的行號");

    // 更新 D~I 欄位 (City, Content, Transport, Ticket, Link)
    // 我們故意不更新 A, B, C (Day, Date, Weekday) 以保持行程架構
    // getRange(row, column, numRows, numColumns) -> D欄是第4欄
    sheet.getRange(row, 4, 1, 5).setValues([[
      form.city,
      form.content,
      form.transport,
      form.ticket,
      form.link,
    ]]);
    
    return { success: true, message: "行程已更新" };
  } catch (e) {
    return { success: false, message: "更新失敗: " + e.toString() };
  }
}

// 取得記帳資料
function getExpenseData() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.expenses);
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var range = sheet.getRange(2, 1, lastRow - 1, 5);
    var data = range.getValues();
    
    var formattedData = data.map(function(row, index) {
      // 日期物件轉字串，避免傳輸錯誤
      var timeStr = "";
      if (row[0] instanceof Date) {
        timeStr = row[0].toISOString(); 
      } else {
        timeStr = String(row[0]); 
      }

      return {
        rowNumber: index + 2, 
        timestamp: timeStr,
        item: row[1],
        amount: row[2],
        currency: row[3],
        category: row[4]
      };
    });
    return formattedData.reverse();
  } catch (e) {
    return { error: e.toString() }; 
  }
}

// 儲存記帳
function saveExpense(formData) {
  try {
    // 權限檢查
    if (!isAuthorizedEditor()) {
      return { success: false, message: "您沒有編輯權限" };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.expenses);
    var timestamp = new Date();
    sheet.appendRow([
      timestamp,
      formData.item,
      formData.amount,
      formData.currency,
      formData.category
    ]);
    return { success: true, message: "記帳成功！" };
  } catch (e) {
    return { success: false, message: "錯誤: " + e.toString() };
  }
}

// 刪除記帳
function deleteExpense(rowNumber) {
  try {
    // 權限檢查
    if (!isAuthorizedEditor()) {
      return { success: false, message: "您沒有編輯權限" };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.expenses);
    if (rowNumber < 2) throw new Error("無效的行號");
    sheet.deleteRow(rowNumber);
    return { success: true, message: "已刪除" };
  } catch (e) {
    return { success: false, message: "刪除失敗: " + e.toString() };
  }
}

// 修改記帳
function editExpense(data) {
  try {
    // 權限檢查
    if (!isAuthorizedEditor()) {
      return { success: false, message: "您沒有編輯權限" };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.expenses);
    var row = data.rowNumber;
    if (row < 2) throw new Error("無效的行號");

    sheet.getRange(row, 2, 1, 4).setValues([[
      data.item,
      data.amount,
      data.currency,
      data.category
    ]]);
    return { success: true, message: "修改成功" };
  } catch (e) {
    return { success: false, message: "修改失敗: " + e.toString() };
  }
}

// 取得景點介紹資料
function getAttractionDetails() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.attractions);
    if (!sheet) return {};
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    // 讀取 A~C 欄 (Day, 標題, 內容)
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

    // 整理成以 Day 為 key 的物件
    var result = {};
    data.forEach(function(row) {
      var day = row[0];      // Day 1, Day 2, ...
      var title = row[1];    // 標題
      var content = row[2];  // 內容

      if (!day || !title) return;

      result[day] = {
        title: title,
        content: content || ""
      };
    });

    return result;
  } catch (e) {
    Logger.log(e);
    return {};
  }
}

// 取得導航資料 (景點座標)
function getNavigationData() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.navigation);
    if (!sheet) return {};
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    // 讀取 A~D 欄 (Day, 景點名稱, 緯度, 經度)
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

    // 整理成以 Day 為 key 的物件
    var result = {};
    data.forEach(function(row) {
      var day = row[0];        // Day 1, Day 2, ...
      var name = row[1];       // 景點名稱
      var lat = parseFloat(row[2]);  // 緯度
      var lng = parseFloat(row[3]);  // 經度

      if (!day || !name || isNaN(lat) || isNaN(lng)) return;

      if (!result[day]) {
        result[day] = {
          attractions: []
        };
      }

      result[day].attractions.push({
        name: name,
        lat: lat,
        lng: lng
      });
    });

    // 計算每天的中心點和建議縮放級別
    Object.keys(result).forEach(function(day) {
      var attrs = result[day].attractions;
      if (attrs.length === 0) return;

      // 計算中心點 (所有景點的平均)
      var sumLat = 0, sumLng = 0;
      attrs.forEach(function(a) {
        sumLat += a.lat;
        sumLng += a.lng;
      });
      result[day].center = [sumLat / attrs.length, sumLng / attrs.length];

      // 根據景點數量和分布決定縮放級別
      if (attrs.length === 1) {
        result[day].zoom = 15;
      } else {
        // 計算景點間的最大距離來決定縮放
        var maxDist = 0;
        attrs.forEach(function(a1) {
          attrs.forEach(function(a2) {
            var dist = Math.sqrt(Math.pow(a1.lat - a2.lat, 2) + Math.pow(a1.lng - a2.lng, 2));
            if (dist > maxDist) maxDist = dist;
          });
        });
        // 根據距離設定縮放級別
        if (maxDist > 0.5) result[day].zoom = 11;
        else if (maxDist > 0.2) result[day].zoom = 12;
        else if (maxDist > 0.1) result[day].zoom = 13;
        else if (maxDist > 0.05) result[day].zoom = 14;
        else result[day].zoom = 15;
      }
    });

    return result;
  } catch (e) {
    Logger.log(e);
    return {};
  }
}

// ============================================
// AI 功能 (使用 Google Gemini API)
// ============================================

// 設定 API Key (執行一次即可)
// 前往 https://aistudio.google.com/apikey 取得 API Key
function setupGeminiApiKey() {
  var apiKey = Browser.inputBox('請輸入 Gemini API Key:');
  if (apiKey && apiKey !== 'cancel') {
    PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', apiKey);
    Browser.msgBox('API Key 已儲存！');
  }
}

// AI 景點故事生成
function generateAttractionStory(dayKey, city, itineraryContent) {
  // 權限檢查
  if (!isAuthorizedEditor()) {
    return { success: false, message: '您沒有權限使用此功能' };
  }

  // 取得 API Key
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { success: false, message: 'Gemini API Key 未設定，請聯繫管理員' };
  }

  // 建立 prompt
  var prompt = '你是一位文學旅遊作家。請根據以下行程資訊，生成一篇優雅的文學風格景點介紹（300-500字）。\n\n' +
    '要求：\n' +
    '- 使用第二人稱「你」\n' +
    '- 融入歷史典故和文化背景\n' +
    '- 語氣優雅、富有詩意\n' +
    '- 讓讀者感受到旅行的浪漫與期待\n\n' +
    '行程資訊：\n' +
    'Day: ' + dayKey + '\n' +
    '城市: ' + city + '\n' +
    '行程內容: ' + itineraryContent;

  try {
    var response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024
          }
        }),
        muteHttpExceptions: true
      }
    );

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 && result.candidates && result.candidates[0]) {
      var generatedText = result.candidates[0].content.parts[0].text;

      // 儲存到 Google Sheet
      saveAttractionStory(dayKey, city, generatedText);

      return { success: true, content: generatedText };
    } else {
      var errorMsg = result.error ? result.error.message : '生成失敗，請稍後再試';
      return { success: false, message: errorMsg };
    }
  } catch (e) {
    Logger.log('AI 生成錯誤: ' + e.toString());
    return { success: false, message: '生成失敗: ' + e.toString() };
  }
}

// 儲存 AI 生成的故事到 Sheet
function saveAttractionStory(dayKey, title, content) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.attractions);
    if (!sheet) {
      Logger.log('找不到景點介紹 Sheet');
      return;
    }

    // 檢查是否已存在該 Day 的資料
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === dayKey) {
        // 更新現有行
        sheet.getRange(i + 1, 2, 1, 2).setValues([[title, content]]);
        Logger.log('已更新 ' + dayKey + ' 的景點故事');
        return;
      }
    }

    // 新增行
    sheet.appendRow([dayKey, title, content]);
    Logger.log('已新增 ' + dayKey + ' 的景點故事');
  } catch (e) {
    Logger.log('儲存故事錯誤: ' + e.toString());
  }
}

// AI 行程建議
function suggestItinerary(city, date, preferences) {
  // 權限檢查
  if (!isAuthorizedEditor()) {
    return { success: false, message: '您沒有權限使用此功能' };
  }

  // 取得 API Key
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { success: false, message: 'Gemini API Key 未設定，請聯繫管理員' };
  }

  var prompt = '你是一位專業的旅遊規劃師。請為以下條件提供一日行程建議：\n\n' +
    '城市: ' + city + '\n' +
    '日期: ' + (date || '不限') + '\n' +
    '偏好: ' + (preferences || '一般觀光、美食、拍照打卡') + '\n\n' +
    '請提供：\n' +
    '1. 3-5 個推薦景點（含簡短介紹）\n' +
    '2. 1-2 間推薦餐廳\n' +
    '3. 建議路線順序\n' +
    '4. 交通建議\n\n' +
    '請用繁體中文回覆，格式清晰易讀。';

  try {
    var response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        }),
        muteHttpExceptions: true
      }
    );

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 && result.candidates && result.candidates[0]) {
      var suggestion = result.candidates[0].content.parts[0].text;
      return { success: true, content: suggestion };
    } else {
      var errorMsg = result.error ? result.error.message : '生成失敗，請稍後再試';
      return { success: false, message: errorMsg };
    }
  } catch (e) {
    Logger.log('AI 建議錯誤: ' + e.toString());
    return { success: false, message: '生成失敗: ' + e.toString() };
  }
}