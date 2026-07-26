// Code.gs

// === Trip Configuration ===
// Edit this section to customize for your trip
var CONFIG = {
  // App title displayed in browser tab
  pageTitle: 'Vic & Dora in Europe',

  // Gemini models used by AI features
  geminiTextModel: 'gemini-3.1-flash-lite',
  geminiSearchModel: 'gemini-2.5-flash-lite',

  // Google Sheet tab names (must match your spreadsheet)
  sheetNames: {
    itinerary: '行程',
    expenses: '記帳',
    todos: '待辦',
    tickets: '票券',
    attractions: '景點規劃',
    navigation: '導航',
    food: '美食推薦',
    journey: '旅程介紹',
    chat: 'AI秘書對話'
  }
};

function getGeminiGenerateContentUrl(apiKey, model) {
  return 'https://generativelanguage.googleapis.com/v1beta/models/' +
    (model || CONFIG.geminiTextModel) +
    ':generateContent?key=' +
    encodeURIComponent(apiKey);
}

// === Script Properties Setup ===
// Configure in GAS Editor: Project Settings > Script Properties
//
// Required properties:
//   AUTHORIZED_EDITORS - Comma-separated emails (e.g., "user1@gmail.com,user2@gmail.com")
//   GEMINI_API_KEY     - Your Gemini API key from https://aistudio.google.com/apikey

// Get authorized editors from Script Properties
function getAuthorizedEditors() {
  var editors = PropertiesService.getScriptProperties().getProperty('AUTHORIZED_EDITORS');
  if (!editors) return [];
  return editors.split(',').map(function(e) { return e.trim(); });
}

// 檢查目前使用者是否有編輯權限
function isAuthorizedEditor() {
  try {
    var email = Session.getActiveUser().getEmail();
    var authorizedEditors = getAuthorizedEditors();
    return authorizedEditors.indexOf(email) !== -1;
  } catch (e) {
    return false;
  }
}

// 給前端呼叫：取得目前使用者的權限狀態
function getUserPermission() {
  try {
    var email = Session.getActiveUser().getEmail();
    var authorizedEditors = getAuthorizedEditors();
    var canEdit = authorizedEditors.indexOf(email) !== -1;
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

    var range = sheet.getRange(2, 1, lastRow - 1, 9);
    // 用 getDisplayValues 取得顯示值（處理日期格式）
    var displayValues = range.getDisplayValues();
    // 用 getRichTextValues 取得含超連結的內容
    var richTextValues = range.getRichTextValues();

    return displayValues.map(function(row, index) {
      var richRow = richTextValues[index];
      return {
        rowNumber: index + 2,
        day: row[0],                              // Day (顯示值)
        date: row[1],                             // 日期 (顯示值，處理日期格式)
        weekday: row[2],                          // 星期 (顯示值)
        city: row[3],                             // 城市 (顯示值)
        content: convertRichTextToHtml(richRow[4]),   // 主要內容 (轉 HTML)
        transport: convertRichTextToHtml(richRow[5]), // 交通 (轉 HTML)
        ticket: convertRichTextToHtml(richRow[6]),    // 票務 (轉 HTML)
        link: row[7],                             // 購票連結 (顯示值)
        hotel: convertRichTextToHtml(richRow[8]),     // 住宿 (轉 HTML)
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

// 取得票券資料
function getTicketData() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.tickets);
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var range = sheet.getRange(2, 1, lastRow - 1, 8);
    var displayValues = range.getDisplayValues();

    return displayValues.map(function(row, index) {
      return {
        rowNumber: index + 2,
        day: row[0],
        date: row[1],
        city: row[2],
        item: row[3],
        type: row[4],
        provider: row[5],
        fileUrl: row[6],
        notes: row[7]
      };
    }).filter(function(ticket) {
      return ticket.day && ticket.item && ticket.fileUrl;
    });
  } catch (e) {
    Logger.log(e);
    return [];
  }
}

// 取得待辦事項
function getTodoData() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.todos);
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var range = sheet.getRange(1, 1, lastRow, 5);
    var values = range.getValues();
    var displayValues = range.getDisplayValues();
    var richTextValues = range.getRichTextValues();
    var currentSection = '未分類';
    var result = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var displayRow = displayValues[i];
      var richRow = richTextValues[i];
      var section = String(displayRow[0] || '').trim();
      var item = String(displayRow[1] || '').trim();

      if (section === '【重要連結彙整】') break;

      if (section && !item) {
        currentSection = section;
        continue;
      }

      if (!item) continue;

      result.push({
        rowNumber: i + 1,
        section: currentSection,
        item: convertRichTextToHtml(richRow[1]),
        detail: convertRichTextToHtml(richRow[2]),
        deadline: convertRichTextToHtml(richRow[3]),
        done: row[4] === true || String(displayRow[4]).toUpperCase() === 'TRUE'
      });
    }

    return result;
  } catch (e) {
    Logger.log(e);
    return [];
  }
}

