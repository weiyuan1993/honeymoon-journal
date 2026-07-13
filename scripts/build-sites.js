import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const destination = resolve('dist/server');
mkdirSync(destination, { recursive: true });
cpSync('worker/index.js', resolve(destination, 'index.js'));
