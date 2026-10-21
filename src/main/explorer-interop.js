const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

class ExplorerInterop {
  constructor() {
    this.scriptPath = path.join(__dirname, 'get_selected_files.ps1');
    this.lastKnownFiles = [];
  }

  getSelectedFiles() {
    return new Promise((resolve) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath],
        { timeout: 1500 },
        (error, stdout) => {
          if (error || !stdout) {
            resolve(this.lastKnownFiles);
            return;
          }

          try {
            const raw = stdout.trim();
            if (!raw || raw === '[]') {
              resolve(this.lastKnownFiles);
              return;
            }

            const parsed = JSON.parse(raw);
            const files = Array.isArray(parsed) ? parsed : [parsed];
            const validFiles = files.filter((f) => typeof f === 'string' && fs.existsSync(f));

            if (validFiles.length > 0) {
              this.lastKnownFiles = validFiles;
              resolve(validFiles);
            } else {
              resolve(this.lastKnownFiles);
            }
          } catch {
            resolve(this.lastKnownFiles);
          }
        }
      );
    });
  }

  setLastKnownFiles(files) {
    if (Array.isArray(files) && files.length > 0) {
      this.lastKnownFiles = files.filter((f) => fs.existsSync(f));
    }
  }
}

module.exports = new ExplorerInterop();
