# 新竹縣第四屆兒童及少年諮詢代表官方網站 (Hsinchu County 4th Children and Youth Advisory Representatives Website)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosting: Cloudflare Pages](https://img.shields.io/badge/Hosting-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com/)

本專案為**新竹縣第四屆兒童及少年諮詢代表（以下簡稱「竹縣少代」）**之官方門戶網站、議題徵求中心、**類 Google 表單後台建構器、多維數據圖表與列印管理系統**。網站旨在提供縣內兒少了解少代會運作機制與提案成果，並包含 `/surveys` 議題徵求中心、靈活權限控管（公開/密碼/不公開）、類 Google 表單之拖拉編輯器、多維度統計圖表（支援動態交叉條件篩選）、單筆列印與刪除等完整功能。

---

## 📌 專案定位與核心設計原則

1. **靜態門戶與極低維護負擔 (Low Maintenance Portal)**
   - 官方網站主體（少代簡介、組織架構、歷年提案與常見問題）採靜態化設計，避免無謂的後端維運成本。
   - 首頁配置醒目的「前往議題徵求中心 ➔」按鈕，引導使用者至 `/surveys` 頁面。

2. **類 Google 表單之直覺式後台建構器 (Google Forms-like Admin Builder)**
   - **拖拉與點擊式設計**：提供直覺的表單編輯器，支援多種題型（單選、多選、簡答、長文、日期、檔案上傳等）。
   - **動態發布與開關**：一鍵切換議題徵求開放/關閉狀態，可設定截止時間。

3. **三種靈活的表單公開與存取權限 (Visibility Control)**
   - 🌐 **公開 (Public)**：顯示於 `/surveys` 列表中，自由作答。
   - 🔑 **公開但需密碼 (Public with Password)**：顯示於 `/surveys` 列表中，需輸入授權密碼才可作答。
   - 🔒 **不公開 / 僅限連結 (Unlisted)**：隱藏於 `/surveys` 列表，僅限擁有專屬連結 (`/surveys/{uuid}`) 的對象作答。

4. **多維數據統計與動態交叉條件篩選分析 (Response Analytics & Cross-Filtering)**
   - 📊 **三種檢視視角**：支援「摘要圖表 (Summary)」、「個別回應 (Individual)」與「明細表格 (Spreadsheet)」三種模式。
   - 🔀 **交叉條件動態篩選**：點擊特定選項（例如篩選「就讀階段 = 國中」），全頁其餘題目的統計圖表將**即時動態連動**，呈現該族群在其他議題上的回答分布！

5. **多元表單輸出與回應管理 (Print & Response Management)**
   - 🖨️ **空白表單列印**：支援將製作完成的表單匯出/列印為紙本問卷格式（透過 `@media print` 專屬樣式）。
   - 🔍 **單筆回應查看與列印**：提供單一回應摘要的獨立查看與一鍵列印/PDF 匯出功能。
   - 🗑️ **單筆回應刪除**：管理者可後台單獨刪除無效或測試回應紀錄。

6. **安全無密碼後台認證 (Admin Auth Strategy)**
   - 採用 **Supabase Auth (Magic Link 免密碼信箱驗證)** 搭配 **`admin_users` 白名單**，確保幹部交接順暢且安全性極高。

---

## 🗺️ 頁面架構與路由設計 (Page Routing & Actions)

