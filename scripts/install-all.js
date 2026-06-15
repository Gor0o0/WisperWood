const { execSync } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const clientDir = path.join(rootDir, '..', 'client');
const serverDir = path.join(rootDir, '..', 'server');

console.log('Installing client dependencies...');
execSync('npm install', { cwd: clientDir, stdio: 'inherit' });

console.log('\nInstalling server dependencies...');
execSync('npm install', { cwd: serverDir, stdio: 'inherit' });

console.log('\nAll dependencies installed successfully!');
