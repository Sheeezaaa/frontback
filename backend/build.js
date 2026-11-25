const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('  OmniOrder SaaS Build Handler (backend directory)   ');
console.log('====================================================');

const frontendDir = path.join(__dirname, '..', 'frontend');
const backendDist = path.join(__dirname, 'dist');

if (fs.existsSync(frontendDir)) {
  console.log('[1/3] Detected monorepo frontend at ../frontend');
  console.log('[2/3] Installing and compiling frontend application...');
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  console.log('[3/3] Syncing frontend distribution to backend/dist...');
  const srcDist = path.join(frontendDir, 'dist');
  if (fs.existsSync(backendDist)) {
    fs.rmSync(backendDist, { recursive: true, force: true });
  }
  fs.mkdirSync(backendDist, { recursive: true });
  fs.cpSync(srcDist, backendDist, { recursive: true });

  const indexHtml = path.join(backendDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    console.log('VERIFIED: backend/dist/index.html is ready for Vercel deployment!');
  }
} else {
  console.log('Compiling backend TypeScript application...');
  execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });
}

console.log('====================================================');
console.log('  Build completed successfully!                     ');
console.log('====================================================');
