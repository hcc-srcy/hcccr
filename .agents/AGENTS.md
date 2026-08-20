# AGENTS.md - 新竹縣第四屆兒少諮詢代表網站 AI 開發與協作規範

本文件定義 AI 助理（Agents）在此專案中的開發原則、架構約束、技術細節與維護規範。所有接手的 AI Agent 在進行代碼編寫或架構修改前，必須遵守本規範。

---

## 🎯 專案使命與定位

本專案為 **新竹縣第四屆兒童及少年諮詢代表（竹縣少代）** 之官方門戶與不定期兒少議題調查系統：
1. **官網門戶**：保持極低維護成本的靜態網頁設計。
2. **議題調查中心 (`/surveys`)**：專為縣內不定期議題調查（如：各校教學正常化實況調查、學生權益調查）設計，前後台均提供媲美 Google 表單 (Google Forms) 的極致流暢操作體驗、動態交叉統計圖表、Excel 匯出、單筆列印與刪除系統。

---

## ⚙️ 架構與技術約束 (Architectural Constraints)

### 1. 前端架構
- **正式部署平台**：GitHub Pages，網址為 `https://hcc-srcy.github.io/hcccr/`；由 `.github/workflows/pages.yml` 自動部署。Cloudflare Pages 保留為選用部署平台。
- **Pages 子路徑**：原始碼維持站點根路徑語意；`scripts/build-github-pages.js` 產生含 `/hcccr` 前綴的 `.site` 成品。動態 JavaScript 連結必須使用 `HCCCR.appUrl()` 或 `HCCCR.getSurveyHref()`，不得直接新增根路徑字串。
- **自訂網域切換**：`hcccr.bond` 啟用前使用 `/hcccr`；啟用時透過 Actions Variables 設定 `PAGES_BASE_PATH=/` 與 `PAGES_CUSTOM_DOMAIN=hcccr.bond`，部署成品需包含 `CNAME`。Supabase 公開設定由 `HCCCR_SUPABASE_URL`、`HCCCR_SUPABASE_ANON_KEY` Actions Variables 注入。
- **網址路由**：
  - `/`：首頁（靜態門戶，包含導向 `/surveys` 之醒目按鈕）。
  - `/surveys`：議題調查總覽頁。
  - `/surveys/{uuid}`：動態調查作答頁。Cloudflare 由 `_redirects` 重寫；GitHub Pages 的 200 回應連結使用 `/hcccr/survey-detail.html?id={uuid}`，並以部署成品的 `404.html` 相容既有漂亮網址。
  - `/terms`：個人資料保護與隱私權政策條款全文。
- **樣式規範**：Vanilla CSS，定義 CSS 變數（主題色、圓角、陰影），必須提供專屬 `@media print` 列印樣式。

### 2. 後端與資料庫 (Supabase & Resend)
- **後端服務**：Supabase (PostgreSQL / RLS / Auth / Storage)。
- **通訊郵件服務**：Resend API（用於發送 Magic Link 及管理通知）。
- **後台認證**：**Supabase Auth (Magic Link 免密碼信箱登入)**，嚴格配合 `admin_users` 表格白名單與 RLS 驗證。
- **資料表規範**：
  - `admin_users`: 授權管理員信箱。
  - `forms`: 表單定義，欄位 `fields` 採用 **JSONB 彈性結構**。
  - `form_submissions`: 作答紀錄，包含 `started_at`、`submitted_at` 與 `duration_seconds`（自動計算）。
- **公開資料邊界**：匿名前台不得直接 `SELECT forms` 或讀取密碼欄位，必須透過 `list_public_forms`、`get_public_form` 與 `submit_form` RPC；活動密碼僅以 `pgcrypto` 雜湊保存。
- **開發示範模式**：未配置 Supabase 時可使用 `sessionStorage` 示範資料，但 UI 必須清楚標示，且不得將示範資料誤認為正式提交。

---

## 📋 關鍵功能開發規範

### 🔒 1. 前置隱私權條款門檻 (Privacy Consent Gate)
- 在 `/surveys/{uuid}` 載入時，必須先呈現《個資蒐集告知暨隱私權與服務條款》。
- 未勾選同意前，作答題目需保持鎖定遮罩。
- 勾選同意時觸發記錄 `started_at = new Date().toISOString()`。

### 🔐 2. 三種表單存取權限模式
- `public`：顯示於 `/surveys`。
- `public_password`：顯示於 `/surveys`，需輸入 `access_password` 驗證後方可解鎖作答。
- `unlisted`：隱藏於 `/surveys`，僅可透過 `/surveys/{uuid}` 直連。

### 🔀 3. 條件式跳題與終止動作
- 單選題的 `field.branching` 可依選項設定 `jump`、`screenout`、`submit`；未設定的選項預設前往下一題。
- `jump` 只能指向後續題目，前台需維持單頁填答並以平滑捲動前往目標，不得改成每題都要按「下一步」的一題一頁流程。
- 被跳過的題目必須隱藏、清除既有答案且不參與必填驗證；`screenout` 不得寫入提交資料，`submit` 需經使用者確認後送出目前有效路徑。
- `submit_form` RPC 必須在資料庫端重算有效路徑、拒絕偽造的 `screenout` 提交，並只保存可到達題目的答案。

### ✏️ 4. 表單二次編輯與「已編輯」狀態
- 後台可隨時編輯既有表單，更新時設定 `is_edited = true` 與 `updated_at`。
- 前後台需呈現「已編輯 (Edited)」標籤與修訂時間。

### 📊 5. 回應分析與動態交叉條件篩選
- 提供「摘要圖表」、「個別回應」、「明細表格」三種模式。
- 後台計算並呈現 **「全體平均作答時間」**。
- 圖表採用 **Chart.js** 或 **Recharts**，篩選器選擇（如：就讀階段=國中）時全頁其餘圖表必須**動態連動重繪**。
- 支援將目前問卷與篩選條件下的完整回應匯出為 `.xlsx`；日期與秒數須保留可排序、可計算型別，並附題目設定。工作簿僅能在已授權後台的瀏覽器端產生，不得將原始回應傳送至第三方轉檔服務。

### 🖨️ 6. 列印與單筆回應管理
- 空白表單列印入口僅能顯示於已登入的管理後台，前台問卷不得呈現列印按鈕；列印時隱藏所有 UI 操作按鈕。
- 支援單筆回應獨立檢視、一鍵列印/PDF 與單獨刪除 (`DELETE FROM form_submissions WHERE id = :id`)。

---

## 🛠️ 代碼維護與 Git 提交規範

1. **註釋與文件同步**：
   - 任何架構更動必須同步更新 [README.md](file:///Users/tofu/Documents/竹縣少代網頁/README.md)、[TERMS.md](file:///Users/tofu/Documents/竹縣少代網頁/TERMS.md) 與 [AGENTS.md](file:///Users/tofu/Documents/竹縣少代網頁/AGENTS.md)。
2. **Git Commit 訊息格式**：
   - `feat: ...` 新增功能
   - `fix: ...` 修復 Bug
   - `docs: ...` 更新說明文件
   - `style: ...` 調整 UI / CSS 樣式
