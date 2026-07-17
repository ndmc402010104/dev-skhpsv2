# 暖砂 Warm Sand — SKHPS 主題規格書 v1.0

- 定案日：2026-07-17（使用者從五個方向選出「暖砂鼠尾草」深化版後拍板定稿）
- 主題名：**暖砂**（slug：`warm-sand`）
- 視覺樣品：
  - 五方向樣品間（歷史紀錄）：https://claude.ai/code/artifact/42f49048-bc69-499a-ad33-fe967f982dc4
  - **暖砂深化版（實作依據）**：https://claude.ai/code/artifact/e0f4c638-8f84-409a-b9fc-e56d642eb8d4
- 本文件是實作的唯一規格來源。實作時若規格與樣品衝突，以本文件為準。

## 0. 一句話定位

暖砂底、鼠尾草綠為主、赤陶只當點綴——「好按好讀的精品診所」。
日常介面保持溫暖；診斷/儀器面板才掀開暗色引擎蓋。

## 1. 設計原則（六條，實作時逐條對照）

1. **赤陶降量提純**：`--terra` 只用在 eyebrow、輔助連結、差異徽章這類小點綴，
   絕不做大面積底色或主要按鈕。
2. **語意色 ≠ 品牌色**：成功/警告/錯誤有自己的色票，不挪用鼠尾草綠。
3. **數字一律 mono ＋ `tabular-nums`**：表格數字、時間、版本號、毫秒數全部適用。
4. **暗色只住在儀器區**：Runtime 診斷面板用「暖石墨」（帶暖棕的深色，不是冷藍黑），
   與暖砂同一家族；一般頁面永遠亮面暖砂。
5. **不變項**：統一 header／footer、footer runtime 儀表列（PAGE/RUNTIME/版本/狀態燈）
   全數保留——是裱起來，不是拿掉。
6. **hover 有生命但克制**：卡片 `translateY(-2px)`、按鈕變深一階；
   全站尊重 `prefers-reduced-motion`。

## 2. Design Tokens（可直接貼的 CSS custom properties）

```css
:root {
  /* — 基底 — */
  --skhps-bg: #FAF5EC;            /* 暖砂底 */
  --skhps-surface: #FFFDF8;       /* 卡片/欄位面 */
  --skhps-ink: #38332B;           /* 主文字（暖墨） */
  --skhps-muted: #7C7365;         /* 次要文字 */
  --skhps-line: #ECE3D2;          /* hairline */
  --skhps-line-strong: #DFD4BE;   /* 輸入框/分隔強線 */

  /* — 品牌 — */
  --skhps-sage: #587F5C;          /* 主色（鼠尾草） */
  --skhps-sage-hover: #48704E;
  --skhps-on-sage: #F7F5EC;       /* 主色上的文字 */
  --skhps-tint: #EBF1E7;          /* 鼠尾草 tint（chips/選中列/次要鈕底） */
  --skhps-terra: #C0714F;         /* 點綴（赤陶）——遵守原則 1 */
  --skhps-terra-tint: #F7EAE2;

  /* — 語意 — */
  --skhps-ok: #589A62;
  --skhps-warn: #CB8B3A;
  --skhps-warn-tint: #F7EDD6;
  --skhps-warn-bd: #E4C98C;
  --skhps-err: #B4543E;
  --skhps-err-tint: #F6E7E1;
  --skhps-err-bd: #DFA894;
  /* 中性狀態（已結束）：bg #F1EBDD / 字 #8A8070 / 點 #B9AE97 */

  /* — 表格 — */
  --skhps-th-band: #F6F0E3;       /* 表頭砂色帶 */
  --skhps-row-hover: #FBF7EE;

  /* — 幾何 — */
  --skhps-r-card: 18px;
  --skhps-r-btn: 13px;
  --skhps-r-btn-sm: 10px;
  --skhps-r-input: 12px;
  --skhps-r-modal: 20px;
  --skhps-r-pill: 999px;
  --skhps-shadow: 0 8px 26px rgba(90, 77, 55, .10);
  --skhps-shadow-lift: 0 16px 44px rgba(90, 77, 55, .16);

  /* — 焦點環 — */
  --skhps-focus-ring: 0 0 0 3px rgba(88, 127, 92, .16);   /* 配 border 變 sage */
  --skhps-err-ring: 0 0 0 3px rgba(180, 84, 62, .12);

  /* — 字體 — */
  --skhps-font: "Segoe UI", "Microsoft JhengHei UI", "Microsoft JhengHei",
                "Noto Sans TC", system-ui, sans-serif;
  --skhps-mono: "Cascadia Code", ui-monospace, Consolas, monospace;

  /* — 暗色儀器面板（只給診斷/儀器區用） — */
  --skhps-panel: #201C16;         /* 暖石墨底 */
  --skhps-panel-card: #282318;
  --skhps-panel-line: #3A3222;
  --skhps-panel-ink: #E9E0CC;
  --skhps-panel-mono: #D9CFB6;
  --skhps-panel-ok: #7FC08A;      /* 發光燈：box-shadow: 0 0 9px 0 currentColor 同色 */
  --skhps-panel-warn: #DBA84E;

  /* — Toast — */
  --skhps-toast-bg: #38332B;      /* 深墨（= ink） */
  --skhps-toast-ink: #F4EFE4;
}
```

