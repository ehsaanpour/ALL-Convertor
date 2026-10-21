const { spawn } = require('child_process');
const { globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const EventEmitter = require('events');

class HookManager extends EventEmitter {
  constructor(configStore) {
    super();
    this.configStore = configStore;
    this.hookProcess = null;
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.activeModifier = null;
  }

  start() {
    const hookExe = path.join(__dirname, 'native_hook.exe');
    if (!fs.existsSync(hookExe)) {
      console.warn('native_hook.exe not found at', hookExe);
      return;
    }

    const threshold = this.configStore.get('dragThreshold') || 8;
    this.hookProcess = spawn(hookExe, [String(threshold)], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const rl = readline.createInterface({
      input: this.hookProcess.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      try {
        const data = JSON.parse(line.trim());
        this.handleHookEvent(data);
      } catch {
        // Non-JSON log or error
      }
    });

    this.hookProcess.on('exit', (code) => {
      console.log(`Native hook process exited with code ${code}`);
    });

    // Register fallback global shortcut: Ctrl+Shift+T
    try {
      globalShortcut.register('CommandOrControl+Shift+T', () => {
        this.emit('summon_hotkey', { mode: 'conversions' });
      });
    } catch (err) {
      console.warn('Could not register fallback global shortcut', err.message);
    }
  }

  handleHookEvent(data) {
    switch (data.event) {
      case 'drag_start':
        this.isDragging = true;
        this.lastX = data.x;
        this.lastY = data.y;
        this.emit('drag_start', { x: data.x, y: data.y, context: data.context, hwnd: data.hwnd });
        break;

      case 'drag_move':
        this.lastX = data.x;
        this.lastY = data.y;
        this.emit('drag_move', { x: data.x, y: data.y });
        break;

      case 'drag_end':
        this.isDragging = false;
        this.emit('drag_end', { x: data.x, y: data.y });
        break;

      case 'key_down': {
        const shortcuts = this.configStore.get('shortcuts') || {};
        let mode = null;

        if (data.key === (shortcuts.conversions || 'Shift')) {
          mode = 'conversions';
        } else if (data.key === (shortcuts.tools || 'Alt')) {
          mode = 'tools';
        } else if (data.key === (shortcuts.actions || 'Control')) {
          mode = 'actions';
        }

        if (mode) {
          this.activeModifier = data.key;
          this.emit('trigger', {
            mode,
            key: data.key,
            dragging: data.dragging,
            x: data.x,
            y: data.y,
            context: data.context,
            hwnd: data.hwnd
          });
        }
        break;
      }

      case 'key_up':
        if (this.activeModifier === data.key) {
          this.activeModifier = null;
          this.emit('key_release', { key: data.key });
        }
        break;
    }
  }

  stop() {
    if (this.hookProcess) {
      this.hookProcess.kill();
      this.hookProcess = null;
    }
    globalShortcut.unregisterAll();
  }
}

module.exports = HookManager;
