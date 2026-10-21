const fs = require('fs');
const path = require('path');

class I18nManager {
  constructor(defaultLocale = 'en') {
    this.currentLocale = defaultLocale;
    this.locales = {
      en: require('./en.json'),
      fa: require('./fa.json')
    };
  }

  setLocale(locale) {
    if (this.locales[locale]) {
      this.currentLocale = locale;
      return true;
    }
    return false;
  }

  getLocale() {
    return this.currentLocale;
  }

  isRtl() {
    return this.currentLocale === 'fa';
  }

  t(keyPath, params = {}) {
    const keys = keyPath.split('.');
    let result = this.locales[this.currentLocale];

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        // Fallback to English if key missing in current locale
        result = this.locales['en'];
        for (const fbKey of keys) {
          if (result && typeof result === 'object' && fbKey in result) {
            result = result[fbKey];
          } else {
            return keyPath;
          }
        }
        break;
      }
    }

    if (typeof result === 'string') {
      let str = result;
      for (const [paramKey, paramVal] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramVal);
      }
      return str;
    }

    return result;
  }

  getAllStrings() {
    return this.locales[this.currentLocale];
  }
}

module.exports = new I18nManager();
