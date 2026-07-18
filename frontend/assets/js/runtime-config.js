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
    const isVercelHost = host.endsWith('.vercel.app');

    if (isLocal) {
      return normalizeBaseUrl(`${window.location.protocol}//${host}:4000`);
    }

    if (isVercelHost) {
      return 'https://arkanarabia.onrender.com';
    }

    // In production, default to same-origin so /api can be reverse-proxied.
    return normalizeBaseUrl(window.location.origin);
  }

  const apiBaseUrl =
    normalizeBaseUrl(cfg.apiBaseUrl) ||
    normalizeBaseUrl(fromMeta()) ||
    defaultBaseUrl();

  window.ARKAN_CONFIG = { ...cfg, apiBaseUrl };
  window.ARKAN_API_BASE_URL = apiBaseUrl;
})();
