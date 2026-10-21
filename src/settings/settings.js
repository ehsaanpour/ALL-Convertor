let ipcRenderer = null;
let clipboard = null;
try {
  const electron = require('electron');
  ipcRenderer = electron.ipcRenderer;
  clipboard = electron.clipboard;
} catch (err) {
  // Not inside electron runtime
}

let currentConfig = {};
let allLocales = {};

const DONATION_ADDRESS = '0xc29E57776eCE95129740eFC97f3d20ac74Cc0a17';

const selectLang = document.getElementById('select-language');
const selectTheme = document.getElementById('select-theme');
const checkSound = document.getElementById('check-sound');
const selectScConv = document.getElementById('select-sc-conv');
const selectScTools = document.getElementById('select-sc-tools');
const selectScAct = document.getElementById('select-sc-act');
const btnTest = document.getElementById('btn-test');
const btnSave = document.getElementById('btn-save');

const btnCopyAddress = document.getElementById('btn-copy-address');
const donationAddressText = document.getElementById('donation-address-text');
const txtCopyLabel = document.getElementById('txt-copy-label');

function applyTheme(theme) {
  let isDark = false;
  if (theme === 'dark') {
    isDark = true;
  } else if (theme === 'light') {
    isDark = false;
  } else {
    // system
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.body.classList.toggle('theme-dark', isDark);
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (selectTheme.value === 'system') {
      applyTheme('system');
    }
  });
}

selectTheme.addEventListener('change', () => {
  applyTheme(selectTheme.value);
});

btnTest.addEventListener('click', () => {
  if (ipcRenderer) {
    ipcRenderer.send('test-radial-wheel');
  }
});

function copyAddressToClipboard() {
  try {
    if (clipboard && clipboard.writeText) {
      clipboard.writeText(DONATION_ADDRESS);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(DONATION_ADDRESS);
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
  }

  const currentLang = selectLang.value;
  const isFa = currentLang === 'fa';
  btnCopyAddress.classList.add('copied');
  txtCopyLabel.textContent = isFa ? 'کپی شد! ✓' : 'Copied! ✓';

  setTimeout(() => {
    btnCopyAddress.classList.remove('copied');
    const dict = allLocales[selectLang.value] || allLocales['en'] || {};
    const s = dict.settings || {};
    txtCopyLabel.textContent = s.copyAddress || (isFa ? 'کپی آدرس' : 'Copy');
  }, 2000);
}

if (btnCopyAddress) {
  btnCopyAddress.addEventListener('click', copyAddressToClipboard);
}
if (donationAddressText) {
  donationAddressText.addEventListener('click', copyAddressToClipboard);
}

if (ipcRenderer) {
  ipcRenderer.on('init-settings', (event, data) => {
    currentConfig = data.config || {};
    allLocales = data.locales || {};

    selectLang.value = currentConfig.language || 'en';
    selectTheme.value = currentConfig.theme || 'system';
    applyTheme(selectTheme.value);

    checkSound.checked = currentConfig.soundEnabled !== false;

    const sc = currentConfig.shortcuts || {};
    selectScConv.value = sc.conversions || 'Shift';
    selectScTools.value = sc.tools || 'Alt';
    selectScAct.value = sc.actions || 'Control';

    updateTexts(selectLang.value);
  });
}

selectLang.addEventListener('change', () => {
  const chosenLang = selectLang.value;
  updateTexts(chosenLang);
});

function updateTexts(lang) {
  const dict = allLocales[lang] || allLocales['en'] || {};
  const s = dict.settings || {};
  const isRtl = lang === 'fa';

  document.body.classList.toggle('rtl', isRtl);

  document.getElementById('txt-title').textContent = s.title || 'UniFlux Settings';
  document.getElementById('txt-tagline').textContent = dict.appTagline || '';
  document.getElementById('txt-general').textContent = s.general || 'General';
  document.getElementById('txt-lang-title').textContent = s.languageLabel || 'Application Language';
  document.getElementById('txt-lang-desc').textContent = s.languageDesc || '';
  document.getElementById('txt-theme-title').textContent = s.themeLabel || 'Theme';
  document.getElementById('txt-sound-title').textContent = s.soundLabel || 'Acoustic Feedback';
  document.getElementById('txt-sound-desc').textContent = s.soundDesc || '';
  document.getElementById('txt-shortcuts').textContent = s.shortcuts || 'Shortcuts';
  document.getElementById('txt-sc-conv').textContent = s.shortcutConversions || 'Conversions Modifier';
  document.getElementById('txt-sc-tools').textContent = s.shortcutTools || 'Tools Modifier';
  document.getElementById('txt-sc-act').textContent = s.shortcutActions || 'Actions Modifier';

  // About & Donation Section
  const elAbout = document.getElementById('txt-about');
  if (elAbout) elAbout.textContent = s.aboutTitle || s.about || 'About UniFlux';

  const elAboutCreator = document.getElementById('txt-about-creator');
  if (elAboutCreator) {
    if (isRtl) {
      elAboutCreator.innerHTML = 'این نرم‌افزار توسط <strong>احسان احسان‌پور</strong> ساخته شده است.';
    } else {
      elAboutCreator.innerHTML = 'Software created by <strong>Ehsan Ehsanpour</strong>';
    }
  }

  const elAboutFree = document.getElementById('txt-about-free');
  if (elAboutFree) elAboutFree.textContent = s.aboutFree || 'Using this software is completely free.';

  const elAboutDonate = document.getElementById('txt-about-donate');
  if (elAboutDonate) elAboutDonate.textContent = s.aboutDonate || 'If you like it, you can donate to:';

  const elNote = document.getElementById('txt-donation-note');
  if (elNote) {
    elNote.textContent = isRtl
      ? 'شبکه بایننس اسمارت چین (BEP20)'
      : 'Binance Smart Chain (BEP20) Network';
  }

  if (txtCopyLabel && !btnCopyAddress.classList.contains('copied')) {
    txtCopyLabel.textContent = s.copyAddress || (isRtl ? 'کپی آدرس' : 'Copy');
  }

  btnTest.textContent = isRtl ? 'آزمایش چرخ تبدیل 🎯' : 'Test Radial Wheel 🎯';
  btnSave.textContent = s.save || 'Save Changes';
}

btnSave.addEventListener('click', () => {
  const updated = {
    language: selectLang.value,
    theme: selectTheme.value,
    soundEnabled: checkSound.checked,
    shortcuts: {
      conversions: selectScConv.value,
      tools: selectScTools.value,
      actions: selectScAct.value
    }
  };

  if (ipcRenderer) {
    ipcRenderer.send('save-settings', updated);
  }
  btnSave.textContent = selectLang.value === 'fa' ? 'ذخیره شد ✓' : 'Saved ✓';
  setTimeout(() => {
    updateTexts(selectLang.value);
  }, 1200);
});

if (!ipcRenderer) {
  allLocales = {
    en: {
      settings: {
        title: "UniFlux Settings",
        general: "General",
        shortcuts: "Shortcuts & Drag Triggers",
        aboutTitle: "About UniFlux",
        aboutCreator: "Software created by Ehsan Ehsanpour",
        aboutFree: "Using this software is completely free.",
        aboutDonate: "If you like it, you can donate to:",
        copyAddress: "Copy Address",
        copied: "Copied! ✓",
        save: "Save Changes"
      },
      appTagline: "The zero-click offline file converter & quick actions"
    }
  };
  updateTexts('en');
}
