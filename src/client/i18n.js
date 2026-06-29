window.BlogI18n = {
  locale: 'zh',
  strings: {},
  meta: {},
  _cache: {},
  _availableLocales: null,

  async load(locale) {
    locale = locale || this.detectLocale();

    if (this._cache[locale]) {
      this.strings = this._cache[locale];
      this.meta = this.strings._meta || { code: locale, name: locale, nativeName: locale };
      this.locale = locale;
      return;
    }

    try {
      const base = this._getBasePath();
      const response = await fetch(`${base}locales/${locale}.json`);
      if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);
      this.strings = await response.json();
      this.meta = this.strings._meta || { code: locale, name: locale, nativeName: locale };
      this._cache[locale] = this.strings;
      this.locale = locale;
    } catch (err) {
      if (locale !== 'zh') {
        console.warn(`Locale "${locale}" not found, falling back to "zh".`);
        return this.load('zh');
      }
      console.error('Failed to load fallback locale "zh":', err);
      this.strings = {};
      this.meta = { code: 'zh', name: '简体中文', nativeName: '简体中文' };
    }
  },

  async getAvailableLocales() {
    if (this._availableLocales) return this._availableLocales;
    const known = ['zh', 'en'];
    const base = this._getBasePath();
    const available = [];
    for (const code of known) {
      try {
        const resp = await fetch(`${base}locales/${code}.json`);
        if (resp.ok) {
          const data = await resp.json();
          const meta = data._meta || { code, name: code, nativeName: code };
          available.push(meta);
        }
      } catch (_) { /* skip */ }
    }
    this._availableLocales = available;
    return available;
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
    return './';
  }
};
