const { Jimp } = require('jimp');
const ffmpegWorker = require('./ffmpeg-worker');
const path = require('path');
const fs = require('fs');

class ImageWorker {
  async convertImage(inputPath, outputPath, targetExt) {
    const ext = targetExt.toLowerCase();

    // Use Jimp for standard formats, FFmpeg fallback for AVIF/HEIC/SVG
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext)) {
      try {
        const image = await Jimp.read(inputPath);
        await image.write(outputPath);
        return outputPath;
      } catch (err) {
        // Fallback to FFmpeg if Jimp encounters an unhandled format or raw profile
        return await ffmpegWorker.runFFmpeg(['-i', inputPath, outputPath]).then(() => outputPath);
      }
    }

    // HEIC / AVIF / PDF export
    return await ffmpegWorker.runFFmpeg(['-i', inputPath, outputPath]).then(() => outputPath);
  }

  async compressImage(inputPath, outputPath, quality = 75) {
    try {
      const image = await Jimp.read(inputPath);
      // Downscale if very large (> 2560px) and compress quality
      if (image.bitmap.width > 2560 || image.bitmap.height > 2560) {
        image.scaleToFit({ w: 2560, h: 2560 });
      }
      await image.write(outputPath);
      return outputPath;
    } catch {
      return await ffmpegWorker
        .runFFmpeg(['-i', inputPath, '-q:v', '5', outputPath])
        .then(() => outputPath);
    }
  }

  async removeMetadata(inputPath, outputPath) {
    // Reading with Jimp and saving strips EXIF tags and GPS data
    try {
      const image = await Jimp.read(inputPath);
      await image.write(outputPath);
      return outputPath;
    } catch {
      return await ffmpegWorker
        .runFFmpeg(['-i', inputPath, '-map_metadata', '-1', outputPath])
        .then(() => outputPath);
    }
  }

  async cropImage(inputPath, outputPath, cropRect = null) {
    const image = await Jimp.read(inputPath);
    const w = image.bitmap.width;
    const h = image.bitmap.height;

    // Default crop center 80% if no rect supplied
    const rect = cropRect || {
      x: Math.round(w * 0.1),
      y: Math.round(h * 0.1),
      w: Math.round(w * 0.8),
      h: Math.round(h * 0.8)
    };

    image.crop(rect);
    await image.write(outputPath);
    return outputPath;
  }

  async addBackgroundFrame(inputPath, outputPath, bgColor = 0xffffffff, padding = 40) {
    const src = await Jimp.read(inputPath);
    const canvasW = src.bitmap.width + padding * 2;
    const canvasH = src.bitmap.height + padding * 2;

    const canvas = new Jimp({ width: canvasW, height: canvasH, color: bgColor });
    canvas.composite(src, padding, padding);
    await canvas.write(outputPath);
    return outputPath;
  }

  async createCollage(inputPaths, outputPath) {
    if (!inputPaths.length) throw new Error('No images to collage');
    const images = await Promise.all(inputPaths.slice(0, 4).map((p) => Jimp.read(p)));

    // 2x2 grid collage
    const targetSize = 600;
    for (const img of images) {
      img.cover({ w: targetSize, h: targetSize });
    }

    const cols = images.length > 1 ? 2 : 1;
    const rows = Math.ceil(images.length / 2);
    const canvas = new Jimp({
      width: cols * targetSize,
      height: rows * targetSize,
      color: 0x111111ff
    });

    images.forEach((img, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      canvas.composite(img, col * targetSize, row * targetSize);
    });

    await canvas.write(outputPath);
    return outputPath;
  }
}

module.exports = new ImageWorker();
