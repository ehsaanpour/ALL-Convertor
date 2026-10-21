const { app } = require('electron');
console.log('--- Electron App Smoke Test ---');
app.whenReady().then(() => {
  console.log('SUCCESS: Electron initialized cleanly on', process.platform);
  app.exit(0);
});
