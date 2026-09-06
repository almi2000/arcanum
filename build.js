import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const files = ['index.html', 'room2.html', 'room3.html', 'room4.html', 'room5.html', 'rooms.html', 'main.js', 'room2.js', 'room3.js', 'room4.js', 'room5.js', 'mobileControls.js', 'transition.js', 'campaign.js', 'experience.js', 'atmosphere.js', 'boot.js', 'style.css', 'premium.css', 'THIRD_PARTY.md'];
files.push('soft-geometry.js');
await mkdir('dist', { recursive: true });
for (const file of files) await cp(file, path.join('dist', file));
for (const dir of ['assets', 'vendor']) await cp(dir, path.join('dist', dir), { recursive: true });
async function manifest(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name), relative = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await manifest(file, relative + '/'));
    else if (entry.name !== 'release-manifest.json') result.push({ file: relative, sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
  }
  return result;
}
const entries = await manifest('dist');
await writeFile('dist/release-manifest.json', JSON.stringify({ version: '0.2.0', files: entries }, null, 2));
console.log(`Arcanum 0.2.0: ${entries.length} files copied to dist. Entry: dist/index.html.`);
