const { Tray, Menu, Notification, shell, nativeImage } = require('electron');
const path = require('path');
const i18n = require('../i18n/i18n');

class TrayManager {
  constructor(appManager) {
    this.appManager = appManager;
    this.tray = null;
  }

  createTray() {
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'brand', 'tray.png');
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon);
    this.tray.setToolTip(i18n.t('appName') + ' — ' + i18n.t('appTagline'));

    this.updateContextMenu();

    this.tray.on('double-click', () => {
      this.appManager.openSettingsWindow();
    });
  }

  updateContextMenu() {
    if (!this.tray) return;

    const currentLang = i18n.getLocale();
    const contextMenu = Menu.buildFromTemplate([
      {
        label: i18n.t('appName'),
        enabled: false,
        icon: path.join(__dirname, '..', '..', 'assets', 'brand', 'tray.png')
      },
      { type: 'separator' },
      {
        label: i18n.t('tray.showOverlay'),
        click: () => this.appManager.showTestOverlay()
      },
      {
        label: i18n.t('tray.openSettings'),
        click: () => this.appManager.openSettingsWindow()
      },
      {
        label: i18n.t('tray.language'),
        submenu: [
          {
            label: 'English',
            type: 'radio',
            checked: currentLang === 'en',
            click: () => this.appManager.changeLanguage('en')
          },
          {
            label: 'فارسی (Persian)',
            type: 'radio',
            checked: currentLang === 'fa',
            click: () => this.appManager.changeLanguage('fa')
          }
        ]
      },
      { type: 'separator' },
      {
        label: i18n.t('tray.exit'),
        click: () => this.appManager.exitApp()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  showNotification(title, body, targetFilePath = null) {
    if (Notification.isSupported()) {
      const notif = new Notification({
        title,
        body,
        icon: path.join(__dirname, '..', '..', 'assets', 'brand', 'tray.png')
      });

      if (targetFilePath) {
        notif.on('click', () => {
          shell.showItemInFolder(targetFilePath);
        });
      }

      notif.show();
    }
  }
}

module.exports = TrayManager;
