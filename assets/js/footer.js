(function(){
  var FOOTER_STYLE_ID = "skhps-footer-style-from-sheet";

  function findFooter(){
    return document.querySelector("[data-skhps-footer]");
  }

  function createFooterItem(labelText, valueText, extraClass){
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

  function renderFooter(state){
    var footer = findFooter();

    if(!footer){
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
      createFooterItem("Apps Script：", state.apiText || "testing", "")
    );

    track.appendChild(
      createFooterItem("Sheet：", state.sheetText || "testing", "")
    );

    footer.appendChild(track);
  }

  function parseCsv(text){
    var rows = [];
    var row = [];
    var cell = "";
    var quote = false;

    for(var i = 0; i < text.length; i++){
      var c = text[i];
      var n = text[i + 1];

      if(quote){
        if(c === '"' && n === '"'){
          cell += '"';
          i++;
        } else if(c === '"'){
          quote = false;
        } else {
          cell += c;
        }
      } else {
        if(c === '"'){
          quote = true;
        } else if(c === ","){
          row.push(cell);
          cell = "";
        } else if(c === "\n"){
          row.push(cell);
          rows.push(row);
          row = [];
          cell = "";
        } else if(c !== "\r"){
          cell += c;
        }
      }
    }

    row.push(cell);
    rows.push(row);

    return rows.filter(function(r){
      return r.some(function(x){
        return String(x || "").trim() !== "";
      });
    });
  }

  function buildFooterCss(rows){
    var header = rows[0] || [];
    var idx = {};
    var map = {};

    header.forEach(function(h, i){
      idx[String(h || "").trim()] = i;
    });

    rows.slice(1).forEach(function(row){
      var component = String(row[idx.component] || "").trim();
      var className = String(row[idx.className] || "").trim();
      var property = String(row[idx.property] || "").trim();
      var value = String(row[idx.value] || "").trim();

      if(component !== "footer" || !className || !property){
        return;
      }

      /*
        Sheet 越下面越新。
        同 selector + property 後面的 row 蓋掉前面的 row。
      */
      var key = className + "||" + property;

      map[key] = {
        className: className,
        property: property,
        value: value
      };
    });

    var grouped = {};

    Object.keys(map).forEach(function(key){
      var item = map[key];
      grouped[item.className] = grouped[item.className] || [];
      grouped[item.className].push("  " + item.property + ": " + item.value + ";");
    });

    return Object.keys(grouped).map(function(selector){
      return selector + "{\n" + grouped[selector].join("\n") + "\n}";
    }).join("\n\n");
  }

  function injectFooterCss(css){
    var style = document.getElementById(FOOTER_STYLE_ID);

    if(!style){
      style = document.createElement("style");
      style.id = FOOTER_STYLE_ID;
      style.setAttribute("data-source", "footerStyle Sheet");
      document.head.appendChild(style);
    }

    style.textContent = css;
  }

  function applyFooterStyleFromSheet(){
    var loadConfig = window.SKHPSConfig && window.SKHPSConfig.loadConfig
      ? window.SKHPSConfig.loadConfig()
      : fetch("config.json", { cache: "no-store" }).then(function(res){ return res.json(); });

    return loadConfig
      .then(function(config){
        var id = config && config.sheets && config.sheets.mainSpreadsheetId;
        var tab = config && config.sheets && config.sheets.cssSheets && config.sheets.cssSheets.footerStyle;

        if(!id || !tab || tab.tabGid === undefined || tab.tabGid === null || tab.tabGid === ""){
          throw new Error("footerStyle config missing");
        }

        var url = "https://docs.google.com/spreadsheets/d/" +
          encodeURIComponent(id) +
          "/export?format=csv&gid=" +
          encodeURIComponent(tab.tabGid);

        return fetch(url, { cache: "no-store" });
      })
      .then(function(res){
        return res.text().then(function(text){
          if(!res.ok){
            throw new Error("footerStyle CSV HTTP " + res.status);
          }
          return text;
        });
      })
      .then(function(csv){
        injectFooterCss(buildFooterCss(parseCsv(csv)));
      })
      .catch(function(error){
        console.warn("footerStyle apply failed:", error);
      });
  }

  function setState(state, patch){
    Object.keys(patch).forEach(function(key){
      state[key] = patch[key];
    });

    renderFooter(state);
  }

  function boot(){
    var state = {
      versionText: "loading",
      apiText: "testing",
      sheetText: "testing"
    };

    applyFooterStyleFromSheet();
    renderFooter(state);

    if(!window.SKHPSConfig){
      setState(state, {
        versionText: "config failed",
        apiText: "config failed",
        sheetText: "config failed"
      });
      return;
    }

    window.SKHPSConfig.loadVersion()
      .then(function(version){
        setState(state, {
          versionText: version.version || "unknown"
        });
      })
      .catch(function(){
        setState(state, {
          versionText: "version.json failed"
        });
      });

    window.SKHPSConfig.loadConfig()
      .then(function(){
        if(!window.SKHPSBackend){
          throw new Error("SKHPSBackend not loaded");
        }

        return window.SKHPSBackend.call("health");
      })
      .then(function(response){
        if(response && response.ok){
          setState(state, {
            apiText: "OK" + (response.env ? " / " + response.env : "")
          });
        } else {
          setState(state, {
            apiText: "failed"
          });
        }
      })
      .catch(function(){
        setState(state, {
          apiText: "failed"
        });
      });

    window.SKHPSConfig.loadConfig()
      .then(function(){
        if(!window.SKHPSBackend){
          throw new Error("SKHPSBackend not loaded");
        }

        return window.SKHPSBackend.call("sheetStatus");
      })
      .then(function(response){
        var data = response && response.data ? response.data : response;

        if(data && data.ok){
          setState(state, {
            sheetText: "OK / " + (data.spreadsheetName || "connected")
          });
          return;
        }

        if(data && data.configured === false){
          setState(state, {
            sheetText: "not configured"
          });
          return;
        }

        setState(state, {
          sheetText: "failed"
        });
      })
      .catch(function(){
        setState(state, {
          sheetText: "failed"
        });
      });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