```
┌───────────────────────────────────────────────────────────────────┐
│                          / (首頁 靜態門戶)                         │
│   • 介紹第四屆少代、組織架構、歷年提案                               │
│   • 醒目按鈕：[前往議題徵求中心 ➔] (導向 /surveys)                   │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                      /surveys (議題徵求總覽頁)                     │
│   • 顯示所有 Visibility = 'public' 或 'public_password' 之開放表單 │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ 點擊卡片 或 專屬連結
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     /surveys/{uuid} (表單作答頁)                   │
│   • 判斷權限：                                                    │
│     - Public: 直接作答                                            │
│     - Public Password: 需輸入解鎖密碼                              │
│     - Unlisted: 透過 UUID 直接進入作答                            │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                       /admin (後台管理系統)                       │
│   • /admin/login     : Magic Link 無密碼信箱登入                   │
│   • /admin/dashboard : 表單列表、狀態開關與權限設定                   │
│   • /admin/builder   : 拖拉式表單建構器 & 空白表單列印             │
│   • /admin/responses : 摘要圖表、交叉條件篩選分析、單筆獨檢/列印/單刪     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎨 後台自訂表單建構與欄位型態 (Admin Form Builder Workflow)

```
[ 幹部登入後台 Magic Link ] ➔ [ 新增表單 ] ➔ [ 拖拉/新增題目欄位 ] ➔ [ 設定權限 (Public/Password/Unlisted) ] ➔ [ 一鍵發布 ]
```

### 💡 題目欄位 JSONB 結構設計
表單欄位儲存於 `forms.fields` (JSONB)，支援動態擴充：
```json
[
  {
    "id": "field_101",
    "type": "single_choice",
    "label": "請選擇您的就讀階段",
    "required": true,
    "options": ["國小", "國中", "高中職", "大專院校", "其他"]
  },
  {
    "id": "field_102",
    "type": "multiple_choice",
    "label": "您最關心的兒少議題有哪些？（可複選）",
    "required": true,
    "options": ["校園權益與課業壓力", "休閒娛樂與公共空間", "心理健康與輔導", "交通安全與公車班次"]
  },
  {
    "id": "field_103",
    "type": "long_text",
    "label": "具體建議與意見說明",
    "placeholder": "請詳細說明您的想法與建議...",
    "required": false
  },
  {
    "id": "field_104",
    "type": "file_upload",
    "label": "佐證資料上傳（選填）",
    "required": false
  }
]
```

---

## 📊 三種回應檢視與動態交叉篩選分析 (Response Analytics & Cross-Filtering)

後台回應分析中心提供三大檢視維度與動態交叉篩選器：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        /admin/responses (回應分析與圖表中心)                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 📊 摘要統計圖表 ]     [ 👤 個別回應 (單筆檢視/列印/刪除) ]     [ 📋 明細表格 (Spreadsheet) ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 交叉條件篩選器 (Cross-filtering Filter Bar):                                         │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌────────────────────────┐ │
│ │ 篩選題目: [ 就讀階段 ▼ ] │ │ 選項: [ 國中 (35%) ▼ ]    │ │ [ 🧹 清除篩選重置 ]    │ │
│ └───────────────────────────┘ └───────────────────────────┘ └────────────────────────┘ │
│                                                                                        │
│ 📌 當套用「就讀階段 = 國中」篩選時，全頁其餘題目的圖表將即時動態連動顯示該族群之分布：    │
│                                                                                        │
│   【議題：最關心的兒少議題 (國中生族群分布)】                                             │
│   ■ 校園權益與課業壓力 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 65%                                           │
│   ■ 交通安全與公車班次 ▓▓▓▓▓▓▓▓▓ 25%                                                   │
│   ■ 休閒娛樂設施     ▓▓▓ 10%                                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖨️ 列印與單筆回應管理機制 (Print & Individual Response Management)

1. **空白表單列印 (Print Blank Form)**：
   在建構器中提供 `[🖨️ 列印/匯出 PDF 空白表單]`，自動套用 `@media print` 樣式，隱藏按鈕與側欄，輸出乾淨紙本排版。
2. **單筆回應查看、列印與單獨刪除 (Individual Response Action)**：
   - 👁️ **[單獨查看]**：彈出視窗或獨立頁面檢視單一兒少填寫內容。
   - 🖨️ **[單獨列印 / 匯出 PDF]**：將該筆回應獨立排版列印或轉成 PDF 歸檔。
   - 🗑️ **[單獨刪除]**：管理者可單獨刪除測試或無效回應。

---

## 🔒 後台認證機制與最佳實踐 (Admin Auth Strategy)

採用 **Supabase Auth (Magic Link 免密碼信箱驗證)** 搭配 **`admin_users` 白名單**。
- 輸入授權信箱發送登入連結，免去記憶密碼與換屆交接密碼遺失問題。

---

## 🗄️ 全套資料庫模型設計 (Complete Supabase Schema)

```sql
-- 1. 後台管理員白名單
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 表單模式與主表
CREATE TYPE form_visibility_enum AS ENUM ('public', 'public_password', 'unlisted');

