/*
檔案位置：skhpsv2/assets/js/footer.js
時間戳記：2026-06-09 20:00 UTC+8
用途：Footer 狀態列；只負責渲染 footer、version、Apps Script API 狀態與 CSS Sheet runtime 狀態。Apps Script 一律透過 SKHPSBackend.call()，不自行組 webAppUrl。
*/

(function () {
  "use strict";

  function findFooter() {
    return document.querySelector("[data-skhps-footer]");
  }

  function createFooterItem(labelText, valueText, extraClass) {
    var item = document.createElement("span");
    item.className = "skhps-footer-item" + (extraClass ? " " + extraClass : "");

    var label = document.createElement("span");
    label.className = "skhps-footer-label";
    label.textContent = labelText;

    var value = document.createElement("span");
    value.className = "skhps-footer-version";
    value.textContent = valueText || "loading";

    item.appendChild(label);
    item.appendChild(value);

    return item;
  }

  function renderFooter(state) {
    var footer = findFooter();

    if (!footer) {
      return;
    }

    footer.classList.add("skhps-footer");
    footer.innerHTML = "";

    var track = document.createElement("span");
    track.className = "skhps-footer-track";

    track.appendChild(
      createFooterItem("Version：", state.versionText || "loading", "is-active")
    );

    track.appendChild(
      createFooterItem("Apps Script：", state.apiText || "testing", state.apiOk ? "is-ok" : "is-warn")
    );

    track.appendChild(
      createFooterItem("Sheet：", state.sheetText || "testing", state.sheetOk ? "is-ok" : "is-warn")
    );

    footer.appendChild(track);
  }

  function setState(state, patch) {
    Object.keys(patch || {}).forEach(function (key) {
      state[key] = patch[key];
    });

    renderFooter(state);
  }

  function compactError(error) {
    var message = error && error.message ? error.message : String(error || "failed");
    message = message.replace(/^Error:\s*/, "");

    if (message.length > 80) {
      return message.slice(0, 77) + "...";
    }

    return message;
  }

  function loadVersion(state) {
    if (!window.SKHPSConfig || typeof window.SKHPSConfig.loadVersion !== "function") {
      setState(state, {
        versionText: "config failed"
      });
      return Promise.resolve();
    }

    return window.SKHPSConfig.loadVersion()
      .then(function (version) {
        setState(state, {
          versionText: version && version.version ? version.version : "unknown"
        });
      })
      .catch(function (error) {
        console.warn("Footer version failed:", error);
        setState(state, {
          versionText: "version failed"
        });
      });
  }

  function checkApi(state) {
    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      setState(state, {
        apiText: "backend missing",
        apiOk: false
      });
      return Promise.resolve();
    }

    return window.SKHPSBackend.call("health")
      .then(function (response) {
        if (response && response.ok === true) {
          setState(state, {
            apiText: response.env ? "ok " + response.env : "ok",
            apiOk: true
          });
          return;
        }

        setState(state, {
          apiText: response && response.error ? "failed: " + response.error : "failed",
          apiOk: false
        });
      })
      .catch(function (error) {
        console.warn("Footer Apps Script health failed:", error);
        setState(state, {
          apiText: "failed: " + compactError(error),
          apiOk: false
        });
      });
  }

  function updateFromRuntime(state, runtime) {
    if (!runtime) return false;

    var count = runtime.sheetKeys ? runtime.sheetKeys.length : "?";
    var source = runtime.source || "runtime";

    setState(state, {
      sheetText: "css " + count + " sheets (" + source + ")",
      sheetOk: true,
      sheetRuntimeOk: true
    });

    return true;
  }

  function watchCssRuntime(state) {
    if (window.SKHPSCssSheetRuntime) {
      updateFromRuntime(state, window.SKHPSCssSheetRuntime);
    }

    document.addEventListener("skhps-css-sheet-runtime-ready", function (event) {
      updateFromRuntime(state, event.detail || window.SKHPSCssSheetRuntime);
    });
  }

  function checkSheetStatusOnlyIfRuntimeMissing(state) {
    if (state.sheetRuntimeOk) {
      return Promise.resolve();
    }

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      setState(state, {
        sheetText: "runtime pending",
        sheetOk: false
      });
      return Promise.resolve();
    }

    return window.SKHPSBackend.call("sheetStatus")
      .then(function (response) {
        if (state.sheetRuntimeOk) {
          return;
        }

        if (response && response.ok === true) {
          var count = response.data && response.data.sheetCount ? response.data.sheetCount : "ok";
          setState(state, {
            sheetText: "api " + count,
            sheetOk: true
          });
          return;
        }

        setState(state, {
          sheetText: response && response.error ? "status failed: " + response.error : "status failed",
          sheetOk: false
        });
      })
      .catch(function () {
        if (state.sheetRuntimeOk) {
          return;
        }

        setState(state, {
          sheetText: "runtime pending",
          sheetOk: false
        });
      });
  }

  function boot() {
    var state = {
      versionText: "loading",
      apiText: "testing",
      apiOk: false,
      sheetText: "runtime pending",
      sheetOk: false,
      sheetRuntimeOk: false
    };

    renderFooter(state);
    watchCssRuntime(state);

    loadVersion(state);
    checkApi(state);
    checkSheetStatusOnlyIfRuntimeMissing(state);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.SKHPSFooter = {
    render: renderFooter
  };
})();