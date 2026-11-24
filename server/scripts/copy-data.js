const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/data');
const distDir = path.resolve(__dirname, '../dist/data');

try {
  fs.mkdirSync(distDir, { recursive: true });
  fs.copyFileSync(path.join(srcDir, 'players2026.json'), path.join(distDir, 'players2026.json'));
  fs.copyFileSync(path.join(srcDir, 'players2025.json'), path.join(distDir, 'players2025.json'));
  console.log('[Build] Copied player datasets to dist/data successfully');
} catch (err) {
  console.error('[Build] Error copying dataset files:', err);
  process.exit(1);
}
