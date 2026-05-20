# Our Honeymoon Journey

![Cover](assets/images/cover.png)

歐洲蜜月旅行日誌 Web App，使用 Google Apps Script 部署，資料儲存於 Google Sheets。

> **Template 專案**：此專案可作為 template 重複使用，建立其他旅遊日誌。詳見 [SETUP.md](SETUP.md)。

## 功能

- **行程瀏覽**：依天數瀏覽詳細行程，支援城市快速跳轉
- **AI 景點規劃**：使用 Google Gemini API 生成景點故事與交通規劃
- **AI 美食推薦**：依價位（平價/中價位/高價位）推薦當地美食，附 Google Maps 連結
- **景點地圖**：Google Maps 整合，支援導航
- **票券預覽**：從 Google Sheet「票券」分頁讀取雲端 PDF，行程卡可直接開啟當日票券預覽
- **記帳功能**：多幣別記帳（EUR、CHF、GBP、TWD）
- **待辦事項**：可在 Web App 勾選並同步 Google Sheet
- **權限控制**：僅授權帳號可編輯
- **選單連結**：快速存取 Google Sheet、Google Map、票券 Drive 資料夾與 GitHub

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + TypeScript + Tailwind CSS v4 |
| 建置 | Vite + vite-plugin-singlefile |
| 後端 | Google Apps Script |
| 資料庫 | Google Sheets |
| 部署 | clasp + GitHub Actions |

## 專案結構

```
├── src/
│   ├── config/
│   │   └── trip.config.ts # 旅遊設定 (標題、幣別、類別)
│   ├── components/        # React 元件
│   │   ├── App.tsx
│   │   ├── ItineraryCard.tsx
│   │   ├── ExpensePage.tsx
│   │   ├── ExpenseItem.tsx
│   │   ├── DetailModal.tsx   # AI 景點規劃 Modal
│   │   ├── FoodModal.tsx     # AI 美食推薦 Modal
│   │   ├── TicketModal.tsx   # 票券預覽 Modal
│   │   ├── MapModal.tsx
│   │   ├── TodoPage.tsx
│   │   └── Loading.tsx
│   ├── utils/
│   │   └── gasClient.ts   # GAS API 封裝 + 本機 mock
│   ├── types/
│   │   └── index.ts       # TypeScript 型別定義
│   ├── styles/
│   │   └── index.css      # Tailwind 設定 + 自訂樣式
│   ├── main.tsx           # 進入點
│   └── index.html         # HTML 模板
├── gas/
│   ├── Code.js            # GAS 後端程式碼 (含 CONFIG 設定)
│   └── appsscript.json    # GAS 專案設定
├── scripts/
│   └── build-gas.js       # 建置後處理腳本
├── dist/                  # 建置輸出 (git ignored)
├── vite.config.ts
├── tsconfig.json
├── package.json
├── SETUP.md               # 建立新旅遊的說明
└── .clasp.json            # clasp 設定 (指向 dist/)
```

## 開發流程

### 環境需求

- Node.js 20+
- npm
- Google 帳號 (已授權 clasp)

### 安裝

```bash
npm install
```

### 本機開發

```bash
npm run dev
```

開啟 http://localhost:5173 預覽。本機開發使用 mock 資料。

### 建置

```bash
npm run build
```

輸出至 `dist/` 資料夾，包含：
- `Index.html` - 打包後的前端（單一 HTML 檔案）
- `Code.js` - 後端程式碼
- `appsscript.json` - GAS 設定

### 部署

**方式一：手動部署**
```bash
npm run deploy
```

**方式二：Git 自動部署**
```bash
git add .
git commit -m "描述"
git push
```

Push 到 `main` 分支會自動觸發 GitHub Actions 執行建置與部署。

## Google Sheets 結構

### 行程 (Itinerary)
| Day | Date | Weekday | City | Content | Transport | Ticket | Link | Hotel |
|-----|------|---------|------|---------|-----------|--------|------|-------|

### 記帳 (Expenses)
| Timestamp | Item | Amount | Currency | Category |
|-----------|------|--------|----------|----------|

### 待辦 (Todos)
| Section | Item | Detail | Deadline | Done |
|---------|------|--------|----------|------|

`Done` 使用 checkbox / boolean，Web App 會同步勾選狀態。

### 票券 (Tickets)
| Day | Date | City | Item | Type | Provider | File URL | Notes |
|-----|------|------|------|------|----------|----------|-------|

`Day` 必須對應「行程」分頁的 Day（例如 `Day 8`）。當該天有票券資料時，行程卡右上角票券按鈕會開啟當日票券 Modal。已授權編輯者可以預覽 PDF 與開啟 Drive 檔案；訪客只會看到票券清單，不會載入實際檔案內容。

### 景點介紹 (Attraction Details)
| Day | Title | Content |
|-----|-------|---------|

### 導航 (Navigation)
| Day | Name | Latitude | Longitude |
|-----|------|----------|-----------|

### 美食推薦 (Food Recommendations)
| Day | City | PriceLevel | Content | UpdatedAt |
|-----|------|------------|---------|-----------|

## AI 功能

本專案整合 Google Gemini API 提供智慧旅遊助理功能。

### AI 景點規劃

點擊行程卡片的「規劃」按鈕，AI 會根據當日行程生成：

- **景點故事**：融入歷史典故與文化背景的文學風格介紹
- **交通規劃**：景點間的移動建議與時間安排
- **旅遊小提醒**：當地習俗、注意事項

生成的內容會自動儲存至 Google Sheet「景點介紹」分頁，下次開啟直接顯示。

### AI 美食推薦

點擊行程卡片的「美食」按鈕，可依價位獲得餐廳推薦：

| 價位 | 說明 |
|------|------|
| 平價 | 當地小吃、快餐、街邊美食 |
| 中價位 | 特色餐廳、當地人氣店家 |
| 高價位 | 米其林推薦、高級餐廳 |

每間餐廳附有 Google Maps 連結，方便導航。推薦內容儲存至「美食推薦」分頁。

### API 設定

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey) 取得 API Key
2. 在 Google Apps Script 編輯器執行：

```javascript
PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', 'your-api-key');
```

> **注意**：API Key 存於 Script Properties，不會進入版本控制。免費版有每分鐘請求限制。

## 建立新旅遊

此專案設計為可重用的 template。建立新旅遊只需修改兩個設定檔：

| 檔案 | 設定內容 |
|------|----------|
| `src/config/trip.config.ts` | 前端設定（App 標題、幣別、支出類別、外部連結） |
| `gas/Code.js` 的 `CONFIG` | 後端設定（頁面標題、授權帳號、Sheet 名稱） |

詳細步驟請參考 [SETUP.md](SETUP.md)。

## 相關連結

- [Web App](https://script.google.com/macros/s/AKfycbyJY8XcWcWuHQBks2AN9miyp1z2QZNoyt7GgXoIU-W15Di8twr1QAxNpxhB_vBr0Zro/exec)
- [Short URL](https://weiyuan1993.github.io/honeymoon-journal) (GitHub Pages 轉址)
- [GitHub Repository](https://github.com/weiyuan1993/honeymoon-journal)
- [App Script](https://script.google.com/home/projects/1aMzT7R1zAxh6buT3FTTjfjmw31xWIE6y9-eOjDpNHqw4JnhP2j0LSGHX/edit)
