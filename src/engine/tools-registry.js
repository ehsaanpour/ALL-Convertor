const { normalizeExtension } = require('./converter-registry');

const ALL_TOOLS = {
  compress: { id: 'compress', icon: 'compress', multiFile: true },
  removeMetadata: { id: 'removeMetadata', icon: 'tag', multiFile: true },
  editImage: { id: 'editImage', icon: 'edit', multiFile: false },
  annotateImage: { id: 'annotateImage', icon: 'annotate', multiFile: false },
  frameImage: { id: 'frameImage', icon: 'frame', multiFile: false },
  cropImage: { id: 'cropImage', icon: 'crop', multiFile: true },
  redactImage: { id: 'redactImage', icon: 'redact', multiFile: false },
  createPDF: { id: 'createPDF', icon: 'pdf', multiFile: true },
  createCollage: { id: 'createCollage', icon: 'collage', multiFile: true },
  normalizeAudio: { id: 'normalizeAudio', icon: 'waveform', multiFile: true },
  audioToVideo: { id: 'audioToVideo', icon: 'visualize', multiFile: false },
  trimAudio: { id: 'trimAudio', icon: 'trim', multiFile: false },
  audioChannels: { id: 'audioChannels', icon: 'channels', multiFile: false },
  redactAudio: { id: 'redactAudio', icon: 'bleep', multiFile: false },
  muteVideo: { id: 'muteVideo', icon: 'mute', multiFile: true },
  trimVideo: { id: 'trimVideo', icon: 'trim', multiFile: false },
  cropVideo: { id: 'cropVideo', icon: 'crop', multiFile: true },
  changeVideoSpeed: { id: 'changeVideoSpeed', icon: 'speed', multiFile: true },
  videoSnapshots: { id: 'videoSnapshots', icon: 'snapshot', multiFile: false },
  splitVideo: { id: 'splitVideo', icon: 'split', multiFile: false },
  joinVideos: { id: 'joinVideos', icon: 'join', multiFile: true },
  redactVideo: { id: 'redactVideo', icon: 'redact', multiFile: false },
  splitPDF: { id: 'splitPDF', icon: 'split', multiFile: true },
  mergePDF: { id: 'mergePDF', icon: 'merge', multiFile: true },
  organizePDF: { id: 'organizePDF', icon: 'organize', multiFile: false },
  extractArchive: { id: 'extractArchive', icon: 'archive', multiFile: true }
};

function getToolsForFile(ext, fileCount = 1) {
  const e = normalizeExtension(ext);

  if (['jpg', 'png', 'webp', 'heic', 'tiff'].includes(e)) {
    return fileCount > 1
      ? ['compress', 'removeMetadata', 'cropImage', 'createPDF', 'createCollage']
      : ['compress', 'removeMetadata', 'editImage', 'annotateImage', 'frameImage', 'cropImage', 'redactImage'];
  }

  if (e === 'svg') {
    return fileCount > 1 ? ['createPDF', 'createCollage'] : [];
  }

  if (['mp3', 'm4a', 'wav', 'flac'].includes(e)) {
    return fileCount > 1
      ? ['compress', 'removeMetadata', 'normalizeAudio', 'audioChannels']
      : ['compress', 'removeMetadata', 'normalizeAudio', 'audioToVideo', 'trimAudio', 'audioChannels', 'redactAudio'];
  }

  if (['mp4', 'mov', 'mkv'].includes(e)) {
    return fileCount > 1
      ? ['compress', 'removeMetadata', 'muteVideo', 'trimVideo', 'cropVideo', 'changeVideoSpeed', 'joinVideos']
      : ['compress', 'removeMetadata', 'muteVideo', 'trimVideo', 'cropVideo', 'changeVideoSpeed', 'videoSnapshots', 'splitVideo', 'redactVideo'];
  }

  if (e === 'gif') {
    return ['removeMetadata'];
  }

  if (e === 'pdf') {
    return fileCount > 1
      ? ['compress', 'removeMetadata', 'splitPDF', 'mergePDF']
      : ['compress', 'removeMetadata', 'splitPDF', 'organizePDF'];
  }

  if (['zip', 'tar', 'gz', 'rar'].includes(e)) {
    return ['extractArchive'];
  }

  return [];
}

module.exports = {
  ALL_TOOLS,
  getToolsForFile
};
