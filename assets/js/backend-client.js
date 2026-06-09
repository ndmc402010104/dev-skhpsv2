/*
檔案位置：skhpsv2/assets/js/backend-client.js
時間戳記：2026-06-09 20:00 UTC+8
用途：全站唯一 Apps Script API 呼叫入口；所有頁面、footer、CSS runtime 都只能透過 SKHPSBackend.call(action, payload) 呼叫後端，並且會先等待 config.json 載入完成，避免 config 尚未完成時 health 誤判 failed。
*/

(function () {
  "use strict";

  var DEFAULT_TIMEOUT_MS = 15000;
  var configPromise = null;

  function loadConfig() {
    if (window.SKHPSConfig && typeof window.SKHPSConfig.loadConfig === "function") {
      return window.SKHPSConfig.loadConfig();
    }

    if (window.SKHPS_CONFIG) {
      return Promise.resolve(window.SKHPS_CONFIG);
    }

    if (!configPromise) {
      configPromise = fetch("config.json", { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          throw new Error("config.json failed: HTTP " + response.status);
        }

        return response.json();
      }).then(function (config) {
        window.SKHPS_CONFIG = config;
        return config;
      });
    }

    return configPromise;
  }

  function endpointFromConfig(config) {
    if (!config || !config.api || !config.api.webAppUrl) {
      return "";
    }

    return String(config.api.webAppUrl).trim();
  }

  function getEndpoint() {
    var config =
      window.SKHPSConfig && typeof window.SKHPSConfig.getConfig === "function"
        ? window.SKHPSConfig.getConfig()
        : window.SKHPS_CONFIG;

    return endpointFromConfig(config);
  }

  function buildUrl(endpoint, action, payload, callbackName) {
    var parts = [];

    parts.push("action=" + encodeURIComponent(action));
    parts.push("callback=" + encodeURIComponent(callbackName));
    parts.push("ts=" + encodeURIComponent(String(Date.now())));

    if (payload !== undefined && payload !== null) {
      parts.push("payload=" + encodeURIComponent(JSON.stringify(payload)));
    }

    return endpoint + (endpoint.indexOf("?") >= 0 ? "&" : "?") + parts.join("&");
  }

  function callJsonp(endpoint, action, payload, options) {
    options = options || {};

    return new Promise(function (resolve, reject) {
      if (!endpoint) {
        reject(new Error("找不到 config.json 裡的 api.webAppUrl"));
        return;
      }

      if (!action) {
        reject(new Error("Missing Apps Script action"));
        return;
      }

      var callbackName =
        "skhpsBackend_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 100000);

      var script = document.createElement("script");
      var timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);

      var timer = setTimeout(function () {
        cleanup();
        reject(new Error("JSONP timeout: " + action + " @ " + endpoint));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);

        try {
          delete window[callbackName];
        } catch (error) {
          window[callbackName] = undefined;
        }

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      window[callbackName] = function (result) {
        cleanup();
        resolve(result);
      };

      script.onerror = function () {
        cleanup();
        reject(new Error("JSONP failed: " + action + " @ " + endpoint));
      };

      script.async = true;
      script.src = buildUrl(endpoint, action, payload, callbackName);
      document.head.appendChild(script);
    });
  }

  function call(action, payload, options) {
    return loadConfig().then(function (config) {
      var endpoint = endpointFromConfig(config);
      return callJsonp(endpoint, action, payload, options);
    }).then(function (response) {
      if (response && response.ok === false && response.error) {
        console.warn("SKHPSBackend action returned ok=false:", action, response);
      }

      return response;
    });
  }

  function bindHealthButton(buttonId, resultId) {
    var button = document.getElementById(buttonId);
    var result = document.getElementById(resultId);

    if (!button || !result) {
      return;
    }

    button.addEventListener("click", function () {
      result.textContent = "測試中...";

      call("health")
        .then(function (response) {
          result.textContent = JSON.stringify({
            ok: response && response.ok === true,
            endpoint: getEndpoint(),
            response: response
          }, null, 2);
        })
        .catch(function (error) {
          result.textContent = JSON.stringify({
            ok: false,
            endpoint: getEndpoint() || null,
            error: error && error.message ? error.message : String(error)
          }, null, 2);
        });
    });
  }

  window.SKHPSBackend = {
    loadConfig: loadConfig,
    getEndpoint: getEndpoint,
    call: call,
    bindHealthButton: bindHealthButton
  };
})();