### 字階（type scale）

| 角色 | 規格 |
|---|---|
| 頁面大標 h1 | clamp(26px, 4vw, 34px) / 1.35 / w720 / `text-wrap: balance` |
| 區塊標 h2 | 21px / w720 |
| 卡標 h3 | 16.5–18px / w700–720 |
| 本文 | 15.5px / 1.7 |
| eyebrow | 11.5px / w700 / letter-spacing .26em / 色 `--skhps-terra` |
| 表單 label | 12px / w680 / letter-spacing .08em / 色 muted |
| 表格 th | 12px / w680 / letter-spacing .08em / 底 `--skhps-th-band` |
| 表格 td | 14px；數字欄 mono 13px 右對齊 `tabular-nums` |
| runtime/mono 資訊 | 10.5–12px mono / letter-spacing .05em |

## 3. 元件配方（狀態齊全才算完成）

- **按鈕**（padding 11px 20px、radius `--skhps-r-btn`、w660、border 1.5px transparent）
  - primary：sage 底 on-sage 字；hover 換 `--skhps-sage-hover`
  - secondary：`--skhps-tint` 底 sage 字；hover `#DFEAD9`
  - ghost：透明底 ink 字 `--skhps-line-strong` 框；hover 框字轉 sage
  - danger：`--skhps-err-tint` 底 err 字；hover `#F0D8CE`
  - disabled：opacity .45 + not-allowed；small 版：12.5px / 7px 13px / radius 10
- **輸入框**：surface 底、`--skhps-line-strong` 1.5px 框、radius `--skhps-r-input`；
  focus＝框轉 sage＋`--skhps-focus-ring`；錯誤＝框轉 err＋`--skhps-err-ring`＋
  help 文字轉 err；disabled＝opacity .55；placeholder `#B6AC99`
- **開關 switch**：42×22 pill，off `--skhps-line-strong`／on sage，knob 18px 白
- **checkbox**：19px、radius 6、勾選＝sage 底 on-sage ✓
- **狀態 chips**（pill、12px w650、前置 6px 圓點）：
  進行中＝tint 底 sage 字 ok 點；未開始＝outline 灰；已結束＝中性砂；
  錯誤/同步異常＝err-tint 底 err 字
- **表格**：表頭砂色帶＋強線下緣；列 hover `--skhps-row-hover`；
  **選中列＝tint 底＋`inset 3px 0 0 var(--skhps-sage)` 左指示條**；
  數字欄右對齊 mono；外層必包 `overflow-x: auto`
