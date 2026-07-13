import { cpSync, mkdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

const destination = resolve('dist/server');
mkdirSync(destination, { recursive: true });
cpSync('worker/index.js', resolve(destination, 'index.js'));
renameSync('dist/Index.html', 'dist/index.html');
