# 新竹縣第四屆兒童及少年諮詢代表官方網站 (Hsinchu County 4th Children and Youth Advisory Representatives Website)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosting: Cloudflare Pages](https://img.shields.io/badge/Hosting-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com/)

本專案為**新竹縣第四屆兒童及少年諮詢代表（以下簡稱「竹縣少代」）**之官方門戶網站、議題徵求中心、**自訂表單管理、多維數據圖表與列印系統**。網站旨在提供縣內兒少了解少代會運作機制與提案成果，並包含 `/surveys` 議題徵求中心、類 Google 表單後台、多維度統計圖表分析（支援交叉條件篩選）、單筆列印與刪除等完整功能。

---

## 📌 專案定位與核心設計原則

1. **類 Google 表單之多維數據統計與交叉分析 (Analytics & Cross-filtering)**
   - 📊 **三種檢視視角**：支援「摘要圖表 (Summary)」、「個別回應 (Individual)」與「明細表格 (Spreadsheet)」三種檢視模式。
   - 📉 **自動化視覺圖表**：單選/多選題自動生成圓餅圖 (Pie Chart)、柱狀圖 (Bar Chart) 或條形圖。
   - 🔀 **交叉條件篩選分析 (Conditional Breakdown)**：點擊特定選項（例如篩選「就讀階段 = 國中」），全頁其餘題目的統計圖表將**即時動態連動**，呈現該特定族群在其他議題上的回答分布！

2. **多元表單輸出與回應管理 (Print & Response Management)**
   - 🖨️ **空白表單列印**：支援將製作完成的表單匯出/列印為紙本問卷格式（透過 `@media print` 專屬樣式）。
   - 🔍 **單筆回應查看與列印**：後台提供單一回應摘要的獨立查看與一鍵列印/PDF 匯出功能。
   - 🗑️ **單筆回應刪除**：管理者可後台單獨刪除無效或測試回應紀錄。

3. **靈活的表單公開與存取權限**
   - 🌐 **公開 (Public)** / 🔑 **公開但需密碼 (Public with Password)** / 🔒 **不公開連結 (Unlisted)**。

4. **安全無密碼後台認證 (Admin Authentication Strategy)**
   - 採用 **Supabase Auth (Magic Link 免密碼信箱驗證)** 搭配 **`admin_users` 白名單**，確保幹部交接順暢且安全性極高。

---

## 📊 三種回應檢視與交叉篩選分析 (Response Analytics & Cross-Filtering)

類似 Google 表單之回應統計儀表板包含以下三大核心維度：

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
│ 📌 當套用「就讀階段 = 國中」篩選時，下方所有題目的圖表將即時連動顯示該族群之統計結果：  │
│                                                                                        │
│   【議題：最關心的兒少議題 (國中生族群分布)】                                             │
│   ■ 校園權益與課業壓力 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 65%                                           │
│   ■ 交通安全與公車班次 ▓▓▓▓▓▓▓▓▓ 25%                                                   │
│   ■ 休閒娛樂設施     ▓▓▓ 10%                                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 📈 統計圖表與交叉分析技術實現 (Analytics Tech Stack)
- **前台圖表庫**：採用 **Chart.js** 或 **Recharts** 繪製高品質、響應式且帶有平滑動畫的圓餅圖與長條圖。
- **動態資料計算邏輯**：
  在前端載入 `form_submissions` 的 JSONB 陣列後，透過 JavaScript 高效能 `Array.prototype.filter()` 與 `reduce()` 進行即時多維度交叉統計，無需頻繁向後端發起重度查詢。

---

## 🔒 後台認證機制 (Admin Auth Strategy)

採用 **Supabase Auth (Magic Link 免密碼信箱驗證)** 搭配 **`admin_users` 白名單**。幹部僅需輸入指定 Email 並點擊信件連結即可完成安全認證，完美解決屆數交接密碼遺失問題。

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
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     /surveys/{uuid} (表單作答頁)                   │
│   • 支援 Public / Public Password / Unlisted 作答模式            │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                       /admin (後台管理系統)                       │
│   • /admin/login     : Magic Link 無密碼登入                      │
│   • /admin/builder   : 拖拉式表單建構器 & 空白表單列印             │
│   • /admin/responses : 摘要圖表、交叉篩選分析、單筆獨檢/列印/單刪     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ 資料庫模型設計 (Supabase Database Schema)

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
    visibility form_visibility_enum DEFAULT 'public',
    access_password VARCHAR(255),
    is_open BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
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

-- RLS 權限控管
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public submit responses" ON public.form_submissions
    FOR INSERT WITH CHECK (true);

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
├── admin/
│   ├── index.html          # 後台 Magic Link 無密碼登入
│   ├── dashboard.html      # 後台表單管理與狀態控制
│   ├── builder.html        # 拖拉式表單建構器 & 空白表單列印
│   ├── responses.html      # 摘要圖表、交叉條件篩選分析與單筆管理
│   └── response-detail.html# 單筆回應獨檢與列印
├── css/
│   ├── main.css            # 核心樣式
│   ├── print.css           # 列印專屬樣式表
│   └── charts.css          # 統計圖表與交叉分析儀表板樣式
├── js/
│   ├── config.js           # Supabase 初始化與驗證設定
│   ├── surveys.js          # 表單總覽邏輯
│   ├── survey-detail.js    # 作答頁與密碼邏輯
│   ├── admin-charts.js     # Chart.js 統計圖表與動態交叉篩選邏輯
│   └── admin-responses.js  # 單筆回應查詢、列印與單刪邏輯
├── README.md               # 本專案架構說明
└── _redirects              # Cloudflare Pages 路由規則
```

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開放。
