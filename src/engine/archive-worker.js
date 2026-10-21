const archiver = require('archiver');
const extractZip = require('extract-zip');
const tar = require('tar');
const fs = require('fs');
const path = require('path');

class ArchiveWorker {
  async extractArchive(archivePath, targetDir = null) {
    const parsed = path.parse(archivePath);
    const dest = targetDir || path.join(parsed.dir, `${parsed.name} Extracted`);

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const ext = parsed.ext.toLowerCase();

    if (ext === '.zip') {
      await extractZip(archivePath, { dir: path.resolve(dest) });
      return dest;
    }

    if (['.tar', '.gz', '.tgz'].includes(ext)) {
      await tar.x({
        file: archivePath,
        cwd: dest
      });
      return dest;
    }

    throw new Error(`Unsupported archive format: ${ext}`);
  }

  createArchive(filePaths, outputPath, format = 'zip') {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const isGz = format === 'gz' || format === 'tar.gz';
      const arch = archiver(isGz ? 'tar' : format, isGz ? { gzip: true } : {});

      output.on('close', () => resolve(outputPath));
      arch.on('error', (err) => reject(err));

      arch.pipe(output);

      for (const f of filePaths) {
        if (fs.existsSync(f)) {
          const stat = fs.statSync(f);
          if (stat.isDirectory()) {
            arch.directory(f, path.basename(f));
          } else {
            arch.file(f, { name: path.basename(f) });
          }
        }
      }

      arch.finalize();
    });
  }
}

module.exports = new ArchiveWorker();
