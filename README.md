# 新竹縣第四屆兒童及少年諮詢代表官方網站 (Hsinchu County 4th Children and Youth Advisory Representatives Website)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosting: Cloudflare Pages](https://img.shields.io/badge/Hosting-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com/)

本專案為**新竹縣第四屆兒童及少年諮詢代表（以下簡稱「竹縣少代」）**之官方門戶網站、議題徵求中心、**自訂表單後台建構器、隱私條款門檻、作答時間追蹤、多維數據圖表與列印管理系統**。網站旨在提供縣內兒少了解少代會運作機制與提案成果，包含前置隱私條款同意門檻、作答開始與結束時間紀錄、平均作答時間統計、`/surveys` 議題徵求中心、靈活權限控管（公開/密碼/不公開）、表單二次編輯與「已編輯」註記、多維度統計圖表（支援動態交叉條件篩選）、單筆列印與刪除等完整功能。

---

## 📌 專案定位與核心設計原則

1. **⏱️ 自動作答時間追蹤與平均作答時間統計 (Completion Time & Analytics)**
   - **填答時間戳記**：兒少點開頁面同意條款並開始作答時記錄 `started_at`，點擊送出時記錄 `submitted_at`。
   - **平均作答時間分析**：後台回應儀表板自動計算全體兒少的**平均作答時間（例如：3 分 45 秒）**，並可過濾秒速填答之異常垃圾回應。

2. **🔒 前置隱私權與服務條款門檻 (Privacy Policy & Terms Gate)**
   - **擋在最前面**：在兒少填寫任何表單前，系統會強制彈出《個資蒐集告知暨隱私權與服務條款》同意門檻，勾選後方可解鎖作答。

3. **✏️ 表單二次編輯與「已編輯」狀態追蹤 (Form Editing & "Edited" Badge)**
   - **後台二次編輯**：管理員可隨時對已建立或發布的表單進行編輯。
   - **「已編輯」標示**：修訂後自動更新 `updated_at` 並標示「已編輯 (Edited)」與最後修訂時間。

4. **⚙️ 靈活題目設定 (必填/選填、單選/複選)**
   - 支援獨立設定：**必填/選填 (Required/Optional)**、**單選/複選 (Radio/Checkbox)**、簡答、長答、日期、檔案上傳。

5. **靜態門戶與極低維護負擔 (Low Maintenance Portal)**
   - 官方網站主體採靜態化設計，首頁配置醒目的「前往議題徵求中心 ➔」按鈕，引導使用者至 `/surveys` 頁面。

6. **三種靈活的表單公開與存取權限 (Visibility Control)**
   - 🌐 **公開 (Public)** / 🔑 **公開但需密碼 (Public with Password)** / 🔒 **不公開連結 (Unlisted)**。

7. **多維數據統計與動態交叉條件篩選分析 (Response Analytics & Cross-Filtering)**
   - 📊 **三種檢視視角**：支援「摘要圖表 (Summary)」、「個別回應 (Individual)」與「明細表格 (Spreadsheet)」三種模式。
   - 🔀 **交叉條件動態篩選**：點擊特定選項（例如「就讀階段 = 國中」），全頁其餘題目的統計圖表即時連動！

8. **多元表單輸出與回應管理 (Print & Response Management)**
   - 🖨️ 空白表單列印（套用 `@media print`）、單筆回應獨檢/列印/刪除。

9. **安全無密碼後台認證 (Admin Auth Strategy)**
   - 採用 **Supabase Auth (Magic Link 免密碼信箱驗證)** 搭配 **`admin_users` 白名單**。

---

