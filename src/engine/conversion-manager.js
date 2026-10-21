const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

const {
  getFileCategory,
  normalizeExtension,
  getNonCollidingOutputPath
} = require('./converter-registry');
const ffmpegWorker = require('./ffmpeg-worker');
const imageWorker = require('./image-worker');
const pdfWorker = require('./pdf-worker');
const archiveWorker = require('./archive-worker');
const subtitleWorker = require('./subtitle-worker');
const actionsRegistry = require('./actions-registry');

class ConversionManager extends EventEmitter {
  constructor() {
    super();
    this.activeJobs = new Map();
  }

  async convertFile(inputPath, targetExt, customOutputDir = null) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Source file not found: ${inputPath}`);
    }

    const srcExt = normalizeExtension(path.extname(inputPath));
    const target = normalizeExtension(targetExt);
    const category = getFileCategory(srcExt);
    const outputPath = getNonCollidingOutputPath(inputPath, target, customOutputDir);
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    this.emit('job:start', { jobId, inputPath, outputPath, target });

    try {
      let resultPath = outputPath;

      if (category === 'video' || category === 'audio' || target === 'gif' || target === 'mp3') {
        resultPath = await ffmpegWorker.convertMedia(inputPath, outputPath, target);
      } else if (category === 'image') {
        if (target === 'pdf') {
          resultPath = await pdfWorker.createPDFFromImages([inputPath], outputPath);
        } else {
          resultPath = await imageWorker.convertImage(inputPath, outputPath, target);
        }
      } else if (category === 'subtitle') {
        resultPath = subtitleWorker.convertSubtitle(inputPath, outputPath, target);
      } else if (category === 'archive') {
        resultPath = await archiveWorker.createArchive([inputPath], outputPath, target);
      } else if (target === 'zip' || target === 'tar' || target === 'gz') {
        resultPath = await archiveWorker.createArchive([inputPath], outputPath, target);
      } else {
        throw new Error(`File format .${srcExt || 'unknown'} cannot be converted to .${target}. Supported action: compress to ZIP or select an action.`);
      }

      this.emit('job:done', { jobId, inputPath, outputPath: resultPath, target });
      return { success: true, outputPath: resultPath };
    } catch (err) {
      this.emit('job:error', { jobId, inputPath, error: err.message });
      throw err;
    }
  }

  async executeTool(toolId, inputPaths, options = {}) {
    if (!inputPaths || !inputPaths.length) {
      throw new Error('No input files supplied to tool');
    }

    const first = inputPaths[0];
    const ext = normalizeExtension(path.extname(first));
    const category = getFileCategory(ext);
    const customDir = options.customOutputDir || null;

    switch (toolId) {
      case 'compress': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        if (category === 'video') return await ffmpegWorker.compressVideo(first, out);
        if (category === 'audio') return await ffmpegWorker.compressAudio(first, out);
        if (category === 'image') return await imageWorker.compressImage(first, out);
        break;
      }

      case 'removeMetadata': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        if (category === 'image') return await imageWorker.removeMetadata(first, out);
        // Default strip for video/audio
        return await ffmpegWorker.runFFmpeg(['-i', first, '-map_metadata', '-1', '-c', 'copy', out]).then(() => out);
      }

      case 'normalizeAudio': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        return await ffmpegWorker.normalizeAudio(first, out);
      }

      case 'muteVideo': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        return await ffmpegWorker.muteVideo(first, out);
      }

      case 'changeVideoSpeed': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        return await ffmpegWorker.changeSpeed(first, out, options.speed || 2.0);
      }

      case 'audioChannels': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        return await ffmpegWorker.convertAudioChannels(first, out, options.channels || 1);
      }

      case 'videoSnapshots': {
        const out = getNonCollidingOutputPath(first, 'png', customDir);
        return await ffmpegWorker.captureVideoSnapshot(first, out);
      }

      case 'audioToVideo': {
        const out = getNonCollidingOutputPath(first, 'mp4', customDir);
        return await ffmpegWorker.audioVisualizer(first, out);
      }

      case 'splitPDF': {
        return await pdfWorker.splitPDF(first, customDir);
      }

      case 'mergePDF': {
        const out = getNonCollidingOutputPath(first, 'pdf', customDir);
        return await pdfWorker.mergePDFs(inputPaths, out);
      }

      case 'createPDF': {
        const out = getNonCollidingOutputPath(first, 'pdf', customDir);
        return await pdfWorker.createPDFFromImages(inputPaths, out);
      }

      case 'createCollage': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        return await imageWorker.createCollage(inputPaths, out);
      }

      case 'cropImage': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        return await imageWorker.cropImage(first, out);
      }

      case 'frameImage': {
        const out = getNonCollidingOutputPath(first, ext, customDir);
        return await imageWorker.addBackgroundFrame(first, out);
      }

      case 'extractArchive': {
        return await archiveWorker.extractArchive(first, customDir);
      }

      default:
        throw new Error(`Tool ${toolId} not implemented yet`);
    }
  }

  async executeAction(actionId, filePaths, options = {}) {
    return await actionsRegistry.executeAction(actionId, filePaths, options);
  }
}

module.exports = new ConversionManager();
