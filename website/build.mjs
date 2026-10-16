import { copyFile, mkdir, rm } from 'node:fs/promises';

const output = new URL('./dist/', import.meta.url);
const files = ['index.html', 'dashboard.html', 'leads.html', 'styles.css', 'script.js'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map(file => copyFile(
  new URL(file, import.meta.url),
  new URL(file, output),
)));
