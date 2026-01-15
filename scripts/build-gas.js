import { copyFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Ensure dist directory exists
const distDir = resolve(root, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy Code.js to dist folder
const codeSource = resolve(root, 'gas', 'Code.js');
const codeDest = resolve(distDir, 'Code.js');
if (existsSync(codeSource)) {
  copyFileSync(codeSource, codeDest);
  console.log('✓ Copied Code.js to dist/');
} else {
  console.error('✗ gas/Code.js not found!');
  process.exit(1);
}

// Rename index.html to Index.html (GAS convention)
const indexSrc = resolve(distDir, 'index.html');
const indexDst = resolve(distDir, 'Index.html');
if (existsSync(indexSrc)) {
  renameSync(indexSrc, indexDst);
  console.log('✓ Renamed index.html to Index.html');
} else {
  console.error('✗ dist/index.html not found! Build may have failed.');
  process.exit(1);
}

// Copy appsscript.json to dist folder
const appsscriptSource = resolve(root, 'gas', 'appsscript.json');
const appsscriptDest = resolve(distDir, 'appsscript.json');
if (existsSync(appsscriptSource)) {
  copyFileSync(appsscriptSource, appsscriptDest);
  console.log('✓ Copied appsscript.json to dist/');
} else {
  console.error('✗ gas/appsscript.json not found!');
  process.exit(1);
}

console.log('\n✅ Build complete! Files ready for clasp push.');
console.log('   dist/');
console.log('   ├── Code.js');
console.log('   ├── Index.html');
console.log('   └── appsscript.json');
