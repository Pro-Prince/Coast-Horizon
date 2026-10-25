import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dist = path.join(root, 'dist');

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

const items = fs.readdirSync(root);
for (const item of items) {
  if (item === 'dist' || item === 'node_modules' || item === 'server' || item === '.git' || item.startsWith('.')) {
    continue;
  }
  const src = path.join(root, item);
  const target = path.join(dist, item);
  fs.cpSync(src, target, { recursive: true });
}

console.log('Build completed: all static game files copied to dist/');