CREATE TABLE public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visibility form_visibility_enum DEFAULT 'public', -- 公開, 公開需密碼, 不公開連結
    access_password VARCHAR(255),                     -- 存取密碼
    is_open BOOLEAN DEFAULT true,                     -- 是否開放填寫
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,                             -- 截止時間
    fields JSONB NOT NULL DEFAULT '[]',               -- 題目定義 (JSON)
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 表單回應紀錄表
CREATE TABLE public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,               -- 格式: {"field_id": "回答內容"}
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 少代成員資料表 (可選)
CREATE TABLE public.representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    group_name VARCHAR(100),
    role VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    order_index INT DEFAULT 0
);

-- RLS 權限控管
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;

-- 前台存取權限
CREATE POLICY "Public read open forms" ON public.forms
    FOR SELECT USING (
        (visibility IN ('public', 'public_password') AND is_open = true)
        OR (visibility = 'unlisted' AND is_open = true)
    );

CREATE POLICY "Public submit responses" ON public.form_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read representatives" ON public.representatives
    FOR SELECT USING (true);

-- 後台管理員權限 (限白名單登入)
CREATE POLICY "Admin full forms management" ON public.forms
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

CREATE POLICY "Admin manage submissions" ON public.form_submissions
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));
```

---

## 📁 專案目錄結構 (Directory Structure)

```
.
├── index.html              # 首頁 (靜態門戶與 [前往議題徵求] 按鈕)
├── surveys.html            # /surveys - 公開表單總覽頁面
├── survey-detail.html      # /surveys/{uuid} - 支援 UUID 路由與密碼驗證作答頁
├── about.html              # 關於第四屆少代
├── achievements.html       # 歷年提案與成果展示
├── admin/
│   ├── index.html          # 後台 Magic Link 免密碼登入
│   ├── dashboard.html      # 後台表單總覽、狀態開關與權限設定
│   ├── builder.html        # 拖拉式表單建構器 & 空白表單列印
│   ├── responses.html      # 摘要圖表、交叉條件篩選分析與回應管理
│   └── response-detail.html# 單筆回應獨檢、單獨列印與刪除
├── css/
│   ├── main.css            # 核心視覺樣式
│   ├── print.css           # 列印專屬樣式表 (`@media print`)
│   └── charts.css          # 統計圖表與交叉分析儀表板樣式
├── js/
│   ├── config.js           # Supabase 初始化與驗證設定
│   ├── surveys.js          # 表單總覽邏輯
│   ├── survey-detail.js    # 作答頁與密碼驗證邏輯
│   ├── builder.js          # 後台建構器與 JSONB 編輯邏輯
│   ├── admin-charts.js     # Chart.js 統計圖表與動態交叉篩選邏輯
│   └── admin-responses.js  # 單筆回應查詢、列印與單刪邏輯
├── README.md               # 本專案架構說明
└── _redirects              # Cloudflare Pages 路由規則
```

---

## 🚀 部署與營運指引 (Deployment Guide)

### 選擇 1：Cloudflare Pages 部署 (推薦)
1. 將 Repository 連結至 **Cloudflare Pages**。
2. 在環境變數中設定 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。
3. Cloudflare Pages 自動讀取 `_redirects` 處理 `/surveys/*` 路由。

### 選擇 2：GitHub Pages 部署
1. 開啟 GitHub `Settings` -> `Pages`。
2. Source 選擇 `main` branch。
3. 自動構建並啟用免費部署。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開放。
