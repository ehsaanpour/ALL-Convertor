const path = require('path');
const fs = require('fs');

const IMAGE_OUTPUTS = ['jpg', 'png', 'webp', 'heic', 'tiff', 'avif', 'bmp', 'pdf'];
const IMAGE_INPUTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'tiff', 'tif', 'svg', 'avif', 'bmp'];
const AUDIO_FORMATS = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'opus', 'aiff', 'wma'];
const VIDEO_FORMATS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'wmv'];
const SUBTITLE_FORMATS = ['srt', 'vtt'];
const DOCUMENT_FORMATS = ['docx', 'pages', 'md', 'rtf', 'rtfd', 'txt', 'epub'];
const SPREADSHEET_FORMATS = ['xlsx', 'xls', 'ods', 'csv', 'tsv'];
const ARCHIVE_FORMATS = ['zip', 'tar', 'gz', 'rar'];
const SLIDE_FORMATS = ['ppt', 'pptx'];

const INPUT_ONLY = new Set(['rar', 'ppt', 'xls', 'rtf', 'rtfd', 'textClipping', 'svg']);

function normalizeExtension(ext) {
  if (!ext) return '';
  const clean = ext.toLowerCase().replace(/^\./, '');
  if (clean === 'jpeg') return 'jpg';
  if (clean === 'tif') return 'tiff';
  return clean;
}

function getFileCategory(ext) {
  const e = normalizeExtension(ext);
  if (AUDIO_FORMATS.includes(e)) return 'audio';
  if ([...VIDEO_FORMATS, 'gif'].includes(e)) return 'video';
  if (['pdf', ...SLIDE_FORMATS, ...DOCUMENT_FORMATS, 'html'].includes(e)) return 'document';
  if (SPREADSHEET_FORMATS.includes(e)) return 'spreadsheet';
  if (ARCHIVE_FORMATS.includes(e)) return 'archive';
  if (SUBTITLE_FORMATS.includes(e)) return 'subtitle';
  if (IMAGE_INPUTS.includes(e)) return 'image';
  return 'unknown';
}

function getConversionTargets(ext) {
  const e = normalizeExtension(ext);
  let targets = [];

  if (IMAGE_INPUTS.includes(e)) {
    targets = IMAGE_OUTPUTS;
  } else if (AUDIO_FORMATS.includes(e)) {
    targets = AUDIO_FORMATS;
  } else if (VIDEO_FORMATS.includes(e)) {
    targets = [...VIDEO_FORMATS, 'gif', 'mp3'];
  } else if (e === 'gif') {
    targets = VIDEO_FORMATS;
  } else if (e === 'pdf') {
    targets = ['docx', 'pptx', 'xlsx', 'jpg', 'png', 'epub', 'txt', 'md'];
  } else if (SLIDE_FORMATS.includes(e)) {
    targets = ['pdf', 'jpg', 'png'];
  } else if (SPREADSHEET_FORMATS.includes(e)) {
    targets = [...SPREADSHEET_FORMATS, 'pdf'];
  } else if (DOCUMENT_FORMATS.includes(e)) {
    targets = ['docx', 'pdf', 'txt', 'md', 'html', 'epub', 'png', 'jpg'];
  } else if (e === 'epub') {
    targets = ['pdf', 'docx', 'txt', 'md', 'html'];
  } else if (e === 'txt') {
    targets = ['docx', 'pdf', 'md', 'html', 'epub', 'jpg', 'png'];
  } else if (SUBTITLE_FORMATS.includes(e)) {
    targets = [...SUBTITLE_FORMATS, 'txt'];
  } else if (ARCHIVE_FORMATS.includes(e)) {
    targets = ['zip', 'tar', 'gz'];
  }

  // Filter out self and input-only types
  return targets.filter(t => t !== e && !INPUT_ONLY.has(t));
}

function getNonCollidingOutputPath(sourceFilePath, targetExtension, customOutputDir = null) {
  const parsed = path.parse(sourceFilePath);
  const dir = customOutputDir || parsed.dir;
  const baseName = parsed.name.replace(/\.tar$/i, ''); // Handle tar.gz properly
  const ext = targetExtension === 'gz' ? 'tar.gz' : targetExtension;

  let candidate = path.join(dir, `${baseName}.${ext}`);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName} ${counter++}.${ext}`);
  }

  return candidate;
}

module.exports = {
  IMAGE_OUTPUTS,
  IMAGE_INPUTS,
  AUDIO_FORMATS,
  VIDEO_FORMATS,
  SUBTITLE_FORMATS,
  DOCUMENT_FORMATS,
  SPREADSHEET_FORMATS,
  ARCHIVE_FORMATS,
  SLIDE_FORMATS,
  normalizeExtension,
  getFileCategory,
  getConversionTargets,
  getNonCollidingOutputPath
};
