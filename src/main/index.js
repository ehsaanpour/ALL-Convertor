const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const configStore = require('./config-store');
const i18n = require('../i18n/i18n');
const TrayManager = require('./tray');
const HookManager = require('./hook-manager');
const explorerInterop = require('./explorer-interop');
const conversionManager = require('../engine/conversion-manager');
const { getConversionTargets, normalizeExtension } = require('../engine/converter-registry');
const { getToolsForFile } = require('../engine/tools-registry');
const { getFileActions } = require('../engine/actions-registry');

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log('Tangerine is already running in your system tray. Focused existing window.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (globalTangerineInstance) {
      globalTangerineInstance.openSettingsWindow();
    }
  });
}

let globalTangerineInstance = null;

class TangerineApp {
  constructor() {
    this.overlayWindow = null;
    this.settingsWindow = null;
    this.trayManager = new TrayManager(this);
    this.hookManager = new HookManager(configStore);

    // Apply saved language
    const savedLang = configStore.get('language') || 'en';
    i18n.setLocale(savedLang);
  }

  async init() {
    await app.whenReady();

    this.createOverlayWindow();
    this.trayManager.createTray();
    this.hookManager.start();
    this.setupHookListeners();
    this.setupIpcHandlers();

    // Show settings window on startup so user sees the interface
    this.openSettingsWindow();

    console.log('Tangerine Windows service started successfully in system tray.');
  }

  createOverlayWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    this.overlayWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width,
      height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.overlayWindow.loadFile(path.join(__dirname, '..', 'overlay', 'overlay.html'));

