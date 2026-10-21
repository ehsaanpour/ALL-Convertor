const { clipboard, shell, dialog } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ALL_ACTIONS = {
  airDrop: { id: 'airDrop', icon: 'share' },
  float: { id: 'float', icon: 'pin' },
  copy: { id: 'copy', icon: 'copy' },
  move: { id: 'move', icon: 'move' },
  copyPath: { id: 'copyPath', icon: 'path' },
  openTerminal: { id: 'openTerminal', icon: 'terminal' }
};

function getFileActions() {
  return Object.keys(ALL_ACTIONS);
}

async function executeAction(actionId, filePaths, options = {}) {
  if (!filePaths || !filePaths.length) return { success: false, error: 'No files provided' };

  const firstFile = filePaths[0];
  const targetDir = fs.statSync(firstFile).isDirectory() ? firstFile : path.dirname(firstFile);

  switch (actionId) {
    case 'copyPath': {
      const text = filePaths.join('\r\n');
      clipboard.writeText(text);
      return { success: true, message: `${filePaths.length} path(s) copied to clipboard` };
    }

    case 'copy': {
      // Set clipboard text and explorer file drop list via PowerShell
      const escaped = filePaths.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
      const psCmd = `powershell -NoProfile -Command "Set-Clipboard -Path ${escaped}"`;
      exec(psCmd, (err) => {
        if (err) clipboard.writeText(filePaths.join('\r\n'));
      });
      return { success: true, message: `${filePaths.length} file(s) copied to clipboard` };
    }

    case 'openTerminal': {
      // Try Windows Terminal first (wt.exe), fallback to PowerShell
      const wt = spawn('wt.exe', ['-d', targetDir], { detached: true, stdio: 'ignore' });
      wt.on('error', () => {
        spawn('powershell.exe', ['-NoExit', '-Command', `Set-Location '${targetDir.replace(/'/g, "''")}'`], {
          detached: true,
          stdio: 'ignore'
        });
      });
      return { success: true, message: `Opened Terminal at ${targetDir}` };
    }

    case 'move': {
      const result = await dialog.showOpenDialog({
        title: 'Choose Destination Folder',
        defaultPath: targetDir,
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, message: 'Move canceled' };
      }

      const destFolder = result.filePaths[0];
      const moved = [];
      for (const src of filePaths) {
        const dest = path.join(destFolder, path.basename(src));
        fs.renameSync(src, dest);
        moved.push(dest);
      }
      return { success: true, message: `Moved ${moved.length} file(s) to ${destFolder}` };
    }

    case 'airDrop': {
      // Windows Nearby Share URI
      shell.openExternal('ms-settings:nearbyshare');
      return { success: true, message: 'Opened Windows Share settings' };
    }

    case 'float': {
      if (options.onFloatRequest) {
        options.onFloatRequest(filePaths);
      }
      return { success: true, message: 'Pinned files to desktop shelf' };
    }

    default:
      return { success: false, error: `Unknown action ${actionId}` };
  }
}

module.exports = {
  ALL_ACTIONS,
  getFileActions,
  executeAction
};
