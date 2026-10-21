const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const REPO_OWNER = 'ehsaanpour';
const REPO_NAME = 'UniFlux';

function getGitHubToken() {
  const gcm = 'C:\\Users\\EE\\AppData\\Local\\hermes\\git\\mingw64\\bin\\git-credential-manager.exe';
  const input = 'protocol=https\nhost=github.com\n';
  const out = execSync(`"${gcm}" get`, { input, encoding: 'utf8' });
  const line = out.split('\n').find((l) => l.startsWith('password='));
  if (!line) throw new Error('GitHub token not found');
  return line.substring(9).trim();
}

function githubRequest(endpoint, options = {}, postData = null) {
  const token = options.token || getGitHubToken();
  const url = endpoint.startsWith('https://')
    ? endpoint
    : `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'UniFlux-Release-Uploader',
        Accept: 'application/vnd.github.v3+json',
        ...(options.headers || {})
      }
    };

    if (postData && !reqOptions.headers['Content-Length']) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(reqOptions, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(githubRequest(res.headers.location, options, postData));
      }
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: json });
          } else {
            reject(new Error(`GitHub API error (${res.statusCode}): ${JSON.stringify(json)}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body });
          } else {
            reject(new Error(`HTTP error ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function getOrCreateRelease(tag, token) {
  console.log(`Checking release for tag ${tag}...`);
  try {
    const res = await githubRequest(`/releases/tags/${tag}`, { token });
    console.log(`Found existing release: ID ${res.data.id} (${res.data.name})`);
    return res.data;
  } catch (err) {
    console.log(`Release for tag ${tag} not found. Creating it now...`);
    const pkg = require('../package.json');
    const newRelease = {
      tag_name: tag,
      target_commitish: 'main',
      name: `UniFlux ${tag} ⚡`,
      body: `## UniFlux ${tag} for Windows ⚡\n\nThe zero-click offline file converter & radial quick actions for all Windows editions and architectures.\n\n### 📦 Release Assets & Supported Windows Versions:\n| Architecture | Editions Supported | Asset Formats |\n| :--- | :--- | :--- |\n| **Windows x64** | Windows 11 & Windows 10 (64-bit) | Setup Installer (\`.exe\`), Standalone Portable (\`.exe\`), Standalone Archive (\`.zip\`) |\n| **Windows ia32** | Windows 7, 8, 8.1, 10 (32-bit legacy) | Setup Installer (\`.exe\`), Standalone Portable (\`.exe\`), Standalone Archive (\`.zip\`) |\n| **Windows ARM64** | Windows 11 on ARM (Copilot+ PCs, Snapdragon X Elite, Surface Pro) | Setup Installer (\`.exe\`), Standalone Portable (\`.exe\`), Standalone Archive (\`.zip\`) |\n\n### 🔒 Integrity & Security:\n- Cryptographic SHA-256 hashes are listed in \`SHA256SUMS.txt\`.\n- All builds are packaged with self-contained dependencies and offline execution capability.`,
      draft: false,
      prerelease: false
    };

    const created = await githubRequest('/releases', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify(newRelease));

    console.log(`Created release successfully: ID ${created.data.id}`);
    return created.data;
  }
}

async function uploadFile(uploadUrlTemplate, filePath, token) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  console.log(`[START] Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

  // uploadUrlTemplate format: https://uploads.github.com/repos/owner/repo/releases/id/assets{?name,label}
  const cleanBase = uploadUrlTemplate.replace(/\{\?name,label\}$/, '');
  const targetUrl = `${cleanBase}?name=${encodeURIComponent(fileName)}`;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const parsed = new URL(targetUrl);

    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
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
  const token = getGitHubToken();
  const pkg = require('../package.json');
  const targetTag = process.argv[2] || `v${pkg.version}`;
  const distDir = path.join(__dirname, '..', 'dist');

  console.log(`=== UniFlux GitHub Release Publisher ===`);
  console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Target Tag: ${targetTag}`);

  const release = await getOrCreateRelease(targetTag, token);
  const releaseId = release.id;
  const uploadUrl = release.upload_url;

  // Fetch already uploaded assets
  const assetsRes = await githubRequest(`/releases/${releaseId}/assets`, { token });
  const existingAssets = Array.isArray(assetsRes.data) ? assetsRes.data : [];
  const existingNames = new Set(existingAssets.map((a) => a.name));
  console.log(`Currently published assets on GitHub (${existingNames.size}):`, Array.from(existingNames));

  if (!fs.existsSync(distDir)) {
    console.error(`Dist directory ${distDir} does not exist.`);
    return;
  }

  const allFiles = fs.readdirSync(distDir).filter((f) => {
    return (
      (f.endsWith('.exe') || f.endsWith('.zip') || f === 'SHA256SUMS.txt') &&
      !f.includes('__uninstaller') &&
      !f.endsWith('.blockmap')
    );
  });

  console.log(`Found ${allFiles.length} target files in dist/ to verify/upload.`);

  for (const file of allFiles) {
    if (existingNames.has(file)) {
      console.log(`[SKIP]  ${file} is already on GitHub.`);
      continue;
    }
    const fullPath = path.join(distDir, file);
    try {
      await uploadFile(uploadUrl, fullPath, token);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err.message);
    }
  }

  console.log('\n=== All assets processing finished! ===');
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { getGitHubToken, githubRequest, getOrCreateRelease, uploadFile };
