const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

class ExplorerInterop {
  constructor() {
    this.scriptPath = this.getScriptPath();
    this.lastKnownFiles = [];
    this.lastKnownTimestamp = 0;
    this.CACHE_TTL_MS = 3500; // 3.5 seconds TTL
  }

  getScriptPath() {
    if (process.resourcesPath) {
      const resourcePath = path.join(process.resourcesPath, 'bin', 'get_selected_files.ps1');
      if (fs.existsSync(resourcePath)) return resourcePath;
    }
    const unpackedPath = path.join(__dirname, 'get_selected_files.ps1').replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpackedPath)) return unpackedPath;

    return path.join(__dirname, 'get_selected_files.ps1');
  }

  getSelectedFiles(options = {}) {
    return new Promise((resolve) => {
      const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath];
      if (options.context) {
        args.push('-context', String(options.context));
      }
      if (options.hwnd) {
        args.push('-targetHwnd', String(options.hwnd));
      }

      execFile(
        'powershell.exe',
        args,
        { timeout: 1500 },
        (error, stdout) => {
          if (error || !stdout) {
            resolve(this.getFreshCachedFiles());
            return;
          }

          try {
            const raw = stdout.trim();
            if (!raw || raw === '[]') {
              resolve(this.getFreshCachedFiles());
              return;
            }

            const parsed = JSON.parse(raw);
            const files = Array.isArray(parsed) ? parsed : [parsed];
            const validFiles = files.filter((f) => typeof f === 'string' && fs.existsSync(f));

            if (validFiles.length > 0) {
              this.setLastKnownFiles(validFiles);
              resolve(validFiles);
            } else {
              resolve(this.getFreshCachedFiles());
            }
          } catch {
            resolve(this.getFreshCachedFiles());
          }
        }
      );
    });
  }

  getFreshCachedFiles() {
    if (Date.now() - this.lastKnownTimestamp < this.CACHE_TTL_MS) {
      return this.lastKnownFiles.filter((f) => fs.existsSync(f));
    }
    return [];
  }

  setLastKnownFiles(files) {
    if (Array.isArray(files) && files.length > 0) {
      this.lastKnownFiles = files.filter((f) => fs.existsSync(f));
      this.lastKnownTimestamp = Date.now();
    }
  }

  clearCache() {
    this.lastKnownFiles = [];
    this.lastKnownTimestamp = 0;
  }
}

module.exports = new ExplorerInterop();
