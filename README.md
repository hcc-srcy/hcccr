# 新竹縣第四屆兒童及少年諮詢代表官方網站

[![Hosting: GitHub Pages](https://img.shields.io/badge/Hosting-GitHub%20Pages-222222)](https://hcc-srcy.github.io/hcccr/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-3fcf8e)](https://supabase.com/)

本專案是新竹縣第四屆兒童及少年諮詢代表（竹縣少代）的官方門戶與不定期兒少議題調查系統。前台提供固定網址問卷、隱私同意門檻及響應式填答介面；後台提供表單建構、QR Code、動態統計、單筆回應列印與刪除。

## 目前狀態

第一版可操作前端已完成，包含：

- 官方首頁、調查總覽、完整隱私條款及 GitHub Pages 自動部署。
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

### 取得瀏覽器端金鑰

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard) 建立專案。
2. 進入該專案的 **Project Settings → API**（新版介面可能顯示 **API Keys**）。
3. 複製 **Project URL**，以及 `sb_publishable_...` 開頭的 **Publishable key**；若專案仍使用舊版金鑰，則複製 `anon public` key。
4. 本機或非 GitHub Pages 部署可編輯 [`js/env.js`](js/env.js)：

```js
window.HCCCR_ENV = {
  SUPABASE_URL: "https://PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_...",
  SITE_URL: "",
};
```

正式 GitHub Pages 由 Actions Variables `HCCCR_SUPABASE_URL` 與 `HCCCR_SUPABASE_ANON_KEY` 在建置時注入，不需要把正式設定寫入本機示範環境。`SITE_URL` 留空時會依目前正式網域自動判斷。

Publishable/Anon Key 本來就會出現在瀏覽器端，安全性由 RLS 與資料庫函式控制。**請勿**填入 `service_role`、`sb_secret_...`、資料庫密碼或 Resend API Key。

### 初始化資料庫

1. 在 Supabase **SQL Editor → New query** 貼上並執行完整的 [`supabase/schema.sql`](supabase/schema.sql)。這會建立 `admin_users`、`forms`、`form_submissions`、RLS Policies、`pgcrypto` 與前台/後台 RPC。
2. 將管理員信箱以小寫加入白名單：

```sql
insert into public.admin_users (email)
values ('admin@example.org');
```

3. 到 **Authentication → Users → Add user** 建立相同信箱的 Auth 使用者。網站設定 `shouldCreateUser: false`，未預先建立的信箱不會透過登入頁自行註冊。
4. 到 **Authentication → URL Configuration** 設定：
   - Site URL：`https://hcc-srcy.github.io/hcccr`
   - Redirect URL：`https://hcc-srcy.github.io/hcccr/admin/dashboard.html`
   - 本機開發 Redirect URL：`http://localhost:8788/admin/dashboard.html`
5. 確認 **Authentication → Providers → Email** 已啟用 Email OTP / Magic Link。

### Resend SMTP

正式寄送 Magic Link 時，先在 Resend 驗證寄件網域並建立 API Key，再到 Supabase **Project Settings → Authentication → SMTP Settings** 啟用自訂 SMTP：

- Host：`smtp.resend.com`
- Port：`465`（TLS）或 `587`（STARTTLS）
- Username：`resend`
- Password：Resend API Key
- Sender email：Resend 已驗證網域下的寄件信箱

Resend API Key 只填在 Supabase SMTP 後台，不可寫入 GitHub 儲存庫。

## 資料安全設計

- 匿名使用者無法直接查詢 `forms` 或 `form_submissions` 資料表。
- 公開清單、單份問卷讀取及提交分別經由 `list_public_forms`、`get_public_form`、`submit_form` RPC。
- 密碼型問卷只保存 `pgcrypto` 雜湊；公開回應不會取得密碼欄位或雜湊。
- 後台資料表操作同時要求 Supabase Auth 身分及 `admin_users` 白名單。
- `form_submissions.duration_seconds` 由資料庫依起訖時間產生。

## 部署到 GitHub Pages

正式網址：<https://hcc-srcy.github.io/hcccr/>

[`pages.yml`](.github/workflows/pages.yml) 會在 `main` 每次推送後執行 `npm run build:pages`，建立含 `/hcccr` 子路徑與 `404.html` 相容層的靜態成品，再自動部署至 GitHub Pages。GitHub Pages 不支援 Cloudflare `_redirects`，因此其問卷連結使用 `survey-detail.html?id={slug}`；既有 `/surveys/{slug}` 分享網址則由 `404.html` 相容處理。

若 `js/env.js` 尚未填入 Supabase URL 與 Publishable/Anon Key，線上網站會清楚標示為示範模式，填答不會進入正式資料庫。

### 自訂網域

目前規劃的自訂網域為 `hcccr.bond`。Cloudflare DNS 應新增根網域 CNAME：名稱 `@`、目標 `hcc-srcy.github.io`，並先設為 **DNS only**。DNS 生效後，在 GitHub Pages 設定 Custom domain，再將 Actions Variables 設為 `PAGES_BASE_PATH=/` 與 `PAGES_CUSTOM_DOMAIN=hcccr.bond`；部署腳本會自動建立 `CNAME` 成品並將所有資源切換至網域根路徑。

## 部署到 Cloudflare Pages（選用）

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
├── scripts/build-github-pages.js
├── .github/workflows/pages.yml
├── _redirects
└── _headers
```

## 素材授權

首頁關西鎮牛欄河親水公園照片來自 Wikimedia Commons 的 [Guanxi Township in Hsinchu County Wikivoyage Banner](https://commons.wikimedia.org/wiki/File:Guanxi_Township_in_Hsinchu_County_Wikivoyage_Banner.jpg)，作者 Yuriy kosygin，依 CC BY-SA 4.0 使用；網站頁尾保留來源標示。

## 維護規範

開發前請先閱讀 [`AGENTS.md`](AGENTS.md) 與 [`TERMS.md`](TERMS.md)。架構或資料處理方式變更時，三份文件必須同步更新。Commit 訊息使用 `feat:`、`fix:`、`docs:` 或 `style:` 前綴。
