const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigStore {
  constructor() {
    this.userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.config');
    this.configFilePath = path.join(this.userDataPath, 'uniflux_config.json');
    const legacyPath = path.join(this.userDataPath, 'tangerine_config.json');
    if (!fs.existsSync(this.configFilePath) && fs.existsSync(legacyPath)) {
      try {
        fs.copyFileSync(legacyPath, this.configFilePath);
      } catch {
        // Fallback silently
      }
    }
    this.defaults = {
      language: 'en',
      soundEnabled: true,
      outputDir: null, // null means beside original file
      theme: 'system',
      dragThreshold: 8,
      shortcuts: {
        conversions: 'Shift',
        tools: 'Alt',
        actions: 'Control'
      }
    };
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8');
        return { ...this.defaults, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('Failed to parse config file, using defaults', err.message);
    }
    return { ...this.defaults };
  }

  saveConfig(newConfig = null) {
    try {
      if (newConfig) {
        this.config = { ...this.config, ...newConfig };
      }
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to save config:', err.message);
      return false;
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  getAll() {
    return { ...this.config };
  }
}

module.exports = new ConfigStore();
