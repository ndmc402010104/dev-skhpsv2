/*
檔案位置：skhpsv2/dev-server.js
時間戳：2026-07-21 10:58 UTC+8
用途：local-dev 多根目錄靜態伺服器。coreRoot（skhpsv2 本體）預設＝啟動 dev-server 的 checkout
（scriptRoot），只有明確設 SKHPS_CORE_ROOT 才覆寫，避免「改 A checkout、畫面卻來自 B worktree」；
QR 等外部 App 仍映射各自的 v3 dev worktree。

這只是本機開發工具，不參與 GitHub Pages / PROD runtime：
- / 與 /skhpsv2/ 供應 skhpsv2 共通地基。
- /skhps-qr-signin/ 供應 QR 外部 App。
- 若 v3 worktree 不存在，才退回正式 checkout，並在啟動訊息清楚顯示實際來源。
*/
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const scriptRoot = __dirname;
const workspaceRoot = path.resolve(scriptRoot, "..");
const port = Number(process.argv[2] || 5501);

function existingDirectory(preferred, fallback) {
  try {
    if (preferred && fs.statSync(preferred).isDirectory()) return preferred;
  } catch (error) {}
  return fallback;
}

// 2026-07-21：唯一開發來源鎖定為「啟動 dev-server 的那個 checkout」（scriptRoot）。
// 先前預設優先供應 _dev-worktrees/skhpsv2-v3，會造成「改 A checkout、畫面卻來自 B
// worktree」的分岔（HEAD/檔案內容不同）。現在預設一律供應本體 scriptRoot，只有明確
// 設 SKHPS_CORE_ROOT 才覆寫；v3 worktree 保留在磁碟，但不再被默默優先供應。
const coreRootSource = process.env.SKHPS_CORE_ROOT ? "env:SKHPS_CORE_ROOT" : "default:scriptRoot";
const coreRoot = existingDirectory(
  process.env.SKHPS_CORE_ROOT || scriptRoot,
  scriptRoot
);
const qrRoot = existingDirectory(
  process.env.SKHPS_QR_SIGNIN_ROOT || path.join(workspaceRoot, "_dev-worktrees", "skhps-qr-signin-v3"),
  path.join(workspaceRoot, "skhps-qr-signin")
);
// 2026-07-17：補回其他外部 App 的 local-dev 路由（先前只映射 skhpsv2 與
// skhps-qr-signin，導致本機開發時 /skhps-quick-login//dressing-inventory/
// /skhps-smoke/ 一律 404，外部專案除了 QR 全部像壞掉）。各專案沒有 v3
// worktree，直接退回本體 checkout。
const quickLoginRoot = existingDirectory(
  process.env.SKHPS_QUICK_LOGIN_ROOT || path.join(workspaceRoot, "_dev-worktrees", "skhps-quick-login-v3"),
  path.join(workspaceRoot, "skhps-quick-login")
);
const dressingRoot = existingDirectory(
  process.env.SKHPS_DRESSING_ROOT || path.join(workspaceRoot, "_dev-worktrees", "dressing-inventory-v3"),
  path.join(workspaceRoot, "dressing-inventory")
);
const smokeRoot = existingDirectory(
  process.env.SKHPS_SMOKE_ROOT || path.join(workspaceRoot, "_dev-worktrees", "skhps-smoke-v3"),
  path.join(workspaceRoot, "skhps-smoke")
);
// 2026-07-17：補 css-setting（獨立外部 App，css-setting.skhps.jonaminz.com）
// 的本機路由——先前跟 quick-login/dressing-inventory/skhps-smoke 一樣漏掉，
// 本機開 /css-setting/ 一律 404。
const cssSettingRoot = existingDirectory(
  process.env.SKHPS_CSS_SETTING_ROOT || path.join(workspaceRoot, "_dev-worktrees", "css-setting-v3"),
  path.join(workspaceRoot, "css-setting")
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

// 每個外部 App 一條「/<key>/ → 對應資料夾」映射；沒命中才退回 coreRoot
// （skhpsv2 水庫本體）。key 對應 skhps-projects.json 的 path，也就是
// local-dev 版外部專案 href 用的根相對路徑。
const EXTERNAL_ROOTS = {
  "skhps-qr-signin": qrRoot,
  "skhps-quick-login": quickLoginRoot,
  "dressing-inventory": dressingRoot,
  "skhps-smoke": smokeRoot,
  "css-setting": cssSettingRoot
};

function routeFor(pathname) {
  if (pathname === "/skhpsv2") return { redirect: "/skhpsv2/" };
  if (pathname.startsWith("/skhpsv2/")) {
    return { root: coreRoot, relative: pathname.slice("/skhpsv2/".length) };
  }
  for (const key of Object.keys(EXTERNAL_ROOTS)) {
    if (pathname === "/" + key) return { redirect: "/" + key + "/" };
    if (pathname.startsWith("/" + key + "/")) {
      return { root: EXTERNAL_ROOTS[key], relative: pathname.slice(("/" + key + "/").length) };
    }
  }
  return { root: coreRoot, relative: pathname.replace(/^\/+/, "") };
}

function safeFilePath(root, relativePath) {
  const cleanRelative = String(relativePath || "").replace(/\\/g, "/");
  const candidate = path.resolve(root, cleanRelative || "index.html");
  const normalizedRoot = path.resolve(root);
  const rootPrefix = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;
  const lowerCandidate = candidate.toLowerCase();
  const lowerRoot = normalizedRoot.toLowerCase();
  const lowerPrefix = rootPrefix.toLowerCase();
  if (lowerCandidate !== lowerRoot && !lowerCandidate.startsWith(lowerPrefix)) return null;
  return candidate;
}

const server = http.createServer((req, res) => {
  let requestUrl;
  try {
    requestUrl = new URL(req.url || "/", "http://localhost");
  } catch (error) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname || "/");
  } catch (error) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad URL encoding");
    return;
  }

  const route = routeFor(pathname);
  if (route.redirect) {
    res.writeHead(302, { Location: route.redirect + requestUrl.search });
    res.end();
    return;
  }

  let relativePath = route.relative || "";
  if (!relativePath || relativePath.endsWith("/")) relativePath += "index.html";
  const filePath = safeFilePath(route.root, relativePath);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end("Not found: " + pathname + "\nResolved root: " + route.root);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log("SKHPS local-dev server -> http://localhost:" + port + "/");
  console.log("Core source            -> " + coreRoot + "  (" + coreRootSource + ")");
  console.log("QR source              -> " + qrRoot);
  console.log("Quick-login source     -> " + quickLoginRoot);
  console.log("Dressing source        -> " + dressingRoot);
  console.log("Smoke source           -> " + smokeRoot);
  console.log("CSS Setting source      -> " + cssSettingRoot);
  console.log("QR v3 backend          -> http://localhost:" + port + "/skhps-qr-signin/qr-signin-backend.html?skhpsRuntime=local-dev&qrV3=1");
});
