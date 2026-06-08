window.SKHPS_ROUTE_CONFIG = {
  app: 'skhpsv2',
  stage: 'css-ui-foundation',

  routes: {
    'portal.home': {
      label: '前台首頁',
      type: 'internal',
      href: 'index.html'
    },
    'portal.admin': {
      label: '後台入口',
      type: 'internal',
      href: 'admin.html'
    },
    'portal.uiTest': {
      label: 'CSS / UI 測試頁',
      type: 'internal',
      href: 'ui-test.html'
    },

    'qr.signIn': {
      label: '晨會 QR 簽到',
      type: 'placeholder',
      href: '#',
      note: 'Phase 1 placeholder. Later connect to legacy QR sign-in or skhps-qr.'
    },
    'qr.generator': {
      label: '晨會 QR 產生',
      type: 'placeholder',
      href: '#',
      note: 'Phase 1 placeholder. Later connect to legacy QR generator or skhps-qr.'
    },
    'qr.admin': {
      label: '晨會簽到後台',
      type: 'placeholder',
      href: '#',
      note: 'Phase 1 placeholder. Later connect to legacy admin meeting or skhps-qr.'
    },

    'api.health': {
      label: 'API Health Check',
      type: 'placeholder',
      href: '#',
      note: 'Phase 1 placeholder. Apps Script API is not connected yet.'
    }
  }
};