- **工具列**：搜尋框＋篩選 pill chips（active＝sage 實底）＋主要動作鈕靠右
- **分頁**：30px 方圓鈕 mono 數字，active sage 實底
- **Modal**：overlay `rgba(56,51,43,.45)`＋`blur(2px)`；卡 radius 20、
  `--skhps-shadow-lift`；動作鈕右對齊（ghost 取消＋primary 確認）；
  Esc/點背景可關；開啟 focus 主鈕、關閉還原焦點
- **Toast**：深墨底暖白字、radius 14、底部置中浮出，2.4s 自動收；前置 ok 綠點
- **橫幅 banner**：warn＝琥珀 tint/bd；error＝赤陶紅 tint/bd＋右側 ghost 重試鈕
- **儀器面板（暗）**：暖石墨底；env chip＝mono 小框；狀態燈發光
  （`box-shadow: 0 0 9px 0 <燈色>`）；task 卡＝panel-card 底＋mono 名稱＋
  大號 mono 數值＋（可選）綠色差異徽章 `▼ was 5.2s`
- **footer runtime（亮面）**：底 `#F4EDDE`、上緣 hairline；mono segments
  （`PAGE PROD│RUNTIME DEV│…`）＋版本號置右＋狀態燈（ok 綠/警告琥珀）
- **簽到頁（手機）**：會議 chip（tint pill＋mono 時間）、h2 21px、
  全寬 primary 鈕（padding 14、radius 15、15.5px）、輔助連結用 terra

## 4. CSS Setting 2.0（使用者 2026-07-17 授權重寫；水庫原理不變）

**背景**：舊制是 property-level rows（一列＝一條宣告，全站 ~4600 列），
編輯零散、主題切換困難，使用者已宣告「那邊廢掉了」。
**唯一硬需求：CSS Setting 仍能集中控制頁面元件（水庫原理）。**

**新制（token-first、block-based）**：

1. **資料模型**：registry 從「property rows」改為兩種塊——
   - `tokens` 塊 ×1：即本文件 §2 的 `:root` custom properties（主題的全部個性）
   - `component` 塊 ×N：每個元件家族一塊完整 CSS 文字（`skhps-btn`、`skhps-card`、
     `skhps-table`…），**只准引用 token，不准出現裸色碼**（review 時 grep `#` 檢查）
2. **交付鏈完全沿用**：worker `getCssRegistryRuntime` → `css-sheet-runtime.js` 注入
   `#skhps-css-runtime-style` → localStorage/session 快取 → loading gate `css-runtime`
   task。runtime 現成支援 rows＋`CssRegistryPackage`（CSS 文字塊）雙軌，
   新制走文字塊軌道，舊 rows 軌道保留到遷移完成。
3. **主題切換＝換 tokens 塊**：未來要出「夜砂」深色版或活動主題，只動一塊。
4. **loading gate 同步換裝**：`assets/css/skhps-loading.css` 是獨立本地檔
   （不走 registry），必須同步改成暖砂色，否則開場→頁面會跳色。
5. **遷移策略（安全第一）**：
   - dev 先行（dev-skhps 站），prod 完全不動直到逐頁驗收
   - 新舊並存：新塊上線時舊 rows 仍在，出錯可秒退
   - **逐頁 Playwright 截圖驗證**（教訓紀錄：座標/數值穩定不代表視覺沒事，
     一定要看畫面）
   - 外部 App（qr-signin ×3 頁、quick-login、dressing-inventory、smoke）
     逐一驗收，各 App 自帶的補丁 CSS 可能要跟著調

## 4.5 主題切換地基（2026-07-17 補，讓「以後批次換主題」變成一個 UPDATE）

