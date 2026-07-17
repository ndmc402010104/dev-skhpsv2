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
