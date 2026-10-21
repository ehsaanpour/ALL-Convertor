<p align="center">
  <img src="assets/brand/logo.png" alt="UniFlux Logo" width="160" height="160" style="border-radius: 28px;" />
</p>

# UniFlux ⚡

The ultra-fast, zero-click offline file converter & radial quick actions for all Windows versions (Windows 11, 10, 8.1, 7).

[![CI](https://github.com/ehsaanpour/ALL-Convertor/actions/workflows/build.yml/badge.svg)](https://github.com/ehsaanpour/ALL-Convertor/actions/workflows/build.yml)
[![Release](https://github.com/ehsaanpour/ALL-Convertor/actions/workflows/release.yml/badge.svg)](https://github.com/ehsaanpour/ALL-Convertor/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features

- **Zero-Click Radial Wheel Overlay**: Spawns right at your mouse cursor when dragging files in Windows Explorer or Desktop, or via instant summon shortcut.
- **Frosted Acrylic Glassmorphism**: High-fidelity dynamic SVG petals with hardware-accelerated animations and acoustic feedback ticks.
- **275+ Offline File Conversions**:
  - **Images**: JPG, PNG, WebP, HEIC, TIFF, AVIF, BMP, PDF.
  - **Video**: MP4, MOV, MKV, WebM, AVI, WMV, GIF, MP3 extraction.
  - **Audio**: MP3, M4A, WAV, FLAC, OGG, Opus, AIFF, WMA.
  - **PDF**: Create PDF, Split pages, Merge PDFs, Export to images.
  - **Archives**: ZIP, TAR, GZ creation and extraction.
  - **Subtitles**: Bidirectional SRT <-> VTT <-> TXT conversion.
- **26 Advanced File Tools**: Compress, remove metadata, crop, edit photo, normalize volume (EBU R128), mute video, change speed, audio visualizer, snapshots, split PDF, and more.
- **6 File Actions**: Windows Nearby Share, Float shelf, Copy, Move, Copy Path, and Open Terminal.
- **Bilingual (English & فارسی)**: Complete support for English and Persian with automatic Right-to-Left (RTL) layout and Persian typography.
- **System Tray Background Host**: Sits quietly in your Windows taskbar with quick settings and native toast notifications.
- **Universal Windows Architecture**: Releases available for **x64** (Windows 10/11), **ia32** (32-bit Windows), and **arm64** (Copilot+ PC, Surface Pro, Snapdragon).

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- FFmpeg (offline media operations)

### Run UniFlux
```powershell
npm start
```

### Run Tests
```powershell
npm run test:conversions
```

### Build Installers & Portables Locally
```powershell
# Build for 64-bit Windows (NSIS Installer, Portable .exe, ZIP)
npm run dist:win:x64

# Build for all Windows architectures (x64, ia32, arm64)
npm run dist:win:all
```

---

## ⌨️ Default Trigger Shortcuts

- **Drag file + Shift**: Open Format Conversion Wheel
- **Drag file + Alt**: Open Advanced File Tools Wheel
- **Drag file + Ctrl**: Open File Actions Wheel
- **Ctrl + Shift + U** (or **Ctrl + Shift + T**): Instant summon radial wheel at cursor position

---

## 📦 Releases & GitHub Actions

UniFlux automatically packages and publishes releases for all Windows versions via GitHub Actions on every release tag (`v*`) or manual workflow dispatch:
- **NSIS Setup Installer** (`.exe`): Full installation with desktop shortcuts and uninstaller.
- **Portable Executable** (`.exe`): Zero-installation standalone executable for flash drives or quick use.
- **Portable ZIP** (`.zip`): Clean standalone archive for IT deployments.
- **Architectures**: `x64` (64-bit), `ia32` (32-bit legacy), and `arm64` (Windows on ARM).
