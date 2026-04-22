export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = '#' + path;
  }

  getCurrentPath() {
    return window.location.hash.slice(1) || '/login';
  }

  async handleRoute() {
    const path = this.getCurrentPath();
    const handler = this.routes[path];
    if (handler) {
      this.currentRoute = path;
      await handler();
    } else {
      const fallback = this.routes['/dashboard'] || this.routes['/login'];
      if (fallback) await fallback();
    }
  }

  start() {
    this.handleRoute();
  }
}
