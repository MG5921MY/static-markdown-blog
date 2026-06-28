window.BlogI18n = {
  locale: 'zh',
  strings: {},
  _cache: {},

  async load(locale) {
    locale = locale || this.detectLocale();

    if (this._cache[locale]) {
      this.strings = this._cache[locale];
      this.locale = locale;
      return;
    }

    try {
      const base = this._getBasePath();
      const response = await fetch(`${base}locales/${locale}.json`);
      if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);
      this.strings = await response.json();
      this._cache[locale] = this.strings;
      this.locale = locale;
    } catch (err) {
      if (locale !== 'zh') {
        console.warn(`Locale "${locale}" not found, falling back to "zh".`);
        return this.load('zh');
      }
      console.error('Failed to load fallback locale "zh":', err);
      this.strings = {};
    }
  },

  t(key, params) {
    const value = this._resolve(key, this.strings);
    if (value === undefined) return key;
    if (!params) return value;

    return value.replace(/\{(\w+)\}/g, (match, name) => {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
    });
  },

  detectLocale() {
    const saved = localStorage.getItem('blog-locale');
    if (saved && (saved === 'zh' || saved === 'en')) return saved;

    const lang = (navigator.language || navigator.userLanguage || 'zh').toLowerCase();
    if (lang.startsWith('en')) return 'en';
    return 'zh';
  },

  setLocale(locale) {
    localStorage.setItem('blog-locale', locale);
  },

  _resolve(key, obj) {
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  },

  _getBasePath() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].getAttribute('src') || '';
      if (src.endsWith('blog.i18n.js')) {
        return src.replace(/blog\.i18n\.js$/, '');
      }
    }
    return './';
  }
};
