# LY's Honeymoon Journal

歐洲蜜月旅行日誌 Web App，使用 Google Apps Script 部署，資料儲存於 Google Sheets。

> **Template 專案**：此專案可作為 template 重複使用，建立其他旅遊日誌。詳見 [SETUP.md](SETUP.md)。

## 功能

- **行程瀏覽**：依天數瀏覽詳細行程，支援城市快速跳轉
- **景點故事**：每日景點的文學風格介紹
- **景點地圖**：Google Maps 整合，支援導航
- **記帳功能**：多幣別記帳（EUR、CHF、GBP、TWD）
- **權限控制**：僅授權帳號可編輯

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
│   │   ├── DetailModal.tsx
│   │   ├── MapModal.tsx
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

### 景點介紹 (Attraction Details)
| Day | Title | Content |
|-----|-------|---------|

### 導航 (Navigation)
| Day | Name | Latitude | Longitude |
|-----|------|----------|-----------|

## 建立新旅遊

此專案設計為可重用的 template。建立新旅遊只需修改兩個設定檔：

| 檔案 | 設定內容 |
|------|----------|
| `src/config/trip.config.ts` | 前端設定（App 標題、幣別、支出類別） |
| `gas/Code.js` 的 `CONFIG` | 後端設定（頁面標題、授權帳號、Sheet 名稱） |

詳細步驟請參考 [SETUP.md](SETUP.md)。

## 相關連結

- [Web App](https://script.google.com/macros/s/AKfycbyJY8XcWcWuHQBks2AN9miyp1z2QZNoyt7GgXoIU-W15Di8twr1QAxNpxhB_vBr0Zro/exec)
- [Short URL](https://weiyuan1993.github.io/honeymoon-journal) (GitHub Pages 轉址)
- [GitHub Repository](https://github.com/weiyuan1993/honeymoon-journal)