// 更新待辦事項狀態
function updateTodoStatus(rowNumber, done) {
  try {
    if (!isAuthorizedEditor()) {
      return { success: false, message: "您沒有編輯權限" };
    }

    var row = Number(rowNumber);
    if (!row || row < 2) throw new Error("無效的行號");

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.todos);
    if (!sheet) throw new Error("找不到待辦 Sheet");

    var todos = getTodoData();
    var exists = todos.some(function(todo) {
      return todo.rowNumber === row;
    });
    if (!exists) throw new Error("找不到待辦項目");

    sheet.getRange(row, 5).setValue(done === true);
    return { success: true, message: "待辦狀態已更新" };
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

// 取得導航資料 (Google Maps 景點查詢)
function getNavigationData() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.navigation);
    if (!sheet) return {};
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    // 讀取 A~C 欄 (Day, 景點名稱, Google Maps 查詢)
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

    // 整理成以 Day 為 key 的物件
    var result = {};
    data.forEach(function(row) {
      var day = row[0];    // Day 1, Day 2, ...
      var name = row[1];   // 顯示名稱
      var query = row[2];  // Google Maps 景點名稱、地址或搜尋字串

      if (!day || !name || !query) return;

      if (!result[day]) {
        result[day] = {
          attractions: []
        };
      }

      result[day].attractions.push({
        name: name,
        query: query
      });
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
  var prompt = '你是一位專業的蜜月旅遊規劃師。請根據以下行程資訊，生成一份完整的當日景點規劃。\n\n' +
    '重要：請使用純文字格式，不要使用 markdown 語法（如 **粗體**、# 標題等）。\n\n' +
    '請按以下格式輸出：\n\n' +
    '【景點故事】\n' +
    '用優雅的文學風格介紹當日景點，約200-300字。使用第二人稱「你」，融入歷史典故和文化背景，讓讀者感受旅行的浪漫。\n\n' +
    '【交通規劃】\n' +
    '根據行程內容，規劃合理的時間與交通方式，格式如下：\n' +
    '• HH:MM 地點A → 交通方式 → 地點B（約X分鐘）\n' +
    '• HH:MM 地點B → 交通方式 → 地點C（約X分鐘）\n\n' +
    '【小提醒】\n' +
    '2-3點實用建議，如：票券購買、最佳參觀時間、注意事項等\n\n' +
    '行程資訊：\n' +
    'Day: ' + dayKey + '\n' +
    '城市: ' + city + '\n' +
    '行程內容: ' + itineraryContent;

  try {
    var response = UrlFetchApp.fetch(
      getGeminiGenerateContentUrl(apiKey),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192
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

// AI 美食推薦
function generateFoodRecommendations(dayKey, city, itineraryContent, priceLevel) {
  // 權限檢查
  if (!isAuthorizedEditor()) {
    return { success: false, message: '您沒有權限使用此功能' };
  }

  // 取得 API Key
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { success: false, message: 'Gemini API Key 未設定，請聯繫管理員' };
  }

  // 價位描述
  var priceLevelDesc = {
    'budget': '平價美食（每人約 €10-20 或當地等值貨幣）',
    'mid': '中價位餐廳（每人約 €25-50 或當地等值貨幣）',
    'high': '高級餐廳（每人約 €60+ 或當地等值貨幣，適合特別的蜜月晚餐）'
  };

  var priceDesc = priceLevelDesc[priceLevel] || priceLevelDesc['mid'];

  // 建立 prompt
  var prompt = '你是一位專業的蜜月旅遊美食顧問。請根據以下行程資訊，推薦當日的用餐選擇。\n\n' +
    '重要規則：\n' +
    '1. 請使用純文字格式，不要使用 markdown 語法（如 **粗體**、# 標題等）\n' +
    '2. 每間餐廳名稱後面請附上 Google Maps 搜尋連結，格式為：\n' +
    '   店名 [地圖: https://www.google.com/maps/search/店名+城市名]\n\n' +
    '價位需求：' + priceDesc + '\n\n' +
    '請按以下格式輸出：\n\n' +
    '【早餐推薦】\n' +
    '推薦 1-2 間適合的早餐地點，包含店名（附地圖連結）、特色餐點、大約價位\n\n' +
    '【午餐推薦】\n' +
    '推薦 2-3 間餐廳，需考慮與當日景點的距離，包含店名（附地圖連結）、招牌菜、大約價位、為什麼推薦\n\n' +
    '【晚餐推薦】\n' +
    '推薦 2-3 間餐廳，考慮蜜月氛圍，包含店名（附地圖連結）、特色、大約價位、訂位建議\n\n' +
    '【當地必吃】\n' +
    '2-3 樣當地特色小吃或甜點，適合當作下午茶或點心，如有知名店家也請附上地圖連結\n\n' +
    '【美食小提醒】\n' +
    '1-2 點當地用餐文化或注意事項\n\n' +
    '行程資訊：\n' +
    'Day: ' + dayKey + '\n' +
    '城市: ' + city + '\n' +
    '當日行程: ' + itineraryContent;

  try {
    var response = UrlFetchApp.fetch(
      getGeminiGenerateContentUrl(apiKey),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192
          }
        }),
        muteHttpExceptions: true
      }
    );

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 && result.candidates && result.candidates[0]) {
      var generatedText = result.candidates[0].content.parts[0].text;

      // 儲存到 Google Sheet
      saveFoodRecommendation(dayKey, city, priceLevel, generatedText);

      return { success: true, content: generatedText };
    } else {
      var errorMsg = result.error ? result.error.message : '生成失敗，請稍後再試';
      return { success: false, message: errorMsg };
    }
  } catch (e) {
    Logger.log('AI 美食推薦錯誤: ' + e.toString());
    return { success: false, message: '生成失敗: ' + e.toString() };
  }
}

