/*
檔案位置：skhpsv2/scripts/update-uni-css.js
時間戳記：2026-06-14 17:25 UTC+8
用途：開發/部署用 helper；從 config.json 指定的 CSS總表 CSV 讀取最新版 CSS 設定，整包覆蓋寫入根目錄 uni-CSS.CSS，供瀏覽器與 runtime 直接使用同一份水庫 CSS snapshot。
*/

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT_DIR, "config.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "uni-CSS.CSS");

function nowTaipeiText() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date()).replace("T", " ") + " UTC+8";
}

function hashText(text) {
  let hash = 2166136261;
  const input = String(text || "");

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (`00000000${(hash >>> 0).toString(16)}`).slice(-8);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quote = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quote) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quote = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quote = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((value) => String(value || "").trim() !== ""));
}

function rowsFromCsv(sheetKey, csvRows) {
  const header = csvRows[0] || [];
  const idx = {};

  header.forEach((name, index) => {
    idx[String(name || "").trim()] = index;
  });

  return csvRows.slice(1).map((row, order) => ({
    sheetKey,
    component: String(row[idx.component] || "").trim(),
    className: String(row[idx.className] || "").trim(),
    property: String(row[idx.property] || "").trim(),
    value: String(row[idx.value] || "").trim(),
    description: String(row[idx.description] || "").trim(),
    updatedAt: String(row[idx.updatedAt] || "").trim(),
    __order: order
  })).filter((row) => row.className && row.property && row.value);
}

