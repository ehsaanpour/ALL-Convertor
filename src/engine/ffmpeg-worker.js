const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class FFmpegWorker {
  constructor() {
    this.ffmpegPath = this.resolveFFmpegPath();
  }

  resolveFFmpegPath() {
    // Check custom winget link first, fallback to 'ffmpeg' in PATH
    const wingetPath = path.join(
      process.env.LOCALAPPDATA || '',
      'Microsoft',
      'WinGet',
      'Links',
      'ffmpeg.exe'
    );
    if (fs.existsSync(wingetPath)) {
      return wingetPath;
    }
    return 'ffmpeg';
  }

  runFFmpeg(args, onProgress = null) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, ['-y', ...args]);
      let stderrOutput = '';

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrOutput += text;
        if (onProgress) {
          // Parse time or progress info if needed
          const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
          if (timeMatch) onProgress(timeMatch[1]);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderrOutput.slice(-500)}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });
    });
  }

  async convertMedia(inputPath, outputPath, targetExt) {
    const ext = targetExt.toLowerCase();
    const args = ['-i', inputPath];

    switch (ext) {
      case 'mp3':
        args.push('-c:a', 'libmp3lame', '-q:a', '2');
        break;
      case 'm4a':
        args.push('-c:a', 'aac', '-b:a', '192k');
        break;
      case 'flac':
        args.push('-c:a', 'flac');
        break;
      case 'wav':
        args.push('-c:a', 'pcm_s16le');
        break;
      case 'ogg':
        args.push('-c:a', 'libvorbis', '-q:a', '4');
        break;
      case 'opus':
        args.push('-c:a', 'libopus', '-b:a', '128k');
        break;
      case 'aiff':
        args.push('-c:a', 'pcm_s16be');
        break;
      case 'wma':
        args.push('-c:a', 'wmav2', '-b:a', '192k');
        break;
      case 'mp4':
        args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac');
        break;
      case 'mov':
        args.push('-c:v', 'libx264', '-c:a', 'aac');
        break;
      case 'mkv':
        args.push('-c:v', 'copy', '-c:a', 'copy');
        break;
      case 'webm':
        args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus');
        break;
      case 'avi':
        args.push('-c:v', 'mpeg4', '-vtag', 'xvid', '-qscale:v', '3', '-c:a', 'libmp3lame');
        break;
      case 'wmv':
        args.push('-c:v', 'wmv2', '-qscale:v', '3', '-c:a', 'wmav2');
        break;
      case 'gif':
        args.push(
          '-vf',
          'fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse'
        );
        break;
      default:
        // Generic copy or default encoder
        break;
    }

    args.push(outputPath);
    await this.runFFmpeg(args);
    return outputPath;
  }

  // --- Advanced Tools ---

  async muteVideo(inputPath, outputPath) {
    const args = ['-i', inputPath, '-c:v', 'copy', '-an', outputPath];
    await this.runFFmpeg(args);
    return outputPath;
  }

  async normalizeAudio(inputPath, outputPath) {
    // EBU R128 loudness normalization
    const args = ['-i', inputPath, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', outputPath];
    await this.runFFmpeg(args);
    return outputPath;
  }

  async changeSpeed(inputPath, outputPath, speed = 2.0) {
    // Speed: 0.5x, 2.0x
    const setpts = (1 / speed).toFixed(4);
    const atempo = speed.toFixed(4);
    const args = [
      '-i',
      inputPath,
      '-filter_complex',
      `[0:v]setpts=${setpts}*PTS[v];[0:a]atempo=${atempo}[a]`,
      '-map',
      '[v]',
      '-map',
      '[a]',
      outputPath
    ];
    await this.runFFmpeg(args);
    return outputPath;
  }

  async convertAudioChannels(inputPath, outputPath, channels = 1) {
    // Mono: channels=1, Stereo: channels=2
    const args = ['-i', inputPath, '-ac', String(channels), outputPath];
    await this.runFFmpeg(args);
    return outputPath;
  }

  async captureVideoSnapshot(inputPath, outputPath, timestamp = '00:00:01') {
    const args = ['-ss', timestamp, '-i', inputPath, '-vframes', '1', '-q:v', '2', outputPath];
    await this.runFFmpeg(args);
    return outputPath;
  }

  async compressVideo(inputPath, outputPath) {
    // High efficiency CRF compression
    const args = [
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-crf',
      '28',
      '-preset',
      'fast',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outputPath
    ];
    await this.runFFmpeg(args);
    return outputPath;
  }

  async compressAudio(inputPath, outputPath) {
    const args = ['-i', inputPath, '-c:a', 'libmp3lame', '-b:a', '128k', outputPath];
    await this.runFFmpeg(args);
    return outputPath;
  }

  async audioVisualizer(inputPath, outputPath) {
    // Render orange waveform on black background
    const args = [
      '-i',
      inputPath,
      '-filter_complex',
      '[0:a]showwaves=s=1280x720:mode=line:colors=#ff6a00:rate=25[v]',
      '-map',
      '[v]',
      '-map',
      '0:a',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      outputPath
    ];
    await this.runFFmpeg(args);
    return outputPath;
  }
}

module.exports = new FFmpegWorker();
