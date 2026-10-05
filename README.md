# 新竹縣兒少諮詢代表官方網站

[![Website](https://img.shields.io/badge/Website-hcccr.bond-365b48)](https://hcccr.bond/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/hcc-srcy/hcccr/pages.yml?branch=main&label=GitHub%20Pages)](https://github.com/hcc-srcy/hcccr/actions/workflows/pages.yml)
[![License](https://img.shields.io/badge/License-MIT-2f2820)](LICENSE)

新竹縣兒少諮詢代表（竹縣兒少代表團）的官方門戶、兒少議題調查與內容管理系統。網站受新竹縣政府社會處指導，由兒少代表團維運，提供議題調查、政策提案追蹤、兒童權利資訊、代表介紹與公開聯絡管道。

- 正式網站：<https://hcccr.bond/>
- 原始碼：<https://github.com/hcc-srcy/hcccr>
- 主要部署：GitHub Pages
- 資料與認證：Supabase

## 專案功能

### 公開網站

- 響應式首頁、代表介紹、兒童權利公約、提案進度、聯絡與隱私條款頁面。
- 議題調查總覽與固定分享網址。
- `public`、`public_password`、`unlisted` 三種問卷可見性。
- 單選、複選、簡答、長答、日期與區段題型。
- 類似 Google 表單的區段與條件式跳轉，支援前往指定區段、結束不計入與確認後直接送出。
- 填答前隱私告知與同意門檻；只驗證、保存實際可到達路徑上的答案。
- 公開聯絡表單及具權杖的雙向對話頁面。
- canonical、Open Graph、Twitter Card、JSON-LD、sitemap、RSS 與明確的索引邊界。

### 管理後台

- Supabase Magic Link 登入與 `admin_users` 白名單雙重驗證。
- 問卷建立、編輯、排序、開放期間、密碼保護、固定網址與 QR Code。
- 摘要圖表、交叉條件篩選、個別回應與明細表格。
- 在已授權的瀏覽器端匯出 `.xlsx`，不經第三方轉檔服務。
- 空白問卷及單筆回應列印、單筆回應刪除。
- 聯絡收件匣、狀態管理、主動發起訊息與雙向回覆。
- 首頁、聯絡頁、隱私條款、代表名單、照片與提案時間軸內容管理。

## 技術架構

本專案沒有前端框架，公開頁與後台皆以靜態 HTML、Vanilla CSS 和瀏覽器 JavaScript 實作。正式部署時才由建置腳本產生 GitHub Pages 成品。

| 層級 | 技術與用途 |
| --- | --- |
| 前端 | HTML、Vanilla CSS、JavaScript |
| 資料庫 | Supabase PostgreSQL、JSONB |
| 權限 | Supabase Auth、RLS、Security Definer RPC |
| 檔案 | Supabase Storage `team-photos` |
| 圖表 | Chart.js |
| Excel | ExcelJS，僅在管理員瀏覽器端產生 |
| 圖示 | Lucide |
| 郵件 | Resend SMTP，供 Supabase Auth 寄送 Magic Link |
| 部署 | GitHub Actions、GitHub Pages、自訂網域 |
| 測試 | HTML Validate、Playwright（桌機與手機） |

前端資料存取統一經過 [`js/data-service.js`](js/data-service.js)：設定 Supabase 時使用正式資料庫，未設定時切換至瀏覽器 `sessionStorage` 示範模式。

## 快速開始

### 環境需求

- Node.js 20 或更新版本
- npm
- Chrome（執行 Playwright 測試時使用）

### 安裝與啟動

```bash
git clone https://github.com/hcc-srcy/hcccr.git
cd hcccr
npm ci
npm run dev
```

開啟 <http://127.0.0.1:8788/>。本機伺服器由 Wrangler 提供，因此 `/surveys/{slug}` 等路由可依 [`_redirects`](_redirects) 正常重寫。

常用指令：

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 於 `127.0.0.1:8788` 啟動本機網站 |
| `npm run validate:html` | 驗證所有公開頁與後台 HTML |
| `npm test -- --workers=1` | 執行桌機與手機 Playwright 測試 |
| `npm run build:pages` | 產生 GitHub Pages 成品至 `.site/` |

### 示範模式

[`js/env.js`](js/env.js) 未設定 Supabase 時，網站會明確標示為示範模式。新增、填答與刪除資料只保留在目前分頁的 `sessionStorage`，關閉分頁後即失效。

可用的示範調查包含：

- `/surveys/normal-teaching-2026`
- `/surveys/school-lunch-2026`，活動密碼為 `2026`
- `/surveys/representative-preview`，不顯示於總覽的直連問卷
- `/surveys/exam-frequency-eighth-period-2026`
- `/surveys/teacher-exam-eighth-period-2026`

示範模式下可在 `/admin/` 輸入任意格式正確的 Email 預覽後台，不會寄出登入信。

## 主要路由

| 路徑 | 用途 | 搜尋引擎收錄 |
| --- | --- | --- |
| `/` | 官方首頁 | 是 |
| `/surveys` | 議題調查總覽 | 是 |
| `/surveys/{slug}` | 動態調查作答頁 | 僅目前開放的 `public` 問卷 |
| `/team.html` | 代表團介紹 | 是 |
| `/team-member.html?id={id}` | 代表個人頁 | 否 |
| `/rights.html` | 兒童權利公約 | 是 |
| `/proposals.html` | 提案進度 | 是 |
| `/contact` | 公開聯絡表單 | 是 |
| `/message-thread.html` | 具權杖的聯絡對話 | 否 |
| `/terms` | 隱私權與服務條款 | 是 |
| `/admin/` | 管理員登入與後台 | 否 |

## Supabase 設定

### 1. 建立資料庫

在 Supabase Dashboard 的 **SQL Editor** 執行完整的 [`supabase/schema.sql`](supabase/schema.sql)。腳本可重複執行，會建立或更新：

- `admin_users`
- `forms`
- `form_submissions`
- `site_content`
- `contact_messages`
- `message_replies`
- RLS Policies 與公開／管理 RPC
- `pgcrypto` extension
- `team-photos` Storage bucket 與存取政策

重新執行最新版 schema 不會主動刪除既有問卷或回應。問卷區段保存在 `forms.fields` JSONB，不需另建資料表。

### 2. 設定管理員

先以小寫 Email 加入白名單：

```sql
insert into public.admin_users (email)
values ('admin@example.org');
```

接著到 **Authentication → Users → Add user** 建立相同 Email 的 Auth 使用者。可加入多位管理員，每位都必須同時存在於 Auth Users 與 `admin_users`。

網站使用 `shouldCreateUser: false`，未預先建立的信箱無法從登入頁自行註冊。

### 3. 設定 Auth 網址

在 **Authentication → URL Configuration** 設定：

- Site URL：`https://hcccr.bond`
- Redirect URL：`https://hcccr.bond/admin/dashboard.html`
- 本機 Redirect URL：`http://localhost:8788/admin/dashboard.html`

並確認 **Authentication → Providers → Email** 已啟用 Email OTP / Magic Link。

### 4. 設定瀏覽器端公開金鑰

在 **Project Settings → API Keys** 取得：

- Project URL，例如 `https://PROJECT_REF.supabase.co`
- `sb_publishable_...` Publishable key；舊專案可使用 `anon public` key

本機可編輯 [`js/env.js`](js/env.js)：

```js
window.HCCCR_ENV = {
  SUPABASE_URL: "https://PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_...",
  SITE_URL: "",
};
```

Publishable／Anon Key 本來就會出現在瀏覽器與 Network 面板。資料安全必須由 RLS、RPC 與管理員白名單保證，而不是隱藏公開金鑰。

絕對不要把以下資料寫入前端或 GitHub：

- `service_role` key
- `sb_secret_...` key
- Supabase 資料庫密碼
- Resend API Key

### 5. 設定 Magic Link 寄信

正式環境建議使用 Resend 自訂 SMTP。先在 Resend 驗證寄件網域，再到 Supabase **Authentication → Email / SMTP Settings** 設定：

| 欄位 | 值 |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465`（TLS）或 `587`（STARTTLS） |
| Username | `resend` |
| Password | Resend API Key |
| Sender email | Resend 已驗證網域下的信箱 |

Resend API Key 只存放於 Supabase SMTP 設定。

## 資料安全邊界

- 匿名訪客不得直接 `SELECT forms`、`form_submissions` 或 `contact_messages`。
- 公開問卷清單、問卷讀取與提交分別經 `list_public_forms`、`get_public_form`、`submit_form` RPC。
- 密碼型問卷只保存 `pgcrypto` 雜湊，不保存明碼。
- `submit_form` 會在資料庫端重算條件式路徑，拒絕偽造的 `screenout` 提交，只保存可到達題目的答案。
- 後台操作同時要求有效 Supabase Auth Session 與 `admin_users` 白名單。
- 匿名聯絡只能透過 `submit_contact_message` RPC 寫入，不能讀取其他人的訊息。
- `site_content` 只保存公開文字；前台使用 `textContent` 輸出，不渲染任意 HTML。
- Excel 在管理員瀏覽器內產生，原始回應不會傳至第三方轉檔服務。

完整資料使用規則請閱讀 [`TERMS.md`](TERMS.md)。

## GitHub Pages 部署

推送到 `main` 後，[`.github/workflows/pages.yml`](.github/workflows/pages.yml) 會：

1. 使用 Node.js 20 執行 `npm run build:pages`。
2. 將公開 Supabase 設定與網址設定注入 `.site/js/env.js`。
3. 依部署網址重寫資源路徑、canonical、Open Graph 與 JSON-LD URL。
4. 產生 `robots.txt`、`sitemap.xml`、`feed.xml`、`404.html` 與 `.nojekyll`。
5. 將 `.site/` 部署至 GitHub Pages。

Repository **Settings → Secrets and variables → Actions → Variables** 需要設定：

| Variable | 正式站設定 | 用途 |
| --- | --- | --- |
| `HCCCR_SUPABASE_URL` | Supabase Project URL | 正式資料庫網址 |
| `HCCCR_SUPABASE_ANON_KEY` | Publishable／Anon Key | 瀏覽器公開 API key |
| `PAGES_BASE_PATH` | `/` | 自訂網域的根路徑 |
| `PAGES_CUSTOM_DOMAIN` | `hcccr.bond` | 產生 CNAME 與正式 SEO URL |

沒有自訂網域時，將 `PAGES_CUSTOM_DOMAIN` 留空，`PAGES_BASE_PATH` 設為 `/hcccr`，正式網址即為 `https://hcc-srcy.github.io/hcccr/`。

建置時若 Supabase 暫時無法連線，仍會產生有效的靜態 sitemap 與 RSS，不會讓部署失敗。只有目前開放的 `public` 問卷會加入 sitemap 與 RSS。

### 自訂網域

目前網域為 `hcccr.bond`：

- Cloudflare DNS：根網域 `@` CNAME 指向 `hcc-srcy.github.io`
- Proxy status：`DNS only`
- GitHub Pages Custom domain：`hcccr.bond`
- Actions Variables：`PAGES_BASE_PATH=/`、`PAGES_CUSTOM_DOMAIN=hcccr.bond`

更換網域時，需同步調整 DNS、GitHub Pages Custom domain、上述 Actions Variables，以及 Supabase Auth 的 Site URL 與 Redirect URL。

### Cloudflare Pages（選用）

專案仍保留 Cloudflare Pages 相容檔案：

- Framework preset：`None`
- Build command：留空
- Build output directory：`.`
- Production branch：`main`

[`_redirects`](_redirects) 負責漂亮網址重寫，[`_headers`](_headers) 提供安全標頭、快取與禁止索引規則。

## SEO 與索引規則

- 公開靜態頁提供 canonical、Open Graph、Twitter Card、JSON-LD 與 RSS 自動探索。
- 動態問卷預設 `noindex`，載入後只有目前開放的 `public` 問卷可切換為 `index`。
- `public_password`、`unlisted`、未開始、已截止與暫停問卷不加入 sitemap 或 RSS。
- 後台、個別回應、代表個人頁、含權杖的聯絡對話與列印頁不得被索引。
- 網站不因 SEO 加入 Google Analytics、廣告像素或跨站追蹤器。

## 專案結構

```text
.
├── index.html                 # 首頁
├── surveys.html              # 調查總覽
├── survey-detail.html        # 動態調查頁／Pages 404 相容層來源
├── team.html                 # 代表團介紹
├── team-member.html          # 代表個人頁
├── rights.html               # 兒童權利公約
├── proposals.html            # 提案進度
├── contact.html              # 公開聯絡表單
├── message-thread.html       # 具權杖的雙向對話
├── terms.html                # 網頁版隱私條款
├── admin/                    # 登入、問卷、分析、收件匣與內容管理
├── assets/                   # Logo、WebP 主視覺與社群預覽圖
├── css/
│   ├── main.css              # 公開網站設計系統
│   ├── surveys.css           # 問卷工作區
│   ├── admin.css             # 管理工作區
│   ├── charts.css            # 統計圖表
│   └── print.css             # 列印樣式
├── js/
│   ├── env.js                # 本機公開環境設定
│   ├── config.js             # 網址與部署路徑設定
│   ├── data.js               # 示範問卷與回應
│   ├── data-service.js       # Supabase／示範模式資料介面
│   └── ...                   # 各頁互動程式
├── supabase/schema.sql       # 資料表、RLS、RPC 與 Storage 政策
├── scripts/build-github-pages.js
├── tests/site.spec.js
├── .github/workflows/pages.yml
├── AGENTS.md                 # AI 開發與協作規範
└── TERMS.md                  # 個資保護與服務條款原始文件
```

## 開發與共編規範

開始修改前請閱讀 [`AGENTS.md`](AGENTS.md) 與 [`TERMS.md`](TERMS.md)。多人共編時建議依序執行：

```bash
git fetch origin
git pull --ff-only origin main
npm run validate:html
npm run build:pages
npm test -- --workers=1
```

推送前再次 `git fetch origin`，確認沒有新的遠端提交。Commit 訊息使用：

- `feat: ...` 新增功能
- `fix: ...` 修復錯誤
- `docs: ...` 更新文件
- `style: ...` 調整介面與樣式

架構、資料處理或隱私行為有變更時，必須同步檢查 `README.md`、`TERMS.md` 與 `AGENTS.md`。

## 授權與素材

程式碼依 [`LICENSE`](LICENSE) 所載 MIT License 授權。

首頁關西鎮牛欄河親水公園照片來自 Wikimedia Commons 的 [Guanxi Township in Hsinchu County Wikivoyage Banner](https://commons.wikimedia.org/wiki/File:Guanxi_Township_in_Hsinchu_County_Wikivoyage_Banner.jpg)，作者 Yuriy kosygin，依 CC BY-SA 4.0 使用；網站頁尾保留來源標示。
