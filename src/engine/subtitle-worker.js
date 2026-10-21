const fs = require('fs');
const path = require('path');

class SubtitleWorker {
  srtToVtt(srtText) {
    // Replace commas in timestamps with dots and prepend WEBVTT
    const converted = srtText.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      '$1.$2'
    );
    return `WEBVTT\n\n${converted}`;
  }

  vttToSrt(vttText) {
    // Remove WEBVTT header and replace dots with commas in timestamps
    const stripped = vttText.replace(/^WEBVTT[^\n]*\n+/i, '');
    return stripped.replace(
      /(\d{2}:\d{2}:\d{2})\.(\d{3})/g,
      '$1,$2'
    );
  }

  extractText(subText) {
    // Strip timestamps and cue identifiers, keeping only dialogue lines
    return subText
      .replace(/^WEBVTT[^\n]*/i, '')
      .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}[^\n]*/g, '')
      .replace(/^\d+\s*$/gm, '')
      .replace(/<[^>]+>/g, '') // strip styling tags
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  convertSubtitle(inputPath, outputPath, targetExt) {
    const raw = fs.readFileSync(inputPath, 'utf8');
    const ext = targetExt.toLowerCase();
    let result = '';

    if (ext === 'vtt') {
      result = this.srtToVtt(raw);
    } else if (ext === 'srt') {
      result = this.vttToSrt(raw);
    } else if (ext === 'txt') {
      result = this.extractText(raw);
    } else {
      throw new Error(`Unsupported subtitle target format: ${ext}`);
    }

    fs.writeFileSync(outputPath, result, 'utf8');
    return outputPath;
  }
}

module.exports = new SubtitleWorker();
