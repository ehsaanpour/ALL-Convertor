const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getGitHubToken() {
  const gcm = 'C:\\Users\\EE\\AppData\\Local\\hermes\\git\\mingw64\\bin\\git-credential-manager.exe';
  const input = 'protocol=https\nhost=github.com\n';
  const out = execSync(`"${gcm}" get`, { input, encoding: 'utf8' });
  const line = out.split('\n').find((l) => l.startsWith('password='));
  if (!line) throw new Error('GitHub token not found');
  return line.substring(9).trim();
}

async function uploadFile(releaseId, filePath, token) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  console.log(`[START] Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

  const url = `https://uploads.github.com/repos/ehsaanpour/ALL-Convertor/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'UniFlux-Release-Uploader',
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize
        }
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[DONE]  ${fileName} uploaded successfully!`);
            resolve(JSON.parse(body));
          } else {
            console.error(`[ERROR] ${fileName} failed (HTTP ${res.statusCode}):`, body);
            reject(new Error(`Upload failed: ${res.statusCode}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error(`[REQ ERROR] ${fileName}:`, err.message);
      reject(err);
    });

    fileStream.pipe(req);
  });
}

async function run() {
  const releaseId = 419406984; // v1.0.0
  const token = getGitHubToken();
  const distDir = path.join(__dirname, '..', 'dist');

  // Fetch already uploaded assets
  const existingAssets = await new Promise((resolve, reject) => {
    https.get(
      `https://api.github.com/repos/ehsaanpour/ALL-Convertor/releases/${releaseId}/assets`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'UniFlux-Release-Uploader',
          Accept: 'application/vnd.github.v3+json'
        }
      },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => resolve(JSON.parse(b)));
      }
    ).on('error', reject);
  });

  const existingNames = new Set(existingAssets.map((a) => a.name));
  console.log('Already uploaded assets:', Array.from(existingNames));

  const allFiles = fs.readdirSync(distDir).filter((f) => {
    return (f.endsWith('.exe') || f.endsWith('.zip')) && !f.includes('__uninstaller');
  });

  console.log(`Found ${allFiles.length} target files to upload in dist/`);

  for (const file of allFiles) {
    if (existingNames.has(file)) {
      console.log(`[SKIP]  ${file} is already on GitHub.`);
      continue;
    }
    const fullPath = path.join(distDir, file);
    try {
      await uploadFile(releaseId, fullPath, token);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err.message);
    }
  }

  console.log('\n=== All assets processing finished! ===');
}

run().catch(console.error);