## 📊 三種回應檢視、平均作答時間與動態交叉篩選 (Response Analytics)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        /admin/responses (回應分析與圖表中心)                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  📈 關鍵數據指標:                                                                      │
│  [ 總填答數: 128 份 ]      [ ⏱️ 平均作答時間: 4 分 12 秒 ]      [ 狀態: 進行中 (開放) ]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 📊 摘要統計圖表 ]     [ 👤 個別回應 (單筆檢視/列印/刪除) ]     [ 📋 明細表格 (Spreadsheet) ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 交叉條件篩選器 (Cross-filtering Filter Bar):                                         │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌────────────────────────┐ │
│ │ 篩選題目: [ 就讀階段 ▼ ] │ │ 選項: [ 國中 (35%) ▼ ]    │ │ [ 🧹 清除篩選重置 ]    │ │
│ └───────────────────────────┘ └───────────────────────────┘ └────────────────────────┘ │
│                                                                                        │
│ 📌 當套用「就讀階段 = 國中」篩選時，全頁圖表與平均作答時間將即時動態連動：             │
│                                                                                        │
│   【議題：最關心的兒少議題 (國中生族群分布)】                                             │
│   ■ 校園權益與課業壓力 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 65%                                           │
│   ■ 交通安全與公車班次 ▓▓▓▓▓▓▓▓▓ 25%                                                   │
│   ■ 休閒娛樂設施     ▓▓▓ 10%                                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ 頁面架構與作答流程 (Routing & Consent Flow)

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
│   • 標示「已編輯 (Edited)」狀態與最後更新時間                     │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ 點擊卡片 或 專屬連結
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     /surveys/{uuid} (表單作答頁)                   │
│                                                                   │
│   📌 步驟 1【同意條款並觸發計時開始】:                              │
│      [✓] 我已閱讀並同意《新竹縣少代個資蒐集與隱私權保護條款》      │
│      ➔ 系統自動記錄 started_at = 2026-08-18T23:50:00Z             │
│                                                                   │
│   📌 步驟 2【存取權限與題目作答】:                                  │
│      - 驗證「必填 (Required)」、「單選」與「複選」                 │
│                                                                   │
│   📌 步驟 3【送出表單並記錄結束時間】:                              │
│      ➔ 系統自動記錄 submitted_at = 2026-08-18T23:54:12Z            │
│      ➔ 計算本筆作答費時 252 秒 (4 分 12 秒)                         │
└───────────────────────────────────────────────────────────────────┘
```

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
    visibility form_visibility_enum DEFAULT 'public',
    access_password VARCHAR(255),
    require_terms_consent BOOLEAN DEFAULT true,       -- 是否要求同意隱私權條款
    is_open BOOLEAN DEFAULT true,                     -- 是否開放填寫
    is_edited BOOLEAN DEFAULT false,                  -- 是否曾經編輯過 (顯示「已編輯」)
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,                             -- 截止時間
    fields JSONB NOT NULL DEFAULT '[]',               -- 題目定義 (含 required, single/multiple choice)
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 表單回應紀錄表 (記錄開始時間、送出時間與作答費時)
CREATE TABLE public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
    agreed_terms BOOLEAN DEFAULT true,                -- 是否同意隱私條款
    answers JSONB NOT NULL,                           -- 回應內容 JSON
    started_at TIMESTAMPTZ NOT NULL,                  -- 開始作答時間
    submitted_at TIMESTAMPTZ DEFAULT now(),           -- 送出時間
    duration_seconds INT GENERATED ALWAYS AS (        -- 自動計算作答費時 (秒)
        EXTRACT(EPOCH FROM (submitted_at - started_at))::INT
    ) STORED
);

-- RLS 權限控管
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read open forms" ON public.forms
    FOR SELECT USING (
        (visibility IN ('public', 'public_password') AND is_open = true)
        OR (visibility = 'unlisted' AND is_open = true)
    );

CREATE POLICY "Public submit responses" ON public.form_submissions
    FOR INSERT WITH CHECK (true);

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
├── surveys.html            # /surveys - 公開表單總覽頁面 (顯示「已編輯」標示)
├── survey-detail.html      # /surveys/{uuid} - 隱私條款門檻 + 時間追蹤 + 作答頁
├── terms.html              # 全站個人資料蒐集與隱私權條款全文
├── admin/
│   ├── index.html          # 後台 Magic Link 無密碼登入
│   ├── dashboard.html      # 後台表單總覽、狀態開關與編輯進入點
│   ├── builder.html        # 拖拉式表單建構與二次編輯器 (必/選填、單/複選)
│   ├── responses.html      # 平均作答時間統計、摘要圖表、交叉條件分析與回應管理
│   └── response-detail.html# 單筆回應獨檢 (含個人作答費時)、單列印與刪除
├── css/
│   ├── main.css            # 核心視覺樣式
│   ├── print.css           # 列印專屬樣式表 (`@media print`)
│   └── charts.css          # 統計圖表與交叉分析儀表板樣式
├── js/
│   ├── config.js           # Supabase 初始化與驗證設定
│   ├── surveys.js          # 表單總覽邏輯
│   ├── survey-detail.js    # 隱私條款門檻驗證、計時開始/送出與作答頁邏輯
│   ├── builder.js          # 後台建構與二次編輯邏輯 (必/選填、單/複選切換)
│   ├── admin-charts.js     # Chart.js 統計圖表、平均作答時間與動態交叉篩選邏輯
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

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開放。
