import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = await mkdtemp(path.join(tmpdir(), 'reading-mode-settings-'));
const outfile = path.join(tempDir, 'blank-line-settings.mjs');

await esbuild.build({
  entryPoints: ['src/blank-line-settings.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2018',
});

const { DEFAULT_SETTINGS, normalizeSettings } = await import(
  pathToFileURL(outfile).href,
);

try {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ blankLineHeight: 2 }), {
    blankLineHeight: 2,
  });
  assert.deepEqual(normalizeSettings({ blankLineHeight: 4 }), {
    blankLineHeight: 3,
  });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
