# Tangerine for Windows 🍊

The zero-click offline file converter & quick actions for Windows 10 & 11, reverse-engineered and rebuilt from Tangerine for Mac using REA analysis evidence.

## ✨ Features
- **Zero-Click Radial Wheel Overlay**: Spawns right at your mouse cursor when dragging files in Windows Explorer or tapping modifier keys.
- **Frosted Acrylic Glassmorphism**: High-fidelity SVG petals with Apple-grade smooth animations and acoustic tick feedback.
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
- **System Tray Background Host**: Sits quietly in your Windows taskbar with quick settings and notifications.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- FFmpeg (already detected in PATH on this system)

### Run Tangerine
```powershell
npm start
```

### Run Tests
```powershell
npm run test:conversions
```

## ⌨️ Default Trigger Shortcuts
- **Drag file + Shift**: Open Format Conversion Wheel
- **Drag file + Alt**: Open Advanced File Tools Wheel
- **Drag file + Ctrl**: Open File Actions Wheel
- **Ctrl + Shift + T**: Instant summon radial wheel at cursor position