實作時發現現場其實有**兩套並行 token 系統**：`--skhps-*`（54 個，00/TOKENS）
與 `--sk-*`（45 個，01/TOKENS），數值常不一致（例如 shadow/radius）。今天不
重構統一成一套（風險/工作量都太大），改用「兩套都改寫成同一份暖砂值」讓不管
元件引用哪一套都換膚——但**建立以下慣例，讓未來要嘛統一成一套、要嘛整批換
主題，都只需要動 tokens package，不用碰 component package**：

- **Component package 只准引用 `var(--skhps-*)` / `var(--sk-*)`，不准寫死
  色碼／陰影／圓角**（review 時 grep 沒加 var() 包住的 `#`/`rgba(`）。
- **同一時間、同一 env，只有一個 `theme-tokens-*` package 是
  `enabled=true`**。換主題＝停用舊的、啟用（或新增）新的 tokens package
  ——一個 `saveCssRegistryPackage`（或直接 UPDATE enabled）就整站換膚，
  不用碰任何 component package。
- **命名慣例**：tokens package 一律 `packageKey: theme-tokens-<name>`
  （本主題＝`theme-tokens-warm-sand`），`sortOrder` 給低值（10）確保排在
  component package 之前（雖然理論上不影響——component 用 var() 不寫死值，
  順序只在極少數需要精確覆蓋時才重要）。`manifest.kind` 標
  `"theme-tokens"`、`manifest.themeName` 標主題名——沿用 Codex 在
  `skhps-v3-shell` package 已經用的 `manifest.kind:"component-package"`／
  `dependencies` 慣例，不是我方新發明。
- component package 的 `manifest.dependencies` 寫 `["theme-tokens"]`
  （邏輯依賴、非鎖定特定主題名），`manifest.kind:"component-package"`。
- 兩套既有 token 系統要不要收斂成一套，是**獨立、之後**的重構決定（牽動
  4000+ 列 component 規則的 var() 引用名，风险/工作量遠大於今天的換膚），
  這裡先不做，只確保現在的架構「撐得住」未來做這件事。

## 5. 實作順序建議（給實作 session 的 checklist）

1. 盤點現況：讀 `css-sheet-runtime.js` 全文＋worker `getCssRegistryRuntime`／
   CssRegistryPackage 的實際 schema（本規格只驗證過交付鏈存在，細節以碼為準）
2. Supabase 建新塊儲存（或沿用 package 表）；寫入 §2 tokens 塊
3. 依 §3 逐元件寫 component 塊（dev 驗一個上一個）
4. `skhps-loading.css` 換暖砂
5. skhpsv2 三頁（index/admin/tools）dev 驗收（截圖比對）
6. 外部 App 逐一驗收
7. 全綠後才討論上 prod（沿用 gated/分批策略）

> 實作使用 Sonnet（設計 Fable／實作 Sonnet 分工）。

## 6. 實作波次清單（2026-07-17 Fable 盤點 dev 現況後定的優先序）

**已完成（dev）**：tokens package（兩套命名空間同步換暖）、寫死色碼補丁
package、loading.css 換暖、v3 干擾 package 停用、156 列死列清除。
dev 站整體已是暖砂底＋鼠尾草綠，但以下是「還看得出工程感」的殘留。

### 第一波「門面完工」（高視覺報酬、低風險，一個 session 可完）

1. **入口卡片化**（工程感最大殘留）：首頁/後台的入口現在是整條大藥丸
   按鈕，改成深化版樣品的入口卡——tint 底 icon 方塊＋標題＋一行描述＋
   「進入 →」，`repeat(auto-fit, minmax(205px, 1fr))` grid。動
   external-apps-runtime 的渲染模板＋新 component package
   （`warm-sand-entry-cards`）。icon 用 inline SVG stroke currentColor
   （QR 方塊/鑰匙/箱子/計時器，樣品裡有現成的）。
2. **Runtime 診斷面板暖石墨化**：實測 `.skhps-runtime-panel` 仍是冷藍黑
   （#101820、文字 #f5f7fb、strong #b8d7ff），與暖砂頁面衝突。改用
   tokens package 已備好的 `--skhps-instrument-*`（暖石墨 #201C16 家族）
   ＋狀態燈發光（`box-shadow: 0 0 9px 0 <燈色>`）＋數值 mono
   `tabular-nums`。深化版樣品「考題六」的正式落地——使用者最愛的
   專業感所在，優先做好。
