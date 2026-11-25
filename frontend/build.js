const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building frontend from frontend directory...');
execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
console.log('Frontend build completed.');