// 儲存美食推薦到 Sheet
function saveFoodRecommendation(dayKey, city, priceLevel, content) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.food);
    if (!sheet) {
      // 如果 Sheet 不存在，建立一個新的
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONFIG.sheetNames.food);
      sheet.appendRow(['Day', '城市', '價位', '內容', '更新時間']);
      Logger.log('已建立美食推薦 Sheet');
    }

    // 檢查是否已存在該 Day + 價位 的資料
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === dayKey && data[i][2] === priceLevel) {
        // 更新現有行
        sheet.getRange(i + 1, 2, 1, 4).setValues([[city, priceLevel, content, new Date()]]);
        Logger.log('已更新 ' + dayKey + ' (' + priceLevel + ') 的美食推薦');
        return;
      }
    }

    // 新增行
    sheet.appendRow([dayKey, city, priceLevel, content, new Date()]);
    Logger.log('已新增 ' + dayKey + ' (' + priceLevel + ') 的美食推薦');
  } catch (e) {
    Logger.log('儲存美食推薦錯誤: ' + e.toString());
  }
}

// 取得已儲存的美食推薦
function getFoodRecommendations() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.food);
    if (!sheet) return {};
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    // 讀取 A~D 欄 (Day, 城市, 價位, 內容)
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

    // 整理成以 Day 為 key，價位為 sub-key 的物件
    var result = {};
    data.forEach(function(row) {
      var day = row[0];
      var priceLevel = row[2];
      var content = row[3];

      if (!day || !priceLevel || !content) return;

      if (!result[day]) {
        result[day] = {};
      }
      result[day][priceLevel] = content;
    });

    return result;
  } catch (e) {
    Logger.log(e);
    return {};
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
      getGeminiGenerateContentUrl(apiKey),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
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

// ============================================
// 旅程介紹功能
// ============================================

// 取得已儲存的旅程介紹
function getJourneyContent() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.journey);
    if (!sheet) return null;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;

    // 讀取所有資料
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

    var result = {
      intro: '',
      cities: {},
      closing: ''
    };

    data.forEach(function(row) {
      var type = row[0]; // intro, city:城市名, closing
      var content = row[1];

      if (type === 'intro') {
        result.intro = content;
      } else if (type === 'closing') {
        result.closing = content;
      } else if (type.startsWith('city:')) {
        var cityName = type.replace('city:', '');
        result.cities[cityName] = content;
      }
    });

    return result;
  } catch (e) {
    Logger.log('取得旅程介紹錯誤: ' + e.toString());
    return null;
  }
}