3. **按鈕語言統一**：大按鈕從全圓藥丸 → 深化版定稿的 15px 圓角矩形
   （厚 padding）；藥丸形狀保留給 chips/篩選/狀態標籤。
4. **eyebrow 換赤陶**：ADMIN／CORE TOOLS／常用功能集中入口這些 eyebrow
   目前是鼠尾草綠，按規格應為赤陶 `--skhps-w-terra` letterspaced——
   「赤陶只當點綴」的第一個正式落點，小成本大記憶點。

### 第二波「後台密度」

5. **表格配方落地**：QR 後台/敷料庫存表格套深化版表格語彙（th 砂色帶
   `--skhps-w-th-band`、hairline、數字 mono 右對齊、選中列 sage 左指示條
   `inset 3px 0 0`、hover `--skhps-w-row-hover`）。對象 component：
   40/QR SIGNIN、40/QR SIGNIN BACKEND、swipe-table、60/DRESSING。
   量大，一個 component 一個 package 逐一收、逐一截圖驗收。
6. **表單狀態統一**：focus ring（`--skhps-w-focus-ring`）、錯誤態
   （err 框＋help 文字轉 err）、disabled 透明度，三態全站一致。
7. **Toast 標準元件**：深墨底暖白字（`--skhps-w-toast-*`），補上系統
   目前缺的輕量成功回饋（現在只有 alert 橫幅）。

### 第三波「上線路徑與收尾」（機制）

8. **Prod promotion 路徑**：目前整個暖砂活在 dev-only package——
   `CssRegistryPackage` 表 CHECK constraint 只允許 local-dev/dev，
   prod worker（skhps-backend）也還沒部署 package 讀取程式碼。上 prod 需：
   (a) migration 放寬 env constraint（加 prod）＋(b) worker 加
   promote action（dev→prod 複製、留 revision、AskUserQuestion 確認）＋
   (c) prod worker deploy。原則不變：一般使用者無感、全綠才切。
9. **舊列第二批清理**：等一二波 package 穩定且視覺驗收過，再刪被取代的
   舊 rows（這批目前仍在 prod 渲染，不像 156 列死列是零風險）。
   ⚠️ **§7 主題切換預覽存在期間本項凍結**——base rows 是 theme40 的唯一
   存在形式，刪了就再也切不回去。
10. **兩套 token 系統收斂**（§4.5）：最後做。

## 7. 主題切換預覽（2026-07-17 Fable 設計定稿，Sonnet 實作）

**設計討論紀錄（2026-07-17）**：使用者提案「每個主題一張同欄位的
Supabase table，切換＝把對接的 table 換掉」。設計裁決：**方向採納
（指標切換、同 schema、整組替換的心智模型），實作用現有 packages 表
加 themeName 維度＋DB 指標列達成**，理由：
- 指標不能放 env var（改了要 redeploy），要放 DB 才能 runtime 切換；
- 主題表若全量複製（含 swipe-table 1230 條結構規則），未來結構修 bug
  要同步 N 張表必 drift——**骨（結構）留一份、皮（視覺）per 主題**；
- packages 表本來就是「存在 DB 的主題覆蓋層」，theme40＝零 packages
  的素顏態天然存在；哪天需要多主題並行編輯（怕互踩）再升級成獨立
  table，schema 屆時已對齊，不用重來。

**目標**：全站切換＝UPDATE 一列指標；CSS Setting 頁提供 per-browser
預覽切換。**dev-only**，不碰 prod。

### 工作項（依序）

