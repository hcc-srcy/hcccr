# 新竹縣第四屆兒童及少年諮詢代表官方網站

[![Hosting: Cloudflare Pages](https://img.shields.io/badge/Hosting-Cloudflare%20Pages-f38020)](https://pages.cloudflare.com/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-3fcf8e)](https://supabase.com/)

本專案是新竹縣第四屆兒童及少年諮詢代表（竹縣少代）的官方門戶與不定期兒少議題調查系統。前台提供固定網址問卷、隱私同意門檻及響應式填答介面；後台提供表單建構、QR Code、動態統計、單筆回應列印與刪除。

## 目前狀態

第一版可操作前端已完成，包含：

- 官方首頁、調查總覽、完整隱私條款及 Cloudflare Pages 路由。
- `public`、`public_password`、`unlisted` 三種存取模式。
- 同意條款後才解除題目鎖定，並記錄 `started_at`、`submitted_at` 與作答費時。
- 單選、複選、簡答、長答及日期題型，含必填驗證與空白問卷列印。
- Magic Link 後台入口、調查儀表板、拖曳式題目排序及固定網址 QR Code。
- 摘要圖表、就讀階段交叉篩選、個別回應、明細表格、單筆列印及刪除。
- 未設定 Supabase 時自動進入示範模式，測試資料只存在目前分頁的 `sessionStorage`。

示範模式用於介面開發及驗收，不是正式資料儲存。正式發布前必須完成 Supabase 與管理員白名單設定。

## 本機執行

本專案沒有建置步驟。因為固定網址需要路由重寫，建議使用 Cloudflare Pages 本機伺服器：

```bash
npx wrangler pages dev .
```

開啟顯示的本機網址後，可使用下列路徑：

| 路徑 | 用途 |
| --- | --- |
| `/` | 官方首頁 |
| `/surveys` | 公開調查總覽 |
| `/surveys/{uuid-or-slug}` | 固定網址作答頁 |
| `/terms` | 隱私權與服務條款 |
| `/admin/` | Magic Link 管理員登入 |

示範問卷：

- `/surveys/normal-teaching-2026`
- `/surveys/school-lunch-2026`，活動密碼為 `2026`
- `/surveys/representative-preview`，不顯示於總覽的直連問卷

示範模式下，在 `/admin/` 輸入任意格式正確的電子郵件即可預覽後台。

## Supabase 設定

1. 建立 Supabase 專案，在 SQL Editor 執行 [`supabase/schema.sql`](supabase/schema.sql)。
2. 將管理員信箱以小寫加入白名單：

```sql
insert into public.admin_users (email)
values ('admin@example.org');
```

3. 編輯 [`js/env.js`](js/env.js)，填入專案 URL、Anon Key 及正式網站網址：

```js
window.HCCCR_ENV = {
  SUPABASE_URL: "https://PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_KEY",
  SITE_URL: "https://example.pages.dev",
};
```

4. 在 Supabase Authentication 設定 Site URL，並將本機與正式 `/admin/dashboard.html` 加入 Redirect URLs。
5. 在 Supabase Auth 的 SMTP 設定中連接 Resend。Magic Link 由 Supabase Auth 產生，Resend 負責郵件傳送。

Supabase Anon Key 本來就會出現在瀏覽器端；安全性由 RLS 與資料庫函式控制。請勿將 `service_role` key、Resend API Key 或其他伺服器密鑰放進本專案。

## 資料安全設計

- 匿名使用者無法直接查詢 `forms` 或 `form_submissions` 資料表。
- 公開清單、單份問卷讀取及提交分別經由 `list_public_forms`、`get_public_form`、`submit_form` RPC。
- 密碼型問卷只保存 `pgcrypto` 雜湊；公開回應不會取得密碼欄位或雜湊。
- 後台資料表操作同時要求 Supabase Auth 身分及 `admin_users` 白名單。
- `form_submissions.duration_seconds` 由資料庫依起訖時間產生。

## 部署到 Cloudflare Pages

- Framework preset：`None`
- Build command：留空
- Build output directory：`.`
- Production branch：`main`

[`_redirects`](_redirects) 提供固定網址重寫，[`_headers`](_headers) 提供基本安全標頭及快取規則。推送到連接的 GitHub 儲存庫後，Cloudflare Pages 會自動部署。

## 專案結構

```text
.
├── index.html
├── surveys.html
├── survey-detail.html
├── terms.html
├── admin/
│   ├── index.html
│   ├── dashboard.html
│   ├── builder.html
│   ├── responses.html
│   └── response-detail.html
├── assets/
├── css/
│   ├── main.css
│   ├── surveys.css
│   ├── admin.css
│   ├── charts.css
│   └── print.css
├── js/
│   ├── env.js
│   ├── config.js
│   ├── data.js
│   ├── data-service.js
│   └── 頁面互動程式
├── supabase/schema.sql
├── _redirects
└── _headers
```

## 素材授權

首頁關西鎮牛欄河親水公園照片來自 Wikimedia Commons 的 [Guanxi Township in Hsinchu County Wikivoyage Banner](https://commons.wikimedia.org/wiki/File:Guanxi_Township_in_Hsinchu_County_Wikivoyage_Banner.jpg)，作者 Yuriy kosygin，依 CC BY-SA 4.0 使用；網站頁尾保留來源標示。

## 維護規範

開發前請先閱讀 [`AGENTS.md`](AGENTS.md) 與 [`TERMS.md`](TERMS.md)。架構或資料處理方式變更時，三份文件必須同步更新。Commit 訊息使用 `feat:`、`fix:`、`docs:` 或 `style:` 前綴。
