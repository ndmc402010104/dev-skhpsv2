(function(){
  function findFooter(){
    return document.querySelector("[data-skhps-footer]");
  }

  function renderFooter(state){
    var footer = findFooter();

    if(!footer){
      return;
    }

    footer.innerHTML = "";

    var version = document.createElement("span");
    version.textContent = "Version：" + (state.versionText || "loading");
    footer.appendChild(version);

    footer.appendChild(document.createTextNode("　"));

    var api = document.createElement("span");
    api.textContent = "Apps Script：" + (state.apiText || "testing");
    footer.appendChild(api);

    footer.appendChild(document.createTextNode("　"));

    var sheet = document.createElement("span");
    sheet.textContent = "Sheet：" + (state.sheetText || "testing");
    footer.appendChild(sheet);
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