1. **manifest 統一**：6 個暖砂 package 全部補 `manifest.themeName:
   "warm-sand"`（現在只有 theme-tokens-warm-sand 有）。用
   saveCssRegistryPackage 重存：cssText/sortOrder 原封、version bump
   patch、manifest 加欄位。bundle 識別從此用 themeName，不靠 key 前綴。

2. **入口卡片拆出主題無關層**（class contract 原則第一次落地）：
   把 `.skhps-entry-card` 系列規則從 `theme-warm-sand-wave1` **搬出**，
   放進新 package `entry-cards-base`（**無** themeName＝共用層，任何
   主題下都會載入），並把色彩引用**改寫成兩套主題都有定義的核心 token**：
   `var(--skhps-paper)`（卡底）、`var(--skhps-line)`（框）、
   `var(--skhps-color-primary-soft)`（icon 底）、`var(--skhps-primary)`
   （icon/箭頭色）、`var(--skhps-text)`／`var(--skhps-muted)`（字色）、
   `var(--skhps-radius-card)`／`var(--skhps-shadow-card)`（幾何陰影）。
   ——卡片在暖砂顯示暖砂色、在 theme40 顯示舊冷色，**兩邊都不裸奔**。
   wave1 移除該區塊並 version bump。

3. **worker 加 theme 解析**（getCssRegistryRuntime／getCssRegistryPackages）：
   - 解析順序：`payload.theme`（白名單 `warm-sand`｜`theme40`，其他值
     忽略）→ 沒帶就讀 DB 指標：`Default` 表 `scope='css',
     key='activeCssTheme'`，預設 `warm-sand`。
   - `theme40` → 只回「無 themeName 的共用 package」（如 entry-cards-
     base），全部主題 package 跳過；`warm-sand` → 共用＋themeName=
     warm-sand。**白名單映射，絕不字串拼接 table/filter**。
   - 回應帶 `theme` 欄位，前端 footer/診斷可顯示目前主題。
   - **全站切換＝UPDATE 那列指標**（未來新主題＝新 packages 掛新
     themeName＋改指標，一個 UPDATE 完成，§4.5 承諾正式兌現）。

4. **css-sheet-runtime.js 帶 theme 參數**：
   - localStorage `skhpsv2.themePreview.v1` 有值就塞進請求 payload.theme
     （per-browser 預覽覆寫）；沒值就讓 worker 依指標決定。
   - **快取 key 要含 theme**（不同主題分開 cache，切換不吃舊皮）。
   - 曝露 `window.SKHPSThemePreview = { set(name), clear(), current() }`
     （set/clear 寫 localStorage 後 `location.reload()`，v1 用整頁重載
     最穩）。

5. **CSS Setting 頁切換 UI**：總覽或 Tokens 區塊放「主題預覽：暖砂／
   Theme40」pill 切換（只用既有 skhps class，不寫 inline style），呼叫
   SKHPSThemePreview。CSS Setting 是獨立 repo（css-setting/），記得
   commit 那邊。

### 驗收

- CSS Setting 切 Theme40 → 重載後整站冷色系（含首頁），入口卡片仍有
  完整布局（冷色版）；切回暖砂 → 暖色系；清 localStorage → 跟隨全站
  指標（預設暖砂）。
- 直接 UPDATE `Default` 指標列成 theme40 → 沒設 localStorage 的瀏覽器
  重載後全站變 theme40；改回 warm-sand 復原。
- Playwright 兩種模式各截首頁＋CSS Setting 頁比對。

### 已知限制（v1 接受，不修）

- loading.css 開場永遠暖砂（檔案層，不吃指標）→ theme40 模式開場會
  跳色一次。
- swipe-table 等補丁層在 theme40 模式正確回退（package 跳過後 base
  rows 接手），但**未來第三個主題**出現時，補丁層的字面色問題（§4.5）
  就得真 token 化，不能再用 bundle 疊加。
- 若未來要「多主題同時被不同人編輯」，再把皮層升級成 per-theme 獨立
  table（同 schema），指標解析已經在 worker，升級只動資料層。