// AI 生成旅程介紹
function generateJourneyIntro(itinerary) {
  // 權限檢查
  if (!isAuthorizedEditor()) {
    return { success: false, message: '您沒有權限使用此功能' };
  }

  // 取得 API Key
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { success: false, message: 'Gemini API Key 未設定，請聯繫管理員' };
  }

  // 整理城市區段
  var citySegments = [];
  var currentCity = null;

  itinerary.forEach(function(item) {
    if (!item.city) return;

    // 取得主要城市名（處理 "倫敦 London" 或 "倫敦 → 巴黎" 格式）
    var cityParts = item.city.split('→')[0].trim().split(' ');
    var cityZh = cityParts[0];
    var dayNum = parseInt(item.day.replace('Day ', '')) || 0;

    // 如果是移動日（有箭頭），跳過
    if (item.city.includes('→')) {
      if (currentCity) {
        currentCity.endDay = dayNum;
        currentCity.days.push(item);
      }
      return;
    }

    // 檢查是否是新城市
    if (!currentCity || currentCity.city !== cityZh) {
      if (currentCity) {
        citySegments.push(currentCity);
      }
      currentCity = {
        city: cityZh,
        startDay: dayNum,
        endDay: dayNum,
        days: [item],
        hotels: []
      };
    } else {
      currentCity.endDay = dayNum;
      currentCity.days.push(item);
    }

    // 收集飯店
    if (item.hotel && currentCity) {
      var hotelText = item.hotel.replace(/<[^>]*>/g, '').trim();
      if (hotelText && currentCity.hotels.indexOf(hotelText) === -1) {
        currentCity.hotels.push(hotelText);
      }
    }
  });

  if (currentCity) {
    citySegments.push(currentCity);
  }

  var totalDays = itinerary.length;
  var cityNames = citySegments.map(function(s) { return s.city; });

  // 建立城市詳細資訊
  var cityDetails = citySegments.map(function(seg) {
    var daysContent = seg.days.map(function(d) {
      return d.day + ': ' + (d.content ? d.content.replace(/<[^>]*>/g, '').substring(0, 80) : '');
    }).join('\n');

    return '【' + seg.city + '】Day ' + seg.startDay + '-' + seg.endDay +
      '\n住宿: ' + (seg.hotels[0] || '未定') +
      '\n行程:\n' + daysContent;
  }).join('\n\n');

  // 建立 prompt - 依城市生成介紹
  var prompt = '你是一位文筆優美的旅遊作家，專門為蜜月旅行撰寫浪漫動人的旅程介紹。\n\n' +
    '請根據以下蜜月行程資訊，撰寫如精品旅行社的行程介紹。\n' +
    '文風要求：文藝、浪漫、優雅，讓讀者心生嚮往，迫不及待想要出發。\n' +
    '使用第一人稱複數「我們」，營造甜蜜的蜜月氛圍。\n\n' +
    '重要：請使用純文字格式，不要使用 markdown 語法。\n\n' +
    '行程資訊：\n' +
    '• 總天數：' + totalDays + ' 天\n' +
    '• 城市順序：' + cityNames.join(' → ') + '\n\n' +
    '詳細行程：\n' + cityDetails + '\n\n' +
    '請依照以下格式輸出（用 ||| 分隔）：\n\n' +
    '【intro】\n' +
    '旅程序章（約 100-150 字）：以詩意筆觸描繪這趟蜜月旅程的整體樣貌，讓讀者感受到浪漫與期待。\n\n' +
    '|||\n\n' +
    '【' + cityNames[0] + '】\n' +
    '（約 80-120 字）：描述在這座城市的體驗，融入景點特色、文化氛圍、下榻飯店的舒適感。\n\n' +
    cityNames.slice(1).map(function(city) {
      return '|||\n\n【' + city + '】\n（約 80-120 字）：同上格式。';
    }).join('\n\n') + '\n\n' +
    '|||\n\n' +
    '【closing】\n' +
    '期待出發（約 40-60 字）：簡短動人的結語，表達對這趟旅程的期待與意義。';

  try {
    var response = UrlFetchApp.fetch(
      getGeminiGenerateContentUrl(apiKey),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 8192
          }
        }),
        muteHttpExceptions: true
      }
    );

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 && result.candidates && result.candidates[0]) {
      var generatedText = result.candidates[0].content.parts[0].text;

      // 解析回應
      var parts = generatedText.split('|||');
      var content = {
        intro: '',
        cities: {},
        closing: ''
      };

      parts.forEach(function(part) {
        var trimmed = part.trim();

        if (trimmed.startsWith('【intro】')) {
          content.intro = trimmed.replace('【intro】', '').trim();
        } else if (trimmed.startsWith('【closing】')) {
          content.closing = trimmed.replace('【closing】', '').trim();
        } else {
          // 嘗試匹配城市
          cityNames.forEach(function(city) {
            if (trimmed.startsWith('【' + city + '】')) {
              content.cities[city] = trimmed.replace('【' + city + '】', '').trim();
            }
          });
        }
      });

      // 儲存到 Google Sheet
      saveJourneyContent(content);

      return { success: true, content: content };
    } else {
      var errorMsg = result.error ? result.error.message : '生成失敗，請稍後再試';
      return { success: false, message: errorMsg };
    }
  } catch (e) {
    Logger.log('AI 旅程介紹錯誤: ' + e.toString());
    return { success: false, message: '生成失敗: ' + e.toString() };
  }
}

