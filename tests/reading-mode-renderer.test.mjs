import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = await mkdtemp(path.join(tmpdir(), 'reading-mode-renderer-'));
const outfile = path.join(tempDir, 'reading-mode-renderer.mjs');
const settingsOutfile = path.join(tempDir, 'blank-line-settings.mjs');

await esbuild.build({
  entryPoints: ['src/reading-mode-renderer.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2018',
  external: ['obsidian'],
});

await esbuild.build({
  entryPoints: ['src/blank-line-settings.ts'],
  outfile: settingsOutfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2018',
});

const { formatBlankLineLength } = await import(pathToFileURL(outfile).href);
const { DEFAULT_SETTINGS, normalizeBlankLineHeight } = await import(
  pathToFileURL(settingsOutfile).href,
);

try {
  assert.equal(DEFAULT_SETTINGS.blankLineHeight, 1);
  assert.equal(normalizeBlankLineHeight(undefined), 1);
  assert.equal(normalizeBlankLineHeight(0.1), 0.1);
  assert.equal(normalizeBlankLineHeight(4), 3);
  assert.equal(formatBlankLineLength(1, '20px'), '20px');
  assert.equal(formatBlankLineLength(5, '20px'), '100px');
  assert.equal(formatBlankLineLength(2, '20px', 1.5), '60px');
  assert.equal(formatBlankLineLength(2, 'normal'), '3em');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
