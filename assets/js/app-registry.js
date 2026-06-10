/*
檔案位置：skhpsv2/assets/js/app-registry.js
用途：SKHPS 子專案註冊表。所有 app 對應與 sharedBaseUrl 統一放 skhpsv2。
*/

window.SKHPS_APP_REGISTRY = {
  sharedBaseUrl: {
    "local-dev": "http://127.0.0.1:5500/skhpsv2/",
    "dev": "https://dev-skhps.jonaminz.com/",
    "prod": "https://skhps.jonaminz.com/"
  },

  apps: {
    "quick-login": {
      title: "快速登入",
      baseUrl: {
        "local-dev": "http://127.0.0.1:5500/skhps-quick-login/",
        "dev": "https://ndmc402010104.github.io/skhps-quick-login/",
        "prod": "https://ndmc402010104.github.io/skhps-quick-login/"
      },
      afterScripts: [
        "assets/js/login.js"
      ]
    }
  }
};
