/*
檔案位置：skhpsv2/assets/js/backend-project-launcher.js
時間戳：2026-06-13 00:00 UTC+8
用途：skhpsv2 後台專案啟動器；讀取外部專案 Sheet registry，管理既有欄位「啟用」與「顯示位置」。
*/

(function () {
  "use strict";

  var TASK_NAME = "backend-project-launcher";
  var WAIT_BACKEND_TIMEOUT_MS = 8000;
  var WAIT_BACKEND_INTERVAL_MS = 100;
  var startedAt = Date.now();
  var projects = [];
  var selectedKey = "";

  function $(selector) {
    return document.querySelector(selector);
  }

  function rlog(status, action, detail, durationMs) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({
          source: "backend-project-launcher.js",
          category: "external-app",
          action: action,
          status: status,
          detail: detail || "",
          durationMs: durationMs
        });
      }
    } catch (error) {}
  }

  function loadingDone() {
    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done(TASK_NAME);
    }
  }

  function loadingFail(error) {
    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail(TASK_NAME, error);
    } else {
      loadingDone();
    }
  }

  function waitForBackend() {
    var waitStartedAt = Date.now();

    return new Promise(function (resolve, reject) {
      function check() {
        if (window.SKHPSBackend && typeof window.SKHPSBackend.call === "function") {
          resolve(window.SKHPSBackend);
          return;
        }

        if (Date.now() - waitStartedAt >= WAIT_BACKEND_TIMEOUT_MS) {
          reject(new Error("SKHPSBackend.call not loaded"));
          return;
        }

        window.setTimeout(check, WAIT_BACKEND_INTERVAL_MS);
      }

      check();
    });
  }

  function runtimeState() {
    return window.SKHPSRuntime && typeof window.SKHPSRuntime.getState === "function"
      ? window.SKHPSRuntime.getState()
      : {};
  }

  function getRuntime() {
    var state = runtimeState();
    return normalizeRegistryEnv(state && state.runtime && state.runtime.effective ||
      document.documentElement.getAttribute("data-skhps-runtime") ||
      "");
  }

  function normalizeRegistryEnv(value) {
    value = String(value || "").trim();
    if (value === "LOCAL") return "local-dev";
    if (value === "DEV") return "dev";
    if (value === "PROD") return "prod";
    return value;
  }

  function renderRuntimeDiagnostics() {
    var state = runtimeState();
    var hostEnv = state && state.host && state.host.env || "未知";
    var requested = state && state.runtime && state.runtime.requested || "未知";
    var effective = state && state.runtime && state.runtime.effective || getRuntime() || "未知";
    var scriptSource = state && state.config && state.config.source || "未知";

    setText("[data-launcher-host-env]", hostEnv);
    setText("[data-launcher-runtime-requested]", requested);
    setText("[data-launcher-runtime-effective]", effective);
    setText("[data-launcher-script-source]", scriptSource);
  }

  function setText(selector, value) {
    var el = $(selector);
    if (el) el.textContent = value || "";
  }

  function setStatus(text) {
    setText("[data-backend-project-launcher-status]", text || "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeProjects(response) {
    if (!response) return [];
    if (Array.isArray(response.projects)) return response.projects;
    if (Array.isArray(response.apps)) return response.apps;
    if (response.data && Array.isArray(response.data.projects)) return response.data.projects;
    if (response.data && Array.isArray(response.data.apps)) return response.data.apps;
    return [];
  }

  function normalizeProject(raw) {
    raw = raw || {};
    return {
      projectId: String(raw.projectId || raw.appId || raw["專案ID"] || "").trim(),
      env: String(raw.env || raw["環境"] || "").trim(),
      title: String(raw.title || raw["專案名稱"] || "").trim(),
      href: String(raw.href || raw["入口網址"] || "").trim(),
      displayPosition: String(raw.displayPosition || raw["顯示位置"] || "").trim(),
      group: String(raw.group || raw["顯示群組"] || "").trim(),
      sort: Number(raw.sort || raw.order || raw["排序"] || 9999) || 9999,
      enabled: projectEnabled(raw),
      version: String(raw.version || raw["版本"] || "").trim(),
      lastReportAt: raw.lastReportAt || raw.lastSeenAt || raw["最後報到時間"] || "",
      reportCount: Number(raw.reportCount || raw.registerCount || raw["報到次數"] || 0) || 0
    };
  }

  function projectEnabled(project) {
    if (!project) return false;
    if (project.enabled === true || project.active === true) return true;

    var value = String(project.enabled || project.active || project["啟用"] || "").trim().toLowerCase();
    return value === "true" || value === "是" || value === "1" || value === "yes";
  }

  function projectKey(project) {
    return String(project.projectId || "") + "::" + String(project.env || "");
  }

  function findSelectedProject() {
    return projects.filter(function (project) {
      return projectKey(project) === selectedKey;
    })[0] || null;
  }

  function row(label, value) {
    return [
      '<div class="skhps-meta-item">',
        '<span class="skhps-meta-label">' + escapeHtml(label) + '</span>',
        '<strong class="skhps-meta-value">' + escapeHtml(value || "-") + '</strong>',
      '</div>'
    ].join("");
  }

  function renderProjectButton(project) {
    var button = document.createElement("button");
    var key = projectKey(project);
    var display = project.displayPosition || "未選擇";
    var stateText = project.enabled ? "啟用" : "不啟用";

    button.className = "skhps-btn skhps-btn-secondary skhps-btn-lg";
    button.type = "button";
    button.setAttribute("data-launcher-select-project", key);
    button.textContent = [
      project.title || project.projectId,
      stateText,
      display
    ].filter(Boolean).join(" / ");

    return button;
  }

  function renderProjectList() {
    var list = $("[data-backend-project-launcher-list]");

    if (!list) return;

    list.innerHTML = "";

    if (!projects.length) {
      list.innerHTML = '<p class="skhps-page-subtitle">目前環境沒有外部專案 registry 資料。</p>';
      renderEditor(null);
      return;
    }

    var nav = document.createElement("nav");
    nav.className = "skhps-action-grid";
    nav.setAttribute("aria-label", "外部專案");

    projects.forEach(function (project) {
      nav.appendChild(renderProjectButton(project));
    });

    list.appendChild(nav);
  }

  function renderEditor(project) {
    var editor = $("[data-backend-project-launcher-editor]");
    var disabled = !project || !project.enabled;
    var position = project ? project.displayPosition : "";

    if (!editor) return;

    if (!project) {
      editor.innerHTML = '<article class="skhps-hero-card"><p class="skhps-page-subtitle">請先選擇一個外部專案。</p></article>';
      return;
    }

    editor.innerHTML = [
      '<article class="skhps-hero-card" data-launcher-editor-project="' + escapeHtml(projectKey(project)) + '">',
        '<div class="skhps-section-head">',
          '<div>',
            '<p class="skhps-eyebrow">Project Activation</p>',
            '<h3 class="skhps-section-title">' + escapeHtml(project.title || project.projectId) + '</h3>',
          '</div>',
        '</div>',
        '<div class="skhps-meta-grid">',
          row("專案名稱", project.title),
          row("專案ID", project.projectId),
          row("環境", project.env),
          row("入口網址", project.href),
          row("顯示群組", project.group),
          row("排序", String(project.sort)),
          row("版本", project.version),
          row("最後報到時間", project.lastReportAt),
          row("報到次數", String(project.reportCount)),
        '</div>',
        '<fieldset class="skhps-form-field">',
          '<legend class="skhps-meta-label">是否啟用？</legend>',
          '<label><input type="radio" name="launcher-enabled" value="false"' + (!project.enabled ? " checked" : "") + '> 不啟用</label>',
          '<label><input type="radio" name="launcher-enabled" value="true"' + (project.enabled ? " checked" : "") + '> 啟用</label>',
        '</fieldset>',
        '<fieldset class="skhps-form-field" data-launcher-position-field' + (disabled ? ' hidden' : '') + '>',
          '<legend class="skhps-meta-label">要顯示在哪裡？</legend>',
          '<label><input type="radio" name="launcher-position" value="前台"' + (position === "前台" ? " checked" : "") + (disabled ? " disabled" : "") + '> 前台</label>',
          '<label><input type="radio" name="launcher-position" value="後台"' + (position === "後台" ? " checked" : "") + (disabled ? " disabled" : "") + '> 後台</label>',
        '</fieldset>',
        '<div class="skhps-toolbar">',
          '<button class="skhps-btn skhps-btn-primary" type="button" data-launcher-save>儲存</button>',
        '</div>',
        '<p class="skhps-page-subtitle" data-launcher-row-status></p>',
      '</article>'
    ].join("");
  }

  function updatePositionField(editor) {
    var enabledInput = editor.querySelector('input[name="launcher-enabled"]:checked');
    var enabled = enabledInput && enabledInput.value === "true";
    var positionField = editor.querySelector("[data-launcher-position-field]");
    var positionInputs = editor.querySelectorAll('input[name="launcher-position"]');

    if (!positionField) return;

    positionField.hidden = !enabled;
    positionInputs.forEach(function (input) {
      input.disabled = !enabled;
    });
  }

  function saveSelectedProject(editor) {
    var project = findSelectedProject();
    var status = editor.querySelector("[data-launcher-row-status]");
    var enabledInput = editor.querySelector('input[name="launcher-enabled"]:checked');
    var positionInput = editor.querySelector('input[name="launcher-position"]:checked');
    var enabled = enabledInput && enabledInput.value === "true";
    var displayPosition = positionInput ? positionInput.value : "";

    if (!project) return Promise.resolve();

    if (enabled && !displayPosition) {
      if (status) status.textContent = "啟用專案必須選擇顯示位置。";
      return Promise.resolve({
        ok: false,
        validationError: true
      });
    }

    if (status) status.textContent = "儲存中...";

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.updateExternalProjectActivation !== "function") {
      if (status) {
        status.textContent = "TODO：目前沒有 SKHPSBackend.updateExternalProjectActivation，未送出；部署後會寫回 Sheet 的啟用與顯示位置。";
      }
      return Promise.resolve({
        ok: false,
        mocked: true
      });
    }

    return window.SKHPSBackend.updateExternalProjectActivation({
      projectId: project.projectId,
      env: project.env,
      enabled: enabled,
      displayPosition: displayPosition
    }).then(function (response) {
      if (!response || response.ok === false) {
        throw new Error(response && response.message || response && response.error || "updateExternalProjectActivation failed");
      }

      project.enabled = enabled;
      if (enabled) project.displayPosition = displayPosition;
      renderProjectList();
      renderEditor(project);
      if (status) status.textContent = "已儲存。";
      rlog("OK", "updateExternalProjectActivation", {
        projectId: project.projectId,
        env: project.env,
        enabled: enabled,
        displayPosition: enabled ? displayPosition : project.displayPosition
      });
      return response;
    }).catch(function (error) {
      if (status) status.textContent = "儲存失敗：" + (error && error.message ? error.message : String(error));
      rlog("FAIL", "updateExternalProjectActivation", {
        projectId: project.projectId,
        env: project.env,
        error: error && error.message ? error.message : String(error)
      });
      return {
        ok: false,
        error: error && error.message ? error.message : String(error)
      };
    });
  }

  function bindEvents() {
    var list = $("[data-backend-project-launcher-list]");
    var editor = $("[data-backend-project-launcher-editor]");

    if (list && list.getAttribute("data-launcher-bound") !== "true") {
      list.setAttribute("data-launcher-bound", "true");
      list.addEventListener("click", function (event) {
        var button = event.target.closest("[data-launcher-select-project]");

        if (!button) return;
        selectedKey = button.getAttribute("data-launcher-select-project") || "";
        renderEditor(findSelectedProject());
      });
    }

    if (editor && editor.getAttribute("data-launcher-bound") !== "true") {
      editor.setAttribute("data-launcher-bound", "true");
      editor.addEventListener("change", function (event) {
        if (event.target && event.target.name === "launcher-enabled") {
          updatePositionField(editor);
        }
      });
      editor.addEventListener("click", function (event) {
        var button = event.target.closest("[data-launcher-save]");

        if (button) saveSelectedProject(editor);
      });
    }
  }

  function loadProjects() {
    var runtime = getRuntime();

    renderRuntimeDiagnostics();
    setStatus("外部專案 registry 載入中...");
    rlog("RUN", "listExternalProjects", { env: runtime });

    return waitForBackend()
      .then(function (backend) {
        if (typeof backend.listExternalProjects === "function") {
          return backend.listExternalProjects({
            activeOnly: false,
            env: runtime
          });
        }

        return backend.call("listExternalProjects", {
          activeOnly: false,
          env: runtime
        });
      })
      .then(function (response) {
        projects = normalizeProjects(response).map(normalizeProject);
        selectedKey = projects.length ? projectKey(projects[0]) : "";

        renderProjectList();
        renderEditor(findSelectedProject());
        bindEvents();
        setStatus("已載入 " + projects.length + " 個目前環境外部專案（" + (runtime || "runtime 未知") + "）。");
        rlog("OK", "listExternalProjects", {
          env: runtime,
          count: projects.length
        }, Date.now() - startedAt);
        loadingDone();
      })
      .catch(function (error) {
        console.error("[SKHPSBackendProjectLauncher]", error);
        setStatus("外部專案 registry 載入失敗：" + (error && error.message ? error.message : String(error)));
        rlog("FAIL", "listExternalProjects", {
          env: runtime,
          error: error && error.message ? error.message : String(error)
        }, Date.now() - startedAt);
        loadingFail(error);
      });
  }

  function init() {
    renderRuntimeDiagnostics();
    bindEvents();
    loadProjects();
  }

  window.SKHPSBackendProjectLauncher = {
    init: init,
    loadProjects: loadProjects,
    saveSelectedProject: saveSelectedProject
  };

  rlog("RUN", "moduleStart", "backend-project-launcher.js");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