function normalizeSelector(className, component) {
  let raw = String(className || "").trim();

  if (!raw && component) raw = String(component || "").trim();
  if (!raw) return "";

  if (
    raw === "*" ||
    raw.indexOf("*::") === 0 ||
    raw === "body" ||
    raw === "html" ||
    raw === ":root" ||
    raw.indexOf(".") === 0 ||
    raw.indexOf("#") === 0 ||
    raw.indexOf("[") === 0 ||
    raw.indexOf(":") === 0 ||
    raw.indexOf("@media") === 0 ||
    raw.indexOf("@keyframes") === 0 ||
    /[\s,>+~:[#]/.test(raw) ||
    /^[a-z][a-z0-9-]*\./i.test(raw)
  ) {
    return raw;
  }

  return `.${raw}`;
}

function isDated(updatedAt) {
  const raw = String(updatedAt || "").trim().toLowerCase();
  return raw && raw !== "default";
}

function rowScore(row, index) {
  const updatedAt = String(row.updatedAt || "").trim();

  if (!isDated(updatedAt)) {
    return { rank: 1, time: 0, index };
  }

  const parsed = new Date(updatedAt.replace(/\//g, "-")).getTime();
  return { rank: 2, time: Number.isNaN(parsed) ? 1 : parsed, index };
}

function compareScore(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.time !== b.time) return a.time - b.time;
  return a.index - b.index;
}

function pickLatestRows(rows) {
  const map = {};

  rows.forEach((row, index) => {
    const selector = normalizeSelector(row.selector || row.className, row.component);
    const property = String(row.property || "").trim();
    const value = String(row.value || "").trim();

    if (!selector || !property || !value) return;

    const key = `${selector}||${property}`;
    const candidate = {
      group: row.group || row.sheetKey || "",
      selector,
      property,
      value,
      sheetKey: row.sheetKey || "",
      component: row.component || "",
      className: row.className || "",
      description: row.description || "",
      updatedAt: row.updatedAt || "",
      score: rowScore(row, index)
    };

    if (!map[key] || compareScore(map[key].score, candidate.score) <= 0) {
      map[key] = candidate;
    }
  });

  return Object.keys(map).map((key) => map[key]);
}

function buildCss(rows) {
  const latest = pickLatestRows(rows);
  const grouped = {};
  const mediaGrouped = {};
  const keyframesGrouped = {};
  const css = ["/* skhps css sheet runtime generated */"];

  latest.forEach((row) => {
    const selector = row.selector;
    const keyframesMatch = selector.match(/^(@keyframes[^{]+)\{\s*([^}]+?)\s*\}?$/);

    if (keyframesMatch) {
      const keyframes = keyframesMatch[1].trim();
      const frameSelector = keyframesMatch[2].trim();
      keyframesGrouped[keyframes] = keyframesGrouped[keyframes] || {};
      keyframesGrouped[keyframes][frameSelector] = keyframesGrouped[keyframes][frameSelector] || [];
      keyframesGrouped[keyframes][frameSelector].push(row);
      return;
    }

    if (selector.indexOf("@media") === 0) {
      const match = selector.match(/^(@media[^{]+)\{\s*([^}]+?)\s*\}?$/);

      if (match) {
        const media = match[1].trim();
        const innerSelector = match[2].trim();
        mediaGrouped[media] = mediaGrouped[media] || {};
        mediaGrouped[media][innerSelector] = mediaGrouped[media][innerSelector] || [];
        mediaGrouped[media][innerSelector].push(row);
        return;
      }
    }

    grouped[selector] = grouped[selector] || [];
    grouped[selector].push(row);
  });

  Object.keys(grouped).forEach((selector) => {
    css.push("");
    css.push(`${selector} {`);
    grouped[selector].forEach((row) => {
      css.push(`  ${row.property}: ${row.value};`);
    });
    css.push("}");
  });

  Object.keys(mediaGrouped).forEach((media) => {
    css.push("");
    css.push(`${media} {`);
    Object.keys(mediaGrouped[media]).forEach((selector) => {
      css.push(`  ${selector} {`);
      mediaGrouped[media][selector].forEach((row) => {
        css.push(`    ${row.property}: ${row.value};`);
      });
      css.push("  }");
    });
    css.push("}");
  });

  Object.keys(keyframesGrouped).forEach((keyframes) => {
    css.push("");
    css.push(`${keyframes} {`);
    Object.keys(keyframesGrouped[keyframes]).forEach((frameSelector) => {
      css.push(`  ${frameSelector} {`);
      keyframesGrouped[keyframes][frameSelector].forEach((row) => {
        css.push(`    ${row.property}: ${row.value};`);
      });
      css.push("  }");
    });
    css.push("}");
  });

  return {
    cssText: css.join("\n"),
    latestRows: latest
  };
}

function cssUrl(config, sheet) {
  const spreadsheetId = config && config.sheets && config.sheets.mainSpreadsheetId;
  if (!spreadsheetId) throw new Error("config.json missing sheets.mainSpreadsheetId");
  if (!sheet || sheet.tabGid === undefined || sheet.tabGid === null || sheet.tabGid === "") {
    throw new Error("config.json missing css sheet tabGid");
  }

  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(sheet.tabGid)}&ts=${Date.now()}`;
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8").replace(/^\uFEFF/, ""));
  const cssSheets = config.sheets && config.sheets.cssSheets ? config.sheets.cssSheets : {};
  const sheet = cssSheets.cssMain || Object.values(cssSheets).find((item) => item && item.enabled !== false);

  if (!sheet) {
    throw new Error("No enabled CSS sheet found in config.json");
  }

  const sheetKey = sheet.key || "cssMain";
  const response = await fetch(cssUrl(config, sheet));
  const csvText = await response.text();

  if (!response.ok) {
    throw new Error(`CSS CSV HTTP ${response.status}: ${csvText.slice(0, 120)}`);
  }

  const rows = rowsFromCsv(sheetKey, parseCsv(csvText));
  const built = buildCss(rows);
  const generatedAt = nowTaipeiText();
  const hash = hashText(built.cssText);
  const output = [
    "/*",
    "檔案位置：skhpsv2/uni-CSS.CSS",
    `時間戳記：${generatedAt}`,
    "用途：由 CSS總表產生的單一 CSS snapshot；瀏覽器 first paint 與 runtime 都直接載入此檔。",
    `source: sheet`,
    `sheetKey: ${sheetKey}`,
    `sheetTitle: ${sheet.title || sheet.tabName || "CSS總表"}`,
    `sheetGid: ${String(sheet.tabGid)}`,
    `hash: ${hash}`,
    `rowsCount: ${rows.length}`,
    `latestRowsCount: ${built.latestRows.length}`,
    "*/",
    "",
    built.cssText
  ].join("\n");

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${output}\n`, "utf8");
  console.log(`Wrote ${path.relative(ROOT_DIR, OUTPUT_PATH)} (${built.latestRows.length} styles, hash ${hash})`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
