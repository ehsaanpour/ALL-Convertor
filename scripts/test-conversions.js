const path = require('path');
const fs = require('fs');

const { getConversionTargets, getNonCollidingOutputPath } = require('../src/engine/converter-registry');
const i18n = require('../src/i18n/i18n');
const imageWorker = require('../src/engine/image-worker');
const pdfWorker = require('../src/engine/pdf-worker');
const archiveWorker = require('../src/engine/archive-worker');
const subtitleWorker = require('../src/engine/subtitle-worker');
const ffmpegWorker = require('../src/engine/ffmpeg-worker');
const { Jimp } = require('jimp');

async function runAllTests() {
  console.log('=== UniFlux Windows Verification Test Suite ===\n');

  const testDir = path.join(__dirname, '..', 'scratch_test_data');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Converter Registry Tests
  console.log('--- 1. Converter Registry Tests ---');
  const jpgTargets = getConversionTargets('jpg');
  assert(jpgTargets.includes('png') && jpgTargets.includes('webp') && jpgTargets.includes('pdf'), 'JPG targets contain PNG, WebP, PDF');

  const mp4Targets = getConversionTargets('mp4');
  assert(mp4Targets.includes('gif') && mp4Targets.includes('mp3') && mp4Targets.includes('webm'), 'MP4 targets contain GIF, MP3, WebM');

  const pdfTargets = getConversionTargets('pdf');
  assert(pdfTargets.includes('docx') && pdfTargets.includes('jpg') && pdfTargets.includes('txt'), 'PDF targets contain DOCX, JPG, TXT');

  const collisionName = getNonCollidingOutputPath(path.join(testDir, 'test_dummy.png'), 'png');
  assert(collisionName.endsWith('test_dummy.png'), 'Collision resolver assigns initial name cleanly');

  // 2. i18n Verification Tests
  console.log('\n--- 2. i18n Parity & RTL Tests ---');
  i18n.setLocale('en');
  assert(i18n.t('tools.compress.title') === 'COMPRESS', 'English translation for compress');
  assert(!i18n.isRtl(), 'English is LTR');

  i18n.setLocale('fa');
  assert(i18n.t('tools.compress.title') === 'فشرده‌سازی', 'Persian translation for compress');
  assert(i18n.isRtl(), 'Persian is RTL');

  // 3. Subtitle Converter Tests
  console.log('\n--- 3. Subtitle Conversion Tests ---');
  const sampleSrt = path.join(testDir, 'sample.srt');
  fs.writeFileSync(sampleSrt, '1\n00:00:01,000 --> 00:00:04,000\nHello from UniFlux!\n');
  const sampleVtt = path.join(testDir, 'sample.vtt');
  subtitleWorker.convertSubtitle(sampleSrt, sampleVtt, 'vtt');
  const vttContent = fs.readFileSync(sampleVtt, 'utf8');
  assert(vttContent.includes('WEBVTT') && vttContent.includes('00:00:01.000'), 'SRT to VTT conversion success');

  const sampleTxt = path.join(testDir, 'sample.txt');
  subtitleWorker.convertSubtitle(sampleSrt, sampleTxt, 'txt');
  const txtContent = fs.readFileSync(sampleTxt, 'utf8');
  assert(txtContent.trim() === 'Hello from UniFlux!', 'SRT to plain TXT dialogue extraction success');

  // 4. Image Processing Tests
  console.log('\n--- 4. Image Worker Tests ---');
  const testPng = path.join(testDir, 'test_source.png');
  const jimpImg = new Jimp({ width: 100, height: 100, color: 0xff6a00ff });
  await jimpImg.write(testPng);

  const testJpg = path.join(testDir, 'test_converted.jpg');
  await imageWorker.convertImage(testPng, testJpg, 'jpg');
  assert(fs.existsSync(testJpg) && fs.statSync(testJpg).size > 0, 'PNG to JPG conversion via ImageWorker');

  const testFramed = path.join(testDir, 'test_framed.png');
  await imageWorker.addBackgroundFrame(testPng, testFramed);
  assert(fs.existsSync(testFramed) && fs.statSync(testFramed).size > 0, 'Add Background Frame tool success');

  // 5. PDF Worker Tests
  console.log('\n--- 5. PDF Worker Tests ---');
  const testPdf = path.join(testDir, 'test_output.pdf');
  await pdfWorker.createPDFFromImages([testJpg, testPng], testPdf);
  assert(fs.existsSync(testPdf) && fs.statSync(testPdf).size > 0, 'Create multi-page PDF from images success');

  const splitResult = await pdfWorker.splitPDF(testPdf, path.join(testDir, 'split_pages'));
  assert(splitResult.files.length === 2, `Split PDF into pages success (${splitResult.files.length} pages generated)`);

  const mergedPdf = path.join(testDir, 'test_merged.pdf');
  await pdfWorker.mergePDFs(splitResult.files, mergedPdf);
  assert(fs.existsSync(mergedPdf) && fs.statSync(mergedPdf).size > 0, 'Merge PDFs success');

  // 6. Archive Worker Tests
  console.log('\n--- 6. Archive Worker Tests ---');
  const testZip = path.join(testDir, 'test_archive.zip');
  await archiveWorker.createArchive([sampleSrt, testJpg], testZip, 'zip');
  assert(fs.existsSync(testZip) && fs.statSync(testZip).size > 0, 'Create ZIP archive success');

  const extractedFolder = path.join(testDir, 'extracted_zip');
  await archiveWorker.extractArchive(testZip, extractedFolder);
  assert(fs.existsSync(path.join(extractedFolder, 'sample.srt')), 'Extract ZIP archive success');

  // 7. FFmpeg Worker Tests (Audio & Video)
  console.log('\n--- 7. FFmpeg Worker Tests ---');
  try {
    const testWav = path.join(testDir, 'test_tone.wav');
    // Generate 1-second synthetic sine audio tone via FFmpeg
    await ffmpegWorker.runFFmpeg(['-f', 'lavfi', '-i', 'sine=frequency=1000:duration=1', testWav]);
    assert(fs.existsSync(testWav) && fs.statSync(testWav).size > 0, 'FFmpeg generated test WAV');

    const testMp3 = path.join(testDir, 'test_tone.mp3');
    await ffmpegWorker.convertMedia(testWav, testMp3, 'mp3');
    assert(fs.existsSync(testMp3) && fs.statSync(testMp3).size > 0, 'WAV to MP3 conversion via FFmpeg');

    const testNormalized = path.join(testDir, 'test_normalized.wav');
    await ffmpegWorker.normalizeAudio(testWav, testNormalized);
    assert(fs.existsSync(testNormalized) && fs.statSync(testNormalized).size > 0, 'Audio Normalization (EBU R128) tool success');
  } catch (err) {
    console.error('FFmpeg test error:', err.message);
    failed++;
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Total Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================`);

  if (failed === 0) {
    console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! ✓');
  } else {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
