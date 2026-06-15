const { execSync } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const clientDir = path.join(rootDir, '..', 'client');

console.log('Building client...');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

console.log('\nClient built successfully!');