// 儲存旅程介紹到 Sheet
function saveJourneyContent(content) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.journey);
    if (!sheet) {
      // 如果 Sheet 不存在，建立一個新的
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONFIG.sheetNames.journey);
      sheet.appendRow(['類型', '內容', '更新時間']);
      Logger.log('已建立旅程介紹 Sheet');
    }

    // 清空現有資料（保留標題行）
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    // 新增序章
    if (content.intro) {
      sheet.appendRow(['intro', content.intro, new Date()]);
    }

    // 新增各城市介紹
    if (content.cities) {
      Object.keys(content.cities).forEach(function(city) {
        sheet.appendRow(['city:' + city, content.cities[city], new Date()]);
      });
    }

    // 新增結語
    if (content.closing) {
      sheet.appendRow(['closing', content.closing, new Date()]);
    }

    Logger.log('已儲存旅程介紹（共 ' + (Object.keys(content.cities || {}).length + 2) + ' 筆）');
  } catch (e) {
    Logger.log('儲存旅程介紹錯誤: ' + e.toString());
  }
}

// ============================================
// 旅程秘書 AI 對話功能
// ============================================

// 建構行程上下文資料給 AI
function buildTripContext() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.itinerary);
    if (!sheet) return '';
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return '';

    var data = sheet.getRange(2, 1, lastRow - 1, 9).getDisplayValues();

    var contextLines = ['這是一趟蜜月旅行的完整行程資料：\n'];

    data.forEach(function(row) {
      var day = row[0];      // Day
      var date = row[1];     // 日期
      var weekday = row[2];  // 星期
      var city = row[3];     // 城市
      var content = row[4];  // 內容
      var transport = row[5]; // 交通
      var ticket = row[6];   // 票務
      var hotel = row[8];    // 住宿

      if (day) {
        contextLines.push(day + ' (' + date + ' ' + weekday + ')');
        if (city) contextLines.push('  城市: ' + city);
        if (content) contextLines.push('  行程: ' + content.replace(/<[^>]*>/g, '').substring(0, 200));
        if (transport) contextLines.push('  交通: ' + transport.replace(/<[^>]*>/g, ''));
        if (ticket) contextLines.push('  票務: ' + ticket.replace(/<[^>]*>/g, ''));
        if (hotel) contextLines.push('  住宿: ' + hotel.replace(/<[^>]*>/g, ''));
        contextLines.push('');
      }
    });

    return contextLines.join('\n');
  } catch (e) {
    Logger.log('建構行程上下文錯誤: ' + e.toString());
    return '';
  }
}

