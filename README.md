# 新竹縣第四屆兒童及少年諮詢代表官方網站 (Hsinchu County 4th Children and Youth Advisory Representatives Website)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosting: Cloudflare Pages](https://img.shields.io/badge/Hosting-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com/)

本專案為**新竹縣第四屆兒童及少年諮詢代表（以下簡稱「竹縣少代」）**之官方門戶網站、議題徵求中心、**自訂表單管理與列印系統**。網站旨在提供縣內兒少了解少代會運作機制與提案成果，並包含 `/surveys` 議題徵求中心、靈活權限控制與完整的回應管理/單獨列印/單獨刪除功能。

---

## 📌 專案定位與核心設計原則

1. **多元表單輸出與回應管理 (Print & Response Management)**
   - 🖨️ **空白表單列印**：支援將製作完成的表單匯出/列印為紙本格式（透過 `@media print` 優化列印排版）。
   - 🔍 **單筆回應查看與列印**：後台提供單一回應摘要的獨立查看與一鍵列印/PDF 匯出功能，方便少代開會討論或歸檔。
   - 🗑️ **單筆回應刪除**：管理者可後台篩選並單獨刪除無效或測試回應紀錄。

2. **靈活的表單公開與存取權限**
   - 🌐 **公開 (Public)**：顯示於 `/surveys` 列表中。
   - 🔑 **公開但需密碼 (Public with Password)**：顯示於 `/surveys` 列表中，需輸入授權密碼才可作答。
   - 🔒 **不公開 / 僅限連結 (Unlisted)**：隱藏於 `/surveys` 列表，僅限擁有專屬連結 (`/surveys/{uuid}`) 的對象作答。

3. **安全無密碼後台認證 (Admin Authentication Strategy)**
   - 採用 **Supabase Auth (Magic Link 免密碼信箱驗證)** 搭配 **`admin_users` 白名單**，免去幹部交接忘記密碼的痛點，安全性極高。

---

## 🔒 後台認證機制建議與評估 (Admin Auth Strategy)

為了讓少代幹部交接順暢且確保系統安全，後台認證方式比較與推薦如下：

| 認證方式 | 運作機制 | 優點 | 建議程度 |
| :--- | :--- | :--- | :--- |
| **Magic Link 免密碼登入 (推薦)** | 輸入管理員 Email 點擊信件連結即可登入 | 零密碼記憶負擔、防止弱密碼外洩、交接只需授權 Email 即可 | ⭐⭐⭐⭐⭐ **(最推薦)** |
| **Google OAuth 第三方登入** | 使用公用/個人 Google 帳號直接登入 | 登入極為迅速 | ⭐⭐⭐⭐ |
| **傳統帳號密碼登入** | 輸入帳號密碼登入 | 傳統熟悉 | ⭐⭐⭐ (交接易遺失密碼) |

### 🔒 最佳實踐：Magic Link + Admin 白名單驗證 (RLS)
後台資料庫建立 `admin_users` 白名單表格，僅有在此清單內的 Email 登入時才能獲取管理員 RLS 存取權限：

```sql
-- 後台管理員白名單
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 只允許白名單內的帳號進行 RLS 權限放行
CREATE POLICY "Admin only access forms" ON public.forms
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));
```

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
│   • /admin/responses : 表單回應總覽、單筆回應查看/列印/單獨刪除      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🖨️ 列印與單筆回應管理機制 (Print & Individual Response Management)

### 1. 空白表單列印 (Print Blank Form)
在後台表單建構器中提供 `[🖨️ 列印/匯出 PDF 空白表單]` 功能，自動套用 `@media print` 專屬樣式，隱藏導覽列與按鈕，輸出極簡的紙本問卷排版。

```css
/* 專屬列印排版優化 */
@media print {
    .no-print, header, footer, .btn-group {
        display: none !important;
    }
    body {
        background: white;
        color: black;
        font-size: 12pt;
    }
    .form-card {
        box-shadow: none;
        border: none;
    }
}
```

### 2. 單筆回應查看、列印與刪除 (Individual Response Action)
在後台 `/admin/responses` 列表中，每一筆回應均提供以下操作操作按鈕：

```
┌────────────────────────────────────────────────────────────────────────┐
│  回應 #0815 | 填寫時間: 2026-08-18 22:30 | 狀態: 已完成                   │
│  ────────────────────────────────────────────────────────────────────  │
│  [ 👁️ 單獨查看 ]   [ 🖨️ 單獨列印/PDF ]   [ 🗑️ 單獨刪除 ]               │
└────────────────────────────────────────────────────────────────────────┘
```

#### SQL 刪除與單筆查詢邏輯：
- **單筆查詢 (SELECT)**:
  `SELECT * FROM form_submissions WHERE id = :submission_id;`
- **單筆刪除 (DELETE)**:
  `DELETE FROM form_submissions WHERE id = :submission_id;` （觸發 RLS 限管理員操作）。

---

## 🗄️ 資料庫模型設計 (Supabase Database Schema)

```sql
-- 1. 表單模式與主表
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

-- 2. 表單回應紀錄表
CREATE TABLE public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,               -- 格式: {"field_id": "回答內容"}
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 權限控管
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- 允許公眾作答
CREATE POLICY "Public submit responses" ON public.form_submissions
    FOR INSERT WITH CHECK (true);

-- 僅限管理員可查看與單獨刪除回應
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
│   ├── responses.html      # 表單回應總覽與篩選
│   └── response-detail.html# 單筆回應獨檢、單獨列印與單獨刪除
├── css/
│   ├── main.css            # 核心樣式
│   └── print.css           # `@media print` 專屬列印樣式表
├── js/
│   ├── config.js           # Supabase 初始化與驗證設定
│   ├── surveys.js          # 表單總覽邏輯
│   ├── survey-detail.js    # 作答頁與密碼邏輯
│   └── admin-responses.js  # 單筆回應查詢、列印與單刪邏輯
├── README.md               # 本專案架構說明
└── _redirects              # Cloudflare Pages 路由規則
```

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開放。
