const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================');
console.log('   OmniOrder SaaS Production Build  ');
console.log('====================================');

const frontendDir = path.join(__dirname, 'frontend');
const srcDist = path.join(frontendDir, 'dist');
const rootDist = path.join(__dirname, 'dist');

console.log('[1/4] Checking frontend dependencies...');
const hasNodeModules = fs.existsSync(path.join(frontendDir, 'node_modules'));
if (!hasNodeModules || process.env.VERCEL) {
  console.log('Running npm install in frontend directory...');
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
} else {
  console.log('frontend/node_modules already present. Skipping npm install.');
}

console.log('[2/4] Compiling frontend application with Vite...');
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

console.log('[3/4] Preparing distribution artifact...');
if (fs.existsSync(rootDist)) {
  fs.rmSync(rootDist, { recursive: true, force: true });
}
fs.mkdirSync(rootDist, { recursive: true });
fs.cpSync(srcDist, rootDist, { recursive: true });

console.log('[4/4] Verifying root distribution files...');
const files = fs.readdirSync(rootDist);
console.log('Generated root dist entries:', files);

const indexHtmlPath = path.join(rootDist, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('ERROR: index.html missing from dist directory!');
  process.exit(1);
}

const htmlSize = fs.statSync(indexHtmlPath).size;
console.log(`VERIFIED: dist/index.html is ready (${htmlSize} bytes)`);
console.log('====================================');
console.log(' Build completed successfully!      ');
console.log('====================================');
