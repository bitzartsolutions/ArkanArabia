(function () {
  const cfg = window.ARKAN_CONFIG || {};

  function fromMeta() {
    const meta = document.querySelector('meta[name="arkan-api-base-url"]');
    return meta ? String(meta.content || '').trim() : '';
  }

  function normalizeBaseUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    return value.replace(/\/+$/, '');
  }

  function defaultBaseUrl() {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';

    if (isLocal) {
      return normalizeBaseUrl(`${window.location.protocol}//${host}:4000`);
    }

    // No same-origin /api proxy is configured anywhere (Vercel preview
    // deployments, the vercel.app production alias, and the custom
    // production domain all talk directly to the deployed backend).
    return 'https://arkan-arabia-backend.vercel.app';
  }

  const apiBaseUrl =
    normalizeBaseUrl(cfg.apiBaseUrl) ||
    normalizeBaseUrl(fromMeta()) ||
    defaultBaseUrl();

  window.ARKAN_CONFIG = { ...cfg, apiBaseUrl };
  window.ARKAN_API_BASE_URL = apiBaseUrl;
})();
