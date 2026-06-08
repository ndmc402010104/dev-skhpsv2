(function () {
  function getRouteConfig() {
    return window.SKHPS_ROUTE_CONFIG || { routes: {} };
  }

  function getRoute(routeKey) {
    const config = getRouteConfig();
    return config.routes[routeKey] || null;
  }

  function getRouteHref(routeKey) {
    const route = getRoute(routeKey);
    if (!route) return '#';
    return route.href || '#';
  }

  function applyRouteLinks(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll('[data-route]');

    nodes.forEach(function (node) {
      const routeKey = node.getAttribute('data-route');
      const route = getRoute(routeKey);

      if (!route) {
        node.setAttribute('href', '#');
        node.setAttribute('data-route-missing', 'true');
        node.setAttribute('title', 'Missing route: ' + routeKey);
        return;
      }

      node.setAttribute('href', route.href || '#');
      node.setAttribute('data-route-type', route.type || 'internal');

      if (route.note) {
        node.setAttribute('title', route.note);
      }

      if (route.type === 'placeholder') {
        node.setAttribute('aria-disabled', 'true');
      }
    });
  }

  window.SKHPS_ROUTER = {
    getRoute: getRoute,
    getRouteHref: getRouteHref,
    applyRouteLinks: applyRouteLinks
  };

  document.addEventListener('DOMContentLoaded', function () {
    applyRouteLinks(document);
  });
})();
