/*
檔案位置：skhpsv2/assets/js/jonaminz-bridge.js
時間戳：2026-07-12 12:24 UTC+8
用途：SKHPSv2 dev 接入 Jonaminz Platform SDK；只取得獲准能力/tokens，不接管既有 Header、Footer、runtime 或 loading gate。
*/
(function () {
  "use strict";

  var html = document.documentElement;
  var scope = String(html.getAttribute("data-skhps-entry-scope") || "").trim();
  var runtime = String(html.getAttribute("data-skhps-runtime") || "").trim().toLowerCase();
  var contractPath = "/jonaminz.contract.json";

  try {
    if (window.SKHPS_ENTRY_BASE_URL) {
      contractPath = new URL("jonaminz.contract.json", window.SKHPS_ENTRY_BASE_URL).pathname;
    }
  } catch (error) {}

  function rlog(status, action, detail) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({
          source: "jonaminz-bridge.js",
          category: "platform",
          action: action,
          status: status,
          detail: detail || ""
        });
      }
    } catch (error) {}
  }

  if (scope !== "skhps-core") {
    rlog("SKIP", "init", "external app keeps its own contract lifecycle");
    return;
  }

  if (runtime !== "dev" && runtime !== "local-dev" && runtime !== "local") {
    rlog("SKIP", "init", "prod remains unchanged");
    return;
  }

  if (window.Jonaminz && window.Jonaminz.__snippetVersion) {
    rlog("SKIP", "init", "official snippet already installed");
    return;
  }

  var jz = { status: "loading", reason: null };
  var bootstrap = { settled: false };

  jz.ready = new Promise(function (resolve, reject) {
    bootstrap.resolve = resolve;
    bootstrap.reject = reject;
  });

  bootstrap.settle = function (kind, reason) {
    if (bootstrap.settled) return;
    bootstrap.settled = true;
    clearTimeout(bootstrap.timer);
    if (kind === "reject") {
      jz.status = "failed";
      jz.reason = reason && reason.code ? reason.code : String(reason || "SDK_INIT_FAILED");
      bootstrap.reject(reason);
    } else {
      jz.status = kind;
      jz.reason = reason || null;
      bootstrap.resolve(jz);
    }
    delete jz.__bootstrap;
  };

  bootstrap.timer = setTimeout(function () {
    bootstrap.settle("degraded", "SDK_LOAD_TIMEOUT");
  }, 15000);

  jz.__snippetVersion = 1;
  jz.__bootstrap = bootstrap;
  window.Jonaminz = jz;

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://jonaminz.com/sdk/jonaminz-entry.js";
  script.setAttribute("data-contract", contractPath);
  script.onerror = function () {
    if (window.Jonaminz && window.Jonaminz.__bootstrap) {
      window.Jonaminz.__bootstrap.settle("degraded", "SDK_LOAD_FAILED");
    }
  };
  document.head.appendChild(script);

  jz.ready.then(function (platform) {
    html.setAttribute("data-skhps-jonaminz-status", platform.status || "unknown");
    rlog(platform.status === "ready" ? "OK" : "WARN", "ready", {
      status: platform.status,
      reason: platform.reason || "",
      diagnostics: platform.diagnostics || null,
      shellOwnership: "skhpsv2"
    });
  }).catch(function (error) {
    html.setAttribute("data-skhps-jonaminz-status", "failed");
    rlog("FAIL", "ready", error && error.message ? error.message : String(error));
  });

  rlog("RUN", "init", { runtime: runtime, contract: contractPath });
})();