    // Prevent closing, just hide
    this.overlayWindow.on('close', (e) => {
      e.preventDefault();
      this.overlayWindow.hide();
    });
  }

  setupHookListeners() {
    // Pre-fetch active Explorer selection when drag starts
    this.hookManager.on('drag_start', () => {
      explorerInterop.getSelectedFiles().catch(() => {});
    });

    // When modifier is pressed during drag or triggered
    this.hookManager.on('trigger', async (data) => {
      const cursor = screen.getCursorScreenPoint();
      const coords = { x: (data && data.x > 0) ? data.x : cursor.x, y: (data && data.y > 0) ? data.y : cursor.y };
      await this.displayRadialWheel(data.mode, coords);
    });

    // Fallback summon via hotkey
    this.hookManager.on('summon_hotkey', async (data) => {
      const cursor = screen.getCursorScreenPoint();
      await this.displayRadialWheel(data.mode || 'conversions', cursor);
    });

    // When drag ends without target
    this.hookManager.on('drag_end', () => {
      if (this.overlayWindow && this.overlayWindow.isVisible()) {
        // Overlay client handles release
      }
    });
  }

  async displayRadialWheel(mode, coords, explicitFiles = null) {
    if (!this.overlayWindow) return;

    // Use explicitFiles if provided, otherwise query active files from Windows Explorer
    let activeFiles = explicitFiles;
    if (!activeFiles || !activeFiles.length) {
      const selectedFiles = await explorerInterop.getSelectedFiles();
      activeFiles = selectedFiles.length > 0 ? selectedFiles : [this.getFallbackSampleFile()];
    }

    const firstFile = activeFiles[0];
    const ext = normalizeExtension(path.extname(firstFile));

    let targets = [];
    let labels = [];

    if (mode === 'conversions') {
      targets = getConversionTargets(ext);
      labels = targets.map((t) => t.toUpperCase());
    } else if (mode === 'tools') {
      targets = getToolsForFile(ext, activeFiles.length);
      labels = targets.map((t) => i18n.t(`tools.${t}.title`));
    } else if (mode === 'actions') {
      targets = getFileActions();
      labels = targets.map((a) => i18n.t(`actions.${a}.title`));
    }

    // Fallback: If targets is empty (e.g. non-convertible file format or empty selection), NEVER show an empty wheel!
    if (!targets || !targets.length) {
      if (mode === 'actions') {
        targets = getFileActions();
        labels = targets.map((a) => i18n.t(`actions.${a}.title`));
      } else if (mode === 'tools') {
        targets = getToolsForFile('jpg', activeFiles.length);
        labels = targets.map((t) => i18n.t(`tools.${t}.title`));
      } else {
        targets = getConversionTargets('jpg');
        labels = targets.map((t) => t.toUpperCase());
      }
    }

    const cursor = screen.getCursorScreenPoint();
    const posX = (coords && coords.x > 0) ? coords.x : cursor.x;
    const posY = (coords && coords.y > 0) ? coords.y : cursor.y;

    const payload = {
      mode,
      targets,
      labels,
      files: activeFiles,
      x: posX,
      y: posY,
      theme: configStore.get('theme') || 'system',
      locale: i18n.getLocale(),
      isRtl: i18n.isRtl(),
      soundEnabled: configStore.get('soundEnabled') !== false
    };

    this.overlayWindow.show();
    this.overlayWindow.webContents.send('render-wheel', payload);
  }

  getFallbackSampleFile() {
    const sampleDir = path.join(app.getPath('temp'), 'tangerine_samples');
    if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir, { recursive: true });
    const samplePath = path.join(sampleDir, 'sample_photo.jpg');
    if (!fs.existsSync(samplePath)) {
      // Create empty 1-byte file as placeholder
      fs.writeFileSync(samplePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    }
    return samplePath;
  }

  setupIpcHandlers() {
    ipcMain.on('execute-wheel-action', async (event, data) => {
      this.overlayWindow.hide();
      const { mode, target, files } = data;
      const customOutDir = configStore.get('outputDir');

      try {
        if (mode === 'conversions') {
          for (const file of files) {
            const res = await conversionManager.convertFile(file, target, customOutDir);
            const baseName = path.basename(res.outputPath);
            this.trayManager.showNotification(
              i18n.t('notifications.conversionSuccess'),
              i18n.t('notifications.conversionSuccessBody', { filename: baseName }),
              res.outputPath
            );
          }
        } else if (mode === 'tools') {
          const res = await conversionManager.executeTool(target, files, { customOutputDir: customOutDir });
          const outPath = typeof res === 'string' ? res : files[0];
          this.trayManager.showNotification(
            i18n.t('notifications.conversionSuccess'),
            i18n.t('notifications.conversionSuccessBody', { filename: path.basename(outPath) }),
            outPath
          );
        } else if (mode === 'actions') {
          await conversionManager.executeAction(target, files);
        }
      } catch (err) {
        this.trayManager.showNotification(
          i18n.t('notifications.conversionError'),
          i18n.t('notifications.conversionErrorBody', { filename: path.basename(files[0] || ''), error: err.message })
        );
      }
    });

    ipcMain.on('hide-overlay-window', () => {
      if (this.overlayWindow) this.overlayWindow.hide();
    });

    ipcMain.on('save-settings', (event, newConfig) => {
      configStore.saveConfig(newConfig);
      if (newConfig.language) {
        this.changeLanguage(newConfig.language);
      }
    });
    ipcMain.on('test-radial-wheel', () => {
      this.showTestOverlay();
    });

    ipcMain.on('switch-wheel-mode', (event, newMode) => {
      const cursor = screen.getCursorScreenPoint();
      this.displayRadialWheel(newMode, cursor);
    });
  }

  openSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 640,
      height: 620,
      title: i18n.t('settings.title'),
      resizable: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.settingsWindow.loadFile(path.join(__dirname, '..', 'settings', 'settings.html'));

    this.settingsWindow.webContents.on('did-finish-load', () => {
      this.settingsWindow.webContents.send('init-settings', {
        config: configStore.getAll(),
        locales: {
          en: require('../i18n/en.json'),
          fa: require('../i18n/fa.json')
        }
      });
    });

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  showTestOverlay() {
    const cursor = screen.getCursorScreenPoint();
    this.displayRadialWheel('conversions', cursor, [this.getFallbackSampleFile()]);
  }

  changeLanguage(lang) {
    i18n.setLocale(lang);
    configStore.set('language', lang);
    this.trayManager.updateContextMenu();
    if (this.settingsWindow) {
      this.settingsWindow.webContents.send('init-settings', {
        config: configStore.getAll(),
        locales: {
          en: require('../i18n/en.json'),
          fa: require('../i18n/fa.json')
        }
      });
    }
  }

  exitApp() {
    this.hookManager.stop();
    app.exit(0);
  }
}

if (gotLock) {
  const tangerine = new TangerineApp();
  globalTangerineInstance = tangerine;
  tangerine.init().catch(console.error);
}
