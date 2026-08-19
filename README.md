# 新竹縣第四屆兒童及少年諮詢代表官方網站 (Hsinchu County 4th Children and Youth Advisory Representatives Website)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosting: Cloudflare Pages](https://img.shields.io/badge/Hosting-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com/)

本專案為**新竹縣第四屆兒童及少年諮詢代表（以下簡稱「竹縣少代會」）**之官方門戶與**不定期兒少議題調查系統 (Youth Issue Survey System)**。旨在針對縣內兒少關心之議題（如各校教學正常化調查、學生權益、校園設施等）發起不定期問卷研究。支援**固定網址 (`/surveys/{uuid}`) 與長效/實體海報 QR Code 宣傳**，前後台與作答均提供媲美 **Google 表單 (Google Forms)** 的極致流暢操作體驗。

---

## 📌 專案定位與核心設計原則

1. **🔗 固定網址與 QR Code 長效宣傳 (Fixed Survey URLs & QR Codes)**
   - **固定專屬網址**：每份調查均具備固定永久的網址 (`/surveys/{uuid}` 或 `/surveys/{slug}`)，可長期放置於官網或進行宣傳。
   - **實體海報/簡報 QR Code**：後台可一鍵生成固定網址之 QR Code 圖片，方便印製於傳單、海報或於各校推廣。

2. **📝 媲美 Google 表單的極致操作體驗 (Google Forms-like UX)**
   - **後台 (Admin Builder)**：視覺化卡片式表單建構器，支援拖拉排序、題型選擇（單選、複選、簡答、長答、日期、檔案上傳）、必選填切換與實時預覽。
   - **前台 (Respondent View)**：質感卡片式作答介面，清晰標示必填題目，填答過程順暢、響應式適配手機與電腦。

3. **🏫 專為不定期專題調查設計 (Periodic Issue Surveys)**
   - 少代幹部可針對各類專題（例如：「新竹縣各校教學正常化實況調查」、「國高中學生課業壓力調查」）快速發起調查。
   - 提供 `/surveys` 議題調查總覽頁與 `/surveys/{uuid}` 專屬作答網址。

4. **🔒 三種權限控管與前置隱私條款門檻**
   - 🌐 **公開 (Public)** / 🔑 **公開但需密碼 (Public Password)** / 🔒 **不公開連結 (Unlisted)**。
   - **擋在最前面**：填答前強制呈現《個資蒐集告知暨隱私權條款》勾選門檻。

5. **📊 摘要圖表與動態交叉條件篩選 (Analytics & Cross-Filtering)**
   - 自動生成圓餅圖與長條圖，支援按學校/就讀階段（如：「篩選國中」）即時動態連動重繪其餘題目之統計圖表。
   - 計算全體「平均作答時間」，並記錄 `started_at` 與 `submitted_at`。

6. **🖨️ 單筆與空白表單列印管理 (Print & Individual Response Actions)**
   - 支援空白問卷一鍵列印（`@media print`）、單筆回應獨檢、一鍵列印/PDF 匯出與單獨刪除。

7. **安全無密碼後台認證 (Admin Auth Strategy)**
   - 採用 **Supabase Auth (Magic Link 免密碼信箱驗證)** 搭配 **`admin_users` 白名單**。

---

## 🗺️ 頁面架構與作答流程 (Routing & Consent Flow)

```
┌───────────────────────────────────────────────────────────────────┐
│                          / (首頁 靜態門戶)                         │
│   • 介紹第四屆少代、組織架構、歷年提案與最新消息                     │
│   • 醒目按鈕：[前往兒少議題調查中心 ➔] (導向 /surveys)               │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                      /surveys (議題調查總覽頁)                     │
│   • 展示目前開放之專題調查（例如：各校教學正常化調查）              │
│   • 標示「已編輯 (Edited)」狀態與最後更新時間                     │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ 點擊問卷卡片 或 固定網址 / 海報 QR Code
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     /surveys/{uuid} (固定網址作答頁)               │
│                                                                   │
│   📌 步驟 1【同意條款並觸發計時開始】:                              │
│      [✓] 我已閱讀並同意《新竹縣少代個資蒐集與隱私權保護條款》      │
│      ➔ 自動記錄 started_at                                        │
│                                                                   │
│   📌 步驟 2【Google 表單體驗作答】:                                 │
│      - 驗證「必填 (Required)」、「單選」與「複選」                 │
│                                                                   │
│   📌 步驟 3【送出表單並記錄結束時間】:                              │
│      ➔ 自動記錄 submitted_at & 計算作答費時                        │
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
    slug VARCHAR(100) UNIQUE,                          -- 固定自訂網址代碼 (例如: /surveys/normal-teaching-2026)
    visibility form_visibility_enum DEFAULT 'public',
    access_password VARCHAR(255),
    require_terms_consent BOOLEAN DEFAULT true,       -- 是否要求同意隱私權條款
    is_open BOOLEAN DEFAULT true,                     -- 是否開放填寫
    is_edited BOOLEAN DEFAULT false,                  -- 是否曾經編輯過 (顯示「已編輯」)
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
├── index.html              # 首頁 (靜態門戶與 [前往議題調查] 按鈕)
├── surveys.html            # /surveys - 議題調查總覽頁面
├── survey-detail.html      # /surveys/{uuid} - 固定網址/Google 表單體驗作答頁
├── terms.html              # 全站個人資料保護與隱私權條款全文
├── admin/
│   ├── index.html          # 後台 Magic Link 無密碼登入
│   ├── dashboard.html      # 後台調查總覽、狀態開關與編輯進入點
│   ├── builder.html        # 類 Google 表單拖拉式建構器 & 固定網址/海報 QR Code 產生
│   ├── responses.html      # 摘要圖表、交叉條件分析與回應管理
│   └── response-detail.html# 單筆回應獨檢、單列印與刪除
├── css/
│   ├── main.css            # 核心視覺樣式
│   ├── print.css           # 列印專屬樣式表 (`@media print`)
│   └── charts.css          # 統計圖表與交叉分析儀表板樣式
├── js/
│   ├── config.js           # Supabase 初始化與驗證設定
│   ├── surveys.js          # 調查總覽邏輯
│   ├── survey-detail.js    # Google 表單作答、條款與時間追蹤邏輯
│   ├── builder.js          # 後台表單建構、編輯與固定網址/QR Code 生成邏輯
│   ├── admin-charts.js     # Chart.js 統計圖表與動態交叉篩選邏輯
│   └── admin-responses.js  # 單筆回應查詢、列印與單刪邏輯
├── README.md               # 本專案架構說明
└── _redirects              # Cloudflare Pages 路由規則
```

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開放。
