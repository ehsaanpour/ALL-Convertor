const { ipcRenderer } = require('electron');

let currentConfig = {};
let allLocales = {};

const selectLang = document.getElementById('select-language');
const selectTheme = document.getElementById('select-theme');
const checkSound = document.getElementById('check-sound');
const selectScConv = document.getElementById('select-sc-conv');
const selectScTools = document.getElementById('select-sc-tools');
const selectScAct = document.getElementById('select-sc-act');
const btnSave = document.getElementById('btn-save');

ipcRenderer.on('init-settings', (event, data) => {
  currentConfig = data.config || {};
  allLocales = data.locales || {};

  selectLang.value = currentConfig.language || 'en';
  selectTheme.value = currentConfig.theme || 'system';
  checkSound.checked = currentConfig.soundEnabled !== false;

  const sc = currentConfig.shortcuts || {};
  selectScConv.value = sc.conversions || 'Shift';
  selectScTools.value = sc.tools || 'Alt';
  selectScAct.value = sc.actions || 'Control';

  updateTexts(selectLang.value);
});

selectLang.addEventListener('change', () => {
  const chosenLang = selectLang.value;
  updateTexts(chosenLang);
});

function updateTexts(lang) {
  const dict = allLocales[lang] || allLocales['en'] || {};
  const s = dict.settings || {};
  const isRtl = lang === 'fa';

  document.body.classList.toggle('rtl', isRtl);

  document.getElementById('txt-title').textContent = s.title || 'Tangerine Settings';
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

  ipcRenderer.send('save-settings', updated);
  btnSave.textContent = selectLang.value === 'fa' ? 'ذخیره شد ✓' : 'Saved ✓';
  setTimeout(() => {
    updateTexts(selectLang.value);
  }, 1200);
});