// AI 秘書對話主函數
function chatWithSecretary(question, history, useSearch) {
  // 權限檢查
  if (!isAuthorizedEditor()) {
    return { success: false, message: '您沒有權限使用此功能' };
  }

  // 取得 API Key
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { success: false, message: 'Gemini API Key 未設定，請聯繫管理員' };
  }

  // 建構行程上下文
  var tripContext = buildTripContext();

  var searchEnabled = useSearch === true;

  // 建構系統提示
  var systemPrompt = '你是一位專業且貼心的蜜月旅程秘書，名叫「旅程秘書」。\n\n' +
    '你的任務是回答關於這趟蜜月旅行的所有問題。以下是完整的行程資料：\n\n' +
    tripContext + '\n\n' +
    '回答規則：\n' +
    '1. 使用繁體中文回答\n' +
    '2. 回答要簡潔明瞭，控制在 200 字以內\n' +
    '3. 使用純文字格式，不要使用 markdown 語法\n' +
    '4. 如果問題與行程無關，請禮貌地引導回行程相關話題\n' +
    '5. 可以根據行程資料提供建議，但不要編造不存在的內容\n' +
    '6. 語氣親切溫暖，像是在幫助好朋友規劃旅行\n' +
    (searchEnabled
      ? '7. 已啟用網路搜尋；如果被問到即時資訊（如天氣、匯率、營業時間、交通異動），請利用搜尋能力查詢最新資料'
      : '7. 未啟用網路搜尋；如果被問到即時資訊（如天氣、匯率、營業時間、交通異動），請提醒使用者開啟搜尋模式以查詢最新資料');

  // 建構對話歷史
  var contents = [];

  // 加入歷史對話
  if (history && history.length > 0) {
    history.forEach(function(msg) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });
  }

  // 加入當前問題
  contents.push({
    role: 'user',
    parts: [{ text: question }]
  });

  try {
    var requestPayload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    if (searchEnabled) {
      requestPayload.tools = [{
        google_search: {}
      }];
    }

    var response = UrlFetchApp.fetch(
      getGeminiGenerateContentUrl(apiKey, searchEnabled ? CONFIG.geminiSearchModel : CONFIG.geminiTextModel),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(requestPayload),
        muteHttpExceptions: true
      }
    );

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 && result.candidates && result.candidates[0]) {
      var answer = result.candidates[0].content.parts[0].text;

      // 儲存對話記錄
      saveChatHistory(question, answer);

      return { success: true, answer: answer };
    } else {
      var errorMsg = result.error ? result.error.message : '生成回答失敗，請稍後再試';
      return { success: false, message: errorMsg };
    }
  } catch (e) {
    Logger.log('AI 對話錯誤: ' + e.toString());
    return { success: false, message: '對話失敗: ' + e.toString() };
  }
}

// 儲存對話記錄到 Sheet
function saveChatHistory(question, answer) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.chat);
    if (!sheet) {
      // 如果 Sheet 不存在，建立一個新的
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONFIG.sheetNames.chat);
      sheet.appendRow(['時間', '問題', '回答']);
      Logger.log('已建立 AI 秘書對話 Sheet');
    }

    // 新增記錄
    sheet.appendRow([new Date(), question, answer]);

    Logger.log('已儲存對話記錄');
  } catch (e) {
    Logger.log('儲存對話記錄錯誤: ' + e.toString());
  }
}

// 取得對話記錄
function getChatHistory() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.chat);
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

    var history = data.map(function(row, index) {
      var timeStr = '';
      if (row[0] instanceof Date) {
        timeStr = row[0].toISOString();
      } else {
        timeStr = String(row[0]);
      }

      return {
        rowNumber: index + 2,
        timestamp: timeStr,
        question: row[1],
        answer: row[2]
      };
    });

    // 依時間由舊到新返回，前端才能還原完整對話順序
    return history;
  } catch (e) {
    Logger.log('取得對話記錄錯誤: ' + e.toString());
    return [];
  }
}

// 刪除單筆對話記錄
function deleteChatHistory(rowNumber) {
  try {
    // 權限檢查
    if (!isAuthorizedEditor()) {
      return { success: false, message: '您沒有編輯權限' };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.chat);
    if (!sheet) return { success: false, message: '找不到對話記錄' };

    if (rowNumber < 2) return { success: false, message: '無效的行號' };

    sheet.deleteRow(rowNumber);
    return { success: true, message: '已刪除' };
  } catch (e) {
    return { success: false, message: '刪除失敗: ' + e.toString() };
  }
}

// 清除所有對話記錄
function clearChatHistory() {
  try {
    // 權限檢查
    if (!isAuthorizedEditor()) {
      return { success: false, message: '您沒有編輯權限' };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetNames.chat);
    if (!sheet) return { success: true, message: '無對話記錄' };

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    return { success: true, message: '已清除所有對話記錄' };
  } catch (e) {
    return { success: false, message: '清除失敗: ' + e.toString() };
  }
}
